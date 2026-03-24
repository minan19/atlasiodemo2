"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") ?? localStorage.getItem("access_token");
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

interface ExamSession {
  id: string;
  userId: string;
  courseId?: string | null;
  trustScore?: number | null;
  aiDecision?: string | null;
  proctorNote?: string | null;
  createdAt: string;
  User?: { name?: string | null; email: string } | null;
}

const TRUST_COLOR = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "text-slate-400";
  if (score >= 0.75) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-500";
  return "text-rose-600";
};

const TRUST_BG = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "bg-slate-100";
  if (score >= 0.75) return "bg-emerald-50 border-emerald-200";
  if (score >= 0.5) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
};

const DECISION_BADGE = (d: string | null | undefined) => {
  if (!d) return null;
  const map: Record<string, { label: string; cls: string }> = {
    SUSPICIOUS: { label: "Şüpheli", cls: "bg-rose-100 text-rose-700 border border-rose-200" },
    FLAGGED: { label: "Bayraklı", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
    CLEAN: { label: "Temiz", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  };
  const item = map[d] ?? { label: d, cls: "bg-slate-100 text-slate-600" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.cls}`}>{item.label}</span>;
};

// Demo data for when API is unavailable
const DEMO_SESSIONS: ExamSession[] = [
  { id: "ses-001", userId: "u1", courseId: "c1", trustScore: 0.92, aiDecision: "CLEAN", proctorNote: null, createdAt: new Date(Date.now() - 3600000).toISOString(), User: { name: "Ayşe Kaya", email: "ayse@example.com" } },
  { id: "ses-002", userId: "u2", courseId: "c1", trustScore: 0.41, aiDecision: "SUSPICIOUS", proctorNote: "Yapay Zeka gözetmeni olağandışı aktivite tespit etti.", createdAt: new Date(Date.now() - 7200000).toISOString(), User: { name: "Mehmet Demir", email: "mehmet@example.com" } },
  { id: "ses-003", userId: "u3", courseId: "c2", trustScore: 0.68, aiDecision: null, proctorNote: null, createdAt: new Date(Date.now() - 1800000).toISOString(), User: { name: "Zeynep Şahin", email: "zeynep@example.com" } },
  { id: "ses-004", userId: "u4", courseId: "c2", trustScore: 0.87, aiDecision: "CLEAN", proctorNote: null, createdAt: new Date(Date.now() - 900000).toISOString(), User: { name: "Ali Çelik", email: "ali@example.com" } },
  { id: "ses-005", userId: "u5", courseId: "c3", trustScore: 0.23, aiDecision: "SUSPICIOUS", proctorNote: "Çoklu sekme geçişi ve göz kaçırma tespit edildi.", createdAt: new Date(Date.now() - 600000).toISOString(), User: { name: "Fatma Yıldız", email: "fatma@example.com" } },
];

export default function ProctoringDashboardPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExamSession | null>(null);
  const [filter, setFilter] = useState<"all" | "suspicious" | "clean">("all");
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Try to load from API, fall back to demo data
    fetch(`${API}/proctor/sessions/all`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setSessions(Array.isArray(data) ? data : DEMO_SESSIONS);
        if (!Array.isArray(data)) setIsDemo(true);
      })
      .catch(() => { setSessions(DEMO_SESSIONS); setIsDemo(true); })
      .finally(() => setLoading(false));
  }, []);

  async function fetchLiveScore(sessionId: string) {
    setLiveLoading(true);
    try {
      const res = await fetch(`${API}/proctor/score/${sessionId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiveScore(data.trustScore ?? null);
    } catch { setLiveScore(null); }
    finally { setLiveLoading(false); }
  }

  const filtered = sessions.filter((s) =>
    filter === "all" ? true :
    filter === "suspicious" ? (s.trustScore ?? 1) < 0.5 || s.aiDecision === "SUSPICIOUS" :
    (s.trustScore ?? 0) >= 0.75 && s.aiDecision !== "SUSPICIOUS"
  );

  const suspiciousCount = sessions.filter((s) => (s.trustScore ?? 1) < 0.5 || s.aiDecision === "SUSPICIOUS").length;
  const avgTrust = sessions.length
    ? (sessions.reduce((sum, s) => sum + (s.trustScore ?? 0.8), 0) / sessions.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass hero rounded-2xl border border-slate-200 p-6">
        <div className="hero-content flex flex-wrap items-center justify-between gap-4">
          <div>
            {isDemo && (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                ⚠️ Demo modu — API bağlı değil
              </div>
            )}
            <div className="pill w-fit">
              <span className="status-dot online" />
              Sınav Gözetimi
            </div>
            <h1 className="text-2xl font-bold mt-1">Proctoring Dashboard</h1>
            <p className="text-sm text-slate-500">AI destekli sınav gözetleme · TrustScore analizi · Şüpheli aktivite yönetimi</p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
              <div className="text-3xl font-extrabold text-slate-800">{sessions.length}</div>
              <div className="text-xs text-slate-500">Toplam Oturum</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-center">
              <div className="text-3xl font-extrabold text-rose-600">{suspiciousCount}</div>
              <div className="text-xs text-rose-600">Şüpheli</div>
            </div>
            <div className={`rounded-xl border px-5 py-3 text-center ${TRUST_BG(avgTrust)}`}>
              <div className={`text-3xl font-extrabold ${TRUST_COLOR(avgTrust)}`}>
                {Math.round(avgTrust * 100)}%
              </div>
              <div className="text-xs text-slate-500">Ort. TrustScore</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sessions list */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl border border-slate-200">
            {/* Filter bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
              <span className="text-sm font-semibold text-slate-600 mr-2">Filtre:</span>
              {([["all", "Tümü"], ["suspicious", "⚠️ Şüpheli"], ["clean", "✅ Temiz"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${filter === v ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {l}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400">{filtered.length} oturum</span>
            </div>

            {/* Sessions */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 rounded bg-slate-200" />
                        <div className="h-2 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Bu filtrede oturum bulunamadı.</div>
              ) : (
                filtered.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { setSelected(s); fetchLiveScore(s.id); }}
                    className={`flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 ${selected?.id === s.id ? "bg-violet-50" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                      {(s.User?.name ?? s.User?.email ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {s.User?.name ?? s.User?.email ?? s.userId.slice(0, 12)}
                        </span>
                        {DECISION_BADGE(s.aiDecision)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        {s.User?.email} · {new Date(s.createdAt).toLocaleString("tr-TR")}
                      </div>
                    </div>
                    {/* Trust score bar */}
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-extrabold ${TRUST_COLOR(s.trustScore)}`}>
                        {s.trustScore !== null && s.trustScore !== undefined
                          ? `${Math.round(s.trustScore * 100)}%`
                          : "—"
                        }
                      </div>
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${(s.trustScore ?? 0) >= 0.75 ? "bg-emerald-500" : (s.trustScore ?? 0) >= 0.5 ? "bg-amber-400" : "bg-rose-500"}`}
                          style={{ width: `${Math.round((s.trustScore ?? 0) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">TrustScore</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div className="glass rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white">
                  {(selected.User?.name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{selected.User?.name ?? "Bilinmiyor"}</div>
                  <div className="text-xs text-slate-500">{selected.User?.email}</div>
                </div>
              </div>

              {/* Trust score large */}
              <div className={`rounded-xl border p-4 text-center ${TRUST_BG(liveScore ?? selected.trustScore)}`}>
                {liveLoading ? (
                  <div className="h-8 w-8 mx-auto rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
                ) : (
                  <>
                    <div className={`text-4xl font-extrabold ${TRUST_COLOR(liveScore ?? selected.trustScore)}`}>
                      {(liveScore ?? selected.trustScore) !== null
                        ? `${Math.round((liveScore ?? selected.trustScore ?? 0) * 100)}%`
                        : "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">TrustScore (anlık)</div>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Oturum ID</span>
                  <span className="font-mono text-xs text-slate-700">{selected.id.slice(0, 16)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Başlangıç</span>
                  <span className="text-slate-700">{new Date(selected.createdAt).toLocaleString("tr-TR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Karar</span>
                  {DECISION_BADGE(selected.aiDecision) ?? <span className="text-slate-400">—</span>}
                </div>
              </div>

              {/* AI Note */}
              {selected.proctorNote && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="text-xs font-bold text-rose-700 mb-1">⚠️ AI Uyarısı</div>
                  <p className="text-xs text-rose-800 leading-relaxed">{selected.proctorNote}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => fetchLiveScore(selected.id)}
                  className="btn btn-primary w-full text-sm"
                >
                  🔄 TrustScore Yenile
                </button>
                <button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
                  📋 Rapor İndir
                </button>
                {selected.aiDecision === "SUSPICIOUS" && (
                  <button className="w-full rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-all">
                    🚫 Oturumu Sonlandır
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-slate-200 p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm text-slate-500">Sol listeden bir oturum seçin.</p>
              <p className="text-xs text-slate-400 mt-1">Detaylar ve canlı TrustScore burada görünecek.</p>
            </div>
          )}

          {/* Summary stats */}
          <div className="mt-4 glass rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Risk Dağılımı</h3>
            <div className="space-y-2">
              {[
                { label: "Düşük Risk (≥75%)", count: sessions.filter(s => (s.trustScore ?? 0) >= 0.75).length, color: "bg-emerald-500" },
                { label: "Orta Risk (50–74%)", count: sessions.filter(s => (s.trustScore ?? 0) >= 0.5 && (s.trustScore ?? 0) < 0.75).length, color: "bg-amber-400" },
                { label: "Yüksek Risk (<50%)", count: sessions.filter(s => (s.trustScore ?? 1) < 0.5).length, color: "bg-rose-500" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-semibold text-slate-700">{r.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-1.5 rounded-full ${r.color} transition-all`}
                      style={{ width: sessions.length ? `${(r.count / sessions.length) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
