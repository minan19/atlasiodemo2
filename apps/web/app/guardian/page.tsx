"use client";

import { useState } from "react";
import useSWR from "swr";
import { PanelShell } from "../_components/panel-shell";
import { useI18n } from '../_i18n/use-i18n';

/* ─── Nav ─── (moved inside component for i18n) */

/* ─── Types ─── */
type Activity  = { id: string; label: string; detail: string; timeAgo: string; type: "lesson"|"quiz"|"assignment"|"live"|"badge"|"read"|"practice"|"exam"|"plan" };
type Course    = { title: string; progress: number; grad: string };
type WeeklyXP  = { week: string; xp: number };
type TeacherMsg= { id: string; teacher: string; initials: string; text: string; time: string; accent: string };
type Child     = {
  id: string; name: string; age: number; initials: string; avatarGrad: string;
  instructorEmail: string; lastActiveDaysAgo: number;
  weeklyStats: { lessonsCompleted: number; timeSpentHours: number; xpEarned: number; streak: number };
  overallCompletion: number; activeCourses: Course[]; activities: Activity[];
  weeklyXP: WeeklyXP[]; teacherMessages: TeacherMsg[];
  attendanceDays: number; totalDays: number;
};

/* ─── Demo data ─── */
const CHILDREN: Child[] = [
  {
    id: "ahmet", name: "Ahmet", age: 15, initials: "AK",
    avatarGrad: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
    instructorEmail: "egitmen@atlasio.app", lastActiveDaysAgo: 4,
    weeklyStats: { lessonsCompleted: 5, timeSpentHours: 8.5, xpEarned: 420, streak: 3 },
    overallCompletion: 68,
    activeCourses: [
      { title: "React Temelleri",    progress: 82, grad: "linear-gradient(90deg,#3b82f6,#06b6d4)" },
      { title: "Matematik – Türev",  progress: 55, grad: "linear-gradient(90deg,#f59e0b,#f97316)" },
      { title: "İngilizce B2",        progress: 40, grad: "linear-gradient(90deg,#10b981,#14b8a6)" },
    ],
    activities: [
      { id: "a1", label: "React dersi izledi",      detail: "Komponent Yaşam Döngüsü",          timeAgo: "2 saat önce",  type: "lesson"     },
      { id: "a2", label: "Quiz tamamladı",           detail: "Skor: 85/100",                    timeAgo: "dün",          type: "quiz"       },
      { id: "a3", label: "Ödev teslim etti",         detail: "Türev Alıştırmaları",             timeAgo: "dün",          type: "assignment" },
      { id: "a4", label: "Canlı derse katıldı",      detail: "İngilizce Konuşma Pratiği",       timeAgo: "2 gün önce",   type: "live"       },
      { id: "a5", label: "Rozet kazandı",             detail: "Haftalık Hedef Tamamlandı",      timeAgo: "3 gün önce",   type: "badge"      },
      { id: "a6", label: "Video izledi",             detail: "Türev – Limit Kavramı",           timeAgo: "3 gün önce",   type: "lesson"     },
      { id: "a7", label: "Alıştırma yaptı",          detail: "React Hooks – 15 soruluk set",    timeAgo: "4 gün önce",   type: "practice"   },
      { id: "a8", label: "Okuma tamamladı",          detail: "B2 Grammar – Conditionals",       timeAgo: "4 gün önce",   type: "read"       },
      { id: "a9", label: "Sınava girdi",             detail: "Ünite Sonu Testi – Matematik",    timeAgo: "5 gün önce",   type: "exam"       },
      { id: "a10", label: "Ders planı açtı",         detail: "Yeni hafta müfredatını inceledi", timeAgo: "6 gün önce",   type: "plan"       },
    ],
    weeklyXP: [{ week: "H-4", xp: 210 },{ week: "H-3", xp: 380 },{ week: "H-2", xp: 295 },{ week: "Bu Hafta", xp: 420 }],
    teacherMessages: [
      { id: "tm1", teacher: "Öğrt. Elif Kaya", initials: "EK", text: "Ahmet bu hafta React konusunda büyük ilerleme kaydetti. Ödev kalitesi oldukça yüksek.", time: "Bugün 10:30", accent: "var(--accent-2)" },
      { id: "tm2", teacher: "Öğrt. Mert Demir", initials: "MD", text: "Türev konusunda biraz daha pratik yapması gerekiyor. Ek alıştırmalar gönderdim.", time: "Dün 15:20", accent: "var(--accent)" },
      { id: "tm3", teacher: "Öğrt. Sara Yıldız", initials: "SY", text: "İngilizce konuşma pratiğine daha fazla katılım sağlaması faydalı olacak.", time: "3 gün önce", accent: "var(--accent-3)" },
    ],
    attendanceDays: 18, totalDays: 22,
  },
  {
    id: "zeynep", name: "Zeynep", age: 12, initials: "ZK",
    avatarGrad: "linear-gradient(135deg,#ec4899,#f43f5e)",
    instructorEmail: "egitmen2@atlasio.app", lastActiveDaysAgo: 1,
    weeklyStats: { lessonsCompleted: 7, timeSpentHours: 6.0, xpEarned: 310, streak: 7 },
    overallCompletion: 74,
    activeCourses: [
      { title: "Fen Bilgisi 6. Sınıf", progress: 91, grad: "linear-gradient(90deg,#10b981,#22c55e)" },
      { title: "Türkçe Kompozisyon",   progress: 63, grad: "linear-gradient(90deg,#ec4899,#f43f5e)" },
      { title: "Temel Matematik",      progress: 78, grad: "linear-gradient(90deg,#3b82f6,#6366f1)" },
    ],
    activities: [
      { id: "z1", label: "Video izledi",      detail: "Fotosentez – Bitkiler",              timeAgo: "1 saat önce",   type: "lesson"     },
      { id: "z2", label: "Quiz tamamladı",    detail: "Skor: 92/100",                       timeAgo: "bugün sabah",   type: "quiz"       },
      { id: "z3", label: "Ödev teslim etti", detail: "Kompozisyon – Mevsimler",            timeAgo: "dün",           type: "assignment" },
      { id: "z4", label: "Canlı derse katıldı", detail: "Matematik – Kesirler",            timeAgo: "dün",           type: "live"       },
      { id: "z5", label: "Rozet kazandı",    detail: "7 Günlük Seri!",                     timeAgo: "2 gün önce",    type: "badge"      },
      { id: "z6", label: "Okuma tamamladı",  detail: "Fen – Hücre Yapısı",                 timeAgo: "2 gün önce",    type: "read"       },
      { id: "z7", label: "Alıştırma yaptı",  detail: "Kesirlerle Çarpma – 20 soru",        timeAgo: "3 gün önce",    type: "practice"   },
      { id: "z8", label: "Sınava girdi",     detail: "Ünite Sonu – Fen Bilgisi",           timeAgo: "4 gün önce",    type: "exam"       },
      { id: "z9", label: "Video izledi",     detail: "Türkçe – Noktalama İşaretleri",      timeAgo: "5 gün önce",    type: "lesson"     },
      { id: "z10", label: "Ders planı açtı", detail: "Haftalık müfredat güncellendi",      timeAgo: "6 gün önce",    type: "plan"       },
    ],
    weeklyXP: [{ week: "H-4", xp: 180 },{ week: "H-3", xp: 250 },{ week: "H-2", xp: 290 },{ week: "Bu Hafta", xp: 310 }],
    teacherMessages: [
      { id: "tz1", teacher: "Öğrt. Ayşe Çelik", initials: "AÇ", text: "Zeynep fen dersinde çok başarılı! Projesini erken teslim etti, harika iş.", time: "Bugün 09:15", accent: "var(--accent-3)" },
      { id: "tz2", teacher: "Öğrt. Burak Şahin", initials: "BŞ", text: "Matematik konusunda çok iyi ilerleme. Kesirler artık rahatça yapıyor.", time: "2 gün önce", accent: "var(--accent-2)" },
    ],
    attendanceDays: 21, totalDays: 22,
  },
];

/* ─── API ─── */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
function authFetcher(url: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return fetch(`${API_BASE}${url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); });
}

/* ─── Activity icon map ─── */
function ActivityIcon({ type }: { type: Activity["type"] }) {
  const s = 13;
  const icons: Record<Activity["type"], JSX.Element> = {
    lesson: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    quiz: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    assignment: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    live: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14"/></svg>,
    badge: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    read: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    practice: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    exam: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 12h6"/><path d="M9 15h4"/></svg>,
    plan: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  };
  const colors: Record<Activity["type"], string> = {
    lesson: "var(--accent-2)", quiz: "#22c55e", assignment: "var(--accent)",
    live: "#ef4444", badge: "#f59e0b", read: "var(--accent-3)",
    practice: "#8b5cf6", exam: "#f97316", plan: "var(--muted)",
  };
  return (
    <div style={{
      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in srgb,${colors[type]} 15%,var(--panel))`,
      border: `1px solid color-mix(in srgb,${colors[type]} 30%,var(--line))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: colors[type],
    }}>
      {icons[type]}
    </div>
  );
}

/* ─── Donut Chart ─── */
function DonutChart({ value, size = 120 }: { value: number; size?: number }) {
  const sw = 14, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="gDonut" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5B6EFF" /><stop offset="100%" stopColor="#9B59FF" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gDonut)" strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

/* ─── Attendance Ring ─── */
function AttendanceRing({ days, total, size = 100 }: { days: number; total: number; size?: number }) {
  const t = useI18n();
  const pct = Math.round((days / total) * 100);
  const sw = 10, r = (size - sw) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="gAttend" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00B4D8" /><stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#gAttend)" strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>{t.tr("devam")}</span>
      </div>
    </div>
  );
}

/* ─── Weekly Bar Chart ─── */
function WeeklyBarChart({ data }: { data: WeeklyXP[] }) {
  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const chartH = 80, barW = 36, gap = 14;
  const totalW = data.length * (barW + gap) - gap;
  return (
    <svg width="100%" viewBox={`0 0 ${totalW + 8} ${chartH + 30}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5B6EFF" /><stop offset="100%" stopColor="#9B59FF" />
        </linearGradient>
        <linearGradient id="gBarNow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max(6, (d.xp / maxXP) * chartH);
        const x = i * (barW + gap), y = chartH - barH;
        const isNow = i === data.length - 1;
        return (
          <g key={d.week}>
            <rect x={x} y={y} width={barW} height={barH} rx={7}
              fill={isNow ? "url(#gBarNow)" : "url(#gBar)"} opacity={isNow ? 1 : 0.6} />
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9} fill="var(--ink-2)">{d.xp}</text>
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize={9} fill="var(--muted)">{d.week}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Course Progress Bar ─── */
function CourseProgressBar({ course }: { course: Course }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 8 }}>
          {course.title}
        </span>
        <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{course.progress}%</span>
      </div>
      <div style={{ height: 7, borderRadius: "var(--r-full)", background: "var(--line)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "var(--r-full)", background: course.grad, width: `${course.progress}%`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

/* ─── Card Header ─── */
function CardHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 18, borderRadius: 2, background: "linear-gradient(180deg,var(--accent-2),var(--accent))", display: "inline-block", flexShrink: 0 }} />
        {title}
      </h2>
      {sub && (
        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: "var(--r-full)", background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function GuardianPage() {
  const t = useI18n();
  const navSections = [
    {
      title: t.tr("Veli"),
      items: [
        { label: t.tr("Özet"),     href: "/guardian" },
        { label: t.tr("Ödevler"),  href: "/leaderboard" },
        { label: t.tr("Takvim"),   href: "/booking" },
        { label: t.tr("Raporlar"), href: "/report-cards" },
      ],
    },
    {
      title: t.tr("İletişim"),
      items: [
        { label: t.tr("Eğitmenler"), href: "/instructor" },
        { label: t.tr("Destek"),     href: "/portal" },
      ],
    },
  ];
  const [selectedChildId, setSelectedChildId] = useState<string>(CHILDREN[0].id);
  const [showContactModal, setShowContactModal] = useState(false);
  const [reportType, setReportType] = useState("Haftalık Özet");

  const child = CHILDREN.find((c) => c.id === selectedChildId) ?? CHILDREN[0];

  useSWR<unknown>(`/guardian/summary?childId=${child.id}`, authFetcher, { revalidateOnFocus: false, shouldRetryOnError: false });

  const isInactive = child.lastActiveDaysAgo >= 3;
  const attendPct = child.attendanceDays / child.totalDays;

  return (
    <PanelShell roleLabel="Veli Paneli" userName="Aile Merkezi" userSub={t.tr("Öğrencinizin gelişimini takip edin")} navSections={navSections}>
      <style>{`
        @keyframes guardFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes guardPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
      `}</style>

      {/* ── Hero ── */}
      <div
        className="glass hero"
        style={{
          borderRadius: "var(--r-xl)", padding: "24px 24px 20px",
          background: "linear-gradient(135deg,color-mix(in srgb,var(--accent-2) 8%,var(--panel)),color-mix(in srgb,var(--accent) 5%,var(--panel)))",
          border: "1.5px solid color-mix(in srgb,var(--accent) 18%,var(--line))",
          animation: "guardFadeIn 0.4s both",
        }}
      >
        <div className="hero-content">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--r-sm)",
              background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--accent)", textTransform: "uppercase" }}>{t.tr("Veli Paneli")}</span>
          </div>
          <h1 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 800, color: "var(--ink)", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
            {t.guardian.title}
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 }}>
            {t.guardian.subtitle}
          </p>
        </div>
      </div>

      {/* ── Child selector ── */}
      {CHILDREN.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.tr("Öğrenci:")}</span>
          {CHILDREN.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: "var(--r-full)",
                border: selectedChildId === c.id ? "none" : "1.5px solid var(--line)",
                background: selectedChildId === c.id ? "linear-gradient(135deg,var(--accent-2),var(--accent))" : "var(--panel)",
                color: selectedChildId === c.id ? "#fff" : "var(--ink-2)",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
                boxShadow: selectedChildId === c.id ? "var(--glow-blue)" : "none",
                transition: "all var(--t-fast)",
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: c.avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {c.initials}
              </span>
              {t.tr(c.name)}
              <span style={{ opacity: 0.75 }}>{c.age} {t.tr("yaş")}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Inactivity alert ── */}
      {isInactive && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "12px 16px", borderRadius: "var(--r-lg)",
          background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.3)",
        }}>
          <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", position: "relative", zIndex: 1 }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#f59e0b", opacity: 0.4, animation: "guardPulse 1.5s infinite" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>
              {t.tr(child.name)} {child.lastActiveDaysAgo} {t.tr("gündür giriş yapmadı")}
            </p>
            <p style={{ fontSize: 12, color: "#b45309", margin: 0 }}>
              {t.tr("Eğitmenle iletişime geçebilirsiniz.")}
            </p>
          </div>
          <button
            onClick={() => setShowContactModal(true)}
            style={{ fontSize: 12, fontWeight: 700, color: "#b45309", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}
          >
            {t.tr("Eğitmene Yaz")}
          </button>
        </div>
      )}

      {/* ── Weekly stats ── */}
      <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: "20px 20px 16px" }}>
        <CardHead title={t.tr("Haftalık Özet")} sub={t.tr("Son 7 gün")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12 }}>
          {[
            { label: "Tamamlanan Ders",  value: child.weeklyStats.lessonsCompleted, sub: t.tr("bu hafta"),      grad: "linear-gradient(135deg,#5B6EFF,#9B59FF)", icon: "lesson"   },
            { label: "Harcanan Süre",    value: `${child.weeklyStats.timeSpentHours}s`, sub: t.tr("aktif"),     grad: "linear-gradient(135deg,#3b82f6,#06b6d4)",  icon: "clock"    },
            { label: "Kazanılan XP",     value: child.weeklyStats.xpEarned,         sub: t.tr("XP puanı"),     grad: "linear-gradient(135deg,#f59e0b,#f97316)",  icon: "star"     },
            { label: "Seri",             value: `${child.weeklyStats.streak} ${t.tr("gün")}`,   sub: t.tr("kesintisiz"),  grad: "linear-gradient(135deg,#ef4444,#f97316)",  icon: "fire"     },
          ].map((s) => {
            const iconPaths: Record<string, JSX.Element> = {
              lesson: <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
              clock: <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              star: <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
              fire: <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>,
            };
            return (
              <div key={t.tr(s.label)} style={{ borderRadius: "var(--r-md)", padding: "14px 14px 12px", background: "color-mix(in srgb,var(--line) 30%,var(--panel))", border: "1px solid var(--line)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: s.grad, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
                  {iconPaths[s.icon]}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", lineHeight: 1, marginBottom: 3 }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-2)" }}>{t.tr(s.label)}</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.sub}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, padding: "9px 14px", borderRadius: "var(--r-md)", background: "color-mix(in srgb,var(--accent-3) 8%,var(--panel))", border: "1px solid color-mix(in srgb,var(--accent-3) 25%,var(--line))", fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>
          {t.tr("Bu hafta")} <strong>{child.weeklyStats.lessonsCompleted} {t.tr("ders")}</strong> {t.tr("tamamlandı")} —{" "}
          <span style={{ color: "var(--accent-3)", fontWeight: 700 }}>{t.tr("harika ilerleme!")}</span>
        </div>
      </div>

      {/* ── Progress + Courses ── */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "start" }}>
        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <DonutChart value={child.overallCompletion} size={120} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{child.overallCompletion}%</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{t.tr("tamamlandı")}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", textAlign: "center" }}>{t.tr("Genel İlerleme")}</p>
        </div>

        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
          <CardHead title={t.tr("Aktif Kurslar")} sub={`${child.activeCourses.length} ${t.tr("kurs")}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {child.activeCourses.map((c) => <CourseProgressBar key={t.tr(c.title)} course={c} />)}
          </div>
        </div>
      </div>

      {/* ── Activity + XP Chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
          <CardHead title={t.tr("Son Aktiviteler")} sub={t.tr("Son 10 işlem")} />
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 13, top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
            {child.activities.map((act, i) => (
              <div
                key={act.id}
                style={{
                  display: "flex", gap: 10, paddingBottom: i < child.activities.length - 1 ? 12 : 0, marginBottom: i < child.activities.length - 1 ? 12 : 0,
                  borderBottom: i < child.activities.length - 1 ? "1px solid var(--line)" : "none",
                  position: "relative", zIndex: 1,
                }}
              >
                <ActivityIcon type={act.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tr(act.label)}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.detail}</p>
                </div>
                <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0, marginTop: 2, whiteSpace: "nowrap" }}>{act.timeAgo}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
          <CardHead title={t.tr("Haftalık XP Grafiği")} sub="4 hafta" />
          <div style={{ width: "100%", paddingTop: 4 }}>
            <WeeklyBarChart data={child.weeklyXP} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg,#f59e0b,#f97316)" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Bu hafta (turuncu = aktif)")}</span>
          </div>
        </div>
      </div>

      {/* ── Teacher messages + Attendance ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.5fr", gap: 16, alignItems: "start" }}>
        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
          <CardHead title={t.tr("Eğitmen Mesajları")} sub={t.tr("Son yorumlar")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {child.teacherMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)",
                  background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `color-mix(in srgb,${msg.accent} 20%,var(--panel))`,
                  border: `1.5px solid color-mix(in srgb,${msg.accent} 35%,var(--line))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: msg.accent,
                }}>
                  {msg.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.teacher}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>{msg.time}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-2)", margin: 0, lineHeight: 1.55 }}>{t.tr(msg.text)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{t.tr("Devam")}</h2>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Bu ay")}</span>
          </div>
          <AttendanceRing days={child.attendanceDays} total={child.totalDays} size={100} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
              {child.attendanceDays}/{child.totalDays} {t.tr("gün aktif")}
            </p>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px" }}>{child.totalDays - child.attendanceDays} {t.tr("gün eksik")}</p>
            <span style={{
              display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--r-full)",
              background: attendPct >= 0.85 ? "rgba(34,197,94,0.12)" : attendPct >= 0.7 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
              border: attendPct >= 0.85 ? "1px solid rgba(34,197,94,0.3)" : attendPct >= 0.7 ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(239,68,68,0.3)",
              color: attendPct >= 0.85 ? "#22c55e" : attendPct >= 0.7 ? "#f59e0b" : "#ef4444",
            }}>
              {attendPct >= 0.85 ? t.tr("Mükemmel") : attendPct >= 0.7 ? t.tr("Orta") : t.tr("Düşük")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Contact instructor ── */}
      <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>{t.tr("Eğitmenle İletişime Geç")}</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              {t.tr(child.name)} {t.tr("hakkında soru veya geri bildirim için eğitmene doğrudan yazın.")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={`mailto:${child.instructorEmail}?subject=${encodeURIComponent(`${t.tr(child.name)} hakkında`)}&body=${encodeURIComponent(`Merhaba,\n\n${t.tr(child.name)} ile ilgili görüşmek istiyorum.\n\nSaygılarımla,`)}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: "var(--r-md)",
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
                boxShadow: "var(--glow-blue)",
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {t.tr("Eğitmene Yaz")}
            </a>
            <button
              onClick={() => setShowContactModal(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)", background: "var(--panel)",
                color: "var(--ink-2)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6"/><path d="M9 12h6"/><path d="M9 15h4"/></svg>
              {t.tr("Rapor İste")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Contact modal ── */}
      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 420, borderRadius: "var(--r-xl)",
              background: "var(--panel)", border: "1.5px solid var(--line)",
              boxShadow: "var(--shadow-lg)", padding: 26,
              animation: "guardFadeIn 0.2s cubic-bezier(.2,.6,.3,1) both",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", margin: 0 }}>{t.tr("Rapor Talep Et")}</h3>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--panel)", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.6 }}>
              {t.tr(child.name)} {t.tr("için detaylı performans raporu talebinde bulunabilirsiniz. Eğitmen 24 saat içinde geri dönecektir.")}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 7 }}>{t.tr("Rapor Türü")}</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "color-mix(in srgb,var(--line) 20%,var(--panel))", color: "var(--ink)", fontSize: 14 }}
              >
                <option>{t.tr("Haftalık Özet")}</option>
                <option>{t.tr("Aylık Performans")}</option>
                <option>{t.tr("Ders Bazlı Analiz")}</option>
                <option>{t.tr("Devam Raporu")}</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href={`mailto:${child.instructorEmail}?subject=${encodeURIComponent(`${t.tr(child.name)} – ${reportType} Rapor Talebi`)}`}
                onClick={() => setShowContactModal(false)}
                style={{
                  flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px", borderRadius: "var(--r-md)", textDecoration: "none",
                  background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                  color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "var(--glow-blue)",
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {t.tr("Talep Gönder")}
              </a>
              <button
                onClick={() => setShowContactModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {t.tr("İptal")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelShell>
  );
}
