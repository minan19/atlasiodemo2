'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../api/client';

type Course = {
  id: string;
  title: string;
  description?: string | null;
};

type Enrollment = {
  id: string;
  courseId: string;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
  Course: Course;
};

type ProgressItem = {
  courseId: string;
  total: number;
  done: number;
  percentage: number;
};

function StatusBadge({ enrollment }: { enrollment: Enrollment }) {
  if (enrollment.refundedAt)
    return <span className="pill pill-xs bg-rose-50 border-rose-200 text-rose-700">İade</span>;
  if (enrollment.completedAt)
    return <span className="pill pill-xs bg-emerald-50 border-emerald-200 text-emerald-700">✓ Tamamlandı</span>;
  return <span className="pill pill-xs bg-blue-50 border-blue-200 text-blue-700">Devam ediyor</span>;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>İlerleme</span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');

  const loadProgress = useCallback(async (courseIds: string[]) => {
    if (courseIds.length === 0) return;
    try {
      const result = await api<ProgressItem[]>('/me/progress/bulk', {
        method: 'POST',
        body: JSON.stringify({ courseIds }),
      });
      setProgressMap(new Map(result.map((p) => [p.courseId, p])));
    } catch {
      // ilerleme yüklenemezse devam et
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    api<Enrollment[]>('/me/enrollments')
      .then((data) => {
        setEnrollments(data);
        loadProgress(data.map((e) => e.courseId));
      })
      .catch((e) => {
        if (e?.message?.includes('401')) router.push('/login');
        else setError(e?.message ?? 'Kayıtlar yüklenemedi');
      })
      .finally(() => setLoading(false));
  }, [router, loadProgress]);

  const filtered = enrollments.filter((e) => {
    if (tab === 'active') return !e.completedAt && !e.refundedAt;
    if (tab === 'completed') return !!e.completedAt;
    return true;
  });

  const activeCount    = enrollments.filter((e) => !e.completedAt && !e.refundedAt).length;
  const completedCount = enrollments.filter((e) => !!e.completedAt).length;

  // Ortalama ilerleme (aktif kurslar)
  const avgProgress = (() => {
    const active = enrollments.filter((e) => !e.completedAt && !e.refundedAt);
    if (active.length === 0) return 0;
    const total = active.reduce((sum, e) => sum + (progressMap.get(e.courseId)?.percentage ?? 0), 0);
    return Math.round(total / active.length);
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass p-6 rounded-2xl hero">
        <div className="hero-content space-y-1">
          <div className="pill w-fit">Öğrenci Paneli</div>
          <h1 className="text-2xl font-bold">Kayıtlarım</h1>
          <p className="text-sm text-slate-500">Aktif, tamamlanan ve tüm kurslarınız</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Kayıt',  value: enrollments.length,  color: 'text-slate-700',   bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200' },
            { label: 'Devam Eden',    value: activeCount,          color: 'text-blue-700',    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200' },
            { label: 'Tamamlanan',    value: completedCount,       color: 'text-emerald-700', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200' },
            { label: 'Ort. İlerleme', value: `${avgProgress}%`,   color: 'text-violet-700',  bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200' },
          ].map((s, i) => (
            <div key={s.label} className={`rounded-xl border p-4 text-center shadow-sm animate-fade-slide-up stagger-${i + 1} ${s.bg}`}>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          <Link href="/my-courses/skill-profile"
            className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-all">
            📊 Beceri Profilim
          </Link>
          <Link href="/exams/adaptive"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all">
            🎯 Adaptif Sınav
          </Link>
        </div>
      )}

      {/* Tab filter */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'active',    label: `Devam Eden (${activeCount})`    },
            { key: 'completed', label: `Tamamlanan (${completedCount})` },
            { key: 'all',       label: `Tümü (${enrollments.length})`   },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                tab === t.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl skeleton" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center space-y-3">
          <div className="text-4xl">📚</div>
          <p className="text-slate-500 text-sm">
            {tab === 'active' ? 'Devam eden kayıt yok.' : tab === 'completed' ? 'Henüz tamamlanan kurs yok.' : 'Hiç kayıt bulunamadı.'}
          </p>
          {tab !== 'completed' && (
            <Link href="/courses" className="btn-link text-sm inline-flex">
              Kurslara göz at
            </Link>
          )}
        </div>
      )}

      {/* Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((enrollment, idx) => {
            const progress = progressMap.get(enrollment.courseId);
            return (
              <article
                key={enrollment.id}
                className={`course-card animate-fade-slide-up stagger-${Math.min(idx + 1, 5)}`}
              >
                {/* Banner with gradient */}
                <div className="course-card-banner">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl opacity-20 select-none">📖</span>
                  </div>
                  {/* Status top-right */}
                  <div className="absolute top-3 right-3">
                    <StatusBadge enrollment={enrollment} />
                  </div>
                </div>

                <div className="course-card-body">
                  <h2 className="course-card-title">{enrollment.Course.title}</h2>

                  {enrollment.Course.description && (
                    <p className="course-card-desc line-clamp-2">
                      {enrollment.Course.description}
                    </p>
                  )}

                  {/* Progress bar — active courses only */}
                  {!enrollment.completedAt && !enrollment.refundedAt && progress !== undefined && (
                    <ProgressBar pct={progress.percentage} />
                  )}

                  {progress && (
                    <p className="text-xs text-slate-500">
                      {progress.done} / {progress.total} ders tamamlandı
                    </p>
                  )}
                </div>

                <div className="course-card-footer">
                  <span className="text-xs text-slate-400">
                    {new Date(enrollment.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <Link
                    href={`/courses/${enrollment.courseId}`}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    Kursa git →
                  </Link>
                </div>

                {enrollment.completedAt && (
                  <div className="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-t border-emerald-100">
                    🎓 Tamamlandı: {new Date(enrollment.completedAt).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
