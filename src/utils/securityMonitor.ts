export interface SecurityCheckResult {
  id: string;
  label: string;
  status: 'aman' | 'peringatan' | 'terdeteksi';
  detail: string;
}

export interface ViolationLogEntry {
  id: string;
  timestamp: string;
  category:
    | 'Keluar Layar Penuh'
    | 'Pindah Tab / Aplikasi'
    | 'Indikasi Browser / AI'
    | 'Layar Terbagi / Sidebar'
    | 'Pintasan Terlarang'
    | 'Upaya Keluar Halaman'
    | 'Salin / Tempel / Klik Kanan';
  description: string;
  severity: 'sedang' | 'tinggi';
}

export interface EnvironmentScanReport {
  timestamp: string;
  overallSafe: boolean;
  aiSignaturesFound: string[];
  splitScreenDetected: boolean;
  sidePanelDetected: boolean;
  automationDetected: boolean;
  pipDetected: boolean;
  checks: SecurityCheckResult[];
}

const AI_AND_GOOGLE_SIGNATURES = [
  { key: 'chatgpt', label: 'ChatGPT / OpenAI' },
  { key: 'openai', label: 'OpenAI Assistant' },
  { key: 'claude', label: 'Claude AI' },
  { key: 'anthropic', label: 'Anthropic AI' },
  { key: 'gemini-overlay', label: 'Gemini Overlay' },
  { key: 'perplexity', label: 'Perplexity AI' },
  { key: 'monica', label: 'Monica AI Sidebar' },
  { key: 'sider', label: 'Sider AI Extension' },
  { key: 'merlin', label: 'Merlin AI' },
  { key: 'harpa', label: 'HARPA AI' },
  { key: 'quillbot', label: 'QuillBot Extension' },
  { key: 'gauth', label: 'Gauthmath / Gauth AI' },
  { key: 'brainly', label: 'Brainly Helper' },
  { key: 'chegg', label: 'Chegg Overlay' },
  { key: 'blackbox', label: 'Blackbox AI' },
  { key: 'liner', label: 'Liner AI' },
  { key: 'cici', label: 'Cici AI' },
  { key: 'copilot-sidebar', label: 'Browser Copilot Sidebar' },
  { key: 'google-lens', label: 'Google Lens Overlay' },
  { key: 'goog-te', label: 'Google Translate Overlay' },
];

export interface BaselineViewport {
  width: number;
  height: number;
}

interface FlutterWindow extends Window {
  flutter_inappwebview?: {
    callHandler?: (handlerName: string, ...args: unknown[]) => Promise<unknown>;
  };
  FlutterExamChannel?: {
    postMessage?: (message: string) => void;
  };
}

export function isFlutterWebView(): boolean {
  try {
    const win = window as FlutterWindow;
    if (win.flutter_inappwebview || win.FlutterExamChannel) {
      return true;
    }
    const ua = navigator.userAgent || '';
    const isAndroidWv = /; wv\)/i.test(ua);
    const isIosWv =
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
    return isAndroidWv || isIosWv;
  } catch {
    return false;
  }
}

export function notifyFlutterApp(
  eventType:
    | 'EXAM_STARTED'
    | 'EXAM_LOCK_RESTORED'
    | 'EXAM_VIOLATION'
    | 'EXAM_FINISHED',
  payload?: Record<string, unknown>
): void {
  try {
    const win = window as FlutterWindow;
    const message = JSON.stringify({ eventType, payload: payload ?? {} });
    if (win.FlutterExamChannel?.postMessage) {
      win.FlutterExamChannel.postMessage(message);
    }
    if (win.flutter_inappwebview?.callHandler) {
      void win.flutter_inappwebview
        .callHandler('examSecurityEvent', { eventType, payload: payload ?? {} })
        .catch(() => {});
    }
  } catch {
    // Ignore when running on standard desktop/mobile browser without Flutter bridge
  }
}

export function scanBrowserEnvironment(
  requireFullscreen = false,
  baseline?: BaselineViewport
): EnvironmentScanReport {
  const aiSignaturesFound: string[] = [];

  // 1. Scan injected DOM elements, IDs, classes, and custom extension tags
  try {
    const allElements = document.querySelectorAll(
      '[id], [class], iframe, script[src], [data-extension], [data-ai]'
    );
    const maxScan = Math.min(allElements.length, 1500);

    for (let i = 0; i < maxScan; i++) {
      const el = allElements[i];
      const tag = el.tagName.toLowerCase();
      const id = (el.id || '').toLowerCase();
      const cls =
        typeof el.className === 'string' ? el.className.toLowerCase() : '';
      const src = (el.getAttribute('src') || '').toLowerCase();

      const isAppControlled = el.hasAttribute('data-exam-ui');
      if (isAppControlled) continue;

      for (const sig of AI_AND_GOOGLE_SIGNATURES) {
        if (
          id.includes(sig.key) ||
          cls.includes(sig.key) ||
          src.includes(sig.key) ||
          tag.includes(sig.key)
        ) {
          if (!aiSignaturesFound.includes(sig.label)) {
            aiSignaturesFound.push(sig.label);
          }
        }
      }

      if (tag === 'iframe' && src && !src.startsWith(window.location.origin)) {
        if (
          src.includes('google.com') ||
          src.includes('openai') ||
          src.includes('claude') ||
          src.includes('perplexity') ||
          src.includes('brainly')
        ) {
          try {
            const label = `Iframe Eksternal (${new URL(src).hostname})`;
            if (!aiSignaturesFound.includes(label)) {
              aiSignaturesFound.push(label);
            }
          } catch {
            // ignore invalid URL
          }
        }
      }

      if (el.parentElement === document.documentElement || el.parentElement === document.body) {
        if (el.id !== 'root' && el.shadowRoot) {
          const shadowHtml = el.shadowRoot.innerHTML.toLowerCase();
          for (const sig of AI_AND_GOOGLE_SIGNATURES) {
            if (shadowHtml.includes(sig.key)) {
              if (!aiSignaturesFound.includes(sig.label)) {
                aiSignaturesFound.push(`${sig.label} (Shadow DOM)`);
              }
            }
          }
          if (aiSignaturesFound.length === 0 && (el.id || el.tagName.includes('-'))) {
            aiSignaturesFound.push(`Ekstensi Overlay (${el.tagName.toLowerCase()})`);
          }
        }
      }
    }

    if (typeof performance !== 'undefined' && performance.getEntriesByType) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const res of resources) {
        const name = (res.name || '').toLowerCase();
        if (
          name.startsWith('chrome-extension://') ||
          name.startsWith('moz-extension://') ||
          name.startsWith('edge-extension://')
        ) {
          for (const sig of AI_AND_GOOGLE_SIGNATURES) {
            if (name.includes(sig.key) && !aiSignaturesFound.includes(sig.label)) {
              aiSignaturesFound.push(`${sig.label} (Ekstensi Browser)`);
            }
          }
        }
      }
    }
  } catch {
    // Fail safe if DOM restriction occurs
  }

  // 2. Detect Split-Screen / Shrunk Window (e.g. Google Search / ChatGPT opened side-by-side)
  const isEmbedded = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const inFlutterWv = isFlutterWebView();
  const screenW = window.screen?.availWidth || window.screen?.width || window.innerWidth;
  const screenH = window.screen?.availHeight || window.screen?.height || window.innerHeight;
  const widthRatio = window.innerWidth / Math.max(screenW, 1);
  const heightRatio = window.innerHeight / Math.max(screenH, 1);
  const isMobileViewport = screenW < 768 || inFlutterWv;

  // Ignore height changes while typing in an input/select (mobile soft keyboard)
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  const isTypingInInput = activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea';

  let splitScreenDetected = false;
  if (!isTypingInInput) {
    if (inFlutterWv) {
      // On Android/iOS Flutter WebView, split-screen shrinks window width significantly
      if (baseline && baseline.width > 0) {
        splitScreenDetected = window.innerWidth / baseline.width < 0.78;
      } else {
        splitScreenDetected = widthRatio < 0.72;
      }
    } else if (baseline && baseline.width > 0 && baseline.height > 0) {
      const relW = window.innerWidth / baseline.width;
      const relH = window.innerHeight / baseline.height;
      splitScreenDetected = !isMobileViewport && (relW < 0.82 || relH < 0.78);
    } else if (!isEmbedded) {
      splitScreenDetected = !isMobileViewport && (widthRatio < 0.75 || heightRatio < 0.7);
    }
  }

  // 3. Detect Side Panel (Chrome Google Search Side Panel / Edge Copilot / DevTools docked)
  // Note: Android/iOS WebView often reports outerWidth/outerHeight as 0, so guard > 0
  const hasValidOuterMetrics = window.outerWidth > 0 && window.outerHeight > 0;
  const widthDiff = hasValidOuterMetrics
    ? Math.abs(window.outerWidth - window.innerWidth)
    : 0;
  const heightDiff = hasValidOuterMetrics
    ? Math.abs(window.outerHeight - window.innerHeight)
    : 0;
  const isFullscreen = Boolean(document.fullscreenElement);
  const sidePanelDetected =
    !isEmbedded &&
    !isMobileViewport &&
    !inFlutterWv &&
    !isFullscreen &&
    hasValidOuterMetrics &&
    (widthDiff > 240 || heightDiff > 240);

  // 4. Detect Automation / WebDriver
  const nav = navigator as Navigator & { webdriver?: boolean };
  const automationDetected = Boolean(nav.webdriver);

  // 5. Detect Picture-in-Picture
  const pipDetected = Boolean(document.pictureInPictureElement);

  const fsSupported = Boolean(document.fullscreenEnabled) && !inFlutterWv;

  const checks: SecurityCheckResult[] = [
    {
      id: 'dom-ai',
      label: 'Pemindai Ekstensi & Aplikasi AI',
      status: aiSignaturesFound.length > 0 ? 'terdeteksi' : 'aman',
      detail:
        aiSignaturesFound.length > 0
          ? `Terdeteksi injeksi/ekstensi: ${aiSignaturesFound.join(', ')}`
          : 'Tidak ditemukan skrip asisten AI atau overlay Google di DOM',
    },
    {
      id: 'split-screen',
      label: 'Integritas Layar & Anti Split-Screen',
      status: splitScreenDetected ? 'terdeteksi' : 'aman',
      detail: splitScreenDetected
        ? `Jendela hanya mengisi ${Math.round(widthRatio * 100)}% lebar layar (indikasi jendela ganda / Google di samping)`
        : `Ukuran jendela penuh (${Math.round(widthRatio * 100)}% lebar layar)`,
    },
    {
      id: 'side-panel',
      label: 'Deteksi Sidebar Browser / DevTools',
      status: sidePanelDetected ? 'terdeteksi' : 'aman',
      detail: sidePanelDetected
        ? `Selisih frame browser ${widthDiff}px × ${heightDiff}px (indikasi Sidebar AI / Google Search / Inspect)`
        : 'Tidak ada panel samping browser atau DevTools terbuka',
    },
    {
      id: 'focus-fullscreen',
      label: requireFullscreen
        ? fsSupported
          ? 'Kunci Layar Penuh & Fokus'
          : 'Kunci Aplikasi & Fokus'
        : 'Kesiapan Kunci Layar',
      status: requireFullscreen
        ? fsSupported
          ? isFullscreen && document.hasFocus()
            ? 'aman'
            : 'peringatan'
          : document.hasFocus()
            ? 'aman'
            : 'peringatan'
        : document.hasFocus()
          ? 'aman'
          : 'peringatan',
      detail: requireFullscreen
        ? fsSupported
          ? isFullscreen
            ? 'Mode layar penuh aktif dan jendela fokus'
            : 'Layar penuh belum aktif atau fokus keluar'
          : document.hasFocus()
            ? 'Mode kunci aplikasi WebView aktif dan jendela fokus'
            : 'Fokus aplikasi keluar'
        : 'Siap mengunci sesi saat ujian dimulai',
    },
  ];

  if (automationDetected || pipDetected) {
    checks.push({
      id: 'env-extra',
      label: 'Lingkungan Browser & PiP',
      status: 'terdeteksi',
      detail: automationDetected
        ? 'Terdeteksi browser otomatis (WebDriver)'
        : 'Terdeteksi jendela Picture-in-Picture mengambang',
    });
  }

  const overallSafe =
    aiSignaturesFound.length === 0 &&
    !splitScreenDetected &&
    !sidePanelDetected &&
    !automationDetected &&
    !pipDetected;

  return {
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    overallSafe,
    aiSignaturesFound,
    splitScreenDetected,
    sidePanelDetected,
    automationDetected,
    pipDetected,
    checks,
  };
}

let sharedAudioCtx: AudioContext | null = null;

export function playWarningSound(severity: 'sedang' | 'tinggi' = 'tinggi'): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();

    osc.type = severity === 'tinggi' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(severity === 'tinggi' ? 880 : 660, now);
    osc.frequency.setValueAtTime(severity === 'tinggi' ? 620 : 520, now + 0.14);
    if (severity === 'tinggi') {
      osc.frequency.setValueAtTime(880, now + 0.28);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (severity === 'tinggi' ? 0.48 : 0.28));

    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start(now);
    osc.stop(now + (severity === 'tinggi' ? 0.5 : 0.3));
  } catch {
    // Ignore audio context block if user hasn't interacted yet
  }
}

export function formatTimeClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
