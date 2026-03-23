"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "../api/client";
import { PanelShell } from "../_components/panel-shell";

const navSections = [
  {
    title: "Veli",
    items: [
      { label: "Özet", href: "/guardian", icon: "🏠" },
      { label: "Ödevler", href: "/leaderboard", icon: "📝" },
      { label: "Takvim", href: "/booking", icon: "🗓️" },
      { label: "Raporlar", href: "/report-cards", icon: "📈" },
    ],
  },
  {
    title: "İletişim",
    items: [
      { label: "Eğitmenler", href: "/instructor", icon: "👩‍🏫" },
      { label: "Destek", href: "/portal", icon: "💬" },
    ],
  },
];

type Student = {
  id: string;
  name: string;
  initials: string;
  course: string;
  progress: number;
  attendance: number;
  lastLogin: string;
  risk: "Düşük" | "Orta" | "Yüksek";
  subjects: { label: string; score: number }[];
};

const demoStudents: Student[] = [
  {
    id: "demo1",
    name: "Ece Kaplan",
    initials: "EK",
    course: "Python 101",
    progress: 78,
    attendance: 91,
    lastLogin: "Bugün 14:22",
    risk: "Düşük",
    subjects: [
      { label: "Algoritma", score: 85 },
      { label: "Veri Yapıları", score: 72 },
      { label: "Proje", score: 90 },
    ],
  },
  {
    id: "demo2",
    name: "Arda Demir",
    initials: "AD",
    course: "SAT Verbal",
    progress: 52,
    attendance: 67,
    lastLogin: "Dün 19:05",
    risk: "Orta",
    subjects: [
      { label: "Okuma", score: 58 },
      { label: "Kelime", score: 47 },
      { label: "Yazma", score: 61 },
    ],
  },
];

type Alert = { title: string; detail: string; severity: "critical" | "warning" | "info" };

const alerts: Alert[] = [
  { title: "Katılım uyarısı", detail: "Arda son 2 canlıya katılmadı.", severity: "critical" },
  { title: "Haftalık hedef", detail: "Ece haftalık hedefini %110 tamamladı.", severity: "info" },
  { title: "Ödev hatırlatma", detail: "Perşembe 20:00'ye kadar teslim.", severity: "warning" },
];

type Message = { from: string; text: string; time: string };

const inboxSeed: Message[] = [
  { from: "Baş Eğitmen", text: "Yeni hedefler sisteme eklendi.", time: "Dün 18:10" },
  { from: "Eğitmen Elif", text: "Ödev geri bildirimi hazır.", time: "Bugün 09:40" },
];

const weekDays = ["Pzt", "Sal", "Çrş", "Per", "Cum", "Cmt", "Paz"];
const weekSchedule: Record<string, number[]> = {
  demo1: [0, 2, 4],
  demo2: [1, 3],
};

type ScheduleEntry = {
  id: string;
  startsAt: string;
  Course?: { title: string } | null;
};

function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-slate-200 dark:text-slate-700" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RiskBadge({ risk }: { risk: Student["risk"] }) {
  const map: Record<Student["risk"], string> = {
    Düşük: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
    Orta: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
    Yüksek: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300",
  };
  return <span className={`pill text-xs font-medium ${map[risk]}`}>{risk} risk</span>;
}

function SparkBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex-1 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-7 text-right font-medium">{score}</span>
    </div>
  );
}

function StudentCard({ s }: { s: Student }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative cursor-pointer"
      style={{ perspective: "900px", minHeight: 220 }}
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className="w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: 220,
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-4 flex flex-col gap-3 backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="avatar w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {s.initials}
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{s.course}</div>
              </div>
            </div>
            <RiskBadge risk={s.risk} />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <ProgressRing value={s.progress} size={56} />
              <span className="absolute text-xs font-bold text-slate-800 dark:text-slate-200 rotate-0" style={{ transform: "rotate(90deg) translateX(-50%)", position: "absolute", top: "50%", left: "50%", translate: "-50% -50%" }}>
                {s.progress}%
              </span>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Devam</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{s.attendance}%</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Son giriş</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{s.lastLogin}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-xs mt-auto pt-1 border-t border-slate-100 dark:border-slate-700">
            <button className="btn-link flex-1" onClick={(e) => e.stopPropagation()}>Karne</button>
            <button className="btn-link flex-1" onClick={(e) => e.stopPropagation()}>Ödevler</button>
            <button className="btn-link flex-1" onClick={(e) => e.stopPropagation()}>Mesaj</button>
          </div>
          <div className="text-center text-[10px] text-slate-400">Ders dağılımı için çevir</div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-4 flex flex-col gap-3"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Ders Analizi</div>
            <span className="tag text-xs">{s.name}</span>
          </div>
          <div className="space-y-2 flex-1">
            {s.subjects.map((sub) => (
              <div key={sub.label}>
                <div className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">{sub.label}</div>
                <SparkBar score={sub.score} />
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-slate-400 mt-auto">Geri dönmek için tıkla</div>
        </div>
      </div>
    </div>
  );
}

export default function GuardianPage() {
  const [weeklyLimit, setWeeklyLimit] = useState(6);
  const [inbox, setInbox] = useState<Message[]>(inboxSeed);
  const [message, setMessage] = useState("");
  const [contentFilter, setContentFilter] = useState(true);
  const [lateNotifs, setLateNotifs] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const { data: schedule, isLoading: scheduleLoading } = useSWR<ScheduleEntry[]>(
    "/me/schedule",
    api,
    { revalidateOnFocus: false }
  );

  const upcoming = schedule
    ? schedule.slice(0, 4).map((s) => ({
        id: s.id,
        time:
          new Date(s.startsAt).toLocaleDateString("tr-TR", { weekday: "short" }) +
          " " +
          new Date(s.startsAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        title: s.Course?.title ?? "Ders",
        teacher: "—",
      }))
    : null;

  const avgAttendance = Math.round(
    demoStudents.reduce((acc, s) => acc + s.attendance, 0) / demoStudents.length
  );
  const avgScore = Math.round(
    demoStudents.reduce((acc, s) => acc + s.progress, 0) / demoStudents.length
  );
  const thisWeekSessions = Object.values(weekSchedule).flat().length;

  const alertColorMap: Record<Alert["severity"], string> = {
    critical: "border-l-4 border-rose-500 bg-rose-50/60 dark:bg-rose-900/20",
    warning: "border-l-4 border-amber-400 bg-amber-50/60 dark:bg-amber-900/20",
    info: "border-l-4 border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20",
  };
  const alertBadgeMap: Record<Alert["severity"], string> = {
    critical: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300",
    warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300",
    info: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300",
  };
  const alertLabelMap: Record<Alert["severity"], string> = {
    critical: "Kritik",
    warning: "Uyarı",
    info: "Bilgi",
  };

  const inboxInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <PanelShell
      roleLabel="Veli Paneli"
      userName="Aile Merkezi"
      userSub="İlerleme ve iletişim"
      navSections={navSections}
    >
      <div className="space-y-6">
        {/* Hero */}
        <header className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hero">
          <div className="space-y-2">
            <div className="pill w-fit">Veli Paneli</div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
              Çocuğunun eğitim yolculuğu burada
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Katılım, ilerleme ve destek ihtiyaçlarını tek ekranda gör. Şeffaf rapor, güvenli
              iletişim, net plan.
            </p>
          </div>
        </header>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              { label: "Toplam Ders", value: "24", sub: "bu ay", icon: "📚", gradient: "bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200 dark:from-violet-900/20 dark:to-violet-800/10 dark:border-violet-700" },
              { label: "Devam %", value: `${avgAttendance}%`, sub: "ortalama", icon: "✅", gradient: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/10 dark:border-emerald-700" },
              { label: "Ortalama Puan", value: `${avgScore}`, sub: "/ 100", icon: "⭐", gradient: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 dark:from-amber-900/20 dark:to-amber-800/10 dark:border-amber-700" },
              { label: "Bu Hafta", value: `${thisWeekSessions}`, sub: "oturum planlandı", icon: "🗓️", gradient: "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 dark:from-rose-900/20 dark:to-rose-800/10 dark:border-rose-700" },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border p-4 flex flex-col gap-1 ${stat.gradient}`}
            >
              <div className="text-xl">{stat.icon}</div>
              <div className="metric text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</div>
              <div className="text-[10px] text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Student Cards + Weekly Schedule */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Öğrenci Kartları
              </h2>
              <span className="pill text-xs">Çevir →</span>
            </div>
            <div className="grid gap-4">
              {demoStudents.map((s) => (
                <StudentCard key={s.id} s={s} />
              ))}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Haftalık Takvim
              </h2>
              <span className="pill text-xs">Bu hafta</span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 pb-1">
                  {d}
                </div>
              ))}
              {weekDays.map((_, dayIdx) => {
                const ece = weekSchedule.demo1.includes(dayIdx);
                const arda = weekSchedule.demo2.includes(dayIdx);
                return (
                  <div
                    key={dayIdx}
                    className={`rounded-lg min-h-[52px] p-1 border text-[10px] space-y-0.5 ${
                      ece || arda
                        ? "border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20"
                    }`}
                  >
                    {ece && (
                      <div className="rounded px-1 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 leading-tight">
                        Ece
                      </div>
                    )}
                    {arda && (
                      <div className="rounded px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 leading-tight">
                        Arda
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-violet-400 inline-block" /> Ece
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Arda
              </span>
            </div>

            {/* Upcoming from API */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Yaklaşan Dersler</div>
              <div className="space-y-1.5">
                {scheduleLoading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/60 p-2 animate-pulse flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-2 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
                        </div>
                        <div className="h-6 w-14 bg-slate-100 dark:bg-slate-700 rounded-xl" />
                      </div>
                    ))
                  : !upcoming || upcoming.length === 0
                  ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 py-2 text-center">
                        Yaklaşan ders bulunamadı.
                      </div>
                    )
                  : upcoming.map((u) => (
                      <div
                        key={u.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-3 py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{u.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{u.time}</div>
                        </div>
                        <button className="btn-link text-xs">Hatırlat</button>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <section className="glass p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
              Uyarılar & Bildirimler
            </h2>
            <span className="pill text-xs">Gerçek zamanlı</span>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.title}
                className={`rounded-xl p-3 flex items-start justify-between gap-3 hover:brightness-95 transition-colors ${alertColorMap[a.severity]}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {a.severity === "critical" && (
                      <span className="relative flex h-2 w-2 flex-shrink-0 mt-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                    )}
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{a.title}</div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{a.detail}</div>
                </div>
                <span className={`pill text-xs flex-shrink-0 ${alertBadgeMap[a.severity]}`}>
                  {alertLabelMap[a.severity]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Billing + Safety */}
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Billing */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Finans & Abonelik
              </h2>
              <span className="pill text-xs">Güvenli ödeme</span>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 p-4 text-white space-y-1">
              <div className="text-xs font-semibold opacity-80 uppercase tracking-wider">Aktif Plan</div>
              <div className="text-xl font-bold">Kurumsal Plus</div>
              <div className="text-xs opacity-80">•••• 4242 · Otomatik yenileme açık</div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span>Aylık kullanım</span>
                <span className="font-semibold">24 / 30 oturum</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  style={{ width: "80%" }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 p-3 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Sonraki ödeme</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">₺1.280 · 12 Nisan 2026</div>
              </div>
              <div className="tag text-xs">27 gün kaldı</div>
            </div>
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1">Ödeme Yap</button>
              <button className="btn-link flex-1">Faturalar</button>
              <button className="btn-link flex-1">Paket Değiştir</button>
            </div>
          </div>

          {/* Safety Controls */}
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
                Güvenlik & Limitler
              </h2>
              <span className="pill text-xs">Kontrollü</span>
            </div>

            <div>
              <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300 mb-2">
                <span>Haftalık maks. ders</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">{weeklyLimit}</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1</span><span>12</span>
              </div>
            </div>

            <div className="space-y-2">
              {(
                [
                  { label: "İçerik Filtresi", sub: "Uygunsuz içerikleri engelle", val: contentFilter, fn: setContentFilter },
                  { label: "Gece Bildirimleri", sub: "22:00 sonrası bildirim gönder", val: lateNotifs, fn: setLateNotifs },
                  { label: "Haftalık Rapor", sub: "Her Pazartesi e-posta özeti", val: weeklyReport, fn: setWeeklyReport },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-3 py-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.sub}</div>
                  </div>
                  <button
                    onClick={() => item.fn(!item.val)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                      item.val ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                    role="switch"
                    aria-checked={item.val}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        item.val ? "translate-x-4.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inbox */}
        <section className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
              Gelen Kutusu
            </h2>
            <span className="pill text-xs">Resmî iletişim</span>
          </div>
          <div className="space-y-2">
            {inbox.map((msg, i) => {
              const isSelf = msg.from === "Siz";
              return (
                <div
                  key={`${msg.from}-${i}`}
                  className={`flex gap-3 ${isSelf ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`avatar w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isSelf
                        ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {inboxInitials(msg.from)}
                  </div>
                  <div className={`flex-1 ${isSelf ? "items-end" : "items-start"} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{msg.from}</span>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    <div
                      className={`rounded-xl px-3 py-2 text-sm max-w-xs ${
                        isSelf
                          ? "bg-violet-600 text-white"
                          : "bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
            <input
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="Eğitmene mesaj yaz..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!message.trim()) return;
                  setInbox((prev) => [
                    { from: "Siz", text: message.trim(), time: "Şimdi" },
                    ...prev,
                  ]);
                  setMessage("");
                }
              }}
            />
            <button
              className="btn-link px-4"
              onClick={() => {
                if (!message.trim()) return;
                setInbox((prev) => [
                  { from: "Siz", text: message.trim(), time: "Şimdi" },
                  ...prev,
                ]);
                setMessage("");
              }}
            >
              Gönder
            </button>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
