'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

type State = 'loading' | 'success' | 'error' | 'already';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const t = useI18n();

  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage(t.auth.verifyDesc);
      return;
    }

    fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || t.common.error);
        if (data?.message?.toLowerCase().includes('already') || data?.message?.includes('zaten')) {
          setState('already');
        } else {
          setState('success');
        }
        setMessage(data?.message ?? '');
      })
      .catch((err) => {
        setState('error');
        setMessage(err?.message || t.common.error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const icons: Record<State, string> = {
    loading: '⏳',
    success: '✅',
    error: '❌',
    already: '✔️',
  };

  const titles: Record<State, string> = {
    loading: t.auth.verifyLoading,
    success: t.auth.verifySuccess,
    error: t.common.error,
    already: t.auth.verifySuccess,
  };

  return (
    <div className="grid place-items-center min-h-[60vh] px-4">
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-5">
        <div className="text-6xl">{icons[state]}</div>

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{titles[state]}</h1>
          {message && (
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          )}
          {state === 'loading' && (
            <p className="text-sm text-slate-500 mt-1">{t.auth.verifyDesc}</p>
          )}
        </div>

        {state === 'success' && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2">
              {t.auth.verifySuccess}
            </p>
            <Link
              href="/courses"
              className="btn-link inline-flex justify-center text-sm font-semibold px-5 py-2"
              style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', borderColor: '#10b981' }}
            >
              {t.courses.catalogTitle} →
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
              {message || t.common.error}
            </p>
            <ResendButton />
          </div>
        )}

        {state === 'already' && (
          <Link
            href="/login"
            className="inline-block text-emerald-600 hover:underline font-medium text-sm"
          >
            {t.nav.login} →
          </Link>
        )}
      </div>
    </div>
  );
}

function ResendButton() {
  const t = useI18n();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function resend() {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!accessToken) { setStatus('error'); return; }
    setStatus('sending');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <p className="text-sm text-emerald-700">✓ {t.auth.verifySuccess}</p>;
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-slate-500">
        {t.common.retry}{' '}
        <Link href="/login" className="text-emerald-600 hover:underline">
          {t.nav.login}
        </Link>
      </p>
    );
  }

  return (
    <button
      onClick={resend}
      disabled={status === 'sending'}
      className="btn-link text-sm font-medium border-slate-200 bg-white text-slate-700 shadow-sm px-5 py-2 disabled:opacity-60"
    >
      {status === 'sending' ? t.common.loading : t.common.retry}
    </button>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="grid place-items-center min-h-[60vh]">
        <div className="text-slate-500 text-lg">⏳</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
