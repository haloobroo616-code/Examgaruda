/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState } from 'react';
import { PortalLobby, StudentProfile } from './components/PortalLobby';
import { ExamWorkspace } from './components/ExamWorkspace';
import { ExamResults } from './components/ExamResults';
import { ViolationLogEntry, isFlutterWebView } from './utils/securityMonitor';

type AppView = 'lobby' | 'exam' | 'results';

interface ExamResultPayload {
  answers: Record<number, number>;
  violations: ViolationLogEntry[];
  elapsedSeconds: number;
  submittedByTimeout: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h1 className="font-display text-lg font-bold text-slate-900">
              Terjadi Gangguan Tampilan
            </h1>
            <p className="text-xs text-slate-600">
              Silakan muat ulang halaman untuk melanjutkan sesi ujian.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState<AppView>('lobby');
  const [student, setStudent] = useState<StudentProfile>({
    name: '',
    nisn: '',
    classroom: 'IX-A',
  });
  const [result, setResult] = useState<ExamResultPayload | null>(null);

  const handleEnterExam = (profile: StudentProfile) => {
    setStudent(profile);

    try {
      if (
        !isFlutterWebView() &&
        document.fullscreenEnabled &&
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen().catch(() => {
          // Handled inside ExamWorkspace if browser blocks automatic fullscreen
        });
      }
    } catch {
      // Safe fallback for WebView
    }

    setView('exam');
  };

  const handleFinishExam = (payload: ExamResultPayload) => {
    setResult(payload);
    setView('results');
  };

  const handleRestart = () => {
    setResult(null);
    setView('lobby');
  };

  return (
    <AppErrorBoundary>
      {view === 'exam' ? (
        <ExamWorkspace student={student} onFinishExam={handleFinishExam} />
      ) : view === 'results' && result ? (
        <ExamResults
          student={student}
          answers={result.answers}
          violations={result.violations}
          elapsedSeconds={result.elapsedSeconds}
          submittedByTimeout={result.submittedByTimeout}
          onRestart={handleRestart}
        />
      ) : (
        <PortalLobby initialStudent={student} onEnterExam={handleEnterExam} />
      )}
    </AppErrorBoundary>
  );
}
