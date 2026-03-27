'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageResult = {
  kind: 'page';
  label: string;
  href: string;
};

type CourseResult = {
  kind: 'course';
  id: string;
  title: string;
  thumbnail?: string;
};

type UserResult = {
  kind: 'user';
  id: string;
  name: string;
  email: string;
};

type SearchResult = PageResult | CourseResult | UserResult;

type ApiSearchResponse = {
  courses: { id: string; title: string; thumbnail?: string }[];
  pages:   { label: string; href: string }[];
  users:   { id: string; name: string; email: string }[];
};

// ─── Static fallback pages ────────────────────────────────────────────────────

const STATIC_PAGES: PageResult[] = [
  { kind: 'page', label: 'Dashboard',               href: '/dashboard' },
  { kind: 'page', label: 'Kurslarım',               href: '/my-courses' },
  { kind: 'page', label: 'Sınavlar',                href: '/exams' },
  { kind: 'page', label: 'Liderboard',              href: '/leaderboard' },
  { kind: 'page', label: 'Dil Lab',                 href: '/language-lab' },
  { kind: 'page', label: 'Math Lab',                href: '/math-lab' },
  { kind: 'page', label: 'Ghost Mentor',            href: '/ai' },
  { kind: 'page', label: 'Smart Classroom',         href: '/smart-classroom' },
  { kind: 'page', label: 'Bildirimler',             href: '/notifications' },
  { kind: 'page', label: 'Akran Değerlendirmesi',   href: '/peer-review' },
  { kind: 'page', label: 'Sertifika Yenileme',      href: '/certificate-renewal' },
  { kind: 'page', label: 'AI Ajanlar',              href: '/ai-agents' },
  { kind: 'page', label: 'AI Güvenlik',             href: '/ai-security' },
  { kind: 'page', label: 'Savunma Merkezi',         href: '/defense-center' },
  { kind: 'page', label: 'Öğrenme Planları',        href: '/learning-plans' },
  { kind: 'page', label: 'Rezervasyon',             href: '/booking' },
  { kind: 'page', label: 'SSO',                     href: '/admin/sso' },
  { kind: 'page', label: 'Bölümler',                href: '/admin/departments' },
  { kind: 'page', label: 'Bağlayıcılar',            href: '/admin/connectors' },
  { kind: 'page', label: 'Otomasyon',               href: '/admin/automation' },
  { kind: 'page', label: 'Gözlemlenebilirlik',      href: '/admin/observability' },
];

const MAX_PER_GROUP = 5;
const RECENT_KEY    = 'recentSearches';
const API_BASE      = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const prev = getRecent().filter((q) => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)));
}

/** Bold the first occurrence of `term` inside `text`. Returns JSX fragments. */
function Highlighted({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-bold text-emerald-600 dark:text-emerald-400">
        {text.slice(idx, idx + term.length)}
      </strong>
      {text.slice(idx + term.length)}
    </>
  );
}

function resultLabel(r: SearchResult): string {
  if (r.kind === 'page')   return r.label;
  if (r.kind === 'course') return r.title;
  return r.name;
}

function resultHref(r: SearchResult): string {
  if (r.kind === 'page')   return r.href;
  if (r.kind === 'course') return `/courses/${r.id}`;
  return `/admin/users/${r.id}`;
}

function resultIcon(r: SearchResult): string {
  if (r.kind === 'page')   return '📄';
  if (r.kind === 'course') return '📚';
  return '👤';
}

function resultCategory(r: SearchResult): string {
  if (r.kind === 'page')   return 'Sayfa';
  if (r.kind === 'course') return 'Kurs';
  return 'Kullanıcı';
}

function resultCategoryChipClass(r: SearchResult): string {
  if (r.kind === 'page')   return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  if (r.kind === 'course') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLUListElement>(null);

  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(0);
  const [recent,  setRecent]  = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reset state on open / close ───────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Global Cmd+K / Ctrl+K listener (delegated from top-nav, but guard here too) ─

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) return; // top-nav owns opening; this just prevents double-fire
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ── Debounced search ──────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();

    // Empty query — show nothing (recent searches shown separately)
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const token = getToken();
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(trimmed)}`, {
        headers,
      });

      if (!res.ok) throw new Error('API error');

      const data: ApiSearchResponse = await res.json();

      const merged: SearchResult[] = [
        ...data.pages.slice(0, MAX_PER_GROUP).map<PageResult>((p) => ({
          kind: 'page', label: p.label, href: p.href,
        })),
        ...data.courses.slice(0, MAX_PER_GROUP).map<CourseResult>((c) => ({
          kind: 'course', id: c.id, title: c.title, thumbnail: c.thumbnail,
        })),
        ...data.users.slice(0, MAX_PER_GROUP).map<UserResult>((u) => ({
          kind: 'user', id: u.id, name: u.name, email: u.email,
        })),
      ];

      // Always augment with matching static pages not already returned
      const apiPageHrefs = new Set(data.pages.map((p) => p.href));
      const extraPages = STATIC_PAGES.filter(
        (p) =>
          !apiPageHrefs.has(p.href) &&
          p.label.toLowerCase().includes(trimmed.toLowerCase()),
      ).slice(0, MAX_PER_GROUP);

      setResults([...merged, ...extraPages]);
    } catch {
      // Fallback: local static pages only
      const matched = STATIC_PAGES.filter((p) =>
        p.label.toLowerCase().includes(trimmed.toLowerCase()),
      ).slice(0, MAX_PER_GROUP * 2);
      setResults(matched);
    } finally {
      setLoading(false);
      setActive(0);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // ── Keyboard navigation inside list ──────────────────────────────────────

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) navigate(results[active]);
    }
  }

  // ── Scroll active item into view ──────────────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // ── Navigate to result ────────────────────────────────────────────────────

  function navigate(r: SearchResult) {
    const q = query.trim();
    if (q) saveRecent(q);
    setRecent(getRecent());
    router.push(resultHref(r));
    onClose();
  }

  // ── Group results for rendering ───────────────────────────────────────────

  const groups: { label: string; items: SearchResult[] }[] = [];
  const pages   = results.filter((r) => r.kind === 'page');
  const courses  = results.filter((r) => r.kind === 'course');
  const users    = results.filter((r) => r.kind === 'user');
  if (pages.length)   groups.push({ label: 'Sayfalar',     items: pages });
  if (courses.length) groups.push({ label: 'Kurslar',      items: courses });
  if (users.length)   groups.push({ label: 'Kullanıcılar', items: users });

  // Flat index offset for keyboard navigation across groups
  const flatItems = [...pages, ...courses, ...users];

  // ── Recent query click ────────────────────────────────────────────────────

  function applyRecent(q: string) {
    setQuery(q);
    inputRef.current?.focus();
  }

  // ── Is macOS ──────────────────────────────────────────────────────────────

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  const showEmpty  = !loading && query.trim() && results.length === 0;
  const showGroups = !loading && results.length > 0;
  const showRecent = !query.trim() && recent.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Komut paleti"
      onMouseDown={(e) => {
        // Close when clicking the backdrop itself
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-slide-up"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header / Search input ────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
          {/* Search icon */}
          <svg
            className="w-4 h-4 text-slate-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Ara... kurs, sayfa, kullanıcı"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            aria-label="Ara"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Keyboard shortcut hint */}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 select-none flex-shrink-0">
            {isMac ? '⌘' : 'Ctrl'}K
          </kbd>

          {/* Loading spinner */}
          {loading && (
            <svg
              className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="max-h-[60vh] overflow-y-auto">

          {/* Recent searches — shown when input is empty */}
          {showRecent && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Son Aramalar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((q) => (
                  <button
                    key={q}
                    onClick={() => applyRecent(q)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  >
                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tip when completely empty */}
          {!query.trim() && !showRecent && (
            <div className="py-10 text-center text-sm text-slate-400">
              <div className="text-3xl mb-3">⌨️</div>
              Bir şeyler yazmaya başlayın…
            </div>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="py-10 text-center text-sm text-slate-400">
              <div className="text-3xl mb-3">🔍</div>
              Sonuç bulunamadı
            </div>
          )}

          {/* Grouped results */}
          {showGroups && (
            <ul ref={listRef} role="listbox" aria-label="Arama sonuçları">
              {groups.map((group) => {
                return (
                  <li key={group.label} role="presentation">
                    {/* Group header */}
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {group.label}
                    </p>

                    {/* Items */}
                    <ul role="group" aria-label={group.label}>
                      {group.items.map((r) => {
                        const flatIdx = flatItems.indexOf(r);
                        const isActive = flatIdx === active;
                        const sub = r.kind === 'user' ? (r as UserResult).email : undefined;

                        return (
                          <li
                            key={`${r.kind}-${resultHref(r)}`}
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActive(flatIdx)}
                            onClick={() => navigate(r)}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                              ${isActive
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}
                            `}
                          >
                            {/* Icon */}
                            <span className="text-base flex-shrink-0 w-6 text-center" aria-hidden="true">
                              {resultIcon(r)}
                            </span>

                            {/* Label + sub-label */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-800 dark:text-slate-100 truncate">
                                <Highlighted text={resultLabel(r)} term={query.trim()} />
                              </div>
                              {sub && (
                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                  <Highlighted text={sub} term={query.trim()} />
                                </div>
                              )}
                            </div>

                            {/* Category chip */}
                            <span
                              className={`
                                text-[10px] font-medium px-2 py-0.5 rounded-full border border-transparent flex-shrink-0
                                ${resultCategoryChipClass(r)}
                              `}
                            >
                              {resultCategory(r)}
                            </span>

                            {/* Enter hint on active */}
                            {isActive && (
                              <kbd className="hidden sm:block text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 rounded px-1 py-0.5 border border-slate-200 dark:border-slate-600 flex-shrink-0">
                                ↵
                              </kbd>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 text-[10px] text-slate-400 select-none">
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-700 rounded px-1 border border-slate-200 dark:border-slate-600">↑↓</kbd>
            gezin
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-700 rounded px-1 border border-slate-200 dark:border-slate-600">↵</kbd>
            aç
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-mono bg-slate-100 dark:bg-slate-700 rounded px-1 border border-slate-200 dark:border-slate-600">Esc</kbd>
            kapat
          </span>
        </div>
      </div>
    </div>
  );
}
