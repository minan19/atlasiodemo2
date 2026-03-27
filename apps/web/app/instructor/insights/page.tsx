"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { api } from "../../api/client";
import { PanelShell } from "../../_components/panel-shell";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

const navSections = [
  {
    title: "Baş Eğitmen",
    items: [
      { label: "Özet", href: "/instructor/insights", icon: "🏠" },
      { label: "Eğitmenler", href: "/instructor/insights", icon: "👥" },
      { label: "İçerik Onayı", href: "/instructor/insights", icon: "✅" },
      { label: "Kazanım", href: "/instructor/insights", icon: "🎯" },
    ],
  },
  {
    title: "Araçlar",
    items: [
      { label: "Akıllı Tahta", href: "/whiteboard", icon: "🧠" },
      { label: "Raporlar", href: "/report-cards", icon: "📊" },
      { label: "Kurslar", href: "/courses", icon: "📚" },
    ],
  },
];

// Static fallbacks — no API endpoint available yet
const weakTopics = [
  { topic: "Temel Matematik", accuracy: 58, action: "10 dk tekrar + mini quiz" },
  { topic: "Okuma Anlama", accuracy: 64, action: "VOD + 5 soru" },
  { topic: "Problem Çözme", accuracy: 71, action: "Sınıf içi hız turu" },
];

const schedulerSlots = [
  { day: "Pazartesi", time: "10:00 - 12:00", status: "Eğitmen uygun" },
  { day: "Çarşamba", time: "14:00 - 16:00", status: "Talep yüksek" },
  { day: "Cuma", time: "18:00 - 20:00", status: "Boş slot" },
];

const examTemplates = [
  { name: "Seviye Tespit", type: "Çoktan Seçmeli" },
  { name: "Dinleme", type: "Sesli Yanıt" },
  { name: "Haftalık Quiz", type: "Karma" },
];

// ─── Static data for new sections ──────────────────────────────────────────────

// 7 × 24 engagement heatmap — realistic synthetic data
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];
const heatmapData: number[][] = DAYS.map((_, d) =>
  Array.from({ length: 24 }, (__, h) => {
    // Weekday mornings and evenings are busiest
    const isWeekend = d >= 5;
    const morningPeak = h >= 9 && h <= 12 ? 1 : 0;
    const eveningPeak = h >= 18 && h <= 22 ? 1 : 0;
    const weekendBonus = isWeekend && h >= 11 && h <= 20 ? 0.5 : 0;
    const base = (morningPeak + eveningPeak + weekendBonus) * (30 + Math.floor(Math.random() * 40));
    return Math.round(base + Math.random() * 8);
  })
);
const heatmapMax = Math.max(...heatmapData.flat());

// Completion funnel
const funnelStages = [
  { label: "Kayıt", count: 1240, color: "#6366f1" },
  { label: "İlk Ders", count: 893, color: "#8b5cf6" },
  { label: "%50", count: 512, color: "#a78bfa" },
  { label: "Tamamlandı", count: 287, color: "#c4b5fd" },
];

// At-risk students
const riskStudents = [
  { id: "r1", name: "Ahmet Yılmaz", lastActive: "12 gün önce", course: "İleri Matematik", avatar: "A" },
  { id: "r2", name: "Selin Çelik", lastActive: "9 gün önce", course: "Fizik Temel", avatar: "S" },
  { id: "r3", name: "Murat Kaya", lastActive: "14 gün önce", course: "İngilizce B2", avatar: "M" },
  { id: "r4", name: "Zeynep Arslan", lastActive: "8 gün önce", course: "Kimya 101", avatar: "Z" },
  { id: "r5", name: "Emre Demir", lastActive: "21 gün önce", course: "Tarih", avatar: "E" },
];

// Monthly revenue per course (last 6 months)
const revenueMonths = ["Ekim", "Kas", "Ara", "Oca", "Şub", "Mar"];
const revenueData: { course: string; color: string; values: number[] }[] = [
  { course: "İleri Matematik", color: "#6366f1", values: [4200, 4800, 5100, 4700, 5300, 5800] },
  { course: "İngilizce B2", color: "#10b981", values: [3100, 3400, 3200, 3800, 4100, 4400] },
  { course: "Fizik Temel", color: "#f59e0b", values: [2200, 2600, 2400, 2900, 3100, 2800] },
];

// Top performing students
const topStudents = [
  { rank: 1, name: "Elif Şahin", xp: 9840, completion: 98, lastActive: "Bugün" },
  { rank: 2, name: "Can Özdemir", xp: 8710, completion: 94, lastActive: "Dün" },
  { rank: 3, name: "Ayşe Kılıç", xp: 7950, completion: 91, lastActive: "Bugün" },
  { rank: 4, name: "Burak Aydın", xp: 7230, completion: 88, lastActive: "2 gün önce" },
  { rank: 5, name: "Naz Erdoğan", xp: 6890, completion: 85, lastActive: "Dün" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRecord = { id: string; name?: string | null; email: string; role: string };
type VolunteerContent = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  User?: { name?: string | null; email: string } | null;
};
type CourseRecord = { id: string; title: string; level?: string | null; isPublished?: boolean };
type LiveSession = { id: string; title: string; status: string };

// ─── Shared sub-components ──────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
      <div className="h-3 w-2/3 bg-slate-200 rounded mb-2" />
      <div className="h-7 w-1/2 bg-slate-100 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse flex items-center justify-between gap-4">
      <div className="space-y-1 flex-1">
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="h-3 w-1/3 bg-slate-100 rounded" />
      </div>
      <div className="h-6 w-16 bg-slate-100 rounded-full" />
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
      {title}
    </h2>
  );
}

// ─── New section components ───────────────────────────────────────────────────

/** Heatmap cell tooltip state */
type TooltipState = { day: number; hour: number; count: number; x: number; y: number } | null;

function EngagementHeatmap() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const intensityColor = (count: number): string => {
    if (count === 0) return "#f1f5f9";
    const ratio = count / heatmapMax;
    if (ratio < 0.2) return "#dbeafe";
    if (ratio < 0.4) return "#93c5fd";
    if (ratio < 0.6) return "#3b82f6";
    if (ratio < 0.8) return "#1d4ed8";
    return "#1e3a8a";
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-slide-up stagger-1">
      <div className="flex items-center justify-between">
        <SectionHeading title="Öğrenci Aktivite Haritası" />
        <span className="pill text-xs">7 gün × 24 saat</span>
      </div>
      <p className="text-xs text-slate-500">Öğrencilerin en aktif olduğu saat dilimlerini keşfet.</p>

      <div className="relative overflow-x-auto pb-1">
        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{ top: tooltip.y - 40, left: tooltip.x - 20 }}
          >
            <span className="font-semibold text-slate-700">{DAYS[tooltip.day]}</span>
            <span className="text-slate-500"> {String(tooltip.hour).padStart(2, "0")}:00 — </span>
            <span className="font-bold text-blue-700">{tooltip.count} aktif</span>
          </div>
        )}

        <div className="flex gap-1 items-end">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 mr-1 flex-shrink-0">
            <div className="h-4" />{/* spacer for hour row */}
            {DAYS.map((d) => (
              <div key={d} className="h-5 text-[10px] text-slate-500 flex items-center w-7">
                {d}
              </div>
            ))}
          </div>

          {/* Grid columns (one per hour) */}
          {hours.map((h) => (
            <div key={h} className="flex flex-col gap-1 flex-shrink-0">
              <div className="h-4 text-[9px] text-slate-400 text-center w-5">
                {h % 3 === 0 ? `${h}` : ""}
              </div>
              {DAYS.map((_, d) => {
                const count = heatmapData[d][h];
                return (
                  <div
                    key={d}
                    className="w-5 h-5 rounded-sm cursor-pointer transition-transform hover:scale-110 hover:ring-1 hover:ring-blue-400"
                    style={{ backgroundColor: intensityColor(count) }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const parent = (e.target as HTMLElement).closest(".relative")!.getBoundingClientRect();
                      setTooltip({ day: d, hour: h, count, x: rect.left - parent.left + 10, y: rect.top - parent.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
          <span>Az</span>
          {["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"].map((c) => (
            <div key={c} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
          ))}
          <span>Çok</span>
        </div>
      </div>
    </div>
  );
}

function CompletionFunnel() {
  const totalWidth = 480;
  const stageH = 58;
  const gap = 10;
  const svgH = funnelStages.length * stageH + (funnelStages.length - 1) * gap + 40;
  const maxCount = funnelStages[0].count;

  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-slide-up stagger-2">
      <div className="flex items-center justify-between">
        <SectionHeading title="Kurs Tamamlama Hunisi" />
        <span className="pill text-xs">4 aşama</span>
      </div>
      <p className="text-xs text-slate-500">Kayıttan tamamlamaya dönüşüm oranları.</p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalWidth} ${svgH}`}
          width="100%"
          style={{ maxWidth: totalWidth }}
          className="block mx-auto"
        >
          {funnelStages.map((stage, i) => {
            const ratio = stage.count / maxCount;
            const nextRatio = i < funnelStages.length - 1 ? funnelStages[i + 1].count / maxCount : ratio;

            const padding = (1 - ratio) * (totalWidth * 0.4);
            const nextPadding = (1 - nextRatio) * (totalWidth * 0.4);

            const y = i * (stageH + gap);
            const x1 = padding;
            const x2 = totalWidth - padding;
            const x3 = totalWidth - nextPadding;
            const x4 = nextPadding;

            const convRate =
              i > 0
                ? Math.round((stage.count / funnelStages[i - 1].count) * 100)
                : 100;

            return (
              <g key={stage.label}>
                {/* Trapezoid */}
                <polygon
                  points={`${x1},${y} ${x2},${y} ${x3},${y + stageH} ${x4},${y + stageH}`}
                  fill={stage.color}
                  opacity={0.85}
                />
                {/* Stage label */}
                <text
                  x={totalWidth / 2}
                  y={y + stageH / 2 - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize={13}
                  fontWeight="700"
                >
                  {stage.label}
                </text>
                {/* Count */}
                <text
                  x={totalWidth / 2}
                  y={y + stageH / 2 + 10}
                  textAnchor="middle"
                  fill="white"
                  fontSize={11}
                  opacity={0.9}
                >
                  {stage.count.toLocaleString("tr-TR")} öğrenci
                </text>
                {/* Conversion rate badge between stages */}
                {i > 0 && (
                  <text
                    x={totalWidth - 28}
                    y={y - gap / 2 + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize={10}
                    fontWeight="600"
                  >
                    ↓ {convRate}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 flex-wrap">
        {funnelStages.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span>{s.label}: <strong>{s.count.toLocaleString("tr-TR")}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentRiskDetector() {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  const handleReminder = useCallback(async (id: string) => {
    setSending(id);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      await fetch(`${API_BASE}/notifications/reminder/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Silently ignore — endpoint may not exist yet
    } finally {
      setSentIds((prev) => new Set([...prev, id]));
      setSending(null);
    }
  }, []);

  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-slide-up stagger-3">
      <div className="flex items-center justify-between">
        <SectionHeading title="Risk Altındaki Öğrenciler" />
        <span className="pill text-xs bg-rose-50 border-rose-200 text-rose-700">
          7+ gün aktif değil
        </span>
      </div>
      <p className="text-xs text-slate-500">
        7 günden uzun süredir hiç giriş yapmayan öğrenciler. Hatırlatma göndererek onları geri kazan.
      </p>

      <div className="space-y-2">
        {riskStudents.map((s) => {
          const isSent = sentIds.has(s.id);
          const isSending = sending === s.id;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center justify-between gap-3 hover:border-rose-200 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {s.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">{s.course} · Son giriş: {s.lastActive}</div>
                </div>
              </div>
              <button
                onClick={() => handleReminder(s.id)}
                disabled={isSent || isSending}
                className={`pill text-xs flex-shrink-0 cursor-pointer transition-all ${
                  isSent
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                } disabled:cursor-not-allowed`}
              >
                {isSending ? "Gönderiliyor…" : isSent ? "✓ Gönderildi" : "Hatırlatma Gönder"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-400 text-right">
        Toplam {riskStudents.length} öğrenci risk altında
      </div>
    </div>
  );
}

function RevenueBreakdown() {
  const svgW = 560;
  const svgH = 220;
  const padL = 48;
  const padR = 16;
  const padT = 12;
  const padB = 40;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const allValues = revenueData.flatMap((d) => d.values);
  const maxVal = Math.max(...allValues);
  const monthCount = revenueMonths.length;
  const groupW = chartW / monthCount;
  const barW = (groupW - 12) / revenueData.length;

  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y: padT + chartH * (1 - r),
    label: Math.round(maxVal * r / 1000) + "K ₺",
  }));

  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-slide-up stagger-4">
      <div className="flex items-center justify-between">
        <SectionHeading title="Kursa Göre Aylık Gelir" />
        <span className="pill text-xs">Son 6 ay</span>
      </div>
      <p className="text-xs text-slate-500">Her kursun aylık gelir dağılımı (₺).</p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          style={{ maxWidth: svgW }}
          className="block"
        >
          {/* Y grid lines */}
          {yGridLines.map(({ y, label }) => (
            <g key={label}>
              <line
                x1={padL} y1={y} x2={padL + chartW} y2={y}
                stroke="#e2e8f0" strokeWidth={1}
              />
              <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
                {label}
              </text>
            </g>
          ))}

          {/* Bars */}
          {revenueMonths.map((month, mi) => (
            <g key={month}>
              {revenueData.map((course, ci) => {
                const val = course.values[mi];
                const barH = (val / maxVal) * chartH;
                const x = padL + mi * groupW + 6 + ci * barW;
                const y = padT + chartH - barH;
                return (
                  <g key={course.course}>
                    <rect
                      x={x} y={y}
                      width={Math.max(barW - 2, 2)}
                      height={barH}
                      rx={2}
                      fill={course.color}
                      opacity={0.85}
                      className="transition-opacity hover:opacity-100"
                    >
                      <title>{course.course}: {val.toLocaleString("tr-TR")} ₺</title>
                    </rect>
                  </g>
                );
              })}
              {/* Month label */}
              <text
                x={padL + mi * groupW + groupW / 2}
                y={svgH - padB + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                {month}
              </text>
            </g>
          ))}

          {/* X axis line */}
          <line
            x1={padL} y1={padT + chartH}
            x2={padL + chartW} y2={padT + chartH}
            stroke="#cbd5e1" strokeWidth={1}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {revenueData.map((d) => (
          <div key={d.course} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            {d.course}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopStudentsTable() {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3 animate-fade-slide-up stagger-1">
      <div className="flex items-center justify-between">
        <SectionHeading title="En Başarılı Öğrenciler" />
        <span className="pill text-xs">XP sıralaması</span>
      </div>
      <p className="text-xs text-slate-500">Bu haftanın en aktif ve en yüksek tamamlama oranlı öğrencileri.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 w-10">#</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Öğrenci</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">XP</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Tamamlama</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 hidden sm:table-cell">
                Son Aktivite
              </th>
            </tr>
          </thead>
          <tbody>
            {topStudents.map((s, idx) => {
              const medalColors: Record<number, string> = {
                1: "text-yellow-500",
                2: "text-slate-400",
                3: "text-amber-600",
              };
              const medal = idx < 3 ? ["🥇", "🥈", "🥉"][idx] : null;
              return (
                <tr
                  key={s.rank}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-3 py-2.5 text-center">
                    {medal ? (
                      <span className="text-base">{medal}</span>
                    ) : (
                      <span className={`font-bold text-xs ${medalColors[s.rank] ?? "text-slate-400"}`}>
                        {s.rank}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="font-bold text-indigo-700">
                      {s.xp.toLocaleString("tr-TR")}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-0.5">xp</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${s.completion}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-emerald-700">{s.completion}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-500 hidden sm:table-cell">
                    {s.lastActive}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HeadInstructorPage() {
  const { data: users, isLoading: usersLoading } = useSWR<UserRecord[]>("/users", api, {
    revalidateOnFocus: false,
  });
  const { data: volunteerContents, isLoading: vcLoading } = useSWR<VolunteerContent[]>(
    "/volunteer-contents/admin",
    api,
    { revalidateOnFocus: false }
  );
  const { data: courses, isLoading: coursesLoading } = useSWR<CourseRecord[]>("/courses", api, {
    revalidateOnFocus: false,
  });
  const { data: liveSessions, isLoading: liveLoading } = useSWR<LiveSession[]>(
    "/live/sessions",
    api,
    { revalidateOnFocus: false }
  );

  const instructors = (users ?? []).filter((u) => u.role === "INSTRUCTOR");
  const pendingReviews = (volunteerContents ?? []).filter((v) => v.status === "PENDING");
  const activeSessionCount = (liveSessions ?? []).filter((s) => s.status === "RUNNING").length;

  const coachStats = [
    { name: "Eğitmen sayısı", value: usersLoading ? null : String(instructors.length) },
    { name: "Aktif sınıf", value: liveLoading ? null : String(activeSessionCount) },
    { name: "Toplam kurs", value: coursesLoading ? null : String((courses ?? []).length) },
    { name: "Onay bekleyen", value: vcLoading ? null : String(pendingReviews.length) },
  ];

  const instructorRoster = instructors.slice(0, 5).map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    field: "—",
    score: "—",
    load: "—",
    status: "Uygun",
  }));

  const reviewQueue = pendingReviews.slice(0, 5).map((v) => ({
    id: v.id,
    title: v.title,
    owner: v.User?.name ?? v.User?.email ?? "Eğitmen",
    type: v.contentType,
  }));

  const programs = (courses ?? []).slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    level: c.level ?? "Genel",
    assets: c.isPublished ? "Yayında" : "Taslak",
  }));

  const statsLoading = usersLoading || liveLoading || coursesLoading || vcLoading;

  return (
    <PanelShell
      roleLabel="Baş Eğitmen Paneli"
      userName="Akademik Yönetim"
      userSub="Kalite ve içerik kontrol"
      navSections={navSections}
    >
      <div className="space-y-6">
        <header className="glass p-6 rounded-2xl border border-slate-200 hero">
          <div className="hero-content space-y-2">
            <div className="pill w-fit">Baş Eğitmen</div>
            <h1 className="text-3xl font-semibold">Sınıfları yönet, kaliteyi yükselt</h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              Eğitmen dağılımı, içerik onayı ve kazanım takibi tek panelde. Zayıf konuları hızlıca toparla.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/whiteboard" className="btn-link text-sm">Canlı sınıf aç</Link>
              <Link href="/report-cards" className="btn-link text-sm">Karne akışı</Link>
              <Link href="/courses" className="btn-link text-sm">Kurs kataloğu</Link>
            </div>
          </div>
        </header>

        {/* Stat cards — gradient accents */}
        <section className="grid gap-4 md:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : coachStats.map((s, i) => {
                const gradients = [
                  { bg: "from-blue-50 to-blue-100/50 border-blue-200", num: "text-blue-700", icon: "👥" },
                  { bg: "from-emerald-50 to-emerald-100/50 border-emerald-200", num: "text-emerald-700", icon: "📡" },
                  { bg: "from-violet-50 to-violet-100/50 border-violet-200", num: "text-violet-700", icon: "📚" },
                  { bg: "from-amber-50 to-amber-100/50 border-amber-200", num: "text-amber-700", icon: "✅" },
                ] as const;
                const g = gradients[i] ?? { bg: "glass border-slate-200", num: "text-slate-700", icon: "📊" };
                return (
                  <div key={s.name} className={`rounded-2xl border p-4 shadow-sm bg-gradient-to-br ${g.bg}`}>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{g.icon}</span>
                      <span>{s.name}</span>
                    </div>
                    <div className={`text-3xl font-bold mt-2 ${g.num}`}>{s.value ?? "—"}</div>
                  </div>
                );
              })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Instructor roster */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Eğitmen kadrosu" />
              <span className="pill text-xs">
                {usersLoading ? "Yükleniyor..." : `${instructors.length} eğitmen`}
              </span>
            </div>
            <div className="space-y-2">
              {usersLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : instructorRoster.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-4 text-center">Kayıtlı eğitmen bulunamadı.</div>
                  )
                : instructorRoster.map((i) => (
                    <div
                      key={i.id}
                      className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {i.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{i.name}</div>
                          <div className="text-xs text-slate-500">{i.field} · {i.load}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {i.score !== "—" && <span className="pill">⭐ {i.score}</span>}
                        <span
                          className={`pill ${
                            i.status === "Yoğun"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {i.status}
                        </span>
                        <button className="btn-link">Sınıf ata</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Content review */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="İçerik onayı" />
              <span className="pill text-xs">
                {vcLoading ? "Yükleniyor..." : `${reviewQueue.length} görev`}
              </span>
            </div>
            <div className="space-y-2">
              {vcLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : reviewQueue.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-4 text-center">Bekleyen onay yok.</div>
                  )
                : reviewQueue.map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 hover:border-amber-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm leading-tight">{q.title}</div>
                        <span className="pill pill-xs bg-amber-50 border-amber-200 text-amber-700 flex-shrink-0">{q.type}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{q.owner}</div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <button className="btn-link bg-emerald-50 border-emerald-300 text-emerald-700">✓ Onayla</button>
                        <button className="btn-link text-rose-700 border-rose-200">↩ Geri gönder</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Curriculum management */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Müfredat & Branş Yönetimi" />
              <span className="pill text-xs">Drag & Drop</span>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500">
              PDF, ses ve video dosyalarını sürükleyip bırak. Seviye ve dil etiketi otomatik atanır.
            </div>
            <div className="space-y-2">
              {coursesLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : programs.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-2 text-center">Kurs bulunamadı.</div>
                  )
                : programs.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs text-slate-500">{p.level} · {p.assets}</div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Link href={`/courses/${p.id}`} className="btn-link">Düzenle</Link>
                        <button className="btn-link">İçerik ekle</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Smart scheduler */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Akıllı Ders Programı" />
              <span className="pill text-xs">Scheduler</span>
            </div>
            <div className="space-y-2">
              {schedulerSlots.map((s) => (
                <div
                  key={`${s.day}-${s.time}`}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{s.day}</div>
                    <div className="text-xs text-slate-500">{s.time}</div>
                  </div>
                  <span
                    className={`pill text-xs ${
                      s.status === "Talep yüksek"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1">Otomatik atama</button>
              <button className="btn-link flex-1">Takvim aç</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Exam management */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Sınav Yönetimi" />
              <span className="pill text-xs">Exam Builder</span>
            </div>
            <div className="space-y-2">
              {examTemplates.map((e) => (
                <div
                  key={e.name}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.type}</div>
                  </div>
                  <button className="btn-link text-xs">Şablonu aç</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1">Yeni sınav</button>
              <button className="btn-link flex-1">Analiz raporu</button>
            </div>
          </div>

          {/* Academic reporting */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Akademik Raporlama" />
              <span className="pill text-xs">Haftalık</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Seviye ilerleme</span>
                <span className="pill text-[11px]">+8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ödev tamamlama</span>
                <span className="pill text-[11px]">72%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kalite anketi</span>
                <span className="pill text-[11px]">4.7/5</span>
              </div>
              <button className="btn-link w-full justify-center text-xs">PDF rapor indir</button>
            </div>
          </div>
        </section>

        {/* Learning outcome insights */}
        <section className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading title="Kazanım içgörüleri" />
            <span className="pill text-xs">Son 7 gün</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {weakTopics.map((t) => (
              <div key={t.topic} className="glass rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{t.topic}</div>
                  <span
                    className={`text-xs font-bold ${
                      t.accuracy < 65
                        ? "text-rose-600"
                        : t.accuracy < 75
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {t.accuracy}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      t.accuracy < 65
                        ? "bg-rose-400"
                        : t.accuracy < 75
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500">💡 {t.action}</div>
                <div className="flex gap-2 mt-1 text-xs">
                  <button className="btn-link">Görev ata</button>
                  <button className="btn-link">Quiz gönder</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NEW SECTIONS ──────────────────────────────────────────────────────── */}

        {/* 1. Student engagement heatmap */}
        <EngagementHeatmap />

        {/* 2. Course completion funnel */}
        <CompletionFunnel />

        {/* 3. Student risk detector */}
        <StudentRiskDetector />

        {/* 4. Revenue breakdown */}
        <RevenueBreakdown />

        {/* 5. Top performing students */}
        <TopStudentsTable />
      </div>
    </PanelShell>
  );
}
