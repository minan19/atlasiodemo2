'use client';

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole, type UserRole } from "../_components/role-context";
import { useI18n } from "../_i18n/use-i18n";
import { translateError } from "../_i18n/translate-error";

const API_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4100";

/** Prisma UserRole enum → frontend UserRole normalize et */
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

function redirectForRole(role: UserRole): string {
  if (role === "admin" || role === "head-instructor") return "/dashboard";
  if (role === "instructor") return "/whiteboard";
  if (role === "guardian") return "/report-cards";
  return "/courses";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { setRole } = useRole();
  const t = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({} as { message?: string }));
      if (!res.ok) throw new Error(data?.message || t.common.error);

      // Token'ları sakla
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      // Middleware auth guard için cookie set et (token değeri değil, varlık işareti)
      const role = normalizeRole(data.user?.role ?? "STUDENT");
      const maxAge = 60 * 60 * 24 * 7; // 7 gün
      document.cookie = `atlasio_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `atlasio_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;

      setRole(role);
      router.push(redirectTo ?? redirectForRole(role));
    } catch (err: unknown) {
      setError(translateError(err, t.tr));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── Sol: Hero Panel (her zaman navy) ── */}
      <div style={{ background:"#0B1F3A", borderRadius:24, padding:32, border:"1px solid rgba(200,169,106,0.2)", position:"relative", overflow:"hidden" }}>
        {/* Gold radial glow */}
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 20% 80%, rgba(200,169,106,0.12) 0%, transparent 60%)", pointerEvents:"none" }} />
        <div style={{ position:"relative", display:"flex", flexDirection:"column", gap:20 }}>
          {/* Pill badge */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(200,169,106,0.12)", border:"1px solid rgba(200,169,106,0.3)", borderRadius:20, padding:"5px 14px", width:"fit-content" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#C8A96A", display:"inline-block" }} />
            <span style={{ fontSize:12, fontWeight:600, color:"#C8A96A", letterSpacing:"0.03em" }}>{t.login.heroPill}</span>
          </div>
          {/* Heading */}
          <div>
            <h1 style={{ fontFamily:"var(--font-serif, Georgia)", fontSize:36, fontWeight:600, color:"#FAFAF8", lineHeight:1.15, margin:0 }}>
              {t.login.heroTitle1}
            </h1>
            <h1 style={{ fontFamily:"var(--font-serif, Georgia)", fontSize:36, fontWeight:600, fontStyle:"italic", color:"#C8A96A", lineHeight:1.15, margin:0 }}>
              {t.login.heroTitle2}
            </h1>
          </div>
          <p style={{ fontSize:15, color:"rgba(250,250,248,0.65)", maxWidth:360, lineHeight:1.6, margin:0 }}>
            {t.login.heroDesc}
          </p>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            <LoginStat label={t.tr("Aktif oturum")} value="1.2K" gold />
            <LoginStat label={t.tr("Başarısız deneme")} value="0.3%" />
            <LoginStat label={t.tr("Ort. oturum süresi")} value="42dk" />
          </div>
          {/* Feature list */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
            {["256-bit SSL şifreleme", "KVKK & GDPR uyumlu", "İki faktörlü kimlik doğrulama"].map(f => (
              <div key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"rgba(250,250,248,0.55)" }}>
                <span style={{ color:"#C8A96A", fontSize:11 }}>✦</span> {t.tr(f)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sağ: Form Panel ── */}
      <div style={{ background:"var(--card, #fff)", borderRadius:24, padding:28, border:"1px solid var(--line, #e2e8f0)", boxShadow:"0 8px 40px rgba(11,31,58,0.08)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, color:"var(--ink, #0f172a)", margin:0 }}>{t.login.formTitle}</h2>
            <p style={{ fontSize:13, color:"var(--ink-2, #64748b)", margin:"4px 0 0" }}>{t.login.formSub}</p>
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:"#C8A96A", background:"rgba(200,169,106,0.10)", border:"1px solid rgba(200,169,106,0.25)", borderRadius:20, padding:"3px 10px" }}>2026</span>
        </div>

        <form onSubmit={onSubmit} style={{ display:"grid", gap:16 }}>
          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
            <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.login.email}</span>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPh}
              style={{ borderRadius:10, border:"1.5px solid var(--line, #e2e8f0)", padding:"11px 14px", fontSize:14, color:"var(--ink, #0f172a)", background:"var(--surface, #fff)", outline:"none", transition:"border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor="#C8A96A"}
              onBlur={e => e.target.style.borderColor="var(--line, #e2e8f0)"}
            />
          </label>

          <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:13 }}>
            <span style={{ color:"var(--ink-2, #64748b)", fontWeight:500 }}>{t.login.password}</span>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.passwordPh}
              style={{ borderRadius:10, border:"1.5px solid var(--line, #e2e8f0)", padding:"11px 14px", fontSize:14, color:"var(--ink, #0f172a)", background:"var(--surface, #fff)", outline:"none", transition:"border-color 0.15s" }}
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
            {loading && (
              <span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#C8A96A", animation:"loginSpin 0.7s linear infinite", display:"inline-block", flexShrink:0 }} />
            )}
            {loading ? t.login.loading : t.login.submit}
          </button>

          {error ? <div style={{ fontSize:13, color:"#ef4444", padding:"8px 12px", background:"#fef2f2", borderRadius:8, border:"1px solid #fecaca" }}>{error}</div> : null}

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:13, color:"var(--ink-2, #64748b)" }}>
            <p style={{ margin:0 }}>
              {t.login.noAccount}{" "}
              <Link href="/register" style={{ color:"#C8A96A", fontWeight:600, textDecoration:"none" }}>
                {t.login.register}
              </Link>
            </p>
            <Link href="/forgot-password" style={{ color:"var(--ink-2, #94a3b8)", textDecoration:"none", fontSize:12 }}>
              {t.login.forgotPassword}
            </Link>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes loginSpin { to { transform: rotate(360deg); } }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        select:-webkit-autofill {
          -webkit-text-fill-color: #0f172a;
          box-shadow: 0 0 0 1000px #ffffff inset;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginStat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ borderRadius:12, border:`1px solid ${gold ? "rgba(200,169,106,0.4)" : "rgba(255,255,255,0.1)"}`, padding:"10px 12px", background: gold ? "rgba(200,169,106,0.12)" : "rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize:10, color:"rgba(250,250,248,0.5)", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: gold ? "#C8A96A" : "#FAFAF8" }}>{value}</div>
    </div>
  );
}
