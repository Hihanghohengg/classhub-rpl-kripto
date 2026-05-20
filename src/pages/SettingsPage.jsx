import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();

  const [theme, setTheme] = useState('light');
  const [font, setFont] = useState('normal');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birth, setBirth] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setTheme(profile.theme_preference || 'light');
    setFont(profile.font_size_preference || 'normal');
    setFullName(profile.full_name || '');
    setNickname(profile.nickname || '');
    setBirth(profile.birth_date || '');
  }, [profile]);

  const save = async () => {
    if (!profile?.id) {
      setMsg('User belum valid. Silakan login ulang.');
      return;
    }

    setSaving(true);
    setMsg('');

    const { error } = await supabase
      .from('profiles')
      .update({
        theme_preference: theme,
        font_size_preference: font,
        full_name: fullName,
        nickname,
        birth_date: birth || null
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg('Pengaturan berhasil disimpan.');
    await refreshProfile();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Pengaturan
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tema, ukuran font, dan info akun.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-black text-slate-900 dark:text-white">
            Pengaturan Tampilan
          </h3>

          <label className="mt-4 block">
            <span className="label">Tema</span>

            <select
              className="input mt-1"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Terang</option>
              <option value="dark">Gelap</option>
              <option value="system">Ikuti Sistem</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="label">Ukuran Font</span>

            <select
              className="input mt-1"
              value={font}
              onChange={(e) => setFont(e.target.value)}
            >
              <option value="small">Kecil</option>
              <option value="normal">Normal</option>
              <option value="large">Besar</option>
            </select>
          </label>
        </div>

        <div className="card p-4">
          <h3 className="font-black text-slate-900 dark:text-white">
            Pengaturan Akun
          </h3>

          <label className="mt-4 block">
            <span className="label">Nama Lengkap</span>

            <input
              className="input mt-1"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label className="mt-4 block">
            <span className="label">Nama Panggilan</span>

            <input
              className="input mt-1"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>

          <label className="mt-4 block">
            <span className="label">NPM</span>

            <input
              disabled
              className="input mt-1 bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400"
              value={profile?.npm || ''}
            />
          </label>

          <label className="mt-4 block">
            <span className="label">Tanggal Lahir</span>

            <input
              type="date"
              className="input mt-1"
              value={birth || ''}
              onChange={(e) => setBirth(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>

        {msg && (
          <p
            className={`mt-3 text-sm font-semibold ${
              msg.includes('berhasil')
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-600 dark:text-red-300'
            }`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
