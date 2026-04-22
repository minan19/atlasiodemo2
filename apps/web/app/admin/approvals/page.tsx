'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN = 'accessToken';

type ContentItem = {
  id: string;
  title: string;
  contentType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  notes?: string | null;
  suggestedAmount?: string | null;
  User?: { id: string; name?: string | null; email: string } | null;
  Course?: { title: string } | null;
};

const DEMO_ITEMS: ContentItem[] = [
  {
    id: 'demo-1',
    title: 'React ile Sıfırdan İleri Seviye',
    contentType: 'VOLUNTEER_EXTRA',
    status: 'PENDING',
    submittedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    suggestedAmount: '450 ₺',
    User: { id: 'u1', name: 'Ayşe Kaya', email: 'ayse@example.com' },
    Course: { title: 'Frontend Geliştirme' },
  },
  {
    id: 'demo-2',
    title: 'Node.js ile REST API Tasarımı',
    contentType: 'BONUS',
    status: 'PENDING',
    submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    suggestedAmount: '300 ₺',
    User: { id: 'u2', name: undefined, email: 'mehmet@example.com' },
    Course: { title: 'Backend Temelleri' },
  },
  {
    id: 'demo-3',
    title: 'Python Veri Bilimi Ek Modülü',
    contentType: 'VOLUNTEER_EXTRA',
    status: 'APPROVED',
    submittedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    suggestedAmount: '600 ₺',
    User: { id: 'u3', name: 'Zeynep Arslan', email: 'zeynep@example.com' },
    Course: { title: 'Veri Bilimi Temelleri' },
  },
];

type FilterStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function typeBadge(type: string, tr: (s: string) => string) {
  if (type === 'VOLUNTEER_EXTRA') {
    return (
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
        {tr('Gönüllü Ek Süre')}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      {tr('Bonus / Hediye')}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useI18n();
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:  { label: 'Bekliyor',    cls: 'bg-amber-100 text-amber-700' },
    APPROVED: { label: 'Onaylandı',   cls: 'bg-amber-100 text-amber-700' },
    REJECTED: { label: 'Reddedildi',  cls: 'bg-rose-100 text-rose-700' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${cls}`}>{t.tr(label)}</span>;
}

export default function AdminApprovalsPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('PENDING');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem(ACCESS_TOKEN) ?? '');
  }, []);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  const load = async () => {
    if (!headers) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('status', filter);
      const res = await fetch(`${API_BASE}/volunteer-contents/admin?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(t.tr('Veriler yüklenemedi'));
      const data = (await res.json()) as ContentItem[];
      if (data.length === 0 && filter === 'PENDING') {
        setIsDemo(true);
        setItems(DEMO_ITEMS.filter((d) => d.status === 'PENDING'));
      } else {
        setIsDemo(false);
        setItems(data);
      }
    } catch {
      setIsDemo(true);
      setItems(
        filter === 'ALL'
          ? DEMO_ITEMS
          : DEMO_ITEMS.filter((d) => d.status === filter)
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [headers, filter]);

  const handleAction = async (id: string, next: 'APPROVED' | 'REJECTED') => {
    if (!headers) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/volunteer-contents/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(t.tr('Durum güncellenemedi'));
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: next } : item)));
      setMessage(next === 'APPROVED' ? t.tr('✓ İçerik onaylandı ve mahsuplaşmaya alındı.') : t.tr('✗ İçerik reddedildi.'));
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t.tr('İşlem başarısız'));
    } finally {
      setBusy(false);
    }
  };

  // Stats
  const pendingCount  = items.filter((i) => i.status === 'PENDING').length;
  const approvedCount = items.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;

  const STATS = [
    { label: 'Bekliyor',   value: pendingCount,  bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',     val: 'text-amber-700',   icon: '⏳' },
    { label: 'Onaylanan',  value: approvedCount, bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', val: 'text-amber-700', icon: '✓' },
    { label: 'Reddedilen', value: rejectedCount, bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200',         val: 'text-rose-700',    icon: '✗' },
  ];

  const FILTER_TABS: { label: string; value: FilterStatus }[] = [
    { label: 'Bekliyor', value: 'PENDING' },
    { label: 'Onaylananlar', value: 'APPROVED' },
    { label: 'Reddedilenler', value: 'REJECTED' },
    { label: 'Tümü', value: 'ALL' },
  ];

  return (
    <main className="space-y-6">
      {/* Hero */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">{t.tr("İçerik Onay Merkezi")}</div>
          <h1 className="text-3xl font-semibold">{t.tr("Onay Kuyruğu")}</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {t.tr("Eğitmenlerden gelen gönüllü ek süre ve bonus içerik taleplerini inceleyin, onaylayın veya reddedin.")}
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        {STATS.map((s, i) => (
          <div key={i} className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${i + 1} ${s.bg}`}>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span className="font-semibold">{s.icon}</span>
              <span>{t.tr(s.label)}</span>
            </div>
            <p className={`text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Filter Tabs + Refresh */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? 'text-white shadow-sm bg-[#0B1F3A]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.tr(tab.label)}
              </button>
            ))}
          </div>
          <button className="btn-link text-sm" onClick={load} disabled={busy}>
            {busy ? t.tr('Yükleniyor…') : t.tr('Yenile')}
          </button>
        </div>

        {message && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{message}</p>}
        {error   && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
        {isDemo  && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {t.tr("⚠ Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.")}
          </div>
        )}
      </section>

      {/* List */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
          {t.tr("İçerik Talepleri")}
          <span className="pill pill-sm">{items.length}</span>
        </h2>

        {busy && !items.length ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse rounded-2xl border border-slate-100 p-4 flex justify-between items-center gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-40 bg-slate-200 rounded" />
                  <div className="h-4 w-56 bg-slate-100 rounded" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
                <div className="h-8 w-24 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {typeBadge(item.contentType, t.tr)}
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="font-semibold text-slate-800 leading-snug">{t.tr(item.title)}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>👤 {item.User?.name ?? item.User?.email ?? '—'}</span>
                    {item.Course && <span>📚 {t.tr(item.Course.title)}</span>}
                    <span>📅 {fmtDate(item.submittedAt)}</span>
                    {item.suggestedAmount && (
                      <span className="font-semibold text-amber-700">💰 {item.suggestedAmount}</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-slate-400 italic">{t.tr("Not")}: {item.notes}</p>
                  )}
                </div>

                {item.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(item.id, 'APPROVED')}
                      disabled={busy}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-60"
                    >
                      {t.tr("Onayla")}
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'REJECTED')}
                      disabled={busy}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60"
                    >
                      {t.tr("Reddet")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="font-semibold text-slate-700">{t.tr("Bekleyen talep yok")}</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === 'PENDING'
                ? t.tr('Tüm içerik talepleri işlendi.')
                : t.tr('Bu filtre için kayıt bulunamadı.')}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
