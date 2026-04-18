"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../_i18n/use-i18n";

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

// ─── Icon system ─────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = { width: size, height: size, display: "inline-block", flexShrink: 0 } as const;
  const p = { stroke: "currentColor", fill: "none", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "shield-check":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M12 3L4 7v5c0 5.25 3.75 10.15 8 11.25C16.25 22.15 20 17.25 20 12V7L12 3z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "check-circle":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "refresh-cw":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      );
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case "x-circle":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "bar-chart":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "wifi":
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <path d="M5 12.55a11 11 0 0114.08 0" />
          <path d="M1.42 9a16 16 0 0121.16 0" />
          <path d="M8.53 16.11a6 6 0 016.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={s} {...p}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

// ─── Trust score helpers ──────────────────────────────────────────────────────
const trustColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return "var(--muted)";
  if (score >= 0.75) return "#10b981";
  if (score >= 0.5) return "#f59e0b";
  return "#ef4444";
};

const trustBgStyle = (score: number | null | undefined): React.CSSProperties => {
  if (score === null || score === undefined)
    return { background: "color-mix(in srgb, var(--muted) 8%, var(--panel))", border: "1.5px solid var(--line)" };
  if (score >= 0.75)
    return { background: "color-mix(in srgb, #10b981 8%, var(--panel))", border: "1.5px solid #6ee7b7" };
  if (score >= 0.5)
    return { background: "color-mix(in srgb, #f59e0b 8%, var(--panel))", border: "1.5px solid #fcd34d" };
  return { background: "color-mix(in srgb, #ef4444 8%, var(--panel))", border: "1.5px solid #fca5a5" };
};

const trustBarColor = (score: number | null | undefined): string => {
  if ((score ?? 0) >= 0.75) return "#10b981";
  if ((score ?? 0) >= 0.5) return "#f59e0b";
  return "#ef4444";
};

// ─── Decision badge ───────────────────────────────────────────────────────────
const DECISION_BADGE = (d: string | null | undefined, tr?: (s: string) => string) => {
  if (!d) return null;
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    SUSPICIOUS: { label: "Şüpheli", bg: "color-mix(in srgb,#ef4444 10%,var(--panel))", color: "#ef4444", border: "#fca5a5" },
    FLAGGED:    { label: "Bayraklı", bg: "color-mix(in srgb,#f59e0b 10%,var(--panel))", color: "#f59e0b", border: "#fcd34d" },
    CLEAN:      { label: "Temiz",   bg: "color-mix(in srgb,#10b981 10%,var(--panel))", color: "#10b981", border: "#6ee7b7" },
  };
  const item = map[d] ?? { label: d, bg: "color-mix(in srgb,var(--muted) 8%,var(--panel))", color: "var(--ink-2)", border: "var(--line)" };
  return (
    <span style={{
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
      background: item.bg,
      color: item.color,
      border: `1px solid ${item.border}`,
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
    }}>
      {tr ? tr(item.label) : item.label}
    </span>
  );
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_SESSIONS: ExamSession[] = [
  { id: "ses-001", userId: "u1", courseId: "c1", trustScore: 0.92, aiDecision: "CLEAN",      proctorNote: null,                                                                    createdAt: new Date(Date.now() - 3600000).toISOString(), User: { name: "Ayşe Kaya",    email: "ayse@example.com"   } },
  { id: "ses-002", userId: "u2", courseId: "c1", trustScore: 0.41, aiDecision: "SUSPICIOUS", proctorNote: "Yapay Zeka gözetmeni olağandışı aktivite tespit etti.",                  createdAt: new Date(Date.now() - 7200000).toISOString(), User: { name: "Mehmet Demir", email: "mehmet@example.com" } },
  { id: "ses-003", userId: "u3", courseId: "c2", trustScore: 0.68, aiDecision: null,         proctorNote: null,                                                                    createdAt: new Date(Date.now() - 1800000).toISOString(), User: { name: "Zeynep Şahin", email: "zeynep@example.com" } },
  { id: "ses-004", userId: "u4", courseId: "c2", trustScore: 0.87, aiDecision: "CLEAN",      proctorNote: null,                                                                    createdAt: new Date(Date.now() -  900000).toISOString(), User: { name: "Ali Çelik",    email: "ali@example.com"    } },
  { id: "ses-005", userId: "u5", courseId: "c3", trustScore: 0.23, aiDecision: "SUSPICIOUS", proctorNote: "Çoklu sekme geçişi ve göz kaçırma tespit edildi.",                      createdAt: new Date(Date.now() -  600000).toISOString(), User: { name: "Fatma Yıldız", email: "fatma@example.com" } },
];

// ─── Page component ───────────────────────────────────────────────────────────
export default function ProctoringDashboardPage() {
  const t = useI18n();
  const [sessions, setSessions]       = useState<ExamSession[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<ExamSession | null>(null);
  const [filter, setFilter]           = useState<"all" | "suspicious" | "clean">("all");
  const [liveScore, setLiveScore]     = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [isDemo, setIsDemo]           = useState(false);

  useEffect(() => {
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
    filter === "all"        ? true :
    filter === "suspicious" ? (s.trustScore ?? 1) < 0.5 || s.aiDecision === "SUSPICIOUS" :
                              (s.trustScore ?? 0) >= 0.75 && s.aiDecision !== "SUSPICIOUS"
  );

  const suspiciousCount = sessions.filter((s) => (s.trustScore ?? 1) < 0.5 || s.aiDecision === "SUSPICIOUS").length;
  const avgTrust = sessions.length
    ? (sessions.reduce((sum, s) => sum + (s.trustScore ?? 0.8), 0) / sessions.length)
    : 0;

  // Risk distribution
  const lowRisk  = sessions.filter(s => (s.trustScore ?? 0) >= 0.75).length;
  const midRisk  = sessions.filter(s => (s.trustScore ?? 0) >= 0.5 && (s.trustScore ?? 0) < 0.75).length;
  const highRisk = sessions.filter(s => (s.trustScore ?? 1) < 0.5).length;

  return (
    <>
      {/* ── Scoped styles ─────────────────────────────────────────────── */}
      <style>{`
        .proc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .proc-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .proc-sessions {
            grid-column: span 2;
          }
        }
        .proc-session-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          cursor: pointer;
          border-bottom: 1px solid var(--line);
          transition: background var(--t-fast);
        }
        .proc-session-row:last-child { border-bottom: none; }
        .proc-session-row:hover { background: color-mix(in srgb, var(--accent) 5%, var(--panel)); }
        .proc-session-row.active   { background: color-mix(in srgb, var(--accent) 9%, var(--panel)); }
        .proc-filter-btn {
          border-radius: var(--r-md);
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all var(--t-fast);
          background: color-mix(in srgb, var(--muted) 10%, var(--panel));
          color: var(--ink-2);
        }
        .proc-filter-btn:hover { background: color-mix(in srgb, var(--accent) 10%, var(--panel)); color: var(--accent); }
        .proc-filter-btn.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .proc-action-btn {
          width: 100%;
          border-radius: var(--r-md);
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all var(--t-fast);
          border: 1.5px solid transparent;
        }
        .proc-action-btn.primary {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .proc-action-btn.primary:hover { opacity: 0.88; }
        .proc-action-btn.secondary {
          background: var(--panel);
          color: var(--ink-2);
          border-color: var(--line);
        }
        .proc-action-btn.secondary:hover { background: color-mix(in srgb, var(--accent) 6%, var(--panel)); color: var(--accent); }
        .proc-action-btn.danger {
          background: color-mix(in srgb, #ef4444 8%, var(--panel));
          color: #ef4444;
          border-color: #fca5a5;
        }
        .proc-action-btn.danger:hover { background: color-mix(in srgb, #ef4444 16%, var(--panel)); }
        @keyframes proc-spin {
          to { transform: rotate(360deg); }
        }
        .proc-spinner {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 2.5px solid color-mix(in srgb, var(--accent) 25%, var(--panel));
          border-top-color: var(--accent);
          animation: proc-spin 0.75s linear infinite;
          margin: 0 auto;
        }
        @keyframes proc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .proc-skeleton {
          border-radius: var(--r-sm);
          background: color-mix(in srgb, var(--muted) 18%, var(--panel));
          animation: proc-pulse 1.4s ease-in-out infinite;
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header card ──────────────────────────────────────────────── */}
        <div style={{
          borderRadius: "var(--r-xl)",
          background: "var(--panel)",
          border: "1.5px solid var(--line)",
          padding: 24,
          boxShadow: "var(--shadow-md)",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            {/* Left */}
            <div>
              {isDemo && (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 99,
                  background: "color-mix(in srgb,#f59e0b 10%,var(--panel))",
                  border: "1px solid #fcd34d",
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#d97706",
                  marginBottom: 8,
                }}>
                  <Icon name="alert-triangle" size={13} />
                  {t.tr("Demo modu — API bağlı değil")}
                </div>
              )}
              {/* Pill */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 99,
                background: "color-mix(in srgb, var(--accent) 8%, var(--panel))",
                border: "1px solid var(--line)",
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: 6,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 0 2px color-mix(in srgb,#10b981 30%,transparent)",
                  display: "inline-block",
                }} />
                {t.tr("Sınav Gözetimi")}
              </div>
              {/* Title */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 24, borderRadius: 4, background: "linear-gradient(180deg,var(--accent-2),var(--accent))", flexShrink: 0 }} />
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: 0 }}>{t.tr("Proctoring Dashboard")}</h1>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0 }}>
                {t.tr("AI destekli sınav gözetleme · TrustScore analizi · Şüpheli aktivite yönetimi")}
              </p>
            </div>
            {/* Stat cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {/* Total sessions */}
              <div style={{
                borderRadius: "var(--r-lg)",
                background: "color-mix(in srgb,var(--accent) 6%,var(--panel))",
                border: "1.5px solid var(--line)",
                padding: "12px 20px",
                textAlign: "center",
                minWidth: 80,
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>{sessions.length}</div>
                <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 3 }}>{t.tr("Toplam Oturum")}</div>
              </div>
              {/* Suspicious */}
              <div style={{
                borderRadius: "var(--r-lg)",
                background: "color-mix(in srgb,#ef4444 8%,var(--panel))",
                border: "1.5px solid #fca5a5",
                padding: "12px 20px",
                textAlign: "center",
                minWidth: 80,
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444", lineHeight: 1 }}>{suspiciousCount}</div>
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{t.tr("Şüpheli")}</div>
              </div>
              {/* Avg trust */}
              <div style={{
                borderRadius: "var(--r-lg)",
                ...trustBgStyle(avgTrust),
                padding: "12px 20px",
                textAlign: "center",
                minWidth: 80,
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: trustColor(avgTrust), lineHeight: 1 }}>
                  {Math.round(avgTrust * 100)}%
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 3 }}>{t.tr("Ort. TrustScore")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div className="proc-grid">

          {/* Sessions list */}
          <div className="proc-sessions" style={{
            borderRadius: "var(--r-xl)",
            background: "var(--panel)",
            border: "1.5px solid var(--line)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}>
            {/* Filter bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid var(--line)",
              padding: "12px 20px",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginRight: 4 }}>{t.tr("Filtre")}:</span>
              {([
                ["all",        "Tümü"   ],
                ["suspicious", "Şüpheli"],
                ["clean",      "Temiz"  ],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`proc-filter-btn${filter === v ? " active" : ""}`}
                >
                  {v === "suspicious" && <Icon name="alert-triangle" size={12} />}
                  {v === "clean"      && <Icon name="check-circle"   size={12} />}
                  {" "}{t.tr(l)}
                </button>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>{filtered.length} {t.tr("oturum")}</span>
            </div>

            {/* Rows */}
            <div>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div className="proc-skeleton" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="proc-skeleton" style={{ width: "35%", height: 11 }} />
                        <div className="proc-skeleton" style={{ width: "55%", height: 9 }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  {t.tr("Bu filtrede oturum bulunamadı.")}
                </div>
              ) : (
                filtered.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => { setSelected(s); fetchLiveScore(s.id); }}
                    className={`proc-session-row${selected?.id === s.id ? " active" : ""}`}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                      flexShrink: 0,
                    }}>
                      {(s.User?.name ?? s.User?.email ?? "?").slice(0, 1).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.User?.name ?? s.User?.email ?? s.userId.slice(0, 12)}
                        </span>
                        {DECISION_BADGE(s.aiDecision)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.User?.email} · {new Date(s.createdAt).toLocaleString("tr-TR")}
                      </div>
                    </div>

                    {/* Trust score bar */}
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: 17, fontWeight: 900, color: trustColor(s.trustScore), lineHeight: 1 }}>
                        {s.trustScore !== null && s.trustScore !== undefined
                          ? `${Math.round(s.trustScore * 100)}%`
                          : "—"}
                      </div>
                      <div style={{ width: 64, height: 5, borderRadius: 99, background: "var(--line)", marginTop: 5 }}>
                        <div style={{
                          height: 5,
                          borderRadius: 99,
                          background: trustBarColor(s.trustScore),
                          width: `${Math.round((s.trustScore ?? 0) * 100)}%`,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>TrustScore</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Detail panel */}
            {selected ? (
              <div style={{
                borderRadius: "var(--r-xl)",
                background: "var(--panel)",
                border: "1.5px solid var(--line)",
                padding: 20,
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                {/* User header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: "var(--r-md)",
                    background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0,
                  }}>
                    {(selected.User?.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{selected.User?.name ?? t.tr("Bilinmiyor")}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{selected.User?.email}</div>
                  </div>
                </div>

                {/* Live trust score */}
                <div style={{
                  borderRadius: "var(--r-lg)",
                  padding: "16px 12px",
                  textAlign: "center",
                  ...trustBgStyle(liveScore ?? selected.trustScore),
                }}>
                  {liveLoading ? (
                    <div className="proc-spinner" />
                  ) : (
                    <>
                      <div style={{ fontSize: 38, fontWeight: 900, color: trustColor(liveScore ?? selected.trustScore), lineHeight: 1 }}>
                        {(liveScore ?? selected.trustScore) !== null
                          ? `${Math.round((liveScore ?? selected.trustScore ?? 0) * 100)}%`
                          : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 5 }}>{t.tr("TrustScore (anlık)")}</div>
                    </>
                  )}
                </div>

                {/* Detail rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    {
                      label: "Oturum ID",
                      value: <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink)" }}>{selected.id.slice(0, 16)}…</span>,
                    },
                    {
                      label: "Başlangıç",
                      value: <span style={{ fontSize: 12, color: "var(--ink)" }}>{new Date(selected.createdAt).toLocaleString("tr-TR")}</span>,
                    },
                    {
                      label: "AI Karar",
                      value: DECISION_BADGE(selected.aiDecision) ?? <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <span style={{ color: "var(--ink-2)" }}>{t.tr(label)}</span>
                      {value}
                    </div>
                  ))}
                </div>

                {/* AI warning note */}
                {selected.proctorNote && (
                  <div style={{
                    borderRadius: "var(--r-md)",
                    background: "color-mix(in srgb,#ef4444 8%,var(--panel))",
                    border: "1px solid #fca5a5",
                    padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "#ef4444", marginBottom: 5 }}>
                      <Icon name="alert-triangle" size={13} />
                      {t.tr("AI Uyarısı")}
                    </div>
                    <p style={{ fontSize: 11, color: "#b91c1c", lineHeight: 1.6, margin: 0 }}>{selected.proctorNote}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => fetchLiveScore(selected.id)}
                    className="proc-action-btn primary"
                  >
                    <Icon name="refresh-cw" size={14} />
                    {t.tr("TrustScore Yenile")}
                  </button>
                  <button className="proc-action-btn secondary">
                    <Icon name="clipboard" size={14} />
                    {t.tr("Rapor İndir")}
                  </button>
                  {selected.aiDecision === "SUSPICIOUS" && (
                    <button className="proc-action-btn danger">
                      <Icon name="x-circle" size={14} />
                      {t.tr("Oturumu Sonlandır")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                borderRadius: "var(--r-xl)",
                background: "var(--panel)",
                border: "1.5px solid var(--line)",
                padding: 32,
                boxShadow: "var(--shadow-sm)",
                textAlign: "center",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: "color-mix(in srgb,var(--accent) 8%,var(--panel))",
                  border: "1.5px solid var(--line)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 12px",
                  color: "var(--accent)",
                }}>
                  <Icon name="search" size={22} />
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, fontWeight: 600 }}>{t.tr("Sol listeden bir oturum seçin.")}</p>
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, marginBottom: 0 }}>{t.tr("Detaylar ve canlı TrustScore burada görünecek.")}</p>
              </div>
            )}

            {/* Risk distribution */}
            <div style={{
              borderRadius: "var(--r-xl)",
              background: "var(--panel)",
              border: "1.5px solid var(--line)",
              padding: 20,
              boxShadow: "var(--shadow-sm)",
            }}>
              {/* Section heading */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 4, height: 20, borderRadius: 4, background: "linear-gradient(180deg,var(--accent-2),var(--accent))", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.tr("Risk Dağılımı")}</span>
                <div style={{ marginLeft: "auto", color: "var(--accent)" }}>
                  <Icon name="bar-chart" size={15} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Düşük Risk (≥75%)", count: lowRisk,  barColor: "#10b981" },
                  { label: "Orta Risk (50–74%)", count: midRisk,  barColor: "#f59e0b" },
                  { label: "Yüksek Risk (<50%)", count: highRisk, barColor: "#ef4444" },
                ].map((r) => (
                  <div key={t.tr(r.label)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{t.tr(r.label)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{r.count}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                      <div style={{
                        height: 5,
                        borderRadius: 99,
                        background: r.barColor,
                        width: sessions.length ? `${(r.count / sessions.length) * 100}%` : "0%",
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
