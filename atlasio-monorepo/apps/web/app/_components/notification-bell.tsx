'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../api/client';

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
  info:    'ℹ️',
  success: '✅',
  warning: '⚠️',
  error:   '❌',
};

const TYPE_COLOR: Record<string, string> = {
  info:    'border-l-blue-400 bg-blue-50',
  success: 'border-l-emerald-400 bg-emerald-50',
  warning: 'border-l-amber-400 bg-amber-50',
  error:   'border-l-rose-400 bg-rose-50',
};

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(() => {
    api<{ count: number }>('/notifications/my/unread-count')
      .then((d) => setUnread(d.count))
      .catch(() => {});
  }, []);

  // 30s polling for unread count
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    fetchCount();
    timerRef.current = setInterval(fetchCount, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchCount]);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function openPanel() {
    setOpen((v) => !v);
    if (!open && notifs.length === 0) {
      setLoading(true);
      try {
        const data = await api<Notif[]>('/notifications/my');
        setNotifs(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAll() {
    await api('/notifications/my/read-all', { method: 'POST' }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={openPanel}
        className="theme-toggle"
        aria-label="Bildirimler"
        title="Bildirimler"
      >
        🔔
        {unread > 0 && (
          <span className="notif-badge">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-scale-in">
          <div className="glass rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Bildirimler</span>
                {unread > 0 && (
                  <span className="pill pill-xs bg-rose-50 border-rose-200 text-rose-700">
                    {unread} yeni
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Tümünü okundu say
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {loading && (
                <div className="space-y-2 p-3">
                  {[1,2,3].map((i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
                </div>
              )}
              {!loading && notifs.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">
                  <div className="text-2xl mb-2">🔕</div>
                  Bildirim yok
                </div>
              )}
              {!loading && notifs.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-l-4 transition-colors cursor-pointer ${
                    n.readAt ? 'opacity-60' : ''
                  } ${TYPE_COLOR[n.type] ?? 'border-l-slate-300 bg-white'} hover:brightness-95`}
                  onClick={() => { if (!n.readAt) markRead(n.id); }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] ?? 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Görüntüle →
                        </Link>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 text-center">
                <span className="text-xs text-slate-400">Son {notifs.length} bildirim</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
