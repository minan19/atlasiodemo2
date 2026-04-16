"use client";

import useSWR from "swr";
import { api } from "../../api/client";
import React, { useState } from "react";
import { useI18n } from "../../_i18n/use-i18n";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

type Payout = { id: string; instructorId?: string; amount?: number | string; createdAt: string };
type FinanceData = { revenueTotal?: number; payouts?: Payout[] };
type RiskySession = { id: string; sessionId?: string; finalTrustScore?: number };
type IntelData = { sessionsLive?: number; attendance?: number; risky?: RiskySession[] };
type TopCourse = { id: string; title?: string; enrollments?: unknown[] };
type SalesData = { recommendation?: string; topCourses?: TopCourse[] };

type TrainingCourse = {
  id: string; title: string; enrolled: number; completed: number;
  avgScore: number; avgTimeH: number; category: string;
};
type CompetencyRow = {
  skill: string; beginner: number; intermediate: number; advanced: number; expert: number;
};
type ExamResult = {
  id: string; title: string; participants: number; avgScore: number; passRate: number; date: string;
};

const DEMO_FINANCE: FinanceData = {
  revenueTotal: 128540,
  payouts: [
    { id: "p1", instructorId: "ins_01", amount: 3200, createdAt: "2026-03-09T10:00:00Z" },
    { id: "p2", instructorId: "ins_02", amount: 1850, createdAt: "2026-03-10T11:00:00Z" },
    { id: "p3", instructorId: "ins_03", amount: 4100, createdAt: "2026-03-11T09:30:00Z" },
    { id: "p4", instructorId: "ins_04", amount: 2750, createdAt: "2026-03-12T14:00:00Z" },
    { id: "p5", instructorId: "ins_01", amount: 5600, createdAt: "2026-03-13T08:00:00Z" },
    { id: "p6", instructorId: "ins_05", amount: 3300, createdAt: "2026-03-14T16:00:00Z" },
    { id: "p7", instructorId: "ins_02", amount: 2900, createdAt: "2026-03-15T10:30:00Z" },
    { id: "p8", instructorId: "ins_06", amount: 4200, createdAt: "2026-03-15T11:00:00Z" },
    { id: "p9", instructorId: "ins_03", amount: 1700, createdAt: "2026-03-15T12:00:00Z" },
    { id: "p10", instructorId: "ins_07", amount: 3800, createdAt: "2026-03-15T13:00:00Z" },
  ],
};

const DEMO_INTEL: IntelData = {
  sessionsLive: 47,
  attendance: 82,
  risky: [
    { id: "r1", sessionId: "sess_991", finalTrustScore: 34 },
    { id: "r2", sessionId: "sess_442", finalTrustScore: 51 },
    { id: "r3", sessionId: "sess_887", finalTrustScore: 28 },
    { id: "r4", sessionId: "sess_213", finalTrustScore: 63 },
    { id: "r5", sessionId: "sess_775", finalTrustScore: 45 },
  ],
};

const DEMO_SALES: SalesData = {
  recommendation: "Türkçe içerik kategorisinde talep %34 arttı. Yeni kurs açılımı için ideal dönem.",
  topCourses: [
    { id: "c1", title: "React ile Modern Web", enrollments: new Array(312) },
    { id: "c2", title: "Python Veri Bilimi", enrollments: new Array(278) },
    { id: "c3", title: "UI/UX Tasarım Temelleri", enrollments: new Array(194) },
  ],
};

const DEMO_TRAINING_COURSES: TrainingCourse[] = [
  { id: "tr1", title: "React ile Modern Web", enrolled: 312, completed: 248, avgScore: 82, avgTimeH: 14.5, category: "Frontend" },
  { id: "tr2", title: "Python Veri Bilimi", enrolled: 278, completed: 190, avgScore: 77, avgTimeH: 22, category: "AI/ML" },
  { id: "tr3", title: "UI/UX Tasarım Temelleri", enrolled: 194, completed: 161, avgScore: 88, avgTimeH: 9, category: "Tasarım" },
  { id: "tr4", title: "Siber Güvenlik 101", enrolled: 145, completed: 98, avgScore: 71, avgTimeH: 18, category: "Güvenlik" },
  { id: "tr5", title: "İş Analitiği & BI", enrolled: 130, completed: 112, avgScore: 85, avgTimeH: 11, category: "Analitik" },
  { id: "tr6", title: "Liderlik Becerileri", enrolled: 95, completed: 79, avgScore: 91, avgTimeH: 6, category: "Yönetim" },
];

const DEMO_COMPETENCY: CompetencyRow[] = [
  { skill: "Frontend Geliştirme", beginner: 45, intermediate: 120, advanced: 85, expert: 32 },
  { skill: "Veri Analizi", beginner: 80, intermediate: 95, advanced: 60, expert: 18 },
  { skill: "Siber Güvenlik", beginner: 110, intermediate: 70, advanced: 35, expert: 8 },
  { skill: "Proje Yönetimi", beginner: 55, intermediate: 105, advanced: 72, expert: 25 },
  { skill: "Tasarım", beginner: 90, intermediate: 80, advanced: 45, expert: 12 },
];

const DEMO_EXAM_RESULTS: ExamResult[] = [
  { id: "e1", title: "React Temel Sınavı", participants: 248, avgScore: 82, passRate: 91, date: "2026-03-15" },
  { id: "e2", title: "Python Final", participants: 190, avgScore: 77, passRate: 84, date: "2026-03-18" },
  { id: "e3", title: "Güvenlik Sertifikasyonu", participants: 98, avgScore: 71, passRate: 72, date: "2026-03-20" },
  { id: "e4", title: "BI Ara Sınav", participants: 112, avgScore: 85, passRate: 95, date: "2026-03-22" },
  { id: "e5", title: "Liderlik Değerlendirme", participants: 79, avgScore: 91, passRate: 98, date: "2026-03-25" },
];

const COMPLETION_TREND = [
  { hafta: "H1", tamamlama: 62, kayıt: 78 },
  { hafta: "H2", tamamlama: 71, kayıt: 85 },
  { hafta: "H3", tamamlama: 68, kayıt: 91 },
  { hafta: "H4", tamamlama: 80, kayıt: 94 },
  { hafta: "H5", tamamlama: 77, kayıt: 88 },
  { hafta: "H6", tamamlama: 85, kayıt: 102 },
  { hafta: "H7", tamamlama: 89, kayıt: 110 },
  { hafta: "H8", tamamlama: 84, kayıt: 98 },
];

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

function trustColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 60) return "#f59e0b";
  return "#10b981";
}

// ─── Icon component ───────────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { display: "inline-block", flexShrink: 0 },
  };

  if (name === "bar-chart") return (
    <svg {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
  if (name === "download") return (
    <svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
  if (name === "printer") return (
    <svg {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
  if (name === "trending-up") return (
    <svg {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
  if (name === "video") return (
    <svg {...props}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
  if (name === "users") return (
    <svg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
  if (name === "star") return (
    <svg {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
  if (name === "alert-triangle") return (
    <svg {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  if (name === "pie-chart") return (
    <svg {...props}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
  if (name === "check-circle") return (
    <svg {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
  if (name === "circle") return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
  if (name === "zap") return (
    <svg {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
  return null;
}

// ─── Section heading accent bar ───────────────────────────────────────────────
function AccentBar({ gradient }: { gradient: string }) {
  return (
    <span style={{
      display: "inline-block",
      width: 4,
      height: 20,
      borderRadius: 4,
      background: gradient,
      flexShrink: 0,
    }} />
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      borderRadius: "var(--r-xl)",
      background: "var(--panel)",
      border: "1.5px solid var(--line)",
      padding: 24,
      boxShadow: "var(--shadow-sm)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const t = useI18n();
  const { data: financeRaw } = useSWR<FinanceData>("/admin/reports/finance", api, { revalidateOnFocus: false });
  const { data: intelRaw } = useSWR<IntelData>("/admin/reports/intel", api, { revalidateOnFocus: false });
  const { data: salesRaw } = useSWR<SalesData>("/admin/reports/sales-ai", api, { revalidateOnFocus: false });

  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "intel" | "training" | "ai-report">("overview");

  const isDemo = !financeRaw && !intelRaw && !salesRaw;
  const finance = financeRaw ?? DEMO_FINANCE;
  const intel = intelRaw ?? DEMO_INTEL;
  const sales = salesRaw ?? DEMO_SALES;

  const payouts = finance?.payouts ?? [];
  const revenueChartData = payouts.slice(-7).map((p) => ({
    date: new Date(p.createdAt).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
    amount: typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0,
  }));

  const topCourses = (sales?.topCourses ?? []).slice(0, 3);
  const maxEnrollment = Math.max(...topCourses.map((c) => c.enrollments?.length ?? 0), 1);

  const riskDistribution = [
    { name: "Düşük Risk (>60)", value: (intel?.risky ?? []).filter((r) => (r.finalTrustScore ?? 0) >= 60).length, color: "#10b981" },
    { name: "Orta Risk (40-60)", value: (intel?.risky ?? []).filter((r) => { const s = r.finalTrustScore ?? 0; return s >= 40 && s < 60; }).length, color: "#f59e0b" },
    { name: "Yüksek Risk (<40)", value: (intel?.risky ?? []).filter((r) => (r.finalTrustScore ?? 0) < 40).length, color: "#ef4444" },
  ];

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>
      {/* Responsive + hover styles */}
      <style>{`
        .reports-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 1024px) {
          .reports-kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .reports-course-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .reports-course-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .reports-intel-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .reports-intel-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .reports-header-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .reports-header-actions {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .reports-btn-outline {
          transition: background var(--t-fast), border-color var(--t-fast);
        }
        .reports-btn-outline:hover {
          background: color-mix(in srgb, var(--accent) 8%, var(--panel)) !important;
          border-color: var(--accent) !important;
        }
        .reports-btn-solid {
          transition: opacity var(--t-fast);
        }
        .reports-btn-solid:hover {
          opacity: 0.85;
        }
        .reports-tab-btn {
          transition: background var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
        }
        .reports-course-card {
          transition: border-color var(--t-fast), background var(--t-fast), box-shadow var(--t-fast);
        }
        .reports-course-card:hover {
          border-color: var(--accent) !important;
          background: color-mix(in srgb, var(--accent) 6%, var(--panel)) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .reports-tr-alt {
          background: color-mix(in srgb, var(--ink) 3%, var(--panel));
        }
        .reports-table-row {
          transition: background var(--t-fast);
        }
        .reports-table-row:hover {
          background: color-mix(in srgb, var(--accent) 5%, var(--panel)) !important;
        }
      `}</style>

      {/* Demo Banner */}
      {isDemo && (
        <div style={{
          borderRadius: "var(--r-lg)",
          border: "1.5px solid #f59e0b",
          background: "color-mix(in srgb, #f59e0b 10%, var(--panel))",
          padding: "8px 16px",
          fontSize: 13,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <Icon name="alert-triangle" size={15} />
          <span style={{ fontWeight: 700 }}>{t.tr("Demo Modu:")}</span>
          {" "}{t.tr("API verisi bulunamadı, örnek veriler gösteriliyor.")}
        </div>
      )}

      {/* Header */}
      <header style={{
        borderRadius: "var(--r-xl)",
        background: "var(--panel)",
        border: "1.5px solid var(--line)",
        padding: "24px",
        boxShadow: "var(--shadow-md)",
      }}>
        <div className="reports-header-actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Status pill */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 99,
              border: "1.5px solid var(--line)",
              background: "color-mix(in srgb, var(--accent) 8%, var(--panel))",
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-2)",
              width: "fit-content",
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 0 2px color-mix(in srgb, #10b981 30%, transparent)",
              }} />
              {t.tr("Yönetici Paneli")}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--ink)", margin: 0 }}>
              {t.tr("Analitik")}{" &"}{" "}
              <span style={{
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                {t.tr("Raporlar")}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{t.tr("Finans · İstihbarat · Satış AI")}</p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="reports-btn-outline"
              onClick={() => {
                const rows = [
                  ["Kurs", "Kayıt", "Tamamlama", "Tamamlanma %", "Ort. Puan", "Kategori"],
                  ...DEMO_TRAINING_COURSES.map(c => [
                    c.title, c.enrolled, c.completed,
                    Math.round(c.completed / c.enrolled * 100) + "%",
                    c.avgScore, c.category,
                  ]),
                ];
                const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = "atlasio-rapor.csv"; a.click();
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", cursor: "pointer" }}
            >
              <Icon name="download" size={14} /> CSV
            </button>
            <button
              className="reports-btn-outline"
              onClick={() => {
                const rows = [
                  ["Kurs", "Kayıt", "Tamamlama", "Tamamlanma %", "Ort. Puan", "Kategori"],
                  ...DEMO_TRAINING_COURSES.map(c => [
                    c.title, c.enrolled, c.completed,
                    Math.round(c.completed / c.enrolled * 100) + "%",
                    c.avgScore, c.category,
                  ]),
                ];
                const tsv = rows.map(r => r.join("\t")).join("\n");
                const blob = new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8;" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = "atlasio-rapor.xls"; a.click();
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", cursor: "pointer" }}
            >
              <Icon name="download" size={14} /> Excel
            </button>
            <button
              className="reports-btn-outline"
              onClick={() => {
                const data = {
                  exportedAt: new Date().toISOString(),
                  courses: DEMO_TRAINING_COURSES,
                  exams: DEMO_EXAM_RESULTS,
                  competency: DEMO_COMPETENCY,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = "atlasio-rapor.json"; a.click();
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", cursor: "pointer" }}
            >
              <Icon name="download" size={14} /> JSON
            </button>
            <button
              className="reports-btn-solid"
              onClick={() => window.print()}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: "var(--r-md)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", boxShadow: "var(--glow-blue)" }}
            >
              <Icon name="printer" size={14} /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* KPI Summary Row */}
      <section className="reports-kpi-grid">
        {/* Total Revenue */}
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "color-mix(in srgb, #10b981 8%, var(--panel))",
          border: "1.5px solid color-mix(in srgb, #10b981 30%, var(--line))",
          padding: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ color: "#10b981" }}><Icon name="trending-up" size={14} /></span>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#065f46", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              {t.tr("Toplam Gelir")}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#064e3b", margin: 0 }}>
            ₺{(finance?.revenueTotal ?? 0).toLocaleString("tr-TR")}
          </p>
          <p style={{ fontSize: 11, color: "#059669", marginTop: 4 }}>{t.tr("Tüm zamanlar")}</p>
        </div>

        {/* Live Sessions */}
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "color-mix(in srgb, #3b82f6 8%, var(--panel))",
          border: "1.5px solid color-mix(in srgb, #3b82f6 30%, var(--line))",
          padding: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ color: "#3b82f6" }}><Icon name="video" size={14} /></span>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              {t.tr("Canlı Oturumlar")}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
            {intel?.sessionsLive ?? 0}
          </p>
          <p style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>{t.tr("Şu an aktif")}</p>
        </div>

        {/* Attendance */}
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "color-mix(in srgb, #8b5cf6 8%, var(--panel))",
          border: "1.5px solid color-mix(in srgb, #8b5cf6 30%, var(--line))",
          padding: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ color: "#8b5cf6" }}><Icon name="users" size={14} /></span>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#5b21b6", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              {t.tr("Devam Oranı")}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#4c1d95", margin: 0 }}>
            {intel?.attendance != null ? `${intel.attendance}%` : "—"}
          </p>
          <p style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>{t.tr("Bu hafta")}</p>
        </div>

        {/* Sales AI Score */}
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "color-mix(in srgb, #f59e0b 8%, var(--panel))",
          border: "1.5px solid color-mix(in srgb, #f59e0b 30%, var(--line))",
          padding: 20,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ color: "#f59e0b" }}><Icon name="star" size={14} /></span>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#92400e", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              {t.tr("Satış AI Skoru")}
            </p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#78350f", margin: 0 }}>
            {topCourses.length > 0 ? (
              <span style={{ display: "flex", gap: 2 }}>
                {[1,2,3,4].map(i => (
                  <span key={i} style={{ color: "#f59e0b" }}><Icon name="star" size={18} /></span>
                ))}
                <span style={{ color: "var(--line)" }}><Icon name="star" size={18} /></span>
              </span>
            ) : "—"}
          </p>
          <p style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>{topCourses.length} {t.tr("aktif kurs")}</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div style={{
        display: "inline-flex",
        gap: 4,
        background: "var(--panel)",
        borderRadius: "var(--r-lg)",
        padding: 4,
        border: "1.5px solid var(--line)",
        width: "fit-content",
      }}>
        {([
          { id: "overview", label: "Genel Bakış" },
          { id: "training", label: "Eğitim Analitiği" },
          { id: "finance", label: "Finans" },
          { id: "intel", label: "İstihbarat" },
          { id: "ai-report", label: "✦ AI Rapor Üret" },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="reports-tab-btn"
              style={{
                padding: "6px 16px",
                borderRadius: "var(--r-md)",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: isActive ? (tab.id === "ai-report" ? "linear-gradient(90deg,#8b5cf6,#3b82f6)" : "var(--accent)") : "transparent",
                color: isActive ? "#fff" : "var(--muted)",
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
              }}
            >
              {t.tr(tab.label)}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Revenue Chart */}
          <Card>
            <h2 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 20px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AccentBar gradient="linear-gradient(180deg,#10b981,#06b6d4)" />
              {t.tr("Haftalık Gelir Trendi")}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₺${v.toLocaleString()}`} />
                <Tooltip
                  formatter={(val: unknown) => [`₺${Number(val).toLocaleString("tr-TR")}`, t.tr("Gelir")]}
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1.5px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    fontSize: 12,
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Sales AI Section */}
          <Card>
            <h2 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AccentBar gradient="linear-gradient(180deg,#f59e0b,#f97316)" />
              {t.tr("Satış AI Önerileri")}
            </h2>

            {sales?.recommendation && (
              <div style={{
                borderRadius: "var(--r-lg)",
                border: "1.5px solid color-mix(in srgb, #f59e0b 35%, var(--line))",
                background: "color-mix(in srgb, #f59e0b 8%, var(--panel))",
                padding: "12px 16px",
                fontSize: 13,
                color: "var(--ink-2)",
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}>
                <span style={{ color: "#f59e0b", marginTop: 1 }}><Icon name="zap" size={14} /></span>
                <span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{t.tr("Öneri:")} </span>
                  {sales.recommendation}
                </span>
              </div>
            )}

            <div className="reports-course-grid">
              {topCourses.map((course) => {
                const count = course.enrollments?.length ?? 0;
                const pct = Math.round((count / maxEnrollment) * 100);
                return (
                  <div
                    key={course.id}
                    className="reports-course-card"
                    style={{
                      borderRadius: "var(--r-lg)",
                      border: "1.5px solid var(--line)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0, lineHeight: 1.4 }}>
                      {t.tr(course.title ?? "Kurs")}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>{count} {t.tr("kayıt")}</p>
                    <div style={{
                      height: 6,
                      borderRadius: 99,
                      background: "var(--line)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 99,
                        background: "linear-gradient(90deg,#10b981,#06b6d4)",
                        width: `${pct}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Finance Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "finance" && (
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "var(--panel)",
          border: "1.5px solid var(--line)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: "1.5px solid var(--line)",
          }}>
            <h2 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AccentBar gradient="linear-gradient(180deg,#10b981,#14b8a6)" />
              {t.tr("Son Ödemeler")}
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--ink) 4%, var(--panel))" }}>
                  {["Eğitmen", "Tutar", "Tarih", "Durum"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontWeight: 600,
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}>{t.tr(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.slice(0, 10).map((p, i) => (
                  <tr
                    key={p.id}
                    className={`reports-table-row${i % 2 !== 0 ? " reports-tr-alt" : ""}`}
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--ink-2)" }}>
                      {p.instructorId ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ink)" }}>
                      ₺{Number(p.amount ?? 0).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)" }}>
                      {new Date(p.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        background: "color-mix(in srgb, #10b981 14%, var(--panel))",
                        color: "#065f46",
                        border: "1px solid color-mix(in srgb, #10b981 30%, transparent)",
                      }}>
                        <Icon name="check-circle" size={10} />
                        {t.tr("Ödendi")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Intel Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === "intel" && (
        <div className="reports-intel-grid">
          {/* Risky Sessions */}
          <Card>
            <h2 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AccentBar gradient="linear-gradient(180deg,#f43f5e,#f97316)" />
              {t.tr("Canlı Öğrenciler (Riskli)")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(intel?.risky ?? []).map((r) => {
                const score = r.finalTrustScore ?? 0;
                const color = trustColor(score);
                return (
                  <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ fontFamily: "monospace", color: "var(--ink-2)" }}>{r.sessionId ?? r.id}</span>
                      <span style={{ fontWeight: 700, color }}>{score}/100</span>
                    </div>
                    <div style={{
                      height: 6,
                      borderRadius: 99,
                      background: "var(--line)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 99,
                        width: `${score}%`,
                        backgroundColor: color,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
              {(intel?.risky ?? []).length === 0 && (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.tr("Riskli oturum bulunamadı.")}</p>
              )}
            </div>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <h2 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink)",
              margin: "0 0 16px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AccentBar gradient="linear-gradient(180deg,#8b5cf6,#a855f7)" />
              {t.tr("Risk Dağılımı")}
            </h2>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [String(val), t.tr("Oturum")]}
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1.5px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      fontSize: 12,
                      boxShadow: "var(--shadow-md)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {riskDistribution.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: item.color,
                      flexShrink: 0,
                    }} />
                    <span style={{ color: "var(--ink-2)" }}>{t.tr(item.name)}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Mini Bar Chart */}
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={riskDistribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Tooltip
                    formatter={(val: unknown) => [String(val), t.tr("Oturum")]}
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1.5px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      fontSize: 12,
                      boxShadow: "var(--shadow-md)",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ── Training Analytics Tab ────────────────────────────────────────────── */}
      {activeTab === "training" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {[
              { label: "Toplam Kayıt", value: DEMO_TRAINING_COURSES.reduce((s,c)=>s+c.enrolled,0).toLocaleString("tr-TR"), sub: "Tüm kurslar", color: "#3b82f6" },
              { label: "Tamamlama Oranı", value: Math.round(DEMO_TRAINING_COURSES.reduce((s,c)=>s+c.completed,0)/DEMO_TRAINING_COURSES.reduce((s,c)=>s+c.enrolled,0)*100)+"%", sub: "Genel ortalama", color: "#10b981" },
              { label: "Ortalama Puan", value: Math.round(DEMO_TRAINING_COURSES.reduce((s,c)=>s+c.avgScore,0)/DEMO_TRAINING_COURSES.length)+"/100", sub: "Tüm sınavlar", color: "#8b5cf6" },
              { label: "Aktif Kurs", value: DEMO_TRAINING_COURSES.length, sub: "Bu dönem", color: "#f59e0b" },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: "var(--panel)", border: "1.5px solid var(--line)", borderRadius: "var(--r-xl)", padding: "18px 20px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{t.tr(kpi.label)}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.tr(kpi.sub)}</div>
              </div>
            ))}
          </div>

          {/* Completion trend chart */}
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
              <AccentBar gradient="linear-gradient(180deg,#10b981,#3b82f6)" />
              {t.tr("Haftalık Kayıt & Tamamlama Trendi")}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={COMPLETION_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="hafta" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 12 }} />
                <Area type="monotone" dataKey="kayıt" stroke="#3b82f6" fill="url(#enrollGrad)" strokeWidth={2} name={t.tr("Yeni Kayıt")} />
                <Area type="monotone" dataKey="tamamlama" stroke="#10b981" fill="url(#compGrad)" strokeWidth={2} name={t.tr("Tamamlama")} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Course completion table */}
          <Card>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
              <AccentBar gradient="linear-gradient(180deg,#8b5cf6,#3b82f6)" />
              {t.tr("Kurs Tamamlama Oranları")}
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                    {["Kurs", "Kategori", "Kayıt", "Tamamlama", "Tamamlanma %", "Ort. Puan", "Ort. Süre"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left" }}>{t.tr(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_TRAINING_COURSES.map((c, i) => {
                    const pct = Math.round(c.completed / c.enrolled * 100);
                    return (
                      <tr key={c.id} className={`reports-table-row${i % 2 === 1 ? " reports-tr-alt" : ""}`}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.tr(c.title)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#3b82f618", color: "#3b82f6", borderRadius: 6, padding: "2px 8px" }}>{t.tr(c.category)}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--ink-2)" }}>{c.enrolled}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--ink-2)" }}>{c.completed}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "var(--line)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: pct + "%", height: "100%", background: pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444", minWidth: 36 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: c.avgScore >= 80 ? "#10b981" : c.avgScore >= 65 ? "#f59e0b" : "#ef4444" }}>{c.avgScore}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>/100</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--ink-2)" }}>{c.avgTimeH}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Exam results + Competency side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <AccentBar gradient="linear-gradient(180deg,#f59e0b,#ef4444)" />
                {t.tr("Sınav Sonuçları")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {DEMO_EXAM_RESULTS.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "color-mix(in srgb,var(--accent) 4%,var(--bg))", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.tr(e.title)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.participants} {t.tr("katılımcı")} · {e.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: e.avgScore >= 80 ? "#10b981" : "#f59e0b" }}>{e.avgScore}</div>
                      <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>%{e.passRate} {t.tr("geçti")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <AccentBar gradient="linear-gradient(180deg,#8b5cf6,#c084fc)" />
                {t.tr("Yetkinlik Dağılımı")}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {DEMO_COMPETENCY.map(row => {
                  const total = row.beginner + row.intermediate + row.advanced + row.expert;
                  return (
                    <div key={row.skill}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{row.skill}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{total} {t.tr("kişi")}</span>
                      </div>
                      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                        {[
                          { val: row.beginner, color: "#94a3b8" },
                          { val: row.intermediate, color: "#60a5fa" },
                          { val: row.advanced, color: "#8b5cf6" },
                          { val: row.expert, color: "#10b981" },
                        ].map((seg, i) => (
                          <div key={i} style={{ flex: seg.val, background: seg.color }} />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        {[
                          { label: "Başlangıç", val: row.beginner, color: "#94a3b8" },
                          { label: "Orta", val: row.intermediate, color: "#60a5fa" },
                          { label: "İleri", val: row.advanced, color: "#8b5cf6" },
                          { label: "Uzman", val: row.expert, color: "#10b981" },
                        ].map(seg => (
                          <span key={t.tr(seg.label)} style={{ fontSize: 10, color: seg.color }}>
                            <span style={{ fontWeight: 700 }}>{seg.val}</span> {t.tr(seg.label)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── AI Report Generator Tab ───────────────────────────────────────────── */}
      {activeTab === "ai-report" && <AiReportTab />}
    </main>
  );
}

/* ─── AI Report Generator Component ─────────────────────────────────────── */
function AiReportTab() {
  const t = useI18n();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Merhaba! Size özel bir rapor oluşturmama yardımcı olabilirim. Hangi konuda rapor almak istersiniz?\n\nÖrnek sorular:\n• \"Bu ay en çok tamamlanan kursları göster\"\n• \"React kursunun öğrenci performansını analiz et\"\n• \"Sınav başarısızlık oranı en yüksek konuları listele\"\n• \"Departman bazında eğitim tamamlama oranlarını karşılaştır\"" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<null | { type: string; title: string; data: unknown[] }>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const AI_RESPONSES: Record<string, { text: string; report?: { type: string; title: string; data: unknown[] } }> = {
    default: {
      text: "Tabii! Aşağıda talep ettiğiniz analizi hazırladım. Grafikler veya tablo formatında görmek ister misiniz? Ayrıca CSV/Excel olarak da indirebilirsiniz.",
      report: {
        type: "bar",
        title: "Kurs Tamamlama Oranları",
        data: DEMO_TRAINING_COURSES.map(c => ({ name: c.title.slice(0,20), "Tamamlama %": Math.round(c.completed/c.enrolled*100) })),
      },
    },
    tamamla: {
      text: "Bu ay en yüksek tamamlama oranına sahip kurslar aşağıda listelenmiştir. 'Liderlik Becerileri' kursu %83 ile birinci sırada yer almaktadır.",
      report: {
        type: "bar",
        title: "Tamamlama Oranı (Üstten Alta)",
        data: [...DEMO_TRAINING_COURSES].sort((a,b) => b.completed/b.enrolled - a.completed/a.enrolled)
          .map(c => ({ name: c.title.slice(0,18), "%": Math.round(c.completed/c.enrolled*100) })),
      },
    },
    sınav: {
      text: "Sınav performans analizi hazır. Tüm sınavlarda ortalama başarı oranı %88'dir. En düşük başarı oranı 'Siber Güvenlik 101' sınavında görülmektedir (%72).",
      report: {
        type: "bar",
        title: "Sınav Başarı Oranları (%)",
        data: DEMO_EXAM_RESULTS.map(e => ({ name: e.title.slice(0,18), "Geçme %": e.passRate, "Ort. Puan": e.avgScore })),
      },
    },
    performans: {
      text: "React kursunun detaylı performans analizi: 312 öğrenciden 248'i (%79) kursu tamamladı. Ortalama sınav puanı 82/100. Öğrencilerin %91'i sınavı başardı.",
      report: {
        type: "bar",
        title: "React Kursu — Haftalık İlerleme",
        data: COMPLETION_TREND.map(d => ({ name: d.hafta, "Tamamlama": d.tamamlama, "Kayıt": d.kayıt })),
      },
    },
    departman: {
      text: "Departman bazında yetkinlik dağılımı analiz edildi. Frontend ve Veri Analizi alanlarında ileri seviye çalışan sayısı en yüksektir.",
      report: {
        type: "bar",
        title: "Yetkinlik Seviyesi Dağılımı",
        data: DEMO_COMPETENCY.map(r => ({ name: r.skill.slice(0,12), "Başlangıç": r.beginner, "Orta": r.intermediate, "İleri": r.advanced, "Uzman": r.expert })),
      },
    },
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const lower = text.toLowerCase();
      let key = "default";
      if (lower.includes("tamamla") || lower.includes("bitir")) key = "tamamla";
      else if (lower.includes("sınav") || lower.includes("başarı") || lower.includes("puan")) key = "sınav";
      else if (lower.includes("react") || lower.includes("performans") || lower.includes("analiz")) key = "performans";
      else if (lower.includes("departman") || lower.includes("yetkinlik") || lower.includes("karşılaştır")) key = "departman";
      const resp = AI_RESPONSES[key];
      setMessages(m => [...m, { role: "ai", text: resp.text }]);
      if (resp.report) setReportData(resp.report);
      setLoading(false);
    }, 900);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, height: 600 }}>
      {/* Chat panel */}
      <Card style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1.5px solid var(--line)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>✦</span> {t.tr("AI Rapor Asistanı")}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.tr("Doğal dilde rapor talebi yapın")}</div>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.role === "ai" ? "linear-gradient(135deg,#8b5cf6,#3b82f6)" : "#3b82f620", border: m.role === "ai" ? "none" : "1px solid #3b82f640", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: m.role === "ai" ? "#fff" : "#60a5fa" }}>
                {m.role === "ai" ? "✦" : "S"}
              </div>
              <div style={{ maxWidth: "80%", background: m.role === "user" ? "#3b82f6" : "var(--bg)", border: `1.5px solid ${m.role === "user" ? "#3b82f6" : "var(--line)"}`, borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "8px 12px", fontSize: 13, color: m.role === "user" ? "#fff" : "var(--ink)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>✦</div>
              <div style={{ background: "var(--bg)", border: "1.5px solid var(--line)", borderRadius: "12px 12px 12px 4px", padding: "8px 14px", fontSize: 13, color: "var(--muted)" }}>
                {t.tr("Analiz ediliyor")}<span style={{ animation: "blink 1s infinite" }}>...</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1.5px solid var(--line)", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t.tr("Rapor talebinizi yazın...")}
            style={{ flex: 1, background: "var(--bg)", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", color: "var(--ink)", fontSize: 13, padding: "8px 12px", outline: "none" }} />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            style={{ background: "var(--accent)", border: "none", borderRadius: "var(--r-md)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", cursor: "pointer", opacity: !input.trim() || loading ? 0.5 : 1 }}>
            {t.tr("Gönder")}
          </button>
        </div>
      </Card>

      {/* Report output panel */}
      <Card style={{ display: "flex", flexDirection: "column" }}>
        {reportData ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                <AccentBar gradient="linear-gradient(180deg,#8b5cf6,#3b82f6)" />
                {reportData.title}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => {
                  const headers = Object.keys((reportData.data[0] as object));
                  const rows = [headers, ...(reportData.data as object[]).map(r => Object.values(r))];
                  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
                  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                  a.download = reportData.title + ".csv"; a.click();
                }}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: "var(--r-md)", border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", cursor: "pointer" }}>
                  {t.tr("CSV İndir")}
                </button>
                <button onClick={() => window.print()}
                  style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: "var(--r-md)", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer" }}>
                  PDF
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={reportData.data as object[]} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} angle={-25} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 12 }} />
                {Object.keys(reportData.data[0] as object).filter(k => k !== "name").map((key, i) => (
                  <Bar key={key} dataKey={key} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            {/* Data table */}
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{Object.keys(reportData.data[0] as object).map(h => <th key={h} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textAlign: "left", borderBottom: "1.5px solid var(--line)", textTransform: "uppercase" }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(reportData.data as object[]).map((row, i) => (
                    <tr key={i} className="reports-table-row">
                      {Object.values(row).map((val, j) => <td key={j} style={{ padding: "7px 10px", fontSize: 12, color: "var(--ink-2)", borderBottom: "1px solid var(--line)" }}>{String(val)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ fontSize: 48 }}>✦</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{t.tr("AI Rapor Asistanı")}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: 340 }}>
              {t.tr("Soldaki sohbet alanından bir rapor talebi yapın. AI, verilerinizi analiz ederek grafik ve tablo formatında rapor üretir.")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
              {[
                "Bu ay en çok tamamlanan kursları göster",
                "Sınav başarı oranlarını analiz et",
                "Departman yetkinlik karşılaştırması yap",
                "React kursunun performansını analiz et",
              ].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  style={{ fontSize: 12, padding: "6px 12px", borderRadius: 99, border: "1.5px solid var(--line)", background: "var(--panel)", color: "var(--ink-2)", cursor: "pointer" }}>
                  {t.tr(q)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
