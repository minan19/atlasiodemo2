"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  socket: Socket;
  sessionId: string;
  canWrite: boolean;
  initialActions?: WbAction[];
};

type Point = { x: number; y: number; p?: number };

type StrokeItem = {
  kind: "stroke";
  color: string;
  width: number;
  points: Point[];
  alpha?: number;
};

type ShapeItem = {
  kind: "shape";
  type: "rect" | "circle" | "line" | "arrow" | "triangle" | "polygon";
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  width: number;
  points?: Point[]; // for polygon
};

type TextItem = {
  kind: "text";
  x: number; y: number;
  text: string;
  color: string;
  size: number;
};

type ImageItem = {
  kind: "image";
  x: number; y: number;
  width: number; height: number;
  dataUrl: string;
};

type NoteItem = {
  kind: "note";
  x: number; y: number;
  width: number; height: number;
  text: string;
  bgColor: string;
};

type TableItem = {
  kind: "table";
  x: number; y: number;
  rows: number; cols: number;
  cellW: number; cellH: number;
  data: string[][];
  color: string;
};

type EmbedItem = {
  kind: "embed";
  x: number; y: number;
  width: number; height: number;
  embedType: "pdf" | "video" | "web";
  url: string;
  label: string;
};

type DrawItem = StrokeItem | ShapeItem | TextItem | ImageItem | NoteItem | TableItem | EmbedItem;

export type Tool =
  | "pen" | "highlighter" | "eraser"
  | "rect" | "circle" | "line" | "arrow" | "triangle" | "polygon"
  | "text" | "image" | "note" | "table" | "embed"
  | "laser" | "spotlight"
  | "select" | "pan" | "fill";

type BgMode = "plain" | "grid" | "dots" | "ruled" | "isometric";

type WbAction = {
  id?: string;
  sessionId: string;
  userId?: string;
  type: string;
  payload: any;
  targetActionId?: string;
};

type OverlayItem = {
  x: number; y: number; r: number;
  color: string;
  type: "laser" | "spotlight";
  expires: number;
};

// ─── Tool groups for UI ───────────────────────────────────────────────────────

const POINTER_TOOLS: { tool: Tool; label: string; title: string }[] = [
  { tool: "select",      label: "⬚",   title: "Seç (Lasso)" },
  { tool: "pan",         label: "🤚",  title: "Kaydır" },
];

const DRAW_TOOLS: { tool: Tool; label: string; title: string }[] = [
  { tool: "pen",         label: "✏️",  title: "Kalem" },
  { tool: "highlighter", label: "🖍️",  title: "Vurgulayıcı" },
  { tool: "eraser",      label: "🧽",  title: "Silgi" },
  { tool: "fill",        label: "🪣",  title: "Dolgu" },
];

const SHAPE_TOOLS: { tool: Tool; label: string; title: string }[] = [
  { tool: "line",     label: "╱",   title: "Çizgi" },
  { tool: "arrow",    label: "→",   title: "Ok" },
  { tool: "rect",     label: "▭",   title: "Dikdörtgen" },
  { tool: "circle",   label: "◯",   title: "Daire" },
  { tool: "triangle", label: "△",   title: "Üçgen" },
  { tool: "polygon",  label: "⬡",   title: "Çokgen" },
];

const EXTRA_TOOLS: { tool: Tool; label: string; title: string }[] = [
  { tool: "text",      label: "T",    title: "Metin" },
  { tool: "note",      label: "📌",   title: "Yapışkan Not" },
  { tool: "table",     label: "⊞",    title: "Tablo" },
  { tool: "image",     label: "🖼",   title: "Resim Ekle" },
  { tool: "embed",     label: "📎",   title: "İçerik Göm (PDF/Video/Web)" },
  { tool: "laser",     label: "🔴",   title: "Lazer İşaretçi" },
  { tool: "spotlight", label: "🔦",   title: "Spotlight" },
];

const BG_OPTIONS: { mode: BgMode; label: string; title: string }[] = [
  { mode: "plain",     label: "▬",  title: "Düz" },
  { mode: "grid",      label: "▦",  title: "Kareli" },
  { mode: "dots",      label: "⠿",  title: "Noktalı" },
  { mode: "ruled",     label: "☰",  title: "Çizgili" },
  { mode: "isometric", label: "◇",  title: "İzometrik" },
];

const PRESET_COLORS = [
  "#0f172a", "#ef4444", "#f97316", "#eab308",
  "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ffffff",
];

// ─── Canvas helpers ───────────────────────────────────────────────────────────

const imgCache = new Map<string, HTMLImageElement>();

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number, mode: BgMode) {
  ctx.save();
  if (mode === "grid") {
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (mode === "dots") {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for (let x = 15; x <= w; x += 30) for (let y = 15; y <= h; y += 30) {
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (mode === "ruled") {
    ctx.strokeStyle = "rgba(59,130,246,0.08)";
    ctx.lineWidth = 0.5;
    for (let y = 30; y <= h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    // red margin line
    ctx.strokeStyle = "rgba(239,68,68,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(60, h); ctx.stroke();
  } else if (mode === "isometric") {
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 0.5;
    const step = 30;
    for (let x = -h; x <= w + h; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h * 0.577, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - h * 0.577, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
  ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, item: DrawItem) {
  ctx.save();
  if (item.kind === "stroke") {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.globalAlpha = item.alpha ?? 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    item.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  } else if (item.kind === "shape") {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x1, y1, x2, y2 } = item;
    ctx.beginPath();
    if (item.type === "line") {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    } else if (item.type === "arrow") {
      const dx = x2 - x1; const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.max(10, Math.sqrt(dx * dx + dy * dy) * 0.18);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (item.type === "rect") {
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else if (item.type === "circle") {
      const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2; const ry = Math.abs(y2 - y1) / 2;
      ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.type === "triangle") {
      const cx = (x1 + x2) / 2;
      ctx.moveTo(cx, y1); ctx.lineTo(x2, y2); ctx.lineTo(x1, y2); ctx.closePath(); ctx.stroke();
    } else if (item.type === "polygon" && item.points && item.points.length > 1) {
      ctx.moveTo(item.points[0].x, item.points[0].y);
      item.points.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.closePath(); ctx.stroke();
    }
  } else if (item.kind === "text") {
    ctx.fillStyle = item.color;
    ctx.font = `${item.size}px system-ui, sans-serif`;
    ctx.fillText(item.text, item.x, item.y);
  } else if (item.kind === "image") {
    let img = imgCache.get(item.dataUrl);
    if (!img) {
      img = new Image();
      img.src = item.dataUrl;
      imgCache.set(item.dataUrl, img);
    }
    if (img.complete) {
      ctx.drawImage(img, item.x, item.y, item.width, item.height);
    } else {
      img.onload = () => ctx.drawImage(img, item.x, item.y, item.width, item.height);
    }
  } else if (item.kind === "note") {
    // Sticky note
    ctx.fillStyle = item.bgColor;
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(item.x, item.y, item.width, item.height);
    // Note text
    ctx.fillStyle = "#1e293b";
    ctx.font = "11px system-ui, sans-serif";
    const lines = item.text.split("\n");
    lines.forEach((ln, li) => {
      if (li < 6) ctx.fillText(ln.slice(0, 28), item.x + 8, item.y + 18 + li * 15);
    });
  } else if (item.kind === "embed") {
    // Embed placeholder rendering on canvas
    const bdr = 1.5;
    ctx.strokeStyle = item.embedType === "pdf" ? "#ef4444" : item.embedType === "video" ? "#3b82f6" : "#10b981";
    ctx.lineWidth = bdr;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(item.x, item.y, item.width, item.height);
    ctx.setLineDash([]);
    // Background
    ctx.fillStyle = item.embedType === "pdf" ? "rgba(239,68,68,0.04)" : item.embedType === "video" ? "rgba(59,130,246,0.04)" : "rgba(16,185,129,0.04)";
    ctx.fillRect(item.x + bdr, item.y + bdr, item.width - bdr * 2, item.height - bdr * 2);
    // Icon + label
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 24px system-ui, sans-serif";
    const icon = item.embedType === "pdf" ? "📄" : item.embedType === "video" ? "🎬" : "🌐";
    ctx.fillText(icon, item.x + item.width / 2 - 14, item.y + item.height / 2 - 4);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(item.label.slice(0, 40), item.x + 8, item.y + item.height - 8);
  } else if (item.kind === "table") {
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 1;
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = item.color;
    for (let r = 0; r <= item.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(item.x, item.y + r * item.cellH);
      ctx.lineTo(item.x + item.cols * item.cellW, item.y + r * item.cellH);
      ctx.stroke();
    }
    for (let c = 0; c <= item.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(item.x + c * item.cellW, item.y);
      ctx.lineTo(item.x + c * item.cellW, item.y + item.rows * item.cellH);
      ctx.stroke();
    }
    // Cell data
    item.data.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell) ctx.fillText(cell.slice(0, 12), item.x + ci * item.cellW + 4, item.y + ri * item.cellH + 16);
      });
    });
  }
  ctx.restore();
}

function effectiveWidth(tool: Tool, base: number, pressure?: number) {
  const mult = pressure ? 0.4 + pressure * 0.8 : 1;
  const w = tool === "eraser" ? Math.max(base * 2, 8) : base;
  return Math.max(1, w * mult);
}

// ─── Ruler overlay helper ─────────────────────────────────────────────────────

function RulerOverlay({ visible }: { visible: boolean }) {
  const [pos, setPos] = useState({ x: 80, y: 240 });
  const [angle, setAngle] = useState(0);
  const dragging = useRef(false);
  const startOff = useRef({ x: 0, y: 0 });

  if (!visible) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragging.current = true;
    startOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (dragging.current) setPos({ x: ev.clientX - startOff.current.x, y: ev.clientY - startOff.current.y });
    };
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute", left: pos.x, top: pos.y, zIndex: 15,
        width: 300, height: 40, cursor: "move",
        transform: `rotate(${angle}deg)`, transformOrigin: "center",
        background: "linear-gradient(180deg, rgba(59,130,246,0.12), rgba(59,130,246,0.06))",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 4, backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", padding: "0 4px",
        userSelect: "none", pointerEvents: "auto",
      }}
    >
      {/* Ruler ticks */}
      {Array.from({ length: 31 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", left: i * 10, bottom: 0,
          width: i % 5 === 0 ? 1.5 : 0.5,
          height: i % 5 === 0 ? 16 : (i % 1 === 0 ? 8 : 4),
          background: "rgba(59,130,246,0.5)",
        }}>
          {i % 5 === 0 && (
            <span style={{ position: "absolute", top: -12, left: -4, fontSize: 7, color: "rgba(59,130,246,0.8)", fontWeight: 600 }}>
              {i / 5}
            </span>
          )}
        </div>
      ))}
      {/* Rotate handle */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          const onMove = (ev: MouseEvent) => {
            const centerX = pos.x + 150;
            const centerY = pos.y + 20;
            const a = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
            setAngle(a);
          };
          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute", right: -12, top: -12,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(59,130,246,0.3)", border: "1px solid rgba(59,130,246,0.5)",
          cursor: "grab", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#3b82f6",
        }}
        title="Döndür"
      >↻</button>
    </div>
  );
}

// ─── Curtain overlay ──────────────────────────────────────────────────────────

function CurtainOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [split, setSplit] = useState(50); // percentage from top
  const dragging = useRef(false);

  if (!visible) return null;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none" }}>
      {/* Covered area */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: `${split}%`,
          background: "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92))",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>
          🎭 PERDE — Cevaplar Gizli
        </span>
      </div>
      {/* Drag handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          dragging.current = true;
          const parent = (e.currentTarget.parentNode as HTMLElement);
          const parentRect = parent.getBoundingClientRect();
          const onMove = (ev: MouseEvent) => {
            if (!dragging.current) return;
            const pct = Math.max(5, Math.min(95, ((ev.clientY - parentRect.top) / parentRect.height) * 100));
            setSplit(pct);
          };
          const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute", top: `${split}%`, left: 0, right: 0,
          height: 6, transform: "translateY(-50%)",
          background: "linear-gradient(90deg, rgba(59,130,246,0.6), rgba(139,92,246,0.6))",
          cursor: "ns-resize", pointerEvents: "auto",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>⋯</span>
      </div>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 6, right: 6, zIndex: 20,
          width: 22, height: 22, borderRadius: "50%",
          background: "rgba(239,68,68,0.8)", border: "none",
          color: "#fff", fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "auto",
        }}
        title="Perdeyi kaldır"
      >✕</button>
    </div>
  );
}

// ─── Compass (Pergel) overlay ─────────────────────────────────────────────────

function CompassOverlay({ visible }: { visible: boolean }) {
  const [center, setCenter] = useState({ x: 200, y: 270 });
  const [radius, setRadius] = useState(80);
  const [armAngle, setArmAngle] = useState(0); // degrees
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const dragging = useRef<"body" | "arm" | null>(null);
  const startOff = useRef({ x: 0, y: 0 });

  if (!visible) return null;

  const armX = center.x + radius * Math.cos((armAngle * Math.PI) / 180);
  const armY = center.y + radius * Math.sin((armAngle * Math.PI) / 180);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 14, pointerEvents: "none" }}>
      {/* SVG trail (drawn circle) */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        {trail.length > 1 && (
          <polyline
            points={trail.map((p) => `${(p.x / 960) * 100}%,${(p.y / 540) * 100}%`).join(" ")}
            fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeLinecap="round"
          />
        )}
        {/* Circle preview */}
        <circle
          cx={`${(center.x / 960) * 100}%`} cy={`${(center.y / 540) * 100}%`}
          r={`${(radius / 960) * 100}%`}
          fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="0.5" strokeDasharray="4 3"
        />
      </svg>

      {/* Center pin */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          dragging.current = "body";
          startOff.current = { x: e.clientX - (center.x / 960) * (e.currentTarget.parentElement?.getBoundingClientRect().width ?? 960), y: e.clientY - (center.y / 540) * (e.currentTarget.parentElement?.getBoundingClientRect().height ?? 540) };
          const parentRect = e.currentTarget.parentElement!.getBoundingClientRect();
          const onMove = (ev: MouseEvent) => {
            if (dragging.current !== "body") return;
            const nx = ((ev.clientX - startOff.current.x) / parentRect.width) * 960;
            const ny = ((ev.clientY - startOff.current.y) / parentRect.height) * 540;
            setCenter({ x: Math.max(0, Math.min(960, nx)), y: Math.max(0, Math.min(540, ny)) });
          };
          const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute",
          left: `${(center.x / 960) * 100}%`, top: `${(center.y / 540) * 100}%`,
          transform: "translate(-50%,-50%)",
          width: 14, height: 14, borderRadius: "50%",
          background: "rgba(59,130,246,0.7)", border: "2px solid rgba(59,130,246,0.9)",
          cursor: "move", pointerEvents: "auto", zIndex: 2,
        }}
        title="Merkez (sürükle)"
      />

      {/* Arm tip (draggable to change radius & angle) */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          dragging.current = "arm";
          setTrail([]);
          const parentRect = e.currentTarget.parentElement!.getBoundingClientRect();
          const onMove = (ev: MouseEvent) => {
            if (dragging.current !== "arm") return;
            const mx = ((ev.clientX - parentRect.left) / parentRect.width) * 960;
            const my = ((ev.clientY - parentRect.top) / parentRect.height) * 540;
            const dx = mx - center.x;
            const dy = my - center.y;
            const newR = Math.max(20, Math.sqrt(dx * dx + dy * dy));
            const newA = Math.atan2(dy, dx) * (180 / Math.PI);
            setRadius(newR);
            setArmAngle(newA);
            setTrail((t) => [...t, { x: center.x + newR * Math.cos(newA * Math.PI / 180), y: center.y + newR * Math.sin(newA * Math.PI / 180) }]);
          };
          const onUp = () => { dragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute",
          left: `${(armX / 960) * 100}%`, top: `${(armY / 540) * 100}%`,
          transform: "translate(-50%,-50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: "rgba(239,68,68,0.6)", border: "2px solid rgba(239,68,68,0.8)",
          cursor: "grab", pointerEvents: "auto", zIndex: 2,
        }}
        title="Kalem ucu (döndür + çap ayarla)"
      />

      {/* Arm line */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <line
          x1={`${(center.x / 960) * 100}%`} y1={`${(center.y / 540) * 100}%`}
          x2={`${(armX / 960) * 100}%`} y2={`${(armY / 540) * 100}%`}
          stroke="rgba(100,116,139,0.5)" strokeWidth="1.5"
        />
      </svg>

      {/* Radius label */}
      <div style={{
        position: "absolute",
        left: `${((center.x + armX) / 2 / 960) * 100}%`,
        top: `${((center.y + armY) / 2 / 540) * 100}%`,
        transform: "translate(-50%,-120%)",
        fontSize: 9, color: "rgba(59,130,246,0.8)", fontWeight: 600,
        background: "rgba(255,255,255,0.8)", padding: "1px 4px", borderRadius: 3,
        pointerEvents: "none",
      }}>
        r={Math.round(radius)}px
      </div>
    </div>
  );
}

// ─── Protractor (Açıölçer) overlay ───────────────────────────────────────────

function ProtractorOverlay({ visible }: { visible: boolean }) {
  const [pos, setPos] = useState({ x: 300, y: 320 });
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const dragging = useRef(false);
  const startOff = useRef({ x: 0, y: 0 });

  if (!visible) return null;

  const size = 180 * scale;
  const half = size / 2;

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        startOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        const onMove = (ev: MouseEvent) => {
          if (dragging.current) setPos({ x: ev.clientX - startOff.current.x, y: ev.clientY - startOff.current.y });
        };
        const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
      style={{
        position: "absolute", left: pos.x - half, top: pos.y - half,
        width: size, height: half + 4,
        zIndex: 15, pointerEvents: "auto", cursor: "move",
        transform: `rotate(${rotation}deg)`, transformOrigin: `${half}px ${half}px`,
        userSelect: "none",
      }}
    >
      <svg width={size} height={half + 4} viewBox={`0 0 ${size} ${half + 4}`} style={{ display: "block" }}>
        {/* Half-circle body */}
        <path
          d={`M 0 ${half} A ${half} ${half} 0 0 1 ${size} ${half} L 0 ${half} Z`}
          fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.35)" strokeWidth="1"
        />
        {/* Degree ticks */}
        {Array.from({ length: 181 }).map((_, deg) => {
          const rad = (deg * Math.PI) / 180;
          const inner = deg % 10 === 0 ? half - 20 : deg % 5 === 0 ? half - 12 : half - 7;
          const x1 = half + inner * Math.cos(Math.PI - rad);
          const y1 = half - inner * Math.sin(Math.PI - rad);
          const x2 = half + (half - 2) * Math.cos(Math.PI - rad);
          const y2 = half - (half - 2) * Math.sin(Math.PI - rad);
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={deg % 10 === 0 ? "rgba(16,185,129,0.6)" : "rgba(16,185,129,0.25)"}
                strokeWidth={deg % 10 === 0 ? 1 : 0.5} />
              {deg % 30 === 0 && (
                <text
                  x={half + (half - 28) * Math.cos(Math.PI - rad)}
                  y={half - (half - 28) * Math.sin(Math.PI - rad)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={7 * scale} fill="rgba(16,185,129,0.7)" fontWeight="600"
                >
                  {deg}°
                </text>
              )}
            </g>
          );
        })}
        {/* Center mark */}
        <circle cx={half} cy={half} r={3} fill="rgba(16,185,129,0.5)" />
      </svg>

      {/* Rotate handle */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          const onMove = (ev: MouseEvent) => {
            const cx = pos.x; const cy = pos.y;
            const a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
            setRotation(a + 90);
          };
          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute", right: -10, top: -10,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(16,185,129,0.3)", border: "1px solid rgba(16,185,129,0.5)",
          cursor: "grab", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#10b981",
        }}
        title="Döndür"
      >↻</button>

      {/* Scale handle */}
      <button
        onMouseDown={(e) => {
          e.stopPropagation();
          const startY = e.clientY;
          const startS = scale;
          const onMove = (ev: MouseEvent) => {
            const diff = (startY - ev.clientY) / 200;
            setScale(Math.max(0.5, Math.min(2, startS + diff)));
          };
          const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute", left: -10, top: -10,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(16,185,129,0.3)", border: "1px solid rgba(16,185,129,0.5)",
          cursor: "ns-resize", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#10b981",
        }}
        title="Boyutlandır"
      >⤡</button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhiteboardCanvas({ socket, sessionId, canWrite, initialActions }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items,      setItems]      = useState<{ id?: string; item: DrawItem }[]>([]);
  const [undone,     setUndone]     = useState<{ id?: string; item: DrawItem }[]>([]);
  const [overlays,   setOverlays]   = useState<OverlayItem[]>([]);
  const [color,      setColor]      = useState("#0f172a");
  const [penWidth,   setPenWidth]   = useState(3);
  const [tool,       setTool]       = useState<Tool>("pen");
  const [drawing,    setDrawing]    = useState(false);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [preview,    setPreview]    = useState<DrawItem | null>(null);
  const [bgMode,     setBgMode]     = useState<BgMode>("plain");
  const [showRuler,  setShowRuler]  = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const [showCompass, setShowCompass] = useState(false);
  const [showProtractor, setShowProtractor] = useState(false);
  // text input overlay
  const [textPos,    setTextPos]    = useState<Point | null>(null);
  const [textInput,  setTextInput]  = useState("");
  const textRef = useRef<HTMLInputElement>(null);
  // pan state
  const [panOffset,  setPanOffset]  = useState<Point>({ x: 0, y: 0 });
  const panStart     = useRef<Point | null>(null);
  // polygon building
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  // select/lasso
  const [selectRect, setSelectRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // note input overlay
  const [notePos,    setNotePos]    = useState<Point | null>(null);
  const [noteInput,  setNoteInput]  = useState("");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  // table input overlay
  const [tablePos,   setTablePos]   = useState<Point | null>(null);
  const [tableRows,  setTableRows]  = useState(3);
  const [tableCols,  setTableCols]  = useState(3);
  // embed input overlay
  const [embedPos,   setEmbedPos]   = useState<Point | null>(null);
  const [embedType,  setEmbedType]  = useState<"pdf" | "video" | "web">("pdf");
  const [embedUrl,   setEmbedUrl]   = useState("");
  // page snapshots
  const [snapshots,  setSnapshots]  = useState<{ name: string; items: { id?: string; item: DrawItem }[] }[]>([]);

  // ── apply actions ──────────────────────────────────────────────────────────

  const applyAction = useCallback((a: WbAction, silent = false) => {
    if (a.type === "DRAW") {
      setItems((prev) => [...prev, { id: a.id, item: a.payload as DrawItem }]);
    } else if (a.type === "CLEAR") {
      setItems([]); setUndone([]);
    } else if (a.type === "OVERLAY" && a.payload?.overlay) {
      const o = a.payload.overlay as { x: number; y: number; r: number; color: string; type: "laser" | "spotlight" };
      setOverlays((prev) => [...prev, { ...o, expires: performance.now() + (o.type === "laser" ? 1200 : 3000) }]);
    } else if (a.type === "UNDO") {
      setItems((prev) => {
        const next = [...prev];
        if (a.targetActionId) {
          const idx = next.findIndex((s) => s.id === a.targetActionId);
          if (idx >= 0) { const [r] = next.splice(idx, 1); setUndone((u) => [...u, r]); }
        } else {
          const r = next.pop();
          if (r) setUndone((u) => [...u, r]);
        }
        return next;
      });
    } else if (a.type === "REDO") {
      setUndone((prev) => {
        const next = [...prev];
        const target = a.targetActionId ? next.find((u) => u.id === a.targetActionId) : next.pop();
        if (target) {
          setItems((s) => [...s, target]);
          return next.filter((u) => u !== target);
        }
        return next;
      });
    } else if (a.type === "SNAPSHOT" && Array.isArray(a.payload?.actions)) {
      (a.payload.actions as WbAction[]).forEach((act) => applyAction(act, true));
    }
    void silent;
  }, []);

  // ── socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (a: WbAction) => { if (a.sessionId !== sessionId) return; applyAction(a); };
    const snapshotHandler = (snap: any) => { if (!snap?.actions) return; snap.actions.forEach((act: any) => applyAction(act as WbAction, true)); };
    socket.on("action", handler);
    socket.on("snapshot", snapshotHandler);
    socket.emit("snapshot", { sessionId });
    return () => { socket.off("action", handler); socket.off("snapshot", snapshotHandler); };
  }, [socket, sessionId, applyAction]);

  useEffect(() => {
    if (initialActions?.length) initialActions.forEach((act) => applyAction(act as any, true));
  }, [initialActions, applyAction]);

  // ── overlay expiry ─────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      setOverlays((o) => o.filter((p) => p.expires > now));
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  // ── redraw ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // clear
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // apply pan offset
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    // background pattern
    drawBg(ctx, canvas.width, canvas.height, bgMode);
    // items
    items.forEach(({ item }, idx) => {
      drawItem(ctx, item);
      // Highlight selected items
      if (selectedIds.has(idx)) {
        ctx.save();
        ctx.strokeStyle = "rgba(59,130,246,0.6)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        if (item.kind === "stroke" && item.points.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          item.points.forEach((pt) => { minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y); maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y); });
          ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
        } else if (item.kind === "shape") {
          ctx.strokeRect(Math.min(item.x1, item.x2) - 4, Math.min(item.y1, item.y2) - 4, Math.abs(item.x2 - item.x1) + 8, Math.abs(item.y2 - item.y1) + 8);
        } else if (item.kind === "text") {
          ctx.strokeRect(item.x - 4, item.y - item.size, ctx.measureText(item.text).width + 8, item.size + 8);
        } else if (item.kind === "image" || item.kind === "note" || item.kind === "embed") {
          ctx.strokeRect(item.x - 4, item.y - 4, item.width + 8, item.height + 8);
        } else if (item.kind === "table") {
          ctx.strokeRect(item.x - 4, item.y - 4, item.cols * item.cellW + 8, item.rows * item.cellH + 8);
        }
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
    if (preview) drawItem(ctx, preview);
    // polygon preview lines
    if (polyPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = penWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      polyPoints.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
      ctx.setLineDash([]);
      // Points
      polyPoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59,130,246,0.7)";
        ctx.fill();
      });
      ctx.restore();
    }
    // Selection rectangle
    if (selectRect) {
      ctx.save();
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.fillStyle = "rgba(59,130,246,0.05)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      const sx = Math.min(selectRect.x1, selectRect.x2);
      const sy = Math.min(selectRect.y1, selectRect.y2);
      const sw = Math.abs(selectRect.x2 - selectRect.x1);
      const sh = Math.abs(selectRect.y2 - selectRect.y1);
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
      ctx.restore();
    }
    // overlays
    overlays.forEach((o) => {
      const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      if (o.type === "laser") {
        grd.addColorStop(0, "rgba(239,68,68,0.9)");
        grd.addColorStop(1, "transparent");
      } else {
        grd.addColorStop(0, "rgba(255,255,180,0.55)");
        grd.addColorStop(1, "transparent");
      }
      ctx.save();
      ctx.fillStyle = grd;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      ctx.restore();
    });
    ctx.restore(); // restore pan translate
  }, [items, preview, overlays, bgMode, panOffset, selectedIds, selectRect, polyPoints, color, penWidth]);

  // ── pointer helpers ────────────────────────────────────────────────────────
  const getPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 540 / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      p: (e.nativeEvent as PointerEvent).pressure ?? 0.5,
    };
  };

  const isShapeTool = (t: Tool) => ["rect", "circle", "line", "arrow", "triangle", "polygon"].includes(t);

  // ── image upload ──────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // fit into canvas
        let w = img.width; let h = img.height;
        const maxW = 400; const maxH = 300;
        if (w > maxW) { h = h * (maxW / w); w = maxW; }
        if (h > maxH) { w = w * (maxH / h); h = maxH; }
        const imageItem: ImageItem = { kind: "image", x: 60, y: 60, width: w, height: h, dataUrl };
        setItems((prev) => [...prev, { item: imageItem }]);
        socket.emit("action", { sessionId, type: "DRAW", payload: imageItem });
        imgCache.set(dataUrl, img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── pointer down ──────────────────────────────────────────────────────────
  const handleDown = (p: Point) => {
    if (!canWrite) return;

    if (tool === "laser" || tool === "spotlight") {
      socket.emit("action", {
        sessionId, type: "OVERLAY",
        payload: { overlay: { x: p.x, y: p.y, r: tool === "laser" ? 18 : 80, color: "#fff", type: tool } },
      });
      return;
    }

    if (tool === "text") {
      setTextPos(p); setTextInput("");
      setTimeout(() => textRef.current?.focus(), 50);
      return;
    }

    if (tool === "image") {
      fileInputRef.current?.click();
      return;
    }

    if (tool === "note") {
      setNotePos(p); setNoteInput("");
      setTimeout(() => noteRef.current?.focus(), 50);
      return;
    }

    if (tool === "table") {
      setTablePos(p);
      return;
    }

    if (tool === "embed") {
      setEmbedPos(p);
      setEmbedUrl("");
      return;
    }

    if (tool === "pan") {
      panStart.current = { x: p.x - panOffset.x, y: p.y - panOffset.y };
      setDrawing(true);
      return;
    }

    if (tool === "select") {
      setSelectRect({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      setSelectedIds(new Set());
      setDrawing(true);
      return;
    }

    if (tool === "fill") {
      // Fill creates a large colored rectangle at click position
      const fillItem: ShapeItem = {
        kind: "shape", type: "rect",
        x1: 0, y1: 0, x2: 960, y2: 540,
        color, width: 0,
      };
      // We use a stroke with large width instead to fill
      const bgStroke: StrokeItem = {
        kind: "stroke", color, width: 960,
        alpha: 0.15, points: [{ x: 480, y: 270 }, { x: 480, y: 270 }],
      };
      setItems((prev) => [...prev, { item: bgStroke }]);
      socket.emit("action", { sessionId, type: "DRAW", payload: bgStroke });
      void fillItem;
      return;
    }

    if (tool === "polygon") {
      // On first click, start polygon; on subsequent clicks, add point; double-click to close
      setPolyPoints((pts) => [...pts, p]);
      return;
    }

    if (isShapeTool(tool)) {
      setShapeStart(p); setDrawing(true);
      return;
    }

    // stroke tool
    setDrawing(true);
    const bgFill = bgMode === "plain" ? "#ffffff" : "#f8fafc";
    const stroke: StrokeItem = {
      kind: "stroke",
      color: tool === "eraser" ? bgFill : color,
      width: effectiveWidth(tool, penWidth, p.p),
      alpha: tool === "highlighter" ? 0.35 : 1,
      points: [p],
    };
    setItems((prev) => [...prev, { item: stroke }]);
  };

  // ── pointer move ──────────────────────────────────────────────────────────
  const handleMove = (p: Point) => {
    if (!drawing || !canWrite) return;
    if (tool === "laser" || tool === "spotlight") return;

    if (tool === "pan" && panStart.current) {
      setPanOffset({ x: p.x - panStart.current.x, y: p.y - panStart.current.y });
      return;
    }

    if (tool === "select" && selectRect) {
      setSelectRect({ ...selectRect, x2: p.x, y2: p.y });
      return;
    }

    if (isShapeTool(tool) && shapeStart) {
      const shapeType = tool as ShapeItem["type"];
      setPreview({
        kind: "shape", type: shapeType,
        x1: shapeStart.x, y1: shapeStart.y, x2: p.x, y2: p.y,
        color, width: penWidth,
      });
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.item.kind === "stroke") last.item.points.push(p);
      return next;
    });
  };

  // ── pointer up ────────────────────────────────────────────────────────────
  const handleUp = (p: Point) => {
    if (!drawing || !canWrite) return;
    setDrawing(false);

    if (tool === "pan") {
      panStart.current = null;
      return;
    }

    if (tool === "select" && selectRect) {
      // Find items within selection rectangle
      const x1 = Math.min(selectRect.x1, selectRect.x2);
      const y1 = Math.min(selectRect.y1, selectRect.y2);
      const x2 = Math.max(selectRect.x1, selectRect.x2);
      const y2 = Math.max(selectRect.y1, selectRect.y2);
      const ids = new Set<number>();
      items.forEach(({ item }, idx) => {
        if (item.kind === "stroke" && item.points.some((pt) => pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2)) ids.add(idx);
        if (item.kind === "shape") {
          const sx1 = Math.min(item.x1, item.x2); const sy1 = Math.min(item.y1, item.y2);
          const sx2 = Math.max(item.x1, item.x2); const sy2 = Math.max(item.y1, item.y2);
          if (sx1 < x2 && sx2 > x1 && sy1 < y2 && sy2 > y1) ids.add(idx);
        }
        if (item.kind === "text" && item.x >= x1 && item.x <= x2 && item.y >= y1 && item.y <= y2) ids.add(idx);
        if (item.kind === "image" && item.x < x2 && item.x + item.width > x1 && item.y < y2 && item.y + item.height > y1) ids.add(idx);
        if (item.kind === "note" && item.x < x2 && item.x + item.width > x1 && item.y < y2 && item.y + item.height > y1) ids.add(idx);
        if (item.kind === "table" && item.x < x2 && item.x + item.cols * item.cellW > x1 && item.y < y2 && item.y + item.rows * item.cellH > y1) ids.add(idx);
        if (item.kind === "embed" && item.x < x2 && item.x + item.width > x1 && item.y < y2 && item.y + item.height > y1) ids.add(idx);
      });
      setSelectedIds(ids);
      return;
    }

    if (isShapeTool(tool) && shapeStart) {
      const shapeType = tool as ShapeItem["type"];
      const shape: ShapeItem = {
        kind: "shape", type: shapeType,
        x1: shapeStart.x, y1: shapeStart.y, x2: p.x, y2: p.y,
        color, width: penWidth,
      };
      setItems((prev) => [...prev, { item: shape }]);
      socket.emit("action", { sessionId, type: "DRAW", payload: shape });
      setShapeStart(null); setPreview(null);
      return;
    }

    const last = items[items.length - 1];
    if (last?.item.kind === "stroke") {
      socket.emit("action", { sessionId, type: "DRAW", payload: last.item });
    }
  };

  // ── text confirm ──────────────────────────────────────────────────────────
  const confirmText = () => {
    if (!textPos || !textInput.trim()) { setTextPos(null); return; }
    const textItem: TextItem = { kind: "text", x: textPos.x, y: textPos.y, text: textInput.trim(), color, size: penWidth * 5 + 10 };
    setItems((prev) => [...prev, { item: textItem }]);
    socket.emit("action", { sessionId, type: "DRAW", payload: textItem });
    setTextPos(null); setTextInput("");
  };

  // ── note confirm ──────────────────────────────────────────────────────────
  const confirmNote = () => {
    if (!notePos || !noteInput.trim()) { setNotePos(null); return; }
    const noteColors = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff"];
    const noteItem: NoteItem = {
      kind: "note", x: notePos.x, y: notePos.y,
      width: 140, height: 100,
      text: noteInput.trim(),
      bgColor: noteColors[Math.floor(Math.random() * noteColors.length)],
    };
    setItems((prev) => [...prev, { item: noteItem }]);
    socket.emit("action", { sessionId, type: "DRAW", payload: noteItem });
    setNotePos(null); setNoteInput("");
  };

  // ── table confirm ──────────────────────────────────────────────────────────
  const confirmTable = () => {
    if (!tablePos) return;
    const data = Array.from({ length: tableRows }, () => Array.from({ length: tableCols }, () => ""));
    const tableItem: TableItem = {
      kind: "table", x: tablePos.x, y: tablePos.y,
      rows: tableRows, cols: tableCols,
      cellW: 60, cellH: 24, data, color,
    };
    setItems((prev) => [...prev, { item: tableItem }]);
    socket.emit("action", { sessionId, type: "DRAW", payload: tableItem });
    setTablePos(null);
  };

  // ── embed confirm ──────────────────────────────────────────────────────────
  const confirmEmbed = () => {
    if (!embedPos || !embedUrl.trim()) { setEmbedPos(null); return; }
    const label = embedType === "pdf" ? `PDF: ${embedUrl.split("/").pop() ?? embedUrl}` : embedType === "video" ? `Video: ${embedUrl.split("/").pop() ?? embedUrl}` : `Web: ${embedUrl}`;
    const embedItem: EmbedItem = {
      kind: "embed", x: embedPos.x, y: embedPos.y,
      width: 280, height: 200, embedType, url: embedUrl.trim(), label,
    };
    setItems((prev) => [...prev, { item: embedItem }]);
    socket.emit("action", { sessionId, type: "DRAW", payload: embedItem });
    setEmbedPos(null); setEmbedUrl("");
  };

  // ── page snapshot ──────────────────────────────────────────────────────────
  const saveSnapshot = () => {
    const name = `Sayfa ${snapshots.length + 1} — ${new Date().toLocaleTimeString("tr-TR")}`;
    setSnapshots((prev) => [...prev, { name, items: items.map((i) => ({ ...i })) }]);
  };
  const restoreSnapshot = (idx: number) => {
    const snap = snapshots[idx];
    if (!snap) return;
    setItems(snap.items.map((i) => ({ ...i })));
  };

  // ── polygon close ──────────────────────────────────────────────────────────
  const closePolygon = () => {
    if (polyPoints.length < 3) { setPolyPoints([]); return; }
    const shape: ShapeItem = {
      kind: "shape", type: "polygon",
      x1: polyPoints[0].x, y1: polyPoints[0].y,
      x2: polyPoints[polyPoints.length - 1].x, y2: polyPoints[polyPoints.length - 1].y,
      color, width: penWidth, points: polyPoints,
    };
    setItems((prev) => [...prev, { item: shape }]);
    socket.emit("action", { sessionId, type: "DRAW", payload: shape });
    setPolyPoints([]);
  };

  // ── delete selected ──────────────────────────────────────────────────────
  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    setItems((prev) => prev.filter((_, i) => !selectedIds.has(i)));
    setSelectedIds(new Set());
    setSelectRect(null);
  };

  // ── undo / redo / clear ───────────────────────────────────────────────────
  const undo = () => {
    if (!canWrite || items.length === 0) return;
    socket.emit("action", { sessionId, type: "UNDO", payload: {}, targetActionId: items[items.length - 1]?.id });
  };
  const redo = () => {
    if (!canWrite || undone.length === 0) return;
    socket.emit("action", { sessionId, type: "REDO", payload: {}, targetActionId: undone[undone.length - 1]?.id });
  };
  const handleClear = () => socket.emit("action", { sessionId, type: "CLEAR", payload: {} });

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `atlasio-tahta-${sessionId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />

      {/* ── Toolbar ── */}
      {canWrite && (
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4,
          padding: "6px 10px", borderBottom: "1px solid var(--line)",
          background: "color-mix(in srgb,var(--panel) 85%,transparent)",
          flexShrink: 0,
        }}>

          {/* Pointer group */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {POINTER_TOOLS.map(({ tool: t, label, title }) => (
              <ToolBtn key={t} label={label} title={title} active={tool === t} onClick={() => setTool(t)} />
            ))}
            {selectedIds.size > 0 && (
              <ToolBtn label="🗑" title={`Seçilenleri sil (${selectedIds.size})`} onClick={deleteSelected} danger />
            )}
          </div>
          <Divider />

          {/* Draw group */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {DRAW_TOOLS.map(({ tool: t, label, title }) => (
              <ToolBtn key={t} label={label} title={title} active={tool === t} onClick={() => setTool(t)} />
            ))}
          </div>
          <Divider />

          {/* Shape group */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {SHAPE_TOOLS.map(({ tool: t, label, title }) => (
              <ToolBtn key={t} label={label} title={title} active={tool === t} onClick={() => setTool(t)} />
            ))}
            {polyPoints.length >= 3 && (
              <ToolBtn label="✓" title="Çokgeni kapat" onClick={closePolygon} />
            )}
          </div>
          <Divider />

          {/* Extra group */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {EXTRA_TOOLS.map(({ tool: t, label, title }) => (
              <ToolBtn key={t} label={label} title={title} active={tool === t} onClick={() => setTool(t)} />
            ))}
          </div>
          <Divider />

          {/* Geometry: ruler + curtain */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            <ToolBtn label="📏" title="Cetvel" active={showRuler} onClick={() => setShowRuler((v) => !v)} />
            <ToolBtn label="🔄" title="Pergel" active={showCompass} onClick={() => setShowCompass((v) => !v)} />
            <ToolBtn label="📐" title="Açıölçer" active={showProtractor} onClick={() => setShowProtractor((v) => !v)} />
            <ToolBtn label="🎭" title="Perde (Cevap Gizle)" active={showCurtain} onClick={() => setShowCurtain((v) => !v)} />
          </div>
          <Divider />

          {/* Background */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {BG_OPTIONS.map(({ mode, label, title }) => (
              <ToolBtn key={mode} label={label} title={title} active={bgMode === mode} onClick={() => setBgMode(mode)} />
            ))}
          </div>
          <Divider />

          {/* Colors */}
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c} title={c} onClick={() => setColor(c)}
                style={{
                  width: 16, height: 16, borderRadius: "50%", background: c,
                  border: color === c ? "2px solid var(--accent)" : "1.5px solid var(--line)",
                  cursor: "pointer", flexShrink: 0,
                  boxShadow: c === "#ffffff" ? "inset 0 0 0 1px var(--line)" : undefined,
                }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Özel renk"
              style={{ width: 18, height: 18, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
          </div>
          <Divider />

          {/* Width */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="range" min={1} max={16} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} style={{ width: 50 }} />
            <span style={{ fontSize: 9, color: "var(--muted)", minWidth: 12 }}>{penWidth}</span>
          </div>
          <Divider />

          {/* Actions */}
          <div style={{ display: "flex", gap: 2 }}>
            <ToolBtn label="↩" title="Geri al" onClick={undo} disabled={items.length === 0} />
            <ToolBtn label="↪" title="İleri al" onClick={redo} disabled={undone.length === 0} />
            <ToolBtn label="📷" title="Sayfa anlık görüntüsü kaydet" onClick={saveSnapshot} />
            {snapshots.length > 0 && (
              <ToolBtn label={`📂${snapshots.length}`} title="Son kaydı yükle" onClick={() => restoreSnapshot(snapshots.length - 1)} />
            )}
            <ToolBtn label="🧹" title="Tahtayı temizle" onClick={handleClear} danger />
            <ToolBtn label="🖨" title="PNG indir" onClick={downloadPng} />
          </div>
        </div>
      )}

      {/* ── Canvas wrapper ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          style={{
            display: "block", width: "100%", height: "100%", background: "#fff",
            cursor: tool === "text" || tool === "note" ? "text"
              : tool === "eraser" ? "cell"
              : tool === "laser" || tool === "spotlight" ? "crosshair"
              : tool === "image" ? "copy"
              : tool === "pan" ? (drawing ? "grabbing" : "grab")
              : tool === "select" ? "crosshair"
              : tool === "fill" ? "cell"
              : tool === "table" || tool === "embed" ? "cell"
              : isShapeTool(tool) ? "crosshair"
              : "default",
          }}
          onMouseDown={(e) => handleDown(getPoint(e))}
          onMouseMove={(e) => handleMove(getPoint(e))}
          onMouseUp={(e) => handleUp(getPoint(e))}
          onMouseLeave={() => { if (drawing) { setDrawing(false); setPreview(null); } }}
          onTouchStart={(e) => { e.preventDefault(); handleDown(getPoint(e)); }}
          onTouchMove={(e) => { e.preventDefault(); handleMove(getPoint(e)); }}
          onTouchEnd={(e) => { e.preventDefault(); handleUp({ x: 0, y: 0 }); }}
        />

        {/* Ruler overlay */}
        <RulerOverlay visible={showRuler} />

        {/* Compass overlay */}
        <CompassOverlay visible={showCompass} />

        {/* Protractor overlay */}
        <ProtractorOverlay visible={showProtractor} />

        {/* Curtain overlay */}
        <CurtainOverlay visible={showCurtain} onClose={() => setShowCurtain(false)} />

        {/* Text input overlay */}
        {textPos && (
          <div style={{
            position: "absolute",
            left: `${(textPos.x / 960) * 100}%`,
            top: `${(textPos.y / 540) * 100}%`,
            transform: "translate(0, -50%)", zIndex: 20,
            display: "flex", gap: 4,
          }}>
            <input
              ref={textRef} value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmText();
                if (e.key === "Escape") { setTextPos(null); setTextInput(""); }
              }}
              placeholder="Metin girin..."
              style={{
                fontSize: 14, padding: "4px 8px",
                border: `2px solid ${color}`, borderRadius: 6,
                background: "rgba(255,255,255,0.95)", color, outline: "none",
                minWidth: 120, boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            />
            <button onClick={confirmText} style={{
              padding: "4px 8px", fontSize: 12, fontWeight: 700,
              background: color, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
            }}>✓</button>
          </div>
        )}

        {/* Note input overlay */}
        {notePos && (
          <div style={{
            position: "absolute",
            left: `${(notePos.x / 960) * 100}%`,
            top: `${(notePos.y / 540) * 100}%`,
            zIndex: 20, display: "flex", flexDirection: "column", gap: 4,
          }}>
            <textarea
              ref={noteRef} value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) confirmNote();
                if (e.key === "Escape") { setNotePos(null); setNoteInput(""); }
              }}
              placeholder="Not yazın… (Ctrl+Enter)"
              rows={4}
              style={{
                fontSize: 12, padding: "8px",
                border: "2px solid #fbbf24", borderRadius: 6,
                background: "#fef9c3", color: "#1e293b", outline: "none",
                minWidth: 140, resize: "none", fontFamily: "inherit",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={confirmNote} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 700, background: "#fbbf24", color: "#1e293b", border: "none", borderRadius: 5, cursor: "pointer" }}>📌 Ekle</button>
              <button onClick={() => { setNotePos(null); setNoteInput(""); }} style={{ padding: "3px 10px", fontSize: 11, background: "none", border: "1px solid var(--line)", borderRadius: 5, cursor: "pointer", color: "var(--muted)" }}>İptal</button>
            </div>
          </div>
        )}

        {/* Table input overlay */}
        {tablePos && (
          <div style={{
            position: "absolute",
            left: `${(tablePos.x / 960) * 100}%`,
            top: `${(tablePos.y / 540) * 100}%`,
            zIndex: 20, display: "flex", flexDirection: "column", gap: 6,
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: 8, padding: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>Tablo Oluştur</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: 10, color: "var(--muted)" }}>Satır:
                <input type="number" min={1} max={10} value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} style={{ width: 36, fontSize: 11, marginLeft: 4, padding: "2px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)" }} />
              </label>
              <label style={{ fontSize: 10, color: "var(--muted)" }}>Sütun:
                <input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(Number(e.target.value))} style={{ width: 36, fontSize: 11, marginLeft: 4, padding: "2px 4px", border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)" }} />
              </label>
            </div>
            {/* Preview grid */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tableCols, 10)}, 16px)`, gap: 1 }}>
              {Array.from({ length: Math.min(tableRows * tableCols, 100) }).map((_, i) => (
                <div key={i} style={{ width: 16, height: 12, border: "1px solid var(--line)", borderRadius: 1, background: "color-mix(in srgb,var(--accent) 6%,var(--panel))" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={confirmTable} style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>⊞ Ekle</button>
              <button onClick={() => setTablePos(null)} style={{ padding: "4px 10px", fontSize: 11, background: "none", border: "1px solid var(--line)", borderRadius: 5, cursor: "pointer", color: "var(--muted)" }}>İptal</button>
            </div>
          </div>
        )}

        {/* Embed input overlay */}
        {embedPos && (
          <div style={{
            position: "absolute",
            left: `${(embedPos.x / 960) * 100}%`,
            top: `${(embedPos.y / 540) * 100}%`,
            zIndex: 20, display: "flex", flexDirection: "column", gap: 6,
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: 8, padding: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            minWidth: 220,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>📎 İçerik Göm</div>
            {/* Type selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {([
                { k: "pdf" as const, l: "📄 PDF" },
                { k: "video" as const, l: "🎬 Video" },
                { k: "web" as const, l: "🌐 Web" },
              ]).map(({ k, l }) => (
                <button key={k} onClick={() => setEmbedType(k)} style={{
                  flex: 1, padding: "3px 4px", fontSize: 9, fontWeight: embedType === k ? 700 : 500,
                  border: `1px solid ${embedType === k ? "var(--accent)" : "var(--line)"}`,
                  borderRadius: "var(--r-sm)", cursor: "pointer",
                  background: embedType === k ? "var(--accent-soft)" : "var(--panel)",
                  color: embedType === k ? "var(--accent)" : "var(--muted)",
                }}>{l}</button>
              ))}
            </div>
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmEmbed(); if (e.key === "Escape") setEmbedPos(null); }}
              placeholder={embedType === "pdf" ? "PDF URL veya yol..." : embedType === "video" ? "Video URL (YouTube, MP4)..." : "Web sayfa URL..."}
              style={{
                padding: "6px 8px", fontSize: 11, border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", outline: "none",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={confirmEmbed} style={{ flex: 1, padding: "5px 10px", fontSize: 10, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer" }}>📎 Göm</button>
              <button onClick={() => setEmbedPos(null)} style={{ padding: "5px 10px", fontSize: 10, background: "none", border: "1px solid var(--line)", borderRadius: 5, cursor: "pointer", color: "var(--muted)" }}>İptal</button>
            </div>
          </div>
        )}
      </div>

      {!canWrite && (
        <div style={{ padding: "5px 10px", fontSize: 11, color: "var(--muted)", textAlign: "center", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
          Yalnızca eğitmen çizim yapabilir.
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolBtn({
  label, title, active = false, onClick, disabled = false, danger = false,
}: {
  label: string; title: string; active?: boolean;
  onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      title={title} onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 26, height: 26, padding: "0 5px",
        fontSize: 12, fontWeight: active ? 700 : 500,
        borderRadius: 5,
        border: active ? "1.5px solid var(--accent)" : danger ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--line)",
        background: active ? "color-mix(in srgb,var(--accent) 12%,var(--panel))" : danger ? "rgba(239,68,68,0.06)" : "var(--panel)",
        color: active ? "var(--accent)" : danger ? "#ef4444" : "var(--ink)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.12s, border-color 0.12s",
      }}
    >{label}</button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: "var(--line)", margin: "0 1px", flexShrink: 0 }} />;
}
