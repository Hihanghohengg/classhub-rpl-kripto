import React, { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import Sidebar from '../components/Sidebar.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

import DashboardPage from './DashboardPage.jsx';
import CalendarPage from './CalendarPage.jsx';
import CoursesPage from './CoursesPage.jsx';
import TasksPage from './TasksPage.jsx';
import PracticePage from './PracticePage.jsx';
import GroupsPage from './GroupsPage.jsx';
import AnnouncementsPage from './AnnouncementsPage.jsx';
import MembersPage from './MembersPage.jsx';
import SettingsPage from './SettingsPage.jsx';

const pageMap = {
  dashboard: DashboardPage,
  calendar: CalendarPage,
  courses: CoursesPage,
  tasks: TasksPage,
  practice: PracticePage,
  groups: GroupsPage,
  announcements: AnnouncementsPage,
  members: MembersPage,
  settings: SettingsPage
};

function applyAppearance(profile) {
  const root = document.documentElement;
  const theme = profile?.theme_preference || 'light';
  const fontSize = profile?.font_size_preference || 'normal';
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark);

  root.classList.toggle('dark', shouldUseDark);
  root.classList.toggle('light', !shouldUseDark);
  root.dataset.fontSize = fontSize;
}

export default function DashboardShell() {
  const [active, setActive] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, showWelcome, setShowWelcome } = useAuth();

  const Page = pageMap[active] || DashboardPage;

  useEffect(() => {
    applyAppearance(profile);
  }, [profile?.theme_preference, profile?.font_size_preference]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    if (!media) return undefined;

    const handleChange = () => {
      if (profile?.theme_preference === 'system') {
        applyAppearance(profile);
      }
    };

    media.addEventListener('change', handleChange);

    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, [profile]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Sidebar active={active} setActive={setActive} />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="h-full w-72 bg-white dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              mobile
              active={active}
              setActive={(key) => {
                setActive(key);
                setMobileOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header setMobileOpen={setMobileOpen} />

        <div className="min-h-0 flex-1 overflow-hidden">
          <Page />
        </div>
      </main>

      <Modal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        title=""
        maxWidth="max-w-md"
      >
        <div className="py-7 text-center">
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            Selamat datang, {profile?.nickname || 'Teman'}!
          </p>

          <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-300">
            Semoga harimu produktif. Jangan lupa cek jadwal dan tugas hari ini, ya.
          </p>
        </div>
      </Modal>
    </div>
  );
}
