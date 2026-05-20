import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, RefreshCw, Shuffle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

function shuffleArray(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function splitByGroupCount(members, groupCount) {
  const groups = Array.from({ length: groupCount }, () => []);

  members.forEach((member, index) => {
    groups[index % groupCount].push(member);
  });

  return groups;
}

function splitByMemberPerGroup(members, memberPerGroup) {
  const groups = [];

  for (let i = 0; i < members.length; i += memberPerGroup) {
    groups.push(members.slice(i, i + memberPerGroup));
  }

  return groups;
}

function formatMemberName(member) {
  if (!member) return '-';

  const nickname = member.nickname ? ` (${member.nickname})` : '';

  return `${member.full_name || member.nickname || '-'}${nickname}`;
}

export default function GroupsPage() {
  const [members, setMembers] = useState([]);
  const [mode, setMode] = useState('by_group_count');
  const [groupCount, setGroupCount] = useState('');
  const [memberPerGroup, setMemberPerGroup] = useState('');
  const [groups, setGroups] = useState([]);
  const [message, setMessage] = useState('');

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, npm')
      .order('npm', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMembers(data || []);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const totalMembers = members.length;

  const generatedText = useMemo(() => {
    if (groups.length === 0) return '';

    const lines = [];

    lines.push('Pembagian Kelompok');
    lines.push(`Jumlah Anggota: ${totalMembers}`);
    lines.push('');

    groups.forEach((group, index) => {
      lines.push(`Kelompok ${index + 1}`);

      group.forEach((member, memberIndex) => {
        lines.push(`${memberIndex + 1}. ${formatMemberName(member)}`);
      });

      lines.push('');
    });

    return lines.join('\n').trim();
  }, [groups, totalMembers]);

  const generateGroups = () => {
    setMessage('');

    if (members.length === 0) {
      setMessage('Belum ada anggota kelas.');
      return;
    }

    const shuffled = shuffleArray(members);

    if (mode === 'by_group_count') {
      const count = Number(groupCount);

      if (!count || count < 1) {
        setMessage('Isi jumlah kelompok dengan benar.');
        return;
      }

      if (count > members.length) {
        setMessage('Jumlah kelompok tidak boleh lebih banyak dari jumlah anggota.');
        return;
      }

      setGroups(splitByGroupCount(shuffled, count));
      return;
    }

    const perGroup = Number(memberPerGroup);

    if (!perGroup || perGroup < 1) {
      setMessage('Isi jumlah anggota per kelompok dengan benar.');
      return;
    }

    if (perGroup > members.length) {
      setMessage('Jumlah anggota per kelompok tidak boleh lebih banyak dari jumlah anggota.');
      return;
    }

    setGroups(splitByMemberPerGroup(shuffled, perGroup));
  };

  const resetGroups = () => {
    setGroups([]);
    setMessage('');
  };

  const copyGroups = async () => {
    if (!generatedText) {
      setMessage('Belum ada hasil kelompok untuk disalin.');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedText);
      setMessage('Hasil kelompok berhasil disalin.');
    } catch {
      setMessage('Gagal menyalin. Silakan salin manual dari hasil yang tampil.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Kelompok
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Generate kelompok otomatis dari seluruh anggota kelas tanpa menyimpan ke database.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                <Users size={18} />
              </div>

              <div>
                <p className="font-semibold">Total anggota kelas</p>
                <p className="mt-1 text-2xl font-bold">{totalMembers}</p>
                <p className="mt-1 leading-6">
                  Semua anggota otomatis ikut dalam proses pembagian kelompok.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="label">Metode Pembagian</span>

              <div className="mt-2 grid gap-2">
                <button
                  type="button"
                  onClick={() => setMode('by_group_count')}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    mode === 'by_group_count'
                      ? 'bg-blue-800 text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Berdasarkan jumlah kelompok
                </button>

                <button
                  type="button"
                  onClick={() => setMode('by_member_count')}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    mode === 'by_member_count'
                      ? 'bg-blue-800 text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Berdasarkan jumlah anggota per kelompok
                </button>
              </div>
            </div>

            {mode === 'by_group_count' ? (
              <label className="block">
                <span className="label">Jumlah Kelompok</span>

                <input
                  type="number"
                  min="1"
                  className="input mt-1"
                  value={groupCount}
                  onChange={(event) => setGroupCount(event.target.value)}
                  placeholder="Contoh: 4"
                />
              </label>
            ) : (
              <label className="block">
                <span className="label">Jumlah Anggota per Kelompok</span>

                <input
                  type="number"
                  min="1"
                  className="input mt-1"
                  value={memberPerGroup}
                  onChange={(event) => setMemberPerGroup(event.target.value)}
                  placeholder="Contoh: 5"
                />
              </label>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={generateGroups}
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                <Shuffle size={16} />
                Generate
              </button>

              <button
                type="button"
                onClick={resetGroups}
                className="btn-secondary inline-flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reset
              </button>
            </div>

            {message && (
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Hasil Generate
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Hasil ini tidak disimpan. Silakan salin atau screenshot untuk dikirim ke grup.
                </p>
              </div>

              <button
                type="button"
                onClick={copyGroups}
                disabled={groups.length === 0}
                className="btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clipboard size={16} />
                Salin
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
            {groups.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  <Users size={24} />
                </div>

                <p className="mt-4 font-semibold text-slate-900 dark:text-white">
                  Belum ada hasil kelompok.
                </p>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Isi metode pembagian di sebelah kiri, lalu tekan Generate.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groups.map((group, index) => (
                  <div
                    key={`group-${index}`}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        Kelompok {index + 1}
                      </h4>

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                        {group.length} orang
                      </span>
                    </div>

                    <ol className="space-y-2">
                      {group.map((member) => (
                        <li
                          key={member.id}
                          className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <span className="font-medium">
                            {member.full_name || '-'}
                          </span>

                          {member.nickname && (
                            <span className="ml-1 text-slate-500 dark:text-slate-400">
                              ({member.nickname})
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
