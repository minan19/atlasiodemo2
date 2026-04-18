'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN_KEY = 'accessToken';

type Instructor = { id: string; email: string; name?: string; role: string };

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

type ApprovalItem = {
  id: string;
  instructor: string;
  kind: "Gönüllü Ek Süre" | "Bonus / Hediye";
  detail: string;
  requestedBy: string;
  suggestedAmount: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

function formatCurrency(value: string) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '0 ₺';
  return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('tr-TR');
}

export default function AdminPaymentsPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);

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

  const loadApprovals = async () => {
    if (!headers) return;
    setApprovalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/volunteer-contents/admin?status=PENDING`, { headers });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{
        id: string; title: string; contentType: string; status: string;
        suggestedAmount?: string | null;
        User?: { name?: string | null; email: string } | null;
      }>;
      setApprovalItems(data.map((v) => ({
        id: v.id,
        instructor: v.User?.name ?? v.User?.email ?? "Eğitmen",
        kind: v.contentType === "VOLUNTEER_EXTRA" ? "Gönüllü Ek Süre" : "Bonus / Hediye",
        detail: v.title,
        requestedBy: v.User?.name ?? v.User?.email ?? "Eğitmen",
        suggestedAmount: v.suggestedAmount ?? "0 ₺",
        status: v.status as "PENDING" | "APPROVED" | "REJECTED",
      })));
    } catch {
      // Sessizce geç
    } finally {
      setApprovalLoading(false);
    }
  };

  const loadInstructors = async () => {
    if (!headers) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/users`, { headers });
      if (!res.ok) throw new Error('Eğitmenler yüklenemedi');
      const data = (await res.json()) as Instructor[];
      const filtered = data.filter((item) => item.role === 'INSTRUCTOR');
      setInstructors(filtered);
      if (!selectedInstructorId && filtered.length) {
        setSelectedInstructorId(filtered[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eğitmenler alınamadı');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadInstructors();
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  useEffect(() => {
    if (!selectedInstructorId || !headers) return;
    refresh(selectedInstructorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstructorId, headers, range.start, range.end]);

  const refresh = async (instructorId: string) => {
    setBusy(true);
    setError(null);
    try {
      const summaryParams = new URLSearchParams({ start: range.start, end: range.end });
      const [summaryRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/instructor-payments/admin/${instructorId}/summary?${summaryParams}`, { headers }),
        fetch(`${API_BASE}/instructor-payments/admin/${instructorId}/history?limit=8`, { headers }),
      ]);
      if (!summaryRes.ok || !historyRes.ok) throw new Error('Ödeme bilgileri alınamadı');
      const [summaryData, historyData] = await Promise.all([summaryRes.json(), historyRes.json()]);
      setSummary(summaryData);
      setHistory(historyData ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Veri yüklenemedi');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedInstructorId || !headers) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/instructor-payments/admin/${selectedInstructorId}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(range),
      });
      if (!res.ok) throw new Error('Hak ediş oluşturulamadı');
      const { payment } = await res.json();
      setMessage(`Hak ediş kaydı ${dateLabel(payment.periodStart)} – ${dateLabel(payment.periodEnd)} için hazır.`);
      refresh(selectedInstructorId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (!headers) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/instructor-payments/admin/${paymentId}/pay`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Ödeme manuel olarak işaretlendi' }),
      });
      if (!res.ok) throw new Error('Ödeme durumu güncellenemedi');
      setMessage('Ödeme durumu güncellendi.');
      if (selectedInstructorId) refresh(selectedInstructorId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ödeme kaydı güncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  const handleApproval = async (id: string, next: "APPROVED" | "REJECTED") => {
    if (!headers) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/volunteer-contents/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('Durum güncellenemedi');
      setApprovalItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: next } : item))
      );
      setMessage(next === "APPROVED" ? "Onay verildi ve mahsuplaşmaya alındı." : "Talep reddedildi.");
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">{t.tr("Admin olarak giriş yapıp ardından tekrar deneyin.")}</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">{t.tr("Finans Merkezi")}</div>
          <h1 className="text-3xl font-semibold">{t.tr("Eğitmen Ödeme Merkezi")}</h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            {t.tr("Hak edişleri görüntüleyin, manuel ödeme durumlarını kaydedin ve kurumsal raporlama için yeni kayıtlar oluşturun.")}
          </p>
        </div>
      </header>

      <section className="glass rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            onChange={(event) => setSelectedInstructorId(event.target.value)}
            value={selectedInstructorId ?? ''}
          >
            <option value="">{t.tr("Eğitmen seç")}</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name ?? instructor.email}
              </option>
            ))}
          </select>
          <div className="flex gap-2 text-sm">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                className={`btn-link ${rangeDays === days ? 'bg-accent-soft text-accent' : ''}`}
                onClick={() => setRangeDays(days)}
                disabled={busy}
              >
                {t.tr("Son")} {days} {t.tr("gün")}
              </button>
            ))}
          </div>
          <button className="btn-link" onClick={() => selectedInstructorId && refresh(selectedInstructorId)} disabled={busy}>
            {t.tr("Yenile")}
          </button>
          <button className="btn-link" onClick={handleGenerate} disabled={!selectedInstructorId || busy}>
            {t.tr("Hak ediş oluştur")}
          </button>
        </div>
        {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t.tr("Hak ediş")} value={summary ? formatCurrency(summary.payoutAmount) : '—'} idx={0} />
        <MetricCard label={t.tr("Toplam gelir")} value={summary ? formatCurrency(summary.courseRevenue) : '—'} idx={1} />
        <MetricCard label={t.tr("Tamamlanan")} value={summary ? `${summary.completedEnrollments} ${t.tr("adet")}` : '—'} idx={2} />
      </section>

      <section className="glass rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
            {t.tr("Ek süre / bonus talepleri")}
          </h2>
          <span className="pill text-xs">{t.tr("Yönetici onayı ile kesinleşir")}</span>
        </div>
        <div className="mt-4 space-y-3">
          {approvalLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-3 animate-pulse flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-100 rounded" />
              </div>
            ))
          ) : approvalItems.length ? (
            approvalItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3">
                <div className="space-y-1">
                  <div className="text-sm text-slate-500">{item.instructor} · {item.kind}</div>
                  <div className="font-semibold">{item.detail}</div>
                  <div className="text-xs text-slate-500">{t.tr("Talep")}: {item.requestedBy} · {t.tr("Kod")}: {item.id}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{item.suggestedAmount}</span>
                  <StatusBadge status={item.status} tr={t.tr} />
                  {item.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button className="btn-link" onClick={() => handleApproval(item.id, "APPROVED")}>{t.tr("Onayla")}</button>
                      <button className="btn-link text-rose-700 border-rose-200" onClick={() => handleApproval(item.id, "REJECTED")}>{t.tr("Reddet")}</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">{t.tr("Bekleyen onay yok.")}</p>
          )}
        </div>
      </section>

      <section className="glass rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
            {instructors.find((item) => item.id === selectedInstructorId)?.name ?? t.tr('Seçili eğitmen')}
          </h2>
          <span className="pill text-xs">{range.start} – {range.end}</span>
        </div>
        <div className="mt-4 space-y-3">
          {history.length ? (
            history.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-3">
                <div>
                  <div className="text-sm text-slate-500">
                    {dateLabel(row.periodStart)} – {dateLabel(row.periodEnd)}
                  </div>
                  <div className="text-lg font-semibold">{formatCurrency(row.amount)}</div>
                  <div className="text-xs text-slate-500">
                    {t.tr("Tamamlanan")}: {row.completedEnrollments}, {t.tr("İadeler")}: {row.refundCount}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={row.status} tr={t.tr} />
                  {row.status === 'PENDING' ? (
                    <button className="btn-link" onClick={() => handleMarkPaid(row.id)} disabled={busy}>
                      {t.tr("Ödendi olarak işaretle")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">{t.tr("Kayıt bulunamadı.")}</p>
          )}
        </div>
      </section>
    </main>
  );
}

const METRIC_VARIANTS = [
  { bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200', val: 'text-emerald-700', icon: '💰' },
  { bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200', val: 'text-blue-700', icon: '📊' },
  { bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200', val: 'text-violet-700', icon: '✅' },
];

function MetricCard({ label, value, idx = 0 }: { label: string; value: string; idx?: number }) {
  const v = METRIC_VARIANTS[idx % METRIC_VARIANTS.length];
  return (
    <div className={`rounded-2xl border ${v.bg} p-4 shadow-sm`}>
      <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
        <span>{v.icon}</span>
        <span>{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${v.val}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status, tr }: { status: string; tr?: (s: string) => string }) {
  const translate = tr ?? ((s: string) => s);
  const config: Record<string, { label: string; tone: string }> = {
    PENDING: { label: translate('Bekliyor'), tone: 'bg-yellow-100 text-yellow-700' },
    PAID: { label: translate('Ödendi'), tone: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: translate('İptal'), tone: 'bg-rose-100 text-rose-700' },
    APPROVED: { label: translate('Onaylandı'), tone: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: translate('Reddedildi'), tone: 'bg-rose-100 text-rose-700' },
  };
  const badge = config[status] ?? { label: status, tone: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>{badge.label}</span>;
}
