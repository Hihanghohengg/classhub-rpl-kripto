import React from 'react';
import Badge from './Badge.jsx';
import { DAYS, formatIDDate, shortTime } from '../utils/date.js';

const eventBadge = (item) => {
  if (item.source === 'assignment') return ['Tugas', 'pink'];
  if (item.event_type === 'replacement_class') return ['Jam Pengganti', 'replacement'];
  if (item.event_type === 'cancelled_class') return ['Dibatalkan', 'cancelled'];
  if (item.event_type === 'exam' || item.event_type === 'quiz') return ['Ujian/Kuis', 'purple'];
  return ['Reguler', 'regular'];
};

export default function WeeklyCalendar({ days, itemsByDay, onSelect }) {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5">
      {DAYS.map((day, index) => {
        const dayData = days?.[index];
        const items = itemsByDay?.[day.key] || [];

        return (
          <section
            key={day.key}
            className="flex min-h-0 min-w-0 flex-col border-b border-slate-200 last:border-b-0 dark:border-slate-800 md:border-b-0 md:border-r md:last:border-r-0"
          >
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {day.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {dayData ? formatIDDate(dayData.iso) : '-'}
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Tidak ada jadwal
                </div>
              ) : (
                items.map((item) => {
                  const [label, type] = eventBadge(item);
                  const modeLabel =
                    item.mode === 'online'
                      ? 'Daring'
                      : item.mode === 'offline'
                        ? 'Luring'
                        : null;

                  const isAssignment = item.source === 'assignment';

                  return (
                    <button
                      key={`${item.source}-${item.id}`}
                      onClick={() => onSelect?.(item)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isAssignment
                          ? 'border-pink-200 bg-pink-50 hover:border-pink-300 hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/40 dark:hover:bg-pink-950'
                          : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-slate-800'
                      }`}
                    >
                      <p className={`text-xs font-black ${
                        isAssignment
                          ? 'text-pink-700 dark:text-pink-200'
                          : 'text-blue-800 dark:text-blue-200'
                      }`}>
                        {isAssignment
                          ? item.deadlineLabel || 'Deadline'
                          : `${shortTime(item.start_time)}–${shortTime(item.end_time)}`}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">
                        {isAssignment ? `[Tugas] ${item.title}` : item.course_name || item.title}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge type={type}>{label}</Badge>
                        {modeLabel && (
                          <Badge type={item.mode === 'online' ? 'online' : 'offline'}>
                            {modeLabel}
                          </Badge>
                        )}
                      </div>

                      {(item.room || item.notes || item.description) && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {item.room || item.notes || item.description}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}