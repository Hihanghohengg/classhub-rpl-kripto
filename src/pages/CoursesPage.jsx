import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { sendTelegramNotification } from '../lib/telegram.js';

const dayOptions = [
  ['monday', 'Senin'],
  ['tuesday', 'Selasa'],
  ['wednesday', 'Rabu'],
  ['thursday', 'Kamis'],
  ['friday', 'Jumat']
];

function getDayLabel(value) {
  return dayOptions.find(([key]) => key === value)?.[1] || '-';
}

function shortTime(value) {
  if (!value) return '';
  return String(value).slice(0, 5).replace(':', '.');
}

function hasValue(value) {
  return String(value || '').trim() !== '';
}

function openUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function formatSchedule(schedule) {
  if (!schedule) return '-';

  const start = shortTime(schedule.start_slot?.start_time);
  const end = shortTime(schedule.end_slot?.end_time);

  if (!start && !end) return '-';

  return `${start}–${end}`;
}

export default function CoursesPage() {
  const { profile } = useAuth();

  const [courses, setCourses] = useState([]);
  const [slots, setSlots] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    const [courseRes, slotRes, scheduleRes] = await Promise.all([
      supabase
        .from('courses')
        .select('*')
        .order('name', { ascending: true }),

      supabase
        .from('time_slots')
        .select('*')
        .order('slot_number', { ascending: true }),

      supabase
        .from('weekly_schedules')
        .select(`
          *,
          courses(name, lecturer, sks, material_url, material_note),
          start_slot:time_slots!weekly_schedules_start_slot_id_fkey(*),
          end_slot:time_slots!weekly_schedules_end_slot_id_fkey(*)
        `)
        .eq('is_active', true)
    ]);

    if (courseRes.error) alert(courseRes.error.message);
    if (slotRes.error) alert(slotRes.error.message);
    if (scheduleRes.error) alert(scheduleRes.error.message);

    setCourses(courseRes.data || []);
    setSlots(slotRes.data || []);
    setSchedules(scheduleRes.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const courseScheduleMap = useMemo(() => {
    const map = {};

    schedules.forEach((item) => {
      map[item.course_id] = item;
    });

    return map;
  }, [schedules]);

  const filteredCourses = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return courses;

    return courses.filter((course) => {
      const schedule = courseScheduleMap[course.id];

      return (
        String(course.name || '').toLowerCase().includes(q) ||
        String(course.lecturer || '').toLowerCase().includes(q) ||
        String(getDayLabel(schedule?.day_of_week)).toLowerCase().includes(q)
      );
    });
  }, [courses, keyword, courseScheduleMap]);

  const openDetail = (course) => {
    const schedule = courseScheduleMap[course.id];

    setSelected({
      ...course,
      schedule
    });
  };

  const openEdit = (course) => {
    const schedule = courseScheduleMap[course.id];

    setEditing({
      ...course,
      schedule
    });
  };

  const removeCourse = async (course) => {
    const ok = window.confirm(`Hapus mata kuliah "${course.name}"?`);

    if (!ok) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', course.id);

    if (error) {
      alert(error.message);
      return;
    }

    setSelected(null);
    await load();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Mata Kuliah
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola mata kuliah, jadwal mingguan, dan link materi Google Drive.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Mata Kuliah
        </button>
      </div>

      <div className="mb-4 shrink-0">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="input max-w-md"
          placeholder="Cari mata kuliah / dosen / hari"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredCourses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Belum ada mata kuliah.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => {
              const schedule = courseScheduleMap[course.id];
              const hasMaterial = hasValue(course.material_url);

              return (
                <div
                  key={course.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900 dark:text-white">
                        {course.name || '-'}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Dosen: {course.lecturer || '-'}
                      </p>
                    </div>

                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                      <BookOpen size={18} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <InfoPill label="SKS" value={course.sks || '-'} />
                    <InfoPill label="Hari" value={getDayLabel(schedule?.day_of_week)} />
                    <InfoPill label="Jam" value={formatSchedule(schedule)} />
                    <InfoPill
                      label="Materi"
                      value={hasMaterial ? 'Tersedia' : 'Belum ada'}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openDetail(course)}
                      className="btn-secondary"
                    >
                      Lihat Detail
                    </button>

                    {hasMaterial ? (
                      <button
                        type="button"
                        onClick={() => openUrl(course.material_url)}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <ExternalLink size={15} />
                        Buka Materi
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEdit(course)}
                        className="btn-secondary inline-flex items-center gap-2"
                      >
                        <FileText size={15} />
                        Tambah Materi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Mata Kuliah"
        maxWidth="max-w-2xl"
      >
        <CourseForm
          slots={slots}
          profile={profile}
          onDone={() => {
            setOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Mata Kuliah"
        maxWidth="max-w-2xl"
      >
        {editing && (
          <CourseForm
            slots={slots}
            profile={profile}
            initialData={editing}
            onDone={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detail Mata Kuliah"
        maxWidth="max-w-2xl"
      >
        {selected && (
          <CourseDetail
            course={selected}
            onEdit={() => {
              setEditing(selected);
              setSelected(null);
            }}
            onDelete={() => removeCourse(selected)}
          />
        )}
      </Modal>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 line-clamp-1 font-medium text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function CourseDetail({ course, onEdit, onDelete }) {
  const schedule = course.schedule;

  return (
    <div className="space-y-5 text-sm text-slate-700 dark:text-slate-200">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Mata Kuliah
        </p>

        <p className="mt-1 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
          {course.name || '-'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoCard label="SKS" value={course.sks || '-'} icon={BookOpen} />
        <InfoCard label="Dosen" value={course.lecturer || '-'} icon={BookOpen} />
        <InfoCard label="Hari" value={getDayLabel(schedule?.day_of_week)} icon={CalendarDays} />
        <InfoCard label="Jam" value={formatSchedule(schedule)} icon={Clock3} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <FileText size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Materi Kuliah
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Link folder materi khusus untuk mata kuliah ini.
                </p>
              </div>

              {hasValue(course.material_url) && (
                <button
                  type="button"
                  onClick={() => openUrl(course.material_url)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <ExternalLink size={15} />
                  Buka Folder
                </button>
              )}
            </div>

            {hasValue(course.material_url) ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Link Folder
                </p>

                <p className="mt-1 break-all text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {course.material_url}
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-3 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Belum ada link folder materi untuk mata kuliah ini.
              </p>
            )}

            {hasValue(course.material_note) && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Catatan Materi
                </p>

                <div className="mt-2 max-h-52 overflow-y-auto rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <p className="whitespace-pre-wrap break-words">
                    {course.material_note}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Pencil size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="btn-danger inline-flex items-center gap-2"
        >
          <Trash2 size={15} />
          Hapus
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-300">
            <Icon size={16} />
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words font-medium leading-6 text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function CourseForm({ slots, profile, initialData, onDone }) {
  const schedule = initialData?.schedule;

  const [f, setF] = useState({
    name: initialData?.name || '',
    lecturer: initialData?.lecturer || '',
    sks: initialData?.sks || 2,
    day_of_week: schedule?.day_of_week || 'monday',
    start_slot_id: schedule?.start_slot_id || '',
    end_slot_id: schedule?.end_slot_id || '',
    material_url: initialData?.material_url || '',
    material_note: initialData?.material_note || ''
  });

  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);

    let courseId = initialData?.id;

    const coursePayload = {
      name: f.name.trim(),
      lecturer: f.lecturer.trim() || null,
      sks: Number(f.sks) || 1,
      material_url: f.material_url.trim() || null,
      material_note: f.material_note.trim() || null
    };

    if (courseId) {
      const { error } = await supabase
        .from('courses')
        .update(coursePayload)
        .eq('id', courseId);

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('courses')
        .insert(coursePayload)
        .select('id')
        .single();

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }

      courseId = data.id;
    }

    const schedulePayload = {
      course_id: courseId,
      day_of_week: f.day_of_week,
      start_slot_id: f.start_slot_id || null,
      end_slot_id: f.end_slot_id || null,
      is_active: true,
      created_by: profile?.id || null
    };

    if (schedule?.id) {
      const { error } = await supabase
        .from('weekly_schedules')
        .update(schedulePayload)
        .eq('id', schedule.id);

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('weekly_schedules')
        .insert(schedulePayload);

      if (error) {
        setLoading(false);
        alert(error.message);
        return;
      }
    }

    setLoading(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label">Nama Mata Kuliah</span>
        <input
          required
          className="input mt-1"
          value={f.name}
          onChange={(event) => setF({ ...f, name: event.target.value })}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="label">SKS</span>
          <input
            required
            type="number"
            min="1"
            max="6"
            className="input mt-1"
            value={f.sks}
            onChange={(event) => setF({ ...f, sks: event.target.value })}
          />
        </label>

        <label className="block">
          <span className="label">Dosen</span>
          <input
            className="input mt-1"
            value={f.lecturer}
            onChange={(event) => setF({ ...f, lecturer: event.target.value })}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Hari"
          value={f.day_of_week}
          onChange={(value) => setF({ ...f, day_of_week: value })}
          options={dayOptions}
        />

        <Select
          label="Jam Mulai"
          value={f.start_slot_id}
          onChange={(value) => setF({ ...f, start_slot_id: value })}
          options={slots.map((slot) => [
            slot.id,
            `Jam ke-${slot.slot_number} | ${shortTime(slot.start_time)}`
          ])}
        />

        <Select
          label="Jam Selesai"
          value={f.end_slot_id}
          onChange={(value) => setF({ ...f, end_slot_id: value })}
          options={slots.map((slot) => [
            slot.id,
            `Jam ke-${slot.slot_number} | ${shortTime(slot.end_time)}`
          ])}
        />
      </div>

      <label className="block">
        <span className="label">Link Folder Materi</span>
        <input
          className="input mt-1"
          placeholder="https://drive.google.com/drive/folders/..."
          value={f.material_url}
          onChange={(event) => setF({ ...f, material_url: event.target.value })}
        />
      </label>

      <label className="block">
        <span className="label">Catatan Materi</span>
        <textarea
          className="input mt-1 min-h-24"
          placeholder="Contoh: Folder ini berisi PDF, PPT, modul, dan referensi perkuliahan."
          value={f.material_note}
          onChange={(event) => setF({ ...f, material_note: event.target.value })}
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
        onChange={(event) => onChange(event.target.value)}
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
