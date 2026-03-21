'use client';

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole, type UserRole } from "../_components/role-context";
import { useI18n } from "../_i18n/use-i18n";

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

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Giriş başarısız");

      // Token'ları sakla
      localStorage.setItem("accessToken", data.accessToken);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

      // Rolü doğrudan API yanıtından al — e-posta tahminine gerek yok
      const role = normalizeRole(data.user?.role ?? "STUDENT");
      setRole(role);
      router.push(redirectTo ?? redirectForRole(role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass p-8 rounded-3xl border border-slate-200 hero">
        <div className="hero-content space-y-4">
          <div className="pill w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t.login.heroPill}
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            {t.login.heroTitle1}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              {t.login.heroTitle2}
            </span>
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            {t.login.heroDesc}
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Stat label="Aktif oturum" value="1.2K" accent />
            <Stat label="Başarısız deneme" value="0.3%" />
            <Stat label="Ortalama oturum süresi" value="42dk" />
          </div>
        </div>
      </div>

      <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{t.login.formTitle}</h2>
            <p className="text-sm text-slate-600">{t.login.formSub}</p>
          </div>
          <span className="pill">2026 UI</span>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="space-y-2 text-sm">
            <span className="text-slate-600">{t.login.email}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.login.emailPh}
              className="rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-slate-600">{t.login.password}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.login.passwordPh}
              type="password"
              className="rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

          <button
            disabled={loading}
            className="btn-link justify-center text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl"
            type="submit"
          >
            {loading ? t.login.loading : t.login.submit}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-emerald-600 hover:underline font-medium">
                Kayıt ol
              </Link>
            </p>
            <Link href="/forgot-password" className="text-slate-500 hover:text-emerald-600 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
        </form>
      </div>

      <style jsx global>{`
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

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${
        accent ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white/80'
      }`}
    >
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
