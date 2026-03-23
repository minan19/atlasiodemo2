'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

export default function ForgotPasswordPage() {
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
      // Güvenlik gereği her durumda başarı göster (email enumeration önlemi)
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-2xl font-semibold">E-posta gönderildi!</h2>
          <p className="text-slate-600">
            <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
            Gelen kutunuzu (ve spam klasörünüzü) kontrol edin.
          </p>
          <p className="text-sm text-slate-500">Bağlantı <strong>1 saat</strong> geçerlidir.</p>
          <Link
            href="/login"
            className="inline-block mt-2 text-emerald-600 hover:underline font-medium text-sm"
          >
            ← Giriş sayfasına dön
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
            Şifrenizi sıfırlayın
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Şifrenizi mi
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              unuttunuz?
            </span>
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
            Birkaç dakika içinde yeniden erişim sağlayabilirsiniz.
          </p>
        </div>
      </div>

      {/* Sağ — Form */}
      <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">Şifre sıfırla</h2>
          <p className="text-sm text-slate-600">Kayıtlı e-posta adresinizi girin.</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">E-posta</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <button
            disabled={loading}
            type="submit"
            className="btn-link justify-center text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl disabled:opacity-60"
          >
            {loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <p className="text-center text-sm text-slate-500">
            Şifrenizi hatırladınız mı?{' '}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              Giriş yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
