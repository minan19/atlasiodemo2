"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import useSWR from "swr";
import { PanelShell } from "../_components/panel-shell";
import { api } from "../api/client";

const folders = [
  { name: "Hafta 1 - Giriş", count: 5 },
  { name: "Hafta 2 - Muhasebe Belgeleri", count: 7 },
  { name: "Quiz / Sınavlar", count: 3 },
  { name: "VOD Kayıtları", count: 6 },
];

const archive = [
  { title: "Muhasebe Bilgi Sistemi", date: "Hafta 2", pages: 8 },
  { title: "SAT Verbal - Quiz", date: "Hafta 3", pages: 5 },
  { title: "Business German", date: "Hafta 1", pages: 10 },
];

type LiveSession = {
  id: string;
  title: string;
  scheduledAt?: string | null;
  status: string;
};

type EarningsSummary = {
  payoutAmount?: string | number;
  courseRevenue?: string | number;
  periodEnd?: string;
};

type InstructorUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
};

type UploadItem = { name: string; size: number; type: string; url: string };

type VolunteerContentItem = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  suggestedAmount?: string | null;
};

const navSections = [
  {
    title: "Eğitmen",
    items: [
      { label: "Panel", href: "/instructor", icon: "🏠" },
      { label: "Canlı Oturumlar", href: "/live", icon: "📡" },
      { label: "Akıllı Tahta", href: "/whiteboard", icon: "🧠" },
      { label: "Kurslar", href: "/courses", icon: "📚" },
    ],
  },
  {
    title: "İçerik",
    items: [
      { label: "Ders İçerikleri", href: "/instructor", icon: "🗂️" },
      { label: "Kayıtlar", href: "/report-cards", icon: "🎥" },
      { label: "Analiz", href: "/instructor/insights", icon: "📊" },
    ],
  },
];

export default function InstructorHubPage() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [activeFolder, setActiveFolder] = useState(folders[0]?.name ?? "Hafta 1 - Giriş");
  const [uploadNote, setUploadNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");

  // Gerçek API — canlı oturumlar
  const { data: liveSessions } = useSWR<LiveSession[]>("/live/sessions", api, { revalidateOnFocus: false });
  // Gerçek API — kazanç özeti (kendi instructor ID'si ile)
  const { data: meData } = useSWR<InstructorUser>("/auth/profile", api, { revalidateOnFocus: false });
  const { data: earningsSummary } = useSWR<EarningsSummary>(
    meData?.id ? `/instructor-payments/admin/${meData.id}/summary` : null,
    api,
    { revalidateOnFocus: false }
  );
  const { data: volunteerItems } = useSWR<VolunteerContentItem[]>(
    "/volunteer-contents/me",
    api,
    { revalidateOnFocus: false }
  );

  const approvalQueue = (volunteerItems ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    detail: v.contentType,
    amount: v.suggestedAmount ?? "0 ₺",
    status: v.status === "PENDING" ? "Onay bekliyor" : v.status === "APPROVED" ? "Onaylandı" : "Reddedildi",
  }));

  const todaySessions = (liveSessions ?? [])
    .filter((s) => s.status === "RUNNING" || s.status === "SCHEDULED")
    .slice(0, 5)
    .map((s) => ({
      time: s.scheduledAt ? new Date(s.scheduledAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—",
      title: s.title,
      room: `/live/${s.id}`,
    }));

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const res = await fetch("/api/uploads?category=materials");
      const data = (await res.json()) as UploadItem[];
      setFiles(data);
    } catch (err) {
      console.error("Load files failed", err);
    } finally {
      setLoading(false);
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
        await fetch("/api/uploads?category=materials", { method: "POST", body: form });
      }
      await loadFiles();
      setUploadNote(`${list.length} dosya yüklendi.`);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function removeFile(name: string) {
    try {
      await fetch(`/api/uploads?category=materials&name=${encodeURIComponent(name)}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.name !== name));
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  const sendApprovalRequest = (kind: "Gönüllü Ek Süre" | "Bonus Ödül") => {
    if (!approvalNote.trim()) {
      setApprovalMessage("Lütfen kısa bir açıklama ekleyin.");
      return;
    }
    setApprovalMessage(`Talebiniz iletildi: ${kind}. Yönetici onayı sonrası kesinleşir.`);
    setApprovalNote("");
  };

  return (
    <PanelShell
      roleLabel="Eğitmen Paneli"
      userName="Eğitmen Merkezi"
      userSub="Ders içerikleri ve canlı yönetim"
      navSections={navSections}
    >
      <div className="space-y-6">
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-3">
          <div className="pill w-fit">Eğitmen Paneli</div>
          <h1 className="text-3xl font-semibold leading-tight">Dersini yönet, içeriğini büyüt</h1>
          <p className="text-slate-600 text-sm max-w-2xl">
            Canlı ders, akıllı tahta ve içerik yönetimi tek ekranda. Öğrenci iletişimi, kayıt ve raporlama burada.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl text-sm">
            <Metric label="Bugünkü ders" value="3" icon="📡" />
            <Metric label="Güncel memnuniyet" value="4.8/5" icon="⭐" />
            <Metric label="İçerik kuyruğu" value="7" icon="📝" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link className="btn-link text-sm" href="/whiteboard">Akıllı Tahtayı Aç</Link>
            <Link className="btn-link text-sm" href="/live/abc">Canlı Oda</Link>
            <Link className="btn-link text-sm" href="/report-cards">Kayıt & VOD</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <SectionHeading title="Bugün" badge="Canlı program" />
          <div className="space-y-2">
            {todaySessions.map((s) => (
              <div key={s.time} className="rounded-xl border border-slate-200 bg-white/80 p-3 flex items-center justify-between hover:border-emerald-300 transition-colors group">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">{s.title}</div>
                    <div className="text-xs text-slate-500">{s.time} · 45 dk</div>
                  </div>
                </div>
                <Link className="btn-link text-xs bg-emerald-50 border-emerald-300 text-emerald-700" href={s.room}>🔴 Gir</Link>
              </div>
            ))}
            {todaySessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 space-y-1">
                <div>📅</div>
                <div>Bugün planlanmış ders yok</div>
                <Link href="/live" className="text-emerald-600 hover:underline text-xs">Canlı oturumları gör →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <SectionHeading title="Hızlı araçlar" badge="Tek tık" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "🧠", label: "Akıllı Tahta", href: "/whiteboard", color: "from-violet-400 to-purple-400" },
              { icon: "📡", label: "Canlı Yayın", href: "/live/abc", color: "from-rose-400 to-orange-400" },
              { icon: "📚", label: "Kurslar", href: "/courses", color: "from-blue-400 to-cyan-400" },
              { icon: "🎥", label: "Kayıtlar", href: "/report-cards", color: "from-emerald-400 to-teal-400" },
            ].map(tool => (
              <Link key={tool.label} href={tool.href}
                className="glass rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-1.5 text-center hover:border-slate-300 hover:-translate-y-0.5 transition-all group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-lg text-white group-hover:scale-110 transition-transform`}>
                  {tool.icon}
                </div>
                <span className="text-xs font-semibold text-slate-700">{tool.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <SectionHeading title="Sanal Sınıf Kontrolü" badge="v2110" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "🖐️", label: "Söz Ver", style: "" },
              { icon: "⛔", label: "İzni Reddet", style: "text-rose-700 border-rose-200 hover:bg-rose-50" },
              { icon: "🖥️", label: "Ekran Gör", style: "" },
              { icon: "📷", label: "Kamera Aç", style: "" },
              { icon: "✅", label: "Yoklama Al", style: "text-emerald-700 border-emerald-200 hover:bg-emerald-50" },
              { icon: "🧾", label: "Ders Notu", style: "" },
            ].map(b => (
              <button key={b.label} className={`btn-link justify-center text-xs ${b.style}`}>
                {b.icon} {b.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
            Ders sırasında yetki ve iletişim kontrolleri burada. Tüm eylemler kayıt altına alınır.
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <SectionHeading title="Kazanç & Cüzdan" badge="Finans" />
          <div className="grid gap-2">
            {[
              {
                label: "Bu dönem hakediş",
                value: earningsSummary?.payoutAmount != null
                  ? `₺${Number(earningsSummary.payoutAmount).toLocaleString("tr-TR")}`
                  : "—",
              },
              {
                label: "Toplam kurs geliri",
                value: earningsSummary?.courseRevenue != null
                  ? `₺${Number(earningsSummary.courseRevenue).toLocaleString("tr-TR")}`
                  : "—",
              },
              {
                label: "Dönem sonu",
                value: earningsSummary?.periodEnd
                  ? new Date(earningsSummary.periodEnd).toLocaleDateString("tr-TR")
                  : "—",
              },
            ].map((w) => (
              <div key={w.label} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                <div className="text-sm text-slate-600">{w.label}</div>
                <div className="font-semibold">{w.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 text-xs">
            <button className="btn-link flex-1">Ödeme Talebi</button>
            <button className="btn-link flex-1">Hareketler</button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
            Ödemeler yönetici onayıyla kesinleşir. Gönüllü uzatmalar ücretlendirilmez; bonus/hediye ödemeleri yönetici tarafından onaylanır.
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Onay süreci</div>
            {approvalQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.detail}</div>
                  <div className="text-xs text-slate-500">Kod: {item.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.amount}</div>
                  <span className={`pill text-[11px] ${item.status === "Onay bekliyor" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2 text-sm">
            <div className="font-semibold">Talep oluştur</div>
            <textarea
              className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              rows={3}
              placeholder="Örn: Ders sonunda öğrencinin talebiyle +15 dk ek süre. (Gönüllü / Bonus)"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
            />
            {approvalMessage ? <div className="text-xs text-emerald-600">{approvalMessage}</div> : null}
            <div className="flex gap-2 text-xs">
              <button className="btn-link flex-1" onClick={() => sendApprovalRequest("Gönüllü Ek Süre")}>Gönüllü bildirim</button>
              <button className="btn-link flex-1" onClick={() => sendApprovalRequest("Bonus Ödül")}>Bonus talebi</button>
            </div>
          </div>
        </div>
      </section>

      <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading title="Yönet • Ders İçerikleri" />
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="btn-link cursor-pointer">
                ⬆️ Yükle
                <input type="file" multiple className="hidden" onChange={onUpload} />
              </label>
              <button className="btn-link">⬇️ İndir</button>
              <button className="btn-link">🖨️ Yazdır</button>
              <button className="btn-link">📊 Raporla</button>
            </div>
          </div>

        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-2">
            <div className="text-sm font-semibold mb-1">Klasörler</div>
            <div className="space-y-1 text-sm">
              {folders.map((f) => (
                <button
                  key={f.name}
                  className={`w-full text-left rounded-lg border px-3 py-2 flex items-center justify-between ${
                    activeFolder === f.name ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"
                  }`}
                  onClick={() => setActiveFolder(f.name)}
                >
                  <span className="flex items-center gap-2">📁 {f.name}</span>
                  <span className="pill text-[11px]">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold">Dosyalar • {activeFolder}</div>
              <span className="text-xs text-slate-500">Sürükle-bırak ile yükleyebilirsin</span>
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3 text-xs text-slate-500">
              Yüklemek için dosya bırak veya "Yükle"ye tıkla.
            </div>
            {uploadNote ? <div className="text-xs text-emerald-600">{uploadNote}</div> : null}
            {loading ? <div className="text-xs text-slate-500">Yükleniyor...</div> : null}
            <div className="divide-y divide-slate-100 text-sm">
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span>{f.type === "PDF" ? "📄" : f.type === "MP4" ? "🎞️" : "📑"}</span>
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-slate-500">{f.type} · {formatSize(f.size)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a className="btn-link" href={f.url}>İndir</a>
                    <button className="btn-link">Yazdır</button>
                    <button className="btn-link">Paylaş</button>
                    <button className="btn-link text-rose-700 border-rose-200" onClick={() => removeFile(f.name)}>Sil</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
        <SectionHeading title="Tahta Arşivi" badge="Geçmiş dersler" />
        <div className="grid gap-3 md:grid-cols-3">
          {archive.map((a) => (
            <div key={a.title} className="rounded-2xl border border-slate-200 bg-white/90 overflow-hidden hover:-translate-y-0.5 transition-all shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-blue-400 to-violet-400" />
              <div className="p-4 space-y-2">
                <div className="font-semibold text-sm">{a.title}</div>
                <div className="text-xs text-slate-500">{a.date} · {a.pages} sayfa</div>
                <div className="flex gap-2 text-xs">
                  <button className="btn-link flex-1">Aç</button>
                  <button className="btn-link flex-1">Paylaş</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FeaturedInstructors />
      </div>
    </PanelShell>
  );
}

function Metric({ label, value, icon = "📊" }: { label: string; value: string; icon?: string }) {
  return (
    <div className="glass rounded-2xl border border-slate-200 p-3 shadow-sm flex items-center gap-2.5">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs text-slate-600">{label}</div>
        <div className="text-lg font-bold text-slate-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function SectionHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
        {title}
      </h2>
      {badge && <span className="pill text-xs">{badge}</span>}
    </div>
  );
}

function formatSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FeaturedInstructors() {
  const { data: users, isLoading } = useSWR<InstructorUser[]>("/users", api, { revalidateOnFocus: false });
  const instructors = (users ?? []).filter((u) => u.role === "INSTRUCTOR").slice(0, 6);

  return (
    <section className="glass p-4 rounded-2xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeading title="Ekipte eğitmenler" />
        <Link className="btn-link" href="/instructor/insights">Baş eğitmen görünümü</Link>
      </div>
      {isLoading && (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white/90 p-4 animate-pulse space-y-2">
              <div className="h-4 w-2/3 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && instructors.length === 0 && (
        <div className="text-sm text-slate-500">Kayıtlı eğitmen bulunamadı.</div>
      )}
      {!isLoading && instructors.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {instructors.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-2 hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(f.name ?? f.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{f.name ?? f.email}</div>
                  <div className="text-xs text-slate-500 truncate">{f.email}</div>
                </div>
                <div className="pill text-[11px] flex-shrink-0">Eğitmen</div>
              </div>
              <div className="flex gap-2 text-sm">
                <Link className="btn-link flex-1 justify-center text-xs" href="/whiteboard">🧠 Tahta</Link>
                <Link className="btn-link flex-1 justify-center text-xs" href="/live">📡 Canlı</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
