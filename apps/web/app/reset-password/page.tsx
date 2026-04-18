'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const t = useI18n();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-semibold text-red-600">{t.common.error}</h2>
        <p className="text-slate-600">{t.auth.resetSub}</p>
        <Link href="/forgot-password" className="inline-block text-emerald-600 hover:underline font-medium text-sm">
          {t.auth.forgotSubmit}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-semibold">{t.auth.resetSuccess}</h2>
        <p className="text-slate-600">{t.auth.backToLogin}</p>
        <Link href="/login" className="inline-block mt-2 text-emerald-600 hover:underline font-medium text-sm">
          {t.auth.backToLogin} →
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.register.errorWeak);
      return;
    }
    if (password !== confirm) {
      setError(t.register.errorMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || t.common.error);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">{t.auth.resetTitle}</h2>
        <p className="text-sm text-slate-600">{t.register.passwordHint}</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">{t.auth.newPassword}</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.newPasswordPh}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">{t.register.confirmPassword}</span>
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t.register.confirmPh}
            className={`w-full rounded-xl border px-3 py-3 shadow-sm focus:outline-none bg-white text-slate-900 placeholder:text-slate-400 ${
              confirm && confirm !== password
                ? 'border-red-300 focus:border-red-400'
                : 'border-slate-200 focus:border-emerald-400'
            }`}
          />
          {confirm && confirm !== password && (
            <span className="text-xs text-red-500">{t.register.errorMismatch}</span>
          )}
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
              animation: 'rpSpin 0.7s linear infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
          )}
          {loading ? t.auth.resetLoading : t.auth.resetSubmit}
        </button>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <p className="text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="text-emerald-600 hover:underline font-medium">
            {t.auth.forgotSubmit}
          </Link>
        </p>
      </form>

      <style jsx global>{`
        @keyframes rpSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="grid place-items-center min-h-[60vh]">
      <Suspense fallback={<div className="text-slate-500">…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
