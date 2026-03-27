'use client';

import { useEffect, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

type NotificationType = 'info' | 'warning' | 'success' | 'error' | string;

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const now = new Date('2026-03-27T12:00:00Z');

function msAgo(ms: number): Date {
  return new Date(now.getTime() - ms);
}

const DEMO_DATA: Notification[] = [
  {
    id: '1',
    title: 'Kurs tamamlandı',
    body: 'React İleri Seviye kursunu başarıyla tamamladınız!',
    type: 'success',
    link: null,
    readAt: null,
    createdAt: msAgo(10 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Yeni rozet kazandınız',
    body: '🏅 "Hızlı Öğrenen" rozetini kazandınız.',
    type: 'info',
    link: '/leaderboard',
    readAt: null,
    createdAt: msAgo(60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Sınav hatırlatması',
    body: "Python Final Sınavı yarın saat 14:00'te başlıyor.",
    type: 'warning',
    link: '/exams',
    readAt: null,
    createdAt: msAgo(3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Ödeme onaylandı',
    body: 'Veri Bilimi kursu için ödemeniz alındı.',
    type: 'success',
    link: null,
    readAt: msAgo(2 * 60 * 60 * 1000).toISOString(),
    createdAt: msAgo(5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Sertifikanız hazır',
    body: 'AWS Cloud Practitioner sertifikanızı indirebilirsiniz.',
    type: 'info',
    link: '/certificates',
    readAt: msAgo(24 * 60 * 60 * 1000).toISOString(),
    createdAt: msAgo(24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    title: 'Güvenlik uyarısı',
    body: 'Hesabınıza yeni bir cihazdan giriş yapıldı.',
    type: 'error',
    link: null,
    readAt: msAgo(2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: msAgo(2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function relativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs} saniye önce`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} dakika önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

function dotColor(type: NotificationType): string {
  switch (type) {
    case 'info':    return 'bg-blue-500';
    case 'warning': return 'bg-amber-500';
    case 'success': return 'bg-green-500';
    case 'error':   return 'bg-red-500';
    default:        return 'bg-slate-500';
  }
}

function typeBadgeClass(type: NotificationType): string {
  switch (type) {
    case 'info':    return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'warning': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'success': return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'error':   return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function typeBadgeLabel(type: NotificationType): string {
  switch (type) {
    case 'info':    return 'Bilgi';
    case 'warning': return 'Uyarı';
    case 'success': return 'Başarı';
    case 'error':   return 'Hata';
    default:        return type;
  }
}

type FilterTab = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/my`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('API error');
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch {
      setNotifications(DEMO_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'read')   return !!n.readAt;
    return true;
  });

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
    } catch {
      // Silently ignore – optimistic update already applied
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
    );
    try {
      await fetch(`${API_BASE}/notifications/my/read-all`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Silently ignore
    } finally {
      setMarkingAllRead(false);
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',    label: 'Tümü' },
    { key: 'unread', label: 'Okunmamış' },
    { key: 'read',   label: 'Okunmuş' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <header className="hero glass rounded-2xl border border-slate-700/50 p-8">
          <div className="hero-content space-y-2 animate-fade-slide-up">
            <div className="pill w-fit text-sm stagger-1">Bildirimler</div>
            <h1 className="text-3xl font-bold">🔔 Bildirim Merkezi</h1>
            <p className="text-slate-400 text-sm">Tüm bildirimlerinizi buradan yönetin.</p>
          </div>
        </header>

        {/* Stats strip */}
        <section className="grid grid-cols-2 gap-4 animate-fade-slide-up stagger-2">
          <div className="glass rounded-2xl border border-slate-700/50 p-5 space-y-1">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Toplam Bildirim</div>
            {loading ? (
              <div className="skeleton h-8 w-16 rounded-lg" />
            ) : (
              <div className="metric text-2xl font-bold text-white">{totalCount}</div>
            )}
          </div>
          <div className="glass rounded-2xl border border-slate-700/50 p-5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
              <span>Okunmamış</span>
              {!loading && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {loading ? (
              <div className="skeleton h-8 w-12 rounded-lg" />
            ) : (
              <div className={`metric text-2xl font-bold ${unreadCount > 0 ? 'text-red-400' : 'text-white'}`}>
                {unreadCount}
              </div>
            )}
          </div>
        </section>

        {/* Filter tabs + Mark all read */}
        <div className="flex items-center justify-between gap-4 animate-fade-slide-up stagger-3">
          <div className="flex gap-1 glass rounded-xl border border-slate-700/50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {!loading && unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="px-4 py-2 rounded-xl border border-slate-600 bg-white/5 hover:bg-white/10 text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
            >
              {markingAllRead ? 'İşleniyor...' : 'Tümünü Okundu İşaretle'}
            </button>
          )}
        </div>

        {/* Notification list */}
        <section className="space-y-3 animate-fade-slide-up stagger-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            ))
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-lg">
              Henüz bildirim yok 🎉
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isUnread = !notification.readAt;
              const isClickable = !!notification.link;

              const cardContent = (
                <div
                  className={`rounded-2xl border p-5 space-y-3 transition-all ${
                    isUnread
                      ? 'bg-white/5 border-slate-600/60 hover:border-slate-500/80'
                      : 'bg-transparent border-slate-700/40 hover:border-slate-600/60'
                  } ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={
                    isClickable
                      ? () => { window.location.href = notification.link as string; }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    {/* Colored dot */}
                    <span
                      className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full ${dotColor(notification.type)}`}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Title */}
                      <p
                        className={`font-semibold text-sm leading-snug ${
                          isUnread ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {/* Body */}
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {notification.body}
                      </p>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div
                    className="flex items-center justify-between gap-3 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {relativeTime(notification.createdAt)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${typeBadgeClass(notification.type)}`}
                      >
                        {typeBadgeLabel(notification.type)}
                      </span>
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1 rounded-lg transition-all"
                      >
                        Okundu İşaretle
                      </button>
                    )}
                  </div>
                </div>
              );

              return <div key={notification.id}>{cardContent}</div>;
            })
          )}
        </section>
      </div>
    </div>
  );
}
