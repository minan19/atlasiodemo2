'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { api } from '../../api/client';
import { useI18n } from '../../_i18n/use-i18n';

type Alarm = {
  id: string;
  action: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
};

type Severity = 'critical' | 'warning' | 'info';

type ClassifiedAlarm = Alarm & { severity: Severity; icon: string; label: string };

const DEMO_ALARMS: Alarm[] = [
  { id: 'a1', action: 'LOGIN_FAILED',            meta: { ip: '10.0.0.5', attempts: 7 },        createdAt: new Date(Date.now() - 60_000 * 3).toISOString() },
  { id: 'a2', action: 'PAYMENT_FRAUD_DETECTED',  meta: { orderId: 'ORD-881', amount: 9999 },   createdAt: new Date(Date.now() - 60_000 * 10).toISOString() },
  { id: 'a3', action: 'RATE_LIMIT_EXCEEDED',     meta: { endpoint: '/auth/login', rps: 120 },  createdAt: new Date(Date.now() - 60_000 * 22).toISOString() },
  { id: 'a4', action: 'AUTH_TOKEN_EXPIRED',      meta: { userId: 'usr_789' },                  createdAt: new Date(Date.now() - 60_000 * 55).toISOString() },
  { id: 'a5', action: 'HONEYPOT_TRIGGERED',      meta: { path: '/wp-admin', ip: '185.2.3.9' }, createdAt: new Date(Date.now() - 60_000 * 70).toISOString() },
  { id: 'a6', action: 'SYSTEM_HEALTH_DEGRADED',  meta: { service: 'postgres', latency: '820ms' }, createdAt: new Date(Date.now() - 60_000 * 90).toISOString() },
];

const DEMO_AUDIT: AuditEntry[] = [
  { id: 'e1', action: 'USER_ROLE_CHANGED',   entity: 'User',    entityId: 'u1',  userId: 'admin', createdAt: new Date(Date.now() - 60_000 * 5).toISOString() },
  { id: 'e2', action: 'COURSE_PUBLISHED',    entity: 'Course',  entityId: 'c1',  userId: 'inst1', createdAt: new Date(Date.now() - 60_000 * 15).toISOString() },
  { id: 'e3', action: 'PAYMENT_COMPLETED',   entity: 'Payment', entityId: 'p1',  userId: 'stu1',  createdAt: new Date(Date.now() - 60_000 * 30).toISOString() },
  { id: 'e4', action: 'PASSWORD_CHANGED',    entity: 'User',    entityId: 'u2',  userId: 'u2',    createdAt: new Date(Date.now() - 60_000 * 60).toISOString() },
  { id: 'e5', action: 'SESSION_TERMINATED',  entity: 'Session', entityId: 's1',  userId: 'admin', createdAt: new Date(Date.now() - 60_000 * 80).toISOString() },
];

function classify(alarm: Alarm): ClassifiedAlarm {
  const a = alarm.action.toUpperCase();
  if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('TOKEN') || a.includes('HONEYPOT')) {
    return { ...alarm, severity: 'critical', icon: '🔒', label: 'Kimlik Doğrulama' };
  }
  if (a.includes('PAYMENT') || a.includes('FRAUD')) {
    return { ...alarm, severity: 'critical', icon: '💳', label: 'Ödeme Güvenliği' };
  }
  if (a.includes('RATE') || a.includes('LIMIT') || a.includes('HEALTH')) {
    return { ...alarm, severity: 'warning', icon: '⚠️', label: 'Sistem Uyarısı' };
  }
  return { ...alarm, severity: 'info', icon: '📋', label: 'Bilgi' };
}

const SEVERITY_STYLES: Record<Severity, { badge: string; bar: string }> = {
  critical: { badge: 'bg-rose-100 text-rose-700',   bar: 'border-l-rose-500' },
  warning:  { badge: 'bg-amber-100 text-amber-700', bar: 'border-l-amber-500' },
  info:     { badge: 'bg-blue-100 text-blue-700',   bar: 'border-l-blue-500' },
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Kritik', warning: 'Uyarı', info: 'Bilgi',
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

type FilterTab = 'all' | Severity;

export default function AdminSecurityPage() {
  const t = useI18n();
  const [alarmFilter, setAlarmFilter] = useState<FilterTab>('all');

  const { data: alarmData, isLoading: alarmLoading, mutate: reloadAlarms } = useSWR<Alarm[]>(
    '/notifications/alarms',
    api,
    { refreshInterval: 30_000 }
  );

  const { data: auditData, isLoading: auditLoading } = useSWR<AuditEntry[]>(
    '/audit/logs?limit=20',
    api,
  );

  const isAlarmDemo = !alarmLoading && (!alarmData || alarmData.length === 0);
  const isAuditDemo = !auditLoading && (!auditData || auditData.length === 0);

  const classified = useMemo(() => {
    const source = isAlarmDemo ? DEMO_ALARMS : (alarmData ?? []);
    return source.map(classify);
  }, [alarmData, isAlarmDemo]);

  const filtered = useMemo(() =>
    alarmFilter === 'all' ? classified : classified.filter((a) => a.severity === alarmFilter),
    [classified, alarmFilter]
  );

  const auditItems = isAuditDemo ? DEMO_AUDIT : (auditData ?? []);

  const criticalCount = classified.filter((a) => a.severity === 'critical').length;
  const warningCount  = classified.filter((a) => a.severity === 'warning').length;
  const infoCount     = classified.filter((a) => a.severity === 'info').length;

  const STATS = [
    { label: 'Kritik Alarm',   value: criticalCount, bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200',     val: 'text-rose-700',    icon: '🔴' },
    { label: 'Uyarı',          value: warningCount,  bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',   val: 'text-amber-700',   icon: '🟡' },
    { label: 'Bilgi',          value: infoCount,     bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',      val: 'text-blue-700',    icon: '🔵' },
    { label: 'Toplam Kayıt',   value: classified.length, bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200', val: 'text-slate-700', icon: '📋' },
  ];

  const FILTER_TABS: { label: string; value: FilterTab }[] = [
    { label: 'Tümü', value: 'all' },
    { label: 'Kritik', value: 'critical' },
    { label: 'Uyarı', value: 'warning' },
    { label: 'Bilgi', value: 'info' },
  ];

  return (
    <main className="space-y-6">
      {/* Hero */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">{t.tr("Güvenlik Merkezi")}</div>
          <h1 className="text-3xl font-semibold">{t.tr("Güvenlik & Denetim")}</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {t.tr("Platform güvenlik alarmları, kimlik doğrulama olayları ve denetim kayıtlarını gerçek zamanlı izleyin.")}
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={i} className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${i + 1} ${s.bg}`}>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span>{s.icon}</span>
              <span>{t.tr(s.label)}</span>
            </div>
            <p className={`text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Alarms */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-400 to-orange-400 inline-block" />
            {t.tr("Güvenlik Alarmları")}
            {criticalCount > 0 && (
              <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                {criticalCount}
              </span>
            )}
          </h2>
          <button className="btn-link text-sm" onClick={() => reloadAlarms()}>
            {t.tr("Yenile")}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setAlarmFilter(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                alarmFilter === tab.value
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {isAlarmDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {t.tr("⚠ Demo verisi gösteriliyor. Gerçek alarmlar için API bağlantısını kontrol edin.")}
          </div>
        )}

        <div className="space-y-2">
          {alarmLoading && !isAlarmDemo ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border-l-4 border-l-slate-200 border border-slate-100 p-3 flex justify-between items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-16 bg-slate-200 rounded-full" />
              </div>
            ))
          ) : filtered.length ? (
            filtered.map((alarm) => {
              const s = SEVERITY_STYLES[alarm.severity];
              return (
                <div
                  key={alarm.id}
                  className={`rounded-xl border-l-4 border border-slate-100 p-3 flex flex-wrap items-center justify-between gap-3 hover:shadow-sm transition-all ${s.bar}`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xl mt-0.5 shrink-0">{alarm.icon}</span>
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-snug">{alarm.action}</p>
                      <p className="text-xs text-slate-400">{t.tr(alarm.label)} · {relTime(alarm.createdAt)}</p>
                      {alarm.meta && (
                        <p className="text-xs text-slate-500 font-mono break-all">
                          {Object.entries(alarm.meta).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold shrink-0 ${s.badge}`}>
                    {t.tr(SEVERITY_LABELS[alarm.severity])}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">{t.tr("Bu kategoride alarm yok.")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Audit Log */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 inline-block" />
          {t.tr("Denetim Kaydı")}
          <span className="pill pill-sm">Son 20</span>
        </h2>

        {isAuditDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {t.tr("⚠ Demo verisi gösteriliyor.")}
          </div>
        )}

        {auditLoading && !isAuditDemo ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-4 font-semibold">{t.tr("Eylem")}</th>
                  <th className="pb-2 pr-4 font-semibold">{t.tr("Varlık")}</th>
                  <th className="pb-2 pr-4 font-semibold">{t.tr("Kullanıcı")}</th>
                  <th className="pb-2 font-semibold">{t.tr("Zaman")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditItems.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{entry.action}</td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {entry.entity ?? '—'}
                      {entry.entityId && <span className="ml-1 text-slate-400">#{entry.entityId.slice(0, 6)}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">{entry.userId?.slice(0, 8) ?? '—'}</td>
                    <td className="py-2.5 text-xs text-slate-400">{relTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
