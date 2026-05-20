import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Save,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import Modal from '../components/Modal.jsx';

function toISODate(value) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfMonday(value) {
  const d = new Date(value);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function getWeekDiff(startDate, currentDate = new Date()) {
  const start = startOfMonday(startDate);
  const current = startOfMonday(currentDate);

  return Math.floor((current - start) / (1000 * 60 * 60 * 24 * 7));
}

function getRotationIndexes(membersLength, setting) {
  if (!membersLength) {
    return {
      leaderIndex: -1,
      viceIndex: -1
    };
  }

  const weekDiff = setting.is_paused
    ? 0
    : Math.max(0, getWeekDiff(setting.rotation_start_date));

  const leaderIndex =
    (Number(setting.start_index || 0) + weekDiff) % membersLength;

  const viceIndex = (leaderIndex + 1) % membersLength;

  return {
    leaderIndex,
    viceIndex
  };
}

function getRotationStatus(index, membersLength, setting) {
  const { leaderIndex, viceIndex } = getRotationIndexes(membersLength, setting);

  if (index === leaderIndex) return 'Ketua Kelas';
  if (index === viceIndex) return 'Wakil Ketua Kelas';

  return 'Anggota Kelas';
}

function getStatusClass(status) {
  if (status === 'Ketua Kelas') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200';
  }

  if (status === 'Wakil Ketua Kelas') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200';
  }

  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

export default function MembersPage() {
  const menuRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [settingMenuOpen, setSettingMenuOpen] = useState(false);
  const [settingModalOpen, setSettingModalOpen] = useState(false);
  const [setting, setSetting] = useState({
    rotation_start_date: toISODate(new Date()),
    start_index: 0,
    is_paused: false
  });
  const [message, setMessage] = useState('');

  const load = async () => {
    const [memberRes, settingRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, nickname, npm')
        .order('npm', { ascending: true }),

      supabase
        .from('class_rotation_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
    ]);

    if (memberRes.error) alert(memberRes.error.message);
    if (settingRes.error) alert(settingRes.error.message);

    setMembers(memberRes.data || []);

    if (settingRes.data) {
      setSetting({
        rotation_start_date:
          settingRes.data.rotation_start_date || toISODate(new Date()),
        start_index: settingRes.data.start_index || 0,
        is_paused: Boolean(settingRes.data.is_paused)
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target)) {
        setSettingMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', closeMenu);

    return () => {
      window.removeEventListener('mousedown', closeMenu);
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return members;

    return members.filter((member) => {
      return (
        String(member.full_name || '').toLowerCase().includes(q) ||
        String(member.nickname || '').toLowerCase().includes(q) ||
        String(member.npm || '').toLowerCase().includes(q)
      );
    });
  }, [members, keyword]);

  const rotationInfo = useMemo(() => {
    const { leaderIndex, viceIndex } = getRotationIndexes(
      members.length,
      setting
    );

    return {
      leader: members[leaderIndex],
      vice: members[viceIndex]
    };
  }, [members, setting]);

  const saveSetting = async () => {
    setMessage('');

    const payload = {
      id: 1,
      rotation_start_date: setting.rotation_start_date,
      start_index: Number(setting.start_index || 0),
      is_paused: Boolean(setting.is_paused),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('class_rotation_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Pengaturan rotasi berhasil disimpan.');
    setSettingModalOpen(false);
    setSettingMenuOpen(false);
  };

  const togglePause = async () => {
    const next = {
      ...setting,
      is_paused: !setting.is_paused
    };

    setSetting(next);
    setMessage('');

    const { error } = await supabase
      .from('class_rotation_settings')
      .upsert(
        {
          id: 1,
          rotation_start_date: next.rotation_start_date,
          start_index: Number(next.start_index || 0),
          is_paused: next.is_paused,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(next.is_paused ? 'Rotasi dijeda.' : 'Rotasi diaktifkan kembali.');
    setSettingMenuOpen(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Anggota Kelas
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daftar anggota dan status rotasi kelas.
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setSettingMenuOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Pengaturan anggota"
          >
            <MoreVertical size={20} />
          </button>

          {settingMenuOpen && (
            <div className="absolute right-0 top-12 z-20 w-72 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Pengaturan Rotasi
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Rotasi berjalan otomatis setiap Senin berdasarkan urutan absen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettingModalOpen(true);
                  setSettingMenuOpen(false);
                }}
                className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Settings size={17} />
                Atur rotasi kelas
              </button>

              <button
                type="button"
                onClick={togglePause}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {setting.is_paused ? (
                  <>
                    <PlayCircle size={17} />
                    Aktifkan rotasi
                  </>
                ) : (
                  <>
                    <PauseCircle size={17} />
                    Jeda rotasi
                  </>
                )}
              </button>

              <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <p>
                  Ketua saat ini:{' '}
                  <b className="text-slate-700 dark:text-slate-200">
                    {rotationInfo.leader?.nickname ||
                      rotationInfo.leader?.full_name ||
                      '-'}
                  </b>
                </p>

                <p>
                  Wakil saat ini:{' '}
                  <b className="text-slate-700 dark:text-slate-200">
                    {rotationInfo.vice?.nickname ||
                      rotationInfo.vice?.full_name ||
                      '-'}
                  </b>
                </p>

                <p className="mt-1">
                  Status:{' '}
                  <b className="text-slate-700 dark:text-slate-200">
                    {setting.is_paused ? 'Dijeda' : 'Aktif'}
                  </b>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 shrink-0">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="input max-w-md"
          placeholder="Cari nama / NPM / panggilan"
        />
      </div>

      {message && (
        <p className="mb-3 shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">
          {message}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="h-full overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="w-20 px-4 py-4">No</th>
                <th className="min-w-[320px] px-4 py-4">Nama Lengkap</th>
                <th className="min-w-[170px] px-4 py-4">NPM</th>
                <th className="min-w-[200px] px-4 py-4">Nama Panggilan</th>
                <th className="min-w-[160px] px-4 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    Tidak ada anggota yang cocok.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const realIndex = members.findIndex(
                    (item) => item.id === member.id
                  );
                  const status = getRotationStatus(
                    realIndex,
                    members.length,
                    setting
                  );

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <td className="px-4 py-4">{index + 1}</td>

                      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">
                        {member.full_name || '-'}
                      </td>

                      <td className="px-4 py-4">{member.npm || '-'}</td>

                      <td className="px-4 py-4">{member.nickname || '-'}</td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={settingModalOpen}
        onClose={() => setSettingModalOpen(false)}
        title="Pengaturan Rotasi Kelas"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <CalendarDays
                size={20}
                className="mt-0.5 text-slate-500 dark:text-slate-400"
              />

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Sistem rotasi mingguan
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Ketua dan wakil ketua kelas otomatis berganti setiap Senin.
                  Jika ada libur atau perubahan kelas, rotasi bisa dijeda lewat
                  menu titik tiga.
                </p>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="label">Mulai Rotasi</span>

            <input
              type="date"
              className="input mt-1"
              value={setting.rotation_start_date || ''}
              onChange={(e) =>
                setSetting({
                  ...setting,
                  rotation_start_date: e.target.value
                })
              }
            />
          </label>

          <label className="block">
            <span className="label">Anggota Pertama sebagai Ketua</span>

            <select
              className="input mt-1"
              value={setting.start_index}
              onChange={(e) =>
                setSetting({
                  ...setting,
                  start_index: Number(e.target.value)
                })
              }
            >
              {members.map((member, index) => (
                <option key={member.id} value={index}>
                  {member.nickname || member.full_name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Ketua saat ini
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {rotationInfo.leader?.nickname ||
                  rotationInfo.leader?.full_name ||
                  '-'}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Wakil saat ini
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {rotationInfo.vice?.nickname ||
                  rotationInfo.vice?.full_name ||
                  '-'}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                Status rotasi
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {setting.is_paused ? 'Dijeda' : 'Aktif'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={saveSetting}
            className="btn-primary inline-flex w-full items-center justify-center gap-2"
          >
            <Save size={15} />
            Simpan Pengaturan
          </button>
        </div>
      </Modal>
    </div>
  );
}
