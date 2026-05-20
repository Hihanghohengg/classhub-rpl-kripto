import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import {
  dayKeyFromDate,
  formatDateOnlyID,
  shortTime,
  toISODate
} from '../utils/date.js';
import WeeklyCalendar from '../components/WeeklyCalendar.jsx';
import Modal from '../components/Modal.jsx';

function getShiftedWeekDays(offset = 0) {
  const base = new Date();
  base.setDate(base.getDate() + offset * 7);

  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);

  const keys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return keys.map((key, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);

    return {
      key,
      iso: toISODate(d)
    };
  });
}

function getStatusLabel(status) {
  if (status === 'done') return 'Selesai';
  if (status === 'on_progress') return 'On Progress';
  return 'Belum Mulai';
}

function getAssignmentTypeLabel(type) {
  return type === 'group' ? 'Kelompok' : 'Individu';
}

function formatScheduleTime(item) {
  const start = shortTime(item?.start_time);
  const end = shortTime(item?.end_time);
  const sks = item?.sks ? ` (${item.sks} SKS)` : '';

  if (!start && !end) return `-${sks}`;

  return `${start}–${end}${sks}`;
}

function hasValidNote(value) {
  if (!value) return false;

  const text = String(value).trim();

  return text !== '' && text !== '-';
}

function parseDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const raw = String(value).trim();

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const idMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (idMatch) {
    const [, day, month, year] = idMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const fallback = new Date(raw);

  if (Number.isNaN(fallback.getTime())) return null;

  return new Date(
    fallback.getFullYear(),
    fallback.getMonth(),
    fallback.getDate()
  );
}

function startOfDay(value) {
  const d = parseDateOnly(value);

  if (!d) return null;

  d.setHours(0, 0, 0, 0);

  return d;
}

function getDayDiffFromToday(value) {
  const today = startOfDay(new Date());
  const target = startOfDay(value);

  if (!today || !target) return null;

  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getSortedDeadlineTasks(tasks) {
  return tasks
    .filter((task) => task.deadline)
    .filter((task) => task.status !== 'done')
    .sort((a, b) => {
      const diffA = getDayDiffFromToday(a.deadline);
      const diffB = getDayDiffFromToday(b.deadline);

      if (diffA === null && diffB === null) return 0;
      if (diffA === null) return 1;
      if (diffB === null) return -1;

      return diffA - diffB;
    });
}

function getDeadlineTone(deadline) {
  const diff = getDayDiffFromToday(deadline);

  if (diff === null) return 'neutral';
  if (diff < 0) return 'danger';
  if (diff === 0) return 'danger';
  if (diff <= 3) return 'warning';

  return 'neutral';
}

function getDeadlineLabel(deadline) {
  const diff = getDayDiffFromToday(deadline);

  if (diff === null) return '-';
  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Besok';

  return `${diff} hari lagi`;
}

export default function DashboardPage() {
  const [expanded, setExpanded] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [weekly, setWeekly] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [weekTasks, setWeekTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [selected, setSelected] = useState(null);

  const days = useMemo(() => getShiftedWeekDays(weekOffset), [weekOffset]);
  const today = toISODate(new Date());

  const load = async () => {
    const [schedulesRes, eventsRes, taskRes, weekTaskRes, annRes, profileRes] =
      await Promise.all([
        supabase
          .from('weekly_schedules')
          .select(`
            *,
            courses(name, lecturer, sks),
            start_slot:time_slots!weekly_schedules_start_slot_id_fkey(*),
            end_slot:time_slots!weekly_schedules_end_slot_id_fkey(*)
          `)
          .eq('is_active', true),

        supabase
          .from('calendar_events')
          .select(`
            *,
            courses(name, lecturer, sks),
            profiles(nickname),
            start_slot:time_slots!calendar_events_start_slot_id_fkey(*),
            end_slot:time_slots!calendar_events_end_slot_id_fkey(*)
          `)
          .gte('event_date', days[0].iso)
          .lte('event_date', days[4].iso)
          .order('event_date', { ascending: true }),

        supabase
          .from('assignments')
          .select('*, courses(name), profiles(nickname)')
          .order('deadline', { ascending: true }),

        supabase
          .from('assignments')
          .select('*, courses(name), profiles(nickname)')
          .gte('deadline', days[0].iso)
          .lte('deadline', days[4].iso)
          .order('deadline', { ascending: true }),

        supabase
          .from('announcements')
          .select('*, profiles(nickname)')
          .order('created_at', { ascending: false })
          .limit(8),

        supabase
          .from('profiles')
          .select('full_name,nickname,birth_date')
      ]);

    if (schedulesRes.error) alert(schedulesRes.error.message);
    if (eventsRes.error) alert(eventsRes.error.message);
    if (taskRes.error) alert(taskRes.error.message);
    if (weekTaskRes.error) alert(weekTaskRes.error.message);
    if (annRes.error) alert(annRes.error.message);
    if (profileRes.error) alert(profileRes.error.message);

    setWeekly(
      (schedulesRes.data || []).map((item) => ({
        ...item,
        course_name: item.courses?.name,
        lecturer: item.courses?.lecturer,
        sks: item.courses?.sks,
        start_time: item.start_slot?.start_time,
        end_time: item.end_slot?.end_time,
        source: 'weekly',
        event_type: 'regular'
      }))
    );

    setEvents(
      (eventsRes.data || []).map((item) => ({
        ...item,
        course_name: item.courses?.name,
        lecturer: item.courses?.lecturer,
        sks: item.courses?.sks,
        start_time: item.start_slot?.start_time || item.custom_start_time,
        end_time: item.end_slot?.end_time || item.custom_end_time,
        source: 'event'
      }))
    );

    setTasks(taskRes.data || []);

    setWeekTasks(
      (weekTaskRes.data || []).map((item) => ({
        ...item,
        source: 'assignment',
        title: item.title,
        course_name: item.courses?.name,
        event_date: item.deadline?.slice(0, 10),
        deadlineLabel: `Deadline ${formatDateOnlyID(item.deadline)}`
      }))
    );

    setAnnouncements(annRes.data || []);
    setProfiles(profileRes.data || []);
  };

  useEffect(() => {
    load();
  }, [weekOffset]);

  const itemsByDay = useMemo(() => {
    const map = Object.fromEntries(days.map((day) => [day.key, []]));

    weekly.forEach((item) => {
      if (map[item.day_of_week]) map[item.day_of_week].push(item);
    });

    events.forEach((item) => {
      const key = dayKeyFromDate(item.event_date);
      if (map[key]) map[key].push(item);
    });

    weekTasks.forEach((item) => {
      const key = dayKeyFromDate(item.event_date);
      if (map[key]) map[key].push(item);
    });

    Object.values(map).forEach((arr) => {
      arr.sort((a, b) => {
        if (a.source === 'assignment' && b.source !== 'assignment') return 1;
        if (a.source !== 'assignment' && b.source === 'assignment') return -1;

        return String(a.start_time || a.deadline || '').localeCompare(
          String(b.start_time || b.deadline || '')
        );
      });
    });

    return map;
  }, [weekly, events, weekTasks, days]);

  const todayTasks = tasks.filter(
    (item) => item.deadline?.slice(0, 10) === today
  );

  const todayEvents = events.filter((item) => item.event_date === today);
  const deadlineTasks = getSortedDeadlineTasks(tasks);

  const birthdays = profiles.filter((profile) => {
    if (!profile.birth_date) return false;

    const birth = parseDateOnly(profile.birth_date);
    const now = new Date();

    if (!birth) return false;

    return birth.getDate() === now.getDate() && birth.getMonth() === now.getMonth();
  });

  return (
    <div className="h-full overflow-hidden bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="grid h-full min-h-0 grid-rows-[78px_minmax(0,1fr)_220px] gap-3">
        <section className="relative rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-full w-full items-center justify-between gap-3"
          >
            <div className="min-w-0 text-left">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Info Hari Ini
              </h2>

              {!expanded && (
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                  📌 {todayTasks.length} deadline hari ini • ⚠️ {todayEvents.length}{' '}
                  jadwal/event khusus • 🎉 {birthdays.length} ulang tahun
                </p>
              )}
            </div>

            {expanded ? (
              <ChevronUp size={18} className="text-slate-500 dark:text-slate-300" />
            ) : (
              <ChevronDown size={18} className="text-slate-500 dark:text-slate-300" />
            )}
          </button>

          {expanded && (
            <div className="absolute left-0 right-0 top-[88px] z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
                <InfoBlock
                  title="📌 Deadline"
                  items={todayTasks.map(
                    (task) => `${task.title} (${task.courses?.name || '-'})`
                  )}
                  empty="Tidak ada deadline hari ini"
                />

                <InfoBlock
                  title="⚠️ Jadwal"
                  items={todayEvents.map(
                    (event) =>
                      `${event.course_name || event.title} ${shortTime(
                        event.start_time
                      )}–${shortTime(event.end_time)}`
                  )}
                  empty="Tidak ada jadwal khusus"
                />

                <InfoBlock
                  title="📢 Pengumuman"
                  items={announcements
                    .slice(0, 2)
                    .map(
                      (item) =>
                        `${item.profiles?.nickname || 'Anggota'}: ${item.content}`
                    )}
                  empty="Belum ada pengumuman"
                />

                <InfoBlock
                  title="🎉 Ulang Tahun"
                  items={birthdays.map((item) => item.nickname || item.full_name)}
                  empty="Tidak ada ulang tahun"
                />
              </div>
            </div>
          )}
        </section>

        <section className="min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Kalender Minggu Ini
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((value) => value - 1)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Minggu Ini
              </button>

              <button
                type="button"
                onClick={() => setWeekOffset((value) => value + 1)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="h-[calc(100%-34px)] min-h-0">
            <WeeklyCalendar
              days={days}
              itemsByDay={itemsByDay}
              onSelect={setSelected}
            />
          </div>
        </section>

        <section className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-2">
          <DashboardMiniCard title="Reminder Deadline">
            {deadlineTasks.length > 0 ? (
              <div className="space-y-2">
                {deadlineTasks.map((task) => (
                  <DeadlineTaskItem
                    key={task.id}
                    task={task}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tidak ada tugas aktif.
              </p>
            )}
          </DashboardMiniCard>

          <DashboardMiniCard title="Pengumuman Terbaru">
            {announcements.length > 0 ? (
              announcements.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected({ ...item, source: 'announcement' })}
                  className="w-full rounded-xl border border-slate-100 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-slate-800"
                >
                  <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                    <b className="font-semibold text-slate-900 dark:text-white">
                      {item.profiles?.nickname || 'Anggota'}:
                    </b>{' '}
                    {item.content}
                  </p>

                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString('id-ID')
                      : '-'}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Belum ada pengumuman.
              </p>
            )}
          </DashboardMiniCard>
        </section>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={
          selected?.source === 'assignment'
            ? 'Detail Tugas'
            : selected?.source === 'announcement'
              ? 'Detail Pengumuman'
              : 'Detail Jadwal'
        }
      >
        {selected && selected.source === 'assignment' && (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Judul:</b>{' '}
              {selected.title || '-'}
            </p>

            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Mata Kuliah:</b>{' '}
              {selected.course_name || selected.courses?.name || '-'}
            </p>

            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Deadline:</b>{' '}
              {formatDateOnlyID(selected.deadline)}
            </p>

            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Status:</b>{' '}
              {getStatusLabel(selected.status)}
            </p>

            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Tipe:</b>{' '}
              {getAssignmentTypeLabel(selected.assignment_type)}
            </p>

            {selected.description && (
              <div>
                <b className="font-semibold text-slate-900 dark:text-white">
                  Deskripsi:
                </b>

                <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {selected.description}
                </p>
              </div>
            )}

            {selected.link_url && (
              <p>
                <b className="font-semibold text-slate-900 dark:text-white">Link:</b>{' '}
                <a
                  href={selected.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-700 underline dark:text-blue-300"
                >
                  Buka link tugas
                </a>
              </p>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Dibuat oleh {selected.profiles?.nickname || 'Anggota'}
            </p>
          </div>
        )}

        {selected && selected.source === 'announcement' && (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Dibuat oleh:</b>{' '}
              {selected.profiles?.nickname || 'Anggota'}
            </p>

            <p>
              <b className="font-semibold text-slate-900 dark:text-white">Waktu:</b>{' '}
              {selected.created_at
                ? new Date(selected.created_at).toLocaleString('id-ID')
                : '-'}
            </p>

            <div>
              <b className="font-semibold text-slate-900 dark:text-white">
                Isi Pengumuman:
              </b>

              <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {selected.content || '-'}
              </p>
            </div>
          </div>
        )}

        {selected &&
          selected.source !== 'assignment' &&
          selected.source !== 'announcement' && (
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mata Kuliah
                </p>

                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {selected.course_name || selected.title || '-'}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Waktu
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatScheduleTime(selected)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Dosen
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {selected.lecturer || selected.courses?.lecturer || '-'}
                  </p>
                </div>
              </div>

              {hasValidNote(selected.notes) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Catatan
                  </p>

                  <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    {selected.notes}
                  </p>
                </div>
              )}
            </div>
          )}
      </Modal>
    </div>
  );
}

function InfoBlock({ title, items, empty }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>

      <ul className="mt-1 space-y-1 text-slate-500 dark:text-slate-400">
        {items.length ? (
          items.map((item, index) => (
            <li key={index} className="line-clamp-1">
              - {item}
            </li>
          ))
        ) : (
          <li>{empty}</li>
        )}
      </ul>
    </div>
  );
}

function DashboardMiniCard({ title, children }) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-2 shrink-0 text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function DeadlineTaskItem({ task, onSelect }) {
  const tone = getDeadlineTone(task.deadline);

  const badgeClass = {
    danger:
      'bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-950 dark:text-red-200 dark:ring-red-900',
    warning:
      'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
    neutral:
      'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
  };

  return (
    <button
      type="button"
      onClick={() => onSelect({ ...task, source: 'assignment' })}
      className="group w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-300">
            {task.title || '-'}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {task.courses?.name || task.course_name || '-'} •{' '}
            {formatDateOnlyID(task.deadline)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            badgeClass[tone] || badgeClass.neutral
          }`}
        >
          {getDeadlineLabel(task.deadline)}
        </span>
      </div>
    </button>
  );
}
