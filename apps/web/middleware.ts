import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/admin',
  '/instructor',
  '/leaderboard',
  '/courses',
  '/live',
  '/whiteboard',
  '/notifications',
  '/learning-plans',
  '/booking',
  '/language-lab',
  '/math-lab',
  '/peer-review',
  '/certificates',
  '/report-cards',
  '/my-courses',
  '/guardian',
  '/exams',
  '/payments',
  '/profile',
  '/portal',
];

// Routes that only admins/head-instructors can access
const ADMIN_PREFIXES = ['/dashboard', '/admin'];

// Routes that only instructors+ can access
const INSTRUCTOR_PREFIXES = ['/instructor'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev bypass — API sunucusu olmadan tüm sayfalara erişim
  if (process.env.NODE_ENV === 'development') return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check auth cookie (set on login, cleared on logout)
  const authCookie = request.cookies.get('atlasio_auth');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based guard
  const role = request.cookies.get('atlasio_role')?.value ?? 'student';

  const isAdminRoute = ADMIN_PREFIXES.some(p => pathname.startsWith(p));
  if (isAdminRoute && role !== 'admin' && role !== 'head-instructor') {
    return NextResponse.redirect(new URL('/leaderboard', request.url));
  }

  const isInstructorRoute = INSTRUCTOR_PREFIXES.some(p => pathname.startsWith(p));
  if (isInstructorRoute && role !== 'instructor' && role !== 'admin' && role !== 'head-instructor') {
    return NextResponse.redirect(new URL('/leaderboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|verify-email|api-health).*)',
  ],
};
