"use client";

import useSWR from "swr";
import { useState } from "react";
import { api } from "../../api/client";

type Alarm = {
  id: string;
  action: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

type Me = { role?: string };

type Severity = "critical" | "warning" | "info";

type ClassifiedAlarm = Alarm & {
  severity: Severity;
  icon: string;
};

type FilterTab = "all" | Severity;

const DEMO_ALARMS: Alarm[] = [
  { id: "demo-1", action: "LOGIN_FAILED", meta: { ip: "192.168.1.1", attempts: 5 }, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: "demo-2", action: "PAYMENT_FRAUD_DETECTED", meta: { orderId: "ORD-999", amount: 4999 }, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: "demo-3", action: "RATE_LIMIT_EXCEEDED", meta: { userId: "usr_123", endpoint: "/api/products" }, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: "demo-4", action: "AUTH_TOKEN_EXPIRED", meta: { userId: "usr_456" }, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: "demo-5", action: "SYSTEM_HEALTH_CHECK", meta: { status: "degraded", service: "db" }, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
];

function classify(alarm: Alarm): ClassifiedAlarm {
  const action = alarm.action.toUpperCase();
  if (action.includes("LOGIN") || action.includes("AUTH")) {
    return { ...alarm, severity: "critical", icon: "🔒" };
  }
  if (action.includes("PAYMENT") || action.includes("FRAUD")) {
    return { ...alarm, severity: "critical", icon: "💳" };
  }
  if (action.includes("RATE") || action.includes("LIMIT")) {
    return { ...alarm, severity: "warning", icon: "⚠️" };
  }
  return { ...alarm, severity: "info", icon: "📋" };
}

const BORDER_COLOR: Record<Severity, string> = {
  critical: "border-l-rose-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

const BADGE_CLASS: Record<Severity, string> = {
  critical: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const BADGE_LABEL: Record<Severity, string> = {
  critical: "Kritik",
  warning: "Uyarı",
  info: "Bilgi",
};

export default function AdminAlarmsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: me, error: meErr } = useSWR<Me>("/auth/me", api);
  const { data, error, isLoading } = useSWR<Alarm[]>(
    me?.role ? "/notifications/alarms" : null,
    api,
    { refreshInterval: 30000 }
  );

  if (meErr) return <div className="p-4 text-red-600">Giriş yapın (admin/tech)</div>;
  if (!me) return <div className="p-4 text-slate-500">Kimlik doğrulanıyor…</div>;
  if (me.role !== "ADMIN" && me.role !== "TECH")
    return <div className="p-4 text-sm text-slate-600">Sadece admin/tech alarmları görebilir.</div>;
  if (isLoading) return <div className="p-4 text-slate-500">Yükleniyor…</div>;

  const isDemo = error || !data || data.length === 0;
  const rawAlarms: Alarm[] = isDemo ? DEMO_ALARMS : data!;
  const alarms: ClassifiedAlarm[] = rawAlarms.map(classify);

  const criticalCount = alarms.filter((a) => a.severity === "critical").length;
  const warningCount = alarms.filter((a) => a.severity === "warning").length;
  const infoCount = alarms.filter((a) => a.severity === "info").length;

  const todayStr = new Date().toDateString();
  const todayCount = alarms.filter((a) => new Date(a.createdAt).toDateString() === todayStr).length;

  const filtered = filter === "all" ? alarms : alarms.filter((a) => a.severity === filter);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tümü" },
    { key: "critical", label: "Kritik" },
    { key: "warning", label: "Uyarı" },
    { key: "info", label: "Bilgi" },
  ];

  return (
    <main className="space-y-6">
      {/* Premium Hero Header */}
      <header className="glass rounded-2xl border border-slate-200 p-6 hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="relative hero-content">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="pill w-fit flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
              </span>
              Canlı İzleme
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Güvenlik Alarm Merkezi</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Platform güvenlik olaylarını gerçek zamanlı izleyin. Kritik alarmlar otomatik önceliklendirilir.
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span>Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}</span>
            <span className="text-slate-300">·</span>
            <span>Otomatik yenileme: 30s</span>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      {isDemo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-sm font-medium">
          <span>⚠️</span>
          <span>DEMO VERİ — Gerçek alarm verisi bulunamadı, örnek veriler gösteriliyor.</span>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 border border-rose-100 bg-rose-50/50">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <span>🔴</span> Kritik
          </p>
          <p className="text-3xl font-bold text-rose-600">{criticalCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-amber-100 bg-amber-50/50">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <span>🟡</span> Uyarı
          </p>
          <p className="text-3xl font-bold text-amber-600">{warningCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-blue-100 bg-blue-50/50">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <span>🔵</span> Bilgi
          </p>
          <p className="text-3xl font-bold text-blue-600">{infoCount}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <span>⚫</span> Bugün
          </p>
          <p className="text-3xl font-bold text-slate-700">{todayCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`btn-link px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white border border-rose-500"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({tab.key === "critical" ? criticalCount : tab.key === "warning" ? warningCount : infoCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alarm Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-5xl">🛡️</span>
            <h3 className="text-base font-semibold text-slate-700">Bu kategoride alarm bulunmuyor</h3>
            <p className="text-sm text-slate-400">Sistemin güvende</p>
          </div>
        )}
        {filtered.map((alarm) => (
          <div
            key={alarm.id}
            className={`glass rounded-xl border-l-4 ${BORDER_COLOR[alarm.severity]} p-4 shadow-sm`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{alarm.icon}</span>
                <span className="font-bold text-slate-800 text-sm truncate">{alarm.action}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`pill text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_CLASS[alarm.severity]}`}>
                  {BADGE_LABEL[alarm.severity]}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-8">
              {new Date(alarm.createdAt).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {alarm.meta && (
              <details className="mt-2 ml-8">
                <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-700">
                  Meta verisini göster
                </summary>
                <pre className="mt-1 text-xs bg-slate-900 text-emerald-400 rounded-lg p-3 overflow-auto font-mono">
                  {JSON.stringify(alarm.meta, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
