'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

type TickLog = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

const DEMO_LOGS: AuditLog[] = [
  {
    id: 'l1',
    action: 'automation.tick',
    entity: 'System',
    createdAt: '2026-03-27T18:45:00Z',
    meta: { reportDispatch: { processed: 2 }, certExpiry: { updated: 1 } },
  },
  {
    id: 'l2',
    action: 'automation.tick',
    entity: 'System',
    createdAt: '2026-03-27T18:44:00Z',
    meta: { reportDispatch: { processed: 0 }, certExpiry: { updated: 0 } },
  },
  {
    id: 'l3',
    action: 'performance.snapshot',
    entity: 'System',
    createdAt: '2026-03-27T18:00:00Z',
    meta: { snapshotId: 'snap-xyz' },
  },
  {
    id: 'l4',
    action: 'ai.summaries.generated',
    entity: 'System',
    createdAt: '2026-03-27T17:50:00Z',
    meta: { count: 5 },
  },
  {
    id: 'l5',
    action: 'instructor.payroll.batch',
    entity: 'System',
    createdAt: '2026-03-27T03:00:00Z',
    meta: { count: 12 },
  },
];

type CronJob = {
  icon: string;
  name: string;
  cron: string;
  description: string;
  showLastRun: boolean;
};

const CRON_JOBS: CronJob[] = [
  {
    icon: '🔄',
    name: 'Bakım Tiki',
    cron: '*/1 * * * *',
    description: 'Rapor dağıtımı ve sertifika süresi kontrolü',
    showLastRun: true,
  },
  {
    icon: '🤖',
    name: 'AI Özet Üretimi',
    cron: '*/10 * * * *',
    description: 'Sınıf performans özetlerini otomatik oluşturur',
    showLastRun: false,
  },
  {
    icon: '📊',
    name: 'Performans Anlık Görüntüsü',
    cron: '0 * * * *',
    description: 'Sistem performans metriklerini kaydeder',
    showLastRun: false,
  },
  {
    icon: '💰',
    name: 'Eğitmen Maaş Bordrosu',
    cron: '0 3 * * *',
    description: 'Günlük eğitmen ödeme batchini oluşturur',
    showLastRun: false,
  },
  {
    icon: '🔑',
    name: 'LTI Anahtar Rotasyonu',
    cron: '0 0 * * *',
    description: 'LTI 1.3 güvenlik anahtarlarını yeniler',
    showLastRun: false,
  },
];

const HEALTH_METRICS = [
  { label: 'Bugün İşlenen Görev', value: '43', unit: '' },
  { label: 'Hata Oranı', value: '%0.0', unit: '' },
  { label: 'Ortalama Süre', value: '1.2s', unit: '' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function metaSummary(meta?: Record<string, unknown>): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        const inner = Object.entries(v as Record<string, unknown>)
          .map(([ik, iv]) => `${ik}: ${iv}`)
          .join(', ');
        return `${k}: { ${inner} }`;
      }
      return `${k}: ${v}`;
    })
    .join(' | ');
}

function logDotColor(action: string): string {
  if (action.includes('error') || action.includes('fail')) return 'bg-rose-500';
  if (action.includes('automation') || action.includes('tick')) return 'bg-green-500';
  return 'bg-blue-500';
}

function actionColor(action: string): string {
  if (action.includes('error') || action.includes('fail'))
    return 'bg-rose-100 text-rose-700';
  if (action.includes('automation') || action.includes('tick'))
    return 'bg-emerald-100 text-emerald-700';
  return 'bg-blue-100 text-blue-700';
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AdminAutomationPage() {
  const t = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [lastTick, setLastTick] = useState<TickLog | null>(null);
  const [tickLoading, setTickLoading] = useState(true);

  // Fetch audit logs
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/audit/logs?limit=20`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('not ok');
        return res.json() as Promise<AuditLog[]>;
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLogs(DEMO_LOGS);
          setIsDemo(true);
        } else {
          setLogs(data);
          setIsDemo(false);
        }
      })
      .catch(() => {
        setLogs(DEMO_LOGS);
        setIsDemo(true);
      })
      .finally(() => setLogsLoading(false));
  }, []);

  // Fetch last automation.tick run
  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API_BASE}/audit/logs?action=automation.tick&limit=1`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('not ok');
        return res.json() as Promise<TickLog[]>;
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLastTick(data[0]);
        }
      })
      .catch(() => {
        // Use demo fallback — show from demo logs
        const demo = DEMO_LOGS.find((l) => l.action === 'automation.tick');
        if (demo) setLastTick(demo);
      })
      .finally(() => setTickLoading(false));
  }, []);

  return (
    <main className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero animate-fade-slide-up stagger-1">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">{t.tr("Otomasyon")}</div>
          <h1 className="text-3xl font-semibold">⚙️ {t.tr("Otomasyon Merkezi")}</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {t.tr("Zamanlanmış görevler ve sistem bakım süreçleri.")}
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Cron Jobs Grid                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3 animate-fade-slide-up stagger-2">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500 inline-block" />
          {t.tr("Zamanlanmış Görevler")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CRON_JOBS.map((job, i) => (
            <div
              key={t.tr(job.name)}
              className={`glass rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm hover:shadow-md transition-all animate-fade-slide-up stagger-${Math.min(i + 1, 4)}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{job.icon}</span>
                  <span className="font-bold text-slate-800 text-sm leading-snug">
                    {t.tr(job.name)}
                  </span>
                </div>
                {/* ACTIVE badge */}
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {t.tr("AKTİF")}
                </span>
              </div>

              {/* Cron expression */}
              <code className="block rounded-lg bg-slate-900 text-emerald-400 px-3 py-1.5 text-xs font-mono tracking-wide">
                {job.cron}
              </code>

              {/* Description */}
              <p className="text-xs text-slate-500 leading-relaxed">
                {t.tr(job.description)}
              </p>

              {/* Last run row */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400">
                <span className="font-medium text-slate-600">{t.tr("Son Çalışma")}</span>
                {job.showLastRun ? (
                  tickLoading ? (
                    <span className="skeleton h-3 w-20 rounded" />
                  ) : lastTick ? (
                    <span className="text-slate-500 font-mono">
                      {relTime(lastTick.createdAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Automation Logs Timeline                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-slide-up stagger-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 inline-block" />
            {t.tr("Son Otomasyon Logları")}
            <span className="pill">Son 20</span>
          </h2>
          {isDemo && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              {t.tr("Demo verisi gösteriliyor")}
            </span>
          )}
        </div>

        {logsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 animate-pulse"
              >
                <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-3 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <ol className="space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start gap-3 group"
              >
                {/* Color dot */}
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${logDotColor(log.action)}`}
                />

                <div className="flex-1 min-w-0 space-y-0.5">
                  {/* Action pill + entity */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold font-mono ${actionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-400">{log.entity}</span>
                  </div>

                  {/* Meta summary */}
                  {log.meta && (
                    <p className="text-xs text-slate-500 font-mono break-all leading-relaxed">
                      {metaSummary(log.meta)}
                    </p>
                  )}
                </div>

                {/* Relative time */}
                <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap pt-0.5">
                  {relTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* System Health Metrics                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-3 animate-fade-slide-up stagger-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-cyan-500 inline-block" />
          {t.tr("Sistem Sağlığı")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {HEALTH_METRICS.map((m, i) => (
            <div
              key={t.tr(m.label)}
              className={`glass rounded-2xl border border-slate-200 p-5 shadow-sm animate-fade-slide-up stagger-${Math.min(i + 1, 4)}`}
            >
              <p className="text-xs text-slate-500 mb-1">{t.tr(m.label)}</p>
              <p className="metric text-slate-800">
                {m.value}
                {m.unit && (
                  <span className="text-sm font-normal text-slate-400 ml-1">
                    {m.unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
