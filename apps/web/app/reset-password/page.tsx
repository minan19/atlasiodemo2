'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-semibold text-red-600">Geçersiz bağlantı</h2>
        <p className="text-slate-600">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-emerald-600 hover:underline font-medium text-sm"
        >
          Yeni sıfırlama bağlantısı iste
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-semibold">Şifreniz güncellendi!</h2>
        <p className="text-slate-600">Yeni şifrenizle giriş yapabilirsiniz.</p>
        <Link
          href="/login"
          className="inline-block mt-2 text-emerald-600 hover:underline font-medium text-sm"
        >
          Giriş sayfasına git →
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
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
      if (!res.ok) throw new Error(data?.message || 'Şifre sıfırlanamadı.');
      setSuccess(true);
      // 2 saniye sonra login'e yönlendir
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">Yeni şifre belirle</h2>
        <p className="text-sm text-slate-600">En az 8 karakter kullanın.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Yeni Şifre</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Şifre Tekrar</span>
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Şifreyi tekrar girin"
            className={`w-full rounded-xl border px-3 py-3 shadow-sm focus:outline-none bg-white text-slate-900 placeholder:text-slate-400 ${
              confirm && confirm !== password
                ? 'border-red-300 focus:border-red-400'
                : 'border-slate-200 focus:border-emerald-400'
            }`}
          />
          {confirm && confirm !== password && (
            <span className="text-xs text-red-500">Şifreler eşleşmiyor</span>
          )}
        </label>

        <button
          disabled={loading}
          type="submit"
          className="btn-link justify-center text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl disabled:opacity-60"
        >
          {loading ? 'Güncelleniyor…' : 'Şifremi güncelle'}
        </button>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <p className="text-center text-sm text-slate-500">
          <Link href="/forgot-password" className="text-emerald-600 hover:underline font-medium">
            Yeni sıfırlama bağlantısı iste
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="grid place-items-center min-h-[60vh]">
      <Suspense fallback={<div className="text-slate-500">Yükleniyor…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
