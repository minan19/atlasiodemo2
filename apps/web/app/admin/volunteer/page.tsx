'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN = 'accessToken';

type VolunteerContent = {
  id: string;
  title: string;
  instructor: { id: string; name?: string; email: string };
  course?: { title: string } | null;
  status: string;
  notes?: string | null;
  submittedAt: string;
};

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'];

type StatusLabel = Record<string, string>;
const STATUS_LABELS: StatusLabel = {
  PENDING: 'İnceleme',
  APPROVED: 'Onaylı',
  REJECTED: 'Reddedildi',
};

const DEMO_CONTENTS: VolunteerContent[] = [
  {
    id: 'demo-1',
    title: 'React ile Sıfırdan İleri Seviye Eğitim',
    instructor: { id: 'i1', name: 'Ayşe Kaya', email: 'ayse@example.com' },
    course: { title: 'Frontend Geliştirme' },
    status: 'PENDING',
    notes: 'Bazı bölümler yeniden düzenlenmeli.',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Node.js ile REST API Tasarımı',
    instructor: { id: 'i2', name: undefined, email: 'mehmet@example.com' },
    course: { title: 'Backend Temelleri' },
    status: 'PENDING',
    notes: null,
    submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AdminVolunteerPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [contents, setContents] = useState<VolunteerContent[]>([]);
  const [filter, setFilter] = useState<string>('PENDING');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(localStorage.getItem(ACCESS_TOKEN) ?? '');
  }, []);

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

  const load = async () => {
    if (!headers) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`${API_BASE}/volunteer-contents/admin?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(t.tr('Veri yüklenemedi'));
      setContents(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.tr('İşlem başarısız'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, filter]);

  const handleStatusChange = async (id: string, status: string) => {
    if (!headers) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/volunteer-contents/${id}/status`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(t.tr('Durum güncellenemedi'));
      setMessage(t.tr('Durum güncellendi.'));
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.tr('İşlem başarısız'));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-sm text-slate-600">{t.tr("Admin rolündeki hesabınla giriş yapman gerekiyor.")}</p>;
  }

  const isDemo = contents.length === 0 && !busy;
  const displayContents = isDemo ? DEMO_CONTENTS : contents;

  const pendingCount = contents.filter((c) => c.status === 'PENDING').length;
  const approvedCount = contents.filter((c) => c.status === 'APPROVED').length;
  const rejectedCount = contents.filter((c) => c.status === 'REJECTED').length;

  const statusBadgeClass = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'REJECTED') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 hero">
        <div className="hero-content flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">{t.tr("Admin Onay Merkezi")}</div>
            <h1 className="text-2xl font-bold">{t.tr("İçerik")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-blue-500">Denetimi</span></h1>
            <p className="text-sm text-slate-500">
              {t.tr("Eğitmenlerin sunduğu bonus içerikleri onaylayın, reddedin veya incelemeye alın.")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {t.tr(STATUS_LABELS[key] ?? key)}
                </option>
              ))}
            </select>
            <button
              onClick={load}
              className="btn-link rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
            >
              {t.tr("Yenile")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-1">{t.tr("⏳ İnceleme")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
          <p className="text-xs text-slate-500 mt-1">{t.tr("✅ Onaylı")}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 text-center">
          <p className="text-2xl font-bold text-rose-700">{rejectedCount}</p>
          <p className="text-xs text-slate-500 mt-1">❌ {t.tr("Reddedildi")}</p>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.tr(STATUS_LABELS[key] ?? key)}
          </button>
        ))}
      </div>

      {/* Toast Feedback */}
      {message && (
        <div className="pill inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
          <span>✓</span> {message}
        </div>
      )}
      {error && (
        <div className="pill inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700">
          <span>✕</span> {error}
        </div>
      )}

      {/* Demo Banner */}
      {isDemo && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span className="font-bold text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">DEMO</span>
          <span>{t.tr("API'ye bağlanılamadı. Örnek veriler gösteriliyor.")}</span>
        </div>
      )}

      {/* Content Cards */}
      <div className="space-y-3">
        {busy ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass animate-pulse rounded-2xl p-5">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/4 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </>
        ) : displayContents.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-sm text-slate-500 font-medium">{t.tr("Bu filtreyle içerik bulunamadı.")}</p>
          </div>
        ) : (
          displayContents.map((item) => (
            <div key={item.id} className={`glass rounded-2xl p-5 border ${item.status === 'APPROVED' ? 'border-emerald-100' : item.status === 'REJECTED' ? 'border-rose-100' : 'border-amber-100'} hover:shadow-md transition-all`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left: Avatar + Instructor Info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {getInitials(item.instructor.name, item.instructor.email)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.instructor.name ?? item.instructor.email}
                    </p>
                    {item.course?.title && (
                      <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                        {t.tr(item.course.title)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Status Badge */}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}
                >
                  {t.tr(STATUS_LABELS[item.status] ?? item.status)}
                </span>
              </div>

              {/* Body */}
              <div className="mt-3">
                <h2 className="text-base font-bold text-slate-900">{t.tr(item.title)}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t.tr("Gönderildi")}: {new Date(item.submittedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs text-rose-700">{item.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  disabled={busy}
                  onClick={() => handleStatusChange(item.id, 'APPROVED')}
                >
                  ✅ {t.tr("Onayla")}
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                  disabled={busy}
                  onClick={() => handleStatusChange(item.id, 'REJECTED')}
                >
                  ❌ {t.tr("Reddet")}
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 transition-colors"
                  disabled={busy}
                  onClick={() => handleStatusChange(item.id, 'PENDING')}
                >
                  {t.tr("🔄 İncele")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
