'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

/**
 * Giriş yapmış ama e-postasını doğrulamamış kullanıcılara gösterilen banner.
 * - accessToken yoksa render etmez.
 * - /auth/me'den emailVerified kontrol eder.
 * - Kullanıcı kapatabilir (session storage'a kaydedilir, sayfa yenilemede tekrar gösterir).
 */
export function EmailVerifyBanner() {
  const [show, setShow] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Daha önce bu oturumda kapatıldıysa gösterme
    if (sessionStorage.getItem('ev-banner-dismissed') === '1') return;

    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.emailVerified === false) setShow(true);
      })
      .catch(() => null);
  }, []);

  async function resend() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setResendState('sending');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setResendState(res.ok ? 'sent' : 'error');
    } catch {
      setResendState('error');
    }
  }

  function dismiss() {
    sessionStorage.setItem('ev-banner-dismissed', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 text-sm">
      <span className="text-lg">📬</span>
      <div className="flex-1 text-amber-800">
        <strong>E-posta adresinizi doğrulayın.</strong>{' '}
        {resendState === 'sent' ? (
          <span style={{ color:"#C8A96A", fontWeight:600 }}>✓ Doğrulama e-postası gönderildi!</span>
        ) : resendState === 'error' ? (
          <span className="text-red-600">Gönderilemedi. </span>
        ) : (
          <>
            Gelen kutunuzu kontrol edin veya{' '}
            <button
              onClick={resend}
              disabled={resendState === 'sending'}
              className="underline hover:no-underline font-medium disabled:opacity-60"
            >
              {resendState === 'sending' ? 'gönderiliyor…' : 'yeniden gönder'}
            </button>
            .{' '}
            <Link href="/verify-email" className="underline hover:no-underline">
              Doğrulama sayfası →
            </Link>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        className="text-amber-500 hover:text-amber-700 text-xl leading-none ml-1"
        aria-label="Kapat"
      >
        ×
      </button>
    </div>
  );
}
