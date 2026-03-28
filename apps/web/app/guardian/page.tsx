"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { PanelShell } from "../_components/panel-shell";

/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
const navSections = [
  {
    title: "Veli",
    items: [
      { label: "Özet", href: "/guardian", icon: "👪" },
      { label: "Ödevler", href: "/leaderboard", icon: "📝" },
      { label: "Takvim", href: "/booking", icon: "🗓️" },
      { label: "Raporlar", href: "/report-cards", icon: "📈" },
    ],
  },
  {
    title: "İletişim",
    items: [
      { label: "Eğitmenler", href: "/instructor", icon: "👩‍🏫" },
      { label: "Destek", href: "/portal", icon: "💬" },
    ],
  },
];

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Activity = {
  id: string;
  label: string;
  detail: string;
  timeAgo: string;
  icon: string;
};

type Course = {
  title: string;
  progress: number;
  color: string;
};

type WeeklyXP = {
  week: string;
  xp: number;
};

type TeacherMessage = {
  id: string;
  teacher: string;
  initials: string;
  text: string;
  time: string;
  color: string;
};

type Child = {
  id: string;
  name: string;
  age: number;
  initials: string;
  avatarGrad: string;
  instructorEmail: string;
  lastActiveDaysAgo: number;
  weeklyStats: {
    lessonsCompleted: number;
    timeSpentHours: number;
    xpEarned: number;
    streak: number;
  };
  overallCompletion: number;
  activeCourses: Course[];
  activities: Activity[];
  weeklyXP: WeeklyXP[];
  teacherMessages: TeacherMessage[];
  attendanceDays: number;
  totalDays: number;
};

/* ─────────────────────────────────────────────
   DEMO DATA
───────────────────────────────────────────── */
const CHILDREN: Child[] = [
  {
    id: "ahmet",
    name: "Ahmet",
    age: 15,
    initials: "AK",
    avatarGrad: "from-violet-500 to-blue-500",
    instructorEmail: "egitmen@atlasio.app",
    lastActiveDaysAgo: 4,
    weeklyStats: {
      lessonsCompleted: 5,
      timeSpentHours: 8.5,
      xpEarned: 420,
      streak: 3,
    },
    overallCompletion: 68,
    activeCourses: [
      { title: "React Temelleri", progress: 82, color: "from-blue-500 to-cyan-400" },
      { title: "Matematik – Türev", progress: 55, color: "from-amber-500 to-orange-400" },
      { title: "İngilizce B2", progress: 40, color: "from-emerald-500 to-teal-400" },
    ],
    activities: [
      { id: "a1", label: "React dersi izledi", detail: "Komponent Yaşam Döngüsü", timeAgo: "2 saat önce", icon: "🎬" },
      { id: "a2", label: "Quiz tamamladı", detail: "Skor: 85/100", timeAgo: "dün", icon: "✅" },
      { id: "a3", label: "Ödev teslim etti", detail: "Türev Alıştırmaları", timeAgo: "dün", icon: "📝" },
      { id: "a4", label: "Canlı derse katıldı", detail: "İngilizce Konuşma Pratiği", timeAgo: "2 gün önce", icon: "🎤" },
      { id: "a5", label: "Rozet kazandı", detail: "Haftalık Hedef Tamamlandı", timeAgo: "3 gün önce", icon: "🏅" },
      { id: "a6", label: "Video izledi", detail: "Türev – Limit Kavramı", timeAgo: "3 gün önce", icon: "▶️" },
      { id: "a7", label: "Alıştırma yaptı", detail: "React Hooks – 15 soruluk set", timeAgo: "4 gün önce", icon: "🧠" },
      { id: "a8", label: "Okuma tamamladı", detail: "B2 Grammar – Conditionals", timeAgo: "4 gün önce", icon: "📖" },
      { id: "a9", label: "Sınava girdi", detail: "Ünite Sonu Testi – Matematik", timeAgo: "5 gün önce", icon: "📋" },
      { id: "a10", label: "Ders planı açtı", detail: "Yeni hafta müfredatını inceledi", timeAgo: "6 gün önce", icon: "🗓️" },
    ],
    weeklyXP: [
      { week: "H-4", xp: 210 },
      { week: "H-3", xp: 380 },
      { week: "H-2", xp: 295 },
      { week: "Bu Hafta", xp: 420 },
    ],
    teacherMessages: [
      {
        id: "tm1",
        teacher: "Öğrt. Elif Kaya",
        initials: "EK",
        text: "Ahmet bu hafta React konusunda büyük ilerleme kaydetti. Ödev kalitesi oldukça yüksek.",
        time: "Bugün 10:30",
        color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      },
      {
        id: "tm2",
        teacher: "Öğrt. Mert Demir",
        initials: "MD",
        text: "Türev konusunda biraz daha pratik yapması gerekiyor. Ek alıştırmalar gönderdim.",
        time: "Dün 15:20",
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      },
      {
        id: "tm3",
        teacher: "Öğrt. Sara Yıldız",
        initials: "SY",
        text: "İngilizce konuşma pratiğine daha fazla katılım sağlaması faydalı olacak.",
        time: "3 gün önce",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      },
    ],
    attendanceDays: 18,
    totalDays: 22,
  },
  {
    id: "zeynep",
    name: "Zeynep",
    age: 12,
    initials: "ZK",
    avatarGrad: "from-pink-500 to-rose-500",
    instructorEmail: "egitmen2@atlasio.app",
    lastActiveDaysAgo: 1,
    weeklyStats: {
      lessonsCompleted: 7,
      timeSpentHours: 6.0,
      xpEarned: 310,
      streak: 7,
    },
    overallCompletion: 74,
    activeCourses: [
      { title: "Fen Bilgisi 6. Sınıf", progress: 91, color: "from-emerald-500 to-green-400" },
      { title: "Türkçe Kompozisyon", progress: 63, color: "from-pink-500 to-rose-400" },
      { title: "Temel Matematik", progress: 78, color: "from-blue-500 to-indigo-400" },
    ],
    activities: [
      { id: "z1", label: "Video izledi", detail: "Fotosentez – Bitkiler", timeAgo: "1 saat önce", icon: "🌱" },
      { id: "z2", label: "Quiz tamamladı", detail: "Skor: 92/100", timeAgo: "bugün sabah", icon: "✅" },
      { id: "z3", label: "Ödev teslim etti", detail: "Kompozisyon – Mevsimler", timeAgo: "dün", icon: "📝" },
      { id: "z4", label: "Canlı derse katıldı", detail: "Matematik – Kesirler", timeAgo: "dün", icon: "🎤" },
      { id: "z5", label: "Rozet kazandı", detail: "7 Günlük Seri!", timeAgo: "2 gün önce", icon: "🏅" },
      { id: "z6", label: "Okuma tamamladı", detail: "Fen – Hücre Yapısı", timeAgo: "2 gün önce", icon: "📖" },
      { id: "z7", label: "Alıştırma yaptı", detail: "Kesirlerle Çarpma – 20 soru", timeAgo: "3 gün önce", icon: "🧠" },
      { id: "z8", label: "Sınava girdi", detail: "Ünite Sonu – Fen Bilgisi", timeAgo: "4 gün önce", icon: "📋" },
      { id: "z9", label: "Video izledi", detail: "Türkçe – Noktalama İşaretleri", timeAgo: "5 gün önce", icon: "🎬" },
      { id: "z10", label: "Ders planı açtı", detail: "Haftalık müfredat güncellendi", timeAgo: "6 gün önce", icon: "🗓️" },
    ],
    weeklyXP: [
      { week: "H-4", xp: 180 },
      { week: "H-3", xp: 250 },
      { week: "H-2", xp: 290 },
      { week: "Bu Hafta", xp: 310 },
    ],
    teacherMessages: [
      {
        id: "tz1",
        teacher: "Öğrt. Ayşe Çelik",
        initials: "AÇ",
        text: "Zeynep fen dersinde çok başarılı! Projesini erken teslim etti, harika iş.",
        time: "Bugün 09:15",
        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      },
      {
        id: "tz2",
        teacher: "Öğrt. Burak Şahin",
        initials: "BŞ",
        text: "Matematik konusunda çok iyi ilerleme. Kesirler artık rahatça yapıyor.",
        time: "2 gün önce",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      },
    ],
    attendanceDays: 21,
    totalDays: 22,
  },
];

/* ─────────────────────────────────────────────
   HELPERS / SUB-COMPONENTS
───────────────────────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function authFetcher(url: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return fetch(`${API_BASE}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
}

/* Donut SVG */
function DonutChart({ value, size = 120 }: { value: number; size?: number }) {
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <defs>
        <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-200 dark:text-slate-700"
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#donutGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

/* Circular attendance progress */
function AttendanceRing({
  days,
  total,
  size = 96,
}: {
  days: number;
  total: number;
  size?: number;
}) {
  const pct = Math.round((days / total) * 100);
  const sw = 10;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="attendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="url(#attendGrad)"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{pct}%</span>
      </div>
    </div>
  );
}

/* 4-week bar chart (SVG) */
function WeeklyBarChart({ data }: { data: WeeklyXP[] }) {
  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const chartH = 80;
  const barW = 32;
  const gap = 16;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW + 8} ${chartH + 28}`}
      preserveAspectRatio="xMidYMid meet"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max(6, (d.xp / maxXP) * chartH);
        const x = i * (barW + gap);
        const y = chartH - barH;
        const isLast = i === data.length - 1;
        return (
          <g key={d.week}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={6}
              fill={isLast ? "url(#barGradActive)" : "url(#barGrad)"}
              opacity={isLast ? 1 : 0.65}
            />
            <text
              x={x + barW / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              className="text-slate-600 dark:text-slate-400"
            >
              {d.xp}
            </text>
            <text
              x={x + barW / 2}
              y={chartH + 18}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              className="text-slate-500 dark:text-slate-400"
            >
              {d.week}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* Progress bar row */
function CourseProgressBar({ course }: { course: Course }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate pr-2">
          {course.title}
        </span>
        <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{course.progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${course.color}`}
          style={{ width: `${course.progress}%`, transition: "width 0.8s ease" }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function GuardianPage() {
  const [selectedChildId, setSelectedChildId] = useState<string>(CHILDREN[0].id);
  const [showContactModal, setShowContactModal] = useState(false);

  const child = CHILDREN.find((c) => c.id === selectedChildId) ?? CHILDREN[0];

  /* API call – guardian summary (graceful fallback) */
  const { data: _apiData } = useSWR<unknown>(
    `/guardian/summary?childId=${child.id}`,
    authFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const isInactive = child.lastActiveDaysAgo >= 3;

  return (
    <PanelShell
      roleLabel="Veli Paneli"
      userName="Aile Merkezi"
      userSub="Öğrencinizin gelişimini takip edin"
      navSections={navSections}
    >
      <div className="space-y-6">

        {/* ── 1. HERO ─────────────────────────────── */}
        <header className="glass hero rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-fade-slide-up">
          <div className="hero-content space-y-2">
            <div className="pill w-fit text-xs">👪 Veli Paneli</div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Öğrencinizin gelişimini takip edin
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              İlerleme, devam ve eğitmen iletişimini tek ekranda görün. Şeffaf raporlama, net plan.
            </p>
          </div>
        </header>

        {/* ── 2. CHILD SELECTOR ───────────────────── */}
        {CHILDREN.length > 1 && (
          <section className="animate-fade-slide-up stagger-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Öğrenci:</span>
              {CHILDREN.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`pill flex items-center gap-2 text-sm transition-all duration-200 ${
                    selectedChildId === c.id
                      ? "bg-violet-600 text-white border-violet-600 shadow-md scale-105"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-violet-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${c.avatarGrad} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                  >
                    {c.initials}
                  </span>
                  {c.name}
                  <span className="opacity-70">{c.age} yaş</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── INACTIVITY ALERT BANNER ─────────────── */}
        {isInactive && (
          <div className="animate-fade-slide-up stagger-1 rounded-2xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
            <span className="relative flex h-3 w-3 mt-0.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {child.name} {child.lastActiveDaysAgo} gündür giriş yapmadı
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Son aktivite {child.lastActiveDaysAgo} gün önce. Eğitmenle iletişime geçebilirsiniz.
              </p>
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              className="flex-shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline hover:no-underline"
            >
              Eğitmene Yaz
            </button>
          </div>
        )}

        {/* ── 3. WEEKLY SUMMARY CARD ──────────────── */}
        <section className="animate-fade-slide-up stagger-2">
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Haftalık Özet
              </h2>
              <span className="pill text-xs">Son 7 gün</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: "📚",
                  value: child.weeklyStats.lessonsCompleted,
                  label: "Tamamlanan Ders",
                  sub: "bu hafta",
                  grad: "from-violet-50 to-violet-100/50 border-violet-200 dark:from-violet-900/20 dark:border-violet-700",
                  valColor: "text-violet-700 dark:text-violet-300",
                },
                {
                  icon: "⏱️",
                  value: `${child.weeklyStats.timeSpentHours}s`,
                  label: "Harcanan Süre",
                  sub: "aktif çalışma",
                  grad: "from-blue-50 to-blue-100/50 border-blue-200 dark:from-blue-900/20 dark:border-blue-700",
                  valColor: "text-blue-700 dark:text-blue-300",
                },
                {
                  icon: "⭐",
                  value: child.weeklyStats.xpEarned,
                  label: "Kazanılan XP",
                  sub: "deneyim puanı",
                  grad: "from-amber-50 to-amber-100/50 border-amber-200 dark:from-amber-900/20 dark:border-amber-700",
                  valColor: "text-amber-700 dark:text-amber-300",
                },
                {
                  icon: "🔥",
                  value: `${child.weeklyStats.streak} gün`,
                  label: "Seri",
                  sub: "kesintisiz",
                  grad: "from-rose-50 to-rose-100/50 border-rose-200 dark:from-rose-900/20 dark:border-rose-700",
                  valColor: "text-rose-700 dark:text-rose-300",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-xl border p-4 bg-gradient-to-br ${stat.grad} flex flex-col gap-1`}
                >
                  <div className="text-xl">{stat.icon}</div>
                  <div className={`metric text-2xl font-bold ${stat.valColor}`}>{stat.value}</div>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{stat.label}</div>
                  <div className="text-[10px] text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200 font-medium">
              Bu hafta{" "}
              <span className="font-bold">{child.weeklyStats.lessonsCompleted} ders</span> tamamladı 🎉
            </div>
          </div>
        </section>

        {/* ── 4. PROGRESS OVERVIEW ────────────────── */}
        <section className="animate-fade-slide-up stagger-2">
          <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
            {/* Donut */}
            <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center justify-center gap-2">
              <div className="relative">
                <DonutChart value={child.overallCompletion} size={120} />
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {child.overallCompletion}%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">tamamlandı</span>
                </div>
              </div>
              <p className="text-xs text-center text-slate-600 dark:text-slate-400 font-medium">
                Genel İlerleme
              </p>
            </div>

            {/* Active courses */}
            <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                  Aktif Kurslar
                </h2>
                <span className="pill text-xs">{child.activeCourses.length} kurs</span>
              </div>
              <div className="space-y-4">
                {child.activeCourses.map((course) => (
                  <CourseProgressBar key={course.title} course={course} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. ACTIVITY TIMELINE + 6. XP BAR CHART ─ */}
        <div className="grid gap-4 lg:grid-cols-2 animate-fade-slide-up stagger-3">

          {/* Activity Timeline */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Son Aktiviteler
              </h2>
              <span className="pill text-xs">Son 10 işlem</span>
            </div>
            <div className="space-y-0 relative">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
              {child.activities.map((act, idx) => (
                <div
                  key={act.id}
                  className={`relative flex gap-3 py-2 pl-2 ${
                    idx < child.activities.length - 1
                      ? "border-b border-slate-100 dark:border-slate-800"
                      : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm flex-shrink-0 z-10">
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {act.label}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{act.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{act.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-Week XP Bar Chart */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Haftalık XP Grafiği
              </h2>
              <span className="pill text-xs">4 hafta</span>
            </div>
            <div className="w-full px-2">
              <WeeklyBarChart data={child.weeklyXP} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-amber-400 to-orange-400 inline-block" />
              <span>Bu hafta (en yüksek: önceki haftaya göre)</span>
            </div>
          </div>
        </div>

        {/* ── 7. TEACHER MESSAGES + 8. ATTENDANCE ─── */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr] animate-fade-slide-up stagger-4">

          {/* Teacher Messages */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Eğitmen Mesajları
              </h2>
              <span className="pill text-xs">Son yorumlar</span>
            </div>
            <div className="space-y-3">
              {child.teacherMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 p-3 flex gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.color}`}
                  >
                    {msg.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {msg.teacher}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Devam
              </h2>
              <span className="pill text-xs">Bu ay</span>
            </div>
            <AttendanceRing days={child.attendanceDays} total={child.totalDays} size={100} />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {child.attendanceDays}/{child.totalDays} gün aktif
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {child.totalDays - child.attendanceDays} gün eksik
              </p>
              <div
                className={`pill text-xs mt-1 ${
                  child.attendanceDays / child.totalDays >= 0.85
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300"
                    : child.attendanceDays / child.totalDays >= 0.7
                    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                    : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300"
                }`}
              >
                {child.attendanceDays / child.totalDays >= 0.85
                  ? "Mükemmel"
                  : child.attendanceDays / child.totalDays >= 0.7
                  ? "Orta"
                  : "Düşük"}
              </div>
            </div>
          </div>
        </div>

        {/* ── 10. CONTACT INSTRUCTOR ─────────────── */}
        <section className="animate-fade-slide-up stagger-4">
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                  Eğitmenle İletişime Geç
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {child.name} hakkında soru veya geri bildirim paylaşmak için eğitmene doğrudan yazın.
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={`mailto:${child.instructorEmail}?subject=${encodeURIComponent(
                    `${child.name} hakkında`
                  )}&body=${encodeURIComponent(
                    `Merhaba,\n\n${child.name} ile ilgili görüşmek istiyorum.\n\nSaygılarımla,`
                  )}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity shadow-sm"
                >
                  ✉️ Eğitmene Yaz
                </a>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  📋 Rapor İste
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACT MODAL ───────────────────────── */}
        {showContactModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowContactModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md shadow-xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Rapor Talep Et
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {child.name} için detaylı performans raporu talebinde bulunabilirsiniz. Eğitmen 24 saat
                içinde size geri dönecektir.
              </p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rapor Türü
                </label>
                <select className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option>Haftalık Özet</option>
                  <option>Aylık Performans</option>
                  <option>Ders Bazlı Analiz</option>
                  <option>Devam Raporu</option>
                </select>
              </div>
              <div className="flex gap-2">
                <a
                  href={`mailto:${child.instructorEmail}?subject=${encodeURIComponent(
                    `${child.name} – Rapor Talebi`
                  )}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity"
                  onClick={() => setShowContactModal(false)}
                >
                  ✉️ Talep Gönder
                </a>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PanelShell>
  );
}
