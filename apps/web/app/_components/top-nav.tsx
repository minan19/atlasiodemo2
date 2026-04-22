'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRole, UserRole } from './role-context';
import { BrandLogo } from './brand-logo';
import { useI18n } from '../_i18n/use-i18n';
import { api, logout } from '../api/client';
import { useTheme } from './theme-provider';
import { NotificationBell } from './notification-bell';
import { CommandPalette } from './command-palette';

type CurrentUser = {
  role: string;
  name: string | null;
  emailVerified: boolean;
};

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, setRole, language, setLanguage } = useRole();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [alarmCount, setAlarmCount] = useState(0);
  const alarmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // User menu: close on outside click + Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  // Close menu on navigation
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  // Giriş durumu + gerçek kullanıcı bilgisi
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
    if (token) {
      api<CurrentUser>('/auth/me')
        .then(setCurrentUser)
        .catch(() => setCurrentUser(null));
    } else {
      setCurrentUser(null);
    }
  }, [pathname]);

  // Alarm sayacı — sadece ADMIN/TECH, 30s polling
  useEffect(() => {
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECH';

    if (!isAdmin) {
      setAlarmCount(0);
      if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
      return;
    }

    function fetchCount() {
      api<{ count: number }>('/notifications/alarm-count')
        .then((d) => setAlarmCount(d.count))
        .catch(() => {});
    }

    fetchCount();
    alarmTimerRef.current = setInterval(fetchCount, 30_000);
    return () => {
      if (alarmTimerRef.current) clearInterval(alarmTimerRef.current);
    };
  }, [currentUser?.role]);

  const breadcrumbs = useMemo(() => {
    const chunks = pathname.split('/').filter(Boolean);
    const acc: { href: string; label: string }[] = [{ href: '/', label: 'Anasayfa' }];
    let cursor = '';
    for (const part of chunks) {
      cursor += `/${part}`;
      acc.push({ href: cursor, label: part.replace(/-/g, ' ') });
    }
    return acc;
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCanGoBack(window.history.length > 1);
    }
  }, [pathname]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleForward = () => {
    router.forward();
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECH';

  return (
    <header className="shell-header">
      <div className="brand-row">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <div className="brand-wordmark">
            Atlas<em>io</em>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            aria-label={t.nav.roleLabel}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="nav-select"
          >
            <option value="admin">{t.roles.admin}</option>
            <option value="head-instructor">{t.roles.headInstructor}</option>
            <option value="instructor">{t.roles.instructor}</option>
            <option value="student">{t.roles.student}</option>
            <option value="guardian">{t.roles.guardian}</option>
          </select>

          {/* ── Language switcher with flags ── */}
          {/* Lang switcher — aktif dilin bayrağı gösterilir, pasifler sadece kod */}
          <div className="lang-switcher" role="navigation" aria-label={t.nav.langLabel}>
            {([
              { code: 'tr', flag: '🇹🇷', label: 'TR' },
              { code: 'en', flag: '🇬🇧', label: 'EN' },
              { code: 'de', flag: '🇩🇪', label: 'DE' },
              { code: 'ar', flag: '🇸🇦', label: 'AR' },
              { code: 'ru', flag: '🇷🇺', label: 'RU' },
              { code: 'kk', flag: '🇰🇿', label: 'KK' },
            ] as const).map((l, i) => {
              const isActive = language === l.code;
              return (
                <span key={l.code} className="lang-item">
                  {i > 0 && <span className="lang-sep">|</span>}
                  <button
                    className={`lang-btn${isActive ? ' lang-btn--active' : ''}`}
                    onClick={() => setLanguage(l.code)}
                    title={l.label}
                  >
                    {/* Sadece aktif dilin bayrağı görünür */}
                    {isActive && <span className="lang-flag">{l.flag}</span>}
                    <span className="lang-code">{l.label}</span>
                  </button>
                </span>
              );
            })}
          </div>

          {/* Search / Command palette trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="theme-toggle"
            aria-label={t.nav.search}
            data-tip={t.nav.search}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
            data-tip={theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* AI Mentor quick link */}
          <Link
            href="/ai"
            className="theme-toggle"
            aria-label={t.nav.aiMentor}
            data-tip={t.nav.aiMentor}
          >
            🤖
          </Link>

          {isLoggedIn ? (
            <>
              {/* Evrensel bildirim zili — tüm giriş yapanlar */}
              <NotificationBell />

              {/* Admin güvenlik alarmları — sadece admin/tech */}
              {isAdmin && (
                <Link
                  href="/admin/alarms"
                  aria-label={t.nav.security}
                  className="relative theme-toggle"
                  data-tip={t.nav.security}
                >
                  <span aria-hidden="true">🛡️</span>
                  {alarmCount > 0 && (
                    <span className="notif-badge bg-rose-500">
                      {alarmCount > 99 ? '99+' : alarmCount}
                    </span>
                  )}
                </Link>
              )}
              {/* Admin paneli linki */}
              {isAdmin && (
                <Link href="/admin" className="nav-admin-btn">
                  Admin
                </Link>
              )}
              <Link href="/my-courses" className="btn-link text-xs hidden sm:inline-flex">{t.nav.myCourses}</Link>
              {/* User avatar dropdown: Profile + My Courses + Logout */}
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="nav-user-avatar"
                  data-tip={currentUser?.name ?? t.nav.profile}
                  aria-label={currentUser?.name ?? t.nav.profile}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  {currentUser?.name?.[0]?.toUpperCase() ?? 'U'}
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: 220,
                      background: 'var(--surface, #fff)',
                      border: '1px solid var(--border, rgba(0,0,0,0.08))',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                      padding: 6,
                      zIndex: 1000,
                    }}
                  >
                    {/* Current user info */}
                    <div
                      style={{
                        padding: '8px 12px 10px',
                        borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #0b1020)' }}>
                        {currentUser?.name ?? t.nav.profile}
                      </div>
                      {currentUser?.role && (
                        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                          {currentUser.role}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text, #0b1020)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t.nav.profile}
                    </Link>
                    <Link
                      href="/my-courses"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text, #0b1020)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--hover, rgba(0,0,0,0.04))'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {t.nav.myCourses}
                    </Link>
                    <div style={{ height: 1, background: 'var(--border, rgba(0,0,0,0.08))', margin: '4px 8px' }} />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#b42318',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(180,35,24,0.08)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t.tr("Çıkış yap")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login" className="nav-login-btn">{t.nav.login}</Link>
          )}
        </div>
      </div>

      <div className="breadcrumb-row">
        <button
          type="button"
          onClick={handleBack}
          disabled={!canGoBack && pathname === '/'}
          className="back-btn"
          aria-label={t.nav.back}
        >
          <span aria-hidden="true">←</span>
          <span>{t.nav.back}</span>
        </button>
        <button
          type="button"
          onClick={handleForward}
          className="back-btn"
          aria-label={t.nav.forward}
        >
          <span>{t.nav.forward}</span>
          <span aria-hidden="true">→</span>
        </button>
        {breadcrumbs.map((item, idx) => (
          <span key={item.href}>
            {idx > 0 ? <span className="sep">/</span> : null}
            <Link href={item.href}>{idx === 0 ? t.nav.home : item.label}</Link>
          </span>
        ))}
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </header>
  );
}
