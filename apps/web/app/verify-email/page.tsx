'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

type State = 'loading' | 'success' | 'error' | 'already';

const CARD: React.CSSProperties = {
  background: "var(--card, #fff)",
  borderRadius: 24, padding: 36,
  border: "1px solid var(--line, #e2e8f0)",
  boxShadow: "0 8px 40px rgba(11,31,58,0.08)",
  maxWidth: 440, width: "100%",
  textAlign: "center",
};

const STATE_CONFIG: Record<State, { icon: string; accent: string; bg: string }> = {
  loading: { icon: "⏳", accent: "#94a3b8", bg: "#f8fafc" },
  success: { icon: "✅", accent: "#C8A96A", bg: "rgba(200,169,106,0.08)" },
  error:   { icon: "❌", accent: "#ef4444", bg: "#fef2f2" },
  already: { icon: "✔️", accent: "#C8A96A", bg: "rgba(200,169,106,0.08)" },
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const t = useI18n();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setMessage(t.auth.verifyDesc); return; }
    fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || t.common.error);
        if (data?.message?.toLowerCase().includes('already') || data?.message?.includes('zaten')) {
          setState('already');
        } else { setState('success'); }
        setMessage(data?.message ?? '');
      })
      .catch((err) => { setState('error'); setMessage(err?.message || t.common.error); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const cfg = STATE_CONFIG[state];
  const titles: Record<State, string> = {
    loading: t.auth.verifyLoading,
    success: t.auth.verifySuccess,
    error:   t.common.error,
    already: t.auth.verifySuccess,
  };

  return (
    <div style={{ display:"grid", placeItems:"center", minHeight:"60vh", padding:"24px 16px" }}>
      <div style={CARD}>
        {/* Gold accent top line */}
        <div style={{ width:60, height:4, background:"#C8A96A", borderRadius:2, margin:"0 auto 24px" }} />

        <div style={{ fontSize:52, marginBottom:16 }}>{cfg.icon}</div>
        <h1 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:"0 0 8px" }}>{titles[state]}</h1>

        {(message || state === 'loading') && (
          <p style={{ fontSize:14, color:"var(--ink-2, #64748b)", marginBottom:16 }}>
            {state === 'loading' ? t.auth.verifyDesc : message}
          </p>
        )}

        {/* Loading spinner */}
        {state === 'loading' && (
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", border:"3px solid rgba(200,169,106,0.2)", borderTopColor:"#C8A96A", animation:"verifySpin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:14, color:"#C8A96A", background:"rgba(200,169,106,0.10)", border:"1px solid rgba(200,169,106,0.25)", borderRadius:10, padding:"10px 20px" }}>
              {t.auth.verifySuccess}
            </div>
            <Link href="/courses" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#0B1F3A", color:"#FAFAF8", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:700, textDecoration:"none", boxShadow:"0 4px 16px rgba(11,31,58,0.25)" }}>
              {t.courses.catalogTitle} →
            </Link>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
            <div style={{ fontSize:14, color:"#ef4444", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"10px 20px" }}>
              {message || t.common.error}
            </div>
            <ResendButton />
          </div>
        )}

        {/* Already verified */}
        {state === 'already' && (
          <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#C8A96A", fontWeight:600, textDecoration:"none", fontSize:14 }}>
            {t.nav.login} →
          </Link>
        )}
      </div>

      <style jsx global>{`
        @keyframes verifySpin { to { transform: rotate(360deg); } }
      `}</style>
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
    } catch { setStatus('error'); }
  }

  if (status === 'sent') {
    return <p style={{ fontSize:14, color:"#C8A96A", fontWeight:600 }}>✓ {t.auth.verifySuccess}</p>;
  }
  if (status === 'error') {
    return (
      <p style={{ fontSize:13, color:"var(--ink-2, #64748b)" }}>
        {t.common.retry}{' '}
        <Link href="/login" style={{ color:"#C8A96A", fontWeight:600, textDecoration:"none" }}>{t.nav.login}</Link>
      </p>
    );
  }
  return (
    <button
      onClick={resend}
      disabled={status === 'sending'}
      style={{ borderRadius:10, border:"1px solid var(--line, #e2e8f0)", padding:"10px 24px", background:"var(--surface, #fff)", color:"var(--ink, #0f172a)", fontSize:13, fontWeight:600, cursor: status==="sending" ? "not-allowed" : "pointer", opacity: status==="sending" ? 0.6 : 1 }}
    >
      {status === 'sending' ? t.common.loading : t.common.retry}
    </button>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ display:"grid", placeItems:"center", minHeight:"60vh" }}>
        <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(200,169,106,0.2)", borderTopColor:"#C8A96A", animation:"verifySpin 0.8s linear infinite" }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
