import React, { useEffect, useMemo, useState } from 'react';
import {
  RotateCw,
  Trophy,
  Undo2,
  UserMinus,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';

const WHEEL_COLORS = [
  '#0ea5e9',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#16a34a',
  '#059669',
  '#0891b2'
];

const SPIN_DURATION = 5200;

function getDisplayName(member) {
  return (
    member?.nickname?.trim() ||
    member?.full_name?.trim() ||
    member?.npm?.trim() ||
    'Tanpa Nama'
  );
}

function getWheelName(member) {
  const nickname = member?.nickname?.trim();

  if (nickname) return nickname;

  const fullName = member?.full_name?.trim();

  if (fullName) {
    return fullName.split(/\s+/)[0];
  }

  return 'Nama';
}

function getInitial(member) {
  return getDisplayName(member).slice(0, 1).toUpperCase();
}

function getRandomIndex(length) {
  if (length <= 1) return 0;

  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);

    return values[0] % length;
  }

  return Math.floor(Math.random() * length);
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  };
}

function describeSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

function truncateName(name, maxLength = 12) {
  if (!name) return '-';

  return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
}

function Wheel({ members, rotation, isSpinning }) {
  const segmentSize = members.length ? 360 / members.length : 360;

  if (!members.length) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-full border-[10px] border-white bg-slate-100 shadow-2xl dark:border-slate-950 dark:bg-slate-800">
        <div className="text-center">
          <p className="text-3xl font-black text-slate-400">SPIN</p>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Belum ada nama aktif
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="aspect-square w-full"
      style={{
        transform: `rotate(${rotation}deg)`,
        transitionProperty: 'transform',
        transitionDuration: isSpinning ? `${SPIN_DURATION}ms` : '0ms',
        transitionTimingFunction: 'cubic-bezier(0.08, 0.82, 0.12, 1)'
      }}
    >
      <svg
        viewBox="0 0 500 500"
        className="h-full w-full overflow-visible drop-shadow-2xl"
        role="img"
        aria-label="Spin wheel"
      >
        <circle
          cx="250"
          cy="250"
          r="244"
          className="fill-white dark:fill-slate-950"
        />

        {members.map((member, index) => {
          const startAngle = index * segmentSize;
          const endAngle = (index + 1) * segmentSize;
          const middleAngle = startAngle + segmentSize / 2;
          const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

          return (
            <g key={member.id}>
              <path
                d={describeSlice(250, 250, 232, startAngle, endAngle)}
                fill={color}
                stroke="rgba(15, 23, 42, 0.28)"
                strokeWidth="1.5"
              />

              <text
                x="250"
                y="75"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${middleAngle} 250 250)`}
                className="select-none fill-white text-[18px] font-black tracking-wide"
                style={{
                  paintOrder: 'stroke',
                  stroke: 'rgba(15, 23, 42, 0.55)',
                  strokeWidth: 4
                }}
              >
                {truncateName(getWheelName(member))}
              </text>
            </g>
          );
        })}

        <circle cx="250" cy="250" r="106" className="fill-slate-950" />
        <circle
          cx="250"
          cy="250"
          r="96"
          className="fill-white dark:fill-slate-950"
          opacity="0.98"
        />

        <text
          x="250"
          y="238"
          textAnchor="middle"
          className="select-none fill-slate-400 text-[13px] font-black tracking-[0.25em]"
        >
          CLASSHUB
        </text>
        <text
          x="250"
          y="270"
          textAnchor="middle"
          className="select-none fill-slate-900 text-[35px] font-black dark:fill-white"
        >
          SPIN
        </text>
        <text
          x="250"
          y="294"
          textAnchor="middle"
          className="select-none fill-slate-400 text-[12px] font-bold"
        >
          {members.length} nama aktif
        </text>
      </svg>
    </div>
  );
}

export default function SpinPage() {
  const [members, setMembers] = useState([]);
  const [wheelMembers, setWheelMembers] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const activePool = useMemo(() => {
    return members.filter((member) => !removedIds.includes(member.id));
  }, [members, removedIds]);

  const loadMembers = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, npm')
      .order('npm', { ascending: true });

    if (error) {
      setMessage(error.message);
      setMembers([]);
      setWheelMembers([]);
      setLoading(false);
      return;
    }

    const cleanData = (data || []).filter((member) => member.id);

    setMembers(cleanData);
    setWheelMembers(cleanData);
    setRemovedIds([]);
    setHistory([]);
    setWinner(null);
    setRotation(0);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSpin = () => {
    if (isSpinning || activePool.length === 0) return;

    const spinPool = activePool;
    const selectedIndex = getRandomIndex(spinPool.length);
    const selectedMember = spinPool[selectedIndex];

    const segmentSize = 360 / spinPool.length;
    const selectedCenter = selectedIndex * segmentSize + segmentSize / 2;
    const currentRotation = ((rotation % 360) + 360) % 360;

    // Pointer ada di atas roda = angle 0.
    // Supaya konsisten, pusat segmen pemenang harus berhenti tepat di angle 0.
    const targetDelta =
      ((0 - selectedCenter - currentRotation) % 360 + 360) % 360;

    const extraSpin = 360 * (5 + getRandomIndex(4));
    const nextRotation = rotation + extraSpin + targetDelta;

    setIsSpinning(true);
    setWinner(null);
    setMessage('');
    setWheelMembers(spinPool);

    window.requestAnimationFrame(() => {
      setRotation(nextRotation);
    });

    window.setTimeout(() => {
      setWinner(selectedMember);
      setHistory((items) => [...items, selectedMember]);
      setRemovedIds((ids) => [...ids, selectedMember.id]);
      setIsSpinning(false);

      // Sengaja tidak langsung mengubah wheelMembers setelah berhenti.
      // Ini membuat nama yang ditunjuk panah tetap sama dengan nama terpilih.
      // Pada spin berikutnya, wheelMembers akan otomatis memakai activePool terbaru.
    }, SPIN_DURATION);
  };

  const handleReset = () => {
    if (isSpinning) return;

    setRemovedIds([]);
    setHistory([]);
    setWinner(null);
    setRotation(0);
    setWheelMembers(members);

    if (members.length === 0) {
      loadMembers();
    }
  };

  const handleSkip = (memberId) => {
    if (isSpinning) return;

    setRemovedIds((ids) => {
      if (ids.includes(memberId)) return ids;

      return [...ids, memberId];
    });

    setWheelMembers((items) => items.filter((member) => member.id !== memberId));

    if (winner?.id === memberId) {
      setWinner(null);
    }
  };

  const handleRestore = (memberId) => {
    if (isSpinning) return;

    setRemovedIds((ids) => ids.filter((id) => id !== memberId));

    const restoredMember = members.find((member) => member.id === memberId);

    if (restoredMember) {
      setWheelMembers((items) => {
        if (items.some((member) => member.id === memberId)) return items;

        return members.filter((member) =>
          [...items.map((item) => item.id), memberId].includes(member.id)
        );
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
              Random Picker
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white md:text-3xl">
              Spin Tools
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Pilih nama secara acak dengan spin wheel. Nama yang sudah keluar
              otomatis tidak akan kepilih lagi di spin berikutnya.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            disabled={loading || isSpinning}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Undo2 size={16} />
            Reset
          </button>
        </section>

        {message && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {message}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
              <div className="relative mx-auto grid aspect-square w-full max-w-[560px] place-items-center">
                <div className="absolute -top-2 z-20 h-0 w-0 border-x-[18px] border-t-[34px] border-x-transparent border-t-red-500 drop-shadow" />

                <Wheel
                  members={wheelMembers}
                  rotation={rotation}
                  isSpinning={isSpinning}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Users size={15} />
                      Aktif
                    </div>
                    <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                      {activePool.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <Trophy size={15} />
                      Terpilih
                    </div>
                    <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                      {history.length}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={loading || isSpinning || activePool.length === 0}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-blue-900 to-sky-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 dark:from-blue-700 dark:to-sky-500"
                >
                  <RotateCw
                    size={20}
                    className={isSpinning ? 'animate-spin' : ''}
                  />
                  {isSpinning ? 'Spinning...' : 'Mulai Spin'}
                </button>

                {winner ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900 dark:bg-amber-950">
                    <Trophy className="mx-auto h-7 w-7 text-amber-500" />
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                      Terpilih
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {getDisplayName(winner)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {winner.npm || '-'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    {loading
                      ? 'Memuat data anggota...'
                      : activePool.length
                        ? 'Klik Mulai Spin untuk memilih satu nama secara acak.'
                        : 'Semua nama sudah keluar. Klik Reset untuk mulai lagi.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Urutan Terpilih
              </h2>

              <div className="mt-4 max-h-[330px] space-y-2 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Belum ada yang terpilih.
                  </p>
                ) : (
                  history.map((member, index) => (
                    <div
                      key={`${member.id}-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sm font-black text-blue-900 dark:bg-blue-900 dark:text-white">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {getDisplayName(member)}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {member.npm || '-'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Pool Nama
              </h2>

              <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Memuat data anggota...
                  </p>
                ) : members.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    Belum ada nama di tabel profiles.
                  </p>
                ) : (
                  members.map((member) => {
                    const removed = removedIds.includes(member.id);

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition ${
                          removed
                            ? 'border-slate-200 bg-slate-100 opacity-60 dark:border-slate-800 dark:bg-slate-950'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                            {getInitial(member)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {getDisplayName(member)}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {member.npm || '-'}
                            </p>
                          </div>
                        </div>

                        {removed ? (
                          <button
                            type="button"
                            onClick={() => handleRestore(member.id)}
                            disabled={isSpinning}
                            className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Balik
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSkip(member.id)}
                            disabled={isSpinning}
                            className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
                          >
                            <UserMinus size={13} />
                            Hapus
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
