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
  type: "info" | "success" | "warn" | "error";
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PARTICIPANTS: Participant[] = [
  { id: "u1", name: "Ayşe Kaya",     avatar: "A", online: true,  handRaised: true  },
  { id: "u2", name: "Mehmet Demir",  avatar: "M", online: true,  handRaised: false },
  { id: "u3", name: "Zeynep Arslan", avatar: "Z", online: false, handRaised: false },
  { id: "u4", name: "Ali Yılmaz",    avatar: "A", online: true,  handRaised: true  },
  { id: "u5", name: "Fatma Şahin",   avatar: "F", online: true,  handRaised: false },
  { id: "u6", name: "Emre Kılıç",    avatar: "E", online: true,  handRaised: false },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = size;
  const icons: Record<string, JSX.Element> = {
    classroom: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20" /><path d="M4 20V6a2 2 0 012-2h12a2 2 0 012 2v14" />
        <path d="M10 9h4" /><path d="M10 13h4" /><path d="M8 17h8" />
        <rect x="10" y="16" width="4" height="4" rx="0.5" />
      </svg>
    ),
    link: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
    users: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    user: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    hand: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0" />
        <path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2" />
        <path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8" />
        <path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15" />
      </svg>
    ),
    signal: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="20" x2="2" y2="16" /><line x1="7" y1="20" x2="7" y2="11" />
        <line x1="12" y1="20" x2="12" y2="6" /><line x1="17" y1="20" x2="17" y2="2" />
      </svg>
    ),
    muteAll: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
        <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    unmuteAll: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    lock: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    unlock: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 019.9-1" />
      </svg>
    ),
    handReset: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    poll: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    breakout: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="7" height="7" rx="1" /><rect x="16" y="3" width="7" height="7" rx="1" />
        <rect x="8.5" y="14" width="7" height="7" rx="1" />
        <path d="M4.5 10v4h15V10" /><line x1="12" y1="14" x2="12" y2="10" />
      </svg>
    ),
    spotlight: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    kick: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 11a4 4 0 10-8 0 4 4 0 008 0z" />
        <path d="M6 21v-1a6 6 0 0112 0v1" /><line x1="18" y1="6" x2="22" y2="10" />
        <line x1="22" y1="6" x2="18" y2="10" />
      </svg>
    ),
    trash: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
    ),
    activity: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    close: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    send: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
    check: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    info: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" strokeWidth={2.5} />
        <line x1="12" y1="12" x2="12" y2="16" />
      </svg>
    ),
    warn: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    plus: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    minus: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  };
  return icons[name] ?? <svg width={s} height={s} viewBox="0 0 24 24" />;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        animation: "scSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#5B6EFF,#9B59FF)",
  "linear-gradient(135deg,#00D4B4,#5B6EFF)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#8b5cf6,#7c3aed)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

function Avatar({ name, online, handRaised, size = 44 }: { name: string; online: boolean; handRaised: boolean; size?: number }) {
  const bg = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%", background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, fontWeight: 800, color: "#fff",
          boxShadow: online
            ? "0 0 0 2.5px var(--accent), 0 4px 14px rgba(91,110,255,0.3)"
            : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "box-shadow 0.3s",
        }}
      >
        {name[0]?.toUpperCase()}
      </div>
      {/* Online dot */}
      <div
        style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.27, height: size * 0.27, borderRadius: "50%",
          background: online ? "#22c55e" : "var(--muted)",
          border: "2px solid var(--panel)",
          transition: "background 0.3s",
        }}
      />
      {/* Hand raised badge */}
      {handRaised && (
        <div
          style={{
            position: "absolute", top: -4, right: -4,
            width: 20, height: 20, borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b,#d97706)",
            border: "2px solid var(--panel)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "scHandPulse 1.2s ease-in-out infinite",
            boxShadow: "0 2px 8px rgba(245,158,11,0.5)",
          }}
        >
          <Icon name="hand" size={10} />
        </div>
      )}
    </div>
  );
}

// ─── Participant Row ──────────────────────────────────────────────────────────

function ParticipantRow({
  participant, onKick, onSpotlight, kicking, spotlighting,
}: {
  participant: Participant;
  onKick: (id: string) => void;
  onSpotlight: (id: string) => void;
  kicking: boolean;
  spotlighting: boolean;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: "var(--r-md)",
        background: participant.online
          ? "color-mix(in srgb, var(--accent) 4%, var(--panel))"
          : "var(--panel)",
        border: `1px solid ${participant.online ? "color-mix(in srgb, var(--accent) 20%, var(--line))" : "var(--line)"}`,
        transition: "all var(--t-fast)",
      }}
    >
      <Avatar name={participant.name} online={participant.online} handRaised={participant.handRaised} size={40} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", truncate: "ellipsis" }}>
          {participant.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span
            style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
              color: participant.online ? "#22c55e" : "var(--muted)",
            }}
          >
            {participant.online ? "ÇEVRİMİÇİ" : "ÇEVRIMDIŞI"}
          </span>
          {participant.handRaised && (
            <span
              style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 600, color: "#f59e0b",
                padding: "1px 6px", borderRadius: "var(--r-full)",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <Icon name="hand" size={9} /> El kaldırdı
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onSpotlight(participant.id)}
          disabled={spotlighting}
          title="Öne Çıkar"
          style={{
            width: 30, height: 30, borderRadius: "var(--r-sm)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--line))",
            background: "var(--accent-soft)", color: "var(--accent)",
            cursor: spotlighting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--t-fast)",
            opacity: spotlighting ? 0.6 : 1,
          }}
        >
          {spotlighting ? <Spinner size={12} /> : <Icon name="spotlight" size={13} />}
        </button>
        <button
          onClick={() => onKick(participant.id)}
          disabled={kicking}
          title="Çıkar"
          style={{
            width: 30, height: 30, borderRadius: "var(--r-sm)",
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.07)", color: "#ef4444",
            cursor: kicking ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--t-fast)",
            opacity: kicking ? 0.6 : 1,
          }}
        >
          {kicking ? <Spinner size={12} /> : <Icon name="kick" size={13} />}
        </button>
      </div>
    </div>
  );
}

// ─── Poll Form ────────────────────────────────────────────────────────────────

function PollForm({ onSubmit, onClose }: { onSubmit: (q: string, opts: string[]) => void; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);

  return (
    <div
      className="animate-scale-in"
      style={{
        padding: 18, background: "var(--panel)", borderRadius: "var(--r-lg)",
        border: "1.5px solid color-mix(in srgb, var(--accent-2) 30%, var(--line))",
        boxShadow: "var(--glow-blue)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "var(--r-sm)",
            background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="poll" size={14} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Anket Oluştur</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 26, height: 26, borderRadius: "50%",
            border: "1px solid var(--line)", background: "var(--panel)",
            cursor: "pointer", color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="close" size={12} />
        </button>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Sorunuzu yazın…"
        style={{
          width: "100%", padding: "10px 14px", marginBottom: 10,
          borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
          background: "color-mix(in srgb, var(--line) 20%, var(--panel))",
          color: "var(--ink)", fontSize: 14, boxSizing: "border-box",
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
        {options.map((opt, i) => (
          <input
            key={i}
            value={opt}
            onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? e.target.value : o))}
            placeholder={`Seçenek ${i + 1}`}
            style={{
              padding: "8px 12px", borderRadius: "var(--r-md)",
              border: "1.5px solid var(--line)",
              background: "color-mix(in srgb, var(--line) 20%, var(--panel))",
              color: "var(--ink)", fontSize: 13,
            }}
          />
        ))}
      </div>

      <button
        onClick={() => {
          const filled = options.filter((o) => o.trim());
          if (!question.trim() || filled.length < 2) return;
          onSubmit(question.trim(), filled);
        }}
        style={{
          width: "100%", padding: "10px", borderRadius: "var(--r-md)",
          border: "none", background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: "var(--glow-blue)",
        }}
      >
        <Icon name="send" size={14} /> Anketi Başlat
      </button>
    </div>
  );
}

// ─── Breakout Form ────────────────────────────────────────────────────────────

function BreakoutForm({ onSubmit, onClose }: { onSubmit: (count: number) => void; onClose: () => void }) {
  const [count, setCount] = useState(3);

  return (
    <div
      className="animate-scale-in"
      style={{
        padding: 18, background: "var(--panel)", borderRadius: "var(--r-lg)",
        border: "1.5px solid color-mix(in srgb, var(--accent-3) 30%, var(--line))",
        boxShadow: "0 4px 20px color-mix(in srgb, var(--accent-3) 20%, transparent)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "var(--r-sm)",
            background: "linear-gradient(135deg,var(--accent-3),#059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="breakout" size={14} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Grup Oluştur</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 26, height: 26, borderRadius: "50%",
            border: "1px solid var(--line)", background: "var(--panel)",
            cursor: "pointer", color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="close" size={12} />
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600, display: "block", marginBottom: 8 }}>
          Grup Sayısı
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setCount((c) => Math.max(2, c - 1))}
            style={{
              width: 34, height: 34, borderRadius: "var(--r-sm)",
              border: "1.5px solid var(--line)", background: "var(--panel)",
              color: "var(--ink)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="minus" size={16} />
          </button>
          <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)", minWidth: 40, textAlign: "center" }}>
            {count}
          </span>
          <button
            onClick={() => setCount((c) => Math.min(10, c + 1))}
            style={{
              width: 34, height: 34, borderRadius: "var(--r-sm)",
              border: "1.5px solid var(--line)", background: "var(--panel)",
              color: "var(--ink)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="plus" size={16} />
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>grup (max 10)</span>
        </div>
      </div>

      <button
        onClick={() => onSubmit(count)}
        style={{
          width: "100%", padding: "10px", borderRadius: "var(--r-md)",
          border: "none", background: "linear-gradient(135deg,var(--accent-3),#059669)",
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}
      >
        <Icon name="check" size={14} /> Grupları Oluştur
      </button>
    </div>
  );
}

// ─── Log entry color map ──────────────────────────────────────────────────────

const LOG_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  info:    { bg: "color-mix(in srgb,var(--accent) 7%,var(--panel))",    border: "color-mix(in srgb,var(--accent) 20%,var(--line))",    icon: "var(--accent)"   },
  success: { bg: "color-mix(in srgb,#22c55e 7%,var(--panel))",          border: "rgba(34,197,94,0.25)",                                 icon: "#22c55e"         },
  warn:    { bg: "color-mix(in srgb,#f59e0b 7%,var(--panel))",          border: "rgba(245,158,11,0.25)",                                icon: "#f59e0b"         },
  error:   { bg: "color-mix(in srgb,#ef4444 7%,var(--panel))",          border: "rgba(239,68,68,0.25)",                                 icon: "#ef4444"         },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SmartClassroomPage() {
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [showBreakoutForm, setShowBreakoutForm] = useState(false);
  const [kickingUser, setKickingUser] = useState<string | null>(null);
  const [spotlightingUser, setSpotlightingUser] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session duration timer
  useEffect(() => {
    if (session) {
      setSessionDuration(0);
      timerRef.current = setInterval(() => setSessionDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.sessionId]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}s ${m}d ${s}sn`;
    if (m > 0) return `${m}d ${s}sn`;
    return `${s}sn`;
  };

  const addLog = useCallback((action: string, detail: string, type: LogEntry["type"] = "info") => {
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, timestamp: new Date(), action, detail, type },
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
      addLog("Oturuma bağlandı", `Oturum: ${sid}`, "success");
    } catch {
      setSession({ sessionId: sid, participants: DEMO_PARTICIPANTS, status: "RUNNING" });
      setIsDemo(true);
      addLog("Demo oturuma bağlandı", `ID: ${sid} — API erişilemedi`, "warn");
    } finally {
      setConnecting(false);
    }
  }, [sessionIdInput, addLog]);

  const sendControl = useCallback(
    async (action: string, params?: Record<string, unknown>, label?: string, type: LogEntry["type"] = "info"): Promise<boolean> => {
      if (!session) return false;
      try {
        await apiPost(`/smart-classroom/${session.sessionId}/control`, { action, params });
        addLog(label ?? action, params ? JSON.stringify(params) : "", "success");
        return true;
      } catch {
        if (isDemo) {
          addLog(label ?? action, params ? JSON.stringify(params) : "", type);
          return true;
        }
        addLog(`Hata: ${label ?? action}`, "İşlem başarısız", "error");
        return false;
      }
    },
    [session, isDemo, addLog]
  );

  const handleGlobalAction = useCallback(
    async (action: string, label: string) => {
      setActionLoading(action);
      await sendControl(action, undefined, label, "success");
      setActionLoading(null);
    },
    [sendControl]
  );

  const handleKick = useCallback(async (userId: string) => {
    setKickingUser(userId);
    const name = session?.participants.find((p) => p.id === userId)?.name ?? userId;
    const ok = await sendControl("KICK_USER", { userId }, `${name} çıkarıldı`, "warn");
    if (ok) setSession((s) => s ? { ...s, participants: s.participants.filter((p) => p.id !== userId) } : s);
    setKickingUser(null);
  }, [sendControl, session]);

  const handleSpotlight = useCallback(async (userId: string) => {
    setSpotlightingUser(userId);
    const name = session?.participants.find((p) => p.id === userId)?.name ?? userId;
    await sendControl("SPOTLIGHT_USER", { userId }, `${name} öne çıkarıldı`, "info");
    setSpotlightingUser(null);
  }, [sendControl, session]);

  const handlePoll = useCallback(async (question: string, options: string[]) => {
    setShowPollForm(false);
    await sendControl("POLL_START", { question, options }, `Anket: ${question}`, "info");
  }, [sendControl]);

  const handleBreakout = useCallback(async (groupCount: number) => {
    setShowBreakoutForm(false);
    await sendControl("BREAKOUT_CREATE", { groupCount }, `${groupCount} breakout grubu oluşturuldu`, "success");
  }, [sendControl]);

  const handleRaiseHandReset = useCallback(async () => {
    const ok = await sendControl("RAISE_HAND_RESET", undefined, "El kaldırmalar sıfırlandı", "info");
    if (ok) setSession((s) => s ? { ...s, participants: s.participants.map((p) => ({ ...p, handRaised: false })) } : s);
  }, [sendControl]);

  const onlineCount = session?.participants.filter((p) => p.online).length ?? 0;
  const handCount = session?.participants.filter((p) => p.handRaised).length ?? 0;

  // ─── Control buttons ────────────────────────────────────────────────────────

  type CtrlBtn =
    | { type: "action"; action: string; icon: string; label: string; grad: string; glow: string }
    | { type: "custom";              icon: string; label: string; grad: string; glow: string; onClick: () => void };

  const controlButtons: CtrlBtn[] = [
    { type: "action", action: "MUTE_ALL",   icon: "muteAll",   label: "Tümünü Sessize",  grad: "linear-gradient(135deg,#1e40af,#2563eb)", glow: "0 4px 14px rgba(30,64,175,0.45)"  },
    { type: "action", action: "UNMUTE_ALL", icon: "unmuteAll", label: "Sesi Geri Aç",    grad: "linear-gradient(135deg,#065f46,#059669)", glow: "0 4px 14px rgba(6,95,70,0.4)"     },
    { type: "action", action: "LOCK_ROOM",  icon: "lock",      label: "Odayı Kilitle",   grad: "linear-gradient(135deg,#7c2d12,#c2410c)", glow: "0 4px 14px rgba(124,45,18,0.4)"  },
    { type: "action", action: "UNLOCK_ROOM",icon: "unlock",    label: "Kilidi Aç",       grad: "linear-gradient(135deg,#14532d,#16a34a)", glow: "0 4px 14px rgba(20,83,45,0.4)"   },
    { type: "custom",                       icon: "handReset", label: "El Sıfırla",      grad: "linear-gradient(135deg,#92400e,#d97706)", glow: "0 4px 14px rgba(146,64,14,0.4)",  onClick: handleRaiseHandReset },
    { type: "custom",                       icon: "poll",      label: "Anket Başlat",    grad: "linear-gradient(135deg,var(--accent-2),var(--accent))", glow: "var(--glow-blue)",    onClick: () => { setShowPollForm(true); setShowBreakoutForm(false); } },
    { type: "custom",                       icon: "breakout",  label: "Grup Oluştur",    grad: "linear-gradient(135deg,var(--accent-3),#059669)", glow: "0 4px 14px rgba(0,212,180,0.35)", onClick: () => { setShowBreakoutForm(true); setShowPollForm(false); } },
  ];

  return (
    <>
      <style>{`
        @keyframes scSpin { to { transform: rotate(360deg); } }
        @keyframes scHandPulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes scFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sc-ctrl-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .sc-participant-row:hover { border-color: color-mix(in srgb,var(--accent) 30%,var(--line)) !important; }
      `}</style>

      <div className="bg-canvas" /><div className="bg-grid" />

      <div className="page-shell" style={{ paddingBottom: 48 }}>

        {/* ── Hero ── */}
        <div
          className="glass"
          style={{
            borderRadius: "var(--r-xl)", marginBottom: 24,
            background: "linear-gradient(135deg, color-mix(in srgb,var(--accent-2) 8%,var(--panel)) 0%, color-mix(in srgb,var(--accent) 5%,var(--panel)) 100%)",
            border: "1.5px solid color-mix(in srgb,var(--accent) 20%,var(--line))",
            padding: "28px 28px 24px",
            boxShadow: "var(--glow-blue)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
            {/* Icon */}
            <div
              style={{
                width: 56, height: 56, borderRadius: "var(--r-lg)", flexShrink: 0,
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--glow-blue)",
              }}
            >
              <Icon name="classroom" size={26} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
                <h1 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.03em" }}>
                  Akıllı Sınıf Kontrolü
                </h1>
                {session && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "3px 10px", borderRadius: "var(--r-full)",
                    background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)",
                    color: "#22c55e",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "scHandPulse 1.5s infinite" }} />
                    CANLI
                  </span>
                )}
                {isDemo && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    padding: "3px 10px", borderRadius: "var(--r-full)",
                    background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                    color: "#f59e0b",
                  }}>
                    DEMO
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
                Canlı ders oturumlarını yönet — katılımcılar, anketler, breakout grupları
              </p>
            </div>

            {session && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 2 }}>SÜRE</div>
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                  {formatDuration(sessionDuration)}
                </div>
              </div>
            )}
          </div>

          {/* Session connect */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                flex: 1, minWidth: 220, maxWidth: 380,
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 14px", height: 44,
                borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
                background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
              }}
            >
              <Icon name="link" size={14} />
              <input
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connect()}
                placeholder="Oturum ID girin (örn: cls-2024-A1)…"
                style={{
                  flex: 1, border: "none", background: "transparent",
                  color: "var(--ink)", fontSize: 14, outline: "none",
                }}
              />
            </div>
            <button
              onClick={connect}
              disabled={connecting || !sessionIdInput.trim()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "0 24px", height: 44,
                borderRadius: "var(--r-md)", border: "none",
                background: connecting || !sessionIdInput.trim()
                  ? "color-mix(in srgb,var(--accent) 40%,var(--line))"
                  : "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: connecting || !sessionIdInput.trim() ? "not-allowed" : "pointer",
                boxShadow: sessionIdInput.trim() && !connecting ? "var(--glow-blue)" : "none",
                transition: "all var(--t-mid)", whiteSpace: "nowrap",
              }}
            >
              {connecting ? <><Spinner size={16} /><span>Bağlanıyor…</span></> : <><Icon name="link" size={15} /><span>Bağlan</span></>}
            </button>
            {!session && (
              <button
                onClick={() => { setSessionIdInput("demo-cls-001"); setTimeout(connect, 50); }}
                style={{
                  padding: "0 16px", height: 44,
                  borderRadius: "var(--r-md)",
                  border: "1.5px dashed color-mix(in srgb,var(--accent-2) 40%,var(--line))",
                  background: "transparent", color: "var(--ink-2)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Demo Dene
              </button>
            )}
          </div>

          {connectError && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="warn" size={14} /> {connectError}
            </p>
          )}
        </div>

        {/* ── Session Dashboard ── */}
        {session && (
          <div key={session.sessionId} style={{ animation: "scFadeIn 0.4s cubic-bezier(.2,.6,.3,1) both", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
              {[
                { label: "Katılımcı", value: session.participants.length,   icon: "users",   grad: "linear-gradient(135deg,var(--accent-2),var(--accent))" },
                { label: "Çevrimiçi",  value: onlineCount,                  icon: "signal",  grad: "linear-gradient(135deg,#22c55e,#16a34a)"               },
                { label: "El Kaldıran",value: handCount,                    icon: "hand",    grad: "linear-gradient(135deg,#f59e0b,#d97706)"               },
                { label: "Oturum",     value: session.status === "RUNNING" ? "Canlı" : session.status, icon: "activity", grad: "linear-gradient(135deg,#ef4444,#dc2626)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass"
                  style={{
                    borderRadius: "var(--r-lg)", padding: "16px 18px",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "var(--r-md)",
                      background: stat.grad,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    <Icon name={stat.icon} size={17} />
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.03em" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Main grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>

              {/* Left: Participants */}
              <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "var(--r-sm)",
                      background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="users" size={15} />
                    </div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                      Katılımcılar
                    </h2>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px",
                      borderRadius: "var(--r-full)",
                      background: "var(--accent-soft)", color: "var(--accent)",
                      border: "1px solid color-mix(in srgb,var(--accent) 30%,var(--line))",
                    }}>
                      {session.participants.length}
                    </span>
                  </div>

                  {/* Avatar strip */}
                  <div style={{ display: "flex", gap: -8 }}>
                    {session.participants.slice(0, 6).map((p, i) => (
                      <div key={p.id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 6 - i }}>
                        <Avatar name={p.name} online={p.online} handRaised={false} size={28} />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {session.participants.map((p) => (
                    <ParticipantRow
                      key={p.id} participant={p}
                      onKick={handleKick} onSpotlight={handleSpotlight}
                      kicking={kickingUser === p.id} spotlighting={spotlightingUser === p.id}
                    />
                  ))}
                </div>
              </div>

              {/* Right: Controls + Forms + Log */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Control panel */}
                <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "var(--r-sm)",
                      background: "linear-gradient(135deg,#7c3aed,#5B6EFF)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="spotlight" size={14} />
                    </div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Kontroller</h2>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {controlButtons.map((btn) => {
                      const isLoading = btn.type === "action" && actionLoading === btn.action;
                      return (
                        <button
                          key={btn.label}
                          className="sc-ctrl-btn"
                          onClick={() => btn.type === "action" ? handleGlobalAction(btn.action, btn.label) : btn.onClick()}
                          disabled={isLoading}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 7, padding: "14px 8px",
                            minHeight: 70, borderRadius: "var(--r-md)",
                            background: btn.grad, border: "1px solid rgba(255,255,255,0.08)",
                            color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            transition: "all var(--t-fast)",
                            boxShadow: btn.glow,
                            opacity: isLoading ? 0.7 : 1,
                            textAlign: "center", lineHeight: 1.3,
                          }}
                        >
                          {isLoading ? <Spinner size={18} /> : <Icon name={btn.icon} size={18} />}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Poll form */}
                {showPollForm && (
                  <PollForm onSubmit={handlePoll} onClose={() => setShowPollForm(false)} />
                )}

                {/* Breakout form */}
                {showBreakoutForm && (
                  <BreakoutForm onSubmit={handleBreakout} onClose={() => setShowBreakoutForm(false)} />
                )}

                {/* Activity log */}
                <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "var(--r-sm)",
                        background: "linear-gradient(135deg,#374151,#6b7280)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name="activity" size={13} />
                      </div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                        Aktivite Günlüğü
                        {log.length > 0 && (
                          <span style={{
                            marginLeft: 7, fontSize: 10, fontWeight: 700,
                            padding: "1px 6px", borderRadius: "var(--r-full)",
                            background: "var(--accent-soft)", color: "var(--accent)",
                          }}>
                            {log.length}
                          </span>
                        )}
                      </h2>
                    </div>
                    {log.length > 0 && (
                      <button
                        onClick={() => setLog([])}
                        style={{
                          fontSize: 11, color: "var(--muted)", background: "none",
                          border: "none", cursor: "pointer", padding: "2px 6px",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <Icon name="trash" size={11} /> Temizle
                      </button>
                    )}
                  </div>

                  <div
                    ref={logRef}
                    style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    {log.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>Henüz aktivite yok</div>
                      </div>
                    ) : (
                      [...log].reverse().map((entry) => {
                        const c = LOG_COLORS[entry.type] ?? LOG_COLORS.info;
                        return (
                          <div
                            key={entry.id}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 9,
                              padding: "8px 10px", borderRadius: "var(--r-sm)",
                              background: c.bg, border: `1px solid ${c.border}`,
                              animation: "scFadeIn 0.2s both",
                            }}
                          >
                            <div style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>
                              <Icon name={entry.type === "error" ? "warn" : entry.type === "success" ? "check" : "info"} size={12} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{entry.action}</div>
                              {entry.detail && (
                                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, wordBreak: "break-word" }}>
                                  {entry.detail}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "monospace", flexShrink: 0, marginTop: 2 }}>
                              {entry.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!session && !connecting && (
          <div
            className="glass"
            style={{
              borderRadius: "var(--r-xl)", padding: "64px 32px",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 18, textAlign: "center",
              animation: "scFadeIn 0.4s both",
            }}
          >
            <div
              style={{
                width: 80, height: 80, borderRadius: "var(--r-xl)",
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--glow-blue)",
                animation: "scHandPulse 3s ease-in-out infinite",
              }}
            >
              <Icon name="classroom" size={38} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 10px", letterSpacing: "-0.03em" }}>
                Oturuma Bağlanın
              </h2>
              <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, maxWidth: 380, lineHeight: 1.7 }}>
                Yukarıdaki alana bir oturum ID girin ve <strong style={{ color: "var(--ink-2)" }}>Bağlan</strong> butonuna tıklayın.
                API erişimi olmadığında demo veri otomatik yüklenir.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {["demo-cls-001", "demo-cls-002", "test-room-A"].map((id) => (
                <button
                  key={id}
                  onClick={() => { setSessionIdInput(id); }}
                  style={{
                    padding: "8px 18px", borderRadius: "var(--r-full)",
                    border: "1.5px dashed color-mix(in srgb,var(--accent) 35%,var(--line))",
                    background: "var(--accent-soft)", color: "var(--ink-2)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all var(--t-fast)",
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
