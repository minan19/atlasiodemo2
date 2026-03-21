'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRole, type UserRole } from "../_components/role-context";

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
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      // 1. Kayıt ol
      const regRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email, password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData?.message || "Kayıt başarısız");

      // 2. Otomatik giriş yap
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error("Kayıt başarılı, ancak otomatik giriş yapılamadı. Lütfen giriş yapın.");

      localStorage.setItem("accessToken", loginData.accessToken);
      if (loginData.refreshToken) localStorage.setItem("refreshToken", loginData.refreshToken);

      const role = normalizeRole(loginData.user?.role ?? "STUDENT");
      setRole(role);
      // Doğrulama bildirimi göster, ardından kurslara yönlendir
      router.push("/courses?welcome=1");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
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
            Öğrenmeye başla
          </div>
          <h1 className="text-4xl font-semibold leading-tight">
            Atlasio'ya
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
              hoş geldin.
            </span>
          </h1>
          <p className="text-slate-600 text-lg max-w-xl">
            Binlerce kurs, canlı dersler ve kişiselleştirilmiş öğrenme yolculuğu seni bekliyor.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            <Stat label="Aktif öğrenci" value="12K+" accent />
            <Stat label="Kurs sayısı" value="380+" />
            <Stat label="Ortalama puan" value="4.8★" />
          </div>
        </div>
      </div>

      {/* Sağ — Form */}
      <div className="glass p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-semibold">Hesap oluştur</h2>
            <p className="text-sm text-slate-600">Ücretsiz, dakikalar içinde hazır.</p>
          </div>
          <span className="pill">2026 UI</span>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Ad Soyad</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız (isteğe bağlı)"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 shadow-sm focus:border-emerald-400 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
            />
          </label>

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

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Şifre</span>
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
                  ? "border-red-300 focus:border-red-400"
                  : "border-slate-200 focus:border-emerald-400"
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
            {loading ? "Kayıt yapılıyor…" : "Kayıt ol"}
          </button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <p className="text-center text-sm text-slate-500">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              Giriş yap
            </Link>
          </p>
        </form>
      </div>

      <style jsx global>{`
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
