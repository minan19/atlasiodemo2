'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN_KEY = 'accessToken';

type Summary = {
  instructorId: string;
  periodStart: string;
  periodEnd: string;
  completedEnrollments: number;
  refundCount: number;
  courseRevenue: string;
  refundImpact: string;
  baseFee: string;
  perEnrollmentFee: string;
  revenueShare: string;
  perEnrollmentTotal: string;
  revenueShareTotal: string;
  payoutAmount: string;
};

type PaymentRecord = {
  id: string;
  periodStart: string;
  periodEnd: string;
  completedEnrollments: number;
  refundCount: number;
  courseRevenue: string;
  amount: string;
  status: string;
  paidAt?: string | null;
  notes?: string | null;
};

function formatCurrency(value: string) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '0 TL';
  return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('tr-TR');
}

const DEMO_HISTORY: PaymentRecord[] = [
  {
    id: 'demo-1',
    periodStart: '2025-01-01',
    periodEnd: '2025-01-31',
    completedEnrollments: 12,
    refundCount: 1,
    courseRevenue: '4800',
    amount: '3200',
    status: 'PAID',
    paidAt: '2025-02-05',
    notes: null,
  },
  {
    id: 'demo-2',
    periodStart: '2025-02-01',
    periodEnd: '2025-02-28',
    completedEnrollments: 8,
    refundCount: 0,
    courseRevenue: '3200',
    amount: '2100',
    status: 'PENDING',
    paidAt: null,
    notes: null,
  },
];

export default function InstructorEarningsPage() {
  const [token, setToken] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - rangeDays + 1);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [rangeDays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? '');
  }, []);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const load = async () => {
    if (!headers) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ start: range.start, end: range.end });
      const [summaryRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/instructor-payments/me/summary?${params}`, { headers }),
        fetch(`${API_BASE}/instructor-payments/me/history?limit=6`, { headers }),
      ]);
      if (!summaryRes.ok || !historyRes.ok) {
        throw new Error('Veri yüklenemedi');
      }
      const [summaryData, historyData] = await Promise.all([summaryRes.json(), historyRes.json()]);
      setSummary(summaryData);
      setHistory(historyData ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Veri alınamadı');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (headers) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, range.start, range.end]);

  if (!token) {
    return (
      <div className="glass space-y-4 rounded-2xl p-6">
        <p className="text-slate-600 dark:text-slate-400">Önce giriş yapmanız gerekiyor.</p>
        <Link href="/login" className="btn-link">
          Giriş yap
        </Link>
      </div>
    );
  }

  const payout = summary ? Number(summary.payoutAmount) : 0;
  const barWidth = (val: string) => {
    if (!payout || payout === 0) return '0%';
    const pct = Math.min(100, Math.max(0, (Number(val) / payout) * 100));
    return `${pct.toFixed(1)}%`;
  };

  const isDemo = history.length === 0 && summary === null;
  const displayHistory = isDemo ? DEMO_HISTORY : history;

  return (
    <main className="space-y-6">
      {/* Hero Header */}
      <header className="glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Hakediş Panosu
              </h1>
              <span className="pill bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Eğitmen Finans
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg">
              Otomatik hesaplanan hak edişleri, tamamlanan eğitimler ve toplam gelirler burada toplanıyor.
            </p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
              {dateLabel(range.start)} – {dateLabel(range.end)}
            </p>
          </div>
          <button
            onClick={load}
            className="btn-link self-start"
            disabled={busy}
          >
            {busy ? 'Yenileniyor…' : 'Yenile'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              disabled={busy}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                rangeDays === days
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              Son {days} gün
            </button>
          ))}
        </div>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon="💰"
          label="Hak ediş"
          value={summary ? formatCurrency(summary.payoutAmount) : '—'}
          gradient="from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"
          trendColor="text-emerald-600 dark:text-emerald-400"
          trendLabel={summary ? `${summary.completedEnrollments} tamamlanan` : 'veri bekleniyor'}
        />
        <MetricCard
          icon="📈"
          label="Toplam Gelir"
          value={summary ? formatCurrency(summary.courseRevenue) : '—'}
          gradient="from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
          trendColor="text-blue-600 dark:text-blue-400"
          trendLabel={summary ? `${summary.refundCount} iade` : 'veri bekleniyor'}
        />
        <MetricCard
          icon="🎓"
          label="Tamamlanan"
          value={summary ? `${summary.completedEnrollments} kişi` : '—'}
          gradient="from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20"
          trendColor="text-violet-600 dark:text-violet-400"
          trendLabel={summary ? `dönem: ${rangeDays} gün` : 'veri bekleniyor'}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {/* Revenue Breakdown */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gelir Bileşenleri</p>
          <div className="space-y-3">
            {[
              { label: 'Sabit Ücret', val: summary?.baseFee ?? '0' },
              { label: 'Kişi Başı', val: summary?.perEnrollmentTotal ?? '0' },
              { label: 'Paylaşım', val: summary?.revenueShareTotal ?? '0' },
              { label: 'İade Etkisi', val: summary?.refundImpact ?? '0' },
            ].map(({ label, val }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <strong className="text-slate-800 dark:text-slate-100">{summary ? formatCurrency(val) : '—'}</strong>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                    style={{ width: summary ? barWidth(val) : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Earnings Info */}
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Özet</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {summary
              ? `Temel ücret + ${summary.completedEnrollments} tamamlanan eğitim üzerinden hesaplanır. İade edilenler toplamdan düşülür. Seçili dönem: ${dateLabel(range.start)} – ${dateLabel(range.end)}.`
              : 'Dönem seçip "Yenile" düğmesine tıklayarak gelir bilgilerinizi görüntüleyebilirsiniz.'}
          </p>
          {summary && (
            <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
              <div>Kişi başı ücret: {formatCurrency(summary.perEnrollmentFee)}</div>
              <div>Gelir paylaşım oranı: %{(Number(summary.revenueShare) * 100).toFixed(0)}</div>
            </div>
          )}
        </div>
      </section>

      {/* Payment History */}
      <section className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Hak Ediş Geçmişi</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Son 6 kayıt</p>
          </div>
          <span className="pill bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs">
            {dateLabel(range.start)} – {dateLabel(range.end)}
          </span>
        </div>

        {isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
            Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.
          </div>
        )}

        <div className="space-y-3">
          {busy && !displayHistory.length ? (
            <>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="animate-pulse flex items-center justify-between gap-4 rounded-xl border border-slate-100 dark:border-slate-700 p-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </>
          ) : displayHistory.length ? (
            displayHistory.map((row) => (
              <div
                key={row.id}
                className="glass flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {dateLabel(row.periodStart)} – {dateLabel(row.periodEnd)}
                  </div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.amount)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Tamamlanan: {row.completedEnrollments} · İadeler: {row.refundCount}
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">Henüz kayıt yok.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Tamamlanan eğitimler sonrası hak ediş kayıtları burada görünür.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  gradient,
  trendColor,
  trendLabel,
}: {
  icon: string;
  label: string;
  value: string;
  gradient: string;
  trendColor: string;
  trendLabel: string;
}) {
  return (
    <div className={`glass rounded-2xl p-5 bg-gradient-to-br ${gradient} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl" role="img" aria-label={label}>{icon}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium bg-white/60 dark:bg-black/20 ${trendColor}`}>
          {trendLabel}
        </span>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; tone: string }> = {
    PENDING: {
      label: 'Bekliyor',
      tone: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    PAID: {
      label: 'Ödendi',
      tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    CANCELLED: {
      label: 'İptal',
      tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    },
  };
  const badge = config[status] ?? { label: status, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>
      {badge.label}
    </span>
  );
}
