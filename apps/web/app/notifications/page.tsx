'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ─── Types ────────────────────────────────────────────────────────────────────
type NType = 'info' | 'warning' | 'success' | 'error' | string;
interface Notif {
  id: string; title: string; body: string; type: NType;
  link: string | null; readAt: string | null; createdAt: string;
}
type FilterTab = 'all' | 'unread' | 'read';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const REF = new Date();
function msAgo(ms: number) { return new Date(REF.getTime() - ms).toISOString(); }

function relTime(iso: string) {
  const s = Math.floor((REF.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}sn önce`;
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)}sa önce`;
  return `${Math.floor(s / 86400)}g önce`;
}

function typeStyle(type: NType): { icon: string; bg: string; border: string; color: string; label: string } {
  switch (type) {
    case 'success': return { icon: '✅', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   color: '#22c55e', label: 'Başarı' };
    case 'warning': return { icon: '⚠️', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  color: '#f59e0b', label: 'Uyarı' };
    case 'error':   return { icon: '🚨', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', color: '#f87171', label: 'Hata' };
    default:        return { icon: 'ℹ️', bg: 'rgba(91,110,255,0.08)',  border: 'rgba(91,110,255,0.25)',  color: 'var(--accent)', label: 'Bilgi' };
  }
}

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO: Notif[] = [
  { id: '1', title: 'Kurs tamamlandı 🎉',         body: 'React İleri Seviye kursunu başarıyla tamamladınız!',     type: 'success', link: '/my-courses',   readAt: null,                   createdAt: msAgo(10 * 60 * 1000) },
  { id: '2', title: 'Yeni rozet kazandınız',       body: '🏅 "Hızlı Öğrenen" rozetini kazandınız.',               type: 'info',    link: '/leaderboard',  readAt: null,                   createdAt: msAgo(60 * 60 * 1000) },
  { id: '3', title: 'Sınav hatırlatması',          body: "Python Final Sınavı yarın saat 14:00'te başlıyor.",     type: 'warning', link: '/exams',         readAt: null,                   createdAt: msAgo(3 * 3600 * 1000) },
  { id: '4', title: 'Ödeme onaylandı',             body: 'Veri Bilimi kursu için ödemeniz başarıyla alındı.',     type: 'success', link: null,             readAt: msAgo(2 * 3600 * 1000), createdAt: msAgo(5 * 3600 * 1000) },
  { id: '5', title: 'Sertifikanız hazır',          body: 'AWS Cloud Practitioner sertifikanızı indirebilirsiniz.', type: 'info',   link: '/certificates',  readAt: msAgo(86400 * 1000),    createdAt: msAgo(86400 * 1000) },
  { id: '6', title: 'Güvenlik uyarısı',            body: 'Hesabınıza yeni bir cihazdan giriş yapıldı.',           type: 'error',   link: null,             readAt: msAgo(2 * 86400 * 1000), createdAt: msAgo(2 * 86400 * 1000) },
  { id: '7', title: 'Canlı ders başladı',          body: 'Matematik — Türev dersi şu an canlı yayında!',         type: 'info',    link: '/live',          readAt: null,                   createdAt: msAgo(5 * 60 * 1000) },
  { id: '8', title: 'Ödev son günü',               body: 'JavaScript alıştırmaları için son teslim tarihi bugün.', type: 'warning', link: '/my-courses',   readAt: msAgo(3600 * 1000),     createdAt: msAgo(12 * 3600 * 1000) },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const t = useI18n();
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<FilterTab>('all');
  const [markingAll, setMarkingAll]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/my`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data: Notif[] = await res.json();
      setNotifs(data.length ? data : DEMO);
    } catch {
      setNotifs(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total   = notifs.length;
  const unread  = notifs.filter((n) => !n.readAt).length;

  const filtered = notifs.filter((n) => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'read')   return !!n.readAt;
    return true;
  });

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders() }).catch(() => {});
  }

  async function markAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => n.readAt ? n : { ...n, readAt: new Date().toISOString() }));
    fetch(`${API_BASE}/notifications/my/read-all`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    setTimeout(() => setMarkingAll(false), 800);
  }

  function deleteNotif(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <>
      <style>{`
        .notif-card {
          border-radius: var(--r-xl); background: var(--panel); border: 1.5px solid var(--line);
          padding: 16px 18px; transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
          box-shadow: var(--shadow-sm); position: relative;
        }
        .notif-card.unread { border-left-width: 3px; }
        .notif-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
        .notif-card.clickable { cursor: pointer; }
        .notif-tab { transition: all 0.12s; }
        .notif-tab:hover { color: var(--accent); }
        .notif-mark-btn {
          font-size: 11px; padding: 3px 10px; border-radius: var(--r-md);
          border: 1.5px solid var(--line); background: var(--bg); color: var(--muted);
          cursor: pointer; transition: all 0.12s; white-space: nowrap;
        }
        .notif-mark-btn:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760, margin: '0 auto' }}>

        {/* ── Header ── */}
        <header style={{
          borderRadius: 'var(--r-xl)', border: '1.5px solid var(--line)', padding: '22px 28px', boxShadow: 'var(--shadow-sm)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 5%, var(--panel)), color-mix(in srgb, var(--accent-2) 4%, var(--panel)))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t.notifications.title}</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>🔔 {t.notifications.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{t.notifications.subtitle}</p>
            </div>
            {!loading && unread > 0 && (
              <button
                onClick={markAllRead} disabled={markingAll}
                style={{ padding: '8px 16px', borderRadius: 'var(--r-lg)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: markingAll ? 0.6 : 1, transition: 'opacity 0.15s' }}
              >
                {markingAll ? '…' : `✓ ${t.notifications.markAllRead}`}
              </button>
            )}
          </div>
        </header>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Toplam',     value: loading ? '…' : total,           color: 'var(--ink)',   icon: '📬' },
            { label: 'Okunmamış', value: loading ? '…' : unread,          color: '#f87171',      icon: '🔴' },
            { label: 'Okunmuş',   value: loading ? '…' : total - unread,  color: '#22c55e',      icon: '✅' },
          ].map((s) => (
            <div key={t.tr(s.label)} style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '14px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.tr(s.label)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 4, boxShadow: 'var(--shadow-sm)' }}>
          {([
            { key: 'all',    label: `${t.notifications.filterAll} (${total})` },
            { key: 'unread', label: `${t.notifications.filterUnread} (${unread})` },
            { key: 'read',   label: `${t.common.all} ✓ (${total - unread})` },
          ] as const).map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className="notif-tab" style={{
              flex: 1, padding: '8px 14px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filter === tab.key ? 700 : 500,
              background: filter === tab.key ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'transparent',
              color: filter === tab.key ? 'var(--accent)' : 'var(--muted)',
              boxShadow: filter === tab.key ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 30%, transparent)' : 'none',
            }}>
              {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 90, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', opacity: 0.5 }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                {t.notifications.noNotifications}
              </p>
            </div>
          ) : (
            filtered.map((n) => {
              const s = typeStyle(n.type);
              const isUnread = !n.readAt;
              const Tag = n.link ? Link : 'div';
              const tagProps = n.link ? { href: n.link } : {};
              return (
                <div
                  key={n.id}
                  className={`notif-card${isUnread ? ' unread' : ''}${n.link ? ' clickable' : ''}`}
                  style={{ borderLeftColor: isUnread ? s.color : 'var(--line)' }}
                  onClick={n.link ? () => { window.location.href = n.link!; } : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 'var(--r-md)', flexShrink: 0,
                      background: s.bg, border: `1.5px solid ${s.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                    }}>
                      {s.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: isUnread ? 700 : 600, color: isUnread ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.3 }}>{t.tr(n.title)}</span>
                        {isUnread && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}` }} />
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, marginLeft: 'auto' }}>
                          {t.tr(s.label)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 8px' }}>{t.tr(n.body)}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{relTime(n.createdAt)}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isUnread && (
                            <button className="notif-mark-btn" onClick={() => markRead(n.id)}>{t.tr("✓ Okundu")}</button>
                          )}
                          <button
                            onClick={() => deleteNotif(n.id)}
                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-md)', border: '1.5px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.06)', color: '#f87171', cursor: 'pointer', transition: 'all 0.12s' }}
                          >
                            {t.tr("Sil")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
