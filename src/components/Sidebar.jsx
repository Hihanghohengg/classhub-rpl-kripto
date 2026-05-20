import React from 'react';
import {
  CalendarDays,
  CheckSquare,
  GraduationCap,
  Home,
  Megaphone,
  Settings,
  Users,
  UserRoundCheck
} from 'lucide-react';

const menus = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'calendar', label: 'Kalender', icon: CalendarDays },
  { key: 'courses', label: 'Mata Kuliah', icon: GraduationCap },
  { key: 'tasks', label: 'Tugas', icon: CheckSquare },
  { key: 'groups', label: 'Kelompok', icon: Users },
  { key: 'announcements', label: 'Pengumuman', icon: Megaphone },
  { key: 'members', label: 'Anggota', icon: UserRoundCheck }
];

export default function Sidebar({ active, setActive }) {
  return (
    <aside className="hidden h-screen w-[220px] shrink-0 border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
      <div className="mb-5 rounded-3xl bg-blue-900 px-4 py-4 text-white shadow-sm dark:bg-blue-700">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt="Logo ClassHub"
            className="h-7 w-7 shrink-0 object-contain"
          />

          <div className="min-w-0">
            <div className="truncate text-lg font-black leading-none">
              ClassHub
            </div>

            <div className="mt-1 text-xs font-bold text-blue-100">
              RPL Kripto
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {menus.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-sky-100 text-blue-900 dark:bg-blue-900 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setActive('settings')}
        className={`mt-3 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
          active === 'settings'
            ? 'bg-sky-100 text-blue-900 dark:bg-blue-900 dark:text-white'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        <Settings size={18} />
        <span className="truncate">Pengaturan</span>
      </button>
    </aside>
  );
}
