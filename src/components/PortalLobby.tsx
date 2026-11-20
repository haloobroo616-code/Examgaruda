import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  ScanSearch,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Clock,
  MonitorCheck,
  Eye,
} from 'lucide-react';
import {
  EnvironmentScanReport,
  scanBrowserEnvironment,
} from '../utils/securityMonitor';
import heroExamImg from '../assets/images/hero_exam_portal_1795166510116.jpg';

export interface StudentProfile {
  name: string;
  nisn: string;
  classroom: string;
}

interface PortalLobbyProps {
  initialStudent: StudentProfile;
  onEnterExam: (student: StudentProfile) => void;
}

const CLASSROOMS = [
  'IX-A',
  'IX-B',
  'IX-C',
  'IX-D',
  'IX-E',
  'IX-F',
  'IX-G',
  'IX-H',
];

const SUBJECT_MODULES = [
  {
    name: 'Matematika',
    range: 'Nomor 1 – 10',
    topics: 'Bilangan Berpangkat, Persamaan Kuadrat, Transformasi, Kesebangunan, Bangun Ruang',
  },
  {
    name: 'Ilmu Pengetahuan Alam (IPA)',
    range: 'Nomor 11 – 20',
    topics: 'Reproduksi, Genetika Mendel, Listrik Statis & Dinamis, Kemagnetan, Bioteknologi',
  },
  {
    name: 'PPKn',
    range: 'Nomor 21 – 30',
    topics: 'Ideologi Pancasila, Pembukaan UUD 1945, Kedaulatan NKRI, Bhinneka Tunggal Ika, Bela Negara',
  },
  {
    name: 'Ilmu Pengetahuan Sosial (IPS)',
    range: 'Nomor 31 – 40',
    topics: 'Benua & Negara di Dunia, Globalisasi, Ekonomi Kreatif, Pasar Bebas, Sejarah Reformasi',
  },
  {
    name: 'Bahasa Indonesia',
    range: 'Nomor 41 – 50',
    topics: 'Laporan Percobaan, Pidato Persuasif, Cerpen & Majas, Tanggapan Kritis, Kalimat Efektif',
  },
];

export const PortalLobby: React.FC<PortalLobbyProps> = ({
  initialStudent,
  onEnterExam,
}) => {
  const [name, setName] = useState(initialStudent.name);
  const [nisn, setNisn] = useState(initialStudent.nisn);
  const [classroom, setClassroom] = useState(initialStudent.classroom);
  const [formError, setFormError] = useState<string | null>(null);
  const [agreedLockdown, setAgreedLockdown] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [scanReport, setScanReport] = useState<EnvironmentScanReport | null>(
    null
  );

  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScanReport(scanBrowserEnvironment(false));
  }, []);

  const handleRunScan = () => {
    setScanReport(scanBrowserEnvironment(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || 'Peserta Kelas 9';
    const trimmedNisn = nisn.trim() || '0000000001';

    if (!agreedLockdown) {
      setFormError(
        'Centang persetujuan aturan penjagaan ketat sebelum masuk ke halaman ujian.'
      );
      return;
    }

    setFormError(null);
    onEnterExam({
      name: trimmedName,
      nisn: trimmedNisn,
      classroom,
    });
  };

  const scrollToEntryForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => nameInputRef.current?.focus(), 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#ringkasan"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            GardaUjian IX
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#ringkasan"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Ringkasan
            </a>
            <a
              href="#mata-pelajaran"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Mata Pelajaran
            </a>
            <a
              href="#penjagaan"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Penjagaan Ketat
            </a>
            <a
              href="#cek-perangkat"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Cek Perangkat
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={scrollToEntryForm}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Masuk Ujian
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-14">
        {/* Hero Split */}
        <section
          id="ringkasan"
          className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch"
        >
          <div className="lg:col-span-6 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-7 sm:p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>SMP Kelas 9</span>
                <span aria-hidden="true">·</span>
                <span>50 Soal Pilihan Ganda</span>
                <span aria-hidden="true">·</span>
                <span>Mode Kunci Aplikasi</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
                Portal Ujian Sekolah Kelas 9 dengan Penjagaan Ketat
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Sistem ujian terpadu mencakup Matematika, IPA, PPKn, IPS, dan
                Bahasa Indonesia (Nomor 1–50). Dilengkapi penguncian layar penuh,
                pencegahan keluar aplikasi, serta pemindai aktif browser Google
                dan aplikasi AI.
              </p>
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="mt-6 space-y-4 border-t border-slate-200 pt-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="student-name"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nama Lengkap Peserta
                  </label>
                  <input
                    ref={nameInputRef}
                    id="student-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Muhammad Rizky Pratama"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-nisn"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nomor Peserta / NISN (Bebas)
                  </label>
                  <input
                    id="student-nisn"
                    type="text"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    placeholder="Isi bebas atau kosongkan untuk tes"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="student-class"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kelas
                  </label>
                  <select
                    id="student-class"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                  >
                    {CLASSROOMS.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedLockdown}
                  onChange={(e) => setAgreedLockdown(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                <span>
                  Saya bersedia mengikuti ujian dalam Mode Kunci Aplikasi (tidak
                  keluar layar penuh, tidak berpindah tab/browser Google, dan
                  tidak menjalankan ekstensi/aplikasi AI).
                </span>
              </label>

              {formError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors cursor-pointer"
              >
                <Lock className="h-4 w-4 shrink-0" />
                <span>Masuk ke Halaman Ujian</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="relative flex-1 min-h-[280px] bg-slate-100">
              {!imageError ? (
                <img
                  src={heroExamImg}
                  alt="Ilustrasi meja belajar ujian digital kelas 9 dengan perangkat komputer dan buku geometri"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-100 to-blue-50 p-8 text-center">
                  <MonitorCheck className="h-12 w-12 text-blue-700" />
                  <p className="font-display text-base font-semibold text-slate-800">
                    Ruang Ujian Digital Terproteksi
                  </p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  Sistem Pengawas Otomatis
                </span>
                <span>
                  Kode pembuka kunci pengawas jika melebihi batas pelanggaran:{' '}
                  <strong className="font-mono text-slate-900">
                    PENGAWAS9
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 4-column Summary Strip */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <BookOpen className="h-4 w-4 text-blue-700" />
              <span>Jumlah Soal</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              50 Nomor
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Pilihan ganda A, B, C, D
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock className="h-4 w-4 text-blue-700" />
              <span>Batas Waktu</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
              60 Menit
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Otomatis tersimpan saat waktu habis
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Lock className="h-4 w-4 text-blue-700" />
              <span>Kunci Anti-Keluar</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              Layar Penuh
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Blokir Back, Tab, dan Pintasan
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ScanSearch className="h-4 w-4 text-blue-700" />
              <span>Detektor Eksternal</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900">
              Google & AI
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Pindai ekstensi, sidebar & split-screen
            </p>
          </div>
        </section>

        {/* Subject Distribution */}
        <section id="mata-pelajaran" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Susunan Soal Kelas 9 (Nomor 1–50)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Lima mata pelajaran utama SMP kelas IX disusun berurutan dalam
                satu sesi ujian terpadu.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Kurikulum SMP Kelas IX
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {SUBJECT_MODULES.map((subj) => (
              <div
                key={subj.name}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <p className="font-mono text-xs font-semibold text-blue-700">
                    {subj.range}
                  </p>
                  <h3 className="mt-1.5 font-display text-base font-bold text-slate-900">
                    {subj.name}
                  </h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  {subj.topics}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Strict Guard Rules + Pre-Exam Security Check */}
        <section
          id="penjagaan"
          className="grid grid-cols-1 gap-8 lg:grid-cols-12"
        >
          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-7 space-y-5">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <h2 className="font-display text-xl font-bold text-slate-900">
                Mekanisme Penjagaan Ketat Ujian
              </h2>
            </div>

            <div className="divide-y divide-slate-200 text-sm">
              <div className="py-3.5 first:pt-0">
                <p className="font-semibold text-slate-900">
                  1. Penguncian Aplikasi & Layar Penuh Wajib
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Saat tombol masuk diklik, aplikasi mengunci tampilan ke layar
                  penuh. Tombol Back browser, tutup tab, serta tombol Escape
                  dicegat. Keluar dari layar penuh langsung memblokir soal dan
                  membunyikan alarm peringatan.
                </p>
              </div>

              <div className="py-3.5">
                <p className="font-semibold text-slate-900">
                  2. Pendeteksi Keluar Tab & Aplikasi Lain
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Perpindahan fokus jendela (Alt+Tab, membuka aplikasi catatan,
                  atau berpindah ke tab browser lain) langsung tercatat sebagai
                  pelanggaran berat dan menghentikan akses soal hingga
                  dikonfirmasi.
                </p>
              </div>

              <div className="py-3.5">
                <p className="font-semibold text-slate-900">
                  3. Pemindai Browser Google & Aplikasi AI
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Sistem memindai injeksi DOM, Shadow DOM, iframe asing, panel
                  samping browser (Google Search Sidebar / Copilot), serta
                  penyempitan jendela layar terbagi (Split-Screen) untuk
                  membuka ChatGPT, Gemini, Brainly, Perplexity, atau ekstensi AI.
                </p>
              </div>

              <div className="py-3.5 last:pb-0">
                <p className="font-semibold text-slate-900">
                  4. Batas Maksimal 5 Kali Pelanggaran (Kunci Pengawas)
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Jika pelanggaran mencapai 5 kali, ujian terkunci total dan
                  tidak bisa dilanjutkan sebelum pengawas memasukkan PIN (
                  <span className="font-mono font-semibold text-slate-800">
                    PENGAWAS9
                  </span>
                  ) atau siswa mengumpulkan ujian.
                </p>
              </div>
            </div>
          </div>

          <div
            id="cek-perangkat"
            className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Eye className="h-5 w-5 text-blue-700" />
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Pra-Pemeriksaan Browser & AI
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleRunScan}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ScanSearch className="h-3.5 w-3.5" />
                  <span>Pindai Ulang</span>
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Pemeriksaan langsung terhadap ekstensi AI aktif, sidebar
                pencarian Google, dan ukuran jendela perangkat Anda sebelum
                memasuki ujian.
              </p>

              {scanReport && (
                <div className="space-y-2.5">
                  {scanReport.checks.map((check) => {
                    const isSafe = check.status === 'aman';
                    const isDanger = check.status === 'terdeteksi';
                    return (
                      <div
                        key={check.id}
                        className={`rounded-lg border p-3.5 ${
                          isDanger
                            ? 'border-red-200 bg-red-50'
                            : isSafe
                              ? 'border-slate-200 bg-slate-50'
                              : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {check.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              isDanger
                                ? 'text-red-700'
                                : isSafe
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {isDanger ? (
                              <ShieldAlert className="h-3.5 w-3.5" />
                            ) : isSafe ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {isDanger
                                ? 'Terdeteksi'
                                : isSafe
                                  ? 'Aman'
                                  : 'Perhatian'}
                            </span>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {check.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {scanReport && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                <span>
                  Status Umum:{' '}
                  <strong
                    className={
                      scanReport.overallSafe
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }
                  >
                    {scanReport.overallSafe
                      ? 'Perangkat Bersih & Siap Ujian'
                      : 'Tutup Ekstensi AI / Perbesar Jendela'}
                  </strong>
                </span>
                <span className="font-mono tabular-nums">
                  {scanReport.timestamp}
                </span>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-6 text-xs text-slate-500">
          <span>GardaUjian IX — Sistem Evaluasi Terproteksi SMP Kelas 9</span>
          <span>Matematika · IPA · PPKn · IPS · Bahasa Indonesia</span>
        </div>
      </footer>
    </div>
  );
};
