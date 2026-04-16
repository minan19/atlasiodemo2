'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

export default function ForgotPasswordPage() {
  const t = useI18n();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || t.common.error);
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-2xl font-semibold">{t.auth.forgotSuccess}</h2>
          <p className="text-slate-600">
            <strong>{email}</strong>
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 text-emerald-600 hover:underline font-medium text-sm"
          >
            ← {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Sol — Hero */}
      <div className="glass p-8 rounded-3xl border border-slate-200 hero">
        <div className="hero-content space-y-4">
          <div className="pill w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t.auth.forgotPill}
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            {t.auth.forgotTitle}
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            {t.auth.forgotDesc}
          </p>
        </div>
      </div>

      {/* Sağ — Form */}
      <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">{t.auth.forgotSub}</h2>
          <p className="text-sm text-slate-600">{t.auth.forgotDesc}</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">{t.login.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPh}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <button
            disabled={loading}
            type="submit"
            className="btn-link justify-center text-sm font-semibold disabled:opacity-60"
            style={{
              background: loading ? 'var(--panel)' : 'linear-gradient(to right, #10b981, #06b6d4)',
              color: loading ? 'var(--ink-2)' : '#fff',
              borderColor: loading ? 'var(--line)' : '#10b981',
              gap: 8,
            }}
          >
            {loading && (
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid var(--line-accent)',
                borderTopColor: 'var(--accent)',
                animation: 'fgSpin 0.7s linear infinite',
                display: 'inline-block', flexShrink: 0,
              }} />
            )}
            {loading ? t.auth.forgotLoading : t.auth.forgotSubmit}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <p className="text-center text-sm text-slate-500">
            {t.auth.rememberPassword}{' '}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              {t.nav.login}
            </Link>
          </p>
        </form>
      </div>

      <style jsx global>{`
        @keyframes fgSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
