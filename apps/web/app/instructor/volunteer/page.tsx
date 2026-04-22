'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN = 'accessToken';

type Course = { id: string; title: string };
type VolunteerContent = {
  id: string;
  title: string;
  description?: string;
  contentType?: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  notes?: string | null;
  course?: Course | null;
};

type ValueScore = {
  summary: {
    approvedCount: number;
    feedbackCount: number;
    averageRating: number;
    score: string;
  };
  record?: {
    score: string;
    computedAt: string;
  } | null;
};

export default function InstructorVolunteerPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [contents, setContents] = useState<VolunteerContent[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<ValueScore | null>(null);
  const [form, setForm] = useState({ title: '', description: '', contentType: '', resourceUrl: '', courseId: '' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(localStorage.getItem(ACCESS_TOKEN) ?? '');
  }, []);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchCourses = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/courses`, { headers });
      if (!res.ok) throw new Error('Kurslar yüklenemedi');
      const data = await res.json();
      setCourses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kurs alınamadı');
    }
  };

  const fetchContents = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [contentsRes, scoreRes] = await Promise.all([
        fetch(`${API_BASE}/volunteer-contents/me`, { headers }),
        fetch(`${API_BASE}/volunteer-contents/me/score`, { headers }),
      ]);
      if (!contentsRes.ok || !scoreRes.ok) throw new Error('Veri yüklenemedi');
      const [contentsData, scoreData] = await Promise.all([contentsRes.json(), scoreRes.json()]);
      setContents(contentsData ?? []);
      setScore(scoreData ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Veri alınamadı');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCourses();
      fetchContents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/volunteer-contents`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Kayıt yapılamadı');
      setStatusMessage('Gönüllü içerik gönderildi, inceleme bekleniyor.');
      setForm({ title: '', description: '', contentType: '', resourceUrl: '', courseId: '' });
      fetchContents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-sm text-slate-600">{t.tr("Eğitmen rolündeki hesabınla giriş yapman gerekiyor.")}</p>;
  }

  const scoreNum = score ? Number(score.summary.score) : 0;
  const scorePercent = Math.min((scoreNum / 10) * 100, 100);

  return (
    <main className="space-y-8">
      {/* Header */}
      <header className="glass rounded-3xl p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="pill bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
                {t.roles.instructor}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t.instructor.volunteer}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-slate-500 leading-relaxed">
              İstediğin zaman ek dersler ve dokümanlar paylaş; platform kaliteni sayısallaştırarak
              eğitmen değer skoruna yansıtır. Her katkı topluluğa değer katar.
            </p>
          </div>
          <Link href="/instructor" className="btn-link shrink-0 text-sm">
            {t.tr("← Panele dön")}
          </Link>
        </div>
      </header>

      {/* Score Card */}
      {score ? (
        <section className="glass rounded-3xl p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full inline-block" style={{ background: "#C8A96A" }} />
              {t.tr("Eğitmen Değer Skoru")}
            </h2>
            {score.record ? (
              <span className="text-xs text-slate-400">
                Son hesaplama:{' '}
                {new Date(score.record.computedAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-8">
            {/* Ring score */}
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="2.4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="2.4"
                  strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <span
                className="text-3xl font-extrabold"
                style={{ background: 'linear-gradient(135deg,#10b981,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {scoreNum.toFixed(1)}
              </span>
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-3">
              <ValueCard label={t.tr("Onaylı Katkı")} value={`${score.summary.approvedCount}`} unit={t.tr("içerik")} color="amber" />
              <ValueCard label="Geri Bildirim" value={`${score.summary.feedbackCount}`} unit="yorum" color="violet" />
              <ValueCard label="Ortalama Puan" value={Number(score.summary.averageRating).toFixed(1)} unit="/ 5" color="amber" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{t.tr("İlerleme")}</span>
              <span>{scoreNum.toFixed(1)} / 10</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${scorePercent}%`,
                  background: 'linear-gradient(90deg,#10b981,#6366f1)',
                }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Contribution Form */}
      <section className="glass rounded-3xl p-6">
        <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400 inline-block" />
          {t.tr("Yeni Katkı Ekle")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            placeholder={t.tr("Başlık *")}
            value={t.tr(form.title)}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            placeholder={t.tr("Açıklama")}
            value={t.tr(form.description)}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              placeholder={t.tr("İçerik türü (örn. Ek video)")}
              className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              value={form.contentType}
              onChange={(e) => setForm((prev) => ({ ...prev, contentType: e.target.value }))}
            />
            <input
              placeholder="URL / kaynak"
              className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              value={form.resourceUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, resourceUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              İlgili kurs (opsiyonel)
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              value={form.courseId}
              onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
            >
              <option value="">{t.tr("Kurs seçme")}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {t.tr(course.title)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
          >
            {busy ? 'Gönderiliyor…' : 'Gönüllü İçerik Ekle'}
          </button>
        </form>

        {statusMessage ? (
          <p className="mt-3 inline-block rounded-full bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
            {statusMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 inline-block rounded-full bg-rose-50 px-4 py-1.5 text-xs font-medium text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      {/* Contributions List */}
      <section className="glass rounded-3xl p-6">
        <h2 className="mb-5 text-lg font-bold text-slate-900 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
          {t.tr("Katkılarım")}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-500">
            {contents.length}
          </span>
        </h2>

        {busy ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : contents.length ? (
          <div className="space-y-3">
            {contents.map((item) => (
              <ContentRow key={item.id} content={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
            <span className="text-4xl">📤</span>
            <p className="text-sm">{t.tr("Henüz gönüllü içerik yok.")}</p>
          </div>
        )}
      </section>
    </main>
  );
}

function ValueCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: 'gold' | 'violet' | 'amber';
}) {
  const styles: Record<string, { bg: string; val: string }> = {
    gold:    { bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', val: 'text-amber-700' },
    violet:  { bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200',   val: 'text-violet-700'  },
    amber:   { bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',       val: 'text-amber-700'   },
  };
  const { bg, val } = styles[color];
  return (
    <div className={`rounded-2xl border px-5 py-4 text-center shadow-sm ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${val}`}>{value}</p>
      <p className="text-xs text-slate-400">{unit}</p>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'İnceleniyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'İptal',
  DRAFT: 'Taslak',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  DRAFT: 'bg-slate-100 text-slate-600',
};

function ContentRow({ content }: { content: VolunteerContent }) {
  return (
    <article className="glass flex gap-4 rounded-2xl border border-slate-100 p-4">
      <div className="pt-0.5 shrink-0">
        <span
          className={`pill inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[content.status] ?? 'bg-slate-100 text-slate-500'}`}
        >
          {STATUS_LABELS[content.status] ?? content.status}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{content.title}</h3>
          <span className="text-xs text-slate-400">
            {new Date(content.submittedAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        {content.course ? (
          <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
            {content.course.title}
          </span>
        ) : null}
        {content.description ? (
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{content.description}</p>
        ) : null}
        {content.notes ? (
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
            Not: {content.notes}
          </p>
        ) : null}
      </div>
    </article>
  );
}
