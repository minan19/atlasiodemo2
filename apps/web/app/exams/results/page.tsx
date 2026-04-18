"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../_i18n/use-i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grade = "A" | "B" | "C" | "D" | "F";

type ExamResult = {
  id: string;
  quizTitle: string;
  courseTitle: string;
  score: number;       // 0-100
  maxScore: number;
  correctCount: number;
  totalCount: number;
  grade: Grade;
  timeSpent: number;   // seconds
  submittedAt: string; // ISO
  passed: boolean;
  xpEarned: number;
};

type FilterStatus = "all" | "passed" | "failed";
type SortKey = "newest" | "oldest" | "highest" | "lowest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

const DEMO_RESULTS: ExamResult[] = [
  {
    id: "r1",
    quizTitle: "Python Temelleri Final Sınavı",
    courseTitle: "Python ile Programlamaya Giriş",
    score: 92,
    maxScore: 100,
    correctCount: 46,
    totalCount: 50,
    grade: "A",
    timeSpent: 2340,
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 500,
  },
  {
    id: "r2",
    quizTitle: "React Hooks & Context Quiz",
    courseTitle: "İleri Seviye React Geliştirme",
    score: 78,
    maxScore: 100,
    correctCount: 39,
    totalCount: 50,
    grade: "B",
    timeSpent: 1800,
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 350,
  },
  {
    id: "r3",
    quizTitle: "SQL JOIN ve Alt Sorgular",
    courseTitle: "Veritabanı Yönetimi ve SQL",
    score: 65,
    maxScore: 100,
    correctCount: 26,
    totalCount: 40,
    grade: "C",
    timeSpent: 2700,
    submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 200,
  },
  {
    id: "r4",
    quizTitle: "İngilizce B2 Dilbilgisi Testi",
    courseTitle: "İleri İngilizce – B2 Seviyesi",
    score: 88,
    maxScore: 100,
    correctCount: 44,
    totalCount: 50,
    grade: "B",
    timeSpent: 3000,
    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 420,
  },
  {
    id: "r5",
    quizTitle: "Türev ve İntegral Quiz",
    courseTitle: "Üniversite Matematiği",
    score: 45,
    maxScore: 100,
    correctCount: 18,
    totalCount: 40,
    grade: "F",
    timeSpent: 3600,
    submittedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    passed: false,
    xpEarned: 50,
  },
  {
    id: "r6",
    quizTitle: "TypeScript Tip Sistemi Sınavı",
    courseTitle: "TypeScript ile Tam Yığın Geliştirme",
    score: 97,
    maxScore: 100,
    correctCount: 29,
    totalCount: 30,
    grade: "A",
    timeSpent: 1500,
    submittedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 600,
  },
  {
    id: "r7",
    quizTitle: "Ağ Güvenliği Temelleri",
    courseTitle: "Siber Güvenliğe Giriş",
    score: 58,
    maxScore: 100,
    correctCount: 29,
    totalCount: 50,
    grade: "D",
    timeSpent: 4200,
    submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    passed: false,
    xpEarned: 80,
  },
  {
    id: "r8",
    quizTitle: "Veri Görselleştirme Proje Sınavı",
    courseTitle: "Veri Bilimi & Makine Öğrenmesi",
    score: 83,
    maxScore: 100,
    correctCount: 33,
    totalCount: 40,
    grade: "B",
    timeSpent: 2100,
    submittedAt: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString(),
    passed: true,
    xpEarned: 390,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}sn`;
  if (s === 0) return `${m}dk`;
  return `${m}dk ${s}sn`;
}

function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

function absoluteDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GRADE_STYLES: Record<Grade, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  C: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  D: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  F: "bg-red-500/20 text-red-400 border border-red-500/30",
};

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------

function ScoreTrendChart({ results }: { results: ExamResult[] }) {
  const t = useI18n();
  const data = useMemo(() => {
    return [...results]
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(-10);
  }, [results]);

  if (data.length < 2) return null;

  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 20, bottom: 30, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scores = data.map((r) => r.score);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const toY = (score: number) =>
    PAD.top + innerH - ((score - minScore) / (maxScore - minScore)) * innerH;

  // Cubic bezier smooth path
  const points = data.map((r, i) => ({ x: toX(i), y: toY(r.score) }));
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    pathD += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }

  // Y grid lines at 0, 25, 50, 75, 100 if in range
  const gridLines = [0, 25, 50, 75, 100].filter(
    (v) => v >= minScore && v <= maxScore
  );

  return (
    <div className="glass rounded-2xl p-6 animate-fade-slide-up stagger-3">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
        {t.tr("Puan Trendi")} ({t.tr("Son")} {data.length} {t.tr("Sınav")})
      </h3>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 320, maxHeight: 200 }}
          aria-label="Sınav puan trendi grafiği"
        >
          {/* Grid lines */}
          {gridLines.map((v) => {
            const y = toY(v);
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD.left - 6}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.35)"
                  fontSize={10}
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* 60% pass line */}
          {60 >= minScore && 60 <= maxScore && (
            <line
              x1={PAD.left}
              y1={toY(60)}
              x2={W - PAD.right}
              y2={toY(60)}
              stroke="rgba(234,179,8,0.4)"
              strokeWidth={1}
              strokeDasharray="6 3"
            />
          )}

          {/* Gradient fill */}
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${points[points.length - 1].x},${PAD.top + innerH} L ${points[0].x},${PAD.top + innerH} Z`}
            fill="url(#chartGrad)"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#818cf8"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {data.map((r, i) => (
            <g key={r.id}>
              <circle
                cx={points[i].x}
                cy={points[i].y}
                r={6}
                fill={r.passed ? "#10b981" : "#ef4444"}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={2}
              />
              <title>{`${r.quizTitle}: ${r.score}/100`}</title>
            </g>
          ))}

          {/* X axis labels */}
          {data.map((r, i) => (
            <text
              key={r.id}
              x={points[i].x}
              y={H - 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={9}
            >
              {i + 1}
            </text>
          ))}
        </svg>
      </div>
      <div className="flex items-center gap-5 mt-3 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          {t.tr("Geçti")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          {t.tr("Kaldı")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-60" />
          {t.tr("Geçme sınırı (60)")}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Strip
// ---------------------------------------------------------------------------

function StatsStrip({ results }: { results: ExamResult[] }) {
  const t = useI18n();
  const total = results.length;
  const avg =
    total > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / total)
      : 0;
  const best = total > 0 ? Math.max(...results.map((r) => r.score)) : 0;
  const passedCount = results.filter((r) => r.passed).length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  const stats = [
    {
      label: t.tr("Toplam Sınav"),
      value: String(total),
      icon: "📋",
      sub: t.tr("tamamlanan"),
      color: "text-violet-400",
    },
    {
      label: t.tr("Ortalama Puan"),
      value: `%${avg}`,
      icon: "📊",
      sub: t.tr("genel ortalama"),
      color: "text-blue-400",
    },
    {
      label: t.tr("En Yüksek Puan"),
      value: `%${best}`,
      icon: "🏆",
      sub: t.tr("en iyi sonuç"),
      color: "text-amber-400",
    },
    {
      label: t.tr("Geçme Oranı"),
      value: `%${passRate}`,
      icon: "✅",
      sub: `${passedCount}/${total} ${t.tr("sınav")}`,
      color: passRate >= 70 ? "text-emerald-400" : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-slide-up stagger-2">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="glass rounded-2xl p-5 flex flex-col gap-1"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
              {s.label}
            </span>
            <span className="text-xl">{s.icon}</span>
          </div>
          <span className={`metric text-3xl font-bold ${s.color}`}>
            {s.value}
          </span>
          <span className="text-xs text-white/30">{s.sub}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({ value, max = 100, color = "bg-indigo-500" }: {
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade Badge
// ---------------------------------------------------------------------------

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={`pill font-bold text-sm w-9 h-9 flex items-center justify-center rounded-xl ${GRADE_STYLES[grade]}`}
    >
      {grade}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Result Card (card view)
// ---------------------------------------------------------------------------

function ResultCard({ result }: { result: ExamResult }) {
  const t = useI18n();
  const [showAbsolute, setShowAbsolute] = useState(false);
  const scoreColor =
    result.score >= 85
      ? "text-emerald-400"
      : result.score >= 70
      ? "text-blue-400"
      : result.score >= 60
      ? "text-amber-400"
      : "text-red-400";

  const barColor =
    result.score >= 85
      ? "bg-emerald-500"
      : result.score >= 70
      ? "bg-blue-500"
      : result.score >= 60
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4 transition-all hover:scale-[1.015] hover:shadow-lg">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <GradeBadge grade={result.grade} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate leading-tight">
            {result.quizTitle}
          </p>
          <p className="text-xs text-white/50 truncate mt-0.5">
            {result.courseTitle}
          </p>
        </div>
        <span
          className={`pill text-xs font-bold px-3 py-1 rounded-full ${
            result.passed
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {result.passed ? t.tr("GEÇTİ") : t.tr("KALDI")}
        </span>
      </div>

      {/* Score */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-white/40">{t.tr("Puan")}</span>
          <span className={`text-lg font-bold ${scoreColor}`}>
            {result.score}/100
          </span>
        </div>
        <ProgressBar value={result.score} color={barColor} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass rounded-xl p-2">
          <p className="text-xs text-white/40 mb-0.5">{t.tr("Doğru")}</p>
          <p className="text-sm font-semibold text-white">
            {result.correctCount}/{result.totalCount}
          </p>
        </div>
        <div className="glass rounded-xl p-2">
          <p className="text-xs text-white/40 mb-0.5">{t.tr("Süre")}</p>
          <p className="text-sm font-semibold text-white">
            {formatTime(result.timeSpent)}
          </p>
        </div>
        <div className="glass rounded-xl p-2">
          <p className="text-xs text-white/40 mb-0.5">XP</p>
          <p className="text-sm font-semibold text-violet-400">
            +{result.xpEarned}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span
          className="text-xs text-white/40 cursor-default"
          title={absoluteDate(result.submittedAt)}
          onMouseEnter={() => setShowAbsolute(true)}
          onMouseLeave={() => setShowAbsolute(false)}
        >
          {showAbsolute
            ? absoluteDate(result.submittedAt)
            : relativeDate(result.submittedAt)}
        </span>
        <span className="pill text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2.5 py-0.5 rounded-full">
          +{result.xpEarned} XP
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result Table Row
// ---------------------------------------------------------------------------

function ResultTableRow({ result }: { result: ExamResult }) {
  const t = useI18n();
  const [showAbsolute, setShowAbsolute] = useState(false);
  const scoreColor =
    result.score >= 85
      ? "text-emerald-400"
      : result.score >= 70
      ? "text-blue-400"
      : result.score >= 60
      ? "text-amber-400"
      : "text-red-400";
  const barColor =
    result.score >= 85
      ? "bg-emerald-500"
      : result.score >= 70
      ? "bg-blue-500"
      : result.score >= 60
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
      {/* Grade */}
      <td className="px-4 py-3">
        <GradeBadge grade={result.grade} />
      </td>
      {/* Quiz / Course */}
      <td className="px-4 py-3 max-w-[220px]">
        <p className="font-medium text-white text-sm leading-tight truncate">
          {result.quizTitle}
        </p>
        <p className="text-xs text-white/40 truncate">{result.courseTitle}</p>
      </td>
      {/* Score */}
      <td className="px-4 py-3 min-w-[130px]">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${scoreColor}`}>
            {result.score}/100
          </span>
        </div>
        <ProgressBar value={result.score} color={barColor} />
      </td>
      {/* Correct */}
      <td className="px-4 py-3 text-sm text-white/70 whitespace-nowrap">
        {result.correctCount}/{result.totalCount} {t.tr("Doğru")}
      </td>
      {/* Time */}
      <td className="px-4 py-3 text-sm text-white/60 whitespace-nowrap">
        {formatTime(result.timeSpent)}
      </td>
      {/* Date */}
      <td
        className="px-4 py-3 text-sm text-white/50 whitespace-nowrap cursor-default"
        onMouseEnter={() => setShowAbsolute(true)}
        onMouseLeave={() => setShowAbsolute(false)}
        title={absoluteDate(result.submittedAt)}
      >
        {showAbsolute ? absoluteDate(result.submittedAt) : relativeDate(result.submittedAt)}
      </td>
      {/* XP */}
      <td className="px-4 py-3">
        <span className="pill text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2.5 py-0.5 rounded-full whitespace-nowrap">
          +{result.xpEarned} XP
        </span>
      </td>
      {/* Pass/Fail */}
      <td className="px-4 py-3">
        <span
          className={`pill text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
            result.passed
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {result.passed ? t.tr("GEÇTİ") : t.tr("KALDI")}
        </span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ResultSkeleton({ view }: { view: "card" | "table" }) {
  if (view === "table") {
    return (
      <div className="glass rounded-2xl overflow-hidden animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-6 py-4 border-b border-white/5">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-48 rounded" />
              <div className="skeleton h-2 w-32 rounded" />
            </div>
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-2 w-1/2 rounded" />
            </div>
          </div>
          <div className="skeleton h-2 w-full rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton h-10 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ExamResultsPage() {
  const t = useI18n();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // View mode
  const [view, setView] = useState<"card" | "table">("card");

  // Filters / sort
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
        if (!token) throw new Error("no-token");

        const res = await fetch(`${API}/quiz/results/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ExamResult[] = await res.json();
        setResults(data);
        setIsDemoMode(false);
      } catch {
        setResults(DEMO_RESULTS);
        setIsDemoMode(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ---------------------------------------------------------------------------
  // Derived list
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    let list = [...results];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.quizTitle.toLowerCase().includes(q) ||
          r.courseTitle.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus === "passed") list = list.filter((r) => r.passed);
    if (filterStatus === "failed") list = list.filter((r) => !r.passed);

    // Sort
    list.sort((a, b) => {
      if (sortKey === "newest")
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      if (sortKey === "oldest")
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (sortKey === "highest") return b.score - a.score;
      if (sortKey === "lowest") return a.score - b.score;
      return 0;
    });

    return list;
  }, [results, search, filterStatus, sortKey]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950">
      {/* Hero */}
      <div className="hero relative overflow-hidden py-16 px-4 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #6366f1 0%, transparent 70%)",
          }}
        />
        <div className="hero-content relative z-10 max-w-3xl mx-auto animate-fade-slide-up stagger-1">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-4xl font-bold text-white mb-3">
            {t.exams.resultsTitle}
          </h1>
          <p className="text-white/50 text-lg">
            {t.exams.subtitle}
          </p>
          {isDemoMode && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm">
              <span>⚠️</span>
              {t.common.demoMode} — {t.common.loginRequired}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24 space-y-6">
        {/* Stats */}
        {!loading && <StatsStrip results={results} />}

        {/* Chart */}
        {!loading && results.length >= 2 && (
          <ScoreTrendChart results={results} />
        )}

        {/* Controls */}
        <div className="glass rounded-2xl p-4 animate-fade-slide-up stagger-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder={t.common.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Filter status */}
            <div className="flex rounded-xl overflow-hidden border border-white/10">
              {(
                [
                  { key: "all", label: t.common.all },
                  { key: "passed", label: t.exams.status.passed },
                  { key: "failed", label: t.exams.status.failed },
                ] as { key: FilterStatus; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all ${
                    filterStatus === key
                      ? "bg-indigo-600 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm focus:outline-none focus:border-indigo-500/60 transition-all cursor-pointer"
            >
              <option value="newest">{t.courses.sortNewest}</option>
              <option value="oldest">{t.courses.sortOldest}</option>
              <option value="highest">{t.courses.sortRating}</option>
              <option value="lowest">{t.courses.sortPopular}</option>
            </select>

            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/10 ml-auto">
              <button
                onClick={() => setView("card")}
                title={t.tr("Kart görünümü")}
                className={`px-3 py-2.5 text-sm transition-all ${
                  view === "card"
                    ? "bg-indigo-600 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                ⊞
              </button>
              <button
                onClick={() => setView("table")}
                title={t.tr("Tablo görünümü")}
                className={`px-3 py-2.5 text-sm transition-all ${
                  view === "table"
                    ? "bg-indigo-600 text-white"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-white/30 mt-3 pl-1">
            {filtered.length} {t.tr("sonuç gösteriliyor")}
            {search || filterStatus !== "all"
              ? ` (${results.length} ${t.tr("toplam")})`
              : ""}
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && <ResultSkeleton view={view} />}

        {/* Error */}
        {error && !isDemoMode && (
          <div className="glass rounded-2xl p-8 text-center text-red-400">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center animate-fade-slide-up">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-white/60 text-lg font-medium">
              {t.common.noResults}
            </p>
            <p className="text-white/30 text-sm mt-2">
              {t.common.noData}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("all");
              }}
              className="mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all"
            >
              {t.common.reset}
            </button>
          </div>
        )}

        {/* Card view */}
        {!loading && filtered.length > 0 && view === "card" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}

        {/* Table view */}
        {!loading && filtered.length > 0 && view === "table" && (
          <div className="glass rounded-2xl overflow-hidden animate-fade-slide-up">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.leaderboard.rankLabel}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.exams.title}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider min-w-[130px]">
                      {t.exams.yourScore}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.exams.correctAnswers}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.exams.timeLeft}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.payments.date}
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      XP
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {t.exams.status.inProgress}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((result) => (
                    <ResultTableRow key={result.id} result={result} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary footer when results visible */}
        {!loading && results.length > 0 && (
          <div className="glass rounded-2xl p-5 animate-fade-slide-up">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">
              {t.tr("Not Dağılımı")}
            </h3>
            <div className="flex flex-wrap gap-3">
              {(["A", "B", "C", "D", "F"] as Grade[]).map((g) => {
                const count = results.filter((r) => r.grade === g).length;
                const pct =
                  results.length > 0
                    ? Math.round((count / results.length) * 100)
                    : 0;
                return (
                  <div
                    key={g}
                    className="flex items-center gap-3 glass rounded-xl px-4 py-2.5 flex-1 min-w-[100px]"
                  >
                    <span
                      className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg ${GRADE_STYLES[g]}`}
                    >
                      {g}
                    </span>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {count} {t.tr("sınav")}
                      </p>
                      <p className="text-white/30 text-xs">%{pct}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
