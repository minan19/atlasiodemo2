"use client";

import useSWR from "swr";
import { api } from "../api/client";

type EnrollmentInsight = {
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  refundCount: number;
  completionByDay?: { date: string; count: number }[];
};

// --- Demo data for new sections ---

const HEATMAP_DATA = [
  { day: "Pzt", intensity: 3 },
  { day: "Sal", intensity: 5 },
  { day: "Çar", intensity: 2 },
  { day: "Per", intensity: 4 },
  { day: "Cum", intensity: 5 },
  { day: "Cmt", intensity: 1 },
  { day: "Paz", intensity: 0 },
];

const SUBJECTS = [
  { name: "Matematik", pct: 78, color: "bg-blue-500", level: "Orta" },
  { name: "Fen Bilimleri", pct: 65, color: "bg-green-500", level: "Orta" },
  { name: "Türkçe", pct: 90, color: "bg-emerald-500", level: "Güçlü" },
  { name: "İngilizce", pct: 55, color: "bg-violet-500", level: "Orta" },
  { name: "Tarih", pct: 40, color: "bg-amber-500", level: "Zayıf" },
] as const;

const LEVEL_STYLES: Record<string, string> = {
  Güçlü: "bg-emerald-100 text-emerald-700",
  Orta: "bg-blue-100 text-blue-700",
  Zayıf: "bg-amber-100 text-amber-700",
};

const AI_INSIGHTS = [
  {
    icon: "💡",
    text: "Matematik pratik frekansın düşük — haftada 3 seans önerilir",
    accent: "border-blue-200 bg-blue-50",
    textColor: "text-blue-800",
  },
  {
    icon: "🔥",
    text: "Türkçe'de harika ilerliyorsun! Bu tempoyu koru",
    accent: "border-emerald-200 bg-emerald-50",
    textColor: "text-emerald-800",
  },
  {
    icon: "⚠️",
    text: "İngilizce konularında tekrar yapman gerekiyor",
    accent: "border-amber-200 bg-amber-50",
    textColor: "text-amber-800",
  },
  {
    icon: "🎯",
    text: "Bu haftaki hedef: 2 konu daha tamamla",
    accent: "border-rose-200 bg-rose-50",
    textColor: "text-rose-800",
  },
];

const TEACHER_FEEDBACKS = [
  {
    name: "Ahmet Hoca",
    subject: "Matematik",
    date: "12 Mar 2026",
    rating: 4.5,
    comment:
      "Türev konusunda çok iyi ilerleme kaydetti. İntegral pratiğini artırmalı.",
    avatarColor: "bg-blue-500",
    initials: "AH",
  },
  {
    name: "Selin Hoca",
    subject: "Fen Bilimleri",
    date: "10 Mar 2026",
    rating: 5,
    comment:
      "Deney raporları düzenli ve detaylı. Devam etmesini öneririm.",
    avatarColor: "bg-emerald-500",
    initials: "SH",
  },
];

// --- Helpers ---

function heatmapColor(intensity: number) {
  if (intensity === 0) return "bg-slate-200";
  if (intensity <= 1) return "bg-green-100";
  if (intensity <= 2) return "bg-green-200";
  if (intensity <= 3) return "bg-green-400";
  if (intensity <= 4) return "bg-green-500";
  return "bg-green-600";
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <svg
            key={i}
            className={`w-4 h-4 ${filled || half ? "text-amber-400" : "text-slate-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      })}
      <span className="ml-1 text-xs text-slate-500">{rating}/5</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
      <div className="h-4 w-2/3 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-1/2 bg-slate-100 rounded mb-3" />
      <div className="h-2 rounded-full bg-slate-200 w-full" />
    </div>
  );
}

function Progress({ to }: { to: number }) {
  return (
    <div className="mt-3">
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rose-400 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, to))}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportCardsPage() {
  const { data, error, isLoading } = useSWR<EnrollmentInsight>(
    "/reports/enrollments/insights",
    api,
    { revalidateOnFocus: false }
  );

  const activeRatio =
    data && data.totalEnrollments > 0
      ? Math.round((data.activeEnrollments / data.totalEnrollments) * 100)
      : 0;

  return (
    <main className="space-y-6">
      {/* ── Header ── */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Karne</div>
          <h1 className="text-3xl font-semibold">
            Başlangıçtan bugüne ilerleme
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            AI özet, gelişim grafiği, eğitmen onayı ve sertifika bağlantısı.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ⚠️ Karne verileri yüklenemedi: {error?.message ?? "Bilinmeyen hata"}
        </div>
      )}

      {/* ── 3 Stat Cards ── */}
      <section className="grid md:grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : data
          ? (
            <>
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 shadow-sm animate-fade-slide-up stagger-1">
                <div className="text-sm text-slate-600">Toplam kayıt</div>
                <div className="text-2xl font-semibold mt-1 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  {data.totalEnrollments.toLocaleString("tr-TR")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Tüm zamanlar</div>
                <Progress to={100} />
                <div className="mt-2 flex gap-2">
                  <button className="btn-link text-xs">PDF Karne</button>
                  <button className="btn-link text-xs">AI Özet</button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm animate-fade-slide-up stagger-2">
                <div className="text-sm text-slate-600">Tamamlanan</div>
                <div className="text-2xl font-semibold mt-1 bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  {data.completedEnrollments.toLocaleString("tr-TR")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Tamamlanma oranı: %{Math.round(data.completionRate)}
                </div>
                <Progress to={Math.round(data.completionRate)} />
                <div className="mt-2 flex gap-2">
                  <button className="btn-link text-xs">PDF Karne</button>
                  <button className="btn-link text-xs">AI Özet</button>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 shadow-sm animate-fade-slide-up stagger-3">
                <div className="text-sm text-slate-600">Aktif kayıt</div>
                <div className="text-2xl font-semibold mt-1 bg-gradient-to-r from-rose-500 to-pink-400 bg-clip-text text-transparent">
                  {data.activeEnrollments.toLocaleString("tr-TR")}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  İade: {data.refundCount} adet
                </div>
                <Progress to={activeRatio} />
                <div className="mt-2 flex gap-2">
                  <button className="btn-link text-xs">PDF Karne</button>
                  <button className="btn-link text-xs">AI Özet</button>
                </div>
              </div>
            </>
          )
          : null}
      </section>

      {/* ── Daily Completion Chart ── */}
      {data?.completionByDay && data.completionByDay.length > 0 && (
        <section className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
              Günlük tamamlanma akışı
            </h2>
            <span className="pill text-xs">Son {data.completionByDay.length} gün</span>
          </div>
          <div className="grid gap-2">
            {data.completionByDay.map((d) => {
              const max = Math.max(
                ...data.completionByDay!.map((x) => x.count),
                1
              );
              return (
                <div key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">
                    {new Date(d.date).toLocaleDateString("tr-TR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (d.count / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Personal Performance Overview ── */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-400 inline-block" />
            Kişisel Performans Özeti
          </h2>
          <span className="pill text-xs">Bu hafta</span>
        </div>

        {/* Heatmap */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Haftalık Aktivite
          </p>
          <div className="flex items-end gap-2">
            {HEATMAP_DATA.map(({ day, intensity }) => (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-lg ${heatmapColor(intensity)} transition-colors`}
                  title={`${day}: seviye ${intensity}`}
                />
                <span className="text-xs text-slate-400">{day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-slate-400">Az</span>
            {[0, 1, 3, 4, 5].map((v) => (
              <div
                key={v}
                className={`w-3 h-3 rounded-sm ${heatmapColor(v)}`}
              />
            ))}
            <span className="text-xs text-slate-400">Çok</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-3 text-center">
            <div className="text-xl">🔥</div>
            <div className="text-base font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mt-0.5">
              12 günlük seri
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Güncel seri</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-3 text-center">
            <div className="text-xl">🏆</div>
            <div className="text-base font-bold bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent mt-0.5">
              En iyi: 23 gün
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Rekor</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 text-center">
            <div className="text-xl">📚</div>
            <div className="text-base font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mt-0.5">
              8.5 saat
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Çalışma süresi</div>
          </div>
        </div>
      </section>

      {/* ── Subject Breakdown ── */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
            Ders Bazlı Gelişim
          </h2>
          <span className="pill text-xs">5 ders</span>
        </div>
        <div className="space-y-4">
          {SUBJECTS.map(({ name, pct, color, level }, i) => (
            <div
              key={name}
              className={`animate-fade-slide-up stagger-${Math.min(i + 1, 3)}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {name}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_STYLES[level]}`}
                  >
                    {level}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  %{pct}
                </span>
              </div>
              <div className="progress-track h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`progress-fill h-full ${color} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Study Insights ── */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-3 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
            AI Çalışma Önerileri
          </h2>
          <span className="pill text-xs">Kişiselleştirilmiş</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {AI_INSIGHTS.map(({ icon, text, accent, textColor }, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3.5 ${accent} animate-fade-slide-up stagger-${Math.min(i + 1, 3)}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <p className={`text-sm leading-relaxed ${textColor}`}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teacher Feedback ── */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
            Eğitmen Geri Bildirimleri
          </h2>
          <span className="pill text-xs">2 yorum</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {TEACHER_FEEDBACKS.map(
            (
              { name, subject, date, rating, comment, avatarColor, initials },
              i
            ) => (
              <div
                key={i}
                className={`glass rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm animate-fade-slide-up stagger-${i + 1}`}
              >
                {/* Teacher header */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-white text-sm font-semibold">
                      {initials}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">{subject}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{date}</span>
                    </div>
                  </div>
                </div>

                {/* Stars */}
                <Stars rating={rating} />

                {/* Comment */}
                <p className="text-sm text-slate-700 leading-relaxed border-l-2 border-slate-200 pl-3 italic">
                  "{comment}"
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}
