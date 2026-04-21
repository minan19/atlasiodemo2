'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

const CARD: React.CSSProperties = {
  background: "var(--card, #fff)",
  borderRadius: 24, padding: 32,
  border: "1px solid var(--line, #e2e8f0)",
  boxShadow: "0 8px 40px rgba(11,31,58,0.08)",
  maxWidth: 440, width: "100%",
};

const INPUT: React.CSSProperties = {
  borderRadius: 10, border: "1.5px solid var(--line, #e2e8f0)",
  padding: "11px 14px", fontSize: 14, color: "var(--ink, #0f172a)",
  background: "var(--surface, #fff)", outline: "none",
  transition: "border-color 0.15s", width: "100%", boxSizing: "border-box",
};

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
      <div style={{ ...CARD, textAlign: "center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
        <div style={{ width:40, height:3, background:"#C8A96A", borderRadius:2, margin:"0 auto 16px" }} />
        <h2 style={{ fontSize:20, fontWeight:700, color:"#ef4444", margin:"0 0 8px" }}>{t.common.error}</h2>
        <p style={{ fontSize:14, color:"var(--ink-2, #64748b)", marginBottom:20 }}>{t.auth.resetSub}</p>
        <Link href="/forgot-password" style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#C8A96A", fontWeight:600, textDecoration:"none", fontSize:14 }}>
          {t.auth.forgotSubmit} →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ ...CARD, textAlign: "center" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <div style={{ width:48, height:4, background:"#C8A96A", borderRadius:2, margin:"0 auto 20px" }} />
        <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:"0 0 8px" }}>{t.auth.resetSuccess}</h2>
        <p style={{ fontSize:14, color:"var(--ink-2, #64748b)", marginBottom:20 }}>{t.auth.backToLogin}</p>
        <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#C8A96A", fontWeight:600, textDecoration:"none", fontSize:14 }}>
          ← {t.auth.backToLogin}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError(t.register.errorWeak); return; }
    if (password !== confirm) { setError(t.register.errorMismatch); return; }
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
    <div style={CARD}>
      {/* Gold accent bar */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:36, background:"#C8A96A", borderRadius:2, flexShrink:0 }} />
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:0 }}>{t.auth.resetTitle}</h2>
          <p style={{ fontSize:13, color:"var(--ink-2, #64748b)", margin:"3px 0 0" }}>{t.register.passwordHint}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display:"grid", gap:16 }}>
        <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
          <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.auth.newPassword}</span>
          <input
            required type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t.auth.newPasswordPh}
            style={INPUT}
            onFocus={e => e.target.style.borderColor="#C8A96A"}
            onBlur={e => e.target.style.borderColor="var(--line, #e2e8f0)"}
          />
        </label>

        <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
          <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.register.confirmPassword}</span>
          <input
            required type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={t.register.confirmPh}
            style={{ ...INPUT, borderColor: confirm && confirm !== password ? "#ef4444" : "var(--line, #e2e8f0)" }}
            onFocus={e => e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "#C8A96A"}
            onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "var(--line, #e2e8f0)"}
          />
          {confirm && confirm !== password && (
            <span style={{ fontSize:12, color:"#ef4444" }}>{t.register.errorMismatch}</span>
          )}
        </label>

        <button
          disabled={loading} type="submit"
          style={{
            borderRadius:10, border:"none", padding:"13px 16px",
            background: loading ? "var(--panel, #f1f5f9)" : "#0B1F3A",
            color: loading ? "var(--ink-2)" : "#FAFAF8",
            fontSize:14, fontWeight:700, cursor: loading ? "not-allowed" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            transition:"all 0.15s", opacity: loading ? 0.7 : 1,
            boxShadow: loading ? "none" : "0 4px 20px rgba(11,31,58,0.3)",
          }}
        >
          {loading && <span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#C8A96A", animation:"rpSpin 0.7s linear infinite", display:"inline-block" }} />}
          {loading ? t.auth.resetLoading : t.auth.resetSubmit}
        </button>

        {error && <div style={{ fontSize:13, color:"#ef4444", padding:"8px 12px", background:"#fef2f2", borderRadius:8, border:"1px solid #fecaca" }}>{error}</div>}

        <p style={{ textAlign:"center", fontSize:13, color:"var(--ink-2, #64748b)", margin:0 }}>
          <Link href="/forgot-password" style={{ color:"#C8A96A", fontWeight:600, textDecoration:"none" }}>
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
    <div style={{ display:"grid", placeItems:"center", minHeight:"60vh", padding:"24px 16px" }}>
      <Suspense fallback={<div style={{ color:"var(--ink-2)" }}>…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
