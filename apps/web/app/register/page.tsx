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
      {/* Sol — Hero */}
      <div className="glass p-8 rounded-3xl border border-slate-200 hero">
        <div className="hero-content space-y-4">
          <div className="pill w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t.register.heroPill}
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            {t.register.heroTitle}
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            {t.register.heroDesc}
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Stat label={t.register.stat1Label} value={t.register.stat1Value} accent />
            <Stat label={t.register.stat2Label} value={t.register.stat2Value} />
            <Stat label={t.register.stat3Label} value={t.register.stat3Value} />
          </div>
        </div>
      </div>

      {/* Sağ — Form */}
      <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-semibold">{t.register.formTitle}</h2>
            <p className="text-sm text-slate-600">{t.register.formSub}</p>
          </div>
          <span className="pill">2026 UI</span>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">{t.register.name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.register.namePh}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">{t.register.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.register.emailPh}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">{t.register.password}</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.register.passwordPh}
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
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-emerald-400"
              }`}
            />
            {confirm && confirm !== password && (
              <span className="text-xs text-red-500">{t.register.errorMismatch}</span>
            )}
          </label>

          <button
            disabled={loading}
            type="submit"
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              background: loading
                ? "var(--panel)"
                : "linear-gradient(135deg, #10b981, #06b6d4)",
              color: loading ? "var(--ink-2)" : "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
              boxShadow: loading ? "none" : "0 4px 20px rgba(16,185,129,0.35)",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && (
              <span
                style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid var(--line-accent)",
                  borderTopColor: "var(--accent)",
                  animation: "spin 0.7s linear infinite",
                  display: "inline-block",
                }}
              />
            )}
            {loading ? t.register.loading : t.register.submit}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <p className="text-center text-sm text-slate-500">
            {t.register.haveAccount}{" "}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
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

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${
        accent
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50"
          : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50"
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${accent ? "text-emerald-700" : "text-slate-700"}`}>{value}</div>
    </div>
  );
}
