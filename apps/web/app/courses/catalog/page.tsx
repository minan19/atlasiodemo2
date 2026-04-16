'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useI18n } from '../../_i18n/use-i18n';

/* ─────────────────────────────────────────────────────────────
   Config
───────────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const PAGE_SIZE = 12;

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type SortKey = 'popular' | 'newest' | 'top-rated' | 'lowest-price' | 'free-first';
type PriceFilter = 'all' | 'free' | 'paid';
type RatingFilter = 'all' | '4.0' | '4.5';
type DurationFilter = 'all' | '0-5' | '5-20' | '20+';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: Level;
  price: number;
  rating: number;
  enrollmentCount: number;
  duration: number; // hours
  thumbnail?: string;
  tags: string[];
  isFree: boolean;
  createdAt?: string;
}

interface Filters {
  categories: string[];
  levels: Level[];
  price: PriceFilter;
  rating: RatingFilter;
  duration: DurationFilter;
}

/* ─────────────────────────────────────────────────────────────
   Auth helper
───────────────────────────────────────────────────────────── */

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */

const ALL_CATEGORIES = [
  { key: 'Yazılım',   icon: '💻' },
  { key: 'Tasarım',  icon: '🎨' },
  { key: 'İş',       icon: '💼' },
  { key: 'Dil',      icon: '🗣️' },
  { key: 'Matematik',icon: '📐' },
  { key: 'Bilim',    icon: '🔬' },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  Yazılım:   'from-blue-500 to-cyan-500',
  Tasarım:   'from-purple-500 to-pink-500',
  İş:        'from-amber-500 to-orange-500',
  Dil:       'from-emerald-500 to-teal-500',
  Matematik: 'from-indigo-500 to-blue-500',
  Bilim:     'from-rose-500 to-red-500',
};

const CATEGORY_EMOJI: Record<string, string> = {
  Yazılım: '💻', Tasarım: '🎨', İş: '💼',
  Dil: '🗣️', Matematik: '📐', Bilim: '🔬',
};

const LEVEL_LABELS: Record<Level, string> = {
  BEGINNER:     'Başlangıç',
  INTERMEDIATE: 'Orta',
  ADVANCED:     'İleri',
};

const LEVEL_COLORS: Record<Level, string> = {
  BEGINNER:     'bg-emerald-100 text-emerald-700',
  INTERMEDIATE: 'bg-amber-100 text-amber-700',
  ADVANCED:     'bg-rose-100 text-rose-700',
};

const SORT_KEYS: SortKey[] = ['popular', 'newest', 'top-rated', 'lowest-price', 'free-first'];

/* ─────────────────────────────────────────────────────────────
   Demo data
───────────────────────────────────────────────────────────── */

const DEMO_COURSES: Course[] = [
  {
    id: 'd1',
    title: 'Modern React & Next.js ile Tam Yığın Geliştirme',
    description: 'React 18, Next.js 14, TypeScript ve Tailwind CSS ile profesyonel web uygulamaları geliştirin.',
    instructor: 'Ahmet Yılmaz',
    category: 'Yazılım',
    level: 'INTERMEDIATE',
    price: 199,
    rating: 4.9,
    enrollmentCount: 8420,
    duration: 42,
    tags: ['React', 'Next.js', 'TypeScript'],
    isFree: false,
    createdAt: '2026-01-15',
  },
  {
    id: 'd2',
    title: 'Python ile Veri Bilimi ve Makine Öğrenmesi',
    description: 'Pandas, NumPy, Scikit-learn ve TensorFlow ile veri analizi ve ML modelleri oluşturun.',
    instructor: 'Zeynep Kaya',
    category: 'Yazılım',
    level: 'BEGINNER',
    price: 0,
    rating: 4.8,
    enrollmentCount: 15300,
    duration: 38,
    tags: ['Python', 'ML', 'Pandas'],
    isFree: true,
    createdAt: '2026-02-01',
  },
  {
    id: 'd3',
    title: 'UI/UX Tasarım: Figma ile Profesyonel Arayüz',
    description: 'Figma\'da wireframe, prototip ve tasarım sistemleri oluşturarak kullanıcı deneyimini mükemmelleştirin.',
    instructor: 'Selin Demir',
    category: 'Tasarım',
    level: 'BEGINNER',
    price: 149,
    rating: 4.7,
    enrollmentCount: 5670,
    duration: 24,
    tags: ['Figma', 'UX', 'Prototip'],
    isFree: false,
    createdAt: '2026-01-20',
  },
  {
    id: 'd4',
    title: 'İş Analitiği ve Strateji: Veri Odaklı Kararlar',
    description: 'Excel, Power BI ve stratejik analiz araçlarıyla iş kararlarınızı veriye dayandırın.',
    instructor: 'Murat Öztürk',
    category: 'İş',
    level: 'INTERMEDIATE',
    price: 249,
    rating: 4.6,
    enrollmentCount: 3210,
    duration: 18,
    tags: ['Analitik', 'Power BI', 'Strateji'],
    isFree: false,
    createdAt: '2025-12-10',
  },
  {
    id: 'd5',
    title: 'İngilizce: B1\'den C1\'e Hızlı Yükseliş',
    description: 'Konuşma, yazma ve dinleme becerilerinizi pekiştirin. Gerçek hayat senaryolarıyla pratik yapın.',
    instructor: 'Elif Arslan',
    category: 'Dil',
    level: 'INTERMEDIATE',
    price: 0,
    rating: 4.5,
    enrollmentCount: 21000,
    duration: 30,
    tags: ['İngilizce', 'Konuşma', 'Gramer'],
    isFree: true,
    createdAt: '2026-02-14',
  },
  {
    id: 'd6',
    title: 'İleri Kalkülüs ve Diferansiyel Denklemler',
    description: 'Mühendislik ve fizik problemlerini çözmek için kalkülüs ve diferansiyel denklemlerde uzmanlaşın.',
    instructor: 'Hasan Çelik',
    category: 'Matematik',
    level: 'ADVANCED',
    price: 179,
    rating: 4.8,
    enrollmentCount: 2100,
    duration: 55,
    tags: ['Kalkülüs', 'Diferansiyel', 'Mühendislik'],
    isFree: false,
    createdAt: '2025-11-05',
  },
  {
    id: 'd7',
    title: 'Kuantum Fiziği: Temelden İleri Seviyeye',
    description: 'Kuantum mekaniği prensipleri, dalga fonksiyonları ve modern fizik uygulamalarını keşfedin.',
    instructor: 'Dr. Ayşe Şahin',
    category: 'Bilim',
    level: 'ADVANCED',
    price: 299,
    rating: 4.9,
    enrollmentCount: 980,
    duration: 60,
    tags: ['Fizik', 'Kuantum', 'Teori'],
    isFree: false,
    createdAt: '2025-10-20',
  },
  {
    id: 'd8',
    title: 'Node.js & Express ile RESTful API Geliştirme',
    description: 'Backend geliştirme, veritabanı entegrasyonu ve API güvenliğini pratik projelerle öğrenin.',
    instructor: 'Can Yıldız',
    category: 'Yazılım',
    level: 'INTERMEDIATE',
    price: 0,
    rating: 4.7,
    enrollmentCount: 11200,
    duration: 28,
    tags: ['Node.js', 'API', 'Express'],
    isFree: true,
    createdAt: '2026-03-01',
  },
  {
    id: 'd9',
    title: 'Grafik Tasarım: Adobe Suite ile Marka Kimliği',
    description: 'Photoshop, Illustrator ve InDesign kullanarak güçlü marka kimliği ve kurumsal tasarımlar oluşturun.',
    instructor: 'Pınar Doğan',
    category: 'Tasarım',
    level: 'BEGINNER',
    price: 129,
    rating: 4.4,
    enrollmentCount: 4500,
    duration: 22,
    tags: ['Adobe', 'Marka', 'Logo'],
    isFree: false,
    createdAt: '2026-01-08',
  },
  {
    id: 'd10',
    title: 'Girişimcilik ve Startup: Fikrinden Şirkete',
    description: 'Lean startup metodolojisi, MVP geliştirme, yatırımcı sunumu ve büyüme stratejilerini öğrenin.',
    instructor: 'Barış Erdoğan',
    category: 'İş',
    level: 'BEGINNER',
    price: 0,
    rating: 4.6,
    enrollmentCount: 7800,
    duration: 16,
    tags: ['Startup', 'Girişim', 'MVP'],
    isFree: true,
    createdAt: '2026-02-20',
  },
  {
    id: 'd11',
    title: 'Almanca A1-B2: Günlük Hayatta Almanca',
    description: 'Sıfırdan başlayarak B2 seviyesine ulaşın. Sesli alıştırmalar ve kültürel içeriklerle öğrenin.',
    instructor: 'Nur Koç',
    category: 'Dil',
    level: 'BEGINNER',
    price: 199,
    rating: 4.5,
    enrollmentCount: 3400,
    duration: 45,
    tags: ['Almanca', 'A1-B2', 'Konuşma'],
    isFree: false,
    createdAt: '2025-12-28',
  },
  {
    id: 'd12',
    title: 'Biyokimya ve Moleküler Biyoloji Temelleri',
    description: 'Hücre biyolojisi, protein sentezi ve metabolizma yollarını kapsamlı şekilde inceleyin.',
    instructor: 'Prof. Taner Aksoy',
    category: 'Bilim',
    level: 'INTERMEDIATE',
    price: 219,
    rating: 4.7,
    enrollmentCount: 1650,
    duration: 48,
    tags: ['Biyoloji', 'Kimya', 'Hücre'],
    isFree: false,
    createdAt: '2026-01-30',
  },
];

/* ─────────────────────────────────────────────────────────────
   Utility helpers
───────────────────────────────────────────────────────────── */

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} dk`;
  return `${h} saat`;
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

function CourseCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col">
      <div className="h-40 skeleton" />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex gap-2">
          <div className="h-5 w-20 skeleton rounded-full" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
        <div className="h-5 skeleton rounded w-4/5" />
        <div className="h-4 skeleton rounded w-full" />
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/2 mt-auto" />
        <div className="flex gap-2 mt-2">
          <div className="h-6 skeleton rounded-full w-14" />
          <div className="h-6 skeleton rounded-full w-14" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="h-6 skeleton rounded w-16" />
          <div className="h-9 skeleton rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
      ⭐ {(rating ?? 0).toFixed(1)}
      <span className="text-slate-400 font-normal">({formatCount(count ?? 0)})</span>
    </span>
  );
}

function CourseCard({
  course,
  idx,
  enrolled,
  tCourses,
}: {
  course: Course;
  idx: number;
  enrolled: boolean;
  tCourses: { free: string; enrolled: string; continue: string; enroll: string; students: string };
}) {
  const t = useI18n();
  const gradient = CATEGORY_GRADIENTS[course.category] ?? 'from-slate-500 to-slate-700';
  const emoji = CATEGORY_EMOJI[course.category] ?? '📚';
  const stagger = `stagger-${Math.min((idx % 4) + 1, 4)}` as 'stagger-1' | 'stagger-2' | 'stagger-3' | 'stagger-4';
  const tags = course.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const extraTags = tags.length - 3;

  return (
    <div
      className={`glass rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl animate-fade-slide-up ${stagger}`}
    >
      {/* Thumbnail */}
      <div className={`relative h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-5xl opacity-30 select-none">{emoji}</span>
        {enrolled && (
          <span className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-lg">
            ✓
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold bg-black/30 backdrop-blur-sm text-white rounded-full px-2.5 py-1">
            {course.category}
          </span>
          <span className={`text-[10px] font-semibold rounded-full px-2.5 py-1 ${LEVEL_COLORS[course.level]}`}>
            {t.tr(LEVEL_LABELS[course.level])}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3 className="font-bold text-sm leading-snug line-clamp-2 text-slate-800 dark:text-slate-100">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>

        {/* Instructor */}
        <div className="flex items-center gap-2 mt-1">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {(course.instructor ?? '?').charAt(0)}
          </span>
          <span className="text-xs text-slate-500 truncate">{course.instructor}</span>
        </div>

        {/* Rating */}
        <StarRating rating={course.rating} count={course.enrollmentCount} />

        {/* Duration + Enrollment */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pill pill-xs">⏱ {formatDuration(course.duration ?? 0)}</span>
          <span className="pill pill-xs">👥 {formatCount(course.enrollmentCount ?? 0)} {tCourses.students}</span>
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 flex-wrap mt-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600"
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600">
              +{extraTags}
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
          {course.isFree ? (
            <span className="text-sm font-bold text-emerald-600">{tCourses.free.toUpperCase()}</span>
          ) : (
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              ₺{course.price}
            </span>
          )}
          <Link
            href={`/courses/${course.id}`}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md"
          >
            {enrolled ? tCourses.continue : tCourses.enroll}
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset, tCourses, tCommon }: { onReset: () => void; tCourses: { noCoursesFound: string }; tCommon: { reset: string } }) {
  const t = useI18n();
  return (
    <div className="col-span-3 glass rounded-2xl py-20 flex flex-col items-center gap-4 text-center px-8">
      <span className="text-6xl">🔍</span>
      <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">{tCourses.noCoursesFound}</h3>
      <p className="text-sm text-slate-500 max-w-sm">
        {t.tr('Seçtiğiniz filtrelerle eşleşen kurs yok. Filtreleri temizleyerek tüm kurslara göz atın.')}
      </p>
      <button
        onClick={onReset}
        className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md"
      >
        {tCommon.reset}
      </button>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPage,
  prevLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
      >
        ← {prevLabel}
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 py-1.5 text-xs text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
              p === page
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
      >
        {nextLabel} →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */

export default function CourseCatalogPage() {
  const t = useI18n();

  /* ── Sort options (i18n) ── */
  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'popular',      label: t.courses.sortPopular },
    { key: 'newest',       label: t.courses.sortNewest },
    { key: 'top-rated',    label: t.courses.sortRating },
    { key: 'lowest-price', label: t.tr('En Düşük Fiyat') },
    { key: 'free-first',   label: t.courses.filterFree },
  ];

  /* ── State ── */
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [sort, setSort] = useState<SortKey>('popular');
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<Filters>({
    categories: [],
    levels: [],
    price: 'all',
    rating: 'all',
    duration: 'all',
  });

  const [enrolledIds] = useState<Set<string>>(new Set(['d2', 'd5'])); // demo enrolled

  /* ── Fetch ── */
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);

    fetch(`${API_BASE}/courses?${params.toString()}`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
        return data as Course[];
      })
      .then((data) => {
        setCourses(data?.length ? data : DEMO_COURSES);
      })
      .catch(() => {
        setCourses(DEMO_COURSES);
      })
      .finally(() => setLoading(false));
  }, [search, sort]);

  /* ── Filter + sort logic ── */
  const filtered = useMemo(() => {
    let list = [...courses];

    // Search (client-side fallback)
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.instructor.toLowerCase().includes(term) ||
          c.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    // Category
    if (filters.categories.length > 0) {
      list = list.filter((c) => filters.categories.includes(c.category));
    }

    // Level
    if (filters.levels.length > 0) {
      list = list.filter((c) => filters.levels.includes(c.level));
    }

    // Price
    if (filters.price === 'free') list = list.filter((c) => c.isFree);
    if (filters.price === 'paid') list = list.filter((c) => !c.isFree);

    // Rating
    if (filters.rating === '4.5') list = list.filter((c) => c.rating >= 4.5);
    if (filters.rating === '4.0') list = list.filter((c) => c.rating >= 4.0);

    // Duration
    if (filters.duration === '0-5')  list = list.filter((c) => c.duration <= 5);
    if (filters.duration === '5-20') list = list.filter((c) => c.duration > 5 && c.duration <= 20);
    if (filters.duration === '20+')  list = list.filter((c) => c.duration > 20);

    // Sort
    switch (sort) {
      case 'popular':
        list.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
        break;
      case 'newest':
        list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        break;
      case 'top-rated':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest-price':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'free-first':
        list.sort((a, b) => Number(b.isFree) - Number(a.isFree));
        break;
    }

    return list;
  }, [courses, search, filters, sort]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Handlers ── */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(searchInput.trim());
      setPage(1);
    },
    [searchInput]
  );

  const toggleCategory = useCallback((cat: string) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
    setPage(1);
  }, []);

  const toggleLevel = useCallback((lvl: Level) => {
    setFilters((f) => ({
      ...f,
      levels: f.levels.includes(lvl)
        ? f.levels.filter((l) => l !== lvl)
        : [...f.levels, lvl],
    }));
    setPage(1);
  }, []);

  const setPrice = useCallback((p: PriceFilter) => {
    setFilters((f) => ({ ...f, price: p }));
    setPage(1);
  }, []);

  const setRating = useCallback((r: RatingFilter) => {
    setFilters((f) => ({ ...f, rating: r }));
    setPage(1);
  }, []);

  const setDuration = useCallback((d: DurationFilter) => {
    setFilters((f) => ({ ...f, duration: d }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ categories: [], levels: [], price: 'all', rating: 'all', duration: 'all' });
    setSearch('');
    setSearchInput('');
    setSort('popular');
    setPage(1);
  }, []);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.levels.length > 0 ||
    filters.price !== 'all' ||
    filters.rating !== 'all' ||
    filters.duration !== 'all' ||
    search !== '';

  /* ── Metric stats ── */
  const freeCount = courses.filter((c) => c.isFree).length;
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + (c.rating ?? 0), 0) / courses.length).toFixed(1)
    : '0';

  /* ─────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-12">
      {/* ── Hero Banner ── */}
      <div className="hero rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative hero-content px-6 py-10 md:py-14 flex flex-col items-center text-center gap-5">
          <div className="animate-fade-slide-up stagger-1">
            <div className="pill w-fit mx-auto mb-3 bg-white/20 border-white/30 text-white text-xs">
              <span className="status-dot online" />
              {loading ? '…' : `${courses.length} ${t.tr('kurs mevcut')}`}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              🎓 {t.courses.catalogTitle}
            </h1>
            <p className="text-emerald-100 mt-2 text-sm md:text-base max-w-xl mx-auto">
              {t.courses.catalogDesc}
            </p>
          </div>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="w-full max-w-2xl animate-fade-slide-up stagger-2"
          >
            <div className="relative flex gap-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
                🔍
              </span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.courses.searchPh}
                className="flex-1 rounded-2xl border-0 bg-white/95 shadow-lg pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-white text-emerald-700 font-bold text-sm shadow-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
              >
                {t.common.search}
              </button>
            </div>
          </form>

          {/* Quick metric chips */}
          {!loading && (
            <div className="flex flex-wrap gap-3 justify-center animate-fade-slide-up stagger-3">
              {[
                { icon: '📚', value: courses.length, label: t.courses.catalogTitle },
                { icon: '🆓', value: freeCount, label: t.courses.filterFree },
                { icon: '⭐', value: avgRating, label: t.courses.rating },
                { icon: '👥', value: formatCount(courses.reduce((s, c) => s + (c.enrollmentCount ?? 0), 0)), label: t.courses.enrolled },
              ].map((m) => (
                <div
                  key={t.tr(m.label)}
                  className="metric flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-2 text-white"
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="font-bold text-sm">{m.value}</span>
                  <span className="text-emerald-100 text-xs">{t.tr(m.label)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main layout: sidebar + content ── */}
      <div className="flex gap-6 items-start">

        {/* ── Filter Sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-5 w-64 flex-shrink-0 sticky top-6">
          <div className="glass rounded-2xl p-5 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-700 dark:text-slate-200">{t.common.filter}</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  {t.common.reset}
                </button>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.tr('Kategori')}</h3>
              <div className="space-y-1.5">
                {ALL_CATEGORIES.map(({ key, icon }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 cursor-pointer group py-1"
                  >
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(key)}
                      onChange={() => toggleCategory(key)}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-base leading-none">{icon}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">
                      {t.tr(key)}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-400">
                      {courses.filter((c) => c.category === key).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Level */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.courses.level}</h3>
              <div className="flex flex-wrap gap-2">
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as Level[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => toggleLevel(lvl)}
                    className={`pill pill-sm transition-all ${
                      filters.levels.includes(lvl)
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'hover:border-emerald-400'
                    }`}
                  >
                    {t.tr(LEVEL_LABELS[lvl])}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Price */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.tr('Fiyat')}</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all',  label: t.courses.filterAll },
                  { key: 'free', label: t.courses.filterFree },
                  { key: 'paid', label: t.courses.filterPremium },
                ] as { key: PriceFilter; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPrice(key)}
                    className={`pill pill-sm transition-all ${
                      filters.price === key
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'hover:border-emerald-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Rating */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.courses.rating}</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all', label: t.courses.filterAll },
                  { key: '4.5', label: '⭐ 4.5+' },
                  { key: '4.0', label: '⭐ 4.0+' },
                ] as { key: RatingFilter; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setRating(key)}
                    className={`pill pill-sm transition-all ${
                      filters.rating === key
                        ? 'bg-amber-400 border-amber-400 text-white'
                        : 'hover:border-amber-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Duration */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.courses.duration}</h3>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all',  label: t.courses.filterAll },
                  { key: '0-5',  label: t.tr('0-5 saat') },
                  { key: '5-20', label: t.tr('5-20 saat') },
                  { key: '20+',  label: t.tr('20+ saat') },
                ] as { key: DurationFilter; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setDuration(key)}
                    className={`pill pill-sm transition-all ${
                      filters.duration === key
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'hover:border-indigo-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Clear all */}
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {t.common.reset}
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Mobile filter strip */}
          <div className="lg:hidden glass rounded-2xl p-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500 mr-1">{t.common.filter}:</span>
            {ALL_CATEGORIES.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`pill pill-xs transition-all ${
                  filters.categories.includes(key)
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'hover:border-emerald-400'
                }`}
              >
                {icon} {t.tr(key)}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="pill pill-xs text-rose-500 border-rose-300 hover:bg-rose-50 ml-auto"
              >
                ✕ {t.common.reset}
              </button>
            )}
          </div>

          {/* ── Sort bar ── */}
          <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setSort(key); setPage(1); }}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all ${
                    sort === key
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-md'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap ml-auto pl-2 border-l border-slate-200">
              {loading ? (
                <span className="skeleton inline-block w-20 h-4 rounded" />
              ) : (
                <strong>{filtered.length}</strong>
              )}{' '}
              {!loading && t.tr('kurs bulundu')}
            </span>
          </div>

          {/* ── Error banner ── */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              ⚠️ {t.common.error}: {error} — {t.common.demoMode}.
            </div>
          )}

          {/* ── Course grid ── */}
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))
            ) : paginated.length === 0 ? (
              <EmptyState onReset={clearFilters} tCourses={t.courses} tCommon={t.common} />
            ) : (
              paginated.map((course, idx) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  idx={idx}
                  enrolled={enrolledIds.has(course.id)}
                  tCourses={t.courses}
                />
              ))
            )}
          </section>

          {/* ── Pagination ── */}
          {!loading && paginated.length > 0 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPage={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              prevLabel={t.common.previous}
              nextLabel={t.common.next}
            />
          )}

          {/* ── Page info ── */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-slate-400 mt-2">
              {t.tr('Sayfa')} {page} / {totalPages} — {t.tr('Toplam')} {filtered.length} {t.tr('kurs')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
