'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ── Types ─────────────────────────────────────────────────── */

interface HealthScore {
  score: number;
  grade: string;
  details: Record<string, number>;
}

interface DriftAlert {
  field: string;
  expected: unknown;
  actual: unknown;
  severity: string;
}

interface DriftData {
  alerts: DriftAlert[];
}

interface ComplianceData {
  score: number;
  passed: string[];
  failed: string[];
  recommendations: string[];
}

interface TenantDashboard {
  activeUsers: number;
  storageUsed: number;
  apiCalls: number;
  errorRate: number;
}

interface LatencyData {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

interface Snapshot {
  id: string;
  createdAt: string;
  cpuUsage: number;
  memUsage: number;
  p50: number;
  p95: number;
  requestCount: number;
}

/* ── Demo data ──────────────────────────────────────────────── */

const DEMO_HEALTH: HealthScore = {
  score: 94,
  grade: 'A',
  details: { uptime: 99.9, performance: 91, security: 95, compliance: 88 },
};

const DEMO_DRIFT: DriftData = {
  alerts: [
    { field: 'activeUserThreshold', expected: 500, actual: 523, severity: 'LOW' },
    { field: 'errorRateLimit', expected: '1%', actual: '0.3%', severity: 'LOW' },
  ],
};

const DEMO_COMPLIANCE: ComplianceData = {
  score: 88,
  passed: [
    'JWT kimlik doğrulama aktif',
    'SSL/TLS etkin',
    'Denetim günlüğü etkin',
    'Rol tabanlı erişim yapılandırıldı',
  ],
  failed: ['İki faktörlü kimlik doğrulama zorunlu değil'],
  recommendations: [
    '2FA zorunluluğunu etkinleştirin',
    'Güvenlik açığı taramasını çalıştırın',
  ],
};

const DEMO_TENANT: TenantDashboard = {
  activeUsers: 1247,
  storageUsed: 38.4,
  apiCalls: 58320,
  errorRate: 0.3,
};

const DEMO_LATENCY: LatencyData = { p50: 45, p95: 120, p99: 380, avg: 67 };

const DEMO_SNAPSHOTS: Snapshot[] = [
  { id: 's1', createdAt: new Date(Date.now() - 60_000 * 2).toISOString(),  cpuUsage: 42, memUsage: 61, p50: 44,  p95: 118, requestCount: 3200 },
  { id: 's2', createdAt: new Date(Date.now() - 60_000 * 7).toISOString(),  cpuUsage: 55, memUsage: 67, p50: 51,  p95: 135, requestCount: 3450 },
  { id: 's3', createdAt: new Date(Date.now() - 60_000 * 12).toISOString(), cpuUsage: 78, memUsage: 74, p50: 68,  p95: 198, requestCount: 4100 },
  { id: 's4', createdAt: new Date(Date.now() - 60_000 * 18).toISOString(), cpuUsage: 83, memUsage: 81, p50: 91,  p95: 260, requestCount: 4700 },
  { id: 's5', createdAt: new Date(Date.now() - 60_000 * 25).toISOString(), cpuUsage: 36, memUsage: 58, p50: 40,  p95: 109, requestCount: 2900 },
];

/* ── Small helpers ──────────────────────────────────────────── */

function usageColor(val: number): string {
  if (val >= 80) return 'text-red-600';
  if (val >= 50) return 'text-amber-600';
  return 'text-emerald-600';
}

function usageBg(val: number): string {
  if (val >= 80) return 'bg-red-500';
  if (val >= 50) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function severityStyle(sev: string): string {
  switch (sev.toUpperCase()) {
    case 'HIGH':   return 'bg-red-100 text-red-700 border border-red-200';
    case 'MEDIUM': return 'bg-amber-100 text-amber-700 border border-amber-200';
    default:       return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
}

function fmt(val: unknown): string {
  return val === null || val === undefined ? '—' : String(val);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ── Sub-components ─────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="skeleton h-4 w-1/3 rounded mb-3" />
      <div className="skeleton h-8 w-1/2 rounded mb-2" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  stagger: string;
}

function MetricCard({ label, value, color, stagger }: MetricCardProps) {
  return (
    <div className={`glass rounded-2xl p-6 animate-fade-slide-up ${stagger}`}>
      <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
      <p className={`metric text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
}

function ProgressBar({ label, value, max = 100 }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600 capitalize">{label}</span>
        <span className="font-semibold text-slate-800">{value}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-violet-500 h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function ObservabilityPage() {
  const [health, setHealth]         = useState<HealthScore | null>(null);
  const [drift, setDrift]           = useState<DriftData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [tenant, setTenant]         = useState<TenantDashboard | null>(null);
  const [latency, setLatency]       = useState<LatencyData | null>(null);
  const [snapshots, setSnapshots]   = useState<Snapshot[] | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.allSettled([
        apiFetch<HealthScore>('/observability/health-score'),
        apiFetch<DriftData>('/observability/drift'),
        apiFetch<ComplianceData>('/observability/compliance?days=30'),
        apiFetch<TenantDashboard>('/observability/tenant-dashboard'),
        apiFetch<LatencyData>('/observability/latency?service=api&operation=request'),
        apiFetch<Snapshot[]>('/performance/snapshots?limit=10'),
      ]);

      if (cancelled) return;

      const [r0, r1, r2, r3, r4, r5] = results;
      setHealth(r0.status    === 'fulfilled' ? r0.value : DEMO_HEALTH);
      setDrift(r1.status     === 'fulfilled' ? r1.value : DEMO_DRIFT);
      setCompliance(r2.status === 'fulfilled' ? r2.value : DEMO_COMPLIANCE);
      setTenant(r3.status    === 'fulfilled' ? r3.value : DEMO_TENANT);
      setLatency(r4.status   === 'fulfilled' ? r4.value : DEMO_LATENCY);
      setSnapshots(r5.status === 'fulfilled' ? r5.value : DEMO_SNAPSHOTS);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const h = health ?? DEMO_HEALTH;
  const d = drift ?? DEMO_DRIFT;
  const c = compliance ?? DEMO_COMPLIANCE;
  const t = tenant ?? DEMO_TENANT;
  const l = latency ?? DEMO_LATENCY;
  const s = snapshots ?? DEMO_SNAPSHOTS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-6">

      {/* ── Hero ── */}
      <section className="hero mb-8 animate-fade-slide-up stagger-1">
        <div className="hero-content text-center py-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
            🔭 Platform Gözlemlenebilirlik
          </h1>
          <p className="text-slate-500 text-lg">
            Sistem sağlığı, performans ve uyumluluk metrikleri
          </p>
        </div>
      </section>

      {/* ── Top metric strip ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              label="Aktif Kullanıcı"
              value={t.activeUsers.toLocaleString('tr-TR')}
              color="text-blue-600"
              stagger="stagger-1"
            />
            <MetricCard
              label="API Çağrısı"
              value={t.apiCalls.toLocaleString('tr-TR')}
              color="text-violet-600"
              stagger="stagger-2"
            />
            <MetricCard
              label="Hata Oranı"
              value={`%${t.errorRate.toFixed(2)}`}
              color={t.errorRate > 1 ? 'text-red-600' : 'text-emerald-600'}
              stagger="stagger-3"
            />
            <MetricCard
              label="Depolama"
              value={`${t.storageUsed} GB`}
              color="text-slate-700"
              stagger="stagger-4"
            />
          </>
        )}
      </section>

      {/* ── Health Score ── */}
      <section className="mb-8 animate-fade-slide-up stagger-2">
        <div className="glass rounded-3xl p-8 bg-gradient-to-br from-violet-50 to-purple-100 border border-violet-200">
          <h2 className="text-xl font-bold text-violet-900 mb-6">Sistem Sağlık Skoru</h2>
          {loading ? (
            <div className="skeleton h-32 rounded-xl" />
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Big score */}
              <div className="flex flex-col items-center justify-center min-w-[160px]">
                <div className="relative w-36 h-36">
                  <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e9d5ff" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="10"
                      strokeDasharray={`${(h.score / 100) * 263.9} 263.9`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-violet-900">{h.score}</span>
                    <span className="text-sm text-violet-600 font-semibold">/ 100</span>
                  </div>
                </div>
                <span className="pill mt-3 bg-violet-600 text-white px-4 py-1 rounded-full text-lg font-bold">
                  {h.grade}
                </span>
              </div>

              {/* Detail bars */}
              <div className="flex-1 w-full">
                {Object.entries(h.details).map(([key, val]) => (
                  <ProgressBar key={key} label={key} value={val} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Two-column: Compliance + Drift ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-slide-up stagger-3">

        {/* Compliance */}
        <div className="glass rounded-2xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Uyumluluk Raporu</h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-5xl font-extrabold text-emerald-600">{c.score}</span>
                <div className="text-slate-500 text-sm">
                  <span className="text-emerald-600 font-semibold">{c.passed.length} geçti</span>
                  {' · '}
                  <span className="text-red-500 font-semibold">{c.failed.length} başarısız</span>
                </div>
              </div>

              {c.passed.slice(0, 5).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700 mb-1 tracking-wide">Geçti</p>
                  <ul className="space-y-1">
                    {c.passed.slice(0, 5).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.failed.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase text-red-600 mb-1 tracking-wide">Başarısız</p>
                  <ul className="space-y-1">
                    {c.failed.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-red-500 mt-0.5">✗</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-600 mb-1 tracking-wide">Öneriler</p>
                  <ul className="space-y-1">
                    {c.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drift Alerts */}
        <div className="glass rounded-2xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Drift Uyarıları</h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : d.alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
              <span className="text-3xl mb-2">✅</span>
              Drift algılanmadı
            </div>
          ) : (
            <ul className="space-y-3">
              {d.alerts.map((alert, i) => (
                <li key={i} className="rounded-xl border border-slate-100 p-4 bg-white/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{alert.field}</span>
                    <span className={`pill text-xs font-bold px-2 py-0.5 rounded-full ${severityStyle(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="font-medium text-slate-400 uppercase tracking-wide">Beklenen</span>
                      <p className="text-slate-700 font-semibold mt-0.5">{fmt(alert.expected)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-slate-400 uppercase tracking-wide">Gerçek</span>
                      <p className="text-slate-700 font-semibold mt-0.5">{fmt(alert.actual)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Latency Distribution ── */}
      <section className="mb-8 animate-fade-slide-up stagger-4">
        <div className="glass rounded-2xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Gecikme Dağılımı</h2>
          {loading ? (
            <div className="skeleton h-20 rounded-xl" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { label: 'P50', value: l.p50 },
                { label: 'P95', value: l.p95 },
                { label: 'P99', value: l.p99 },
                { label: 'Ort', value: l.avg },
              ] as { label: string; value: number }[]).map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-white/60 border border-slate-100 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                  <p className="metric text-3xl font-extrabold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-400 mt-1">ms</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Performance Snapshots Table ── */}
      <section className="animate-fade-slide-up stagger-4">
        <div className="glass rounded-2xl p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Performans Anlık Görüntüleri</h2>
          {loading ? (
            <div className="skeleton h-40 rounded-xl" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Zaman', 'CPU', 'Bellek', 'P50', 'P95', 'İstek Sayısı'].map((col) => (
                      <th key={col} className="pb-3 text-left font-semibold text-slate-400 uppercase text-xs tracking-wide pr-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.map((snap) => (
                    <tr key={snap.id} className="border-b border-slate-50 hover:bg-white/40 transition-colors">
                      <td className="py-3 pr-4 text-slate-600 tabular-nums">{fmtTime(snap.createdAt)}</td>
                      <td className={`py-3 pr-4 font-semibold tabular-nums ${usageColor(snap.cpuUsage)}`}>
                        {snap.cpuUsage}%
                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${usageBg(snap.cpuUsage)}`} style={{ width: `${snap.cpuUsage}%` }} />
                        </div>
                      </td>
                      <td className={`py-3 pr-4 font-semibold tabular-nums ${usageColor(snap.memUsage)}`}>
                        {snap.memUsage}%
                        <div className="w-16 bg-slate-100 rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${usageBg(snap.memUsage)}`} style={{ width: `${snap.memUsage}%` }} />
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700 tabular-nums">{snap.p50} ms</td>
                      <td className="py-3 pr-4 text-slate-700 tabular-nums">{snap.p95} ms</td>
                      <td className="py-3 pr-4 text-slate-700 tabular-nums">{snap.requestCount.toLocaleString('tr-TR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
