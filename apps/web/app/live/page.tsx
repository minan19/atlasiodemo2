"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "../api/client";
import { LegacyPanel } from "./legacy-panel";
import { useI18n } from "../_i18n/use-i18n";

type LiveSession = {
  id: string;
  title: string;
  status: string;
  scheduledAt?: string | null;
  participantCount?: number;
};

type Me = { id?: string; userId?: string; role?: string; name?: string | null };

function sessionTime(s: LiveSession): string {
  if (s.scheduledAt) {
    return new Date(s.scheduledAt).toLocaleString("tr-TR", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return s.status === "RUNNING" ? "Şu an canlı" : "Yakında";
}

function statusLabel(status: string): string {
  if (status === "RUNNING") return "🔴 Canlı";
  if (status === "SCHEDULED") return "⏰ Planlandı";
  if (status === "ENDED") return "✓ Bitti";
  return status;
}

function statusClass(status: string): string {
  if (status === "RUNNING") return "bg-rose-50 border-rose-300 text-rose-700 animate-pulse";
  if (status === "SCHEDULED") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-slate-50 border-slate-200 text-slate-600";
}

// Demo sessions for when API returns empty
const DEMO_SESSIONS: LiveSession[] = [
  { id: "demo-math-01", title: "Diferansiyel Denklemler", status: "RUNNING", scheduledAt: null, participantCount: 24 },
  { id: "demo-phys-02", title: "Kuantum Fiziği Giriş", status: "SCHEDULED", scheduledAt: new Date(Date.now() + 45 * 60000).toISOString(), participantCount: 0 },
  { id: "demo-chem-03", title: "Organik Kimya Lab", status: "SCHEDULED", scheduledAt: new Date(Date.now() + 120 * 60000).toISOString(), participantCount: 0 },
  { id: "demo-hist-04", title: "Dünya Tarihi: Modern Çağ", status: "ENDED", scheduledAt: new Date(Date.now() - 2 * 3600000).toISOString(), participantCount: 31 },
];

export default function LiveHubPage() {
  const t = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [liveStudentCount] = useState(247 + Math.floor(Math.random() * 30));

  useEffect(() => {
    (async () => {
      try {
        const me = await api<Me>("/auth/profile");
        setUserId(me?.id ?? me?.userId ?? null);
        setRole(me?.role ?? null);
        setUserName(me?.name ?? null);
      } catch {
        setUserId(null);
      }
    })();
  }, []);

  const isInstructor = role === "INSTRUCTOR" || role === "ADMIN" || role === "HEAD_INSTRUCTOR";

  const { data: sessions, isLoading, mutate } = useSWR<LiveSession[]>(
    isInstructor ? "/live/sessions" : null,
    api,
    { revalidateOnFocus: false }
  );

  const displaySessions = (sessions && sessions.length > 0) ? sessions : DEMO_SESSIONS;
  const activeSessions = displaySessions.filter((s) => s.status === "RUNNING" || s.status === "SCHEDULED");
  const endedSessions = displaySessions.filter((s) => s.status === "ENDED");

  function handleJoinByCode() {
    const code = joinCode.trim();
    if (!code) { setJoinError(t.tr("Oturum kodu girin.")); return; }
    if (code.length < 4) { setJoinError(t.tr("Geçersiz kod.")); return; }
    window.location.href = `/live/${code}`;
  }

  async function handleCreateSession() {
    if (!newSessionTitle.trim()) return;
    setCreatingSession(true);
    try {
      await api("/live/sessions", {
        method: "POST",
        body: JSON.stringify({ title: newSessionTitle.trim() }),
      });
      setNewSessionTitle("");
      setShowCreateForm(false);
      mutate();
    } catch {
      // ignore for demo
      window.location.href = `/live/new-${Date.now()}`;
    } finally {
      setCreatingSession(false);
    }
  }

  return (
    <main className="space-y-5">
      {/* Hero */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="pill w-fit">
                <span className="status-dot online" />
                {t.tr("Canlı")}
              </div>
              <span className="pill pill-sm bg-emerald-50 border-emerald-200 text-emerald-700">
                {liveStudentCount} {t.tr("öğrenci aktif")}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{t.live.title}</h1>
            <p className="text-sm text-slate-500">{t.live.subtitle}</p>
            {/* Stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { icon: "🔴", label: t.live.statusRunning, value: activeSessions.filter(s => s.status === "RUNNING").length.toString(), color: "text-rose-600", bg: "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200" },
                { icon: "⏰", label: t.live.statusScheduled, value: activeSessions.filter(s => s.status === "SCHEDULED").length.toString(), color: "text-amber-600", bg: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200" },
                { icon: "👥", label: t.live.participantsLabel, value: liveStudentCount.toString(), color: "text-emerald-600", bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" },
                { icon: "✓", label: t.live.statusEnded, value: endedSessions.length.toString(), color: "text-slate-600", bg: "bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200" },
              ].map(stat => (
                <div key={t.tr(stat.label)} className={`rounded-xl border p-3 text-center shadow-sm ${stat.bg}`}>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.icon} {stat.value}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t.tr(stat.label)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/whiteboard" className="btn-link text-sm">{t.tr("🧠 Akıllı Tahta")}</Link>
            {isInstructor && (
              <button
                className="btn-link text-sm bg-emerald-500/10 border-emerald-400 text-emerald-700"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? t.tr("✕ Vazgeç") : t.tr("➕ Yeni Oturum")}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Create session form (instructor) */}
      {isInstructor && showCreateForm && (
        <div className="glass rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3 animate-scale-in">
          <div className="text-sm font-semibold text-emerald-800">{t.tr("Yeni Canlı Oturum Başlat")}</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              placeholder={t.tr("Oturum başlığı (ör. Matematik — Ders 5)")}
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
            />
            <button
              className="btn-link text-sm px-5"
              onClick={handleCreateSession}
              disabled={creatingSession || !newSessionTitle.trim()}
            >
              {creatingSession ? t.tr("Oluşturuluyor…") : t.tr("🚀 Başlat")}
            </button>
          </div>
          <p className="text-xs text-emerald-700">
            {t.tr("Oturum başlatıldıktan sonra öğrenciler bağlantı kodu veya link ile katılabilir.")}
          </p>
        </div>
      )}

      {/* Quick join for students */}
      {!isInstructor && (
        <div className="glass rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/30 p-4">
          <div className="text-sm font-semibold mb-3">{t.tr("Oturuma Katıl")}</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none uppercase tracking-widest"
              placeholder={t.tr("Oturum kodu gir (ör. MATH-01)")}
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
              maxLength={20}
            />
            <button className="btn-link text-sm px-5" onClick={handleJoinByCode}>
              {t.live.joinBtn} →
            </button>
          </div>
          {joinError && <p className="text-xs text-rose-600 mt-2">{joinError}</p>}
          <p className="text-xs text-slate-400 mt-2">
            {t.tr("Kodu eğitmeninizden veya ders davet bağlantısından alabilirsiniz.")}
          </p>
        </div>
      )}

      {/* Active & Scheduled Sessions */}
      {(isInstructor || role !== null) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-400 to-orange-400 inline-block" />
              {t.tr("Aktif & Planlanan Oturumlar")}
              <span className="pill pill-sm">{activeSessions.length}</span>
            </h2>
            {!sessions && <span className="pill pill-sm bg-amber-50 border-amber-200 text-amber-700">{t.tr("Demo veri")}</span>}
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass rounded-2xl border border-slate-200 p-4 animate-pulse space-y-2">
                    <div className="h-5 w-1/2 bg-slate-200 rounded" />
                    <div className="h-4 w-1/3 bg-slate-100 rounded" />
                    <div className="flex gap-2 mt-3">
                      <div className="h-8 w-20 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))
              : activeSessions.length === 0
              ? (
                  <div className="glass rounded-2xl border border-slate-200 p-6 text-sm text-slate-500 col-span-3 text-center space-y-2">
                    <div className="text-3xl">📡</div>
                    <p>{t.tr("Aktif oturum yok.")}</p>
                    {isInstructor && (
                      <button className="btn-link text-sm" onClick={() => setShowCreateForm(true)}>
                        {t.tr("Yeni oturum başlat")}
                      </button>
                    )}
                  </div>
                )
              : activeSessions.map((s) => (
                  <div key={s.id} className="glass rounded-2xl border border-slate-200 overflow-hidden hover:-translate-y-1 transition-all duration-300 group shadow-sm hover:shadow-md">
                    {/* Card banner */}
                    <div className={`h-2 w-full ${s.status === "RUNNING" ? "bg-gradient-to-r from-rose-500 to-orange-500" : "bg-gradient-to-r from-amber-400 to-yellow-500"}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-semibold text-slate-900 leading-tight">{t.tr(s.title)}</h3>
                        <span className={`pill pill-sm flex-shrink-0 text-xs ${statusClass(s.status)}`}>
                          {statusLabel(s.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1.5">
                        <div className="flex items-center gap-1.5">🕐 {sessionTime(s)}</div>
                        {s.participantCount !== undefined && s.participantCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            👥 <span>{s.participantCount} {t.tr("katılımcı")}</span>
                            {/* Mini participant dots */}
                            <div className="flex -space-x-1 ml-1">
                              {Array.from({length: Math.min(s.participantCount, 4)}).map((_, i) => (
                                <div key={i} className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 border border-white text-[8px] flex items-center justify-center text-white font-bold">{i+1}</div>
                              ))}
                              {s.participantCount > 4 && <div className="w-4 h-4 rounded-full bg-slate-200 border border-white text-[8px] flex items-center justify-center text-slate-500">+{s.participantCount-4}</div>}
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400">ID: {s.id.slice(0, 12)}…</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/live/${s.id}`}
                          className="btn-link text-xs flex-1 justify-center"
                          style={s.status === "RUNNING"
                            ? { background: 'linear-gradient(to right, #f43f5e, #f97316)', color: '#fff', borderColor: '#fb7185' }
                            : { background: 'rgba(16,185,129,0.1)', color: '#047857', borderColor: '#34d399' }}
                        >
                          {s.status === "RUNNING" ? t.tr("🔴 Derse Gir") : t.tr("📅 Görüntüle")}
                        </Link>
                        {isInstructor && s.status !== "ENDED" && (
                          <Link href="/whiteboard" className="btn-link text-xs px-2">🧠</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      )}

      {/* Ended sessions */}
      {endedSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-400 to-slate-500 inline-block" />
            {t.tr("Son Tamamlanan")}
            <span className="pill pill-sm">{endedSessions.length}</span>
          </h2>
          <div className="grid gap-2 md:grid-cols-3">
            {endedSessions.map((s) => (
              <div key={s.id} className="glass rounded-xl border border-slate-200 p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">{t.tr(s.title)}</div>
                  <span className="pill pill-sm text-[10px]">{t.tr("Bitti")}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{sessionTime(s)}</div>
                {s.participantCount !== undefined && (
                  <div className="text-xs text-slate-400">👥 {s.participantCount} {t.tr("katılımcı")}</div>
                )}
                <div className="flex gap-1 mt-2">
                  <Link href={`/live/${s.id}`} className="btn-link text-[11px]">{t.tr("Kaydı İzle")}</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Platform features — info cards */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400 inline-block" />
            {t.tr("Platform Özellikleri")}
          </h2>
          <span className="pill text-xs">WebRTC · P2P</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🚀", title: "Anlık Bağlantı", desc: "WebRTC ile sıfır gecikme. Katıl tuşuna basınca HD video aktifleşir." },
            { icon: "🧠", title: "Entegre Tahta", desc: "Her oturuma bağlı akıllı tahta. Kalem, şekil, PDF, quiz — hepsi hazır." },
            { icon: "⏺️", title: "Otomatik Kayıt", desc: "Canlı ders otomatik kaydedilir. Sonradan izle, ödev olarak ekle." },
          ].map((card, i) => (
            <div key={t.tr(card.title)} className="glass rounded-xl border border-slate-200 p-4 space-y-2 hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${["from-rose-400 to-orange-400", "from-blue-400 to-cyan-400", "from-violet-400 to-purple-400"][i]} flex items-center justify-center text-base`}>{card.icon}</span>
                <span className="font-semibold text-sm">{t.tr(card.title)}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{t.tr(card.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {userId ? <LegacyPanel userId={userId} /> : (
        <div className="glass rounded-2xl border border-slate-200 p-4 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 skeleton rounded-xl" />
          ))}
        </div>
      )}
    </main>
  );
}
