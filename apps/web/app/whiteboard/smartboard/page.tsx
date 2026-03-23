"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = "select" | "draw" | "eraser" | "text" | "rectangle" | "circle" | "line";

interface Layer {
  id: string;
  name: string;
}

interface Participant {
  userId: string;
  socketId?: string;
}

interface AiSuggestion {
  text?: string;
  actions?: unknown[];
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WS_URL = API_BASE.replace(/^http/, "ws");

const TOOLS: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: "select",    label: "Select",    icon: "⬡", shortcut: "S" },
  { id: "draw",      label: "Pen",       icon: "✏️", shortcut: "P" },
  { id: "eraser",    label: "Eraser",    icon: "⬜", shortcut: "E" },
  { id: "text",      label: "Text",      icon: "T",  shortcut: "T" },
  { id: "rectangle", label: "Rectangle", icon: "▭",  shortcut: "R" },
  { id: "circle",    label: "Circle",    icon: "○",  shortcut: "C" },
  { id: "line",      label: "Line",      icon: "╱",  shortcut: "L" },
];

const STROKE_SIZES = [2, 4, 8, 14, 20];
const PRESET_COLORS = [
  "#1e293b", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#6366f1", "#d946ef",
  "#ffffff",
];

// ---------------------------------------------------------------------------
// Helper: get auth token from localStorage (same pattern used elsewhere)
// ---------------------------------------------------------------------------
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SmartBoardPage({
  searchParams,
}: {
  searchParams: { sessionId?: string };
}) {
  const sessionId = searchParams.sessionId ?? "demo-session";

  // --- Tool state ---
  const [activeTool, setActiveTool] = useState<Tool>("draw");
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [strokeSize, setStrokeSize] = useState(4);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // --- Canvas ref & drawing state ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  // --- WebSocket ---
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // --- Layers ---
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layersLoading, setLayersLoading] = useState(false);

  // --- AI Assist modal ---
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // --- Export status ---
  const [exporting, setExporting] = useState(false);

  // -------------------------------------------------------------------------
  // WebSocket setup
  // -------------------------------------------------------------------------
  useEffect(() => {
    const token = getToken();
    const socket = io(`${WS_URL}/whiteboard`, {
      auth: { token: token ?? "" },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { sessionId });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("joined", () => {
      // Successfully joined the session room
    });

    socket.on("action", (data: unknown) => {
      // Remote drawing actions — replay on canvas (basic passthrough)
      void data;
    });

    socket.on("participant:join", (p: Participant) => {
      setParticipants((prev) =>
        prev.find((x) => x.userId === p.userId) ? prev : [...prev, p]
      );
    });

    socket.on("participant:leave", (p: Participant) => {
      setParticipants((prev) => prev.filter((x) => x.userId !== p.userId));
    });

    socket.on("forbidden", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // -------------------------------------------------------------------------
  // Load layers on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    setLayersLoading(true);
    const token = getToken();
    fetch(`${API_BASE}/whiteboard/${sessionId}/layers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: Layer[]) => setLayers(Array.isArray(data) ? data : []))
      .catch(() => setLayers([]))
      .finally(() => setLayersLoading(false));
  }, [sessionId]);

  // -------------------------------------------------------------------------
  // Canvas helpers
  // -------------------------------------------------------------------------
  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  }, []);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // -------------------------------------------------------------------------
  // Drawing logic
  // -------------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool === "select") return;
      const pos = getCanvasPos(e);
      const ctx = getCtx();
      if (!ctx) return;

      isDrawing.current = true;
      lastPos.current = pos;
      shapeStart.current = pos;

      if (["rectangle", "circle", "line"].includes(activeTool)) {
        snapshotRef.current = ctx.getImageData(
          0,
          0,
          canvasRef.current!.width,
          canvasRef.current!.height
        );
      }

      if (activeTool === "draw" || activeTool === "eraser") {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    },
    [activeTool, getCanvasPos, getCtx]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pos = getCanvasPos(e);
      const ctx = getCtx();
      if (!ctx) return;

      ctx.lineWidth = strokeSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (activeTool === "draw") {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
      } else if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = strokeSize * 3;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
      } else if (activeTool === "rectangle" && snapshotRef.current && shapeStart.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.strokeRect(
          shapeStart.current.x,
          shapeStart.current.y,
          pos.x - shapeStart.current.x,
          pos.y - shapeStart.current.y
        );
      } else if (activeTool === "circle" && snapshotRef.current && shapeStart.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        const rx = Math.abs(pos.x - shapeStart.current.x) / 2;
        const ry = Math.abs(pos.y - shapeStart.current.y) / 2;
        const cx = shapeStart.current.x + (pos.x - shapeStart.current.x) / 2;
        const cy = shapeStart.current.y + (pos.y - shapeStart.current.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === "line" && snapshotRef.current && shapeStart.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(shapeStart.current.x, shapeStart.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    },
    [activeTool, getCanvasPos, getCtx, strokeColor, strokeSize]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const ctx = getCtx();
      if (ctx) {
        ctx.globalCompositeOperation = "source-over";
        ctx.closePath();
      }

      // Emit action to WebSocket for collaboration
      if (socketRef.current && connected) {
        const pos = getCanvasPos(e);
        socketRef.current.emit("action", {
          sessionId,
          type: "DRAW",
          payload: {
            tool: activeTool,
            color: strokeColor,
            size: strokeSize,
            from: shapeStart.current,
            to: pos,
          },
          userId: null,
        });
      }

      snapshotRef.current = null;
      shapeStart.current = null;
    },
    [activeTool, connected, getCanvasPos, getCtx, sessionId, strokeColor, strokeSize]
  );

  // Handle text tool click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool !== "text") return;
      const pos = getCanvasPos(e);
      const text = prompt("Enter text:");
      if (!text) return;
      const ctx = getCtx();
      if (!ctx) return;
      ctx.font = `${strokeSize * 4}px Inter, sans-serif`;
      ctx.fillStyle = strokeColor;
      ctx.fillText(text, pos.x, pos.y);
    },
    [activeTool, getCanvasPos, getCtx, strokeColor, strokeSize]
  );

  // -------------------------------------------------------------------------
  // AI Assist
  // -------------------------------------------------------------------------
  const handleAiAssist = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/whiteboard/${sessionId}/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setAiSuggestion(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, sessionId]);

  // -------------------------------------------------------------------------
  // Create / Delete Layer
  // -------------------------------------------------------------------------
  const handleCreateLayer = useCallback(async () => {
    const name = prompt("Layer name:");
    if (!name) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/whiteboard/layer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, name }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const layer = await res.json();
      setLayers((prev) => [...prev, layer]);
    } catch {
      // silently ignore in demo
    }
  }, [sessionId]);

  const handleDeleteLayer = useCallback(
    async (name: string) => {
      const token = getToken();
      try {
        await fetch(`${API_BASE}/whiteboard/layer/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sessionId, name }),
        });
        setLayers((prev) => prev.filter((l) => l.name !== name));
      } catch {
        // silently ignore in demo
      }
    },
    [sessionId]
  );

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/whiteboard/${sessionId}/canvas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartboard-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Also allow PNG export from canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `smartboard-${sessionId}.png`;
        a.click();
      }
    } finally {
      setExporting(false);
    }
  }, [sessionId]);

  // -------------------------------------------------------------------------
  // Clear canvas
  // -------------------------------------------------------------------------
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, Tool> = {
        s: "select", p: "draw", e: "eraser", t: "text",
        r: "rectangle", c: "circle", l: "line",
      };
      const tool = map[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* LEFT SIDEBAR — Tools                                                */}
      {/* ------------------------------------------------------------------ */}
      <aside className="flex w-14 flex-col items-center gap-1 border-r border-slate-700/60 bg-slate-800/80 py-3 backdrop-blur">
        {/* Logo mark */}
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg text-white font-bold text-sm select-none">
          SB
        </div>

        <div className="h-px w-8 bg-slate-700 mb-1" />

        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`relative group flex h-9 w-9 items-center justify-center rounded-lg text-base transition-all duration-150
              ${activeTool === t.id
                ? "bg-violet-600 text-white shadow-md shadow-violet-900/40"
                : "text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              }`}
          >
            {t.icon}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-11 z-50 hidden whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-200 shadow-lg group-hover:block">
              {t.label}
              <kbd className="ml-1.5 rounded bg-slate-800 px-1 text-[10px] text-slate-400">{t.shortcut}</kbd>
            </span>
          </button>
        ))}

        <div className="h-px w-8 bg-slate-700 my-1" />

        {/* Color swatch */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className="h-9 w-9 rounded-lg border-2 border-slate-600 transition-all hover:border-slate-400 shadow-inner"
            style={{ background: strokeColor }}
            title="Color picker"
          />
          {showColorPicker && (
            <div className="absolute left-11 top-0 z-50 flex flex-wrap w-[120px] gap-1.5 rounded-xl border border-slate-700 bg-slate-900 p-2.5 shadow-2xl">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setStrokeColor(c); setShowColorPicker(false); }}
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${strokeColor === c ? "border-white" : "border-transparent"}`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="h-6 w-full cursor-pointer rounded border-0 bg-transparent"
                title="Custom color"
              />
            </div>
          )}
        </div>

        {/* Stroke sizes */}
        <div className="mt-1 flex flex-col items-center gap-1">
          {STROKE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setStrokeSize(s)}
              title={`${s}px`}
              className={`flex items-center justify-center rounded transition-all ${strokeSize === s ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
            >
              <span
                className="block rounded-full bg-slate-200"
                style={{ width: Math.max(4, s), height: Math.max(4, s) }}
              />
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear */}
        <button
          onClick={handleClear}
          title="Clear canvas"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-900/40 hover:text-red-400 transition-all"
        >
          ✕
        </button>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN AREA                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* TOP BAR */}
        <header className="flex items-center justify-between border-b border-slate-700/60 bg-slate-800/60 px-4 py-2 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">SmartBoard</span>
            </span>
            <span className="rounded-md bg-slate-700 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {sessionId.length > 18 ? `${sessionId.slice(0, 18)}…` : sessionId}
            </span>
            {/* Live status */}
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${connected ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Assist */}
            <button
              onClick={() => { setShowAiModal(true); setAiSuggestion(null); setAiError(null); setAiPrompt(""); }}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              ✦ AI Assist
            </button>
            {/* Export */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "↓ Export"}
            </button>
          </div>
        </header>

        {/* CANVAS */}
        <div className="relative flex-1 overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={2400}
            height={1600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            className="h-full w-full"
            style={{
              cursor:
                activeTool === "select" ? "default"
                : activeTool === "eraser" ? "cell"
                : activeTool === "text" ? "text"
                : "crosshair",
            }}
          />
          {/* Tool indicator watermark */}
          <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] font-medium text-slate-300/70 select-none">
            {TOOLS.find((t) => t.id === activeTool)?.label} · {strokeSize}px
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* RIGHT SIDEBAR — Layers + Participants                               */}
      {/* ------------------------------------------------------------------ */}
      <aside className="flex w-56 flex-col gap-0 border-l border-slate-700/60 bg-slate-800/80 backdrop-blur shrink-0">
        {/* Participants */}
        <section className="border-b border-slate-700/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Participants</h3>
            <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{participants.length}</span>
          </div>
          {participants.length === 0 ? (
            <p className="text-[11px] text-slate-600">No one connected yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {participants.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
                    {p.userId.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate text-xs text-slate-300">{p.userId.slice(0, 14)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Layers */}
        <section className="flex flex-1 flex-col overflow-hidden p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Layers</h3>
            <button
              onClick={handleCreateLayer}
              title="Add layer"
              className="text-slate-500 hover:text-violet-400 transition-colors text-base leading-none"
            >
              +
            </button>
          </div>

          {layersLoading ? (
            <div className="space-y-1.5">
              {[1, 2].map((i) => (
                <div key={i} className="h-7 animate-pulse rounded-lg bg-slate-700/60" />
              ))}
            </div>
          ) : layers.length === 0 ? (
            <p className="text-[11px] text-slate-600">No layers yet.</p>
          ) : (
            <ul className="space-y-1 overflow-y-auto">
              {layers.map((layer) => (
                <li
                  key={layer.id ?? layer.name}
                  className="group flex items-center justify-between rounded-lg bg-slate-700/50 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                >
                  <span className="truncate">{layer.name}</span>
                  <button
                    onClick={() => handleDeleteLayer(layer.name)}
                    className="ml-1 hidden text-slate-600 hover:text-red-400 transition-colors group-hover:block"
                    title="Delete layer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bottom info */}
        <div className="border-t border-slate-700/40 px-3 py-2.5">
          <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
            SmartBoard v1.0<br />
            {sessionId.slice(0, 22)}
          </p>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* AI ASSIST MODAL                                                     */}
      {/* ------------------------------------------------------------------ */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowAiModal(false)}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base text-slate-100">
                  <span className="text-violet-400">✦</span> AI Assist
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Describe what you want on the board
                </p>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-600 hover:text-slate-300 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Prompt input */}
            <textarea
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none transition-colors"
              rows={4}
              placeholder="e.g. Draw a mind map for photosynthesis with 4 branches"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiAssist();
              }}
            />
            <p className="mt-1 text-[10px] text-slate-700">
              Cmd/Ctrl + Enter to submit
            </p>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAiAssist}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all"
              >
                {aiLoading ? "Thinking…" : "Generate"}
              </button>
              <button
                onClick={() => setShowAiModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Error */}
            {aiError && (
              <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {aiError}
              </div>
            )}

            {/* Result */}
            {aiSuggestion && (
              <div className="mt-4 rounded-xl border border-violet-900/40 bg-violet-950/20 p-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-500">
                  AI Suggestion
                </div>
                {aiSuggestion.text && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {aiSuggestion.text}
                  </p>
                )}
                {aiSuggestion.actions && Array.isArray(aiSuggestion.actions) && aiSuggestion.actions.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-400">
                      {aiSuggestion.actions.length} board actions
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[10px] text-slate-400">
                      {JSON.stringify(aiSuggestion.actions, null, 2)}
                    </pre>
                  </details>
                )}
                {!aiSuggestion.text && !aiSuggestion.actions && (
                  <pre className="overflow-x-auto text-[10px] text-slate-400">
                    {JSON.stringify(aiSuggestion, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
