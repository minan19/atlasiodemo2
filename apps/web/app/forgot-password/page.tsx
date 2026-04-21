'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../_i18n/use-i18n';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

const INPUT_STYLE: React.CSSProperties = {
  borderRadius: 10, border: "1.5px solid var(--line, #e2e8f0)",
  padding: "11px 14px", fontSize: 14, color: "var(--ink, #0f172a)",
  background: "var(--surface, #fff)", outline: "none", transition: "border-color 0.15s",
  width: "100%", boxSizing: "border-box",
};

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
      <div style={{ display:"grid", placeItems:"center", minHeight:"60vh" }}>
        <div style={{ background:"var(--card, #fff)", borderRadius:24, padding:40, border:"1px solid var(--line, #e2e8f0)", boxShadow:"0 8px 40px rgba(11,31,58,0.08)", maxWidth:420, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>📬</div>
          <div style={{ width:48, height:4, background:"#C8A96A", borderRadius:2, margin:"0 auto 20px" }} />
          <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:"0 0 10px" }}>{t.auth.forgotSuccess}</h2>
          <p style={{ fontSize:14, color:"var(--ink-2, #64748b)", marginBottom:24 }}>
            <strong style={{ color:"#0B1F3A" }}>{email}</strong>
          </p>
          <Link href="/login" style={{ display:"inline-flex", alignItems:"center", gap:6, color:"#C8A96A", fontWeight:600, textDecoration:"none", fontSize:14 }}>
            ← {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"grid", gap:24, gridTemplateColumns:"1fr" }} className="lg:grid-cols-2">
      {/* Sol: Hero */}
      <div style={{ background:"#0B1F3A", borderRadius:24, padding:32, border:"1px solid rgba(200,169,106,0.2)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 30% 70%, rgba(200,169,106,0.12) 0%, transparent 60%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(200,169,106,0.12)", border:"1px solid rgba(200,169,106,0.3)", borderRadius:20, padding:"5px 14px", width:"fit-content" }}>
            <span style={{ fontSize:14 }}>🔑</span>
            <span style={{ fontSize:12, fontWeight:600, color:"#C8A96A" }}>{t.auth.forgotPill}</span>
          </div>
          <div>
            <h1 style={{ fontFamily:"var(--font-serif, Georgia)", fontSize:34, fontWeight:600, color:"#FAFAF8", lineHeight:1.2, margin:0 }}>
              {t.auth.forgotTitle}
            </h1>
          </div>
          <p style={{ fontSize:15, color:"rgba(250,250,248,0.65)", maxWidth:340, lineHeight:1.65, margin:0 }}>
            {t.auth.forgotDesc}
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
            {["Güvenli sıfırlama bağlantısı", "15 dakika geçerlilik süresi", "Hesap güvenliğiniz korunur"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"rgba(250,250,248,0.5)" }}>
                <span style={{ color:"#C8A96A", fontSize:11 }}>✦</span> {t.tr(f)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ: Form */}
      <div style={{ background:"var(--card, #fff)", borderRadius:24, padding:28, border:"1px solid var(--line, #e2e8f0)", boxShadow:"0 8px 40px rgba(11,31,58,0.08)" }}>
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:0 }}>{t.auth.forgotSub}</h2>
          <p style={{ fontSize:13, color:"var(--ink-2, #64748b)", margin:"4px 0 0" }}>{t.auth.forgotDesc}</p>
        </div>

        <form onSubmit={onSubmit} style={{ display:"grid", gap:16 }}>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
            <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.login.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPh}
              style={INPUT_STYLE}
              onFocus={e => e.target.style.borderColor="#C8A96A"}
              onBlur={e => e.target.style.borderColor="var(--line, #e2e8f0)"}
            />
          </label>

          <button
            disabled={loading}
            type="submit"
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
            {loading && <span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#C8A96A", animation:"fgSpin 0.7s linear infinite", display:"inline-block" }} />}
            {loading ? t.auth.forgotLoading : t.auth.forgotSubmit}
          </button>

          {error && <div style={{ fontSize:13, color:"#ef4444", padding:"8px 12px", background:"#fef2f2", borderRadius:8, border:"1px solid #fecaca" }}>{error}</div>}

          <p style={{ textAlign:"center", fontSize:13, color:"var(--ink-2, #64748b)", margin:0 }}>
            {t.auth.rememberPassword}{' '}
            <Link href="/login" style={{ color:"#C8A96A", fontWeight:600, textDecoration:"none" }}>
              {t.nav.login}
            </Link>
          </p>
        </form>
      </div>

      <style jsx global>{`
        @keyframes fgSpin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .lg\\:grid-cols-2 { grid-template-columns: 1.1fr 0.9fr !important; } }
      `}</style>
    </div>
  );
}
