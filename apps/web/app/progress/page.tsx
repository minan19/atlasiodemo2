'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PanelShell } from '../_components/panel-shell';
import { useI18n } from '../_i18n/use-i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Enrollment {
  id: string;
  courseId: string;
  courseName: string;
  progress: number;
  completedAt: string | null;
  startedAt: string;
  totalLessons: number;
  completedLessons: number;
  lastActivity: string;
}

interface UserBadge {
  Badge: {
    name: string;
    icon: string;
  };
}

interface Gamification {
  totalXp: number;
  currentStreak: number;
  hearts: number;
  league: string;
  longestStreak: number;
  UserBadge: UserBadge[];
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_ENROLLMENTS: Enrollment[] = [
  {
    id: 'e1',
    courseId: 'c1',
    courseName: 'Python ile Yapay Zeka Temelleri',
    progress: 12,
    completedAt: null,
    startedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    totalLessons: 42,
    completedLessons: 5,
    lastActivity: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'e2',
    courseId: 'c2',
    courseName: 'İleri Seviye JavaScript & TypeScript',
    progress: 45,
    completedAt: null,
    startedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    totalLessons: 38,
    completedLessons: 17,
    lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'e3',
    courseId: 'c3',
    courseName: 'React & Next.js ile Modern Web Geliştirme',
    progress: 78,
    completedAt: null,
    startedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    totalLessons: 55,
    completedLessons: 43,
    lastActivity: new Date(Date.now() - 86400000 / 2).toISOString(),
  },
  {
    id: 'e4',
    courseId: 'c4',
    courseName: 'Veri Bilimi ile Makine Öğrenmesi',
    progress: 100,
    completedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    startedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    totalLessons: 60,
    completedLessons: 60,
    lastActivity: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'e5',
    courseId: 'c5',
    courseName: 'SQL ve Veritabanı Yönetimi',
    progress: 100,
    completedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    startedAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    totalLessons: 30,
    completedLessons: 30,
    lastActivity: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

const DEMO_GAMIFICATION: Gamification = {
  totalXp: 4850,
  currentStreak: 7,
  hearts: 4,
  league: 'GOLD',
  longestStreak: 21,
  UserBadge: [
    { Badge: { name: 'İlk Adım', icon: '🚀' } },
    { Badge: { name: 'Hız Treni', icon: '⚡' } },
    { Badge: { name: 'Mükemmeliyetçi', icon: '🏆' } },
  ],
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

const navSections = [
  {
    title: 'Öğrenci',
    items: [
      { label: 'Ana Sayfa', href: '/leaderboard', icon: '🏠' },
      { label: 'Derslerim', href: '/courses', icon: '📚' },
      { label: 'İlerleme', href: '/progress', icon: '📊' },
      { label: 'Canlı Ders', href: '/live', icon: '📡' },
      { label: 'Bildirimler', href: '/notifications', icon: '🔔' },
      { label: 'Rezervasyon', href: '/booking', icon: '📅' },
    ],
  },
  {
    title: 'Takip & Gelişim',
    items: [
      { label: 'Akran Değerlendirmesi', href: '/peer-review', icon: '🤝' },
      { label: 'Sertifikalar', href: '/certificates', icon: '🏅' },
      { label: 'Raporlarım', href: '/report-cards', icon: '📈' },
      { label: 'Beceri Profilim', href: '/my-courses/skill-profile', icon: '🎯' },
      { label: 'Öğrenme Planım', href: '/learning-plans', icon: '🗺️' },
    ],
  },
  {
    title: 'AI Araçlar',
    items: [
      { label: 'Dil Laboratuvarı', href: '/language-lab', icon: '🎤' },
      { label: 'Matematik Çözücü', href: '/math-lab', icon: '📐' },
      { label: 'Adaptif Sınav', href: '/exams/adaptive', icon: '🎯' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return '1 gün önce';
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function progressColor(pct: number): string {
  if (pct < 30) return 'from-red-500 to-red-400';
  if (pct < 70) return 'from-amber-500 to-amber-400';
  return 'from-emerald-500 to-emerald-400';
}

function progressTextColor(pct: number): string {
  if (pct < 30) return 'text-red-500';
  if (pct < 70) return 'text-amber-500';
  return 'text-emerald-500';
}

function leagueMeta(league: string): { label: string; color: string; bg: string } {
  switch (league.toUpperCase()) {
    case 'BRONZE':
      return { label: 'Bronz', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'SILVER':
      return { label: 'Gümüş', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700/40' };
    case 'GOLD':
      return { label: 'Altın', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/30' };
    case 'PLATINUM':
      return { label: 'Platin', color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/30' };
    case 'DIAMOND':
      return { label: 'Elmas', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/30' };
    default:
      return { label: league, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-700/40' };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  icon,
  delay,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: string;
  delay: string;
}) {
  return (
    <div
      className={`glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm animate-fade-slide-up ${delay} flex flex-col gap-1`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className={`text-3xl font-extrabold ${accent} leading-none`}>{value}</div>
    </div>
  );
}

interface ProgressRingProps {
  completed: number;
  total: number;
}

function ProgressRing({ completed, total }: ProgressRingProps) {
  const t = useI18n();
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  let ringColor = '#ef4444'; // red
  if (pct >= 70) ringColor = '#10b981'; // emerald
  else if (pct >= 30) ringColor = '#f59e0b'; // amber

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative inline-flex items-center justify-center">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          {/* Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">
            {completed}/{total}
          </span>
          <span className="text-xs text-slate-400 font-medium mt-1">{t.tr("Kurs")}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color: ringColor }}>
          %{pct}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{t.tr("tamamlama oranı")}</div>
      </div>
    </div>
  );
}

function CourseCard({ enrollment }: { enrollment: Enrollment }) {
  const t = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const isComplete = enrollment.completedAt !== null;

  return (
    <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title + date */}
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm sm:text-base">
              {enrollment.courseName}
            </h3>
            {isComplete && (
              <span className="pill-sm bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                {t.tr("✓ Tamamlandı")}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mb-3">
            {t.tr("Başlangıç")}: {formatDate(enrollment.startedAt)}
            {isComplete && enrollment.completedAt
              ? ` · ${t.tr("Tamamlandı")}: ${formatDate(enrollment.completedAt)}`
              : ''}
          </div>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor(enrollment.progress)} transition-all duration-700`}
              style={{ width: mounted ? `${enrollment.progress}%` : '0%' }}
            />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="pill-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {enrollment.completedLessons}/{enrollment.totalLessons} {t.tr("Ders")}
            </span>
            <span className={`font-semibold ${progressTextColor(enrollment.progress)}`}>
              %{enrollment.progress} {t.tr("tamamlandı")}
            </span>
            <span className="text-slate-400 ml-auto">
              {t.tr("Son aktivite")}: {relativeTime(enrollment.lastActivity)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex-shrink-0 self-center">
          {isComplete ? (
            <span className="pill bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
              {t.tr("✓ Bitti")}
            </span>
          ) : (
            <Link
              href={`/courses/${enrollment.courseId}`}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-semibold px-4 py-2 shadow-sm transition-all duration-150"
            >
              {t.tr("Devam Et →")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgesRow({ badges }: { badges: UserBadge[] }) {
  const t = useI18n();
  if (badges.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">{t.tr("Henüz rozet kazanılmadı.")}</p>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {badges.map((ub, i) => (
        <div
          key={i}
          className="group flex-shrink-0 flex flex-col items-center gap-2 relative"
          title={ub.Badge.name}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-3xl shadow-sm group-hover:scale-105 group-hover:shadow-md transition-transform duration-150 cursor-default">
            {ub.Badge.icon}
          </div>
          <span className="pill-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold max-w-[72px] truncate text-center">
            {ub.Badge.name}
          </span>
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-lg z-10">
            {ub.Badge.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function GamificationCard({ gami }: { gami: Gamification }) {
  const t = useI18n();
  const league = leagueMeta(gami.league);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* XP */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-1 shadow-sm">
        <span className="text-lg">⚡</span>
        <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 leading-none">
          {gami.totalXp.toLocaleString('tr-TR')}
        </span>
        <span className="text-xs text-slate-400 font-medium">{t.tr("Toplam XP")}</span>
      </div>
      {/* Streak */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-1 shadow-sm">
        <span className="text-lg">🔥</span>
        <span className="text-2xl font-extrabold text-amber-500 leading-none">
          {gami.currentStreak > 0 ? `${gami.currentStreak}` : '--'}
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {t.tr("Günlük Seri")}
          {gami.longestStreak > 0 && (
            <span className="block text-[10px] text-slate-300">{t.tr("En uzun")}: {gami.longestStreak} {t.tr("gün")}</span>
          )}
        </span>
      </div>
      {/* Hearts */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-1 shadow-sm">
        <span className="text-lg">❤️</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`text-lg ${i < gami.hearts ? 'opacity-100' : 'opacity-20'}`}>
              ❤️
            </span>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium">{t.tr("Canlar")}</span>
      </div>
      {/* League */}
      <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-1 shadow-sm">
        <span className="text-lg">🏅</span>
        <span className={`text-lg font-extrabold leading-none px-2 py-0.5 rounded-lg inline-block w-fit ${league.color} ${league.bg}`}>
          {t.tr(league.label)}
        </span>
        <span className="text-xs text-slate-400 font-medium">{t.tr("Lig")}</span>
      </div>
    </div>
  );
}

function WeeklyHeatmap({ enrollments }: { enrollments: Enrollment[] }) {
  const t = useI18n();
  const days = [t.tr('Pzt'), t.tr('Sal'), t.tr('Çar'), t.tr('Per'), t.tr('Cum'), t.tr('Cmt'), t.tr('Paz')];
  const today = new Date();
  // Build set of active days from last-activity dates
  const activeDayIndices = new Set<number>();
  enrollments.forEach((e) => {
    const actDate = new Date(e.lastActivity);
    const diffDays = Math.floor((today.getTime() - actDate.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      // Map to day index 0-6 (Mon-Sun)
      const dayOfWeek = actDate.getDay(); // 0=Sun..6=Sat
      const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // convert to Mon=0
      activeDayIndices.add(idx);
    }
  });

  return (
    <div className="flex items-end gap-2">
      {days.map((day, i) => {
        const active = activeDayIndices.has(i);
        return (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-xl transition-colors duration-300 ${
                active
                  ? 'bg-indigo-500 shadow-sm shadow-indigo-300 dark:shadow-indigo-900'
                  : 'bg-slate-800/30 dark:bg-slate-700/50'
              }`}
              title={active ? `${day}: ${t.tr("Aktif")}` : `${day}: ${t.tr("İnaktif")}`}
            />
            <span className="text-[10px] text-slate-400 font-medium">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

export default function ProgressPage() {
  const t = useI18n();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [gamification, setGamification] = useState<Gamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    async function load() {
      try {
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [enrollRes, gamiRes] = await Promise.all([
          fetch(`${API}/enrollments/me`, { headers }),
          fetch(`${API}/gamification/me`, { headers }),
        ]);

        if (!enrollRes.ok || !gamiRes.ok) throw new Error('API error');

        const [enrollData, gamiData] = await Promise.all([
          enrollRes.json() as Promise<Enrollment[]>,
          gamiRes.json() as Promise<Gamification>,
        ]);

        setEnrollments(enrollData);
        setGamification(gamiData);
      } catch {
        // Demo fallback
        setEnrollments(DEMO_ENROLLMENTS);
        setGamification(DEMO_GAMIFICATION);
      } finally {
        setLoading(false);
      }
    }

    // Attempt to read user name from token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.name) setUserName(payload.name);
        else if (payload.email) setUserName(payload.email.split('@')[0]);
      } catch {
        /* ignore */
      }
    }

    load();
  }, []);

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completedAt !== null).length;
  const totalXp = gamification?.totalXp ?? 0;
  const currentStreak = gamification?.currentStreak ?? 0;
  const badges = gamification?.UserBadge ?? [];

  return (
    <div className="page-shell">
      <div className="bg-canvas" />
      <div className="bg-grid" />

      <PanelShell
        roleLabel={t.tr("Öğrenci")}
        userName={userName}
        userSub={t.tr("İlerleme Takibi")}
        navSections={navSections}
      >
        {/* ── Hero ── */}
        <section className="hero rounded-3xl overflow-hidden animate-fade-slide-up">
          <div className="hero-content px-8 py-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">📊</span>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                  {t.progress.title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {t.progress.subtitle}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Top Stats ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label={t.progress.coursesInProgress}
              value={totalCourses}
              accent="text-indigo-600 dark:text-indigo-400"
              icon="📚"
              delay="stagger-1"
            />
            <StatCard
              label={t.progress.completedCourses}
              value={completedCourses}
              accent="text-emerald-600 dark:text-emerald-400"
              icon="✅"
              delay="stagger-2"
            />
            <StatCard
              label={t.progress.totalXP}
              value={totalXp.toLocaleString('tr-TR')}
              accent="text-violet-600 dark:text-violet-400"
              icon="⚡"
              delay="stagger-3"
            />
            <StatCard
              label={t.progress.currentStreak}
              value={currentStreak > 0 ? `${currentStreak}` : '--'}
              accent="text-amber-600 dark:text-amber-400"
              icon="🔥"
              delay="stagger-4"
            />
          </div>
        )}

        {/* ── Progress Ring + Heatmap ── */}
        {loading ? (
          <div className="skeleton h-64 rounded-3xl" />
        ) : (
          <div className="glass rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm animate-fade-slide-up stagger-2 grid sm:grid-cols-2 gap-8 items-center">
            {/* Ring */}
            <div className="flex flex-col items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                {t.tr("Genel Tamamlama")}
              </h2>
              <ProgressRing completed={completedCourses} total={totalCourses} />
            </div>

            {/* Heatmap */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
                {t.tr("Haftalık Aktivite")}
              </h2>
              <WeeklyHeatmap enrollments={enrollments} />
              <p className="text-xs text-slate-400 mt-3">
                {t.tr("Son 7 günlük aktivite gösterimi. Mavi kareler aktif günleri belirtir.")}
              </p>
            </div>
          </div>
        )}

        {/* ── Course List ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {t.tr("Kurs Detayları")}
            </h2>
            <Link
              href="/courses"
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {t.tr("Tüm Kurslar →")}
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-400">{t.tr("Henüz herhangi bir kursa kayıt yaptırmadınız.")}</p>
              <Link
                href="/courses"
                className="inline-block mt-4 px-5 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors"
              >
                {t.tr("Kursları Keşfet")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((e) => (
                <CourseCard key={e.id} enrollment={e} />
              ))}
            </div>
          )}
        </section>

        {/* ── Badges ── */}
        <section className="glass rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm animate-fade-slide-up stagger-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
            {t.tr("Rozetler")}
          </h2>
          {loading ? (
            <div className="flex gap-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="skeleton w-16 h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <BadgesRow badges={badges} />
          )}
        </section>

        {/* ── Gamification Card ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
            {t.tr("Oyunlaştırma")}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : gamification ? (
            <GamificationCard gami={gamification} />
          ) : null}
        </section>

        {/* ── Footer note ── */}
        <p className="text-[11px] text-center text-slate-300 dark:text-slate-600 pb-4">
          {t.tr("Veriler canlı API'dan çekiliyor — bağlantı yoksa demo verisi gösterilir.")}
        </p>
      </PanelShell>
    </div>
  );
}
