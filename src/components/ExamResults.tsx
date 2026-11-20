import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Award,
} from 'lucide-react';
import {
  EXAM_QUESTIONS,
  SUBJECT_ORDER,
  SubjectName,
} from '../data/questions';
import { ViolationLogEntry, formatTimeClock } from '../utils/securityMonitor';
import { StudentProfile } from './PortalLobby';

interface ExamResultsProps {
  student: StudentProfile;
  answers: Record<number, number>;
  violations: ViolationLogEntry[];
  elapsedSeconds: number;
  submittedByTimeout: boolean;
  onRestart: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  student,
  answers,
  violations,
  elapsedSeconds,
  submittedByTimeout,
  onRestart,
}) => {
  const [filterSubject, setFilterSubject] = useState<SubjectName | 'Semua'>('Semua');

  let totalCorrect = 0;
  let totalAnswered = 0;

  const subjectStats = SUBJECT_ORDER.map((subj) => {
    const questions = EXAM_QUESTIONS.filter((q) => q.subject === subj);
    let correct = 0;
    for (const q of questions) {
      const userAns = answers[q.id];
      if (userAns !== undefined) {
        totalAnswered++;
        if (userAns === q.correctIndex) {
          correct++;
          totalCorrect++;
        }
      }
    }
    return {
      subject: subj,
      correct,
      total: questions.length,
      score: Math.round((correct / questions.length) * 100),
    };
  });

  const finalScore = Math.round((totalCorrect / EXAM_QUESTIONS.length) * 100);
  const optionLetters = ['A', 'B', 'C', 'D'] as const;

  const visibleQuestions =
    filterSubject === 'Semua'
      ? EXAM_QUESTIONS
      : EXAM_QUESTIONS.filter((q) => q.subject === filterSubject);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            GardaUjian IX
          </span>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Kembali ke Halaman Awal</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        {/* Top Summary Banner */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Hasil Evaluasi Ujian Sekolah Kelas 9
                  {submittedByTimeout ? ' · Dikumpulkan Otomatis (Waktu Habis)' : ''}
                </p>
                <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  {student.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                  NISN {student.nisn} · Kelas {student.classroom} · Durasi{' '}
                  {formatTimeClock(elapsedSeconds)}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                <Award className="h-7 w-7 text-blue-700" />
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Nilai Akhir
                  </p>
                  <p className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                    {finalScore}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-5 font-mono tabular-nums">
              <div>
                <p className="font-sans text-xs text-slate-500">Benar</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {totalCorrect}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-slate-500">Salah</p>
                <p className="mt-1 text-xl font-bold text-red-700">
                  {totalAnswered - totalCorrect}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-slate-500">Kosong</p>
                <p className="mt-1 text-xl font-bold text-slate-700">
                  {EXAM_QUESTIONS.length - totalAnswered}
                </p>
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-200 pt-5">
              {subjectStats.map((s) => (
                <div
                  key={s.subject}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {s.subject}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-blue-700 tabular-nums">
                    {s.score}
                  </p>
                  <p className="font-mono text-xs text-slate-500 tabular-nums">
                    {s.correct}/{s.total} benar
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Integrity & Security Audit Report */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                {violations.length === 0 ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                )}
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Laporan Integritas & Penjagaan
                </h2>
              </div>

              <div
                className={`rounded-lg border p-3.5 text-xs ${
                  violations.length === 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                {violations.length === 0 ? (
                  <p className="font-semibold">
                    Bersih (0 Pelanggaran) — Siswa menyelesaikan seluruh sesi
                    tanpa keluar layar penuh, tanpa berpindah tab, dan tanpa
                    indikasi browser Google/AI.
                  </p>
                ) : (
                  <p className="font-semibold">
                    Tercatat {violations.length} Peringatan Keamanan selama
                    ujian berlangsung.
                  </p>
                )}
              </div>

              {violations.length > 0 && (
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {violations.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{v.category}</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {v.timestamp}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-600">{v.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Answer Key & Discussion 1-50 */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Pembahasan Soal Nomor 1 – 50
              </h2>
              <p className="text-xs text-slate-600">
                Tinjau jawaban Anda beserta kunci jawaban dan pembahasan resmi.
              </p>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
              {(['Semua', ...SUBJECT_ORDER] as const).map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setFilterSubject(subj)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterSubject === subj
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {visibleQuestions.map((q) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctIndex;
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-slate-900">
                        No. {q.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-700">
                        {q.subject}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{q.topic}</span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isCorrect
                          ? 'text-emerald-700'
                          : userAns === undefined
                            ? 'text-slate-500'
                            : 'text-red-700'
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>
                        {isCorrect
                          ? 'Jawaban Benar'
                          : userAns === undefined
                            ? 'Tidak Dijawab'
                            : 'Jawaban Kurang Tepat'}
                      </span>
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    {q.question}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      <span className="text-slate-500">Jawaban Anda: </span>
                      <span className="font-semibold text-slate-900">
                        {userAns !== undefined
                          ? `${optionLetters[userAns]}. ${q.options[userAns]}`
                          : 'Kosong'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                      <span className="text-emerald-800">Kunci Jawaban: </span>
                      <span className="font-semibold text-emerald-900">
                        {optionLetters[q.correctIndex]}.{' '}
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600">
                    <strong className="text-slate-800">Pembahasan:</strong>{' '}
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
