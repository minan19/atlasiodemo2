import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Routes that require authentication ──────────────────────────────────────
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

/**
 * Next.js 16 Proxy — formerly `middleware.ts`.
 * Renamed in Next.js 16 (deprecation of `middleware.ts`) to clarify that this
 * sits at the network boundary. Runs before the cache on matching routes.
 *
 * Migration notes:
 *  - Function renamed `middleware` → `proxy`
 *  - File renamed `middleware.ts` → `proxy.ts`
 *  - Node.js runtime set explicitly (Next 16 proxy runs on full Node.js)
 *  - CVE-2025-29927: `x-middleware-subrequest` header bypass doesn't apply to `proxy.ts`
 *
 * Security:
 *  - Dev bypass is OPT-IN via `NEXT_PUBLIC_SKIP_AUTH=1` (NOT NODE_ENV).
 *    Dev builds deployed to prod with default config stay protected.
 *  - Middleware/proxy is defense-in-depth ONLY — real auth happens at the API
 *    layer (NestJS JWT guards). Do not rely on this cookie check alone.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Opt-in dev bypass — sadece NEXT_PUBLIC_SKIP_AUTH=1 ayarlandığında auth devre dışı.
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === '1') return NextResponse.next();

  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check auth cookie (set on login, cleared on logout) — presence check only
  const authCookie = request.cookies.get('atlasio_auth');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based guard (role written to cookie on login)
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

// Next.js 16 proxy.ts always runs on Node.js runtime — `runtime` field is not
// allowed here; only `matcher` is supported.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|verify-email|api-health).*)',
  ],
};
