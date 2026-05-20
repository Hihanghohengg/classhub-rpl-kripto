import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import { formatDateOnlyID } from '../utils/date.js';

const statusLabels = {
  not_started: 'Belum Mulai',
  on_progress: 'On Progress',
  done: 'Selesai'
};

const statusOptions = [
  ['not_started', 'Belum Mulai'],
  ['on_progress', 'On Progress'],
  ['done', 'Selesai']
];

function isOverdue(deadline, status) {
  if (!deadline || status === 'done') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(String(deadline).slice(0, 10));
  target.setHours(0, 0, 0, 0);

  return target < today;
}

function getTaskTypeLabel(type) {
  return type === 'group' ? 'Kelompok' : 'Individu';
}

function getProgressSummary(progressRows = []) {
  const total = progressRows.length;
  const done = progressRows.filter((item) => item.status === 'done').length;
  const onProgress = progressRows.filter((item) => item.status === 'on_progress').length;
  const notStarted = progressRows.filter((item) => item.status === 'not_started').length;

  return {
    total,
    done,
    onProgress,
    notStarted
  };
}

export default function TasksPage() {
  const { profile } = useAuth();

  const [view, setView] = useState('table');
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [members, setMembers] = useState([]);
  const [progress, setProgress] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    const [taskRes, courseRes, memberRes, progressRes] = await Promise.all([
      supabase
        .from('assignments')
        .select('*, courses(name), profiles(nickname)')
        .order('deadline', { ascending: true }),

      supabase
        .from('courses')
        .select('*')
        .order('name'),

      supabase
        .from('profiles')
        .select('id, full_name, nickname, npm')
        .order('npm'),

      supabase
        .from('assignment_progress')
        .select('*')
    ]);

    if (taskRes.error) alert(taskRes.error.message);
    if (courseRes.error) alert(courseRes.error.message);
    if (memberRes.error) alert(memberRes.error.message);
    if (progressRes.error) alert(progressRes.error.message);

    const taskData = taskRes.data || [];
    const memberData = memberRes.data || [];
    const progressData = progressRes.data || [];

    setTasks(taskData);
    setCourses(courseRes.data || []);
    setMembers(memberData);
    setProgress(progressData);

    await ensureProgressRows(taskData, memberData, progressData);
  };

  const ensureProgressRows = async (taskData, memberData, progressData) => {
    if (!taskData.length || !memberData.length) return;

    const existing = new Set(
      progressData.map((item) => `${item.assignment_id}-${item.user_id}`)
    );

    const missingRows = [];

    taskData.forEach((task) => {
      memberData.forEach((member) => {
        const key = `${task.id}-${member.id}`;

        if (!existing.has(key)) {
          missingRows.push({
            assignment_id: task.id,
            user_id: member.id,
            status: 'not_started'
          });
        }
      });
    });

    if (missingRows.length === 0) return;

    const { error } = await supabase
      .from('assignment_progress')
      .insert(missingRows);

    if (!error) {
      const { data } = await supabase
        .from('assignment_progress')
        .select('*');

      setProgress(data || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const progressByTask = useMemo(() => {
    const map = {};

    progress.forEach((item) => {
      if (!map[item.assignment_id]) map[item.assignment_id] = [];
      map[item.assignment_id].push(item);
    });

    return map;
  }, [progress]);

  const getMyStatus = (taskId) => {
    const row = progress.find(
      (item) => item.assignment_id === taskId && item.user_id === profile?.id
    );

    return row?.status || 'not_started';
  };

  const updateMyStatus = async (taskId, newStatus) => {
    if (!taskId || !profile?.id) return;

    setUpdatingId(taskId);

    const { data: existing, error: findError } = await supabase
      .from('assignment_progress')
      .select('id')
      .eq('assignment_id', taskId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (findError) {
      setUpdatingId(null);
      alert(findError.message);
      return;
    }

    let error;

    if (existing?.id) {
      const res = await supabase
        .from('assignment_progress')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      error = res.error;
    } else {
      const res = await supabase
        .from('assignment_progress')
        .insert({
          assignment_id: taskId,
          user_id: profile.id,
          status: newStatus
        });

      error = res.error;
    }

    setUpdatingId(null);

    if (error) {
      alert(error.message);
      return;
    }

    setProgress((current) => {
      const found = current.some(
        (item) => item.assignment_id === taskId && item.user_id === profile.id
      );

      if (found) {
        return current.map((item) =>
          item.assignment_id === taskId && item.user_id === profile.id
            ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
            : item
        );
      }

      return [
        ...current,
        {
          id: crypto.randomUUID(),
          assignment_id: taskId,
          user_id: profile.id,
          status: newStatus,
          updated_at: new Date().toISOString()
        }
      ];
    });
  };

  const deleteTask = async (task) => {
    if (!task?.id) return;

    if (task.created_by !== profile?.id) {
      alert('Tugas hanya bisa dihapus oleh pembuat tugas.');
      return;
    }

    const ok = window.confirm(`Hapus tugas "${task.title}"?`);

    if (!ok) return;

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', task.id)
      .eq('created_by', profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    setSelected(null);
    await load();
  };

  const filteredTasks = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    if (!q) return tasks;

    return tasks.filter((task) => {
      return (
        String(task.title || '').toLowerCase().includes(q) ||
        String(task.courses?.name || '').toLowerCase().includes(q) ||
        String(task.assignment_type || '').toLowerCase().includes(q) ||
        String(task.profiles?.nickname || '').toLowerCase().includes(q)
      );
    });
  }, [tasks, keyword]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      notStarted: tasks.filter((task) => getMyStatus(task.id) === 'not_started').length,
      onProgress: tasks.filter((task) => getMyStatus(task.id) === 'on_progress').length,
      done: tasks.filter((task) => getMyStatus(task.id) === 'done').length,
      overdue: tasks.filter((task) => isOverdue(task.deadline, getMyStatus(task.id))).length
    };
  }, [tasks, progress, profile]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Manajemen Tugas Kelas
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Status tugas bersifat personal per anggota kelas.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Tugas
        </button>
      </div>

      <div className="mb-4 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={ListTodo} label="Total Tugas" value={stats.total} tone="blue" />
        <StatCard icon={Clock3} label="Belum Mulai" value={stats.notStarted} tone="amber" />
        <StatCard icon={CalendarDays} label="On Progress" value={stats.onProgress} tone="sky" />
        <StatCard icon={CheckCircle2} label="Selesai" value={stats.done} tone="green" />
        <StatCard icon={AlertTriangle} label="Lewat Deadline" value={stats.overdue} tone="red" />
      </div>

      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <TabButton active={view === 'table'} onClick={() => setView('table')}>
            Tabel
          </TabButton>

          <TabButton active={view === 'status'} onClick={() => setView('status')}>
            Status Saya
          </TabButton>

          <TabButton active={view === 'deadline'} onClick={() => setView('deadline')}>
            Deadline
          </TabButton>
        </div>

        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input pl-9"
            placeholder="Cari tugas / mata kuliah"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === 'table' && (
          <TableView
            tasks={filteredTasks}
            onSelect={setSelected}
            getMyStatus={getMyStatus}
            progressByTask={progressByTask}
            onUpdateStatus={updateMyStatus}
            updatingId={updatingId}
          />
        )}

        {view === 'status' && (
          <StatusView
            tasks={filteredTasks}
            onSelect={setSelected}
            getMyStatus={getMyStatus}
            onUpdateStatus={updateMyStatus}
            updatingId={updatingId}
          />
        )}

        {view === 'deadline' && (
          <DeadlineView
            tasks={filteredTasks}
            onSelect={setSelected}
            getMyStatus={getMyStatus}
            onUpdateStatus={updateMyStatus}
            updatingId={updatingId}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Tugas">
        <TaskForm
          courses={courses}
          profile={profile}
          members={members}
          onDone={() => {
            setOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Tugas"
      >
        {editing && (
          <TaskForm
            courses={courses}
            profile={profile}
            members={members}
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
        title="Detail Tugas"
        maxWidth="max-w-3xl"
      >
        {selected && (
          <TaskDetail
            task={selected}
            members={members}
            progressRows={progressByTask[selected.id] || []}
            myStatus={getMyStatus(selected.id)}
            onUpdateStatus={updateMyStatus}
            updatingId={updatingId}
            isOwner={selected.created_by === profile?.id}
            onEdit={() => {
              setEditing(selected);
              setSelected(null);
            }}
            onDelete={() => deleteTask(selected)}
          />
        )}
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${toneClass[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function TableView({
  tasks,
  onSelect,
  getMyStatus,
  progressByTask,
  onUpdateStatus,
  updatingId
}) {
  return (
    <div className="h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-full overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="min-w-[340px] px-5 py-4">Tugas</th>
              <th className="min-w-[240px] px-5 py-4">Mata Kuliah</th>
              <th className="min-w-[140px] px-5 py-4">Deadline</th>
              <th className="min-w-[190px] px-5 py-4">Status Saya</th>
              <th className="min-w-[180px] px-5 py-4">Progress Kelas</th>
              <th className="min-w-[120px] px-5 py-4">Tipe</th>
              <th className="min-w-[140px] px-5 py-4">Dibuat Oleh</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                  Belum ada tugas.
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const myStatus = getMyStatus(task.id);
                const summary = getProgressSummary(progressByTask[task.id] || []);

                return (
                  <tr
                    key={task.id}
                    onClick={() => onSelect(task)}
                    className="cursor-pointer border-b border-slate-100 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <td className="px-5 py-4">
                      <p className="line-clamp-1 font-semibold text-slate-900 dark:text-white">
                        {task.title || '-'}
                      </p>

                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {task.description}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">{task.courses?.name || '-'}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`font-medium ${
                          isOverdue(task.deadline, myStatus)
                            ? 'text-red-600 dark:text-red-300'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {formatDateOnlyID(task.deadline)}
                      </span>
                    </td>

                    <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                      <StatusSelect
                        value={myStatus}
                        disabled={updatingId === task.id}
                        onChange={(value) => onUpdateStatus(task.id, value)}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Users size={14} />
                        <span>{summary.done}/{summary.total} selesai</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">{getTaskTypeLabel(task.assignment_type)}</td>

                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {task.profiles?.nickname || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusView({ tasks, onSelect, getMyStatus, onUpdateStatus, updatingId }) {
  const groups = [
    ['not_started', 'Belum Mulai'],
    ['on_progress', 'On Progress'],
    ['done', 'Selesai']
  ];

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-hidden md:grid-cols-3">
      {groups.map(([status, label]) => {
        const rows = tasks.filter((task) => getMyStatus(task.id) === status);

        return (
          <div
            key={status}
            className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {label}
              </h3>

              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {rows.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Tidak ada tugas.
                </p>
              ) : (
                rows.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    myStatus={getMyStatus(task.id)}
                    onSelect={onSelect}
                    onUpdateStatus={onUpdateStatus}
                    updatingId={updatingId}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeadlineView({ tasks, onSelect, getMyStatus, onUpdateStatus, updatingId }) {
  const sorted = [...tasks].sort((a, b) =>
    String(a.deadline || '').localeCompare(String(b.deadline || ''))
  );

  return (
    <div className="h-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada deadline tugas.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              myStatus={getMyStatus(task.id)}
              onSelect={onSelect}
              onUpdateStatus={onUpdateStatus}
              updatingId={updatingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, myStatus, onSelect, onUpdateStatus, updatingId }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-slate-800"
    >
      <p className="line-clamp-2 font-semibold text-slate-900 dark:text-white">
        {task.title || '-'}
      </p>

      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
        {task.courses?.name || '-'}
      </p>

      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <StatusSelect
          value={myStatus}
          disabled={updatingId === task.id}
          onChange={(value) => onUpdateStatus(task.id, value)}
        />

        <span
          className={`text-xs font-medium ${
            isOverdue(task.deadline, myStatus)
              ? 'text-red-600 dark:text-red-300'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {formatDateOnlyID(task.deadline)}
        </span>

        <span className="text-xs font-medium text-slate-400">
          {getTaskTypeLabel(task.assignment_type)}
        </span>
      </div>
    </button>
  );
}

function TaskDetail({
  task,
  members,
  progressRows,
  myStatus,
  onUpdateStatus,
  updatingId,
  isOwner,
  onEdit,
  onDelete
}) {
  const progressMap = Object.fromEntries(
    progressRows.map((item) => [item.user_id, item.status])
  );

  const groupedMembers = {
    done: [],
    on_progress: [],
    not_started: []
  };

  members.forEach((member) => {
    const status = progressMap[member.id] || 'not_started';
    groupedMembers[status].push(member);
  });

  return (
    <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Judul Tugas
        </p>

        <p className="mt-1 text-base font-semibold leading-6 text-slate-900 dark:text-white">
          {task.title || '-'}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoItem label="Mata Kuliah" value={task.courses?.name || task.course_name || '-'} />
        <InfoItem label="Deadline" value={formatDateOnlyID(task.deadline)} />
        <InfoItem label="Tipe" value={getTaskTypeLabel(task.assignment_type)} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Status Saya
          </p>

          <div className="mt-2">
            <StatusSelect
              value={myStatus}
              disabled={updatingId === task.id}
              onChange={(value) => onUpdateStatus(task.id, value)}
            />
          </div>
        </div>
      </div>

      {task.description && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Deskripsi
          </p>

          <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            {task.description}
          </p>
        </div>
      )}

      {task.link_url && (
        <p>
          <b className="font-semibold text-slate-900 dark:text-white">Link:</b>{' '}
          <a
            href={task.link_url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-blue-700 underline dark:text-blue-300"
          >
            Buka link tugas
          </a>
        </p>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Progress Anggota
        </p>

        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <MemberStatusBox title="Selesai" members={groupedMembers.done} tone="green" />
          <MemberStatusBox title="On Progress" members={groupedMembers.on_progress} tone="blue" />
          <MemberStatusBox title="Belum Mulai" members={groupedMembers.not_started} tone="amber" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Dibuat oleh {task.profiles?.nickname || 'Anggota'}
        </p>

        {isOwner && (
          <div className="flex flex-wrap gap-2">
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
        )}
      </div>
    </div>
  );
}

function MemberStatusBox({ title, members, tone }) {
  const toneClass = {
    green: 'border-green-100 bg-green-50 dark:border-green-900 dark:bg-green-950',
    blue: 'border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
    amber: 'border-amber-100 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
  };

  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone]}`}>
      <p className="font-semibold text-slate-900 dark:text-white">
        {title} ({members.length})
      </p>

      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1 text-sm text-slate-600 dark:text-slate-300">
        {members.length === 0 ? (
          <p>-</p>
        ) : (
          members.map((member) => (
            <p key={member.id} className="truncate">
              {member.nickname || member.full_name}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
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

function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value || 'not_started'}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
    >
      {statusOptions.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function TaskForm({ courses, profile, members, initialData, onDone }) {
  const isEdit = Boolean(initialData?.id);

  const [f, setF] = useState({
    course_id: initialData?.course_id || '',
    title: initialData?.title || '',
    assignment_type: initialData?.assignment_type || 'individual',
    deadline: initialData?.deadline ? String(initialData.deadline).slice(0, 10) : '',
    description: initialData?.description || '',
    link_url: initialData?.link_url || ''
  });

  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);

    const payload = {
      course_id: f.course_id || null,
      title: f.title.trim(),
      assignment_type: f.assignment_type,
      deadline: f.deadline || null,
      description: f.description.trim() || null,
      link_url: f.link_url.trim() || null
    };

    if (isEdit) {
      const { error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', initialData.id)
        .eq('created_by', profile?.id);

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      onDone();
      return;
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        ...payload,
        status: 'not_started',
        created_by: profile?.id || null
      })
      .select('id')
      .single();

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    if (data?.id && members.length > 0) {
      const rows = members.map((member) => ({
        assignment_id: data.id,
        user_id: member.id,
        status: 'not_started'
      }));

      const { error: progressError } = await supabase
        .from('assignment_progress')
        .insert(rows);

      if (progressError) {
        setLoading(false);
        alert(progressError.message);
        return;
      }
    }

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
        <span className="label">Judul Tugas</span>
        <input
          required
          className="input mt-1"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </label>

      <div>
        <span className="label">Tipe Tugas</span>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setF({ ...f, assignment_type: 'individual' })}
            className={f.assignment_type === 'individual' ? 'btn-primary' : 'btn-secondary'}
          >
            Individu
          </button>

          <button
            type="button"
            onClick={() => setF({ ...f, assignment_type: 'group' })}
            className={f.assignment_type === 'group' ? 'btn-primary' : 'btn-secondary'}
          >
            Kelompok
          </button>
        </div>
      </div>

      <label className="block">
        <span className="label">Deadline</span>
        <input
          required
          type="date"
          className="input mt-1"
          value={f.deadline}
          onChange={(e) => setF({ ...f, deadline: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="label">Deskripsi Tugas</span>
        <textarea
          className="input mt-1 min-h-24"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="label">Link Pengumpulan / Link Pendukung</span>
        <input
          className="input mt-1"
          value={f.link_url}
          onChange={(e) => setF({ ...f, link_url: e.target.value })}
        />
      </label>

      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan'}
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
