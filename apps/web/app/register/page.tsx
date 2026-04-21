'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRole, type UserRole } from "../_components/role-context";
import { useI18n } from "../_i18n/use-i18n";

const API_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4100";

function normalizeRole(raw: string): UserRole {
  const map: Record<string, UserRole> = {
    ADMIN: "admin",
    HEAD_INSTRUCTOR: "head-instructor",
    INSTRUCTOR: "instructor",
    STUDENT: "student",
    GUARDIAN: "guardian",
  };
  return map[raw?.toUpperCase()] ?? "student";
}

export default function RegisterPage() {
  const router = useRouter();
  const { setRole } = useRole();
  const t = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData?.message || t.register.submit);

      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData?.message || t.common.error);

      localStorage.setItem("accessToken", loginData.accessToken);
      if (loginData.refreshToken) localStorage.setItem("refreshToken", loginData.refreshToken);

      const role = normalizeRole(loginData.user?.role ?? "STUDENT");
      const maxAge = 60 * 60 * 24 * 7;
      document.cookie = `atlasio_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `atlasio_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
      setRole(role);
      router.push("/courses?welcome=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── Sol: Hero Panel ── */}
      <div style={{ background:"#0B1F3A", borderRadius:24, padding:32, border:"1px solid rgba(200,169,106,0.2)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 80% 20%, rgba(200,169,106,0.10) 0%, transparent 55%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(200,169,106,0.12)", border:"1px solid rgba(200,169,106,0.3)", borderRadius:20, padding:"5px 14px", width:"fit-content" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#C8A96A", display:"inline-block" }} />
            <span style={{ fontSize:12, fontWeight:600, color:"#C8A96A", letterSpacing:"0.03em" }}>{t.register.heroPill}</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-serif, Georgia)", fontSize:34, fontWeight:600, color:"#FAFAF8", lineHeight:1.2, margin:0 }}>
            {t.register.heroTitle}
          </h1>
          <p style={{ fontSize:15, color:"rgba(250,250,248,0.65)", maxWidth:360, lineHeight:1.6, margin:0 }}>
            {t.register.heroDesc}
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            <RegStat label={t.register.stat1Label} value={t.register.stat1Value} gold />
            <RegStat label={t.register.stat2Label} value={t.register.stat2Value} />
            <RegStat label={t.register.stat3Label} value={t.register.stat3Value} />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
            {["Ücretsiz başla, her zaman iptal et", "24/7 öğrenme erişimi", "Sertifikalı kurslar"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"rgba(250,250,248,0.55)" }}>
                <span style={{ color:"#C8A96A", fontSize:11 }}>✦</span> {t.tr(f)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sağ: Form Panel ── */}
      <div style={{ background:"var(--card, #fff)", borderRadius:24, padding:28, border:"1px solid var(--line, #e2e8f0)", boxShadow:"0 8px 40px rgba(11,31,58,0.08)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:0 }}>{t.register.formTitle}</h2>
            <p style={{ fontSize:13, color:"var(--ink-2, #64748b)", margin:"4px 0 0" }}>{t.register.formSub}</p>
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:"#C8A96A", background:"rgba(200,169,106,0.10)", border:"1px solid rgba(200,169,106,0.25)", borderRadius:20, padding:"3px 10px" }}>2026</span>
        </div>

        <form onSubmit={onSubmit} style={{ display:"grid", gap:14 }}>
          {[
            { key:"name",    label:t.register.name,            placeholder:t.register.namePh,     value:name,     setter:setName,    type:"text",     required:false },
            { key:"email",   label:t.register.email,           placeholder:t.register.emailPh,    value:email,    setter:setEmail,   type:"email",    required:true },
            { key:"pass",    label:t.register.password,        placeholder:t.register.passwordPh, value:password, setter:setPassword,type:"password", required:true },
          ].map(f => (
            <label key={f.key} style={{ display:"flex", flexDirection:"column", gap:5, fontSize:13 }}>
              <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{f.label}</span>
              <input
                type={f.type}
                required={f.required}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                placeholder={f.placeholder}
                style={{ borderRadius:10, border:"1.5px solid var(--line, #e2e8f0)", padding:"11px 14px", fontSize:14, color:"var(--ink, #0f172a)", background:"var(--surface, #fff)", outline:"none", transition:"border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor="#C8A96A"}
                onBlur={e => e.target.style.borderColor="var(--line, #e2e8f0)"}
              />
            </label>
          ))}

          <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:13 }}>
            <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.register.confirmPassword}</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder={t.register.confirmPh}
              style={{ borderRadius:10, border:`1.5px solid ${confirm && confirm !== password ? "#ef4444" : "var(--line, #e2e8f0)"}`, padding:"11px 14px", fontSize:14, color:"var(--ink, #0f172a)", background:"var(--surface, #fff)", outline:"none", transition:"border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "#C8A96A"}
              onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "var(--line, #e2e8f0)"}
            />
            {confirm && confirm !== password && (
              <span style={{ fontSize:12, color:"#ef4444" }}>{t.register.errorMismatch}</span>
            )}
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
            {loading && (
              <span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#C8A96A", animation:"spin 0.7s linear infinite", display:"inline-block", flexShrink:0 }} />
            )}
            {loading ? t.register.loading : t.register.submit}
          </button>

          {error ? <div style={{ fontSize:13, color:"#ef4444", padding:"8px 12px", background:"#fef2f2", borderRadius:8, border:"1px solid #fecaca" }}>{error}</div> : null}

          <p style={{ textAlign:"center", fontSize:13, color:"var(--ink-2, #64748b)", margin:0 }}>
            {t.register.haveAccount}{" "}
            <Link href="/login" style={{ color:"#C8A96A", fontWeight:600, textDecoration:"none" }}>
              {t.register.loginLink}
            </Link>
          </p>
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a;
          box-shadow: 0 0 0 1000px #ffffff inset;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

function RegStat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ borderRadius:12, border:`1px solid ${gold ? "rgba(200,169,106,0.4)" : "rgba(255,255,255,0.1)"}`, padding:"10px 12px", background: gold ? "rgba(200,169,106,0.12)" : "rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize:10, color:"rgba(250,250,248,0.5)", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: gold ? "#C8A96A" : "#FAFAF8" }}>{value}</div>
    </div>
  );
}
