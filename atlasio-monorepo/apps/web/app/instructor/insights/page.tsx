"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "../../api/client";
import { PanelShell } from "../../_components/panel-shell";

const navSections = [
  {
    title: "Baş Eğitmen",
    items: [
      { label: "Özet", href: "/instructor/insights", icon: "🏠" },
      { label: "Eğitmenler", href: "/instructor/insights", icon: "👥" },
      { label: "İçerik Onayı", href: "/instructor/insights", icon: "✅" },
      { label: "Kazanım", href: "/instructor/insights", icon: "🎯" },
    ],
  },
  {
    title: "Araçlar",
    items: [
      { label: "Akıllı Tahta", href: "/whiteboard", icon: "🧠" },
      { label: "Raporlar", href: "/report-cards", icon: "📊" },
      { label: "Kurslar", href: "/courses", icon: "📚" },
    ],
  },
];

// Static fallbacks — no API endpoint available yet
const weakTopics = [
  { topic: "Temel Matematik", accuracy: 58, action: "10 dk tekrar + mini quiz" },
  { topic: "Okuma Anlama", accuracy: 64, action: "VOD + 5 soru" },
  { topic: "Problem Çözme", accuracy: 71, action: "Sınıf içi hız turu" },
];

const schedulerSlots = [
  { day: "Pazartesi", time: "10:00 - 12:00", status: "Eğitmen uygun" },
  { day: "Çarşamba", time: "14:00 - 16:00", status: "Talep yüksek" },
  { day: "Cuma", time: "18:00 - 20:00", status: "Boş slot" },
];

const examTemplates = [
  { name: "Seviye Tespit", type: "Çoktan Seçmeli" },
  { name: "Dinleme", type: "Sesli Yanıt" },
  { name: "Haftalık Quiz", type: "Karma" },
];

type UserRecord = { id: string; name?: string | null; email: string; role: string };
type VolunteerContent = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  User?: { name?: string | null; email: string } | null;
};
type CourseRecord = { id: string; title: string; level?: string | null; isPublished?: boolean };
type LiveSession = { id: string; title: string; status: string };

function StatSkeleton() {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
      <div className="h-3 w-2/3 bg-slate-200 rounded mb-2" />
      <div className="h-7 w-1/2 bg-slate-100 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-3 animate-pulse flex items-center justify-between gap-4">
      <div className="space-y-1 flex-1">
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="h-3 w-1/3 bg-slate-100 rounded" />
      </div>
      <div className="h-6 w-16 bg-slate-100 rounded-full" />
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
      {title}
    </h2>
  );
}

export default function HeadInstructorPage() {
  const { data: users, isLoading: usersLoading } = useSWR<UserRecord[]>("/users", api, {
    revalidateOnFocus: false,
  });
  const { data: volunteerContents, isLoading: vcLoading } = useSWR<VolunteerContent[]>(
    "/volunteer-contents/admin",
    api,
    { revalidateOnFocus: false }
  );
  const { data: courses, isLoading: coursesLoading } = useSWR<CourseRecord[]>("/courses", api, {
    revalidateOnFocus: false,
  });
  const { data: liveSessions, isLoading: liveLoading } = useSWR<LiveSession[]>(
    "/live/sessions",
    api,
    { revalidateOnFocus: false }
  );

  const instructors = (users ?? []).filter((u) => u.role === "INSTRUCTOR");
  const pendingReviews = (volunteerContents ?? []).filter((v) => v.status === "PENDING");
  const activeSessionCount = (liveSessions ?? []).filter((s) => s.status === "RUNNING").length;

  const coachStats = [
    { name: "Eğitmen sayısı", value: usersLoading ? null : String(instructors.length) },
    { name: "Aktif sınıf", value: liveLoading ? null : String(activeSessionCount) },
    { name: "Toplam kurs", value: coursesLoading ? null : String((courses ?? []).length) },
    { name: "Onay bekleyen", value: vcLoading ? null : String(pendingReviews.length) },
  ];

  const instructorRoster = instructors.slice(0, 5).map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    field: "—",
    score: "—",
    load: "—",
    status: "Uygun",
  }));

  const reviewQueue = pendingReviews.slice(0, 5).map((v) => ({
    id: v.id,
    title: v.title,
    owner: v.User?.name ?? v.User?.email ?? "Eğitmen",
    type: v.contentType,
  }));

  const programs = (courses ?? []).slice(0, 5).map((c) => ({
    id: c.id,
    title: c.title,
    level: c.level ?? "Genel",
    assets: c.isPublished ? "Yayında" : "Taslak",
  }));

  const statsLoading = usersLoading || liveLoading || coursesLoading || vcLoading;

  return (
    <PanelShell
      roleLabel="Baş Eğitmen Paneli"
      userName="Akademik Yönetim"
      userSub="Kalite ve içerik kontrol"
      navSections={navSections}
    >
      <div className="space-y-6">
        <header className="glass p-6 rounded-2xl border border-slate-200 hero">
          <div className="hero-content space-y-2">
            <div className="pill w-fit">Baş Eğitmen</div>
            <h1 className="text-3xl font-semibold">Sınıfları yönet, kaliteyi yükselt</h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              Eğitmen dağılımı, içerik onayı ve kazanım takibi tek panelde. Zayıf konuları hızlıca toparla.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link href="/whiteboard" className="btn-link text-sm">Canlı sınıf aç</Link>
              <Link href="/report-cards" className="btn-link text-sm">Karne akışı</Link>
              <Link href="/courses" className="btn-link text-sm">Kurs kataloğu</Link>
            </div>
          </div>
        </header>

        {/* Stat cards — gradient accents */}
        <section className="grid gap-4 md:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : coachStats.map((s, i) => {
                const gradients = [
                  { bg: "from-blue-50 to-blue-100/50 border-blue-200", num: "text-blue-700", icon: "👥" },
                  { bg: "from-emerald-50 to-emerald-100/50 border-emerald-200", num: "text-emerald-700", icon: "📡" },
                  { bg: "from-violet-50 to-violet-100/50 border-violet-200", num: "text-violet-700", icon: "📚" },
                  { bg: "from-amber-50 to-amber-100/50 border-amber-200", num: "text-amber-700", icon: "✅" },
                ] as const;
                const g = gradients[i] ?? { bg: "glass border-slate-200", num: "text-slate-700", icon: "📊" };
                return (
                  <div key={s.name} className={`rounded-2xl border p-4 shadow-sm bg-gradient-to-br ${g.bg}`}>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>{g.icon}</span>
                      <span>{s.name}</span>
                    </div>
                    <div className={`text-3xl font-bold mt-2 ${g.num}`}>{s.value ?? "—"}</div>
                  </div>
                );
              })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Instructor roster */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Eğitmen kadrosu" />
              <span className="pill text-xs">
                {usersLoading ? "Yükleniyor..." : `${instructors.length} eğitmen`}
              </span>
            </div>
            <div className="space-y-2">
              {usersLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : instructorRoster.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-4 text-center">Kayıtlı eğitmen bulunamadı.</div>
                  )
                : instructorRoster.map((i) => (
                    <div
                      key={i.id}
                      className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {i.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{i.name}</div>
                          <div className="text-xs text-slate-500">{i.field} · {i.load}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {i.score !== "—" && <span className="pill">⭐ {i.score}</span>}
                        <span
                          className={`pill ${
                            i.status === "Yoğun"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          }`}
                        >
                          {i.status}
                        </span>
                        <button className="btn-link">Sınıf ata</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Content review */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="İçerik onayı" />
              <span className="pill text-xs">
                {vcLoading ? "Yükleniyor..." : `${reviewQueue.length} görev`}
              </span>
            </div>
            <div className="space-y-2">
              {vcLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : reviewQueue.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-4 text-center">Bekleyen onay yok.</div>
                  )
                : reviewQueue.map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 hover:border-amber-200 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm leading-tight">{q.title}</div>
                        <span className="pill pill-xs bg-amber-50 border-amber-200 text-amber-700 flex-shrink-0">{q.type}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{q.owner}</div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <button className="btn-link bg-emerald-50 border-emerald-300 text-emerald-700">✓ Onayla</button>
                        <button className="btn-link text-rose-700 border-rose-200">↩ Geri gönder</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Curriculum management */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Müfredat & Branş Yönetimi" />
              <span className="pill text-xs">Drag & Drop</span>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500">
              PDF, ses ve video dosyalarını sürükleyip bırak. Seviye ve dil etiketi otomatik atanır.
            </div>
            <div className="space-y-2">
              {coursesLoading
                ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
                : programs.length === 0
                ? (
                    <div className="text-sm text-slate-500 py-2 text-center">Kurs bulunamadı.</div>
                  )
                : programs.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-xs text-slate-500">{p.level} · {p.assets}</div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Link href={`/courses/${p.id}`} className="btn-link">Düzenle</Link>
                        <button className="btn-link">İçerik ekle</button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Smart scheduler */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Akıllı Ders Programı" />
              <span className="pill text-xs">Scheduler</span>
            </div>
            <div className="space-y-2">
              {schedulerSlots.map((s) => (
                <div
                  key={`${s.day}-${s.time}`}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{s.day}</div>
                    <div className="text-xs text-slate-500">{s.time}</div>
                  </div>
                  <span
                    className={`pill text-xs ${
                      s.status === "Talep yüksek"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1">Otomatik atama</button>
              <button className="btn-link flex-1">Takvim aç</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Exam management */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Sınav Yönetimi" />
              <span className="pill text-xs">Exam Builder</span>
            </div>
            <div className="space-y-2">
              {examTemplates.map((e) => (
                <div
                  key={e.name}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.type}</div>
                  </div>
                  <button className="btn-link text-xs">Şablonu aç</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1">Yeni sınav</button>
              <button className="btn-link flex-1">Analiz raporu</button>
            </div>
          </div>

          {/* Academic reporting */}
          <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeading title="Akademik Raporlama" />
              <span className="pill text-xs">Haftalık</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Seviye ilerleme</span>
                <span className="pill text-[11px]">+8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ödev tamamlama</span>
                <span className="pill text-[11px]">72%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kalite anketi</span>
                <span className="pill text-[11px]">4.7/5</span>
              </div>
              <button className="btn-link w-full justify-center text-xs">PDF rapor indir</button>
            </div>
          </div>
        </section>

        {/* Learning outcome insights */}
        <section className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading title="Kazanım içgörüleri" />
            <span className="pill text-xs">Son 7 gün</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {weakTopics.map((t) => (
              <div key={t.topic} className="glass rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{t.topic}</div>
                  <span
                    className={`text-xs font-bold ${
                      t.accuracy < 65
                        ? "text-rose-600"
                        : t.accuracy < 75
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {t.accuracy}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      t.accuracy < 65
                        ? "bg-rose-400"
                        : t.accuracy < 75
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${t.accuracy}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500">💡 {t.action}</div>
                <div className="flex gap-2 mt-1 text-xs">
                  <button className="btn-link">Görev ata</button>
                  <button className="btn-link">Quiz gönder</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
