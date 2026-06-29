import React, { useEffect, useRef, useState } from 'react';
import { Pin, Send, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { sendPushNotification } from '../lib/push.js';
import { sendTelegramNotification } from '../lib/telegram.js';

// Helper untuk parsing URL menjadi link dan mempertahankan baris baru
function renderContent(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split('\n').map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      {line.split(urlRegex).map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {part}
            </a>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}

      {lineIndex < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
}

export default function AnnouncementsPage() {
  const { profile, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, profiles(nickname, full_name)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [items.length]);

  const send = async (e) => {
    e.preventDefault();

    if (!content.trim() || !profile?.id) return;

    setLoading(true);

    const trimmedContent = content.trim();

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        content: trimmedContent,
        created_by: profile.id
      })
      .select('id')
      .single();

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    await sendPushNotification({
      type: 'announcement_created',
      title: `Pengumuman baru dari ${profile?.nickname || 'Anggota'}`,
      body:
        trimmedContent.length > 120
          ? `${trimmedContent.slice(0, 120)}...`
          : trimmedContent,
      url: `/?page=announcements&announcement_id=${data?.id}`,
      excludeUserId: profile?.id
    });

    setLoading(false);
    setContent('');
    load();
  };

  const remove = async (item) => {
    if (!confirm('Hapus pengumuman ini?')) return;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', item.id);

    if (error) alert(error.message);
    else load();
  };

  const togglePin = async (item) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: !item.is_pinned })
      .eq('id', item.id);

    if (error) alert(error.message);
    else load();
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Pengumuman Kelas
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Model chat/pesan. Semua anggota bisa mengirim pengumuman kelas.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            Papan Pengumuman
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Pesan terbaru tampil di atas. Pengumuman yang dipin akan selalu muncul lebih dahulu.
          </p>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  <Send size={20} />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Belum ada pengumuman.
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tulis pengumuman pertama untuk kelas di kolom bawah.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const canModify = isAdmin || item.created_by === profile?.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl border p-4 ${
                      item.is_pinned
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40'
                        : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-900 dark:text-white">
                            {item.profiles?.nickname || item.profiles?.full_name || 'Anggota'}
                          </p>

                          {item.is_pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                              <Pin size={11} /> Dipin
                            </span>
                          )}
                        </div>

                        {/* Implementasi renderContent */}
                        <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {renderContent(item.content)}
                        </div>

                        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>

                      {canModify && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => togglePin(item)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                            title={item.is_pinned ? 'Lepas pin' : 'Pin pengumuman'}
                          >
                            <Pin size={15} />
                          </button>

                          <button
                            onClick={() => remove(item)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-300"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={send} className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-end gap-3">
            {/* Implementasi textarea dan onKeyDown */}
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis pengumuman...&#10;Gunakan Enter untuk membuat baris baru."
              className="min-h-[90px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  e.currentTarget.form.requestSubmit();
                }
              }}
            />

            <button
              disabled={loading || !content.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-800 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Send size={16} />
              Kirim
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
