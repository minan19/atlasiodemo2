'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

type Period = '7d' | '30d' | '90d';

interface DataPoint {
  date: string;
  count?: number;
  amount?: number;
}

interface TopCourse {
  id: string;
  title: string;
  enrollments: number;
  completionRate: number;
  revenue: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  enrollments: DataPoint[];
  completions: DataPoint[];
  revenue: DataPoint[];
  activeUsers: DataPoint[];
  topCourses: TopCourse[];
  categoryBreakdown: CategoryBreakdown[];
  retentionRate: number;
  avgSessionDuration: number;
  nps: number;
}

/* ─────────────────────────────────────────────
   Demo data factories
───────────────────────────────────────────── */

function generateDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(
      d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
    );
  }
  return dates;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t + (Math.random() - 0.5) * (b - a) * 0.15);
}

function buildDemoData(period: Period): AnalyticsData {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const dates = generateDates(days);

  const enrollments: DataPoint[] = dates.map((date, i) => ({
    date,
    count: lerp(45, 120, i / (days - 1)),
  }));

  const completions: DataPoint[] = dates.map((date, i) => ({
    date,
    count: lerp(18, 65, i / (days - 1)),
  }));

  const revenue: DataPoint[] = dates.map((date, i) => ({
    date,
    amount: lerp(500, 3500, i / (days - 1)),
  }));

  const activeUsers: DataPoint[] = dates.map((date, i) => ({
    date,
    count: lerp(120, 380, i / (days - 1)),
  }));

  const topCourses: TopCourse[] = [
    {
      id: '1',
      title: 'React ile Modern Web Geliştirme',
      enrollments: 342,
      completionRate: 78,
      revenue: 68400,
    },
    {
      id: '2',
      title: 'Python ile Veri Bilimi',
      enrollments: 289,
      completionRate: 65,
      revenue: 57800,
    },
    {
      id: '3',
      title: 'UI/UX Tasarım Temelleri',
      enrollments: 215,
      completionRate: 82,
      revenue: 43000,
    },
    {
      id: '4',
      title: 'İngilizce B2 Hazırlık',
      enrollments: 198,
      completionRate: 71,
      revenue: 39600,
    },
    {
      id: '5',
      title: 'İş Analitiği & Excel Pro',
      enrollments: 174,
      completionRate: 69,
      revenue: 34800,
    },
  ];

  const categoryBreakdown: CategoryBreakdown[] = [
    { category: 'Yazılım', count: 842, percentage: 40 },
    { category: 'Tasarım', count: 526, percentage: 25 },
    { category: 'İş', count: 421, percentage: 20 },
    { category: 'Dil', count: 316, percentage: 15 },
  ];

  return {
    enrollments,
    completions,
    revenue,
    activeUsers,
    topCourses,
    categoryBreakdown,
    retentionRate: 73,
    avgSessionDuration: 38,
    nps: 62,
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="metric">
      <div className="skeleton" style={{ height: 12, width: '60%' }} />
      <div className="skeleton" style={{ height: 28, width: '80%', marginTop: 8 }} />
      <div className="skeleton" style={{ height: 10, width: '40%', marginTop: 6 }} />
    </div>
  );
}

function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height, borderRadius: 'var(--r-lg)', width: '100%' }}
    />
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: { value: number; label: string } | null;
  accent?: 'green' | 'amber' | 'red' | 'blue' | 'default';
  className?: string;
}

function KpiCard({ label, value, icon, trend, accent = 'default', className = '' }: KpiCardProps) {
  const accentColor =
    accent === 'green'
      ? 'var(--accent)'
      : accent === 'amber'
      ? 'var(--accent-3)'
      : accent === 'red'
      ? '#ef4444'
      : accent === 'blue'
      ? 'var(--accent-2)'
      : 'var(--ink)';

  return (
    <div className={`metric ${className}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle accent glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          borderRadius: '0 var(--r-lg) 0 80px',
          background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="label">{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div
        className="value"
        style={{ color: accentColor, marginTop: 4 }}
      >
        {value}
      </div>
      {trend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            marginTop: 4,
            color: trend.value >= 0 ? 'var(--accent)' : '#ef4444',
            fontWeight: 600,
          }}
        >
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass"
      style={{ padding: '10px 14px', fontSize: 12, minWidth: 140 }}
    >
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: entry.color, fontWeight: 700 }}
        >
          <span>{entry.name}</span>
          <span>{entry.value.toLocaleString('tr-TR')}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass"
      style={{ padding: '10px 14px', fontSize: 12, minWidth: 140 }}
    >
      <div style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--accent-2)', fontWeight: 700 }}
        >
          <span>Gelir</span>
          <span>
            {entry.value.toLocaleString('tr-TR', {
              style: 'currency',
              currency: 'TRY',
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SVG Donut Chart
───────────────────────────────────────────── */

const CATEGORY_COLORS = ['#10a97b', '#2d7df6', '#f59e0b', '#8b5cf6'];

function DonutChart({ data }: { data: CategoryBreakdown[] }) {
  const cx = 80;
  const cy = 80;
  const r = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const arcs = data.map((item, i) => {
    const startAngle = (cumulative / 100) * 360 - 90;
    const dashLen = (item.percentage / 100) * circumference;
    const dashOffset = -(cumulative / 100) * circumference;
    cumulative += item.percentage;
    return { ...item, color: CATEGORY_COLORS[i], dashLen, dashOffset, startAngle };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--line-2)"
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }}
          />
        ))}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="var(--ink)"
          fontSize={18}
          fontWeight={800}
        >
          {data.reduce((s, d) => s + d.count, 0).toLocaleString('tr-TR')}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize={10}
        >
          toplam
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'grid', gap: 10, flex: 1 }}>
        {arcs.map((arc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: arc.color,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              {arc.category}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {arc.percentage}%
            </div>
            <div
              style={{
                width: 50,
                height: 4,
                borderRadius: 99,
                background: 'var(--line-2)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${arc.percentage}%`,
                  background: arc.color,
                  borderRadius: 99,
                  transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Retention Heatmap (7 cohorts × 4 weeks)
───────────────────────────────────────────── */

const RETENTION_DATA: number[][] = [
  [100, 72, 58, 47],
  [100, 68, 54, 43],
  [100, 75, 61, 51],
  [100, 70, 56, 44],
  [100, 78, 63, 55],
  [100, 65, 50, 38],
  [100, 73, 60, 49],
];

const COHORT_LABELS = ['Kohort 1', 'Kohort 2', 'Kohort 3', 'Kohort 4', 'Kohort 5', 'Kohort 6', 'Kohort 7'];
const WEEK_LABELS = ['Hf. 1', 'Hf. 2', 'Hf. 3', 'Hf. 4'];

function retentionColor(pct: number): string {
  if (pct === 100) return 'rgba(45,125,246,0.85)';
  if (pct >= 70) return 'rgba(16,169,123,0.85)';
  if (pct >= 55) return 'rgba(16,169,123,0.55)';
  if (pct >= 40) return 'rgba(245,158,11,0.55)';
  return 'rgba(239,68,68,0.45)';
}

function RetentionHeatmap() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'separate',
          borderSpacing: 4,
          width: '100%',
          tableLayout: 'fixed',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: 90,
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--muted)',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Kohort
            </th>
            {WEEK_LABELS.map((w) => (
              <th
                key={w}
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textAlign: 'center',
                  background: 'transparent',
                  border: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RETENTION_DATA.map((row, ri) => (
            <tr key={ri}>
              <td
                style={{
                  padding: '6px 8px',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  fontWeight: 600,
                  border: 'none',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                }}
              >
                {COHORT_LABELS[ri]}
              </td>
              {row.map((pct, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: 0,
                    border: 'none',
                    verticalAlign: 'middle',
                  }}
                >
                  <div
                    title={`${COHORT_LABELS[ri]} - ${WEEK_LABELS[ci]}: %${pct}`}
                    style={{
                      background: retentionColor(pct),
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 40,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'default',
                      transition: 'opacity 0.2s',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.opacity = '1';
                    }}
                  >
                    %{pct}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 16,
          flexWrap: 'wrap',
          fontSize: 11,
          color: 'var(--muted)',
        }}
      >
        {[
          { color: 'rgba(45,125,246,0.85)', label: '%100 (Başlangıç)' },
          { color: 'rgba(16,169,123,0.85)', label: '≥70% (İyi)' },
          { color: 'rgba(16,169,123,0.55)', label: '55–69% (Orta)' },
          { color: 'rgba(245,158,11,0.55)', label: '40–54% (Zayıf)' },
          { color: 'rgba(239,68,68,0.45)', label: '<40% (Kritik)' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: l.color,
                flexShrink: 0,
              }}
            />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Top Courses Table
───────────────────────────────────────────── */

function TopCoursesTable({ courses }: { courses: TopCourse[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center', width: 36 }}>#</th>
            <th style={{ textAlign: 'left' }}>Kurs Adı</th>
            <th style={{ textAlign: 'right' }}>Kayıt</th>
            <th style={{ textAlign: 'left', minWidth: 120 }}>Tamamlanma</th>
            <th style={{ textAlign: 'right' }}>Gelir</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, i) => (
            <tr
              key={c.id}
              style={{
                borderTop: '1px solid var(--line-2)',
                transition: 'background var(--t-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background =
                  'color-mix(in srgb, var(--accent) 5%, transparent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
              }}
            >
              <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background:
                      i === 0
                        ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
                        : i === 1
                        ? 'linear-gradient(135deg,#6b7280,#9ca3af)'
                        : i === 2
                        ? 'linear-gradient(135deg,#b45309,#d97706)'
                        : 'var(--line-2)',
                    color: i < 3 ? '#fff' : 'var(--ink-2)',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {i + 1}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>
                {c.title}
              </td>
              <td
                style={{
                  textAlign: 'right',
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: 'var(--accent-2)',
                }}
              >
                {c.enrollments.toLocaleString('tr-TR')}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    className="progress-track"
                    style={{ flex: 1, height: 5 }}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${c.completionRate}%` }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        c.completionRate >= 75
                          ? 'var(--accent)'
                          : c.completionRate >= 60
                          ? 'var(--accent-3)'
                          : '#ef4444',
                      minWidth: 30,
                      textAlign: 'right',
                    }}
                  >
                    %{c.completionRate}
                  </span>
                </div>
              </td>
              <td
                style={{
                  textAlign: 'right',
                  padding: '10px 12px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                }}
              >
                {c.revenue.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                  maximumFractionDigits: 0,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section header helper
───────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: subtitle ? 4 : 0,
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', paddingLeft: 28 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Period selector
───────────────────────────────────────────── */

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: '7 Gün', value: '7d' },
  { label: '30 Gün', value: '30d' },
  { label: '90 Gün', value: '90d' },
];

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        borderRadius: 'var(--r-full)',
        background: 'var(--line-2)',
        border: '1px solid var(--line)',
      }}
    >
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 14px',
            borderRadius: 'var(--r-full)',
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--t-fast)',
            background:
              value === opt.value
                ? 'var(--panel)'
                : 'transparent',
            color:
              value === opt.value
                ? 'var(--accent)'
                : 'var(--muted)',
            boxShadow:
              value === opt.value
                ? 'var(--shadow-sm)'
                : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/reports/analytics?period=${p}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch {
      // Fall back to demo data so the page is always usable
      setData(buildDemoData(p));
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  /* ── Derived KPI values ── */
  const kpi = useMemo(() => {
    if (!data) return null;

    const totalEnrollments = data.enrollments.reduce(
      (s, d) => s + (d.count ?? 0),
      0
    );
    const totalCompletions = data.completions.reduce(
      (s, d) => s + (d.count ?? 0),
      0
    );
    const completionRate =
      totalEnrollments > 0
        ? Math.round((totalCompletions / totalEnrollments) * 100)
        : 0;
    const totalRevenue = data.revenue.reduce(
      (s, d) => s + (d.amount ?? 0),
      0
    );
    const avgActiveUsers =
      data.activeUsers.length > 0
        ? Math.round(
            data.activeUsers.reduce((s, d) => s + (d.count ?? 0), 0) /
              data.activeUsers.length
          )
        : 0;

    // Mock trend vs previous period (would come from API in production)
    const enrollmentTrend = 14;
    const revenueTrend = 22;

    return {
      totalEnrollments,
      completionRate,
      totalRevenue,
      avgActiveUsers,
      enrollmentTrend,
      revenueTrend,
    };
  }, [data]);

  /* ── Chart data merges enrollments & completions ── */
  const activityChartData = useMemo(() => {
    if (!data) return [];
    return data.enrollments.map((e, i) => ({
      date: e.date,
      Kayıt: e.count ?? 0,
      Tamamlanma: data.completions[i]?.count ?? 0,
    }));
  }, [data]);

  const revenueChartData = useMemo(() => {
    if (!data) return [];
    return data.revenue.map((r) => ({
      date: r.date,
      Gelir: r.amount ?? 0,
    }));
  }, [data]);

  /* ── NPS accent ── */
  const npsAccent: KpiCardProps['accent'] =
    !data
      ? 'default'
      : data.nps > 50
      ? 'green'
      : data.nps > 0
      ? 'amber'
      : 'red';

  /* ── Tick formatter — show only every N-th label so axis isn't crowded ── */
  function xTickFormatter(value: string, index: number) {
    const step = period === '90d' ? 10 : period === '30d' ? 5 : 1;
    return index % step === 0 ? value : '';
  }

  return (
    <div className="page-shell">
      {/* Background decoration */}
      <div className="bg-canvas" />
      <div className="bg-grid" />

      {/* ── HERO ── */}
      <section
        className="glass hero animate-fade-slide-up"
        style={{ padding: '28px 32px', marginBottom: 20 }}
      >
        <div className="hero-content">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--r-lg)',
                    background:
                      'linear-gradient(135deg, var(--accent-2), var(--accent))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    boxShadow: 'var(--glow-blue)',
                  }}
                >
                  📊
                </div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 26,
                      fontWeight: 800,
                      background:
                        'linear-gradient(120deg, var(--accent-2), var(--accent))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Analitik Merkezi
                  </h1>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}
                  >
                    Platform performansını gerçek zamanlı izle
                  </p>
                </div>
              </div>

              {/* Quick stats pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span className="pill pill-sm">
                  <span className="status-dot online" />
                  Canlı Veri
                </span>
                {lastUpdated && (
                  <span className="pill pill-sm pill-dark">
                    🕐 Son güncelleme:{' '}
                    {lastUpdated.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                <span className="pill pill-sm pill-dark">
                  📅 {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
                </span>
              </div>
            </div>

            {/* Period selector */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 10,
              }}
            >
              <PeriodSelector value={period} onChange={setPeriod} />
              <button
                onClick={() => fetchData(period)}
                disabled={loading}
                className="btn-link"
                style={{ fontSize: 12, padding: '6px 14px' }}
              >
                {loading ? '⏳ Yükleniyor…' : '🔄 Yenile'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div
          className="animate-fade-slide-up"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--r-md)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#ef4444',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          ⚠️ {error} — Demo verisi gösteriliyor.
        </div>
      )}

      {/* ── KPI STRIP ── */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            <>
              <KpiCard
                label="Toplam Kayıt"
                value={kpi?.totalEnrollments.toLocaleString('tr-TR') ?? '—'}
                icon="🎓"
                trend={
                  kpi ? { value: kpi.enrollmentTrend, label: 'önceki dönem' } : null
                }
                accent="blue"
                className="animate-fade-slide-up stagger-1"
              />
              <KpiCard
                label="Tamamlanma Oranı"
                value={`%${kpi?.completionRate ?? 0}`}
                icon="✅"
                accent={
                  (kpi?.completionRate ?? 0) >= 70
                    ? 'green'
                    : (kpi?.completionRate ?? 0) >= 50
                    ? 'amber'
                    : 'red'
                }
                className="animate-fade-slide-up stagger-2"
              />
              <KpiCard
                label="Toplam Gelir"
                value={
                  kpi
                    ? kpi.totalRevenue.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                        maximumFractionDigits: 0,
                      })
                    : '—'
                }
                icon="💰"
                trend={
                  kpi ? { value: kpi.revenueTrend, label: 'önceki dönem' } : null
                }
                accent="green"
                className="animate-fade-slide-up stagger-3"
              />
              <KpiCard
                label="Aktif Kullanıcı"
                value={kpi?.avgActiveUsers.toLocaleString('tr-TR') ?? '—'}
                icon="👥"
                accent="blue"
                className="animate-fade-slide-up stagger-4"
              />
              <KpiCard
                label="NPS Skoru"
                value={data ? String(data.nps) : '—'}
                icon="⭐"
                accent={npsAccent}
                className="animate-fade-slide-up stagger-1"
              />
              <KpiCard
                label="Ort. Seans Süresi"
                value={data ? `${data.avgSessionDuration} dk` : '—'}
                icon="⏱️"
                accent="default"
                className="animate-fade-slide-up stagger-2"
              />
            </>
          )}
        </div>
      </section>

      {/* ── CHARTS ROW 1 ── */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {/* Left: Activity Area Chart */}
          <div className="glass animate-fade-slide-up stagger-1" style={{ padding: 24 }}>
            <SectionHeader
              icon="📈"
              title="Kayıt & Tamamlanma Trendi"
              subtitle="Zaman içindeki öğrenci aktivitesi"
            />
            {loading ? (
              <SkeletonChart height={260} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={activityChartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradEnrollment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d7df6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2d7df6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompletion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10a97b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10a97b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--line-2)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(v) => (
                      <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{v}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="Kayıt"
                    stroke="#2d7df6"
                    strokeWidth={2}
                    fill="url(#gradEnrollment)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#2d7df6' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Tamamlanma"
                    stroke="#10a97b"
                    strokeWidth={2}
                    fill="url(#gradCompletion)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10a97b' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right: Revenue Bar Chart */}
          <div className="glass animate-fade-slide-up stagger-2" style={{ padding: 24 }}>
            <SectionHeader
              icon="💹"
              title="Günlük Gelir"
              subtitle="₺ cinsinden dönemsel gelir dağılımı"
            />
            {loading ? (
              <SkeletonChart height={260} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={revenueChartData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <defs>
                    <linearGradient id="gradRevBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4d9bff" stopOpacity={1} />
                      <stop offset="100%" stopColor="#2d7df6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--line-2)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `₺${(v / 1000).toFixed(0)}B` : `₺${v}`
                    }
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Bar
                    dataKey="Gelir"
                    fill="url(#gradRevBar)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  >
                    {revenueChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="url(#gradRevBar)"
                        opacity={0.85 + (index % 3) * 0.05}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* ── CHARTS ROW 2 ── */}
      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {/* Left: Top Courses Table */}
          <div className="glass animate-fade-slide-up stagger-3" style={{ padding: 24 }}>
            <SectionHeader
              icon="🏆"
              title="En İyi 5 Kurs"
              subtitle="Kayıt, tamamlanma ve gelire göre"
            />
            {loading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 44 }} />
                ))}
              </div>
            ) : data?.topCourses ? (
              <TopCoursesTable courses={data.topCourses} />
            ) : null}
          </div>

          {/* Right: Category Donut */}
          <div className="glass animate-fade-slide-up stagger-4" style={{ padding: 24 }}>
            <SectionHeader
              icon="🍩"
              title="Kategori Dağılımı"
              subtitle="İçerik kategorilerine göre kayıt oranları"
            />
            {loading ? (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <div
                  className="skeleton"
                  style={{ width: 160, height: 160, borderRadius: '50%', flexShrink: 0 }}
                />
                <div style={{ flex: 1, display: 'grid', gap: 12 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 18 }} />
                  ))}
                </div>
              </div>
            ) : data?.categoryBreakdown ? (
              <DonutChart data={data.categoryBreakdown} />
            ) : null}
          </div>
        </div>
      </section>

      {/* ── RETENTION HEATMAP ── */}
      <section className="animate-fade-slide-up stagger-4" style={{ marginBottom: 20 }}>
        <div className="glass" style={{ padding: 24 }}>
          <SectionHeader
            icon="🔥"
            title="Kohort Tutma Analizi"
            subtitle="7 kohort × 4 haftalık tutma oranları"
          />
          {loading ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 40, width: `${100 - i * 3}%` }}
                />
              ))}
            </div>
          ) : (
            <RetentionHeatmap />
          )}
        </div>
      </section>

      {/* ── FOOTER METADATA ── */}
      <div
        className="animate-fade-slide-up"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          padding: '12px 4px',
          borderTop: '1px solid var(--line-2)',
          fontSize: 11,
          color: 'var(--muted)',
        }}
      >
        <span>
          ATLASIO Analitik Merkezi · Dönem:{' '}
          <strong style={{ color: 'var(--ink-2)' }}>
            {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
          </strong>
        </span>
        <span>
          {lastUpdated
            ? `Güncellendi: ${lastUpdated.toLocaleString('tr-TR')}`
            : 'Yükleniyor…'}
        </span>
      </div>
    </div>
  );
}
