"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { api } from "../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type GamificationStats = {
  xp: number;
  streak: number;
  hearts: number;
  coins: number;
  league: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "MASTER";
  badges?: UserBadge[];
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
};

type UserBadge = {
  id: string;
  awardedAt: string;
  badge: Badge;
};

type RecommendedCourse = {
  id: string;
  title: string;
  matchScore?: number;
  level?: string;
  instructor?: string;
  thumbnail?: string;
  category?: string;
};

type EnrolledCourse = {
  id: string;
  courseId: string;
  progress: number;
  lastLesson?: string;
  Course?: {
    id: string;
    title: string;
    level?: string | null;
    thumbnail?: string | null;
  } | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  type: "live" | "quiz" | "booking" | "deadline";
  startsAt: string;
  courseTitle?: string;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  badge: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  type?: "info" | "warning" | "success";
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

const XP_PER_LEVEL = 3000;

const LEAGUE_STYLES: Record<string, { label: string; pill: string; icon: string }> = {
  BRONZE:  { label: "Bronz",  pill: "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400",  icon: "🥉" },
  SILVER:  { label: "Gümüş",  pill: "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-300",      icon: "🥈" },
  GOLD:    { label: "Altın",  pill: "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400", icon: "🥇" },
  DIAMOND: { label: "Elmas",  pill: "bg-cyan-50 border-cyan-300 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-600 dark:text-cyan-400",            icon: "💎" },
  MASTER:  { label: "Usta",   pill: "bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/30 dark:border-violet-600 dark:text-violet-400", icon: "👑" },
};

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string }> = {
  COMMON:    { border: "border-slate-300 dark:border-slate-600",   glow: "",                              label: "Yaygın"    },
  RARE:      { border: "border-blue-400",                           glow: "shadow-blue-400/30",            label: "Nadir"     },
  EPIC:      { border: "border-purple-400",                         glow: "shadow-purple-400/30",          label: "Epik"      },
  LEGENDARY: { border: "border-yellow-400",                         glow: "shadow-yellow-400/40",          label: "Efsanevi"  },
};

const QUICK_ACTIONS = [
  { label: "Derslerim",  icon: "📚", href: "/my-courses",   color: "from-emerald-500 to-teal-500"     },
  { label: "Sınavlar",   icon: "📝", href: "/exams/adaptive", color: "from-blue-500 to-indigo-500"   },
  { label: "AI Mentor",  icon: "🤖", href: "/ai",           color: "from-violet-500 to-purple-500"   },
  { label: "Math Lab",   icon: "🔢", href: "/math-lab",     color: "from-orange-500 to-amber-500"    },
  { label: "Whiteboard", icon: "🖥️", href: "/whiteboard",   color: "from-cyan-500 to-sky-500"        },
  { label: "Takvim",     icon: "📅", href: "/calendar",     color: "from-pink-500 to-rose-500"       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Fallback / demo data
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_PROFILE: UserProfile = {
  id: "demo",
  email: "demo@atlasio.com",
  name: "Öğrenci",
  role: "STUDENT",
};

const DEMO_GAMIFICATION: GamificationStats = {
  xp: 2847,
  streak: 12,
  hearts: 4,
  coins: 320,
  league: "GOLD",
  badges: [
    { id: "1", awardedAt: "2025-03-10T12:00:00Z", badge: { id: "b1", name: "İlk Adım",      description: "İlk dersini tamamladın",    icon: "🚀", rarity: "COMMON"    } },
    { id: "2", awardedAt: "2025-03-15T09:00:00Z", badge: { id: "b2", name: "Seri Avcısı",   description: "7 gün kesintisiz çalıştın", icon: "🔥", rarity: "RARE"      } },
    { id: "3", awardedAt: "2025-03-20T18:00:00Z", badge: { id: "b3", name: "Yıldız Öğrenci",description: "5 kursu bitirdin",          icon: "⭐", rarity: "EPIC"      } },
  ],
};

const DEMO_LAST_COURSE: EnrolledCourse = {
  id: "e1",
  courseId: "c1",
  progress: 67,
  lastLesson: "Modül 4 – Veri Görselleştirme",
  Course: { id: "c1", title: "Python ile Veri Bilimi", level: "Orta", thumbnail: null },
};

const DEMO_RECOMMENDATIONS: RecommendedCourse[] = [
  { id: "r1", title: "React ile Modern Web Geliştirme", matchScore: 97, level: "Orta",   instructor: "Elif Yılmaz",    category: "Web"        },
  { id: "r2", title: "Makine Öğrenmesi Temelleri",      matchScore: 94, level: "Başlangıç", instructor: "Ahmet Demir", category: "AI/ML"      },
  { id: "r3", title: "SQL ve Veritabanı Tasarımı",      matchScore: 89, level: "Başlangıç", instructor: "Selin Arslan", category: "Veri"      },
];

const DEMO_EVENTS: UpcomingEvent[] = [
  { id: "ev1", title: "Canlı Python Dersi",             type: "live",    startsAt: "2026-03-29T14:00:00Z", courseTitle: "Python ile Veri Bilimi"         },
  { id: "ev2", title: "Haftalık Quiz Teslimi",          type: "quiz",    startsAt: "2026-03-30T23:59:00Z", courseTitle: "Makine Öğrenmesi"               },
  { id: "ev3", title: "Mentor Görüşmesi – Ahmet Hoca",  type: "booking", startsAt: "2026-03-31T10:00:00Z"                                                },
];

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "u1", name: "Zeynep Kaya",   score: 5420, badge: "🥇" },
  { rank: 2, userId: "u2", name: "Burak Şahin",   score: 5210, badge: "🥈" },
  { rank: 3, userId: "u3", name: "Nisan Çelik",   score: 4990, badge: "🥉" },
];

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    title: "Yeni AI Mentor özellikleri yayında! 🤖",
    body:  "Ghost Mentor artık kişiselleştirilmiş öğrenme yolları oluşturuyor. Hemen deneyin!",
    createdAt: "2026-03-27T10:00:00Z",
    type: "success",
  },
  {
    id: "a2",
    title: "Platform bakım duyurusu",
    body:  "01 Nisan 02:00–04:00 (UTC+3) arasında kısa süreli bakım gerçekleştirilecektir.",
    createdAt: "2026-03-25T08:00:00Z",
    type: "warning",
  },
];

const DEMO_DAILY_GOALS = [
  { label: "5 ders izle",  current: 3, target: 5,  unit: "",    icon: "🎬", done: false },
  { label: "Quiz çöz",     current: 1, target: 1,  unit: "",    icon: "🧩", done: true  },
  { label: "30dk çalış",   current: 22, target: 30, unit: "dk", icon: "⏱️", done: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getFirstName(name: string | null, email: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

function getMotivationalSubtitle(streak: number): string {
  const h = new Date().getHours();
  if (streak >= 30) return `${streak} günlük devam serisini koru! Efsane oluyorsun. 🏆`;
  if (streak >= 7)  return `${streak} günlük seriin devam ediyor. Harika gidiyorsun! 🔥`;
  if (h < 12)       return "Sabah çalışması beyni zinde tutar. Hadi başlayalım! ☀️";
  if (h < 18)       return "Öğleden sonra verimli bir çalışma seni bekliyor! 💪";
  return "Akşam çalışmasıyla bir adım öne geç! 🌙";
}

function xpLevel(xp: number): { level: number; current: number; max: number; pct: number } {
  const level   = Math.floor(xp / XP_PER_LEVEL) + 1;
  const current = xp % XP_PER_LEVEL;
  const max     = XP_PER_LEVEL;
  const pct     = Math.round((current / max) * 100);
  return { level, current, max, pct };
}

function formatEventDate(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (days > 1) return `${days} gün sonra`;
  if (days === 1) return `Yarın ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  if (hrs > 0)  return `${hrs}s ${mins}dk sonra`;
  if (mins > 0) return `${mins} dakika sonra`;
  return "Az önce başladı";
}

function eventTypeStyle(type: UpcomingEvent["type"]): { icon: string; pill: string } {
  const map = {
    live:     { icon: "📡", pill: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400" },
    quiz:     { icon: "📝", pill: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400" },
    booking:  { icon: "📅", pill: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-400" },
    deadline: { icon: "⏰", pill: "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400" },
  };
  return map[type] ?? map.deadline;
}

function announcementStyle(type?: Announcement["type"]): { border: string; icon: string; bg: string } {
  const map = {
    success: { border: "border-emerald-200 dark:border-emerald-700", icon: "✅", bg: "bg-emerald-50/60 dark:bg-emerald-900/20" },
    warning: { border: "border-amber-200 dark:border-amber-700",     icon: "⚠️",  bg: "bg-amber-50/60 dark:bg-amber-900/20"   },
    info:    { border: "border-blue-200 dark:border-blue-700",        icon: "ℹ️",  bg: "bg-blue-50/60 dark:bg-blue-900/20"     },
  };
  return map[type ?? "info"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl animate-pulse ${className ?? ""}`} />;
}

function XPBar({ xp, animate }: { xp: number; animate: boolean }) {
  const { level, current, max, pct } = xpLevel(xp);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500 dark:text-slate-400">Seviye {level}</span>
        <span className="text-slate-400 dark:text-slate-500">{current.toLocaleString("tr-TR")} / {max.toLocaleString("tr-TR")} XP</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000 ease-out"
          style={{ width: animate ? `${pct}%` : "0%" }}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">Sonraki seviyeye {(max - current).toLocaleString("tr-TR")} XP kaldı</p>
    </div>
  );
}

function HeartRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-base transition-opacity ${i < count ? "opacity-100" : "opacity-20"}`}>❤️</span>
      ))}
    </div>
  );
}

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r  = (size - 8) / 2;
  const c  = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-slate-200 dark:text-slate-700" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#pg)" strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const [mounted, setMounted] = useState(false);
  const [xpAnimated, setXpAnimated] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetcher = useCallback((path: string) => api(path), []);

  const { data: profile, isLoading: profileLoading } = useSWR<UserProfile>(
    "/users/me",
    fetcher,
    { onError: () => {/* silently fall back to demo */ }, revalidateOnFocus: false }
  );

  const { data: gamification, isLoading: gamLoading } = useSWR<GamificationStats>(
    "/gamification/me",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  const { data: enrollments, isLoading: enrollLoading } = useSWR<EnrolledCourse[]>(
    "/enrollments/me",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  const { data: recommendations, isLoading: recLoading } = useSWR<RecommendedCourse[]>(
    "/recommendation/me",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  const { data: events, isLoading: eventsLoading } = useSWR<UpcomingEvent[]>(
    "/schedule/me/upcoming",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  const { data: leaderboard, isLoading: lbLoading } = useSWR<LeaderboardEntry[]>(
    "/leaderboard/top?limit=3",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  const { data: announcements, isLoading: annLoading } = useSWR<Announcement[]>(
    "/announcements?limit=2",
    fetcher,
    { onError: () => {}, revalidateOnFocus: false }
  );

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setXpAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  // ── Resolved data (API or demo fallback) ──────────────────────────────────

  const user: UserProfile = {
    id:            profile?.id            ?? DEMO_PROFILE.id,
    email:         profile?.email         ?? DEMO_PROFILE.email,
    name:          profile?.name          ?? DEMO_PROFILE.name,
    role:          profile?.role          ?? DEMO_PROFILE.role,
  };
  const gam: GamificationStats = {
    xp:      gamification?.xp      ?? DEMO_GAMIFICATION.xp,
    streak:  gamification?.streak  ?? DEMO_GAMIFICATION.streak,
    hearts:  gamification?.hearts  ?? DEMO_GAMIFICATION.hearts,
    coins:   gamification?.coins   ?? DEMO_GAMIFICATION.coins,
    league:  gamification?.league  ?? DEMO_GAMIFICATION.league,
    badges:  gamification?.badges  ?? DEMO_GAMIFICATION.badges,
  };
  const lastCourse = enrollments?.[0] ?? DEMO_LAST_COURSE;
  const recs       = (recommendations && recommendations.length > 0) ? recommendations.slice(0, 3) : DEMO_RECOMMENDATIONS;
  const upcomingEv = (events && events.length > 0) ? events.slice(0, 3) : DEMO_EVENTS;
  const topLb      = (leaderboard && leaderboard.length > 0)
    ? leaderboard.slice(0, 3).map(e => ({ ...e, score: e.score ?? 0 }))
    : DEMO_LEADERBOARD;
  const news       = (announcements && announcements.length > 0) ? announcements.slice(0, 2) : DEMO_ANNOUNCEMENTS;
  const badges     = (gam.badges && gam.badges.length > 0) ? gam.badges.slice(-3) : DEMO_GAMIFICATION.badges!.slice(-3);
  const league     = LEAGUE_STYLES[gam.league] ?? LEAGUE_STYLES.BRONZE;
  const firstName  = getFirstName(user.name, user.email);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen space-y-8 px-4 py-8 md:px-8 max-w-7xl mx-auto">

      {/* ── 1. Personalized Hero ─────────────────────────────────────────── */}
      <header className="hero glass rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-8 md:p-10 relative overflow-hidden animate-fade-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-cyan-500/8 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-violet-400/10 to-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="hero-content relative z-10 flex flex-col gap-6">
          {/* Top row: greeting + badges */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 stagger-1">
                <span className={`pill text-xs font-semibold border ${league.pill}`}>
                  {league.icon} {league.label} Lig
                </span>
                <span className="pill text-xs font-semibold bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400">
                  🔥 {gam.streak} günlük seri
                </span>
                <span className="pill text-xs font-semibold bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-400">
                  ⚡ {gam.xp.toLocaleString("tr-TR")} XP
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white stagger-2">
                {getGreeting()}, <span className="bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">{firstName}!</span> 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg leading-relaxed stagger-3 max-w-xl">
                {getMotivationalSubtitle(gam.streak)}
              </p>
            </div>

            {/* Gamification stat cluster */}
            <div className="flex items-center gap-4 shrink-0 stagger-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{gam.coins}</span>
                <span className="text-xs text-slate-400">💰 Coin</span>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
              <HeartRow count={gam.hearts} />
            </div>
          </div>

          {/* XP Progress Bar */}
          {gamLoading
            ? <SkeletonBlock className="h-10 w-full" />
            : <div className="stagger-4"><XPBar xp={gam.xp} animate={xpAnimated} /></div>
          }
        </div>
      </header>

      {/* ── 2 + 3. Continue + Daily Goals (side-by-side on md+) ──────────── */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* 2. Kaldığın Yerden Devam Et */}
        <section className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col gap-4 animate-fade-slide-up stagger-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Kaldığın Yerden Devam Et
            </h2>
            <Link href="/my-courses" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
              Tüm dersler →
            </Link>
          </div>

          {enrollLoading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                {/* Thumbnail / Progress Ring */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/20 flex items-center justify-center text-3xl border border-emerald-200/60 dark:border-emerald-700/40">
                    📚
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <ProgressRing pct={lastCourse.progress} size={28} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-2">
                    {lastCourse.Course?.title ?? "Kurs"}
                  </p>
                  {lastCourse.Course?.level && (
                    <span className="pill text-xs mt-1 inline-block bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {lastCourse.Course.level}
                    </span>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                    {lastCourse.progress}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                    style={{ width: `${lastCourse.progress}%` }}
                  />
                </div>
                {lastCourse.lastLesson && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    Son: {lastCourse.lastLesson}
                  </p>
                )}
              </div>

              <Link
                href={`/my-courses/${lastCourse.courseId ?? lastCourse.Course?.id ?? ""}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 transition-opacity shadow-md shadow-emerald-500/20"
              >
                Devam Et →
              </Link>
            </div>
          )}
        </section>

        {/* 3. Today's Goals */}
        <section className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col gap-4 animate-fade-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Bugünkü Hedefler
            </h2>
            <span className="pill text-xs font-semibold bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-400">
              {DEMO_DAILY_GOALS.filter((g) => g.done).length}/{DEMO_DAILY_GOALS.length} tamamlandı
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {DEMO_DAILY_GOALS.map((goal, i) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div
                  key={goal.label}
                  className={`rounded-xl border p-3.5 flex items-center gap-3 transition-all ${
                    goal.done
                      ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-700"
                  } stagger-${(i + 1) as 1 | 2 | 3 | 4}`}
                >
                  <span className="text-xl shrink-0">{goal.icon}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{goal.label}</span>
                      <span className={`text-xs font-bold ${goal.done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                        {goal.done ? "✓ Tamam" : `${goal.current}/${goal.target}${goal.unit}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          goal.done ? "bg-emerald-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── 4. Streak & Gamification Bar ────────────────────────────────── */}
      <section className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 animate-fade-slide-up stagger-1">
        <div className="flex flex-wrap items-center justify-between gap-6">

          {/* Streak */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="text-4xl" style={{ filter: "drop-shadow(0 0 8px rgba(251,146,60,0.6))" }}>🔥</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{gam.streak}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">günlük seri</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

          {/* Hearts */}
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Canlar</p>
              <HeartRow count={gam.hearts} />
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

          {/* XP metric */}
          <div className="metric text-center">
            <p className="text-2xl font-black text-violet-600 dark:text-violet-400 leading-none">
              {gam.xp.toLocaleString("tr-TR")}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">⚡ Toplam XP</p>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

          {/* Coins */}
          <div className="metric text-center">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {gam.coins.toLocaleString("tr-TR")}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">💰 Coin</p>
          </div>

          <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-700" />

          {/* League badge */}
          <div className="flex items-center gap-2">
            <span className="text-3xl">{league.icon}</span>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Lig</p>
              <span className={`pill text-xs font-semibold border ${league.pill}`}>{league.label}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Recommended Courses ──────────────────────────────────────── */}
      <section className="space-y-4 animate-fade-slide-up stagger-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            🤖 AI Önerileri
          </h2>
          <Link href="/courses" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
            Tüm kurslar →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recLoading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-36" />)
            : recs.map((course, i) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className={`glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-5 flex flex-col gap-3 hover:border-violet-400/60 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 group stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/20 to-blue-400/20 flex items-center justify-center text-xl border border-violet-200/40 dark:border-violet-700/30 shrink-0">
                    🎓
                  </div>
                  {course.matchScore && (
                    <span className="pill text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400 shrink-0">
                      %{course.matchScore} eşleşme
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                    {course.title}
                  </p>
                  {course.instructor && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{course.instructor}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  {course.level && (
                    <span className="pill text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {course.level}
                    </span>
                  )}
                  {course.category && (
                    <span className="pill text-xs bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                      {course.category}
                    </span>
                  )}
                </div>
              </Link>
            ))
          }
        </div>
      </section>

      {/* ── 6 + 9. Upcoming Events + Leaderboard Mini ───────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* 6. Upcoming Events (2/3 width) */}
        <section className="lg:col-span-2 glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col gap-4 animate-fade-slide-up stagger-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Yaklaşan Etkinlikler
            </h2>
            <Link href="/calendar" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
              Takvimi aç →
            </Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingEv.map((ev, i) => {
                const style = eventTypeStyle(ev.type);
                return (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-4 rounded-xl border p-4 ${style.pill} stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
                  >
                    <span className="text-2xl shrink-0">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug line-clamp-1">{ev.title}</p>
                      {ev.courseTitle && (
                        <p className="text-xs opacity-70 mt-0.5 truncate">{ev.courseTitle}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold opacity-80">{formatEventDate(ev.startsAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 9. Leaderboard mini (1/3 width) */}
        <section className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col gap-4 animate-fade-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Liderler
            </h2>
            <Link href="/leaderboard" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
              Tümü →
            </Link>
          </div>

          {lbLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topLb.map((entry, i) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 rounded-xl p-3 stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4} ${
                    entry.rank === 1
                      ? "bg-yellow-50/70 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                      : "border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  <span className="text-xl shrink-0">{entry.badge}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{entry.name}</p>
                    <p className="text-xs text-slate-400">{entry.score.toLocaleString("tr-TR")} XP</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">#{entry.rank}</span>
                </div>
              ))}

              {/* User's position separator */}
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                <div className="flex items-center gap-3 rounded-xl border border-violet-300/60 dark:border-violet-600/40 bg-violet-50/50 dark:bg-violet-900/10 p-3">
                  <span className="text-xl shrink-0">😊</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-400 truncate">{firstName}</p>
                    <p className="text-xs text-violet-400 dark:text-violet-500">{gam.xp.toLocaleString("tr-TR")} XP</p>
                  </div>
                  <span className="text-xs font-bold text-violet-500 dark:text-violet-400">Senin sıran</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── 7. Recent Achievements ──────────────────────────────────────── */}
      <section className="space-y-4 animate-fade-slide-up stagger-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Son Kazanılan Rozetler
          </h2>
          <Link href="/profile" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
            Tüm rozetler →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {badges.map((ub, i) => {
            const rarity = RARITY_STYLES[ub.badge.rarity] ?? RARITY_STYLES.COMMON;
            return (
              <div
                key={ub.id}
                className={`glass rounded-2xl border ${rarity.border} p-5 flex items-center gap-4 shadow-lg ${rarity.glow} hover:scale-[1.02] transition-all duration-200 stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
              >
                <div className={`w-14 h-14 rounded-2xl border ${rarity.border} flex items-center justify-center text-3xl shrink-0 bg-white/60 dark:bg-slate-800/60`}>
                  {ub.badge.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{ub.badge.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{ub.badge.description}</p>
                  <span className="pill text-xs mt-1.5 inline-block bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    {rarity.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. Quick Actions Grid ──────────────────────────────────────── */}
      <section className="space-y-4 animate-fade-slide-up stagger-4">
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Hızlı Erişim
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <Link
              key={action.label}
              href={action.href}
              className={`glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex flex-col items-center gap-2 hover:border-transparent hover:shadow-lg transition-all duration-200 group stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                {action.icon}
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 10. Announcements ──────────────────────────────────────────── */}
      <section className="space-y-4 animate-fade-slide-up stagger-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            📢 Duyurular
          </h2>
          <Link href="/notifications" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors">
            Tümü →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {annLoading
            ? [1, 2].map((i) => <SkeletonBlock key={i} className="h-24" />)
            : news.map((item, i) => {
              const style = announcementStyle(item.type);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border ${style.border} ${style.bg} p-5 flex gap-4 stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.body}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {new Date(item.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                </div>
              );
            })
          }
        </div>
      </section>

    </main>
  );
}
