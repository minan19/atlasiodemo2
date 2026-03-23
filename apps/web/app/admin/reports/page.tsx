"use client";

import useSWR from "swr";
import { api } from "../../api/client";
import { useState } from "react";
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

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

function trustColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 60) return "#f59e0b";
  return "#10b981";
}

export default function AdminReportsPage() {
  const { data: financeRaw } = useSWR<FinanceData>("/admin/reports/finance", api, { revalidateOnFocus: false });
  const { data: intelRaw } = useSWR<IntelData>("/admin/reports/intel", api, { revalidateOnFocus: false });
  const { data: salesRaw } = useSWR<SalesData>("/admin/reports/sales-ai", api, { revalidateOnFocus: false });

  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "intel">("overview");

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
    <main className="space-y-6 pb-12">
      {/* Demo Banner */}
      {isDemo && (
        <div className="rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span className="font-semibold">Demo Modu:</span> API verisi bulunamadı, örnek veriler gösteriliyor.
        </div>
      )}

      {/* Header */}
      <header className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hero">
        <div className="hero-content flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">
              <span className="status-dot online" />
              Yönetici Paneli
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Analitik & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Raporlar</span></h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Finans · İstihbarat · Satış AI</p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-link text-sm px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => window.print()}
            >
              CSV İndir
            </button>
            <button
              className="btn-link text-sm px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              onClick={() => window.print()}
            >
              PDF (Yazdır)
            </button>
          </div>
        </div>
      </header>

      {/* KPI Summary Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Toplam Gelir</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            ₺{(finance?.revenueTotal ?? 0).toLocaleString("tr-TR")}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Tüm zamanlar</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/40">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wide">Canlı Oturumlar</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{intel?.sessionsLive ?? 0}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Şu an aktif</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-400 uppercase tracking-wide">Devam Oranı</p>
          <p className="mt-1 text-2xl font-bold text-violet-900 dark:text-violet-100">
            {intel?.attendance != null ? `${intel.attendance}%` : "—"}
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">Bu hafta</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Satış AI Skoru</p>
          <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
            {topCourses.length > 0 ? "★★★★☆" : "—"}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{topCourses.length} aktif kurs</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-1 glass rounded-xl p-1 border border-slate-200 dark:border-slate-700 w-fit">
        {(["overview", "finance", "intel"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "overview" ? "Genel Bakış" : tab === "finance" ? "Finans" : "İstihbarat"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-base font-bold flex items-center gap-2 mb-4">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
              Haftalık Gelir Trendi
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₺${v.toLocaleString()}`} />
                <Tooltip formatter={(val: unknown) => [`₺${Number(val).toLocaleString("tr-TR")}`, "Gelir"]} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sales AI Section */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
              Satış AI Önerileri
            </h2>
            {sales?.recommendation && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Öneri: </span>{sales.recommendation}
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-3">
              {topCourses.map((course) => {
                const count = course.enrollments?.length ?? 0;
                const pct = Math.round((count / maxEnrollment) * 100);
                return (
                  <div key={course.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                    <p className="text-sm font-medium leading-snug">{course.title ?? "Kurs"}</p>
                    <p className="text-xs text-slate-500">{count} kayıt</p>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === "finance" && (
        <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400 inline-block" />
              Son Ödemeler
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Eğitmen</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tutar</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tarih</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {payouts.slice(0, 10).map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20"}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.instructorId ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">₺{Number(p.amount ?? 0).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                        Ödendi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Intel Tab */}
      {activeTab === "intel" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Risky Sessions */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-400 to-orange-400 inline-block" />
              Canlı Öğrenciler (Riskli)
            </h2>
            <div className="space-y-3">
              {(intel?.risky ?? []).map((r) => {
                const score = r.finalTrustScore ?? 0;
                const color = trustColor(score);
                return (
                  <div key={r.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-400">{r.sessionId ?? r.id}</span>
                      <span className="font-semibold" style={{ color }}>{score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {(intel?.risky ?? []).length === 0 && (
                <p className="text-sm text-slate-400">Riskli oturum bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <h2 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-purple-400 inline-block" />
              Risk Dağılımı
            </h2>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: unknown) => [String(val), "Oturum"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Mini Bar Chart */}
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={riskDistribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Tooltip formatter={(val: unknown) => [String(val), "Oturum"]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
