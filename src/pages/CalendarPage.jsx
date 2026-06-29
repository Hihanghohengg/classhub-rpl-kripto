import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { sendPushNotification } from '../lib/push.js';
import Modal from '../components/Modal.jsx';
import WeeklyCalendar from '../components/WeeklyCalendar.jsx';
import {
  dayKeyFromDate,
  formatDateOnlyID,
  shortTime,
  toISODate
} from '../utils/date.js';
import { sendTelegramNotification } from '../lib/telegram.js';

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

function getStatusLabel(status) {
  if (status === 'done') return 'Selesai';
  if (status === 'on_progress') return 'On Progress';
  return 'Belum Mulai';
}

export default function CalendarPage() {
  const { profile } = useAuth();

  const [tab, setTab] = useState('weekly');
  const [courses, setCourses] = useState([]);
  const [slots, setSlots] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => getShiftedWeekDays(weekOffset), [weekOffset]);

  const load = async () => {
    const [courseRes, slotRes, weeklyRes, eventRes, assignmentRes] =
      await Promise.all([
        supabase.from('courses').select('*').order('name'),

        supabase.from('time_slots').select('*').order('slot_number'),

        supabase
          .from('weekly_schedules')
          .select(`
            *,
            courses(name, lecturer, sks),
            start_slot:time_slots!weekly_schedules_start_slot_id_fkey(*),
            end_slot:time_slots!weekly_schedules_end_slot_id_fkey(*)
          `)
          .eq('is_active', true)
          .order('day_of_week'),

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
          .order('event_date'),

        supabase
          .from('assignments')
          .select('*, courses(name), profiles(nickname)')
          .gte('deadline', days[0].iso)
          .lte('deadline', days[4].iso)
          .order('deadline', { ascending: true })
      ]);

    if (courseRes.error) alert(courseRes.error.message);
    if (slotRes.error) alert(slotRes.error.message);
    if (weeklyRes.error) alert(weeklyRes.error.message);
    if (eventRes.error) alert(eventRes.error.message);
    if (assignmentRes.error) alert(assignmentRes.error.message);

    setCourses(courseRes.data || []);
    setSlots(slotRes.data || []);

    setWeekly(
      (weeklyRes.data || []).map((item) => ({
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
      (eventRes.data || []).map((item) => ({
        ...item,
        course_name: item.courses?.name,
        lecturer: item.courses?.lecturer,
        sks: item.courses?.sks,
        start_time: item.start_slot?.start_time || item.custom_start_time,
        end_time: item.end_slot?.end_time || item.custom_end_time,
        source: 'event'
      }))
    );

    setAssignments(
      (assignmentRes.data || []).map((item) => ({
        ...item,
        source: 'assignment',
        title: item.title,
        course_name: item.courses?.name,
        event_date: item.deadline?.slice(0, 10),
        deadlineLabel: `Deadline ${formatDateOnlyID(item.deadline)}`
      }))
    );
  };

  useEffect(() => {
    load();
  }, [weekOffset]);

  const deleteReplacementEvent = async (eventId) => {
    const ok = window.confirm('Hapus jadwal pengganti ini?');

    if (!ok) return;

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('created_by', profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    await load();
  };

  const itemsByDay = useMemo(() => {
    const map = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: []
    };

    weekly.forEach((item) => {
      if (map[item.day_of_week]) map[item.day_of_week].push(item);
    });

    events.forEach((item) => {
      const key = dayKeyFromDate(item.event_date);
      if (map[key]) map[key].push(item);
    });

    assignments.forEach((item) => {
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
  }, [weekly, events, assignments]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Kalender
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Jadwal kuliah, jadwal pengganti, dan deadline tugas.
          </p>
        </div>

        {tab === 'replacement' && (
          <button
            onClick={() => setModal('replacement')}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus size={16} />
            Tambah Jadwal Pengganti
          </button>
        )}
      </div>

      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Tab id="weekly" tab={tab} setTab={setTab}>
            Mingguan
          </Tab>

          <Tab id="replacement" tab={tab} setTab={setTab}>
            Jadwal Pengganti
          </Tab>
        </div>

        {tab === 'weekly' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((value) => value - 1)}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Minggu Ini
            </button>

            <button
              onClick={() => setWeekOffset((value) => value + 1)}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'weekly' && (
          <div className="h-full rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <WeeklyCalendar
              days={days}
              itemsByDay={itemsByDay}
              onSelect={setSelected}
            />
          </div>
        )}

        {tab === 'replacement' && (
          <ListEvents
            events={events}
            profile={profile}
            onDelete={deleteReplacementEvent}
          />
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.source === 'assignment' ? 'Detail Tugas' : 'Detail Jadwal'}
      >
        {selected && selected.source === 'assignment' && (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p>
              <b className="text-slate-900 dark:text-white">Tugas:</b>{' '}
              {selected.title || '-'}
            </p>

            <p>
              <b className="text-slate-900 dark:text-white">Mata Kuliah:</b>{' '}
              {selected.course_name || '-'}
            </p>

            <p>
              <b className="text-slate-900 dark:text-white">Deadline:</b>{' '}
              {formatDateOnlyID(selected.deadline)}
            </p>

            <p>
              <b className="text-slate-900 dark:text-white">Status:</b>{' '}
              {getStatusLabel(selected.status)}
            </p>

            {selected.description && (
              <div>
                <b className="text-slate-900 dark:text-white">Deskripsi:</b>

                <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {selected.description}
                </p>
              </div>
            )}

            {selected.link_url && (
              <p>
                <b className="text-slate-900 dark:text-white">Link:</b>{' '}
                <a
                  className="font-semibold text-blue-700 underline dark:text-blue-300"
                  href={selected.link_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka link
                </a>
              </p>
            )}
          </div>
        )}

        {selected && selected.source !== 'assignment' && (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <InfoBox label="Mata Kuliah" value={selected.course_name || selected.title || '-'} />

            <div className="grid gap-3 md:grid-cols-2">
              <InfoBox label="Waktu" value={formatScheduleTime(selected)} />
              <InfoBox label="Dosen" value={selected.lecturer || selected.courses?.lecturer || '-'} />
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

      <Modal
        open={modal === 'replacement'}
        onClose={() => setModal(null)}
        title="Tambah Jadwal Pengganti"
      >
        <ReplacementForm
          courses={courses}
          slots={slots}
          profile={profile}
          onDone={() => {
            setModal(null);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

function Tab({ id, tab, setTab, children }) {
  const active = tab === id;

  return (
    <button
      onClick={() => setTab(id)}
      className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-blue-800 text-white dark:bg-blue-600'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-medium text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function ListEvents({ events, profile, onDelete }) {
  return (
    <div className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada jadwal pengganti minggu ini.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((item) => {
            const canDelete = profile?.id === item.created_by;

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <div className="min-w-0">
                  <p>
                    <b className="font-semibold text-slate-900 dark:text-white">
                      {item.course_name}
                    </b>{' '}
                    — {item.event_date} — {formatScheduleTime(item)}
                  </p>

                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Ditambahkan oleh {item.profiles?.nickname || '-'}
                    {canDelete ? ' • bisa dihapus oleh Anda' : ''}
                  </p>

                  {hasValidNote(item.notes) && (
                    <p className="mt-1 line-clamp-2 text-slate-500 dark:text-slate-400">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
                  >
                    <Trash2 size={14} />
                    Hapus
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReplacementForm({ courses, slots, profile, onDone }) {
  const [f, setF] = useState({
    course_id: '',
    event_date: '',
    start_slot_id: '',
    end_slot_id: '',
    mode: 'online',
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        ...f,
        event_type: 'replacement_class',
        created_by: profile.id
      })
      .select('id')
      .single();

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const selectedCourseName =
      courses.find((course) => String(course.id) === String(f.course_id))?.name ||
      'Jadwal';

    await sendPushNotification({
      type: 'schedule_created',
      title: 'Jadwal pengganti ditambahkan',
      body: `${selectedCourseName} • ${f.event_date}`,
      url: `/?page=calendar&event_id=${data?.id}`,
      excludeUserId: profile?.id
    });

    setLoading(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Select
        label="Mata Kuliah"
        value={f.course_id}
        onChange={(value) => setF({ ...f, course_id: value })}
        options={courses.map((course) => [course.id, course.name])}
      />

      <label className="block">
        <span className="label">Tanggal</span>
        <input
          type="date"
          required
          className="input mt-1"
          value={f.event_date}
          onChange={(e) => setF({ ...f, event_date: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Mulai"
          value={f.start_slot_id}
          onChange={(value) => setF({ ...f, start_slot_id: value })}
          options={slots.map((slot) => [
            slot.id,
            `Jam ke-${slot.slot_number} | ${shortTime(slot.start_time)}`
          ])}
        />

        <Select
          label="Selesai"
          value={f.end_slot_id}
          onChange={(value) => setF({ ...f, end_slot_id: value })}
          options={slots.map((slot) => [
            slot.id,
            `Jam ke-${slot.slot_number} | ${shortTime(slot.end_time)}`
          ])}
        />
      </div>

      <div>
        <span className="label">Daring / Luring</span>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setF({ ...f, mode: 'online' })}
            className={f.mode === 'online' ? 'btn-primary' : 'btn-secondary'}
          >
            Daring
          </button>

          <button
            type="button"
            onClick={() => setF({ ...f, mode: 'offline' })}
            className={f.mode === 'offline' ? 'btn-primary' : 'btn-secondary'}
          >
            Luring
          </button>
        </div>
      </div>

      <label className="block">
        <span className="label">Catatan (opsional)</span>
        <textarea
          className="input mt-1 min-h-24"
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
        />
      </label>

      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="label">{label}</span>

      <select
        required
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Pilih</option>

        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
