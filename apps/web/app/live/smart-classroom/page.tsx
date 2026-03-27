"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  handRaised: boolean;
}

interface SessionData {
  sessionId: string;
  participants: Participant[];
  status: string;
  controls?: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  action: string;
  detail?: string;
  icon: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PARTICIPANTS: Participant[] = [
  { id: "u1", name: "Ayşe Kaya",      avatar: "A", online: true,  handRaised: true  },
  { id: "u2", name: "Mehmet Demir",   avatar: "M", online: true,  handRaised: false },
  { id: "u3", name: "Zeynep Arslan",  avatar: "Z", online: false, handRaised: false },
  { id: "u4", name: "Ali Yılmaz",     avatar: "A", online: true,  handRaised: true  },
  { id: "u5", name: "Fatma Şahin",    avatar: "F", online: true,  handRaised: false },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function Spinner({ size = 20, light = false }: { size?: number; light?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2.5px solid ${light ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"}`,
        borderTopColor: light ? "#fff" : "var(--accent)",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function AvatarBubble({ name, avatar, online, handRaised }: Participant) {
  const colors = [
    "linear-gradient(135deg,#3b82f6,#6366f1)",
    "linear-gradient(135deg,#10b981,#059669)",
    "linear-gradient(135deg,#f59e0b,#d97706)",
    "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    "linear-gradient(135deg,#ef4444,#dc2626)",
    "linear-gradient(135deg,#06b6d4,#0891b2)",
  ];
  const bg = colors[name.charCodeAt(0) % colors.length];

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {/* Hand raised indicator */}
      {handRaised && (
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -4,
            fontSize: 16,
            zIndex: 2,
            animation: "handBounce 0.8s ease-in-out infinite alternate",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
          }}
        >
          ✋
        </div>
      )}

      {/* Avatar circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 800,
          color: "#fff",
          boxShadow: online ? "0 4px 14px rgba(0,0,0,0.25), 0 0 0 2px var(--accent)" : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "box-shadow 0.2s",
          position: "relative",
        }}
      >
        {avatar}
        {/* Online dot */}
        <div
          className={`status-dot ${online ? "online" : "offline"}`}
          style={{ position: "absolute", bottom: 1, right: 1, border: "2px solid var(--panel)" }}
        />
      </div>

      <span
        style={{
          fontSize: 11,
          color: "var(--ink-2)",
          fontWeight: 500,
          textAlign: "center",
          maxWidth: 64,
          wordBreak: "break-word",
          lineHeight: 1.3,
        }}
      >
        {name.split(" ")[0]}
      </span>
    </div>
  );
}

// ─── Poll form ────────────────────────────────────────────────────────────────

function PollForm({ onSubmit, onClose }: { onSubmit: (q: string, opts: string[]) => void; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);

  const updateOpt = (i: number, v: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));

  const handleSubmit = () => {
    const filled = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || filled.length < 2) return;
    onSubmit(question.trim(), filled);
  };

  return (
    <div
      className="animate-scale-in"
      style={{
        padding: 20,
        background: "var(--panel)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Anket Sorusu</span>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--line)",
            background: "var(--panel)", cursor: "pointer", fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--muted)",
          }}
        >
          ×
        </button>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Soru yazın…"
        style={{
          padding: "10px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--line)",
          background: "var(--panel)", color: "var(--ink)", fontSize: 14, width: "100%",
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {options.map((opt, i) => (
          <input
            key={i}
            value={opt}
            onChange={(e) => updateOpt(i, e.target.value)}
            placeholder={`Seçenek ${i + 1}`}
            style={{
              padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)",
              background: "var(--panel)", color: "var(--ink)", fontSize: 13,
            }}
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px", borderRadius: "var(--r-md)", border: "none",
          background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "var(--glow-blue)",
        }}
      >
        Anketi Başlat
      </button>
    </div>
  );
}

// ─── Breakout form ────────────────────────────────────────────────────────────

function BreakoutForm({ onSubmit, onClose }: { onSubmit: (count: number) => void; onClose: () => void }) {
  const [count, setCount] = useState(3);

  return (
    <div
      className="animate-scale-in"
      style={{
        padding: 20,
        background: "var(--panel)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Grup Sayısı</span>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--line)",
            background: "var(--panel)", cursor: "pointer", fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--muted)",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => setCount((c) => Math.max(2, c - 1))}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--line)",
            background: "var(--panel)", cursor: "pointer", fontSize: 18, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)",
          }}
        >
          −
        </button>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)", minWidth: 40, textAlign: "center" }}>
          {count}
        </span>
        <button
          onClick={() => setCount((c) => Math.min(10, c + 1))}
          style={{
            width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--line)",
            background: "var(--panel)", cursor: "pointer", fontSize: 18, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)",
          }}
        >
          +
        </button>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>grup oluşturulacak</span>
      </div>

      <button
        onClick={() => onSubmit(count)}
        style={{
          padding: "10px 20px", borderRadius: "var(--r-md)", border: "none",
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "var(--glow)",
        }}
      >
        Grupları Oluştur
      </button>
    </div>
  );
}

// ─── Participant Row (list view) ──────────────────────────────────────────────

function ParticipantRow({
  participant,
  onKick,
  onSpotlight,
  kicking,
  spotlighting,
}: {
  participant: Participant;
  onKick: (id: string) => void;
  onSpotlight: (id: string) => void;
  kicking: boolean;
  spotlighting: boolean;
}) {
  const colors = [
    "linear-gradient(135deg,#3b82f6,#6366f1)",
    "linear-gradient(135deg,#10b981,#059669)",
    "linear-gradient(135deg,#f59e0b,#d97706)",
    "linear-gradient(135deg,#8b5cf6,#7c3aed)",
    "linear-gradient(135deg,#ef4444,#dc2626)",
    "linear-gradient(135deg,#06b6d4,#0891b2)",
  ];
  const bg = colors[participant.name.charCodeAt(0) % colors.length];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--r-md)",
        background: participant.handRaised
          ? "color-mix(in srgb, var(--accent-3) 8%, var(--panel))"
          : "var(--panel)",
        border: `1px solid ${participant.handRaised ? "color-mix(in srgb, var(--accent-3) 40%, var(--line))" : "var(--line)"}`,
        transition: "all var(--t-fast)",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38, height: 38, borderRadius: "50%", background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0, position: "relative",
        }}
      >
        {participant.avatar}
        <div
          className={`status-dot ${participant.online ? "online" : "offline"}`}
          style={{ position: "absolute", bottom: 0, right: 0, border: "2px solid var(--panel)" }}
        />
      </div>

      {/* Name + status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {participant.name}
          </span>
          {participant.handRaised && <span style={{ fontSize: 14, flexShrink: 0 }}>✋</span>}
        </div>
        <span style={{ fontSize: 12, color: participant.online ? "var(--accent)" : "var(--muted)" }}>
          {participant.online ? "Çevrimiçi" : "Çevrimdışı"}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onSpotlight(participant.id)}
          disabled={spotlighting}
          title="Spotlight"
          style={{
            padding: "5px 12px", borderRadius: "var(--r-sm)",
            border: "1px solid var(--line)", background: "var(--panel)",
            color: "var(--ink-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all var(--t-fast)", opacity: spotlighting ? 0.6 : 1,
          }}
        >
          {spotlighting ? <Spinner size={12} /> : "⭐"} Öne Çıkar
        </button>
        <button
          onClick={() => onKick(participant.id)}
          disabled={kicking}
          title="Kick"
          style={{
            padding: "5px 12px", borderRadius: "var(--r-sm)",
            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
            color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            transition: "all var(--t-fast)", opacity: kicking ? 0.6 : 1,
          }}
        >
          {kicking ? <Spinner size={12} /> : "✕"} Çıkar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SmartClassroomPage() {
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [showBreakoutForm, setShowBreakoutForm] = useState(false);

  // Per-user action loading
  const [kickingUser, setKickingUser] = useState<string | null>(null);
  const [spotlightingUser, setSpotlightingUser] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const addLog = useCallback((action: string, detail: string, icon: string) => {
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, timestamp: new Date(), action, detail, icon },
    ]);
  }, []);

  const connect = useCallback(async () => {
    const sid = sessionIdInput.trim();
    if (!sid) return;
    setConnecting(true);
    setConnectError(null);
    setIsDemo(false);
    setLog([]);
    setSession(null);

    try {
      const data = await apiGet<SessionData>(`/smart-classroom/${sid}`);
      setSession(data);
      addLog("Oturuma bağlandı", `Oturum: ${sid}`, "🔗");
    } catch {
      // Demo fallback
      setSession({
        sessionId: sid,
        participants: DEMO_PARTICIPANTS,
        status: "RUNNING",
      });
      setIsDemo(true);
      addLog("Demo oturuma bağlandı", `Oturum: ${sid}`, "🔗");
    } finally {
      setConnecting(false);
    }
  }, [sessionIdInput, addLog]);

  const sendControl = useCallback(
    async (action: string, params?: Record<string, unknown>, icon = "⚙️", label?: string): Promise<boolean> => {
      if (!session) return false;
      try {
        await apiPost(`/smart-classroom/${session.sessionId}/control`, { action, params });
        addLog(label ?? action, params ? JSON.stringify(params) : "", icon);
        return true;
      } catch {
        if (isDemo) {
          addLog(label ?? action, params ? JSON.stringify(params) : "" , icon);
          return true;
        }
        return false;
      }
    },
    [session, isDemo, addLog]
  );

  const handleGlobalAction = useCallback(
    async (action: string, icon: string, label: string) => {
      setActionLoading(action);
      await sendControl(action, undefined, icon, label);
      setActionLoading(null);
    },
    [sendControl]
  );

  const handleKick = useCallback(
    async (userId: string) => {
      setKickingUser(userId);
      const ok = await sendControl("KICK_USER", { userId }, "✕", "Kullanıcı çıkarıldı");
      if (ok && session) {
        setSession((s) =>
          s ? { ...s, participants: s.participants.filter((p) => p.id !== userId) } : s
        );
      }
      setKickingUser(null);
    },
    [sendControl, session]
  );

  const handleSpotlight = useCallback(
    async (userId: string) => {
      setSpotlightingUser(userId);
      await sendControl("SPOTLIGHT_USER", { userId }, "⭐", "Kullanıcı öne çıkarıldı");
      setSpotlightingUser(null);
    },
    [sendControl]
  );

  const handlePoll = useCallback(
    async (question: string, options: string[]) => {
      setShowPollForm(false);
      await sendControl("POLL_START", { question, options }, "📊", `Anket başlatıldı: ${question}`);
    },
    [sendControl]
  );

  const handleBreakout = useCallback(
    async (groupCount: number) => {
      setShowBreakoutForm(false);
      await sendControl("BREAKOUT_CREATE", { groupCount }, "👥", `${groupCount} grup oluşturuldu`);
    },
    [sendControl]
  );

  const handleRaiseHandReset = useCallback(async () => {
    const ok = await sendControl("RAISE_HAND_RESET", undefined, "✋", "El kaldırmalar sıfırlandı");
    if (ok && session) {
      setSession((s) =>
        s ? { ...s, participants: s.participants.map((p) => ({ ...p, handRaised: false })) } : s
      );
    }
  }, [sendControl, session]);

  const onlineCount = session?.participants.filter((p) => p.online).length ?? 0;
  const handCount = session?.participants.filter((p) => p.handRaised).length ?? 0;

  // ─── Control buttons config ─────────────────────────────────────────────────

  type ControlBtn =
    | { type: "action"; action: string; icon: string; label: string; color: string; border: string }
    | { type: "custom"; icon: string; label: string; color: string; border: string; onClick: () => void };

  const controlButtons: ControlBtn[] = [
    { type: "action", action: "MUTE_ALL",         icon: "🔇", label: "Tümünü Sessize Al",     color: "linear-gradient(135deg,#1e40af,#1d4ed8)", border: "rgba(30,64,175,0.4)"  },
    { type: "action", action: "UNMUTE_ALL",        icon: "🔊", label: "Tümünün Sesini Aç",     color: "linear-gradient(135deg,#065f46,#047857)", border: "rgba(6,95,70,0.4)"   },
    { type: "action", action: "LOCK_ROOM",         icon: "🔒", label: "Odayı Kilitle",          color: "linear-gradient(135deg,#7c2d12,#b45309)", border: "rgba(124,45,18,0.4)" },
    { type: "action", action: "UNLOCK_ROOM",       icon: "🔓", label: "Kilidi Aç",              color: "linear-gradient(135deg,#14532d,#15803d)", border: "rgba(20,83,45,0.4)"  },
    { type: "custom",                              icon: "✋", label: "El Kaldırmaları Sıfırla", color: "linear-gradient(135deg,#92400e,#d97706)", border: "rgba(146,64,14,0.4)", onClick: handleRaiseHandReset },
    { type: "custom",                              icon: "📊", label: "Anket Başlat",           color: "linear-gradient(135deg,#312e81,#4338ca)", border: "rgba(49,46,129,0.4)", onClick: () => { setShowPollForm(true); setShowBreakoutForm(false); } },
    { type: "custom",                              icon: "👥", label: "Grup Oluştur",           color: "linear-gradient(135deg,#134e4a,#0d9488)", border: "rgba(19,78,74,0.4)",  onClick: () => { setShowBreakoutForm(true); setShowPollForm(false); } },
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes handBounce {
          from { transform: translateY(0) rotate(-10deg); }
          to   { transform: translateY(-4px) rotate(10deg); }
        }
        .animate-scale-in { animation: scaleIn 200ms cubic-bezier(.2,.6,.3,1) both; }
      `}</style>

      <div className="bg-canvas" />
      <div className="bg-grid" />

      <div className="page-shell" style={{ paddingBottom: 48 }}>
        {/* ── Hero / Header ── */}
        <div
          className="glass hero"
          style={{ borderRadius: "var(--r-xl)", padding: "32px 28px 26px", marginBottom: 24 }}
        >
          <div className="hero-content">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 60, height: 60, borderRadius: "var(--r-lg)",
                  background: "linear-gradient(135deg, #0c4a6e, #0369a1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                  boxShadow: "0 8px 24px rgba(3,105,161,0.45)",
                }}
              >
                🎓
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <h1
                    style={{
                      fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 800,
                      color: "var(--ink)", margin: 0, letterSpacing: "-0.03em",
                    }}
                  >
                    Akıllı Sınıf Kontrolü
                  </h1>
                  {session && (
                    <span
                      className="pill pill-sm"
                      style={{
                        background: "linear-gradient(135deg,rgba(6,95,70,0.15),rgba(5,150,105,0.15))",
                        borderColor: "rgba(5,150,105,0.4)", color: "#059669", fontWeight: 600,
                      }}
                    >
                      🟢 Bağlı
                    </span>
                  )}
                  {isDemo && (
                    <span className="pill pill-sm pill-dark">Demo Mod</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
                  Canlı ders oturumlarını yönet — katılımcılar, anketler ve breakout grupları
                </p>
              </div>
            </div>

            {/* Session connect row */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 220, maxWidth: 400 }}>
                <input
                  value={sessionIdInput}
                  onChange={(e) => setSessionIdInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
                  placeholder="Oturum ID girin…"
                  style={{
                    width: "100%", padding: "11px 16px",
                    borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
                    background: "var(--panel)", color: "var(--ink)", fontSize: 14,
                  }}
                />
              </div>
              <button
                onClick={connect}
                disabled={connecting || !sessionIdInput.trim()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 24px", borderRadius: "var(--r-md)", border: "none",
                  background: connecting
                    ? "color-mix(in srgb, var(--accent-2) 70%, transparent)"
                    : "linear-gradient(135deg, var(--accent-2), var(--accent))",
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  cursor: connecting || !sessionIdInput.trim() ? "not-allowed" : "pointer",
                  opacity: !sessionIdInput.trim() ? 0.55 : 1,
                  boxShadow: "var(--glow-blue)",
                  transition: "all var(--t-mid)",
                  whiteSpace: "nowrap",
                }}
              >
                {connecting ? <><Spinner light /><span>Bağlanıyor…</span></> : <><span>🔗</span><span>Bağlan</span></>}
              </button>
            </div>

            {connectError && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>{connectError}</p>
            )}
          </div>
        </div>

        {/* ── Session dashboard ── */}
        {session && (
          <div
            key={session.sessionId}
            className="animate-fade-slide-up"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
              {[
                { label: "Toplam Katılımcı", value: session.participants.length, icon: "👤", color: "var(--accent-2)" },
                { label: "Çevrimiçi",        value: onlineCount,                 icon: "🟢", color: "var(--accent)"   },
                { label: "El Kaldıran",       value: handCount,                  icon: "✋", color: "var(--accent-3)" },
                { label: "Oturum Durumu",     value: session.status === "RUNNING" ? "Canlı" : session.status, icon: "🔴", color: "#ef4444" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="metric"
                  style={{ gap: 8 }}
                >
                  <span style={{ fontSize: 20 }}>{stat.icon}</span>
                  <div className="value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Main grid: participants + controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>

              {/* Left: Participant list */}
              <div
                className="glass"
                style={{ borderRadius: "var(--r-lg)", padding: 20 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                    Katılımcılar
                    <span
                      style={{
                        marginLeft: 8, fontSize: 12, fontWeight: 600,
                        padding: "2px 8px", borderRadius: "var(--r-full)",
                        background: "var(--accent-soft)", color: "var(--accent)",
                        border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--line))",
                      }}
                    >
                      {session.participants.length}
                    </span>
                  </h2>

                  {/* Avatar grid preview */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {session.participants.slice(0, 5).map((p) => (
                      <AvatarBubble key={p.id} {...p} />
                    ))}
                  </div>
                </div>

                {/* Participant rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {session.participants.map((p) => (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      onKick={handleKick}
                      onSpotlight={handleSpotlight}
                      kicking={kickingUser === p.id}
                      spotlighting={spotlightingUser === p.id}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Controls + inline forms + log */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Control panel */}
                <div
                  className="glass"
                  style={{ borderRadius: "var(--r-lg)", padding: 20 }}
                >
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "0 0 14px" }}>
                    Kontrol Paneli
                  </h2>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {controlButtons.map((btn) => {
                      const isLoading =
                        btn.type === "action" && actionLoading === btn.action;

                      return (
                        <button
                          key={btn.label}
                          onClick={() => {
                            if (btn.type === "action") {
                              handleGlobalAction(btn.action, btn.icon, btn.label);
                            } else {
                              btn.onClick();
                            }
                          }}
                          disabled={isLoading}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 6, padding: "14px 8px",
                            borderRadius: "var(--r-md)",
                            background: btn.color,
                            border: `1px solid ${btn.border}`,
                            color: "#fff", fontSize: 12, fontWeight: 600,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            transition: "all var(--t-fast)",
                            boxShadow: `0 4px 14px ${btn.border}`,
                            opacity: isLoading ? 0.7 : 1,
                            minHeight: 72,
                            textAlign: "center",
                            lineHeight: 1.3,
                          }}
                          onMouseEnter={(e) => {
                            if (!isLoading) {
                              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = "";
                            (e.currentTarget as HTMLButtonElement).style.filter = "";
                          }}
                        >
                          {isLoading ? (
                            <Spinner size={18} light />
                          ) : (
                            <span style={{ fontSize: 22 }}>{btn.icon}</span>
                          )}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Poll form (inline) */}
                {showPollForm && (
                  <PollForm onSubmit={handlePoll} onClose={() => setShowPollForm(false)} />
                )}

                {/* Breakout form (inline) */}
                {showBreakoutForm && (
                  <BreakoutForm onSubmit={handleBreakout} onClose={() => setShowBreakoutForm(false)} />
                )}

                {/* Activity log */}
                <div
                  className="glass"
                  style={{ borderRadius: "var(--r-lg)", padding: 20 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                      Aktivite Günlüğü
                    </h2>
                    {log.length > 0 && (
                      <button
                        onClick={() => setLog([])}
                        style={{
                          fontSize: 11, color: "var(--muted)", background: "none", border: "none",
                          cursor: "pointer", padding: "2px 6px",
                        }}
                      >
                        Temizle
                      </button>
                    )}
                  </div>

                  <div
                    ref={logRef}
                    style={{
                      maxHeight: 260, overflowY: "auto",
                      display: "flex", flexDirection: "column", gap: 6,
                    }}
                  >
                    {log.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>
                        Henüz aktivite yok
                      </p>
                    ) : (
                      [...log].reverse().map((entry) => (
                        <div
                          key={entry.id}
                          className="animate-scale-in"
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "8px 10px", borderRadius: "var(--r-sm)",
                            background: "color-mix(in srgb, var(--line-2) 60%, var(--panel))",
                            border: "1px solid var(--line)",
                          }}
                        >
                          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{entry.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                              {entry.action}
                            </div>
                            {entry.detail && (
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, wordBreak: "break-word" }}>
                                {entry.detail}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 10, color: "var(--muted)", flexShrink: 0,
                              fontFamily: "monospace", marginTop: 2,
                            }}
                          >
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state — no session connected yet */}
        {!session && !connecting && (
          <div
            className="glass animate-fade-in"
            style={{
              borderRadius: "var(--r-xl)", padding: "56px 32px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80, height: 80, borderRadius: "var(--r-xl)",
                background: "color-mix(in srgb, var(--line-2) 80%, var(--panel))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 38,
              }}
            >
              🏫
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>
                Oturuma Bağlanın
              </h2>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, maxWidth: 360 }}>
                Yukarıdaki alana bir oturum ID girin ve "Bağlan" butonuna tıklayın.
                API erişimi yoksa demo veri otomatik yüklenir.
              </p>
            </div>

            {/* Quick demo button */}
            <button
              onClick={() => {
                setSessionIdInput("demo-session-001");
                setTimeout(() => {
                  setSessionIdInput("demo-session-001");
                }, 0);
              }}
              style={{
                padding: "9px 22px", borderRadius: "var(--r-full)",
                border: "1px dashed color-mix(in srgb, var(--accent-2) 50%, var(--line))",
                background: "var(--accent-2-soft)", color: "var(--ink-2)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all var(--t-fast)",
              }}
            >
              Demo ile dene: demo-session-001
            </button>
          </div>
        )}
      </div>
    </>
  );
}
