'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';
const SAVED_VIEW_KEY = 'atlasio.saved_course_view';

type Course = {
  id: string;
  title: string;
  description?: string | null;
  lessons?: { id: string }[];
  summaryVideoUrl?: string | null;
  audioUrl?: string | null;
  ebookUrl?: string | null;
  htmlUrl?: string | null;
};

// Pastel banner colours cycle
const BANNER_GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-violet-500 to-purple-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
];

const CATEGORIES = [
  { key: 'all', label: 'Tümü', icon: '📋' },
  { key: 'matematik', label: 'Matematik', icon: '📐' },
  { key: 'fen', label: 'Fen', icon: '🔬' },
  { key: 'dil', label: 'Dil', icon: '🗣️' },
  { key: 'tarih', label: 'Tarih', icon: '🏛️' },
  { key: 'programlama', label: 'Programlama', icon: '💻' },
];

function CourseCardSkeleton() {
  return (
    <div className="course-card">
      <div className="course-card-banner skeleton opacity-60" />
      <div className="course-card-body gap-3">
        <div className="h-5 skeleton w-3/4 rounded" />
        <div className="h-4 skeleton w-full rounded" />
        <div className="h-4 skeleton w-2/3 rounded" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-8 skeleton rounded-lg" />)}
        </div>
      </div>
      <div className="course-card-footer">
        <div className="h-8 skeleton flex-1 rounded-lg" />
      </div>
    </div>
  );
}

function WelcomeBanner() {
  const params = useSearchParams();
  const isWelcome = params.get('welcome') === '1';
  const [visible, setVisible] = useState(isWelcome);
  if (!visible) return null;
  return (
    <div className="glass rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 flex items-start gap-3 text-sm animate-slide-down">
      <span className="text-2xl">🎉</span>
      <div className="flex-1">
        <strong className="text-emerald-800 text-base">Hoş geldiniz!</strong>
        <p className="text-emerald-700 mt-0.5 text-sm">
          Hesabınız oluşturuldu. Lütfen e-postanızdaki doğrulama linkine tıklayın.
        </p>
      </div>
      <button onClick={() => setVisible(false)} className="text-emerald-500 hover:text-emerald-700 text-xl leading-none mt-0.5">×</button>
    </div>
  );
}

function MediaPill({ href, label, icon }: { href?: string | null; label: string; icon: string }) {
  const available = Boolean(href);
  return (
    <a
      href={href ?? undefined}
      target={href ? '_blank' : undefined}
      rel="noreferrer"
      aria-disabled={!available}
      className={`rounded-lg border px-2 py-2 flex items-center gap-1.5 text-xs font-medium transition-all ${
        available
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm cursor-pointer'
          : 'border-slate-200 text-slate-400 cursor-default'
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span className="line-clamp-1">{label}</span>
    </a>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_VIEW_KEY) ?? '';
    setSearch(saved);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/courses/published`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        return data as Course[];
      })
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchSearch = !term || c.title.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term);
      const matchCat = activeCategory === 'all' || c.title.toLowerCase().includes(activeCategory) || (c.description ?? '').toLowerCase().includes(activeCategory);
      return matchSearch && matchCat;
    });
  }, [courses, search, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>

      {/* Hero header */}
      <div className="glass p-6 rounded-2xl hero">
        <div className="hero-content flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">
              <span className="status-dot online" />
              Canlı · {courses.length} kurs
            </div>
            <h1 className="text-3xl font-bold">
              Kurs <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Kataloğu</span>
            </h1>
            <p className="text-sm text-slate-500">Çoklu format · Canlı & kayıtlı · Sertifika</p>
            {!loading && courses.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1">
                {[
                  { label: 'Toplam Kurs', value: courses.length, icon: '📚' },
                  { label: 'Çoklu Format', value: courses.filter(c => c.summaryVideoUrl || c.audioUrl || c.ebookUrl).length, icon: '🎞️' },
                  { label: 'Canlı Ders', value: '🔴 Aktif', icon: '📡' },
                  { label: 'Sertifika', value: '✓ Her Kurs', icon: '🏅' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium">
                    <span>{stat.icon}</span>
                    <span className="font-bold">{stat.value}</span>
                    <span className="text-slate-500 dark:text-slate-400">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/my-courses" className="btn-link text-sm">📚 Kayıtlarım</Link>
            <Link href="/dashboard" className="btn-link text-sm">Panel</Link>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="glass p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kurs ara…"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2.5 text-sm bg-white focus:border-emerald-400 focus:outline-none transition-colors"
            />
          </div>
          <button
            className="btn-link text-sm"
            onClick={() => localStorage.setItem(SAVED_VIEW_KEY, search)}
            type="button"
            title="Bu arama filtresi kaydedilsin"
          >
            💾 Kaydet
          </button>
          {search && (
            <button
              className="btn-link text-sm text-slate-500"
              onClick={() => { localStorage.removeItem(SAVED_VIEW_KEY); setSearch(''); }}
              type="button"
            >
              ✕ Sıfırla
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <span className="pill pill-sm">Çoklu format</span>
            <span className="pill pill-sm">AI önerileri</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === cat.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {activeCategory === cat.key && courses.length > 0 && (
                <span className="ml-0.5 bg-white/20 text-white rounded-full px-1.5 text-[10px]">{filtered.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ⚠️ Kurslar yüklenemedi: {error}
        </div>
      )}

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-slate-500 px-1">
          {search ? `"${search}" için ` : ''}<strong>{filtered.length}</strong> kurs {search ? 'bulundu' : 'mevcut'}
        </p>
      )}

      {/* Course grid */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)
          : filtered.length === 0 && !error
          ? (
            <div className="col-span-3 glass rounded-2xl py-16 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-500 text-sm">
                {search ? `"${search}" için kurs bulunamadı.` : 'Henüz yayınlanmış kurs yok.'}
              </p>
            </div>
          )
          : filtered.map((course, idx) => {
            const gradient = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];
            const lessonCount = course.lessons?.length ?? 0;
            const hasMedia = course.summaryVideoUrl || course.audioUrl || course.ebookUrl || course.htmlUrl;
            return (
              <div
                key={course.id}
                className={`course-card stagger-${Math.min((idx % 5) + 1, 5)}`}
                style={{ animationDelay: `${(idx % 6) * 60}ms` }}
              >
                {/* Gradient banner */}
                <div className={`course-card-banner bg-gradient-to-br ${gradient}`}>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none">
                    <span className="text-6xl">🎓</span>
                  </div>
                  <div className="absolute bottom-3 left-4 flex gap-2">
                    <span className="pill pill-xs bg-white/20 border-white/30 text-white backdrop-blur-sm">
                      {lessonCount} ders
                    </span>
                    {hasMedia && (
                      <span className="pill pill-xs bg-white/20 border-white/30 text-white backdrop-blur-sm">
                        Çoklu format
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="course-card-body">
                  <h2 className="course-card-title">{course.title}</h2>
                  <p className="course-card-desc">
                    {course.description || 'Bu kurs için açıklama eklenmemiş.'}
                  </p>

                  {/* Media pills */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <MediaPill href={course.summaryVideoUrl} label="Video" icon="🎞️" />
                    <MediaPill href={course.audioUrl}        label="Ses"   icon="🎧" />
                    <MediaPill href={course.ebookUrl}        label="e-Kitap" icon="📕" />
                    <MediaPill href={course.htmlUrl}         label="İnteraktif" icon="🧭" />
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="pill pill-xs">🔴 Canlı</span>
                    <span className="pill pill-xs">📹 Kayıtlı</span>
                    <span className="pill pill-xs">🏅 Sertifika</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="course-card-footer">
                  <button
                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    onClick={() => localStorage.setItem(SAVED_VIEW_KEY, course.title)}
                    title="Bu kursu arama filtresine kaydet"
                  >
                    💾 Kaydet
                  </button>
                  <Link
                    href={`/courses/${course.id}`}
                    className="btn-link text-sm px-5 py-2"
                  >
                    Kursu Aç →
                  </Link>
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}
