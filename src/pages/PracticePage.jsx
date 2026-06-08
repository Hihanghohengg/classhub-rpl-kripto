import React, { useState } from 'react';
import {
  BookOpenCheck,
  ExternalLink,
  FileText,
  MonitorPlay
} from 'lucide-react';

const practices = [
  {
    id: 'secure-sdlc',
    title: 'Latihan Secure SDLC',
    course: 'Metode Perancangan Program Aman',
    description:
      'Simulasi CBT dari materi Secure SDLC, STRIDE, CIA Triad, Secure Coding, SAST, dan DAST.',
    url: '/practice/secure-sdlc.html',
    type: 'CBT'
  },
  {
    id: 'kapita-selekta-pernika',
    title: 'Latihan Pernika & Sandi Morse',
    course: 'Kapita Selekta',
    description:
      'Simulator latihan UTS tentang Pernika, SDR, jammer, OTP, sandi Morse, dan komunikasi taktis.',
    url: '/practice/kapita-selekta-pernika.html',
    type: 'Simulator'
  },
  {
    id: 'machine-learning',
    title: 'Latihan Machine Learning',
    course: 'Machine Learning',
    description:
      'Simulator latihan praktik tentang pipeline, data leakage, hyperparameter tuning, evaluasi model, RNN, dan LSTM.',
    url: '/practice/machine-learning.html',
    type: 'Simulator'
  },
  {
    id: 'cma-mastery-lab',
    title: 'Latihan CMA',
    course: 'CMA Lesson',
    description:
      'Simulator latihan Cryptography Modul Analysis.',
    url: '/practice/cma-mastery-lab.html',
    type: 'Simulator'
  }
];

export default function PracticePage() {
  const [selected, setSelected] = useState(practices[0]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Latihan Soal
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tersedia latihan soal berbasis CBT dari materi kuliah di ClassHub.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <BookOpenCheck size={22} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Daftar Latihan
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih latihan yang ingin dibuka.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {practices.map((item) => {
              const isActive = selected?.id === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? 'border-blue-400 bg-blue-50 text-blue-900 ring-4 ring-blue-500/10 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-xl bg-white p-2 text-blue-700 dark:bg-slate-900 dark:text-blue-300">
                      <FileText size={18} />
                    </div>

                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {item.type}
                    </span>
                  </div>

                  <p className="font-bold">{item.title}</p>

                  <p className="mt-1 text-xs font-semibold opacity-70">
                    {item.course}
                  </p>

                  <p className="mt-2 text-xs leading-5 opacity-75">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:grid">
                <MonitorPlay size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900 dark:text-white">
                  {selected.title}
                </p>

                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {selected.url}
                </p>
              </div>
            </div>

            <a
              href={selected.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <ExternalLink size={15} />
              Buka Tab Baru
            </a>
          </div>

          <iframe
            key={selected.id}
            title={selected.title}
            src={selected.url}
            className="h-[calc(100%-65px)] w-full border-0 bg-white"
          />
        </section>
      </div>
    </div>
  );
}
