"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WhiteboardLocal, WhiteboardLocalHandle, WhiteboardTool } from "./whiteboard-local";

// ─── API Base ────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
function authHeader() {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Types ───────────────────────────────────────────────────────────────────
type RightPanel = "ai" | "brainstorm" | "magic" | "layers" | null;
type ToolDef = { id: WhiteboardTool | "undo" | "redo" | "clear" | "download"; label: string; icon: React.ReactNode; group?: "action" };

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Icon = {
  Cursor: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l14 9-7 1-3 7z" />
    </svg>
  ),
  Pen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  Highlighter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 11-6 6v3h3l6-6m2-13 6 6-10 10" />
    </svg>
  ),
  Eraser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
    </svg>
  ),
  Text: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  Rect: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" /><polyline points="13 5 19 5 19 11" />
    </svg>
  ),
  Note: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  Laser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="m4.9 4.9 2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
    </svg>
  ),
  Pan: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M3 13A9 9 0 1 0 5.7 5.7L3 7" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" /><path d="M21 13A9 9 0 1 1 18.3 5.7L21 7" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  AI: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
      <path d="M9 17v1a3 3 0 0 0 6 0v-1M12 17v4" />
      <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  Bulb: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </svg>
  ),
  Magic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M12.2 11.8 11 13" />
      <path d="M3 21 12 12" /><path d="M12.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Sparkle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  ),
};

// ─── Color Palette ───────────────────────────────────────────────────────────
const COLORS = [
  "#E4E9FF", "#FF4D6A", "#FF8A50", "#FFD166", "#06D6A0",
  "#00D4B4", "#5B6EFF", "#9B59FF", "#FF6BCC", "#FFFFFF",
  "#0F1135", "#1A1F3D",
];

const STROKE_WIDTHS = [2, 4, 6, 10, 16];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const wbRef = useRef<WhiteboardLocalHandle>(null);

  // Tool state
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState("#E4E9FF");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("Tahta — Demo");
  const [sessionStatus, setSessionStatus] = useState<"idle" | "connecting" | "live">("idle");

  // AI Assist state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  // Brainstorm state
  const [bsTopic, setBsTopic] = useState("");
  const [bsCount, setBsCount] = useState(6);
  const [bsLoading, setBsLoading] = useState(false);
  const [bsNotes, setBsNotes] = useState<string[]>([]);

  // Magic Switch state
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicDoc, setMagicDoc] = useState<string | null>(null);

  // Layers state
  const [layers, setLayers] = useState<string[]>(["Katman 1"]);
  const [activeLayer, setActiveLayer] = useState("Katman 1");

  // ── Tool selection ──────────────────────────────────────────────────────────
  const handleTool = useCallback((tool: WhiteboardTool) => {
    setActiveTool(tool);
    wbRef.current?.setTool(tool);
  }, []);

  // ── Color / width ───────────────────────────────────────────────────────────
  useEffect(() => { wbRef.current?.setColor(color); }, [color]);
  useEffect(() => { wbRef.current?.setWidth(strokeWidth); }, [strokeWidth]);

  // ── Start live session ──────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setSessionStatus("connecting");
    try {
      const res = await fetch(`${API}/whiteboard/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ liveSessionId: `session-${Date.now()}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.sessionId ?? data.id ?? `session-${Date.now()}`);
        setSessionStatus("live");
      } else {
        setSessionStatus("idle");
      }
    } catch {
      setSessionStatus("idle");
    }
  }, []);

  // ── AI Assist ───────────────────────────────────────────────────────────────
  const runAiAssist = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data.suggestion ?? JSON.stringify(data, null, 2));
      } else {
        setAiResult("AI servisi şu an yanıt vermiyor. Lütfen tekrar deneyin.");
      }
    } catch {
      setAiResult("Bağlantı hatası. API çalışıyor mu?");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, sessionId]);

  // ── AI Brainstorm ───────────────────────────────────────────────────────────
  const runBrainstorm = useCallback(async () => {
    if (!bsTopic.trim()) return;
    setBsLoading(true);
    setBsNotes([]);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/sticky-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ topic: bsTopic, count: bsCount, language: "tr" }),
      });
      if (res.ok) {
        const data = await res.json();
        const notes: string[] = Array.isArray(data.notes)
          ? data.notes
          : Array.isArray(data)
          ? data
          : [String(data)];
        setBsNotes(notes);
        notes.forEach((n) => wbRef.current?.addNote(n));
      } else {
        setBsNotes(["Beyin fırtınası servisi yanıt vermedi."]);
      }
    } catch {
      setBsNotes(["Bağlantı hatası."]);
    } finally {
      setBsLoading(false);
    }
  }, [bsTopic, bsCount, sessionId]);

  // ── Magic Switch ────────────────────────────────────────────────────────────
  const runMagicSwitch = useCallback(async () => {
    setMagicLoading(true);
    setMagicDoc(null);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ language: "tr" }),
      });
      if (res.ok) {
        const data = await res.json();
        setMagicDoc(
          typeof data.document === "string"
            ? data.document
            : data.content ?? JSON.stringify(data, null, 2)
        );
      } else {
        setMagicDoc("Dönüştürme servisi yanıt vermedi.");
      }
    } catch {
      setMagicDoc("Bağlantı hatası.");
    } finally {
      setMagicLoading(false);
    }
  }, [sessionId]);

  // ── Add layer ───────────────────────────────────────────────────────────────
  const addLayer = useCallback(() => {
    const name = `Katman ${layers.length + 1}`;
    setLayers((p) => [...p, name]);
    setActiveLayer(name);
  }, [layers]);

  // ─── Left Toolbar Items ─────────────────────────────────────────────────────
  const toolGroups: { tools: { id: WhiteboardTool; label: string; icon: React.ReactNode }[] }[] = [
    {
      tools: [
        { id: "cursor", label: "Seç", icon: <Icon.Cursor /> },
        { id: "pan", label: "Kaydır", icon: <Icon.Pan /> },
      ],
    },
    {
      tools: [
        { id: "pen", label: "Kalem", icon: <Icon.Pen /> },
        { id: "highlighter", label: "Fosforlu Kalem", icon: <Icon.Highlighter /> },
        { id: "eraser", label: "Silgi", icon: <Icon.Eraser /> },
        { id: "laser", label: "Lazer", icon: <Icon.Laser /> },
      ],
    },
    {
      tools: [
        { id: "text", label: "Metin", icon: <Icon.Text /> },
        { id: "note", label: "Not Kartı", icon: <Icon.Note /> },
        { id: "rect", label: "Dikdörtgen", icon: <Icon.Rect /> },
        { id: "circle", label: "Daire", icon: <Icon.Circle /> },
        { id: "arrow", label: "Ok", icon: <Icon.Arrow /> },
      ],
    },
  ];

  const toggleRight = (p: RightPanel) =>
    setRightPanel((prev) => (prev === p ? null : p));

  const bgCanvas = "#0B0D1E"; // fixed dark canvas for drawing

  return (
    <div
      style={{
        display: "flex", flexDirection: "column",
        margin: "-28px",
        width: "calc(100% + 56px)",
        height: "calc(100vh - 148px)",
        overflow: "hidden",
        background: "var(--bg)",
        borderRadius: 0,
      }}
    >
      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 52,
          gap: 12,
          flexShrink: 0,
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Brand + back */}
        <a
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            style={{ width: 16, height: 16 }}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Dashboard
        </a>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "var(--line)" }} />

        {/* Room name */}
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            outline: "none",
            flex: 1,
            minWidth: 0,
          }}
        />

        {/* Session status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {sessionStatus === "live" ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
              color: "var(--success)", background: "rgba(0,212,180,0.10)",
              border: "1px solid rgba(0,212,180,0.25)", borderRadius: 99, padding: "3px 10px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00D4B4", animation: "pingDot 1.5s ease-in-out infinite" }} />
              CANLI
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
              color: "var(--muted)", background: "var(--card-2)",
              border: "1px solid var(--line)", borderRadius: 99, padding: "3px 10px",
            }}>
              YEREL
            </span>
          )}
        </div>

        {/* Right action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {sessionStatus !== "live" && (
            <button
              onClick={startSession}
              disabled={sessionStatus === "connecting"}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, var(--brand-a), var(--brand-b))",
                color: "#fff",
              }}
            >
              {sessionStatus === "connecting" ? "Bağlanıyor…" : "Canlı Başlat"}
            </button>
          )}
          <button
            onClick={() => wbRef.current?.download()}
            title="PNG olarak indir"
            style={headerBtnStyle}
          >
            <span style={{ width: 16, height: 16, display: "flex" }}><Icon.Download /></span>
          </button>
        </div>

        {/* Right panel toggles */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }}>
          {[
            { id: "ai" as RightPanel, icon: <Icon.AI />, label: "AI Asistan", color: "#5B6EFF" },
            { id: "brainstorm" as RightPanel, icon: <Icon.Bulb />, label: "Beyin Fırtınası", color: "#9B59FF" },
            { id: "magic" as RightPanel, icon: <Icon.Magic />, label: "Sihirli Dönüştür", color: "#00D4B4" },
            { id: "layers" as RightPanel, icon: <Icon.Layers />, label: "Katmanlar", color: "#FFB347" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => toggleRight(btn.id)}
              title={btn.label}
              style={{
                ...headerBtnStyle,
                ...(rightPanel === btn.id ? { color: btn.color, background: `${btn.color}18` } : {}),
              }}
            >
              <span style={{ width: 16, height: 16, display: "flex" }}>{btn.icon}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ══ MAIN AREA ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── LEFT TOOLBAR ────────────────────────────────────────────────── */}
        <aside
          style={{
            width: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "10px 6px",
            background: "var(--card)",
            borderRight: "1px solid var(--line)",
            overflowY: "auto",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {toolGroups.map((group, gi) => (
            <div key={gi} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
              {gi > 0 && <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />}
              {group.tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTool(t.id)}
                  title={t.label}
                  style={{
                    ...toolBtnStyle,
                    ...(activeTool === t.id ? toolBtnActiveStyle : {}),
                  }}
                >
                  <span style={{ width: 18, height: 18, display: "flex" }}>{t.icon}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Action buttons */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, marginTop: "auto" }}>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <button onClick={() => wbRef.current?.undo()} title="Geri Al" style={toolBtnStyle}>
              <span style={{ width: 18, height: 18, display: "flex" }}><Icon.Undo /></span>
            </button>
            <button onClick={() => wbRef.current?.redo()} title="Yinele" style={toolBtnStyle}>
              <span style={{ width: 18, height: 18, display: "flex" }}><Icon.Redo /></span>
            </button>
            <button onClick={() => wbRef.current?.clear()} title="Temizle" style={{ ...toolBtnStyle, color: "var(--error)" }}>
              <span style={{ width: 18, height: 18, display: "flex" }}><Icon.Trash /></span>
            </button>
          </div>
        </aside>

        {/* ── CANVAS ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Color + Width bar (top of canvas) */}
          <div
            style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: 10, zIndex: 5,
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: 99, padding: "5px 14px", boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Colors */}
            <div style={{ display: "flex", gap: 4 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); wbRef.current?.setColor(c); }}
                  title={c}
                  style={{
                    width: 18, height: 18, borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                    outline: color === c ? `2px solid var(--brand-a)` : "none",
                    outlineOffset: 1, transition: "outline 0.1s",
                    boxShadow: c === "#FFFFFF" || c === "#E4E9FF" ? "inset 0 0 0 1px rgba(0,0,0,0.2)" : "none",
                  }}
                />
              ))}
              {/* Custom color */}
              <div style={{ position: "relative" }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => { setColor(e.target.value); wbRef.current?.setColor(e.target.value); }}
                  title="Özel renk"
                  style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer", width: 18, height: 18 }}
                />
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", cursor: "pointer",
                  background: "linear-gradient(135deg, #5B6EFF, #00D4B4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>+</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "var(--line)" }} />

            {/* Stroke widths */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {STROKE_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => { setStrokeWidth(w); wbRef.current?.setWidth(w); }}
                  title={`${w}px`}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: strokeWidth === w ? "var(--brand-a)" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    borderRadius: 99, background: strokeWidth === w ? "#fff" : "var(--ink-2)",
                    width: Math.min(w * 1.8, 22), height: Math.max(w * 0.8, 2),
                  }} />
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <WhiteboardLocal
            ref={wbRef}
            background={bgCanvas}
            showControls={false}
            tool={activeTool}
            color={color}
            width={strokeWidth}
          />
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        {rightPanel && (
          <aside
            style={{
              width: 320,
              background: "var(--card)",
              borderLeft: "1px solid var(--line)",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              overflowY: "auto",
            }}
          >
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                {rightPanel === "ai" && <><span style={{ color: "#5B6EFF", width: 16, height: 16, display: "flex" }}><Icon.AI /></span>AI Asistan</>}
                {rightPanel === "brainstorm" && <><span style={{ color: "#9B59FF", width: 16, height: 16, display: "flex" }}><Icon.Bulb /></span>Beyin Fırtınası</>}
                {rightPanel === "magic" && <><span style={{ color: "#00D4B4", width: 16, height: 16, display: "flex" }}><Icon.Magic /></span>Sihirli Dönüştür</>}
                {rightPanel === "layers" && <><span style={{ color: "#FFB347", width: 16, height: 16, display: "flex" }}><Icon.Layers /></span>Katmanlar</>}
              </span>
              <button onClick={() => setRightPanel(null)} style={{ ...toolBtnStyle, width: 28, height: 28 }}>
                <span style={{ width: 14, height: 14, display: "flex" }}><Icon.Close /></span>
              </button>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* AI ASSIST */}
              {rightPanel === "ai" && (
                <>
                  <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
                    Tahta içeriğiniz için AI'dan öneri veya çizim planı alın.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAiAssist(); }}
                    placeholder="Örn: Fotosentez için zihin haritası oluştur…"
                    rows={4}
                    style={textareaStyle}
                  />
                  <button
                    onClick={runAiAssist}
                    disabled={aiLoading || !aiPrompt.trim()}
                    style={primaryBtnStyle(aiLoading || !aiPrompt.trim())}
                  >
                    {aiLoading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <LoadingSpinner /> Düşünüyor…
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, display: "flex" }}><Icon.Send /></span>
                        Gönder
                      </span>
                    )}
                  </button>
                  {aiResult && (
                    <div style={{
                      background: "var(--card-2)", border: "1px solid var(--line-accent)",
                      borderRadius: 10, padding: 12, fontSize: 12, color: "var(--ink)", lineHeight: 1.6,
                      whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto",
                    }}>
                      {aiResult}
                    </div>
                  )}
                </>
              )}

              {/* BRAINSTORM */}
              {rightPanel === "brainstorm" && (
                <>
                  <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
                    Konu gir, AI sticky notlar oluştursun ve tahtaya yapıştırsın.
                  </p>
                  <input
                    value={bsTopic}
                    onChange={(e) => setBsTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runBrainstorm(); }}
                    placeholder="Konu: Hücre bölünmesi…"
                    style={inputStyle}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--ink-2)" }}>Not sayısı:</label>
                    {[4, 6, 8, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => setBsCount(n)}
                        style={{
                          ...toolBtnStyle,
                          width: 32, height: 28, fontSize: 11,
                          ...(bsCount === n ? toolBtnActiveStyle : {}),
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={runBrainstorm}
                    disabled={bsLoading || !bsTopic.trim()}
                    style={primaryBtnStyle(bsLoading || !bsTopic.trim(), "#9B59FF", "#7B3FDF")}
                  >
                    {bsLoading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <LoadingSpinner /> Oluşturuluyor…
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, display: "flex" }}><Icon.Sparkle /></span>
                        Beyin Fırtınası Başlat
                      </span>
                    )}
                  </button>
                  {bsNotes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {bsNotes.length} not oluşturuldu
                      </p>
                      {bsNotes.map((n, i) => (
                        <div key={i} style={{
                          background: "#FFD16618", border: "1px solid #FFD16630",
                          borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--ink)", lineHeight: 1.5,
                        }}>
                          {n}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* MAGIC SWITCH */}
              {rightPanel === "magic" && (
                <>
                  <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>
                    Tahta içeriğini yapılandırılmış bir ders dokümanına dönüştür.
                  </p>
                  <div style={{
                    background: "rgba(0,212,180,0.06)", border: "1px solid rgba(0,212,180,0.20)",
                    borderRadius: 10, padding: 12, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6,
                  }}>
                    ✨ Tahta üzerindeki tüm metin, şekil ve notları okur, mantıklı bir ders planına dönüştürür.
                  </div>
                  <button
                    onClick={runMagicSwitch}
                    disabled={magicLoading}
                    style={primaryBtnStyle(magicLoading, "#00D4B4", "#00A890")}
                  >
                    {magicLoading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <LoadingSpinner /> Dönüştürülüyor…
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, display: "flex" }}><Icon.Magic /></span>
                        Dönüştür
                      </span>
                    )}
                  </button>
                  {magicDoc && (
                    <div style={{
                      background: "var(--card-2)", border: "1px solid rgba(0,212,180,0.20)",
                      borderRadius: 10, padding: 12, fontSize: 12, color: "var(--ink)", lineHeight: 1.7,
                      whiteSpace: "pre-wrap", maxHeight: 360, overflowY: "auto",
                    }}>
                      {magicDoc}
                    </div>
                  )}
                </>
              )}

              {/* LAYERS */}
              {rightPanel === "layers" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {layers.map((l) => (
                      <div
                        key={l}
                        onClick={() => setActiveLayer(l)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                          borderRadius: 8, cursor: "pointer",
                          background: activeLayer === l ? "var(--accent-2-soft)" : "var(--card-2)",
                          border: `1px solid ${activeLayer === l ? "var(--brand-a)" : "var(--line)"}`,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ width: 14, height: 14, display: "flex", color: activeLayer === l ? "var(--brand-a)" : "var(--muted)" }}>
                          <Icon.Layers />
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{l}</span>
                        {activeLayer === l && (
                          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--brand-c)", fontWeight: 700 }}>AKTİF</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addLayer}
                    style={{
                      ...primaryBtnStyle(false, "#FFB347", "#E09030"),
                      marginTop: 4,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      + Yeni Katman
                    </span>
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ══ STATUS BAR ═══════════════════════════════════════════════════════ */}
      <footer
        style={{
          height: 30,
          background: "var(--card)",
          borderTop: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Araç: <strong style={{ color: "var(--ink-2)", textTransform: "capitalize" }}>{activeTool}</strong>
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
          Renk: <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", border: "1px solid var(--line)" }} />
        </span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Kalınlık: {strokeWidth}px</span>
        {sessionId && (
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
            Session: <code style={{ color: "var(--brand-c)", fontFamily: "monospace" }}>{sessionId}</code>
          </span>
        )}
      </footer>
    </div>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
      fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Style helpers ───────────────────────────────────────────────────────────
const headerBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", color: "var(--muted)",
  transition: "background 0.15s, color 0.15s",
};

const toolBtnStyle: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 8, border: "none", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", color: "var(--ink-2)",
  transition: "background 0.15s, color 0.15s",
};

const toolBtnActiveStyle: React.CSSProperties = {
  background: "var(--accent-2-soft)",
  color: "var(--brand-a)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%", resize: "vertical", borderRadius: 8,
  border: "1px solid var(--line)", background: "var(--card-2)",
  color: "var(--ink)", fontSize: 12, padding: "10px 12px", lineHeight: 1.6,
  fontFamily: "inherit", outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 8,
  border: "1px solid var(--line)", background: "var(--card-2)",
  color: "var(--ink)", fontSize: 12, padding: "10px 12px",
  fontFamily: "inherit", outline: "none",
};

function primaryBtnStyle(disabled: boolean, from = "#5B6EFF", to = "#4A5EFF"): React.CSSProperties {
  return {
    width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    background: disabled
      ? "var(--card-2)"
      : `linear-gradient(135deg, ${from}, ${to})`,
    color: disabled ? "var(--muted)" : "#fff",
    fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 0.15s",
    opacity: disabled ? 0.6 : 1,
  };
}
