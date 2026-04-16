'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRole, UserRole } from './role-context';
import { BrandLogo } from './brand-logo';
import { useI18n } from '../_i18n/use-i18n';
import { api } from '../api/client';
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
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div className="brand-title">
            <div className="brand-title-main">ATLASIO</div>
            <div className="brand-title-sub">{t.nav.brandSub}</div>
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
          <select
            aria-label={t.nav.langLabel}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="nav-select"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
            <option value="ar">AR</option>
            <option value="ru">RU</option>
          </select>

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
              {/* User avatar + profile link */}
              <Link
                href="/profile"
                className="nav-user-avatar"
                data-tip={currentUser?.name ?? t.nav.profile}
                aria-label={t.nav.profile}
              >
                {currentUser?.name?.[0]?.toUpperCase() ?? 'U'}
              </Link>
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
