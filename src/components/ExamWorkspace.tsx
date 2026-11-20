import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  AlertTriangle,
  ScanSearch,
  KeyRound,
  EyeOff,
} from 'lucide-react';
import {
  EXAM_QUESTIONS,
  SUBJECT_ORDER,
  SubjectName,
} from '../data/questions';
import {
  BaselineViewport,
  EnvironmentScanReport,
  ViolationLogEntry,
  formatTimeClock,
  isFlutterWebView,
  notifyFlutterApp,
  playWarningSound,
  scanBrowserEnvironment,
} from '../utils/securityMonitor';
import { StudentProfile } from './PortalLobby';

interface ExamWorkspaceProps {
  student: StudentProfile;
  onFinishExam: (payload: {
    answers: Record<number, number>;
    violations: ViolationLogEntry[];
    elapsedSeconds: number;
    submittedByTimeout: boolean;
  }) => void;
}

const EXAM_DURATION_SECONDS = 60 * 60; // 60 menit
const MAX_VIOLATIONS = 5;
const PROCTOR_PIN = 'PENGAWAS9';

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  student,
  onFinishExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const [activeSubjectTab, setActiveSubjectTab] = useState<SubjectName | 'Semua'>('Semua');

  // Strict Lockdown States
  const [isFullscreen, setIsFullscreen] = useState(
    Boolean(document.fullscreenElement)
  );
  const [isLockActive, setIsLockActive] = useState(true);
  const [violations, setViolations] = useState<ViolationLogEntry[]>([]);
  const [activeWarningModal, setActiveWarningModal] =
    useState<ViolationLogEntry | null>(null);
  const [isProctorLocked, setIsProctorLocked] = useState(false);
  const [proctorPinInput, setProctorPinInput] = useState('');
  const [proctorPinError, setProctorPinError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [scanReport, setScanReport] = useState<EnvironmentScanReport>(() =>
    scanBrowserEnvironment(true)
  );
  const [fullscreenPromptNeeded, setFullscreenPromptNeeded] = useState(false);

  const lastViolationTimeRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);
  const answersRef = useRef(answers);
  const violationsRef = useRef(violations);
  const secondsLeftRef = useRef(secondsLeft);
  const baselineRef = useRef<BaselineViewport>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  const inFlutterWv = isFlutterWebView();
  const fsSupported = Boolean(document.fullscreenEnabled) && !inFlutterWv;

  const requestFullscreenMode = useCallback(async () => {
    try {
      if (
        fsSupported &&
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(Boolean(document.fullscreenElement) || !fsSupported);
      setFullscreenPromptNeeded(false);
      notifyFlutterApp('EXAM_LOCK_RESTORED', { student: student.nisn });
      setTimeout(() => {
        baselineRef.current = {
          width: window.innerWidth,
          height: window.innerHeight,
        };
      }, 250);
    } catch {
      setFullscreenPromptNeeded(false);
    }
  }, [fsSupported, student.nisn]);

  const registerViolation = useCallback(
    (
      category: ViolationLogEntry['category'],
      description: string,
      severity: 'sedang' | 'tinggi' = 'tinggi',
      forceModal = true
    ) => {
      if (isSubmittingRef.current) return;

      const now = Date.now();
      if (now - lastViolationTimeRef.current < 1000) {
        return;
      }
      lastViolationTimeRef.current = now;

      const entry: ViolationLogEntry = {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        category,
        description,
        severity,
      };

      playWarningSound(severity);
      notifyFlutterApp('EXAM_VIOLATION', {
        category,
        description,
        timestamp: entry.timestamp,
      });

      setViolations((prev) => {
        const next = [entry, ...prev];
        if (next.length >= MAX_VIOLATIONS) {
          setIsProctorLocked(true);
        }
        return next;
      });

      if (forceModal) {
        setActiveWarningModal(entry);
      }
    },
    []
  );

  const finalizeAndSubmit = useCallback(
    (submittedByTimeout: boolean) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // ignore in restricted WebView
      }

      notifyFlutterApp('EXAM_FINISHED', {
        student: student.nisn,
        violations: violationsRef.current.length,
        submittedByTimeout,
      });

      onFinishExam({
        answers: answersRef.current,
        violations: violationsRef.current,
        elapsedSeconds: EXAM_DURATION_SECONDS - secondsLeftRef.current,
        submittedByTimeout,
      });
    },
    [onFinishExam, student.nisn]
  );

  // Countdown Timer
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          finalizeAndSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finalizeAndSubmit]);

  // Notify native Flutter WebView shell (if present) once on exam entry
  useEffect(() => {
    notifyFlutterApp('EXAM_STARTED', {
      student: student.name,
      nisn: student.nisn,
      classroom: student.classroom,
    });
  }, [student.name, student.nisn, student.classroom]);

  // Strict Anti-Exit, History Back Lock, Tab/Focus Lock, Keyboard & Clipboard Lock
  useEffect(() => {
    // 1. Prevent browser Back button exit (guarded for file:// or custom WebView schemes)
    try {
      window.history.pushState({ examLocked: true }, '', window.location.href);
    } catch {
      // ignore if opaque origin
    }
    const handlePopState = () => {
      if (isSubmittingRef.current) return;
      try {
        window.history.pushState({ examLocked: true }, '', window.location.href);
      } catch {
        // ignore if opaque origin
      }
      registerViolation(
        'Upaya Keluar Halaman',
        'Siswa menekan tombol Kembali (Back) pada browser. Navigasi keluar diblokir oleh sistem ujian.',
        'tinggi'
      );
    };

    // 2. Prevent accidental tab close / refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittingRef.current) return;
      e.preventDefault();
      e.returnValue =
        'Ujian sedang berlangsung dan terkunci! Anda tidak diperbolehkan keluar sebelum mengumpulkan ujian.';
      return e.returnValue;
    };

    // 3. Detect Tab Switch / Minimize / Alt+Tab / Opening Google or AI in another window
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current) {
        registerViolation(
          'Pindah Tab / Aplikasi',
          'Siswa meninggalkan tab ujian atau meminimalkan jendela (indikasi membuka browser Google atau aplikasi AI lain).',
          'tinggi'
        );
      }
    };

    const handleWindowBlur = () => {
      if (!isSubmittingRef.current && isLockActive) {
        registerViolation(
          'Pindah Tab / Aplikasi',
          'Fokus jendela ujian hilang karena berpindah ke aplikasi eksternal atau jendela browser lain.',
          'tinggi'
        );
      }
    };

    // 4. Detect Fullscreen Exit
    const handleFullscreenChange = () => {
      const activeFs = Boolean(document.fullscreenElement);
      setIsFullscreen(activeFs);
      if (activeFs) {
        setFullscreenPromptNeeded(false);
        setTimeout(() => {
          baselineRef.current = {
            width: window.innerWidth,
            height: window.innerHeight,
          };
        }, 200);
      } else if (!isSubmittingRef.current && isLockActive) {
        setFullscreenPromptNeeded(true);
        registerViolation(
          'Keluar Layar Penuh',
          'Siswa keluar dari mode Layar Penuh (Fullscreen). Wajib kembali mengunci layar penuh untuk melanjutkan soal.',
          'tinggi'
        );
      }
    };

    const initialFsCheckTimer = window.setTimeout(() => {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        setIsFullscreen(false);
      }
    }, 450);

    // 5. Block Right Click, Copy, Cut, Paste, Drag
    const blockClipboardOrMenu = (
      e: Event,
      detail: string
    ) => {
      e.preventDefault();
      registerViolation('Salin / Tempel / Klik Kanan', detail, 'sedang');
    };

    const onContextMenu = (e: MouseEvent) =>
      blockClipboardOrMenu(e, 'Klik kanan dinonaktifkan selama ujian berlangsung.');
    const onCopy = (e: ClipboardEvent) =>
      blockClipboardOrMenu(e, 'Upaya menyalin teks soal (Copy) diblokir.');
    const onCut = (e: ClipboardEvent) =>
      blockClipboardOrMenu(e, 'Upaya memotong teks (Cut) diblokir.');
    const onPaste = (e: ClipboardEvent) =>
      blockClipboardOrMenu(
        e,
        'Upaya menempel teks (Paste) terdeteksi dan diblokir.'
      );
    const onDragStart = (e: DragEvent) => e.preventDefault();

    // 6. Block Forbidden Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmittingRef.current) return;

      const key = e.key.toLowerCase();
      const hasCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Allow typing inside Proctor PIN input when proctor locked
      const target = e.target as HTMLElement | null;
      if (target && target.id === 'proctor-pin-input') {
        return;
      }

      if (
        e.key === 'F12' ||
        e.key === 'F11' ||
        e.key === 'Escape' ||
        (hasCtrlOrMeta &&
          ['c', 'v', 'x', 'a', 's', 'p', 'u', 'f', 'r', 'w', 't', 'n', 'h', 'j'].includes(
            key
          )) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
        (e.altKey && (key === 'tab' || key === 'f4'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        registerViolation(
          'Pintasan Terlarang',
          `Tombol/kombinasi pintasan "${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}" diblokir selama ujian.`,
          'tinggi'
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        registerViolation(
          'Pintasan Terlarang',
          'Upaya tangkapan layar (PrintScreen) terdeteksi.',
          'tinggi'
        );
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('dragstart', onDragStart);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.clearTimeout(initialFsCheckTimer);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isLockActive, registerViolation]);

  // Continuous Real-Time Browser Google & AI Extension Scanner + Split Screen / Resize Detector
  useEffect(() => {
    const runLiveScan = () => {
      if (isSubmittingRef.current || isProctorLocked) return;
      const report = scanBrowserEnvironment(true, baselineRef.current);
      setScanReport(report);

      if (report.aiSignaturesFound.length > 0) {
        registerViolation(
          'Indikasi Browser / AI',
          `Terdeteksi komponen ekstensi AI atau overlay pencarian Google aktif: ${report.aiSignaturesFound.join(', ')}`,
          'tinggi'
        );
      } else if (report.splitScreenDetected || report.sidePanelDetected) {
        registerViolation(
          'Layar Terbagi / Sidebar',
          report.sidePanelDetected
            ? 'Terdeteksi panel samping browser (Google Search Sidebar / Copilot / DevTools) terbuka.'
            : 'Ukuran jendela menyusut drastis (indikasi Split-Screen membuka Google atau aplikasi AI di samping).',
          'tinggi'
        );
      } else if (report.pipDetected) {
        registerViolation(
          'Indikasi Browser / AI',
          'Terdeteksi jendela mengambang Picture-in-Picture aktif selama ujian.',
          'tinggi'
        );
      }
    };

    const intervalId = window.setInterval(runLiveScan, 3000);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node instanceof HTMLElement && !node.closest('#root')) {
            const signature = `${node.tagName} ${node.id} ${node.className}`.toLowerCase();
            if (
              signature.includes('chatgpt') ||
              signature.includes('openai') ||
              signature.includes('claude') ||
              signature.includes('perplexity') ||
              signature.includes('monica') ||
              signature.includes('sider') ||
              signature.includes('gauth') ||
              signature.includes('brainly') ||
              signature.includes('google') ||
              node.shadowRoot
            ) {
              runLiveScan();
              break;
            }
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: false,
    });

    const handleResize = () => {
      if (!isSubmittingRef.current) {
        runLiveScan();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.clearInterval(intervalId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isProctorLocked, registerViolation]);

  const currentQuestion = EXAM_QUESTIONS[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const filteredQuestions =
    activeSubjectTab === 'Semua'
      ? EXAM_QUESTIONS
      : EXAM_QUESTIONS.filter((q) => q.subject === activeSubjectTab);

  const handleSelectOption = (optionIndex: number) => {
    if (isProctorLocked || activeWarningModal) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handleUnlockByProctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (proctorPinInput.trim().toUpperCase() === PROCTOR_PIN) {
      setIsProctorLocked(false);
      setActiveWarningModal(null);
      setProctorPinInput('');
      setProctorPinError(null);
      void requestFullscreenMode();
    } else {
      setProctorPinError('PIN Pengawas salah. Hubungi pengawas ujian.');
    }
  };

  const handleManualScan = () => {
    const report = scanBrowserEnvironment(true, baselineRef.current);
    setScanReport(report);
  };

  const optionLetters = ['A', 'B', 'C', 'D'] as const;
  const isContentObscured =
    Boolean(activeWarningModal) || isProctorLocked || fullscreenPromptNeeded;

  return (
    <div
      data-exam-ui="true"
      className="exam-lockdown-active min-h-screen bg-slate-100 text-slate-900 flex flex-col"
    >
      {/* Exam Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-slate-900 truncate">
                {student.name}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums truncate">
                NISN {student.nisn} · {student.classroom}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Lockdown & Fullscreen Status Button */}
            <button
              type="button"
              onClick={() => {
                setIsLockActive(true);
                void requestFullscreenMode();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isFullscreen || !fsSupported
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
              title="Klik untuk memastikan mode kunci aktif"
            >
              {isFullscreen || !fsSupported ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span>
                {!fsSupported
                  ? 'Kunci Aplikasi Aktif'
                  : isFullscreen
                    ? 'Kunci Aplikasi Aktif'
                    : 'Aktifkan Layar Penuh'}
              </span>
            </button>

            {/* Violation Counter */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold font-mono tabular-nums whitespace-nowrap shrink-0 ${
                violations.length === 0
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>
                Peringatan: {violations.length}/{MAX_VIOLATIONS}
              </span>
            </div>

            {/* Countdown Timer */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 font-mono text-sm font-bold tabular-nums whitespace-nowrap shrink-0 ${
                secondsLeft <= 300
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-200 bg-slate-900 text-white'
              }`}
            >
              <span>{formatTimeClock(secondsLeft)}</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Kumpulkan Ujian</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Zone Exam Workspace */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Zone: Active Question */}
          <section className="lg:col-span-8 space-y-4">
            {/* Subject Quick Jump Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">
              {(['Semua', ...SUBJECT_ORDER] as const).map((subj) => {
                const isActive = activeSubjectTab === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      setActiveSubjectTab(subj);
                      if (subj !== 'Semua') {
                        const firstIdx = EXAM_QUESTIONS.findIndex(
                          (q) => q.subject === subj
                        );
                        if (firstIdx >= 0) setCurrentIndex(firstIdx);
                      }
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>

            {/* Question Card (obscured if lockdown warning active) */}
            <div className="relative rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              {isContentObscured && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-slate-900/95 p-6 text-center text-white backdrop-blur-sm">
                  <EyeOff className="h-10 w-10 text-amber-400" />
                  <p className="mt-3 font-display text-lg font-bold">
                    Soal Disembunyikan oleh Penjagaan Ketat
                  </p>
                  <p className="mt-1 max-w-md text-xs text-slate-300">
                    Selesaikan konfirmasi peringatan keamanan atau aktifkan mode
                    layar penuh untuk melihat kembali naskah soal.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <span className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                    Soal No. {currentQuestion.id} / 50
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-900">
                    {currentQuestion.subject}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{currentQuestion.topic}</span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFlag}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    flagged[currentQuestion.id]
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>
                    {flagged[currentQuestion.id]
                      ? 'Ditandai Ragu-Ragu'
                      : 'Tandai Ragu-Ragu'}
                  </span>
                </button>
              </div>

              <div className="mt-6">
                <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-900">
                  {currentQuestion.question}
                </p>

                <div className="mt-6 space-y-3">
                  {currentQuestion.options.map((optText, idx) => {
                    const isSelected = answers[currentQuestion.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-blue-700 bg-blue-50 text-slate-900 ring-1 ring-blue-700'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            isSelected
                              ? 'bg-blue-700 text-white'
                              : 'border border-slate-300 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {optionLetters[idx]}
                        </span>
                        <span className="pt-0.5 text-sm sm:text-base leading-relaxed">
                          {optText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Soal Sebelumnya</span>
                </button>

                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  Terjawab {answeredCount}/50 · Ragu-ragu {flaggedCount}
                </div>

                {currentIndex < EXAM_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((i) =>
                        Math.min(EXAM_QUESTIONS.length - 1, i + 1)
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Soal Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                    <span>Selesai & Kumpulkan</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Right Zone: Question Navigator (1-50) + Live AI/Browser Guard */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Number Grid 1-50 */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-slate-900">
                  Navigasi Nomor 1 – 50
                </h2>
                <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                  {answeredCount}/50
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-2">
                {filteredQuestions.map((q) => {
                  const qIndex = q.id - 1;
                  const isCurrent = qIndex === currentIndex;
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = Boolean(flagged[q.id]);

                  let btnClass =
                    'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                  if (isCurrent) {
                    btnClass =
                      'border-blue-700 bg-blue-700 text-white ring-2 ring-blue-700/25';
                  } else if (isFlagged) {
                    btnClass =
                      'border-amber-400 bg-amber-50 text-amber-900 font-bold';
                  } else if (isAnswered) {
                    btnClass =
                      'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(qIndex)}
                      className={`h-9 rounded-lg border font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${btnClass}`}
                      title={`No. ${q.id} (${q.subject})`}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" />
                  <span>Dijawab</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-amber-400 bg-amber-100" />
                  <span>Ragu-ragu</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
                  <span>Kosong</span>
                </span>
              </div>
            </div>

            {/* Real-Time AI & Browser Security Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {scanReport.overallSafe ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                  )}
                  <h2 className="font-display text-sm font-bold text-slate-900">
                    Deteksi Browser & AI
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleManualScan}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ScanSearch className="h-3.5 w-3.5" />
                  <span>Pindai</span>
                </button>
              </div>

              <div className="space-y-2">
                {scanReport.checks.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-slate-800">{c.label}</span>
                    <span
                      className={`font-semibold shrink-0 ${
                        c.status === 'terdeteksi'
                          ? 'text-red-700'
                          : c.status === 'aman'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {c.status === 'terdeteksi'
                        ? 'Terdeteksi'
                        : c.status === 'aman'
                          ? 'Aman'
                          : 'Peringatan'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent Violation Log */}
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Catatan Pelanggaran Terkini
                </p>
                {violations.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Belum ada pelanggaran. Tetap fokus pada jendela ujian.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {violations.slice(0, 6).map((v) => (
                      <div
                        key={v.id}
                        className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold text-red-800">
                          <span>{v.category}</span>
                          <span className="font-mono tabular-nums">
                            {v.timestamp}
                          </span>
                        </div>
                        <p className="mt-0.5 text-red-700 leading-snug">
                          {v.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Initial Fullscreen Gate (if browser blocked auto-fullscreen on transition) */}
      {fullscreenPromptNeeded && !activeWarningModal && !isProctorLocked && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Maximize2 className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Kunci Layar Penuh Diperlukan
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              Untuk menjaga kejujuran ujian dan mengaktifkan penjagaan anti-keluar,
              ujian harus dijalankan dalam mode Layar Penuh (Fullscreen).
            </p>
            <button
              type="button"
              onClick={() => void requestFullscreenMode()}
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 cursor-pointer"
            >
              Kunci Layar Penuh & Mulai Mengerjakan
            </button>
          </div>
        </div>
      )}

      {/* Strict Warning Modal when Violation Happens */}
      {activeWarningModal && !isProctorLocked && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/90 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-xl border border-red-300 bg-white p-6 sm:p-7 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="font-mono text-xs font-bold text-red-700 tabular-nums">
                  PERINGATAN KEAMANAN #{violations.length} DARI {MAX_VIOLATIONS}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
                  {activeWarningModal.category}
                </h2>
              </div>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 leading-relaxed">
              {activeWarningModal.description}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda tidak diperbolehkan keluar dari aplikasi ujian, berpindah tab,
              membuka browser Google, maupun menjalankan aplikasi/ekstensi AI.
              Jika pelanggaran mencapai {MAX_VIOLATIONS} kali, ujian akan terkunci
              total dan membutuhkan PIN Pengawas.
            </p>

            <button
              type="button"
              onClick={() => {
                setActiveWarningModal(null);
                void requestFullscreenMode();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>Kunci Kembali ke Aplikasi & Lanjutkan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* Proctor Lock Modal (Max Violations Reached) */}
      {isProctorLocked && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-xl border border-red-300 bg-white p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 text-red-700">
              <KeyRound className="h-7 w-7 shrink-0" />
              <div>
                <p className="font-mono text-xs font-bold">
                  BATAS PELANGGARAN TERCAPAI ({violations.length}/{MAX_VIOLATIONS})
                </p>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Ujian Terkunci oleh Sistem Pengawas
                </h2>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              Sistem mendeteksi upaya keluar aplikasi atau aktivitas browser/AI
              berulang kali. Masukkan PIN Pengawas (
              <span className="font-mono font-semibold text-slate-900">
                PENGAWAS9
              </span>
              ) untuk membuka kembali ujian, atau kumpulkan jawaban Anda sekarang.
            </p>

            <form onSubmit={handleUnlockByProctor} className="space-y-3">
              <div>
                <label
                  htmlFor="proctor-pin-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  PIN Pengawas Ujian
                </label>
                <input
                  id="proctor-pin-input"
                  type="password"
                  value={proctorPinInput}
                  onChange={(e) => setProctorPinInput(e.target.value)}
                  placeholder="Masukkan PIN Pengawas"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              {proctorPinError && (
                <p className="text-xs font-medium text-red-700">
                  {proctorPinError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Buka Kunci Ujian
                </button>
                <button
                  type="button"
                  onClick={() => finalizeAndSubmit(false)}
                  className="flex-1 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
                >
                  Kumpulkan Ujian Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <h2 className="font-display text-lg font-bold">
                Konfirmasi Pengumpulan Ujian
              </h2>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1 font-mono tabular-nums">
              <p>Soal Terjawab : {answeredCount} dari 50</p>
              <p>Belum Dijawab : {50 - answeredCount} nomor</p>
              <p>Ditandai Ragu : {flaggedCount} nomor</p>
              <p>Pelanggaran   : {violations.length} catatan</p>
            </div>

            <p className="text-xs text-slate-600">
              Setelah dikumpulkan, kunci aplikasi akan dilepas dan Anda tidak
              dapat mengubah jawaban lagi.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Kembali Mengerjakan
              </button>
              <button
                type="button"
                onClick={() => finalizeAndSubmit(false)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
              >
                Ya, Kumpulkan Ujian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
