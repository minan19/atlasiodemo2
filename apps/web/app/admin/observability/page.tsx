'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

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

/* ── Icon component ─────────────────────────────────────────── */

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', flexShrink: 0 },
  };

  switch (name) {
    case 'telescope':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...props}>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'database':
      return (
        <svg {...props}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'shield-check':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...props}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'circle-check':
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'cpu':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      );
    case 'memory':
      return (
        <svg {...props}>
          <path d="M6 19v-3" /><path d="M10 19v-3" /><path d="M14 19v-3" /><path d="M18 19v-3" />
          <rect x="2" y="5" width="20" height="11" rx="2" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Small helpers ──────────────────────────────────────────── */

function usageColorStyle(val: number): React.CSSProperties {
  if (val >= 80) return { color: '#ef4444' };
  if (val >= 50) return { color: '#f59e0b' };
  return { color: '#10b981' };
}

function usageBarColor(val: number): string {
  if (val >= 80) return '#ef4444';
  if (val >= 50) return '#f59e0b';
  return '#10b981';
}

function severityStyleInline(sev: string): React.CSSProperties {
  switch (sev.toUpperCase()) {
    case 'HIGH':
      return {
        background: 'color-mix(in srgb, #ef4444 12%, var(--panel))',
        color: '#ef4444',
        border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)',
      };
    case 'MEDIUM':
      return {
        background: 'color-mix(in srgb, #f59e0b 12%, var(--panel))',
        color: '#f59e0b',
        border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)',
      };
    default:
      return {
        background: 'color-mix(in srgb, var(--muted) 15%, var(--panel))',
        color: 'var(--ink-2)',
        border: '1px solid var(--line)',
      };
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
    <div
      style={{
        borderRadius: 'var(--r-xl)',
        background: 'var(--panel)',
        border: '1.5px solid var(--line)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      <div style={{ height: 14, width: '33%', borderRadius: 'var(--r-sm)', background: 'var(--line)', marginBottom: 12 }} />
      <div style={{ height: 28, width: '50%', borderRadius: 'var(--r-sm)', background: 'var(--line)', marginBottom: 8 }} />
      <div style={{ height: 10, width: '66%', borderRadius: 'var(--r-sm)', background: 'var(--line)' }} />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  valueColor: string;
  icon: string;
}

function MetricCard({ label, value, valueColor, icon }: MetricCardProps) {
  return (
    <div
      style={{
        borderRadius: 'var(--r-xl)',
        background: 'var(--panel)',
        border: '1.5px solid var(--line)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'box-shadow var(--t-fast), transform var(--t-fast)',
      }}
      className="obs-metric-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-2)' }}>
        <Icon name={icon} size={15} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color: valueColor, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
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
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{value}%</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 6,
          borderRadius: 99,
          background: 'color-mix(in srgb, var(--accent) 12%, var(--panel))',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 99,
            width: `${pct}%`,
            background: 'var(--accent)',
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function ObservabilityPage() {
  const i18n = useI18n();
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
      setHealth(r0.status    === 'fulfilled' ? { ...DEMO_HEALTH, ...r0.value } : DEMO_HEALTH);
      setDrift(r1.status     === 'fulfilled' ? { ...DEMO_DRIFT, ...(r1.value as DriftData), alerts: Array.isArray((r1.value as DriftData)?.alerts) ? (r1.value as DriftData).alerts : DEMO_DRIFT.alerts } : DEMO_DRIFT);
      setCompliance(r2.status === 'fulfilled' ? { ...DEMO_COMPLIANCE, ...r2.value, passed: Array.isArray((r2.value as ComplianceData)?.passed) ? (r2.value as ComplianceData).passed : DEMO_COMPLIANCE.passed, failed: Array.isArray((r2.value as ComplianceData)?.failed) ? (r2.value as ComplianceData).failed : DEMO_COMPLIANCE.failed, recommendations: Array.isArray((r2.value as ComplianceData)?.recommendations) ? (r2.value as ComplianceData).recommendations : DEMO_COMPLIANCE.recommendations } : DEMO_COMPLIANCE);
      setTenant(r3.status    === 'fulfilled' ? { ...DEMO_TENANT, ...r3.value } : DEMO_TENANT);
      setLatency(r4.status   === 'fulfilled' ? { ...DEMO_LATENCY, ...r4.value } : DEMO_LATENCY);
      setSnapshots(r5.status === 'fulfilled' && Array.isArray(r5.value) && r5.value.length > 0 ? r5.value : DEMO_SNAPSHOTS);
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .obs-fade { animation: fadeSlideUp 0.45s ease both; }

        .obs-metric-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
        .obs-snap-row:hover {
          background: color-mix(in srgb, var(--accent) 4%, var(--panel)) !important;
        }
        .obs-latency-cell:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        /* Responsive grids */
        .obs-metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .obs-metric-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .obs-two-col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .obs-two-col {
            grid-template-columns: 1fr 1fr;
          }
        }

        .obs-latency-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 768px) {
          .obs-latency-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .obs-health-inner {
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: flex-start;
        }
        @media (min-width: 768px) {
          .obs-health-inner {
            flex-direction: row;
          }
        }
      `}</style>

      {/* ── Hero ── */}
      <section
        className="obs-fade"
        style={{ marginBottom: 28, animationDelay: '0ms' }}
      >
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'color-mix(in srgb, var(--accent) 6%, var(--panel))',
            border: '1.5px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
            padding: '32px 28px',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ color: 'var(--accent)' }}>
              <Icon name="telescope" size={28} />
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', margin: 0 }}>
              {i18n.tr("Platform Gözlemlenebilirlik")}
            </h1>
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
            {i18n.tr("Sistem sağlığı, performans ve uyumluluk metrikleri")}
          </p>
        </div>
      </section>

      {/* ── Top metric strip ── */}
      <section className="obs-metric-grid obs-fade" style={{ animationDelay: '60ms' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              label={i18n.tr("Aktif Kullanıcı")}
              value={(t.activeUsers ?? 0).toLocaleString('tr-TR')}
              valueColor="var(--accent)"
              icon="users"
            />
            <MetricCard
              label={i18n.tr("API Çağrısı")}
              value={(t.apiCalls ?? 0).toLocaleString('tr-TR')}
              valueColor="var(--accent-2)"
              icon="zap"
            />
            <MetricCard
              label={i18n.tr("Hata Oranı")}
              value={`%${(t.errorRate ?? 0).toFixed(2)}`}
              valueColor={(t.errorRate ?? 0) > 1 ? '#ef4444' : '#10b981'}
              icon="alert-triangle"
            />
            <MetricCard
              label={i18n.tr("Depolama")}
              value={`${t.storageUsed ?? 0} GB`}
              valueColor="var(--ink)"
              icon="database"
            />
          </>
        )}
      </section>

      {/* ── Health Score ── */}
      <section className="obs-fade" style={{ marginBottom: 24, animationDelay: '120ms' }}>
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'color-mix(in srgb, var(--accent) 5%, var(--panel))',
            border: '1.5px solid color-mix(in srgb, var(--accent) 20%, var(--line))',
            padding: 28,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ color: 'var(--accent)' }}>
              <Icon name="activity" size={18} />
            </span>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {i18n.tr("Sistem Sağlık Skoru")}
            </h2>
          </div>

          {loading ? (
            <div style={{ height: 120, borderRadius: 'var(--r-lg)', background: 'var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <div className="obs-health-inner">
              {/* Big score ring */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 160 }}>
                <div style={{ position: 'relative', width: 144, height: 144 }}>
                  <svg
                    width="144"
                    height="144"
                    viewBox="0 0 100 100"
                    style={{ transform: 'rotate(-90deg)', display: 'block' }}
                  >
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="color-mix(in srgb, var(--accent) 15%, var(--line))"
                      strokeWidth="9"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="9"
                      strokeDasharray={`${(h.score / 100) * 263.9} 263.9`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--ink)', lineHeight: 1 }}>{h.score}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>/ 100</span>
                  </div>
                </div>
                <span
                  style={{
                    marginTop: 12,
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: 99,
                    padding: '4px 18px',
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    boxShadow: 'var(--glow-blue)',
                  }}
                >
                  {h.grade}
                </span>
              </div>

              {/* Detail bars */}
              <div style={{ flex: 1, width: '100%' }}>
                {Object.entries(h.details)
                  .filter(([, val]) => typeof val === 'number')
                  .map(([key, val]) => (
                    <ProgressBar key={key} label={key} value={val as number} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Two-column: Compliance + Drift ── */}
      <section className="obs-two-col obs-fade" style={{ animationDelay: '180ms' }}>

        {/* Compliance */}
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: 22,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ color: '#10b981' }}>
              <Icon name="shield-check" size={17} />
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {i18n.tr("Uyumluluk Raporu")}
            </h2>
          </div>

          {loading ? (
            <div style={{ height: 180, borderRadius: 'var(--r-lg)', background: 'var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 44, fontWeight: 900, color: '#10b981', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {typeof c.score === 'number' ? c.score : 0}
                </span>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{c.passed.length} geçti</span>
                  {' · '}
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>{c.failed.length} başarısız</span>
                </div>
              </div>

              {c.passed.slice(0, 5).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981', marginBottom: 8, margin: '0 0 6px 0' }}>
                    {i18n.tr("Geçti")}
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {c.passed.slice(0, 5).map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                        <span style={{ color: '#10b981', marginTop: 1, flexShrink: 0 }}>
                          <Icon name="check" size={13} />
                        </span>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.failed.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444', margin: '0 0 6px 0' }}>
                    {i18n.tr("Başarısız")}
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {c.failed.map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                        <span style={{ color: '#ef4444', marginTop: 1, flexShrink: 0 }}>
                          <Icon name="x" size={13} />
                        </span>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.recommendations.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', margin: '0 0 6px 0' }}>
                    {i18n.tr("Öneriler")}
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {c.recommendations.map((rec, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                        <span style={{ color: '#f59e0b', marginTop: 1, flexShrink: 0, fontSize: 16, lineHeight: '13px' }}>·</span>
                        {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drift Alerts */}
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: 22,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ color: '#f59e0b' }}>
              <Icon name="alert-triangle" size={17} />
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {i18n.tr("Drift Uyarıları")}
            </h2>
          </div>

          {loading ? (
            <div style={{ height: 180, borderRadius: 'var(--r-lg)', background: 'var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : d.alerts.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 120,
                gap: 10,
                color: 'var(--muted)',
              }}
            >
              <span style={{ color: '#10b981' }}>
                <Icon name="circle-check" size={32} />
              </span>
              <span style={{ fontSize: 13 }}>{i18n.tr("Drift algılanmadı")}</span>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.alerts.map((alert, i) => (
                <li
                  key={i}
                  style={{
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--line)',
                    padding: '12px 14px',
                    background: 'color-mix(in srgb, var(--accent) 3%, var(--panel))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{alert.field}</span>
                    <span
                      style={{
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        ...severityStyleInline(alert.severity),
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {i18n.tr("Beklenen")}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '3px 0 0 0' }}>{fmt(alert.expected)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {i18n.tr("Gerçek")}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '3px 0 0 0' }}>{fmt(alert.actual)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Latency Distribution ── */}
      <section className="obs-fade" style={{ marginBottom: 24, animationDelay: '240ms' }}>
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: 22,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ color: 'var(--accent)' }}>
              <Icon name="clock" size={17} />
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {i18n.tr("Gecikme Dağılımı")}
            </h2>
          </div>

          {loading ? (
            <div style={{ height: 72, borderRadius: 'var(--r-lg)', background: 'var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <div className="obs-latency-grid">
              {([
                { label: 'P50', value: l.p50 },
                { label: 'P95', value: l.p95 },
                { label: 'P99', value: l.p99 },
                { label: 'Ort', value: l.avg },
              ] as { label: string; value: number }[]).map(({ label, value }) => (
                <div
                  key={label}
                  className="obs-latency-cell"
                  style={{
                    borderRadius: 'var(--r-lg)',
                    background: 'color-mix(in srgb, var(--accent) 5%, var(--panel))',
                    border: '1px solid color-mix(in srgb, var(--accent) 15%, var(--line))',
                    padding: '16px 12px',
                    textAlign: 'center',
                    transition: 'box-shadow var(--t-fast), transform var(--t-fast)',
                  }}
                >
                  <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 6, margin: '0 0 6px 0' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: 'var(--ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', margin: 0 }}>
                    {value}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4, margin: '4px 0 0 0' }}>ms</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Performance Snapshots Table ── */}
      <section className="obs-fade" style={{ animationDelay: '300ms' }}>
        <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: 22,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ color: 'var(--accent-3)' }}>
              <Icon name="cpu" size={17} />
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {i18n.tr("Performans Anlık Görüntüleri")}
            </h2>
          </div>

          {loading ? (
            <div style={{ height: 140, borderRadius: 'var(--r-lg)', background: 'var(--line)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                    {['Zaman', 'CPU', 'Bellek', 'P50', 'P95', 'İstek Sayısı'].map((col) => (
                      <th
                        key={col}
                        style={{
                          paddingBottom: 10,
                          paddingRight: 14,
                          textAlign: 'left',
                          fontWeight: 700,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                        }}
                      >
                        {i18n.tr(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.map((snap) => (
                    <tr
                      key={snap.id}
                      className="obs-snap-row"
                      style={{
                        borderBottom: '1px solid var(--line)',
                        transition: 'background var(--t-fast)',
                      }}
                    >
                      <td style={{ padding: '11px 14px 11px 0', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtTime(snap.createdAt)}
                      </td>
                      <td style={{ padding: '11px 14px 11px 0', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontWeight: 700, ...usageColorStyle(snap.cpuUsage) }}>
                          {snap.cpuUsage}%
                        </span>
                        <div style={{ width: 56, height: 4, borderRadius: 99, background: 'var(--line)', marginTop: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              borderRadius: 99,
                              width: `${snap.cpuUsage}%`,
                              background: usageBarColor(snap.cpuUsage),
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px 11px 0', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ fontWeight: 700, ...usageColorStyle(snap.memUsage) }}>
                          {snap.memUsage}%
                        </span>
                        <div style={{ width: 56, height: 4, borderRadius: 99, background: 'var(--line)', marginTop: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              borderRadius: 99,
                              width: `${snap.memUsage}%`,
                              background: usageBarColor(snap.memUsage),
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px 11px 0', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {snap.p50} ms
                      </td>
                      <td style={{ padding: '11px 14px 11px 0', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {snap.p95} ms
                      </td>
                      <td style={{ padding: '11px 14px 11px 0', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {(snap.requestCount ?? 0).toLocaleString('tr-TR')}
                      </td>
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
