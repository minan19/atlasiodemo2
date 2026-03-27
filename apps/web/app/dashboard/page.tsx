"use client";

import React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PanelShell } from "../_components/panel-shell";
import { useRole } from "../_components/role-context";
import { useI18n } from "../_i18n/use-i18n";
import { api } from "../api/client";

const navSections = [
  {
    title: "Yönetim",
    items: [
      { label: "Genel Bakış", href: "/dashboard", icon: "🏠" },
      { label: "Kullanıcılar", href: "/admin", icon: "👥" },
      { label: "Programlar", href: "/courses", icon: "📚" },
      { label: "Raporlar", href: "/admin/reports", icon: "📈" },
      { label: "Öğrenme Planları", href: "/learning-plans", icon: "🗺️" },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { label: "Onay Kuyruğu", href: "/admin/approvals", icon: "✅" },
      { label: "Finans", href: "/admin/payments", icon: "💳" },
      { label: "Güvenlik", href: "/admin/security", icon: "🛡️" },
      { label: "Sınav Gözetimi", href: "/admin/proctoring", icon: "🔍" },
      { label: "Risk Analitik", href: "/instructor/analytics", icon: "⚠️" },
      { label: "Gözlemlenebilirlik", href: "/admin/observability", icon: "🔭" },
      { label: "Gönüllü İçerik", href: "/admin/volunteer", icon: "🙋" },
      { label: "Bildirimler", href: "/notifications", icon: "🔔" },
    ],
  },
  {
    title: "Kurumsal",
    items: [
      { label: "SSO Entegrasyonları", href: "/admin/sso", icon: "🔑" },
      { label: "Bölümler", href: "/admin/departments", icon: "🏛️" },
      { label: "Araçlar & LTI", href: "/admin/tools", icon: "🔧" },
      { label: "Entegrasyonlar", href: "/admin/connectors", icon: "🔌" },
      { label: "Otomasyon", href: "/admin/automation", icon: "⚙️" },
      { label: "Sertifika Yenileme", href: "/certificates/renewal", icon: "🏅" },
    ],
  },
  {
    title: "AI & Güvenlik",
    items: [
      { label: "Ghost Mentor", href: "/ghost-mentor", icon: "👻" },
      { label: "AI Ajanlar", href: "/admin/ai-agents", icon: "🤖" },
      { label: "AI Güvenlik", href: "/admin/ai-safety", icon: "🛡️" },
      { label: "Savunma Merkezi", href: "/admin/defense", icon: "⚔️" },
    ],
  },
];

type VolunteerContentItem = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  createdAt?: string;
  User?: { name?: string | null; email: string } | null;
};

type AuditEntry = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  createdAt: string;
};

type KpiData = {
  activeUsers: number;
  liveSessions: number;
  pendingCourses: number;
  monthlyRevenue: number;
  totalEnrollments: number;
};

type HealthItem = {
  name: string;
  status: string;
  detail: string;
};

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  enrollments: number;
  courses: number;
};

const quickActions = [
  { label: "Yeni program", href: "/courses" },
  { label: "Eğitmen onboarding", href: "/instructor" },
  { label: "Rapor oluştur", href: "/admin/reports" },
  { label: "Fiyatlandırma", href: "/admin/payments" },
  { label: "🔔 Bildirimler", href: "/notifications" },
];

const notifications = [
  { label: "Tüm platform", value: "all" },
  { label: "Eğitmenler", value: "instructors" },
  { label: "Öğrenciler", value: "students" },
  { label: "Veliler", value: "guardians" },
];

function fmtRevenue(val: number): string {
  if (val >= 1_000_000) return `₺${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₺${(val / 1_000).toFixed(0)}K`;
  return `₺${val}`;
}

/** Son 7 günlük gelir eğilimi — API'den tarihsel veri gelene kadar simüle edilmiş */
function buildRevenueData(currentMonthRevenue: number) {
  const base = Math.max(currentMonthRevenue / 7, 1000);
  return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day, i) => ({
    day,
    gelir: Math.round(base * (0.7 + Math.random() * 0.6 + (i === 6 ? 0.4 : 0))),
  }));
}

/** Son 8 saatteki canlı oturum dağılımı */
function buildSessionData(liveSessions: number) {
  return Array.from({ length: 8 }, (_, i) => ({
    saat: `${(new Date().getHours() - 7 + i + 24) % 24}:00`,
    oturum: i === 7 ? liveSessions : Math.floor(Math.random() * (liveSessions + 10) + 2),
  }));
}

function KpiSkeleton() {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2 w-20 bg-slate-100 rounded" />
    </div>
  );
}

function SectionHeading({ children, pill }: { children: React.ReactNode; pill?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
        {children}
      </h2>
      {pill && <span className="pill text-xs">{pill}</span>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { role } = useRole();
  const t = useI18n();
  const allowed = role === "admin" || role === "head-instructor";

  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthItem[] | null>(null);
  const [tenants, setTenants] = useState<TenantItem[] | null>(null);

  // Onay kuyruğu — SWR (değişim sıklığı düşük)
  const { data: volunteerItems } = useSWR<VolunteerContentItem[]>(
    allowed ? "/volunteer-contents/admin" : null,
    api,
    { revalidateOnFocus: false }
  );

  // Alarmlar — WebSocket push (polling yerine)
  const [alarmLogs, setAlarmLogs] = useState<AuditEntry[] | null>(null);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);

  const loadInitialAlarms = useCallback(async () => {
    if (!allowed) return;
    try {
      const data = await api<AuditEntry[]>("/notifications/alarms");
      setAlarmLogs(data);
    } catch { /* sessiz hata */ }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;

    // İlk yüklemede REST ile mevcut alarmları çek
    loadInitialAlarms();

    // WebSocket bağlantısı kur
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) return;

    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

    import("socket.io-client").then(({ io }) => {
      const socket = io(`${apiBase}/notifications`, {
        auth: { token },
        transports: ["websocket"],
        reconnectionDelay: 2000,
      });

      socket.on("alarm", (payload: AuditEntry) => {
        setAlarmLogs((prev) => [payload, ...(prev ?? [])].slice(0, 20));
      });

      socketRef.current = socket;
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [allowed, loadInitialAlarms]);

  useEffect(() => {
    if (!allowed) return;
    api<KpiData>("/admin/reports/kpi")
      .then(setKpi)
      .catch((e: Error) => setKpiError(e.message));
    api<HealthItem[]>("/admin/reports/system-health")
      .then(setHealth)
      .catch(() => null);
    api<TenantItem[]>("/admin/reports/tenants")
      .then(setTenants)
      .catch(() => null);
  }, [allowed]);

  const approvals = volunteerItems
    ? volunteerItems
        .filter((v) => v.status === "PENDING")
        .slice(0, 5)
        .map((v) => ({
          id: v.id,
          title: v.title,
          owner: v.User?.name ?? v.User?.email ?? "Eğitmen",
          time: v.createdAt ? new Date(v.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—",
        }))
    : null;

  const audits = alarmLogs
    ? alarmLogs.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.action,
        detail: [a.entity, a.entityId].filter(Boolean).join(" · ") || "—",
        time: new Date(a.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      }))
    : null;

  if (!allowed) {
    return (
      <div className="glass rounded-2xl border border-slate-200 p-6 space-y-3">
        <div className="text-lg font-semibold">{t.dashboard.deniedTitle}</div>
        <div className="text-sm text-slate-600">{t.dashboard.deniedDesc(role)}</div>
        <div className="flex gap-2">
          <Link href="/whiteboard" className="btn-link">Tahtaya git</Link>
          <Link href="/courses" className="btn-link">Ders katalogu</Link>
        </div>
      </div>
    );
  }

  const kpis = kpi
    ? [
        { label: "Aktif kullanıcı", value: kpi.activeUsers.toLocaleString("tr-TR"), delta: "toplam aktif" },
        { label: "Canlı oturum", value: String(kpi.liveSessions), delta: "şu an" },
        { label: "Bekleyen içerik", value: String(kpi.pendingCourses), delta: "yayına girmedi" },
        { label: "Aylık gelir", value: fmtRevenue(Number(kpi.monthlyRevenue)), delta: "bu ay" },
      ]
    : null;

  return (
    <PanelShell
      roleLabel="Yönetici Merkezi"
      userName="Kurumsal Kontrol"
      userSub="Atlasio operasyon paneli"
      navSections={navSections}
    >
      <div className="space-y-6">
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Yönetici Merkezi</div>
          <h1 className="text-3xl font-semibold">Kurumsal eğitim kontrol odası</h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            Kullanıcı, içerik ve gelir akışları tek panelde. Sağlık durumu, onay kuyruğu ve riskler burada.
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href} className="btn-link text-sm">
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {kpiError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          KPI verileri yüklenemedi: {kpiError}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {kpis
          ? kpis.map((k, i) => {
              const variants = [
                { bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200', val: 'text-blue-700', icon: '👥' },
                { bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200', val: 'text-rose-700', icon: '🔴' },
                { bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', val: 'text-amber-700', icon: '📋' },
                { bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200', val: 'text-emerald-700', icon: '💰' },
              ];
              const v = variants[i % variants.length];
              return (
                <div key={k.label} className={`rounded-2xl border ${v.bg} p-4 shadow-sm`}>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                    <span>{v.icon}</span>
                    <span>{k.label}</span>
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${v.val}`}>{k.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{k.delta}</div>
                </div>
              );
            })
          : Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="Canlı metrikler">Global Dashboard</SectionHeading>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-500">Gelir akışı (son 7 gün)</div>
                <span className="text-xs font-semibold text-emerald-600">
                  {kpi ? fmtRevenue(Number(kpi.monthlyRevenue)) : "—"}
                </span>
              </div>
              {kpi ? (
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={buildRevenueData(Number(kpi.monthlyRevenue))} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: unknown) => fmtRevenue(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="gelir" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 rounded-xl bg-emerald-50 animate-pulse" />
              )}
            </div>
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-500">Canlı oturum (son 8 saat)</div>
                <span className="text-xs font-semibold text-blue-600">
                  {kpi ? `${kpi.liveSessions} aktif` : "—"}
                </span>
              </div>
              {kpi ? (
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={buildSessionData(kpi.liveSessions)} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eff6ff" />
                    <XAxis dataKey="saat" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="oturum" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 rounded-xl bg-blue-50 animate-pulse" />
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Toplam kayıt</div>
              <div className="text-lg font-bold text-violet-700">{kpi ? kpi.totalEnrollments.toLocaleString("tr-TR") : "—"}</div>
              <div className="text-[11px] text-slate-400">Tüm zamanlar</div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Canlı sınıf</div>
              <div className="text-lg font-bold text-rose-700">{kpi ? kpi.liveSessions : "—"}</div>
              <div className="text-[11px] text-slate-400">Şu an</div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Aktif kullanıcı</div>
              <div className="text-lg font-bold text-blue-700">{kpi ? kpi.activeUsers.toLocaleString("tr-TR") : "—"}</div>
              <div className="text-[11px] text-slate-400">Kayıtlı & aktif</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="Push Center">Duyuru & Bildirim</SectionHeading>
          <div className="space-y-2">
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none transition-colors">
              {notifications.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none transition-colors" placeholder="Başlık" />
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none transition-colors" rows={4} placeholder="Duyuru mesajı" />
            <div className="flex gap-2">
              <button className="btn-link flex-1">Önizleme</button>
              <button className="btn-link flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-emerald-500">Gönder</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="Kurumsal müşteriler">Tenant & Kullanıcı Yönetimi</SectionHeading>
          <div className="space-y-2">
            {!tenants
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse h-14" />
                ))
              : tenants.length === 0
              ? <div className="text-sm text-slate-500 py-3 text-center">Henüz tenant kaydı yok.</div>
              : tenants.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.slug} · {t.enrollments} kayıt · {t.courses} kurs
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className={`pill ${t.status !== "active" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                        {t.status === "active" ? "✓ Aktif" : t.status}
                      </span>
                      <button className="btn-link">Düzenle</button>
                    </div>
                  </div>
                ))}
          </div>
          <div className="flex gap-2 text-xs">
            <button className="btn-link">Yeni Tenant</button>
            <button className="btn-link">Rol Dağıtımı</button>
            <button className="btn-link">CSV İçeri Aktar</button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="Defense Service">Sistem Logları & Güvenlik</SectionHeading>
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Şüpheli giriş denetimi</span>
              <span className="pill text-[11px] bg-rose-50 border-rose-200 text-rose-700">2 uyarı</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Yedekleme durumları</span>
              <span className="pill text-[11px] bg-emerald-50 border-emerald-200 text-emerald-700">Aktif</span>
            </div>
            <div className="flex items-center justify-between">
              <span>IP kara liste</span>
              <span className="pill text-[11px]">3 IP</span>
            </div>
            <button className="btn-link w-full justify-center text-xs">Logları incele</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="SLA 99.97%">Sistem sağlığı</SectionHeading>
          <div className="grid gap-3 md:grid-cols-2">
            {!health
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse h-16" />
                ))
              : health.map((h) => (
                  <div key={h.name} className={`rounded-xl border p-3 ${h.status === "Uyarı" || h.status === "Hata" ? "border-amber-100 bg-amber-50/50" : "border-emerald-100 bg-emerald-50/40"}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{h.name}</div>
                      <span className={`pill text-[11px] ${h.status === "Uyarı" || h.status === "Hata" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                        {h.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{h.detail}</div>
                  </div>
                ))}
          </div>
        </div>

        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill={approvals ? `${approvals.length} öğe` : "Yükleniyor..."}>Onay kuyruğu</SectionHeading>
          <div className="space-y-2">
            {!approvals
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse space-y-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                ))
              : approvals.length === 0
              ? <div className="text-sm text-slate-500 py-3 text-center">Bekleyen onay yok.</div>
              : approvals.map((a) => (
                  <div key={a.id} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2 hover:border-amber-200 transition-all">
                    <div className="font-semibold text-sm">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.owner} · {a.time}</div>
                    <div className="flex gap-2 text-xs">
                      <button className="btn-link text-emerald-700 border-emerald-200 bg-emerald-50">✓ Onayla</button>
                      <button className="btn-link text-rose-700 border-rose-200 bg-rose-50">↩ Geri çevir</button>
                      <button className="btn-link">Detay</button>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="Bu ay">Finans özeti</SectionHeading>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Toplam kayıt</div>
              <div className="text-lg font-bold text-violet-700">{kpi ? kpi.totalEnrollments.toLocaleString("tr-TR") : "—"}</div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Bekleyen</div>
              <div className="text-lg font-bold text-amber-700">{kpi ? kpi.pendingCourses : "—"}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-3">
              <div className="text-xs text-slate-500">Aylık gelir</div>
              <div className="text-lg font-bold text-emerald-700">{kpi ? fmtRevenue(Number(kpi.monthlyRevenue)) : "—"}</div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <SectionHeading pill="KVKK uyumlu">Denetim & güvenlik</SectionHeading>
          <div className="space-y-2">
            {!audits
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse space-y-1">
                    <div className="h-4 w-1/2 bg-slate-200 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                  </div>
                ))
              : audits.length === 0
              ? <div className="text-sm text-slate-500 py-3 text-center">Denetim kaydı yok.</div>
              : audits.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3 hover:border-slate-300 transition-all">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{a.detail}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{a.time}</div>
                  </div>
                ))}
          </div>
        </div>
      </section>
      </div>
    </PanelShell>
  );
}
