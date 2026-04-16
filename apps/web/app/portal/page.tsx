"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { api } from "../api/client";
import { useI18n } from "../_i18n/use-i18n";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type UserProfile = {
  id: string; email: string; name: string | null; role: string;
};
type GamificationStats = {
  xp: number; streak: number; hearts: number; coins: number;
  league: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "MASTER";
  badges?: UserBadge[];
};
type Badge = {
  id: string; name: string; description: string; icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};
type UserBadge = { id: string; awardedAt: string; badge: Badge };
type RecommendedCourse = {
  id: string; title: string; matchScore?: number; level?: string;
  instructor?: string; thumbnail?: string; category?: string;
};
type EnrolledCourse = {
  id: string; courseId: string; progress: number; lastLesson?: string;
  Course?: { id: string; title: string; level?: string | null; thumbnail?: string | null } | null;
};
type UpcomingEvent = {
  id: string; title: string; type: "live" | "quiz" | "booking" | "deadline";
  startsAt: string; courseTitle?: string;
};
type LeaderboardEntry = { rank: number; userId: string; name: string; score: number; badge: string };
type Announcement = { id: string; title: string; body: string; createdAt: string; type?: "info" | "warning" | "success" };

/* ─── SVG Icons ─────────────────────────────────────────────────────────── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = size;
  const icons: Record<string, React.ReactNode> = {
    book: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3V4z"/></svg>,
    pencil: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2l4 4-10 10H4v-4L14 2z"/></svg>,
    robot: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="12" height="9" rx="2"/><circle cx="7.5" cy="11.5" r="1" fill="currentColor"/><circle cx="12.5" cy="11.5" r="1" fill="currentColor"/><path d="M7 16v2M13 16v2"/><path d="M10 7V4M8 4h4"/></svg>,
    hash: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="16" y2="7"/><line x1="4" y1="13" x2="16" y2="13"/><line x1="7" y1="4" x2="6" y2="16"/><line x1="13" y1="4" x2="12" y2="16"/></svg>,
    monitor: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="16" height="11" rx="2"/><path d="M7 18h6M10 14v4"/></svg>,
    calendar: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="14" rx="2"/><path d="M3 9h14M7 2v4M13 2v4"/></svg>,
    flame: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2c0 4-4 5-4 9a4 4 0 008 0c0-4-4-5-4-9z"/><path d="M10 14a2 2 0 100-4 2 2 0 000 4z" fill="currentColor" stroke="none"/></svg>,
    heart: <svg width={s} height={s} viewBox="0 0 20 20" fill="currentColor" stroke="none"><path d="M10 17s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z"/></svg>,
    coin: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v1M10 13v1M7 10h6"/></svg>,
    bolt: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z"/></svg>,
    trophy: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8v7a4 4 0 01-8 0V3z"/><path d="M4 3H2v3a3 3 0 003 3M16 3h2v3a3 3 0 01-3 3"/><path d="M10 14v3M7 17h6"/></svg>,
    star: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="10,2 12.2,7.5 18,8.2 13.7,12 15.1,18 10,15 4.9,18 6.3,12 2,8.2 7.8,7.5"/></svg>,
    signal: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15a9 9 0 0112 0"/><path d="M6.5 12.5a6 6 0 017 0"/><path d="M9 10a3 3 0 012 0"/><circle cx="10" cy="17" r="1" fill="currentColor"/></svg>,
    clock: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></svg>,
    check: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8"/></svg>,
    megaphone: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h2v4H3V8z"/><path d="M5 8l9-4v12L5 12V8z"/><path d="M7 12l2 5"/></svg>,
    arrow_right: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M12 6l4 4-4 4"/></svg>,
    user: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4"/><path d="M3 18a7 7 0 0114 0"/></svg>,
    info: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="9" x2="10" y2="14"/><circle cx="10" cy="6.5" r="0.5" fill="currentColor"/></svg>,
    alert: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L2 17h16L10 3z"/><line x1="10" y1="9" x2="10" y2="12"/><circle cx="10" cy="15" r="0.5" fill="currentColor"/></svg>,
    gem: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 18L2 8l2-4h12l2 4-8 10z"/><path d="M2 8h16M6 4l-2 4M14 4l2 4M10 18L6 8M10 18l4-10"/></svg>,
    crown: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 15h14M3 15l2-8 4 4 3-6 3 6 4-4-2 8H3z"/></svg>,
    medal: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="13" r="5"/><path d="M7 8L5 3h10l-2 5"/><path d="M10 10v3l2 2"/></svg>,
  };
  return <>{icons[name] ?? <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7"/></svg>}</>;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const XP_PER_LEVEL = 3000;

const LEAGUE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BRONZE:  { label: "Bronz",  color: "#b45309", icon: <Icon name="medal" size={16} /> },
  SILVER:  { label: "Gümüş",  color: "var(--muted)", icon: <Icon name="medal" size={16} /> },
  GOLD:    { label: "Altın",  color: "#d97706", icon: <Icon name="trophy" size={16} /> },
  DIAMOND: { label: "Elmas",  color: "var(--accent)", icon: <Icon name="gem" size={16} /> },
  MASTER:  { label: "Usta",   color: "var(--accent-2)", icon: <Icon name="crown" size={16} /> },
};

const RARITY_CONFIG: Record<string, { border: string; color: string; label: string }> = {
  COMMON:    { border: "var(--line)",    color: "var(--muted)",     label: "Yaygın"   },
  RARE:      { border: "rgba(59,130,246,0.5)", color: "#3b82f6",   label: "Nadir"    },
  EPIC:      { border: "rgba(139,92,246,0.5)", color: "#8b5cf6",   label: "Epik"     },
  LEGENDARY: { border: "rgba(245,158,11,0.5)", color: "#f59e0b",   label: "Efsanevi" },
};

const QUICK_ACTIONS = [
  { label: "Derslerim",  icon: "book",    href: "/my-courses",    color: "#22c55e" },
  { label: "Sınavlar",   icon: "pencil",  href: "/exams/adaptive", color: "var(--accent)" },
  { label: "AI Mentor",  icon: "robot",   href: "/ai",            color: "var(--accent-2)" },
  { label: "Math Lab",   icon: "hash",    href: "/math-lab",      color: "#f59e0b" },
  { label: "Whiteboard", icon: "monitor", href: "/whiteboard",    color: "var(--accent-3)" },
  { label: "Takvim",     icon: "calendar",href: "/calendar",      color: "#ec4899" },
];

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const DEMO_PROFILE: UserProfile = { id: "demo", email: "demo@atlasio.com", name: "Öğrenci", role: "STUDENT" };
const DEMO_GAMIFICATION: GamificationStats = {
  xp: 2847, streak: 12, hearts: 4, coins: 320, league: "GOLD",
  badges: [
    { id: "1", awardedAt: "2025-03-10T12:00:00Z", badge: { id: "b1", name: "İlk Adım",       description: "İlk dersini tamamladın",    icon: "🚀", rarity: "COMMON"    } },
    { id: "2", awardedAt: "2025-03-15T09:00:00Z", badge: { id: "b2", name: "Seri Avcısı",    description: "7 gün kesintisiz çalıştın", icon: "🔥", rarity: "RARE"      } },
    { id: "3", awardedAt: "2025-03-20T18:00:00Z", badge: { id: "b3", name: "Yıldız Öğrenci", description: "5 kursu bitirdin",          icon: "⭐", rarity: "EPIC"      } },
  ],
};
const DEMO_LAST_COURSE: EnrolledCourse = {
  id: "e1", courseId: "c1", progress: 67,
  lastLesson: "Modül 4 – Veri Görselleştirme",
  Course: { id: "c1", title: "Python ile Veri Bilimi", level: "Orta", thumbnail: null },
};
const DEMO_RECOMMENDATIONS: RecommendedCourse[] = [
  { id: "r1", title: "React ile Modern Web Geliştirme", matchScore: 97, level: "Orta",       instructor: "Elif Yılmaz",  category: "Web"   },
  { id: "r2", title: "Makine Öğrenmesi Temelleri",      matchScore: 94, level: "Başlangıç",  instructor: "Ahmet Demir", category: "AI/ML" },
  { id: "r3", title: "SQL ve Veritabanı Tasarımı",      matchScore: 89, level: "Başlangıç",  instructor: "Selin Arslan", category: "Veri" },
];
const DEMO_EVENTS: UpcomingEvent[] = [
  { id: "ev1", title: "Canlı Python Dersi",             type: "live",    startsAt: "2026-03-29T14:00:00Z", courseTitle: "Python ile Veri Bilimi" },
  { id: "ev2", title: "Haftalık Quiz Teslimi",          type: "quiz",    startsAt: "2026-03-30T23:59:00Z", courseTitle: "Makine Öğrenmesi"       },
  { id: "ev3", title: "Mentor Görüşmesi – Ahmet Hoca",  type: "booking", startsAt: "2026-03-31T10:00:00Z"                                        },
];
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u1", name: "Zeynep Kaya",  score: 5420, badge: "🥇" },
  { rank: 2, userId: "u2", name: "Burak Şahin",  score: 5210, badge: "🥈" },
  { rank: 3, userId: "u3", name: "Nisan Çelik",  score: 4990, badge: "🥉" },
];
const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: "a1", title: "Yeni AI Mentor özellikleri yayında!", body: "Ghost Mentor artık kişiselleştirilmiş öğrenme yolları oluşturuyor. Hemen deneyin!", createdAt: "2026-03-27T10:00:00Z", type: "success" },
  { id: "a2", title: "Platform bakım duyurusu", body: "01 Nisan 02:00–04:00 (UTC+3) arasında kısa süreli bakım gerçekleştirilecektir.", createdAt: "2026-03-25T08:00:00Z", type: "warning" },
];
const DEMO_DAILY_GOALS = [
  { label: "5 ders izle",  current: 3, target: 5,  unit: "",    done: false },
  { label: "Quiz çöz",     current: 1, target: 1,  unit: "",    done: true  },
  { label: "30dk çalış",   current: 22, target: 30, unit: "dk", done: false },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getFirstName(name: string | null, email: string) {
  if (name?.trim()) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "İyi geceler"; if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler"; return "İyi akşamlar";
}
function getMotivationalSubtitle(streak: number) {
  const h = new Date().getHours();
  if (streak >= 30) return `${streak} günlük devam serisini koru!`;
  if (streak >= 7)  return `${streak} günlük seriin devam ediyor.`;
  if (h < 12) return "Sabah çalışması beyni zinde tutar.";
  if (h < 18) return "Öğleden sonra verimli bir çalışma seni bekliyor!";
  return "Akşam çalışmasıyla bir adım öne geç!";
}
function xpLevel(xp: number) {
  const level   = Math.floor(xp / XP_PER_LEVEL) + 1;
  const current = xp % XP_PER_LEVEL;
  const max     = XP_PER_LEVEL;
  const pct     = Math.round((current / max) * 100);
  return { level, current, max, pct };
}
function formatEventDate(iso: string) {
  const d = new Date(iso); const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 1) return `${days} gün sonra`;
  if (days === 1) return `Yarın ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  if (hrs > 0) return `${hrs}s ${mins}dk sonra`;
  if (mins > 0) return `${mins} dakika sonra`;
  return "Az önce başladı";
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; accent: string }> = {
  live:     { icon: <Icon name="signal" size={18} />,   accent: "#22c55e" },
  quiz:     { icon: <Icon name="pencil" size={18} />,   accent: "#f59e0b" },
  booking:  { icon: <Icon name="calendar" size={18} />, accent: "var(--accent-2)" },
  deadline: { icon: <Icon name="clock" size={18} />,    accent: "#ef4444" },
};

const ANNOUNCE_CONFIG: Record<string, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <Icon name="check" size={16} />,    accent: "#22c55e" },
  warning: { icon: <Icon name="alert" size={16} />,    accent: "#f59e0b" },
  info:    { icon: <Icon name="info" size={16} />,      accent: "var(--accent)" },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Skeleton({ h = 48, w = "100%" }: { h?: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w,
      borderRadius: "var(--r-lg)",
      background: "var(--line)",
      animation: "porPulse 1.5s ease-in-out infinite",
    }} />
  );
}

function XPBar({ xp, animate }: { xp: number; animate: boolean }) {
  const t = useI18n();
  const { level, current, max, pct } = xpLevel(xp);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
        <span>{t.tr("Seviye")} {level}</span>
        <span>{current.toLocaleString("tr-TR")} / {max.toLocaleString("tr-TR")} XP</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: "linear-gradient(90deg,var(--accent-2),var(--accent))",
          width: animate ? `${pct}%` : "0%",
          transition: "width 1s ease-out",
        }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        {t.tr("Sonraki seviyeye")} {(max - current).toLocaleString("tr-TR")} XP {t.tr("kaldı")}
      </div>
    </div>
  );
}

function HeartRow({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: "#ef4444", opacity: i < count ? 1 : 0.2, fontSize: 16 }}>
          <Icon name="heart" size={16} />
        </span>
      ))}
    </div>
  );
}

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#porPG)" strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
      <defs>
        <linearGradient id="porPG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function PortalPage() {
  const t = useI18n();
  const [mounted, setMounted] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetcher = useCallback((path: string) => api(path) as Promise<any>, []);

  const { data: profile } = useSWR<UserProfile>("/users/me", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: gamification, isLoading: gamLoading } = useSWR<GamificationStats>("/gamification/me", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: enrollments, isLoading: enrollLoading } = useSWR<EnrolledCourse[]>("/enrollments/me", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: recommendations, isLoading: recLoading } = useSWR<RecommendedCourse[]>("/recommendation/me", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: events, isLoading: eventsLoading } = useSWR<UpcomingEvent[]>("/schedule/me/upcoming", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: leaderboard, isLoading: lbLoading } = useSWR<LeaderboardEntry[]>("/leaderboard/top?limit=3", fetcher, { onError: () => {}, revalidateOnFocus: false });
  const { data: announcements, isLoading: annLoading } = useSWR<Announcement[]>("/announcements?limit=2", fetcher, { onError: () => {}, revalidateOnFocus: false });

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setXpAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  /* ── Resolved data ── */
  const user    = { ...DEMO_PROFILE, ...profile };
  const gam: GamificationStats = {
    xp:      gamification?.xp      ?? DEMO_GAMIFICATION.xp,
    streak:  gamification?.streak  ?? DEMO_GAMIFICATION.streak,
    hearts:  gamification?.hearts  ?? DEMO_GAMIFICATION.hearts,
    coins:   gamification?.coins   ?? DEMO_GAMIFICATION.coins,
    league:  gamification?.league  ?? DEMO_GAMIFICATION.league,
    badges:  gamification?.badges  ?? DEMO_GAMIFICATION.badges,
  };
  const lastCourse = enrollments?.[0] ?? DEMO_LAST_COURSE;
  const recs       = recommendations?.length ? recommendations.slice(0, 3) : DEMO_RECOMMENDATIONS;
  const upcomingEv = events?.length ? events.slice(0, 3) : DEMO_EVENTS;
  const topLb      = leaderboard?.length ? leaderboard.slice(0, 3) : DEMO_LEADERBOARD;
  const news       = announcements?.length ? announcements.slice(0, 2) : DEMO_ANNOUNCEMENTS;
  const badges     = (gam.badges?.length ? gam.badges : DEMO_GAMIFICATION.badges!).slice(-3);
  const league     = LEAGUE_CONFIG[gam.league] ?? LEAGUE_CONFIG.BRONZE;
  const firstName  = getFirstName(user.name, user.email);

  /* ── Shared card style ── */
  const card: React.CSSProperties = {
    borderRadius: "var(--r-xl)",
    background: "var(--panel)",
    border: "1.5px solid var(--line)",
    padding: 20,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @keyframes porPulse{0%,100%{opacity:1}50%{opacity:.4}}
        .por-grid-2{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:768px){.por-grid-2{grid-template-columns:1fr 1fr}}
        .por-grid-3{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:1024px){.por-grid-3{grid-template-columns:2fr 1fr}}
        .por-grid-rec{display:grid;gap:14px;grid-template-columns:1fr}
        @media(min-width:640px){.por-grid-rec{grid-template-columns:1fr 1fr}}
        @media(min-width:1024px){.por-grid-rec{grid-template-columns:1fr 1fr 1fr}}
        .por-grid-qa{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}
        @media(min-width:640px){.por-grid-qa{grid-template-columns:repeat(6,1fr)}}
        .por-grid-ann{display:grid;gap:14px;grid-template-columns:1fr}
        @media(min-width:640px){.por-grid-ann{grid-template-columns:1fr 1fr}}
        .por-grid-badges{display:grid;gap:14px;grid-template-columns:1fr}
        @media(min-width:640px){.por-grid-badges{grid-template-columns:1fr 1fr 1fr}}
        .rec-card:hover{border-color:color-mix(in srgb,var(--accent) 40%,var(--line))!important;box-shadow:var(--shadow-md)!important}
        .qa-link:hover .qa-icon{transform:scale(1.12)}
        .por-sec-link{font-size:12px;font-weight:700;color:var(--accent);text-decoration:none;transition:opacity var(--t-fast)}
        .por-sec-link:hover{opacity:0.75}
      `}</style>

      {/* ── 1. Hero ── */}
      <header style={{
        borderRadius: "var(--r-xl)",
        background: "linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 8%,var(--panel)),color-mix(in srgb,var(--accent) 6%,var(--panel)))",
        border: "1.5px solid color-mix(in srgb,var(--accent) 18%,var(--line))",
        padding: "28px 28px 24px",
        boxShadow: "var(--shadow-md)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative blob */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 240, height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle,color-mix(in srgb,var(--accent) 15%,transparent),transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Badges row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  { icon: league.icon, label: `${t.tr(league.label)} ${t.tr("Lig")}`, color: league.color },
                  { icon: <Icon name="flame" size={13} />, label: `${gam.streak} ${t.tr("günlük seri")}`, color: "#f97316" },
                  { icon: <Icon name="bolt" size={13} />, label: `${gam.xp.toLocaleString("tr-TR")} XP`, color: "var(--accent-2)" },
                ].map((b, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, padding: "3px 10px",
                    borderRadius: 99,
                    background: `color-mix(in srgb,${b.color} 12%,var(--panel))`,
                    border: `1px solid color-mix(in srgb,${b.color} 28%,var(--line))`,
                    color: b.color,
                  }}>
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                {t.tr(getGreeting())},{" "}
                <span style={{ background: "linear-gradient(90deg,var(--accent-2),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {firstName}!
                </span>
              </h1>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>{t.tr(getMotivationalSubtitle(gam.streak))}</p>
            </div>

            {/* Coin + Hearts */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#d97706" }}>
                  <Icon name="coin" size={16} />
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{gam.coins}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>Coin</span>
              </div>
              <div style={{ width: 1, height: 36, background: "var(--line)" }} />
              <HeartRow count={gam.hearts} />
            </div>
          </div>

          {/* XP bar */}
          {gamLoading
            ? <Skeleton h={36} />
            : <XPBar xp={gam.xp} animate={xpAnimated} />}
        </div>
      </header>

      {/* ── 2+3. Continue + Daily Goals ── */}
      <div className="por-grid-2">
        {/* Continue */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
              {t.tr("Kaldığın Yerden Devam Et")}
            </span>
            <Link href="/my-courses" className="por-sec-link">{t.tr("Tüm dersler →")}</Link>
          </div>
          {enrollLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton h={64} /><Skeleton h={16} w="75%" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: "var(--r-lg)",
                    background: "color-mix(in srgb,#22c55e 12%,var(--panel))",
                    border: "1.5px solid rgba(34,197,94,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#22c55e",
                  }}>
                    <Icon name="book" size={28} />
                  </div>
                  <div style={{ position: "absolute", bottom: -4, right: -4 }}>
                    <ProgressRing pct={lastCourse.progress} size={26} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, marginBottom: 6 }}>
                    {lastCourse.Course?.title ?? t.tr("Kurs")}
                  </div>
                  {lastCourse.Course?.level && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: "var(--line)", color: "var(--muted)",
                    }}>
                      {lastCourse.Course.level}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-2)", flexShrink: 0 }}>
                  {lastCourse.progress}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ height: 8, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    background: "linear-gradient(90deg,#22c55e,#10b981)",
                    width: `${lastCourse.progress}%`,
                    transition: "width 0.7s ease",
                  }} />
                </div>
                {lastCourse.lastLesson && (
                  <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.tr("Son")}: {lastCourse.lastLesson}
                  </div>
                )}
              </div>

              <Link href={`/my-courses/${lastCourse.courseId ?? lastCourse.Course?.id ?? ""}`} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 16px", borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg,#22c55e,#10b981)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                textDecoration: "none", boxShadow: "0 2px 12px rgba(34,197,94,0.25)",
              }}>
                {t.tr("Devam Et")} <Icon name="arrow_right" size={16} />
              </Link>
            </div>
          )}
        </div>

        {/* Daily goals */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
              {t.tr("Bugünkü Hedefler")}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: "color-mix(in srgb,var(--accent-2) 12%,var(--panel))",
              border: "1px solid color-mix(in srgb,var(--accent-2) 25%,var(--line))",
              color: "var(--accent-2)",
            }}>
              {DEMO_DAILY_GOALS.filter((g) => g.done).length}/{DEMO_DAILY_GOALS.length} {t.tr("tamamlandı")}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEMO_DAILY_GOALS.map((goal) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={t.tr(goal.label)} style={{
                  borderRadius: "var(--r-lg)",
                  border: goal.done ? "1.5px solid rgba(34,197,94,0.3)" : "1.5px solid var(--line)",
                  background: goal.done ? "color-mix(in srgb,#22c55e 6%,var(--panel))" : "transparent",
                  padding: "10px 12px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "var(--r-sm)",
                    background: goal.done ? "rgba(34,197,94,0.15)" : "var(--line)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: goal.done ? "#22c55e" : "var(--muted)",
                    flexShrink: 0,
                  }}>
                    {goal.done ? <Icon name="check" size={14} /> : <Icon name="bolt" size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 5 }}>
                      <span>{t.tr(goal.label)}</span>
                      <span style={{ color: goal.done ? "#22c55e" : "var(--muted)", fontSize: 11 }}>
                        {goal.done ? t.tr("Tamam") : `${goal.current}/${goal.target}${goal.unit}`}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 99, width: `${pct}%`,
                        background: goal.done
                          ? "#22c55e"
                          : "linear-gradient(90deg,var(--accent-2),var(--accent))",
                        transition: "width 0.7s ease",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Gamification bar ── */}
      <div style={{
        ...card,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 20,
        padding: "16px 22px",
      }}>
        {[
          { icon: <Icon name="flame" size={22} />, value: String(gam.streak), label: "günlük seri", color: "#f97316" },
          null,
          { icon: <Icon name="bolt" size={22} />, value: gam.xp.toLocaleString("tr-TR"), label: "Toplam XP", color: "var(--accent-2)" },
          null,
          { icon: <Icon name="coin" size={22} />, value: gam.coins.toLocaleString("tr-TR"), label: "Coin", color: "#d97706" },
          null,
        ].map((item, i) => {
          if (item === null) return <div key={i} style={{ width: 1, height: 36, background: "var(--line)", flexShrink: 0 }} />;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: item.color }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{t.tr(item.label)}</div>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HeartRow count={gam.hearts} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: league.color }}>{league.icon}</span>
          <div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{t.tr("Lig")}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: league.color }}>{t.tr(league.label)}</div>
          </div>
        </div>
      </div>

      {/* ── 5. Recommended Courses ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
            <Icon name="robot" size={14} /> {t.tr("AI Önerileri")}
          </div>
          <Link href="/courses" className="por-sec-link">{t.tr("Tüm kurslar →")}</Link>
        </div>
        <div className="por-grid-rec">
          {recLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={140} />)
            : recs.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="rec-card" style={{
                borderRadius: "var(--r-xl)",
                background: "var(--panel)",
                border: "1.5px solid var(--line)",
                padding: 18,
                display: "flex", flexDirection: "column", gap: 12,
                textDecoration: "none",
                transition: "all var(--t-fast)",
                boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "var(--r-lg)", flexShrink: 0,
                    background: "color-mix(in srgb,var(--accent) 10%,var(--panel))",
                    border: "1.5px solid color-mix(in srgb,var(--accent) 20%,var(--line))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--accent)",
                  }}>
                    <Icon name="book" size={20} />
                  </div>
                  {course.matchScore && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, flexShrink: 0,
                      background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#16a34a",
                    }}>
                      %{course.matchScore}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, marginBottom: 4 }}>{t.tr(course.title)}</div>
                  {course.instructor && <div style={{ fontSize: 11, color: "var(--muted)" }}>{course.instructor}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                  {course.level && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "var(--line)", color: "var(--muted)" }}>{course.level}</span>
                  )}
                  {course.category && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "color-mix(in srgb,var(--accent) 10%,var(--panel))", color: "var(--accent)" }}>{t.tr(course.category)}</span>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ── 6+9. Events + Leaderboard ── */}
      <div className="por-grid-3">
        {/* Events */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>{t.tr("Yaklaşan Etkinlikler")}</span>
            <Link href="/calendar" className="por-sec-link">{t.tr("Takvimi aç →")}</Link>
          </div>
          {eventsLoading
            ? [1, 2, 3].map((i) => <Skeleton key={i} h={56} />)
            : upcomingEv.map((ev) => {
                const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.deadline;
                return (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    borderRadius: "var(--r-lg)", padding: "12px 14px",
                    border: `1.5px solid color-mix(in srgb,${cfg.accent} 25%,var(--line))`,
                    background: `color-mix(in srgb,${cfg.accent} 6%,var(--panel))`,
                  }}>
                    <span style={{ color: cfg.accent, flexShrink: 0 }}>{cfg.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tr(ev.title)}</div>
                      {ev.courseTitle && (
                        <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.courseTitle}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: cfg.accent, flexShrink: 0 }}>{t.tr(formatEventDate(ev.startsAt))}</div>
                  </div>
                );
              })}
        </div>

        {/* Leaderboard */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>{t.tr("Liderler")}</span>
            <Link href="/leaderboard" className="por-sec-link">{t.tr("Tümü →")}</Link>
          </div>
          {lbLoading
            ? [1, 2, 3].map((i) => <Skeleton key={i} h={48} />)
            : <>
                {topLb.map((entry) => (
                  <div key={entry.userId} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: "var(--r-lg)",
                    border: entry.rank === 1 ? "1.5px solid rgba(245,158,11,0.3)" : "1.5px solid var(--line)",
                    background: entry.rank === 1 ? "color-mix(in srgb,#f59e0b 6%,var(--panel))" : "var(--panel)",
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{entry.badge}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tr(entry.name)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{entry.score.toLocaleString("tr-TR")} XP</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>#{entry.rank}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: "var(--r-lg)",
                    border: "1.5px solid color-mix(in srgb,var(--accent-2) 30%,var(--line))",
                    background: "color-mix(in srgb,var(--accent-2) 6%,var(--panel))",
                  }}>
                    <span style={{ color: "var(--accent-2)", flexShrink: 0 }}><Icon name="user" size={20} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2)" }}>{firstName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{gam.xp.toLocaleString("tr-TR")} XP</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-2)" }}>{t.tr("Senin sıran")}</span>
                  </div>
                </div>
              </>}
        </div>
      </div>

      {/* ── 7. Badges ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
            <Icon name="medal" size={14} /> {t.tr("Son Kazanılan Rozetler")}
          </div>
          <Link href="/profile" className="por-sec-link">{t.tr("Tüm rozetler →")}</Link>
        </div>
        <div className="por-grid-badges">
          {badges.map((ub) => {
            const rarity = RARITY_CONFIG[ub.badge.rarity] ?? RARITY_CONFIG.COMMON;
            return (
              <div key={ub.id} style={{
                borderRadius: "var(--r-xl)",
                background: "var(--panel)",
                border: `1.5px solid ${rarity.border}`,
                padding: "18px 20px",
                display: "flex", alignItems: "center", gap: 14,
                boxShadow: `0 0 16px ${rarity.border}`,
                transition: "transform var(--t-fast)",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "var(--r-lg)", flexShrink: 0,
                  border: `1.5px solid ${rarity.border}`,
                  background: "var(--panel)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                }}>
                  {ub.badge.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{t.tr(ub.badge.name)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{t.tr(ub.badge.description)}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                    background: `color-mix(in srgb,${rarity.color} 12%,var(--panel))`,
                    border: `1px solid ${rarity.border}`,
                    color: rarity.color,
                  }}>
                    {t.tr(rarity.label)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. Quick actions ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>{t.tr("Hızlı Erişim")}</span>
        <div className="por-grid-qa">
          {QUICK_ACTIONS.map((action) => (
            <Link key={t.tr(action.label)} href={action.href} className="qa-link" style={{
              borderRadius: "var(--r-xl)",
              background: "var(--panel)",
              border: "1.5px solid var(--line)",
              padding: "16px 12px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              textDecoration: "none",
              transition: "all var(--t-fast)",
            }}>
              <div className="qa-icon" style={{
                width: 40, height: 40, borderRadius: "var(--r-md)",
                background: `color-mix(in srgb,${action.color} 12%,var(--panel))`,
                border: `1.5px solid color-mix(in srgb,${action.color} 25%,var(--line))`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: action.color,
                transition: "transform var(--t-fast)",
              }}>
                <Icon name={action.icon} size={20} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textAlign: "center", lineHeight: 1.2 }}>{t.tr(action.label)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 10. Announcements ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>
            <Icon name="megaphone" size={14} /> {t.tr("Duyurular")}
          </div>
          <Link href="/notifications" className="por-sec-link">{t.tr("Tümü →")}</Link>
        </div>
        <div className="por-grid-ann">
          {annLoading
            ? [1, 2].map((i) => <Skeleton key={i} h={96} />)
            : news.map((item) => {
                const cfg = ANNOUNCE_CONFIG[item.type ?? "info"];
                return (
                  <div key={item.id} style={{
                    borderRadius: "var(--r-xl)",
                    border: `1.5px solid color-mix(in srgb,${cfg.accent} 25%,var(--line))`,
                    background: `color-mix(in srgb,${cfg.accent} 6%,var(--panel))`,
                    padding: "18px 20px",
                    display: "flex", gap: 14,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "var(--r-md)", flexShrink: 0,
                      background: `color-mix(in srgb,${cfg.accent} 15%,var(--panel))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: cfg.accent,
                      marginTop: 2,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 5 }}>{t.tr(item.title)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>{t.tr(item.body)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", opacity: 0.7 }}>
                        {new Date(item.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

    </main>
  );
}
