"use client";

import Link from "next/link";
import { useRole, UserRole } from "../_components/role-context";

type Card = {
  role: UserRole;
  title: string;
  desc: string;
  href: string;
  emoji: string;
  gradient: string;
  iconBg: string;
  features: string[];
};

const cards: Card[] = [
  {
    role: "admin",
    title: "Yönetici",
    desc: "Platformun tüm bileşenlerini yönet",
    href: "/dashboard",
    emoji: "👑",
    gradient: "from-rose-500 to-orange-500",
    iconBg: "from-rose-400/20 to-orange-400/20",
    features: ["Tüm platform yönetimi", "Kullanıcı ve içerik kontrolü", "Finans ve raporlar"],
  },
  {
    role: "head-instructor",
    title: "Baş Eğitmen",
    desc: "Eğitmen ekibini ve sınıfları yönet",
    href: "/instructor/insights",
    emoji: "🎓",
    gradient: "from-violet-500 to-purple-500",
    iconBg: "from-violet-400/20 to-purple-400/20",
    features: ["Sınıf dağıtımı ve planlama", "Eğitmen denetimi", "Sertifika onayı"],
  },
  {
    role: "instructor",
    title: "Eğitmen",
    desc: "Dersleri yönet ve öğrencileri takip et",
    href: "/whiteboard",
    emoji: "🖊️",
    gradient: "from-blue-500 to-cyan-500",
    iconBg: "from-blue-400/20 to-cyan-400/20",
    features: ["Canlı ders ve akıllı tahta", "Ödev ve değerlendirme", "Öğrenci takibi"],
  },
  {
    role: "student",
    title: "Öğrenci",
    desc: "Kurslara katıl, öğren ve başar",
    href: "/leaderboard",
    emoji: "📚",
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "from-emerald-400/20 to-teal-400/20",
    features: ["Kurs kayıt ve takip", "Sınav ve rozet sistemi", "AI Mentor erişimi"],
  },
  {
    role: "guardian",
    title: "Veli",
    desc: "Çocuğunun gelişimini yakından izle",
    href: "/guardian",
    emoji: "🛡️",
    gradient: "from-amber-500 to-orange-500",
    iconBg: "from-amber-400/20 to-orange-400/20",
    features: ["Çocuk ilerleme takibi", "Devamsızlık uyarıları", "Eğitmen iletişimi"],
  },
];

const shortcuts = [
  { label: "Takvim", emoji: "📅", href: "/calendar" },
  { label: "Whiteboard", emoji: "🖥️", href: "/whiteboard" },
  { label: "AI Mentor", emoji: "🤖", href: "/ai-mentor" },
  { label: "Leaderboard", emoji: "🏆", href: "/leaderboard" },
  { label: "Sertifikalar", emoji: "🎖️", href: "/certificates" },
  { label: "Derslerim", emoji: "📖", href: "/courses" },
];

export default function PortalPage() {
  const { role, setRole } = useRole();

  const activeCard = cards.find((c) => c.role === role);

  return (
    <main className="min-h-screen space-y-10 px-4 py-8 md:px-8">
      {/* Hero Section */}
      <header className="glass rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="pill text-xs font-semibold tracking-wide">Çoklu Rol</span>
            <span className="pill text-xs font-semibold tracking-wide">Güvenli Geçiş</span>
            <span className="pill text-xs font-semibold tracking-wide">Anlık Senkron</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent leading-tight">
            Atlasio Rol Portalı
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-base md:text-lg leading-relaxed">
            Tek hesapla birden fazla role erişin. Yönetici, baş eğitmen, eğitmen, öğrenci veya veli — her rol için özel panel ve yetkiler sizi bekliyor.
          </p>
        </div>
      </header>

      {/* Role Cards */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const isActive = role === c.role;
          return (
            <div
              key={c.role}
              className={`glass rounded-2xl border p-6 flex flex-col gap-5 transition-all duration-300 ${
                isActive
                  ? "border-emerald-400 shadow-[0_0_24px_2px_rgba(52,211,153,0.18)]"
                  : "border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center text-3xl shrink-0 border border-white/10`}>
                  {c.emoji}
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 shrink-0">
                    <span>✓</span> Aktif Rol
                  </span>
                )}
              </div>

              {/* Title + Desc */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.desc}</p>
              </div>

              {/* Feature List */}
              <ul className="space-y-1.5">
                {c.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className={`text-xs font-bold bg-gradient-to-r ${c.gradient} bg-clip-text text-transparent`}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-1">
                <button
                  onClick={() => setRole(c.role)}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${c.gradient} text-white shadow-md`
                      : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {isActive ? "Seçildi" : "Bu rolü seç"}
                </button>
                <Link
                  href={c.href}
                  className="btn-link py-2 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 whitespace-nowrap"
                >
                  Panele git →
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Active Role Banner */}
      {activeCard && (
        <div className={`glass rounded-2xl border border-white/20 dark:border-slate-700/60 p-6 bg-gradient-to-r ${activeCard.gradient} bg-opacity-10 relative overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-r ${activeCard.gradient} opacity-5 pointer-events-none`} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeCard.iconBg} flex items-center justify-center text-2xl border border-white/20`}>
                {activeCard.emoji}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Aktif Rol</p>
                <p className={`text-xl font-bold bg-gradient-to-r ${activeCard.gradient} bg-clip-text text-transparent`}>
                  {activeCard.title}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{activeCard.features.join(" · ")}</p>
              </div>
            </div>
            <Link
              href={activeCard.href}
              className={`shrink-0 inline-flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${activeCard.gradient} shadow-md hover:opacity-90 transition-opacity`}
            >
              Paneli Aç →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Access Grid */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Hızlı Erişim</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {shortcuts.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="glass rounded-2xl border border-slate-200/60 dark:border-slate-700/60 p-4 flex flex-col items-center gap-2 hover:border-violet-400/60 hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-all duration-200 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{s.emoji}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center leading-tight">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
