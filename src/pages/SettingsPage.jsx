import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { requestNotificationToken } from '../lib/firebase.js';
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

  const [notifLoading, setNotifLoading] = useState(false);
  const [notifActive, setNotifActive] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');

  useEffect(() => {
    if (!profile) return;

    setTheme(profile.theme_preference || 'light');
    setFont(profile.font_size_preference || 'normal');
    setFullName(profile.full_name || '');
    setNickname(profile.nickname || '');
    setBirth(profile.birth_date || '');
  }, [profile]);

  useEffect(() => {
    checkNotificationStatus();
  }, [profile?.id]);

  const checkNotificationStatus = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('notification_tokens')
      .select('id')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error(error.message);
      return;
    }

    setNotifActive((data || []).length > 0);
  };

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

  const enableNotification = async () => {
    if (!profile?.id) {
      setNotifMsg('User belum valid. Silakan login ulang.');
      return;
    }

    setNotifLoading(true);
    setNotifMsg('');

    try {
      const token = await requestNotificationToken();

      const { error } = await supabase
        .from('notification_tokens')
        .upsert(
          {
            user_id: profile.id,
            token,
            platform: 'web',
            user_agent: navigator.userAgent,
            is_active: true,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,token'
          }
        );

      if (error) {
        throw new Error(error.message);
      }

      setNotifActive(true);
      setNotifMsg('Notifikasi berhasil diaktifkan di perangkat ini.');
    } catch (error) {
      setNotifMsg(error.message || 'Gagal mengaktifkan notifikasi.');
    } finally {
      setNotifLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Pengaturan
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tema, ukuran font, notifikasi, dan info akun.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold text-slate-900 dark:text-white">
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
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                <Bell size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Notifikasi Perangkat
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Aktifkan push notification agar perangkat ini menerima info tugas,
                  pengumuman, jadwal pengganti, dan reminder deadline.
                </p>

                {notifActive && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-200">
                    <CheckCircle2 size={14} />
                    Aktif di perangkat ini
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={enableNotification}
                    disabled={notifLoading}
                    className="btn-primary"
                  >
                    {notifLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Mengaktifkan...
                      </>
                    ) : (
                      <>
                        <Bell size={16} />
                        {notifActive ? 'Aktifkan Ulang Notifikasi' : 'Aktifkan Notifikasi'}
                      </>
                    )}
                  </button>
                </div>

                {notifMsg && (
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      notifMsg.includes('berhasil')
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-600 dark:text-red-300'
                    }`}
                  >
                    {notifMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-bold text-slate-900 dark:text-white">
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
