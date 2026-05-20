import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckSquare,
  LogOut,
  Megaphone,
  Menu,
  UserRound
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatDateTime(value) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '-';
  }
}

function formatDateOnly(value) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

function getNotificationIcon(type) {
  if (type === 'assignment') return CheckSquare;
  if (type === 'schedule') return CalendarClock;
  return Megaphone;
}

function getNotificationTitle(item) {
  const actor = item.actor_name || item.profiles?.nickname || 'Anggota';

  if (item.type === 'assignment') {
    return `${actor} menambahkan tugas baru`;
  }

  if (item.type === 'schedule') {
    return `${actor} menambahkan jadwal pengganti`;
  }

  return `${actor} mengirim pengumuman`;
}

function getNotificationDescription(item) {
  if (item.type === 'assignment') {
    const course = item.course_name || item.courses?.name || '-';
    const title = item.title || item.assignment_title || item.content || 'Tugas baru';
    const deadline = item.deadline ? ` • Deadline ${formatDateOnly(item.deadline)}` : '';

    return `${title} • ${course}${deadline}`;
  }

  if (item.type === 'schedule') {
    const course = item.course_name || item.courses?.name || item.title || 'Jadwal pengganti';
    const date = item.event_date ? formatDateOnly(item.event_date) : '-';
    const time =
      item.start_time && item.end_time
        ? ` • ${String(item.start_time).slice(0, 5).replace(':', '.')}–${String(item.end_time)
            .slice(0, 5)
            .replace(':', '.')}`
        : '';

    return `${course} • ${date}${time}`;
  }

  return item.content || item.message || 'Pengumuman baru';
}

function getNotificationTypeLabel(type) {
  if (type === 'assignment') return 'Tugas';
  if (type === 'schedule') return 'Jadwal';
  return 'Pengumuman';
}

function getInitialReadIds(profileId) {
  if (!profileId) return [];

  try {
    const raw = localStorage.getItem(`classhub_read_notifications_${profileId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReadIds(profileId, ids) {
  if (!profileId) return;

  localStorage.setItem(
    `classhub_read_notifications_${profileId}`,
    JSON.stringify([...new Set(ids)])
  );
}

function normalizeNotificationRows({ assignments = [], events = [], announcements = [] }) {
  const taskRows = assignments.map((item) => ({
    id: `assignment-${item.id}`,
    source_id: item.id,
    type: 'assignment',
    title: item.title,
    content: item.description,
    deadline: item.deadline,
    course_name: item.courses?.name,
    actor_name: item.profiles?.nickname,
    created_at: item.created_at,
    raw: item
  }));

  const eventRows = events.map((item) => ({
    id: `schedule-${item.id}`,
    source_id: item.id,
    type: 'schedule',
    title: item.title,
    event_date: item.event_date,
    course_name: item.courses?.name,
    start_time: item.start_slot?.start_time || item.custom_start_time,
    end_time: item.end_slot?.end_time || item.custom_end_time,
    actor_name: item.profiles?.nickname,
    created_at: item.created_at,
    raw: item
  }));

  const announcementRows = announcements.map((item) => ({
    id: `announcement-${item.id}`,
    source_id: item.id,
    type: 'announcement',
    content: item.content,
    actor_name: item.profiles?.nickname,
    created_at: item.created_at,
    raw: item
  }));

  return [...taskRows, ...eventRows, ...announcementRows]
    .filter((item) => item.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export default function Header({ setMobileOpen }) {
  const { profile, logout } = useAuth();

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;

    setReadIds(getInitialReadIds(profile.id));
  }, [profile?.id]);

  const loadNotifications = async () => {
    const [assignmentRes, eventRes, announcementRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, courses(name), profiles(nickname)')
        .order('created_at', { ascending: false })
        .limit(12),

      supabase
        .from('calendar_events')
        .select(`
          *,
          courses(name),
          profiles(nickname),
          start_slot:time_slots!calendar_events_start_slot_id_fkey(*),
          end_slot:time_slots!calendar_events_end_slot_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
        .limit(12),

      supabase
        .from('announcements')
        .select('*, profiles(nickname)')
        .order('created_at', { ascending: false })
        .limit(12)
    ]);

    if (assignmentRes.error) console.error(assignmentRes.error.message);
    if (eventRes.error) console.error(eventRes.error.message);
    if (announcementRes.error) console.error(announcementRes.error.message);

    const rows = normalizeNotificationRows({
      assignments: assignmentRes.data || [],
      events: eventRes.data || [],
      announcements: announcementRes.data || []
    });

    setNotifications(rows.slice(0, 20));
  };

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('classhub-header-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener('mousedown', close);

    return () => {
      window.removeEventListener('mousedown', close);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !readIds.includes(item.id)).length;
  }, [notifications, readIds]);

  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const markAsRead = (notificationId) => {
    const next = [...new Set([...readIds, notificationId])];

    setReadIds(next);
    saveReadIds(profile?.id, next);
  };

  const markAllAsRead = () => {
    const ids = notifications.map((item) => item.id);

    setReadIds(ids);
    saveReadIds(profile?.id, ids);
  };

  const handleOpenNotification = (item) => {
    markAsRead(item.id);
  };

  return (
    <header className="relative z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen?.(true)}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <h1 className="truncate text-base font-bold tracking-tight text-slate-950 dark:text-white md:text-lg">
          REKAYASA PERANGKAT LUNAK KRIPTO
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((value) => !value);
              setProfileOpen(false);
            }}
            className="relative grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            title="Notifikasi"
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
                {unreadLabel}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-14 z-50 w-[min(92vw,560px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950 dark:text-white">
                      Notifikasi Terbaru
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Tugas, pengumuman, dan jadwal pengganti terbaru.
                    </p>
                  </div>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Tandai semua
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-3">
                {notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Belum ada notifikasi.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((item) => (
                      <NotificationItem
                        key={item.id}
                        item={item}
                        isRead={readIds.includes(item.id)}
                        onOpen={() => handleOpenNotification(item)}
                        onMarkRead={() => markAsRead(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((value) => !value);
              setNotifOpen(false);
            }}
            className="flex items-center gap-3 rounded-2xl px-1.5 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-800 text-white dark:bg-blue-600">
              <UserRound size={22} />
            </span>

            <span className="hidden max-w-[160px] truncate text-sm font-bold text-slate-950 dark:text-white md:block">
              {profile?.nickname || profile?.full_name || 'User'}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-14 z-50 w-[min(92vw,440px)] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Info Akun
              </p>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                <InfoRow label="Nama Lengkap" value={profile?.full_name || '-'} />
                <InfoRow label="Nama Panggilan" value={profile?.nickname || '-'} />
                <InfoRow label="NPM" value={profile?.npm || '-'} />
                <InfoRow
                  label="Tanggal Lahir"
                  value={
                    profile?.birth_date
                      ? new Date(profile.birth_date).toLocaleDateString('id-ID')
                      : '-'
                  }
                />
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ item, isRead, onOpen, onMarkRead }) {
  const Icon = getNotificationIcon(item.type);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-2xl border px-3 py-3 text-left transition ${
        isRead
          ? 'border-transparent bg-white opacity-70 hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800'
          : 'border-blue-100 bg-blue-50/70 hover:border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950'
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            isRead
              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-white text-blue-700 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-900'
          }`}
        >
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`line-clamp-1 text-sm ${
                  isRead
                    ? 'font-semibold text-slate-600 dark:text-slate-300'
                    : 'font-bold text-slate-950 dark:text-white'
                }`}
              >
                {getNotificationTitle(item)}
              </p>

              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {getNotificationDescription(item)}
              </p>
            </div>

            {!isRead && (
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {getNotificationTypeLabel(item.type)}
            </span>

            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {formatDateTime(item.created_at)}
            </span>

            {isRead ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Sudah dibaca
              </span>
            ) : (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkRead();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.stopPropagation();
                    onMarkRead();
                  }
                }}
                className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
              >
                Tandai dibaca
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[135px_minmax(0,1fr)] gap-2">
      <span className="font-bold text-slate-800 dark:text-slate-100">
        {label}
      </span>

      <span className="min-w-0 break-words text-slate-700 dark:text-slate-300">
        {value}
      </span>
    </div>
  );
}
