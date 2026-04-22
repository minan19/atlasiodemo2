/**
 * Minimal fetch wrapper for Next.js App Router
 *
 * Features:
 *  - Attaches Authorization + X-Tenant-ID headers automatically
 *  - 401 interceptor: tries to refresh the access token once, retries the
 *    original request, then redirects to /login on second failure
 *  - Concurrent-request safety: while a refresh is in-flight every other
 *    401 waits for the same promise instead of firing its own refresh
 */

const BASE   = process.env.NEXT_PUBLIC_API_BASE  ?? 'http://localhost:4100';
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? 'public';

// ─── token helpers ────────────────────────────────────────────────────────────

function getAccessToken()  { return typeof window !== 'undefined' ? localStorage.getItem('accessToken')  : null; }
function getRefreshToken() { return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null; }

function saveTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken',  access);
  localStorage.setItem('refreshToken', refresh);
}

/**
 * Tüm oturum kalıntılarını temizler (localStorage + middleware cookie'leri).
 * Dikkat: Backend'e logout çağrısı yapmaz — sadece frontend temizliği.
 * Refresh token'ı Redis'ten iptal etmek için `logout()` kullanın.
 */
export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  document.cookie = 'atlasio_auth=; path=/; max-age=0';
  document.cookie = 'atlasio_role=; path=/; max-age=0';
}

/**
 * Tam çıkış akışı: backend'e /auth/logout çağırır (refresh token'ı Redis'te iptal eder),
 * sonra frontend'deki tüm tokenleri siler. `redirect` false değilse /login'e yönlendirir.
 * Backend erişilemese bile frontend temizliği garanti.
 */
export async function logout(options: { redirect?: boolean } = {}): Promise<void> {
  const { redirect = true } = options;
  const refreshToken = getRefreshToken();

  // Backend'de refresh token'ı iptal et (hata olsa bile devam)
  if (refreshToken) {
    try {
      await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Backend erişilemez olsa da devam — en azından frontend state'i temizlenmeli
    }
  }

  clearTokens();
  if (redirect) redirectToLogin();
}

function redirectToLogin() {
  if (typeof window !== 'undefined') window.location.href = '/login';
}

// ─── refresh mutex ────────────────────────────────────────────────────────────
// Ensures only one refresh call is in-flight at a time.

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const { accessToken, refreshToken: newRefresh } = data;
    if (!accessToken) return null;

    saveTokens(accessToken, newRefresh ?? refreshToken);
    return accessToken;
  } catch {
    return null;
  }
}

async function ensureRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ─── build headers ────────────────────────────────────────────────────────────

function buildHeaders(token: string | null, extra?: HeadersInit): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string> ?? {}),
  };
}

// ─── core fetch ───────────────────────────────────────────────────────────────

async function rawFetch(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: buildHeaders(token, init.headers),
  });
}

// ─── public api() wrapper ─────────────────────────────────────────────────────

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();

  let res = await rawFetch(path, init ?? {}, token);

  // ── 401 → attempt token refresh ──────────────────────────────────────────
  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await ensureRefresh();

    if (newToken) {
      // Retry the original request with the fresh token
      res = await rawFetch(path, init ?? {}, newToken);
    }

    // If still 401 after refresh (or refresh failed), boot to login
    if (res.status === 401) {
      clearTokens();
      redirectToLogin();
      return Promise.reject(new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.')) as Promise<T>;
    }
  }

  if (!res.ok) {
    let message = `API ${path} hatası: ${res.status}`;
    try {
      const err = await res.json();
      if (err?.message) message = Array.isArray(err.message) ? err.message.join(', ') : String(err.message);
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}
