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

/* ─── SVG Icon System ──────────────────────────────────────────────────── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = size;
  const icons: Record<string, React.ReactNode> = {
    home: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7 18v-7h6v7"/></svg>,
    users: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 18a6 6 0 0112 0"/><circle cx="15" cy="8" r="2.5"/><path d="M17 18a4 4 0 00-4-4"/></svg>,
    book: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3V4z"/></svg>,
    chart: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l4-6 4 3 4-8 2 11"/><path d="M3 17h14"/></svg>,
    map: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="1,4 7,1 13,4 19,1 19,17 13,20 7,17 1,20"/><line x1="7" y1="1" x2="7" y2="17"/><line x1="13" y1="4" x2="13" y2="20"/></svg>,
    analytics: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="10" width="3" height="8" rx="1"/><rect x="8.5" y="6" width="3" height="12" rx="1"/><rect x="15" y="2" width="3" height="16" rx="1"/></svg>,
    check: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4 4 8-8"/><circle cx="10" cy="10" r="8"/></svg>,
    card: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="16" height="12" rx="2"/><path d="M2 9h16"/><path d="M6 14h2"/></svg>,
    shield: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z"/></svg>,
    eye: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="2.5"/></svg>,
    alert: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L2 17h16L10 3z"/><line x1="10" y1="9" x2="10" y2="12"/><circle cx="10" cy="15" r="0.5" fill="currentColor"/></svg>,
    telescope: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10l-7-3 2-4 14 6-2 4-7-3z"/><path d="M10 10v7"/><path d="M8 17h4"/></svg>,
    heart: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z"/></svg>,
    bell: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2a6 6 0 016 6c0 3.5 1.5 5 1.5 5h-15S4 11.5 4 8a6 6 0 016-6z"/><path d="M8 17a2 2 0 004 0"/></svg>,
    key: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="8.5" r="4"/><path d="M10.5 11.5l7 7"/><path d="M14 15l2 2"/></svg>,
    building: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="14" height="16" rx="1"/><path d="M7 7h2M11 7h2M7 11h2M11 11h2M7 15h2M11 15h2"/></svg>,
    wrench: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2.5a4 4 0 00-4 4c0 .5.1 1 .3 1.5L4 14.5 5.5 16l6.5-6.8a4 4 0 104.5-6.7z"/></svg>,
    plug: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v4M13 2v4M5 10h10a2 2 0 010 4H5a2 2 0 010-4z"/><path d="M10 14v4"/></svg>,
    gear: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4"/></svg>,
    medal: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="12" r="5"/><path d="M7 7L5 2h10l-2 5"/><path d="M10 9v3l2 2"/></svg>,
    brain: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3C7 3 5 5 5 8c-2 0-3 1.5-3 3s1 3 3 3h1v3h8v-3h1c2 0 3-1.5 3-3s-1-3-3-3c0-3-2-5-5-5z"/></svg>,
    compass: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8"/><polygon points="10,5 11.5,9 15,10 11.5,11 10,15 8.5,11 5,10 8.5,9"/></svg>,
    trending: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,14 8,8 12,12 18,6"/><polyline points="14,6 18,6 18,10"/></svg>,
    ghost: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18l2.5-2 2.5 2 2.5-2 2.5 2V8a5 5 0 00-10 0v10z"/><circle cx="7.5" cy="9" r="1" fill="currentColor"/><circle cx="12.5" cy="9" r="1" fill="currentColor"/></svg>,
    speak: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="3"/><path d="M5 10a5 5 0 0010 0M3 10a7 7 0 0014 0"/></svg>,
    hash: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="16" y2="7"/><line x1="4" y1="13" x2="16" y2="13"/><line x1="7" y1="4" x2="6" y2="16"/><line x1="13" y1="4" x2="12" y2="16"/></svg>,
    robot: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="12" height="9" rx="2"/><circle cx="7.5" cy="11.5" r="1" fill="currentColor"/><circle cx="12.5" cy="11.5" r="1" fill="currentColor"/><path d="M7 16v2M13 16v2"/><path d="M10 7V4M8 4h4"/></svg>,
    lock: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0v3"/><circle cx="10" cy="14" r="1.5" fill="currentColor"/></svg>,
    sword: <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3l3 3-9 9-4 1 1-4 9-9z"/><line x1="3" y1="17" x2="6" y2="14"/></svg>,
  };
  return <>{icons[name] ?? <svg width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7"/></svg>}</>;
}

/* ─── Nav sections with SVG icons ─────────────────────────────────────── */
const navSections = [
  {
    title: "Yönetim",
    items: [
      { label: "Genel Bakış", href: "/dashboard", icon: <Icon name="home" /> },
      { label: "Kullanıcılar", href: "/admin", icon: <Icon name="users" /> },
      { label: "Programlar", href: "/courses", icon: <Icon name="book" /> },
      { label: "Raporlar", href: "/admin/reports", icon: <Icon name="chart" /> },
      { label: "Öğrenme Planları", href: "/learning-plans", icon: <Icon name="map" /> },
      { label: "Analitik", href: "/analytics", icon: <Icon name="analytics" /> },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { label: "Onay Kuyruğu", href: "/admin/approvals", icon: <Icon name="check" /> },
      { label: "Finans", href: "/admin/payments", icon: <Icon name="card" /> },
      { label: "Güvenlik", href: "/admin/security", icon: <Icon name="shield" /> },
      { label: "Sınav Gözetimi", href: "/admin/proctoring", icon: <Icon name="eye" /> },
      { label: "Risk Analitik", href: "/instructor/analytics", icon: <Icon name="alert" /> },
      { label: "Gözlemlenebilirlik", href: "/admin/observability", icon: <Icon name="telescope" /> },
      { label: "Gönüllü İçerik", href: "/admin/volunteer", icon: <Icon name="heart" /> },
      { label: "Bildirimler", href: "/notifications", icon: <Icon name="bell" /> },
    ],
  },
  {
    title: "Kurumsal",
    items: [
      { label: "SSO Entegrasyonları", href: "/admin/sso", icon: <Icon name="key" /> },
      { label: "Bölümler", href: "/admin/departments", icon: <Icon name="building" /> },
      { label: "Araçlar & LTI", href: "/admin/tools", icon: <Icon name="wrench" /> },
      { label: "Entegrasyonlar", href: "/admin/connectors", icon: <Icon name="plug" /> },
      { label: "Otomasyon", href: "/admin/automation", icon: <Icon name="gear" /> },
      { label: "Sertifika Yenileme", href: "/certificates/renewal", icon: <Icon name="medal" /> },
      { label: "E-Posta Yönetimi", href: "/admin/email", icon: <Icon name="bell" /> },
      { label: "İçerik Kütüphanesi", href: "/admin/content", icon: <Icon name="book" /> },
      { label: "Yetkilendirme", href: "/admin/authorization", icon: <Icon name="lock" /> },
    ],
  },
  {
    title: "Öğrenme Araçları",
    items: [
      { label: "Adaptif Sınav", href: "/adaptive-quiz", icon: <Icon name="brain" /> },
      { label: "Yol Haritası", href: "/roadmap", icon: <Icon name="compass" /> },
      { label: "İlerleme Takibi", href: "/progress", icon: <Icon name="trending" /> },
      { label: "Ghost Mentor", href: "/ghost-mentor", icon: <Icon name="ghost" /> },
      { label: "Dil Lab", href: "/language-lab", icon: <Icon name="speak" /> },
      { label: "Math Lab", href: "/math-lab", icon: <Icon name="hash" /> },
    ],
  },
  {
    title: "AI & Güvenlik",
    items: [
      { label: "AI Ajanlar", href: "/admin/ai-agents", icon: <Icon name="robot" /> },
      { label: "AI Güvenlik", href: "/admin/ai-safety", icon: <Icon name="lock" /> },
      { label: "Savunma Merkezi", href: "/admin/defense", icon: <Icon name="sword" /> },
    ],
  },
];

/* ─── Types ────────────────────────────────────────────────────────────── */
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

/* ─── Quick actions ────────────────────────────────────────────────────── */
const quickActions = [
  { label: "Yeni program", href: "/courses" },
  { label: "Eğitmen onboarding", href: "/instructor" },
  { label: "Rapor oluştur", href: "/admin/reports" },
  { label: "Fiyatlandırma", href: "/admin/payments" },
  { label: "Bildirimler", href: "/notifications" },
];

const notifications = [
  { label: "Tüm platform", value: "all" },
  { label: "Eğitmenler", value: "instructors" },
  { label: "Öğrenciler", value: "students" },
  { label: "Veliler", value: "guardians" },
];

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function fmtRevenue(val: number): string {
  if (val >= 1_000_000) return `₺${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₺${(val / 1_000).toFixed(0)}K`;
  return `₺${val}`;
}

function buildRevenueData(currentMonthRevenue: number) {
  const base = Math.max(currentMonthRevenue / 7, 1000);
  return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day, i) => ({
    day,
    gelir: Math.round(base * (0.7 + Math.random() * 0.6 + (i === 6 ? 0.4 : 0))),
  }));
}

function buildSessionData(liveSessions: number) {
  return Array.from({ length: 8 }, (_, i) => ({
    saat: `${(new Date().getHours() - 7 + i + 24) % 24}:00`,
    oturum: i === 7 ? liveSessions : Math.floor(Math.random() * (liveSessions + 10) + 2),
  }));
}

/* ─── UI Primitives ────────────────────────────────────────────────────── */
function KpiSkeleton() {
  return (
    <div style={{
      borderRadius: "var(--r-xl)",
      background: "var(--panel)",
      border: "1.5px solid var(--line)",
      padding: 16,
      boxShadow: "var(--shadow-sm)",
    }}>
      <style>{`@keyframes dPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {[24, 28, 20].map((w, i) => (
        <div key={i} style={{
          height: i === 1 ? 28 : i === 0 ? 12 : 10,
          width: `${w * 3}px`,
          borderRadius: 6,
          background: "var(--line)",
          marginBottom: i < 2 ? 10 : 0,
          animation: "dPulse 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

function SectionHeading({ children, pill }: { children: React.ReactNode; pill?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
        <span style={{
          width: 4,
          height: 20,
          borderRadius: 4,
          background: "linear-gradient(180deg,var(--accent-2),var(--accent))",
          display: "inline-block",
          flexShrink: 0,
        }} />
        {children}
      </h2>
      {pill && (
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 20,
          background: "color-mix(in srgb,var(--accent) 10%,var(--panel))",
          border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))",
          color: "var(--accent)",
          letterSpacing: "0.04em",
        }}>
          {pill}
        </span>
      )}
    </div>
  );
}

/* ─── KPI card color palette (Orbit) ──────────────────────────────────── */
const KPI_PALETTE = [
  { accent: "var(--accent)",   icon: <Icon name="users" size={18} /> },
  { accent: "#ef4444",         icon: <Icon name="trending" size={18} /> },
  { accent: "#f59e0b",         icon: <Icon name="check" size={18} /> },
  { accent: "#22c55e",         icon: <Icon name="card" size={18} /> },
];

/* ─── Page ─────────────────────────────────────────────────────────────── */
export default function AdminDashboardPage() {
  const { role } = useRole();
  const t = useI18n();
  const allowed = role === "admin" || role === "head-instructor";

  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthItem[] | null>(null);
  const [tenants, setTenants] = useState<TenantItem[] | null>(null);

  const { data: volunteerItems } = useSWR<VolunteerContentItem[]>(
    allowed ? "/volunteer-contents/admin" : null,
    api,
    { revalidateOnFocus: false }
  );

  const [alarmLogs, setAlarmLogs] = useState<AuditEntry[] | null>(null);
  const socketRef = useRef<import("socket.io-client").Socket | null>(null);

  const loadInitialAlarms = useCallback(async () => {
    if (!allowed) return;
    try {
      const data = await api<AuditEntry[]>("/notifications/alarms");
      setAlarmLogs(data);
    } catch { /* silent */ }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    loadInitialAlarms();
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
          time: v.createdAt
            ? new Date(v.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
            : "—",
        }))
    : null;

  const audits = alarmLogs
    ? alarmLogs.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.action,
        detail: [a.entity, a.entityId].filter(Boolean).join(" · ") || "—",
        time: new Date(a.createdAt).toLocaleString("tr-TR", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        }),
      }))
    : null;

  /* ── Access denied ── */
  if (!allowed) {
    return (
      <div style={{
        borderRadius: "var(--r-xl)",
        background: "var(--panel)",
        border: "1.5px solid var(--line)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{t.dashboard.deniedTitle}</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{t.dashboard.deniedDesc(role)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/whiteboard" className="btn-link">{t.tr("Tahtaya git")}</Link>
          <Link href="/courses" className="btn-link">{t.tr("Ders katalogu")}</Link>
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

  /* Shared card style */
  const card: React.CSSProperties = {
    borderRadius: "var(--r-xl)",
    background: "var(--panel)",
    border: "1.5px solid var(--line)",
    padding: 16,
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  return (
    <PanelShell
      roleLabel={t.tr("Yönetici Merkezi")}
      userName={t.tr("Kurumsal Kontrol")}
      userSub={t.tr("Atlasio operasyon paneli")}
      navSections={navSections}
    >
      <style>{`
        @keyframes dPulse{0%,100%{opacity:1}50%{opacity:.4}}
        .dash-grid-4{display:grid;gap:12px;grid-template-columns:1fr 1fr}
        @media(min-width:768px){.dash-grid-4{grid-template-columns:repeat(4,1fr)}}
        .dash-grid-12{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:1024px){.dash-grid-12{grid-template-columns:1.1fr 0.9fr}}
        .dash-grid-12b{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:1024px){.dash-grid-12b{grid-template-columns:1.05fr 0.95fr}}
        .dash-grid-12c{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:1024px){.dash-grid-12c{grid-template-columns:1.2fr 0.8fr}}
        .dash-grid-2{display:grid;gap:16px;grid-template-columns:1fr}
        @media(min-width:768px){.dash-grid-2{grid-template-columns:1fr 1fr}}
        .dash-charts{display:grid;gap:12px;grid-template-columns:1fr}
        @media(min-width:768px){.dash-charts{grid-template-columns:1fr 1fr}}
        .dash-stat3{display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr}
        .tenant-row:hover{border-color:color-mix(in srgb,var(--accent) 35%,var(--line))!important;background:color-mix(in srgb,var(--accent) 5%,var(--panel))!important}
        .qa-btn:hover{background:color-mix(in srgb,var(--accent) 8%,var(--panel))!important;border-color:color-mix(in srgb,var(--accent) 30%,var(--line))!important;color:var(--accent)!important}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Hero ── */}
        <header style={{
          borderRadius: "var(--r-xl)",
          background: "linear-gradient(135deg,color-mix(in srgb,var(--accent) 8%,var(--panel)),color-mix(in srgb,var(--accent-2) 6%,var(--panel)))",
          border: "1.5px solid color-mix(in srgb,var(--accent) 20%,var(--line))",
          padding: "24px 28px",
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent)",
            padding: "3px 10px",
            borderRadius: 20,
            background: "color-mix(in srgb,var(--accent) 12%,var(--panel))",
            border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))",
            marginBottom: 10,
          }}>
            <Icon name="shield" size={12} />
            {t.tr("Yönetici Merkezi")}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: "0 0 6px" }}>
            {t.tr("Kurumsal eğitim kontrol odası")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, maxWidth: 600 }}>
            {t.tr("Kullanıcı, içerik ve gelir akışları tek panelde. Sağlık durumu, onay kuyruğu ve riskler burada.")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {quickActions.map((a) => (
              <Link key={t.tr(a.label)} href={a.href} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--panel)",
                border: "1.5px solid var(--line)",
                color: "var(--ink-2)",
                textDecoration: "none",
                transition: "all var(--t-fast)",
              }}
                className="qa-btn"
              >
                {t.tr(a.label)}
              </Link>
            ))}
          </div>
        </header>

        {/* ── KPI error ── */}
        {kpiError && (
          <div style={{
            borderRadius: "var(--r-lg)",
            border: "1px solid rgba(245,158,11,0.3)",
            background: "color-mix(in srgb,#f59e0b 8%,var(--panel))",
            padding: "10px 16px",
            fontSize: 13,
            color: "#b45309",
          }}>
            {t.tr("KPI verileri yüklenemedi")}: {kpiError}
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="dash-grid-4">
          {kpis
            ? kpis.map((k, i) => {
                const p = KPI_PALETTE[i % KPI_PALETTE.length];
                return (
                  <div key={t.tr(k.label)} style={{
                    borderRadius: "var(--r-xl)",
                    background: `color-mix(in srgb,${p.accent} 5%,var(--panel))`,
                    border: `1.5px solid color-mix(in srgb,${p.accent} 22%,var(--line))`,
                    padding: "16px 18px",
                    boxShadow: "var(--shadow-sm)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: p.accent, opacity: 0.85 }}>{p.icon}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{t.tr(k.label)}</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: p.accent, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{t.tr(k.delta)}</div>
                  </div>
                );
              })
            : Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>

        {/* ── Charts + Announce ── */}
        <div className="dash-grid-12">
          {/* Charts panel */}
          <div style={card}>
            <SectionHeading pill={t.tr("Canlı metrikler")}>Global Dashboard</SectionHeading>
            <div className="dash-charts">
              {/* Revenue chart */}
              <div style={{
                borderRadius: "var(--r-lg)",
                border: "1.5px solid color-mix(in srgb,#22c55e 20%,var(--line))",
                background: "color-mix(in srgb,#22c55e 4%,var(--panel))",
                padding: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Gelir akışı (son 7 gün)")}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>
                    {kpi ? fmtRevenue(Number(kpi.monthlyRevenue)) : "—"}
                  </span>
                </div>
                {kpi ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={buildRevenueData(Number(kpi.monthlyRevenue))} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: unknown) => fmtRevenue(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="gelir" stroke="#22c55e" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 80, borderRadius: "var(--r-md)", background: "var(--line)", animation: "dPulse 1.5s ease-in-out infinite" }} />
                )}
              </div>
              {/* Session chart */}
              <div style={{
                borderRadius: "var(--r-lg)",
                border: "1.5px solid color-mix(in srgb,var(--accent) 20%,var(--line))",
                background: "color-mix(in srgb,var(--accent) 4%,var(--panel))",
                padding: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.tr("Canlı oturum (son 8 saat)")}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>
                    {kpi ? `${kpi.liveSessions} aktif` : "—"}
                  </span>
                </div>
                {kpi ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={buildSessionData(kpi.liveSessions)} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                      <XAxis dataKey="saat" tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="oturum" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 80, borderRadius: "var(--r-md)", background: "var(--line)", animation: "dPulse 1.5s ease-in-out infinite" }} />
                )}
              </div>
            </div>
            {/* Stat row */}
            <div className="dash-stat3">
              {[
                { label: "Toplam kayıt", value: kpi ? kpi.totalEnrollments.toLocaleString("tr-TR") : "—", note: "Tüm zamanlar", accent: "var(--accent-2)" },
                { label: "Canlı sınıf", value: kpi ? String(kpi.liveSessions) : "—", note: "Şu an", accent: "#ef4444" },
                { label: "Aktif kullanıcı", value: kpi ? kpi.activeUsers.toLocaleString("tr-TR") : "—", note: "Kayıtlı & aktif", accent: "var(--accent)" },
              ].map((s) => (
                <div key={t.tr(s.label)} style={{
                  borderRadius: "var(--r-lg)",
                  border: `1px solid color-mix(in srgb,${s.accent} 20%,var(--line))`,
                  background: `color-mix(in srgb,${s.accent} 5%,var(--panel))`,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{t.tr(s.label)}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.accent }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{t.tr(s.note)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Announce panel */}
          <div style={card}>
            <SectionHeading pill="Push Center">{t.tr("Duyuru & Bildirim")}</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <select style={{
                width: "100%",
                borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink)",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}>
                {notifications.map((n) => (
                  <option key={n.value} value={n.value}>{t.tr(n.label)}</option>
                ))}
              </select>
              <input style={{
                width: "100%",
                borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink)",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }} placeholder={t.tr("Başlık")} />
              <textarea style={{
                width: "100%",
                borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink)",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }} rows={4} placeholder={t.tr("Duyuru mesajı")} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-link" style={{ flex: 1, justifyContent: "center" }}>{t.tr("Önizleme")}</button>
                <button style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--r-md)",
                  background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "var(--glow-blue)",
                }}>
                  <Icon name="bell" size={14} /> {t.tr("Gönder")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tenants + Security ── */}
        <div className="dash-grid-12b">
          {/* Tenant panel */}
          <div style={card}>
            <SectionHeading pill={t.tr("Kurumsal müşteriler")}>{t.tr("Tenant & Kullanıcı Yönetimi")}</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!tenants
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} style={{
                      height: 56,
                      borderRadius: "var(--r-lg)",
                      background: "var(--line)",
                      animation: "dPulse 1.5s ease-in-out infinite",
                    }} />
                  ))
                : tenants.length === 0
                ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0", textAlign: "center" }}>{t.tr("Henüz tenant kaydı yok.")}</div>
                : tenants.map((tenant) => (
                    <div key={tenant.id} className="tenant-row" style={{
                      borderRadius: "var(--r-lg)",
                      border: "1.5px solid var(--line)",
                      background: "var(--panel)",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all var(--t-fast)",
                      cursor: "default",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.tr(tenant.name)}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          {tenant.slug} · {tenant.enrollments} {t.tr("kayıt")} · {tenant.courses} {t.tr("kurs")}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: tenant.status === "active"
                            ? "color-mix(in srgb,#22c55e 12%,var(--panel))"
                            : "color-mix(in srgb,#f59e0b 12%,var(--panel))",
                          border: tenant.status === "active"
                            ? "1px solid rgba(34,197,94,0.3)"
                            : "1px solid rgba(245,158,11,0.3)",
                          color: tenant.status === "active" ? "#16a34a" : "#b45309",
                        }}>
                          {tenant.status === "active" ? t.tr("Aktif") : tenant.status}
                        </span>
                        <button className="btn-link" style={{ fontSize: 11 }}>{t.tr("Düzenle")}</button>
                      </div>
                    </div>
                  ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-link" style={{ fontSize: 12 }}>{t.tr("Yeni Tenant")}</button>
              <button className="btn-link" style={{ fontSize: 12 }}>{t.tr("Rol Dağıtımı")}</button>
              <button className="btn-link" style={{ fontSize: 12 }}>{t.tr("CSV İçeri Aktar")}</button>
            </div>
          </div>

          {/* Security panel */}
          <div style={card}>
            <SectionHeading pill="Defense Service">{t.tr("Sistem Logları & Güvenlik")}</SectionHeading>
            <div style={{
              borderRadius: "var(--r-lg)",
              border: "1.5px solid var(--line)",
              background: "color-mix(in srgb,var(--accent) 3%,var(--panel))",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              {[
                { label: "Şüpheli giriş denetimi", badge: "2 uyarı", danger: true },
                { label: "Yedekleme durumları", badge: "Aktif", danger: false },
                { label: "IP kara liste", badge: "3 IP", danger: null },
              ].map((row) => (
                <div key={t.tr(row.label)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, color: "var(--ink-2)" }}>
                  <span>{t.tr(row.label)}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: row.danger === true
                      ? "color-mix(in srgb,#ef4444 12%,var(--panel))"
                      : row.danger === false
                      ? "color-mix(in srgb,#22c55e 12%,var(--panel))"
                      : "color-mix(in srgb,var(--muted) 15%,var(--panel))",
                    border: row.danger === true
                      ? "1px solid rgba(239,68,68,0.3)"
                      : row.danger === false
                      ? "1px solid rgba(34,197,94,0.3)"
                      : "1px solid var(--line)",
                    color: row.danger === true ? "#dc2626" : row.danger === false ? "#16a34a" : "var(--muted)",
                  }}>
                    {t.tr(row.badge)}
                  </span>
                </div>
              ))}
              <button className="btn-link" style={{ width: "100%", justifyContent: "center", fontSize: 12, marginTop: 2 }}>{t.tr("Logları incele")}</button>
            </div>
          </div>
        </div>

        {/* ── Health + Approvals ── */}
        <div className="dash-grid-12c">
          {/* System health */}
          <div style={card}>
            <SectionHeading pill="SLA 99.97%">{t.tr("Sistem sağlığı")}</SectionHeading>
            <div className="dash-charts">
              {!health
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{
                      height: 64,
                      borderRadius: "var(--r-lg)",
                      background: "var(--line)",
                      animation: "dPulse 1.5s ease-in-out infinite",
                    }} />
                  ))
                : health.map((h) => {
                    const isWarn = h.status === "Uyarı" || h.status === "Hata";
                    return (
                      <div key={t.tr(h.name)} style={{
                        borderRadius: "var(--r-lg)",
                        border: isWarn
                          ? "1.5px solid rgba(245,158,11,0.3)"
                          : "1.5px solid rgba(34,197,94,0.25)",
                        background: isWarn
                          ? "color-mix(in srgb,#f59e0b 7%,var(--panel))"
                          : "color-mix(in srgb,#22c55e 6%,var(--panel))",
                        padding: "12px 14px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.tr(h.name)}</div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: isWarn ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
                            border: isWarn ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(34,197,94,0.3)",
                            color: isWarn ? "#b45309" : "#16a34a",
                          }}>
                            {h.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{h.detail}</div>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* Approvals */}
          <div style={card}>
            <SectionHeading pill={approvals ? `${approvals.length} ${t.tr("öğe")}` : t.tr("Yükleniyor...")}>
              {t.tr("Onay kuyruğu")}
            </SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!approvals
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} style={{
                      height: 72,
                      borderRadius: "var(--r-lg)",
                      background: "var(--line)",
                      animation: "dPulse 1.5s ease-in-out infinite",
                    }} />
                  ))
                : approvals.length === 0
                ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0", textAlign: "center" }}>{t.tr("Bekleyen onay yok.")}</div>
                : approvals.map((a) => (
                    <div key={a.id} style={{
                      borderRadius: "var(--r-lg)",
                      border: "1.5px solid rgba(245,158,11,0.25)",
                      background: "color-mix(in srgb,#f59e0b 5%,var(--panel))",
                      padding: "12px 14px",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{t.tr(a.title)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{a.owner} · {a.time}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "var(--r-sm)",
                          background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          color: "#16a34a",
                          cursor: "pointer",
                        }}>{t.tr("Onayla")}</button>
                        <button style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "var(--r-sm)",
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#dc2626",
                          cursor: "pointer",
                        }}>{t.tr("Geri çevir")}</button>
                        <button className="btn-link" style={{ fontSize: 11 }}>{t.tr("Detay")}</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* ── Finance + Audit ── */}
        <div className="dash-grid-2">
          {/* Finance */}
          <div style={card}>
            <SectionHeading pill={t.tr("Bu ay")}>{t.tr("Finans özeti")}</SectionHeading>
            <div className="dash-stat3">
              {[
                { label: "Toplam kayıt", value: kpi ? kpi.totalEnrollments.toLocaleString("tr-TR") : "—", accent: "var(--accent-2)" },
                { label: "Bekleyen", value: kpi ? String(kpi.pendingCourses) : "—", accent: "#f59e0b" },
                { label: "Aylık gelir", value: kpi ? fmtRevenue(Number(kpi.monthlyRevenue)) : "—", accent: "#22c55e" },
              ].map((s) => (
                <div key={t.tr(s.label)} style={{
                  borderRadius: "var(--r-lg)",
                  border: `1px solid color-mix(in srgb,${s.accent} 20%,var(--line))`,
                  background: `color-mix(in srgb,${s.accent} 5%,var(--panel))`,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{t.tr(s.label)}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.accent }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit */}
          <div style={card}>
            <SectionHeading pill={t.tr("KVKK uyumlu")}>{t.tr("Denetim & güvenlik")}</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!audits
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} style={{
                      height: 60,
                      borderRadius: "var(--r-lg)",
                      background: "var(--line)",
                      animation: "dPulse 1.5s ease-in-out infinite",
                    }} />
                  ))
                : audits.length === 0
                ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0", textAlign: "center" }}>{t.tr("Denetim kaydı yok.")}</div>
                : audits.map((a) => (
                    <div key={a.id} style={{
                      borderRadius: "var(--r-lg)",
                      border: "1.5px solid var(--line)",
                      background: "var(--panel)",
                      padding: "12px 14px",
                      transition: "border-color var(--t-fast)",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.tr(a.title)}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{a.detail}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, opacity: 0.7 }}>{a.time}</div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

      </div>
    </PanelShell>
  );
}
