import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className={`card w-full ${maxWidth} max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="font-bold text-slate-900 dark:text-slate-50">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-64px)] overflow-y-auto p-5 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}
