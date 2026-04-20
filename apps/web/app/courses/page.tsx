'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

// ─── Types ────────────────────────────────────────────────────────────────────
type Level = 'Başlangıç' | 'Orta' | 'İleri';
type Course = {
  id: string; title: string; description?: string | null;
  lessons?: { id: string }[];
  summaryVideoUrl?: string | null; audioUrl?: string | null;
  ebookUrl?: string | null; htmlUrl?: string | null;
  // enriched fields (demo only)
  instructor?: string; instructorAvatar?: string;
  rating?: number; ratingCount?: number;
  students?: number; price?: number; level?: Level;
  category?: string; duration?: string; isBestseller?: boolean; isNew?: boolean;
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_COURSES: Course[] = [
  { id: 'd1', title: 'React & Next.js 14 Masterclass', description: 'Sıfırdan ileri seviyeye React ekosistemi. Hooks, Server Components, App Router ve daha fazlası.', instructor: 'Ahmet Yılmaz', instructorAvatar: 'AY', rating: 4.9, ratingCount: 1240, students: 8420, price: 299, level: 'Orta', category: 'programlama', duration: '32 saat', isBestseller: true, isNew: false, lessons: Array(48).fill({id:''}), summaryVideoUrl: '#', audioUrl: null, ebookUrl: '#', htmlUrl: '#' },
  { id: 'd2', title: 'Python ile Veri Bilimi', description: 'Pandas, NumPy, Matplotlib ve Scikit-learn ile gerçek veri analizi projeleri.', instructor: 'Zeynep Kaya', instructorAvatar: 'ZK', rating: 4.8, ratingCount: 980, students: 6150, price: 349, level: 'Orta', category: 'programlama', duration: '28 saat', isBestseller: true, isNew: false, lessons: Array(42).fill({id:''}), summaryVideoUrl: '#', audioUrl: '#', ebookUrl: '#', htmlUrl: null },
  { id: 'd3', title: 'İngilizce — B2 Düzeyi', description: 'Business İngilizce, akademik yazım ve konuşma pratiği. Sertifikalı program.', instructor: 'Sarah Johnson', instructorAvatar: 'SJ', rating: 4.7, ratingCount: 650, students: 4200, price: 199, level: 'Orta', category: 'dil', duration: '20 saat', isBestseller: false, isNew: false, lessons: Array(30).fill({id:''}), summaryVideoUrl: '#', audioUrl: '#', ebookUrl: null, htmlUrl: null },
  { id: 'd4', title: 'Matematik — Diferansiyel Hesap', description: 'Limit, türev ve integral kavramları. Üniversite giriş sınavlarına hazırlık.', instructor: 'Prof. Mehmet Demir', instructorAvatar: 'MD', rating: 4.9, ratingCount: 2100, students: 12300, price: 249, level: 'İleri', category: 'matematik', duration: '40 saat', isBestseller: true, isNew: false, lessons: Array(60).fill({id:''}), summaryVideoUrl: '#', audioUrl: '#', ebookUrl: '#', htmlUrl: '#' },
  { id: 'd5', title: 'Docker & Kubernetes Temelleri', description: 'Konteyner dünyasına giriş. Docker Compose, Kubernetes cluster yönetimi.', instructor: 'Can Arslan', instructorAvatar: 'CA', rating: 4.6, ratingCount: 420, students: 2800, price: 399, level: 'İleri', category: 'programlama', duration: '22 saat', isBestseller: false, isNew: true, lessons: Array(35).fill({id:''}), summaryVideoUrl: '#', audioUrl: null, ebookUrl: null, htmlUrl: '#' },
  { id: 'd6', title: 'Organik Kimya Temelleri', description: 'Fonksiyonel gruplar, reaksiyon mekanizmaları ve laboratuvar teknikleri.', instructor: 'Dr. Fatma Şahin', instructorAvatar: 'FŞ', rating: 4.8, ratingCount: 780, students: 5100, price: 229, level: 'Başlangıç', category: 'fen', duration: '25 saat', isBestseller: false, isNew: false, lessons: Array(38).fill({id:''}), summaryVideoUrl: '#', audioUrl: '#', ebookUrl: '#', htmlUrl: null },
  { id: 'd7', title: 'JavaScript — Sıfırdan ES2024', description: 'Modern JavaScript, async/await, Fetch API, DOM manipülasyonu. Hiç bilmeyenden başlar.', instructor: 'Ahmet Yılmaz', instructorAvatar: 'AY', rating: 4.7, ratingCount: 1560, students: 9800, price: 0, level: 'Başlangıç', category: 'programlama', duration: '18 saat', isBestseller: false, isNew: false, lessons: Array(28).fill({id:''}), summaryVideoUrl: '#', audioUrl: null, ebookUrl: '#', htmlUrl: '#' },
  { id: 'd8', title: 'Osmanlı Tarihi — 1299–1923', description: 'İmparatorluğun kuruluşundan çöküşüne kapsamlı tarih anlatısı.', instructor: 'Prof. Ali Vural', instructorAvatar: 'AV', rating: 4.5, ratingCount: 310, students: 1900, price: 179, level: 'Başlangıç', category: 'tarih', duration: '16 saat', isBestseller: false, isNew: true, lessons: Array(24).fill({id:''}), summaryVideoUrl: '#', audioUrl: '#', ebookUrl: '#', htmlUrl: null },
  { id: 'd9', title: 'AWS Solutions Architect', description: 'EC2, S3, RDS, Lambda ve CloudFormation ile bulut altyapısı tasarımı. SAA-C03 sınavına hazırlık.', instructor: 'Burak Yıldız', instructorAvatar: 'BY', rating: 4.9, ratingCount: 890, students: 5600, price: 499, level: 'İleri', category: 'programlama', duration: '45 saat', isBestseller: true, isNew: false, lessons: Array(68).fill({id:''}), summaryVideoUrl: '#', audioUrl: null, ebookUrl: '#', htmlUrl: '#' },
];


const LEVEL_COLORS: Record<Level, { bg: string; color: string }> = {
  'Başlangıç': { bg: 'rgba(34,197,94,0.1)',  color: '#22c55e' },
  'Orta':      { bg: 'rgba(91,110,255,0.1)', color: 'var(--accent)' },
  'İleri':     { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
};

const BANNER_GRADIENTS = [
  ['#5b6eff', '#00b4d8'], ['#06d6a0', '#0ea5e9'],
  ['#9b59ff', '#5b6eff'], ['#f59e0b', '#f87171'],
  ['#00b4d8', '#06d6a0'], ['#f472b6', '#9b59ff'],
];

function stars(r: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < Math.round(r) ? '#f59e0b' : 'var(--line)', fontSize: 11 }}>★</span>
  ));
}

// ─── Welcome banner ───────────────────────────────────────────────────────────
function WelcomeBanner() {
  const t = useI18n();
  const params = useSearchParams();
  const [visible, setVisible] = useState(params.get('welcome') === '1');
  if (!visible) return null;
  return (
    <div style={{ borderRadius: 'var(--r-xl)', background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.25)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 24 }}>🎉</span>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: 14, color: '#22c55e' }}>{t.tr("Hoş geldiniz!")}</strong>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>{t.tr("Hesabınız oluşturuldu. Lütfen e-postanızdaki doğrulama linkine tıklayın.")}</p>
      </div>
      <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20 }}>×</button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const t = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [sort, setSort] = useState('popular');
  const [onlyFree, setOnlyFree] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { key: 'all',          label: t.courses.filterAll,    icon: '📋' },
    { key: 'programlama',  label: 'Programlama',          icon: '💻' },
    { key: 'matematik',    label: 'Matematik',            icon: '📐' },
    { key: 'fen',          label: 'Fen Bilimleri',        icon: '🔬' },
    { key: 'dil',          label: 'Dil',                  icon: '🗣️' },
    { key: 'tarih',        label: 'Tarih',                icon: '🏛️' },
  ];

  const sortOptions = [
    { key: 'popular',  label: t.courses.sortPopular  },
    { key: 'rating',   label: t.courses.sortRating   },
    { key: 'newest',   label: t.courses.sortNewest   },
    { key: 'price-lo', label: '₺ ↑' },
    { key: 'price-hi', label: '₺ ↓' },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/courses/published`, { cache: 'no-store' })
      .then(async (res) => { const d = await res.json().catch(() => null); if (!res.ok) throw new Error(); return d as Course[]; })
      .then((d) => setCourses(d?.length ? d : DEMO_COURSES))
      .catch(() => setCourses(DEMO_COURSES))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = courses.filter((c) => {
      const matchSearch = !term || c.title.toLowerCase().includes(term) || (c.description ?? '').toLowerCase().includes(term) || (c.instructor ?? '').toLowerCase().includes(term);
      const matchCat   = category === 'all' || c.category === category;
      const matchLevel = level === 'all' || c.level === level;
      const matchFree  = !onlyFree || (c.price ?? 1) === 0;
      return matchSearch && matchCat && matchLevel && matchFree;
    });
    switch (sort) {
      case 'rating':   list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
      case 'newest':   list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'price-lo': list = [...list].sort((a, b) => (a.price ?? 999) - (b.price ?? 999)); break;
      case 'price-hi': list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      default:         list = [...list].sort((a, b) => (b.students ?? 0) - (a.students ?? 0));
    }
    return list;
  }, [courses, search, category, level, sort, onlyFree]);

  const totalStudents = courses.reduce((s, c) => s + (c.students ?? 0), 0);
  const freeCount = courses.filter((c) => (c.price ?? 1) === 0).length;

  return (
    <>
      <style>{`
        .cat-btn { transition: all 0.12s; }
        .cat-btn:hover { border-color: var(--accent); color: var(--accent); }
        .cc { border-radius: var(--r-xl); background: var(--panel); border: 1.5px solid var(--line); overflow: hidden; transition: box-shadow 0.18s, transform 0.18s; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; }
        .cc:hover { box-shadow: var(--shadow-md); transform: translateY(-3px); }
        .cc-list { flex-direction: row !important; border-radius: var(--r-xl); }
        .cc-list .cc-banner { width: 140px; height: 100% !important; flex-shrink: 0; border-radius: 0; }
        .cc-list .cc-body { flex: 1; }
        .course-search { border-radius: var(--r-lg); border: 1.5px solid var(--line); background: var(--bg); padding: 10px 14px 10px 38px; font-size: 14px; color: var(--ink); outline: none; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box; }
        .course-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .course-search::placeholder { color: var(--muted); }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Welcome */}
        <Suspense fallback={null}><WelcomeBanner /></Suspense>

        {/* ── Header ── */}
        <header style={{
          borderRadius: 'var(--r-xl)', border: '1.5px solid var(--line)', padding: '22px 28px', boxShadow: 'var(--shadow-sm)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--panel)), color-mix(in srgb, var(--accent-2) 4%, var(--panel)))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, border: '1.5px solid color-mix(in srgb, var(--accent) 25%, var(--line))', borderRadius: 99, padding: '2px 10px', background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', display: 'inline-block' }} />
                Canlı · {loading ? '…' : courses.length} kurs
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{t.courses.catalogTitle}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 10px' }}>{t.courses.catalogDesc}</p>
              {!loading && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { icon: '📚', val: courses.length, lbl: 'Kurs' },
                    { icon: '👥', val: `${(totalStudents / 1000).toFixed(0)}K+`, lbl: 'Öğrenci' },
                    { icon: '🎁', val: freeCount, lbl: 'Ücretsiz' },
                    { icon: '🏅', val: '✓', lbl: 'Sertifika' },
                  ].map((s) => (
                    <div key={s.lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', background: 'color-mix(in srgb, var(--bg) 60%, var(--panel))', borderRadius: 99, padding: '4px 10px', border: '1px solid var(--line)' }}>
                      <span>{s.icon}</span><strong style={{ color: 'var(--accent)' }}>{s.val}</strong><span style={{ color: 'var(--muted)' }}>{s.lbl}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/my-courses" style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>📚 {t.nav.myCourses}</Link>
              <Link href="/dashboard" style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t.nav.dashboard}</Link>
            </div>
          </div>
        </header>

        {/* ── Search + controls ── */}
        <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--muted)' }}>🔍</span>
              <input className="course-search" placeholder={t.courses.searchPh} value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}>×</button>}
            </div>
            {/* Level */}
            <select value={level} onChange={(e) => setLevel(e.target.value as Level | 'all')} style={{ padding: '9px 12px', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
              <option value="all">{t.tr("Tüm Seviyeler")}</option>
              <option value={t.tr("Başlangıç")}>{t.tr("Başlangıç")}</option>
              <option value={t.tr("Orta")}>{t.tr("Orta")}</option>
              <option value={t.tr("İleri")}>{t.tr("İleri")}</option>
            </select>
            {/* Sort */}
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '9px 12px', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
              {sortOptions.map((o) => <option key={o.key} value={o.key}>{t.tr(o.label)}</option>)}
            </select>
            {/* Free toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
              {t.courses.filterFree}
            </label>
            {/* View mode */}
            <div style={{ display: 'flex', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--line)' }}>
              {(['grid', 'list'] as const).map((m) => (
                <button key={m} onClick={() => setViewMode(m)} style={{ padding: '6px 10px', border: 'none', background: viewMode === m ? 'var(--accent)' : 'var(--bg)', color: viewMode === m ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>
                  {m === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button key={cat.key} onClick={() => setCategory(cat.key)} className="cat-btn" style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: category === cat.key ? 700 : 500,
              background: category === cat.key ? 'var(--ink)' : 'var(--panel)', color: category === cat.key ? 'var(--bg)' : 'var(--muted)',
              boxShadow: category === cat.key ? 'var(--shadow-sm)' : 'inset 0 0 0 1.5px var(--line)', transition: 'all 0.12s',
            }}>
              <span>{cat.icon}</span>{t.tr(cat.label)}
              {category === cat.key && <span style={{ fontSize: 10, opacity: 0.75 }}>({filtered.length})</span>}
            </button>
          ))}
        </div>

        {/* ── Results count ── */}
        {!loading && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 2px' }}>
            {search ? `"${search}" için ` : ''}<strong style={{ color: 'var(--ink-2)' }}>{filtered.length}</strong> kurs {search ? 'bulundu' : 'mevcut'}
          </p>
        )}

        {/* ── Grid / List ── */}
        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(3, 1fr)' : '1fr', gap: 16 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 280, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', opacity: 0.5 }} />
              ))
            : filtered.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <p style={{ fontSize: 14, color: 'var(--muted)' }}>{search ? `"${search}" — ${t.courses.noCoursesFound}` : t.courses.noCoursesFound}</p>
              </div>
            )
            : filtered.map((course, idx) => {
              const [c1, c2] = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];
              const lv = course.level;
              const lvStyle = lv ? LEVEL_COLORS[lv] : null;
              const isFree = (course.price ?? 1) === 0;
              return (
                <div key={course.id} className={`cc${viewMode === 'list' ? ' cc-list' : ''}`}>
                  {/* Banner */}
                  <div className="cc-banner" style={{ height: viewMode === 'grid' ? 120 : '100%', background: `linear-gradient(135deg, ${c1}, ${c2})`, position: 'relative', flexShrink: 0, minHeight: viewMode === 'list' ? 120 : undefined }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.15, userSelect: 'none' }}>🎓</div>
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5 }}>
                      {course.isBestseller && <span style={{ fontSize: 9, fontWeight: 800, background: '#f59e0b', color: '#fff', borderRadius: 99, padding: '2px 7px', letterSpacing: '0.04em' }}>BESTSELLER</span>}
                      {course.isNew && <span style={{ fontSize: 9, fontWeight: 800, background: '#22c55e', color: '#fff', borderRadius: 99, padding: '2px 7px' }}>{t.tr("YENİ")}</span>}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.35)', color: '#fff', borderRadius: 99, padding: '2px 8px', backdropFilter: 'blur(4px)' }}>{(course.lessons?.length ?? 0)} ders</span>
                      {course.duration && <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.35)', color: '#fff', borderRadius: 99, padding: '2px 8px', backdropFilter: 'blur(4px)' }}>⏱ {course.duration}</span>}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="cc-body" style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Level + category */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {lvStyle && lv && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: lvStyle.bg, color: lvStyle.color, border: `1px solid ${lvStyle.color}30` }}>{lv}</span>
                      )}
                      {isFree && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>{t.tr("Ücretsiz")}</span>}
                    </div>

                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35, margin: 0 }}>{t.tr(course.title)}</h2>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description || 'Bu kurs için açıklama eklenmemiş.'}
                    </p>

                    {/* Instructor */}
                    {course.instructor && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg, ${c1}, ${c2})`, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{course.instructorAvatar}</div>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{course.instructor}</span>
                      </div>
                    )}

                    {/* Rating */}
                    {course.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ display: 'flex' }}>{stars(course.rating)}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{course.rating.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>({course.ratingCount?.toLocaleString('tr-TR')})</span>
                        {course.students && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>· {course.students.toLocaleString('tr-TR')} öğrenci</span>}
                      </div>
                    )}

                    {/* Price + CTA */}
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--line)' }}>
                      <div>
                        {isFree
                          ? <span style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{t.tr("Ücretsiz")}</span>
                          : <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>₺{course.price?.toLocaleString('tr-TR')}</span>
                        }
                      </div>
                      <Link href={`/courses/${course.id}`} style={{ padding: '7px 16px', borderRadius: 'var(--r-lg)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--glow-blue)', whiteSpace: 'nowrap' }}>
                        {t.courses.enroll} →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
