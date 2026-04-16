'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Notif = {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type?: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type AlarmPayload = {
  id: string;
  title: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
};

type Toast = AlarmPayload & { key: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes}dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}sa önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

const SEVERITY_TOAST: Record<AlarmPayload['severity'], string> = {
  LOW:    'bg-emerald-600 border-emerald-700',
  MEDIUM: 'bg-amber-500   border-amber-600',
  HIGH:   'bg-rose-600    border-rose-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [unread, setUnread]     = useState(0);
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toasts, setToasts]     = useState<Toast[]>([]);

  const panelRef  = useRef<HTMLDivElement>(null);
  const toastKeyRef = useRef(0);

  // ── Fetch initial unread count ────────────────────────────────────────────

  const fetchCount = useCallback(() => {
    api<{ count: number }>('/notifications/my/unread-count')
      .then((d) => setUnread(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    fetchCount();
  }, [fetchCount]);

  // ── WebSocket (dynamic import — SSR-safe) ─────────────────────────────────

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

    let socketInstance: import('socket.io-client').Socket | null = null;

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(BASE + '/notifications', {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });

      socketInstance.on('alarm', (payload: AlarmPayload) => {
        // Increment unread badge
        setUnread((c) => c + 1);

        // Show toast
        const key = ++toastKeyRef.current;
        const toast: Toast = { ...payload, key };
        setToasts((prev) => [...prev, toast]);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.key !== key));
        }, 4_000);
      });
    });

    return () => {
      socketInstance?.disconnect();
    };
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Open dropdown & fetch last 5 notifications ────────────────────────────

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await api<Notif[]>('/notifications/my');
        setNotifs(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  }

  // ── Mark all read ─────────────────────────────────────────────────────────

  async function markAll() {
    await api('/notifications/my/read-all', { method: 'POST' }).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const badgeLabel = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Toast banners ─────────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.key}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg
              border text-white text-sm max-w-xs w-full
              animate-fade-in
              ${SEVERITY_TOAST[toast.severity] ?? 'bg-slate-700 border-slate-800'}
            `}
            role="alert"
          >
            <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
              {toast.severity === 'HIGH' ? '🔴' : toast.severity === 'MEDIUM' ? '🟡' : '🟢'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{toast.title}</div>
              <div className="text-white/85 text-xs mt-0.5 line-clamp-2">{toast.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bell button + dropdown ────────────────────────────────────────── */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={openPanel}
          className={`theme-toggle relative ${unread > 0 ? 'animate-pulse' : ''}`}
          aria-label="Bildirimler"
          data-tip="Bildirimler"
        >
          🔔
          {badgeLabel && (
            <span className="notif-badge bg-rose-500 text-white">
              {badgeLabel}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ──────────────────────────────────────────────── */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 z-50 animate-scale-in">
            <div className="glass rounded-2xl shadow-xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Bildirimler</span>
                  {unread > 0 && (
                    <span className="pill pill-xs bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300">
                      {unread} yeni
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                  >
                    Hepsini okundu işaretle
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
                {loading && (
                  <div className="space-y-2 p-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 skeleton rounded-lg" />
                    ))}
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
                    className={`px-4 py-3 transition-colors ${
                      n.readAt ? 'opacity-60' : 'bg-blue-50/40 dark:bg-blue-900/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {n.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {n.body ?? n.message ?? ''}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5 whitespace-nowrap">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between">
                <Link
                  href="/notifications"
                  className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                  onClick={() => setOpen(false)}
                >
                  Tümünü gör →
                </Link>
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline"
                  >
                    Hepsini okundu işaretle
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
