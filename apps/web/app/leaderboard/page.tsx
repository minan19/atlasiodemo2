"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import useSWR from "swr";
import { api } from "../api/client";
import { PanelShell } from "../_components/panel-shell";
import { useI18n } from "../_i18n/use-i18n";

type UploadItem = { name: string; size: number; type: string; url: string };
type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  score: number;
  badge: string;
  frame: string;
};
type Enrollment = {
  id: string;
  completedAt?: string | null;
  Course?: { id: string; title: string; level?: string | null } | null;
};
type ScheduleEntry = {
  id: string;
  startsAt: string;
  Course?: { title: string } | null;
};

const navSections = [
  {
    title: "Öğrenci",
    items: [
      { label: "Ana Sayfa", href: "/leaderboard", icon: "🏠" },
      { label: "Derslerim", href: "/courses", icon: "📚" },
      { label: "Canlı Ders", href: "/live", icon: "📡" },
      { label: "Akıllı Tahta", href: "/whiteboard", icon: "🧠" },
      { label: "Bildirimler", href: "/notifications", icon: "🔔" },
      { label: "Seans Rezervasyonu", href: "/booking", icon: "📅" },
    ],
  },
  {
    title: "Takip & Gelişim",
    items: [
      { label: "Ödevler", href: "/leaderboard", icon: "📝" },
      { label: "Akran Değerlendirmesi", href: "/peer-review", icon: "🤝" },
      { label: "Sertifikalar", href: "/certificates", icon: "🏅" },
      { label: "Raporlarım", href: "/report-cards", icon: "📈" },
      { label: "Beceri Profilim", href: "/my-courses/skill-profile", icon: "📊" },
      { label: "Öğrenme Planım", href: "/learning-plans", icon: "🗺️" },
    ],
  },
  {
    title: "AI Araçlar",
    items: [
      { label: "Dil Laboratuvarı", href: "/language-lab", icon: "🎤" },
      { label: "Matematik Çözücü", href: "/math-lab", icon: "📐" },
      { label: "Adaptif Sınav", href: "/exams/adaptive", icon: "🎯" },
      { label: "Yol Haritası", href: "/roadmap", icon: "🗺️" },
      { label: "İlerleme", href: "/progress", icon: "📈" },
    ],
  },
];


const badges = [
  { title: "Hızlı Çözücü", desc: "5 dk altında 10 soru", icon: "⚡", earned: true, xpReward: 200 },
  { title: "Tekrar Ustası", desc: "Aynı seti 3 kez bitirdi", icon: "🔁", earned: true, xpReward: 150 },
  { title: "Takım Oyuncusu", desc: "Grup ödevine katkı %30+", icon: "🤝", earned: false, xpReward: 300 },
  { title: "Süre Şampiyonu", desc: "Zaman yönetimi puanı 95+", icon: "⏱️", earned: false, xpReward: 250 },
  { title: "İlk Adım", desc: "İlk kursu tamamla", icon: "🌱", earned: true, xpReward: 100 },
  { title: "Meraklı", desc: "5 farklı konu çalış", icon: "🔭", earned: true, xpReward: 175 },
  { title: "Puan Avcısı", desc: "1000 XP kazan", icon: "🎯", earned: true, xpReward: 500 },
  { title: "Gece Kuşu", desc: "Gece 22:00 sonrası ders", icon: "🦉", earned: false, xpReward: 125 },
];

const assignmentsSeed = [
  { name: "Hafta 3 Ödev", due: "Perşembe 20:00", status: "Bekliyor" },
  { name: "Mini Proje", due: "Cuma 18:00", status: "Taslak" },
];

const marketplace = [
  { name: "Lena Schneider", lang: "DE", rating: 4.8, price: "₺380 / ders" },
  { name: "Arda Demir", lang: "EN", rating: 4.9, price: "₺420 / ders" },
  { name: "Rana Kılıç", lang: "AR", rating: 4.7, price: "₺360 / ders" },
];

type GamificationStats = {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  coins: number;
  hearts: number;
  streakFreezes: number;
  league: string;
  UserBadge?: { Badge: { name: string; description?: string; iconUrl?: string } }[];
};

const LEAGUE_LABELS: Record<string, string> = {
  BRONZE: '🥉 Bronz', SILVER: '🥈 Gümüş', GOLD: '🥇 Altın',
  DIAMOND: '💎 Elmas', MASTER: '🏆 Üstat',
};

export default function StudentHubPage() {
  const t = useI18n();
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [materialsRemote, setMaterialsRemote] = useState<UploadItem[]>([]);
  const [assignments] = useState(assignmentsSeed);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [myRank] = useState(3);
  const XP_PER_LEVEL = 1000;

  // Gerçek gamification istatistikleri
  const { data: gamStats } = useSWR<GamificationStats>(
    "/gamification/me", api, { revalidateOnFocus: false }
  );
  const myXP = gamStats?.totalXp ?? 2847;
  const myStreak = gamStats?.currentStreak ?? 12;
  const myLevel = Math.floor(myXP / XP_PER_LEVEL) + 1;
  const levelProgress = (myXP % XP_PER_LEVEL) / XP_PER_LEVEL * 100;

  const { data: leaderboardData, isLoading: leaderboardLoading } = useSWR<LeaderboardEntry[]>(
    "/reports/leaderboard?limit=5",
    api,
    { revalidateOnFocus: false }
  );

  const { data: enrollments, isLoading: enrollmentsLoading } = useSWR<Enrollment[]>(
    "/me/enrollments",
    api,
    { revalidateOnFocus: false }
  );
  const { data: schedule, isLoading: scheduleLoading } = useSWR<ScheduleEntry[]>(
    "/me/schedule",
    api,
    { revalidateOnFocus: false }
  );

  const roadmap = enrollments
    ? enrollments.slice(0, 5).map((e) => ({
        id: e.id,
        title: e.Course?.title ?? "Kurs",
        progress: e.completedAt ? 100 : 50,
      }))
    : null;

  const upcoming = schedule
    ? schedule.slice(0, 5).map((s) => ({
        id: s.id,
        time: new Date(s.startsAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        title: s.Course?.title ?? "Ders",
        teacher: "—",
      }))
    : null;

  const completedCount = enrollments ? enrollments.filter((e) => e.completedAt).length : null;
  const nextSession = upcoming?.[0];

  useEffect(() => {
    loadMaterials();
    loadAssignments();
  }, []);

  async function loadMaterials() {
    try {
      const res = await fetch("/api/uploads?category=materials");
      const data = (await res.json()) as UploadItem[];
      setMaterialsRemote(data);
    } catch (err) {
      console.error("Load materials failed", err);
    }
  }

  async function loadAssignments() {
    try {
      const res = await fetch("/api/uploads?category=assignments");
      const data = (await res.json()) as UploadItem[];
      setUploads(data);
    } catch (err) {
      console.error("Load assignments failed", err);
    }
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) return;
    try {
      setLoading(true);
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        await fetch("/api/uploads?category=assignments", { method: "POST", body: form });
      }
      await loadAssignments();
      setNote(`${list.length} ${t.tr("dosya yüklendi.")}`);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function removeUpload(name: string) {
    try {
      await fetch(`/api/uploads?category=assignments&name=${encodeURIComponent(name)}`, { method: "DELETE" });
      setUploads((prev) => prev.filter((u) => u.name !== name));
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  return (
    <PanelShell
      roleLabel={t.roles.student}
      userName={t.leaderboard.title}
      userSub={t.leaderboard.subtitle}
      navSections={navSections}
    >
      <div className="space-y-6">
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="pill w-fit">{t.roles.student}</div>
            <div className="pill w-fit bg-amber-50 border-amber-200 text-amber-700">🔥 {myStreak} {t.tr("günlük seri")}</div>
            <div className="pill w-fit bg-violet-50 border-violet-200 text-violet-700">⚡ {t.tr("Seviye")} {myLevel}</div>
          </div>
          <h1 className="text-3xl font-semibold">{t.tr("Bugün neye odaklanıyoruz?")}</h1>
          <p className="text-sm text-slate-600 max-w-3xl">
            {t.tr("Derslerin, materyallerin ve ilerlemen tek ekranda. Hızlıca canlı derse katıl veya kaydı izle.")}
          </p>
          {/* XP Progress bar */}
          <div className="max-w-md space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t.tr("XP İlerlemesi")}</span>
              <span className="font-semibold">{myXP.toLocaleString('tr-TR')} / {(myLevel * 1000).toLocaleString('tr-TR')} XP</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/courses" className="btn-link text-sm">{t.tr("Derslere göz at")}</Link>
            <Link href="/whiteboard" className="btn-link text-sm">{t.tr("Canlı tahtaya gir")}</Link>
            <Link href="/report-cards" className="btn-link text-sm">{t.tr("Karne & rozetler")}</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm animate-fade-slide-up stagger-1">
          <div className="flex items-center gap-2 text-sm text-emerald-700 mb-1">📚 <span>{t.tr("Kayıtlı kurs")}</span></div>
          <div className="text-3xl font-bold text-emerald-700">{enrollmentsLoading ? "—" : (enrollments?.length ?? 0)}</div>
          <div className="text-xs text-emerald-600 mt-1">{t.tr("Toplam")}</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 shadow-sm animate-fade-slide-up stagger-2">
          <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">✅ <span>{t.tr("Tamamlanan")}</span></div>
          <div className="text-3xl font-bold text-blue-700">{enrollmentsLoading ? "—" : (completedCount ?? 0)}</div>
          <div className="text-xs text-blue-600 mt-1">{t.tr("Tüm zamanlar")}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-sm animate-fade-slide-up stagger-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">🏆 <span>{t.tr("Sıralama")}</span></div>
          <div className="text-3xl font-bold text-amber-700">#{myRank}</div>
          <div className="text-xs text-amber-600 mt-1">{t.tr("Haftalık")}</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4 shadow-sm animate-fade-slide-up stagger-4">
          <div className="flex items-center gap-2 text-sm text-violet-700 mb-1">⏰ <span>{t.tr("Sıradaki ders")}</span></div>
          <div className="text-xl font-bold text-violet-700">{scheduleLoading ? "—" : (nextSession?.time ?? "—")}</div>
          <div className="text-xs text-violet-600 mt-1">{nextSession?.title ?? t.tr("Ders yok")}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-400 inline-block" />
              {t.tr("Öğrenim Yolculuğu")}
            </h2>
            <span className="pill text-xs">Roadmap</span>
          </div>
          <div className="space-y-2">
            {enrollmentsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse">
                    <div className="h-4 w-1/2 bg-slate-200 rounded mb-2" />
                    <div className="h-2 bg-slate-100 rounded-full" />
                  </div>
                ))
              : !roadmap || roadmap.length === 0
              ? (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    {t.tr("Henüz kayıtlı kurs yok.")}{" "}
                    <Link href="/courses" className="underline text-slate-700">{t.tr("Kurslara göz at")}</Link>
                  </div>
                )
              : roadmap.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold text-slate-800">{t.tr(r.title)}</div>
                      <span className={`text-xs font-bold ${r.progress >= 80 ? 'text-emerald-600' : r.progress >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>%{r.progress}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${r.progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : r.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}`}
                        style={{ width: `${r.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-pink-400 inline-block" />
              {t.tr("Eğitmen Keşfi")}
            </h2>
            <span className="pill text-xs">Marketplace</span>
          </div>
          <div className="space-y-2">
            {marketplace.map((m) => (
              <div key={t.tr(m.name)} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.tr(m.name)}</div>
                  <div className="text-xs text-slate-500">{m.lang} · ⭐ {m.rating}</div>
                </div>
                <div className="text-xs text-slate-600">{m.price}</div>
              </div>
            ))}
          </div>
          <button className="btn-link w-full justify-center text-sm">{t.tr("Eğitmenleri incele")}</button>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-400 to-orange-400 inline-block" />
              {t.tr("Bugünkü program")}
            </h2>
            <span className="pill text-xs">{t.tr("Canlı dersler")}</span>
          </div>
          <div className="space-y-2">
            {scheduleLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-4 w-1/2 bg-slate-200 rounded" />
                      <div className="h-3 w-1/3 bg-slate-100 rounded" />
                    </div>
                    <div className="h-7 w-14 bg-slate-100 rounded-xl" />
                  </div>
                ))
              : !upcoming || upcoming.length === 0
              ? (
                  <div className="text-sm text-slate-500 py-4 text-center">{t.tr("Yaklaşan ders yok.")}</div>
                )
              : upcoming.map((u) => (
                  <div key={u.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{t.tr(u.title)}</div>
                      <div className="text-xs text-slate-500">{u.time}</div>
                    </div>
                    <Link href="/live" className="btn-link text-sm">{t.tr("Katıl")}</Link>
                  </div>
                ))}
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400 inline-block" />
              {t.tr("Materyaller")}
            </h2>
            <Link href="/courses" className="btn-link text-xs">{t.tr("Tümü")}</Link>
          </div>
          <div className="space-y-2">
            {materialsRemote.length === 0 ? (
              <div className="text-xs text-slate-500">{t.tr("Henüz materyal yok.")}</div>
            ) : (
              materialsRemote.map((m) => (
                <div key={t.tr(m.name)} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.tr(m.name)}</div>
                    <div className="text-xs text-slate-500">{m.type} · {formatSize(m.size)}</div>
                  </div>
                  <a className="btn-link text-xs" href={m.url}>{t.tr("Aç")}</a>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
            {t.tr("Ders Değerlendirme")}
          </h2>
          <span className="pill text-xs">{t.tr("Otomatik açılır")}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-600">
          {t.tr("Ders bitiminde yıldızlı anket açılır. Eğitmen geri bildirimi ve içerik kalitesi burada toplanır.")}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400 inline-block" />
              {t.tr("Ödevlerim")}
            </h2>
            <span className="pill text-xs">{t.tr("Teslim takibi")}</span>
          </div>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={t.tr(a.name)} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.tr(a.name)}</div>
                  <div className="text-xs text-slate-500">{t.tr("Teslim")}: {a.due}</div>
                </div>
                <span className={`pill text-xs ${a.status === "Bekliyor" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                  {t.tr(a.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
              {t.tr("Ödev Yükle")}
            </h2>
            <label className="btn-link text-xs cursor-pointer">
              {t.tr("⬆️ Dosya seç")}
              <input type="file" multiple className="hidden" onChange={onUpload} />
            </label>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3 text-xs text-slate-500">
            {t.tr("Dosyanı yükle, öğretmene teslim edilir. Birden fazla dosya gönderebilirsin.")}
          </div>
          {note ? <div className="text-xs text-emerald-600">{note}</div> : null}
          {loading ? <div className="text-xs text-slate-500">{t.tr("Yükleniyor...")}</div> : null}
          <div className="divide-y divide-slate-100 text-sm">
            {uploads.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">{t.tr("Henüz yükleme yok.")}</div>
            ) : (
              uploads.map((u) => (
                <div key={t.tr(u.name)} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{t.tr(u.name)}</div>
                    <div className="text-xs text-slate-500">{u.type} · {formatSize(u.size)}</div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <a className="btn-link" href={u.url}>{t.tr("İndir")}</a>
                    <button className="btn-link text-rose-700 border-rose-200" onClick={() => removeUpload(u.name)}>{t.tr("Sil")}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Weekly Goals */}
      <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
            {t.tr("Haftalık Hedefler")}
          </h2>
          <span className="pill text-xs">{t.tr("Bu hafta")}</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{t.tr("5 ders izle")}</span>
              <span className="text-slate-500">3 / 5</span>
            </div>
            <div className="progress-track h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="progress-fill h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: "60%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{t.tr("2 quiz tamamla")}</span>
              <span className="text-slate-500">1 / 2</span>
            </div>
            <div className="progress-track h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="progress-fill h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: "50%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{t.tr("3 gün üst üste çalış")}</span>
              <span className="text-slate-500">🔥 2 / 3</span>
            </div>
            <div className="progress-track h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="progress-fill h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: "67%" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard — Premium Version */}
      <section className="glass p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="pill w-fit">Leaderboard</div>
            <h2 className="text-2xl font-semibold">{t.leaderboard.title}</h2>
            <p className="text-sm text-slate-600">{t.leaderboard.subtitle}</p>
          </div>
          <div className="pill bg-emerald-50 border-emerald-200 text-emerald-700">{t.tr("Haftalık yenilenir")}</div>
        </div>

        {leaderboardLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 border border-slate-200 animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                  <div className="h-3 w-1/4 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (() => {
          const demoData: LeaderboardEntry[] = [
            { rank: 1, userId: "u1", name: "Ayşe Kaya", score: 4320, badge: "🥇 Şampiyon", frame: "gold" },
            { rank: 2, userId: "u2", name: "Mehmet Demir", score: 3870, badge: "🥈 Uzman", frame: "silver" },
            { rank: 3, userId: "u3", name: "Sen", score: 3410, badge: "🥉 Yetenekli", frame: "bronze" },
            { rank: 4, userId: "u4", name: "Fatma Yılmaz", score: 2990, badge: "⭐ Azimli", frame: "" },
            { rank: 5, userId: "u5", name: "Ali Çelik", score: 2640, badge: "📚 Çalışkan", frame: "" },
          ];
          const entries = leaderboardData && leaderboardData.length > 0 ? leaderboardData : demoData;
          const top3 = entries.slice(0, 3);
          const rest = entries.slice(3);
          const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
          const podiumHeights: Record<number, number> = { 1: 100, 2: 80, 3: 60 };
          const podiumGradients: Record<number, string> = {
            1: "from-amber-400 to-yellow-300",
            2: "from-slate-400 to-slate-300",
            3: "from-orange-400 to-amber-300",
          };
          return (
            <div className="space-y-4">
              {/* Podium */}
              <div className="flex items-end justify-center gap-4 py-4">
                {podiumOrder.map((s) => {
                  if (!s) return null;
                  const h = podiumHeights[s.rank] ?? 60;
                  const grad = podiumGradients[s.rank] ?? "from-slate-300 to-slate-200";
                  return (
                    <div key={s.userId} className="flex flex-col items-center gap-2">
                      <div className="text-xs text-slate-500 font-medium">{s.score} XP</div>
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <div className="text-xs font-semibold text-center max-w-[64px] truncate">{t.tr(s.name)}</div>
                      <div className={`w-16 bg-gradient-to-t ${grad} rounded-t-xl flex items-start justify-center pt-1 text-white font-bold text-sm`} style={{ height: `${h}px` }}>
                        #{s.rank}
                      </div>
                      <div className="pill text-xs max-w-[80px] truncate text-center">{s.badge}</div>
                    </div>
                  );
                })}
              </div>

              {/* My XP Card */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                      S
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t.tr("Senim")} (#{myRank})</div>
                      <div className="text-xs text-slate-500">{t.tr("Seviye")} {myLevel}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pill bg-orange-50 border-orange-200 text-orange-700 text-xs">🔥 {myStreak} {t.tr("gün")}</span>
                    <span className="pill bg-blue-50 border-blue-200 text-blue-700 text-xs">{myXP} XP</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t.tr("Sonraki seviyeye ilerleme")}</span>
                    <span>{myXP % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</span>
                  </div>
                  <div className="progress-track h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="progress-fill h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rest of rankings (rank 4+) */}
              {rest.length > 0 && (
                <div className="space-y-2">
                  {rest.map((s) => (
                    <div key={s.userId} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        #{s.rank}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-300 flex items-center justify-center text-white font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1 font-medium text-sm">{t.tr(s.name)}</div>
                      <div className="text-sm font-semibold text-slate-600">{s.score}</div>
                      <div className="pill text-xs">{s.badge}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </section>

      {/* Badge Collection */}
      <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-400 inline-block" />
            {t.progress.badges}
          </h2>
          <span className="pill text-xs">{badges.filter(b => b.earned).length}/{badges.length} {t.tr("kazanıldı")}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={t.tr(b.title)}
              className={`rounded-2xl border p-4 shadow-sm flex flex-col items-center gap-2 text-center relative ${
                b.earned
                  ? "bg-white/90 border-slate-200"
                  : "bg-slate-50/80 border-slate-100 grayscale opacity-60"
              }`}
            >
              <span className="text-3xl">{b.icon}</span>
              <div className="font-semibold text-sm">{t.tr(b.title)}</div>
              <p className="text-xs text-slate-500">{t.tr(b.desc)}</p>
              <span className="pill text-xs bg-amber-50 border-amber-200 text-amber-700">+{b.xpReward} XP</span>
              {b.earned ? (
                <span className="absolute top-2 right-2 text-emerald-500 text-xs font-bold">✓</span>
              ) : (
                <span className="absolute top-2 right-2 text-slate-400 text-xs">🔒</span>
              )}
            </div>
          ))}
        </div>
      </section>
      </div>
    </PanelShell>
  );
}

function frameClass(frame: string) {
  if (frame === "gold") return "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]";
  if (frame === "silver") return "border-slate-300 shadow-[0_0_0_3px_rgba(148,163,184,0.35)]";
  if (frame === "bronze") return "border-orange-300 shadow-[0_0_0_3px_rgba(248,180,107,0.35)]";
  return "border-slate-200";
}

function formatSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
