"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useI18n } from "../../_i18n/use-i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool =
  | "select"
  | "draw"
  | "eraser"
  | "text"
  | "sticky"
  | "rectangle"
  | "circle"
  | "line"
  | "image"
  | "code";

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

type AiStudioTab =
  | "assist"
  | "write"
  | "brainstorm"
  | "mindmap"
  | "presentation"
  | "summarize";

interface StickyNote {
  id: string;
  text: string;
  color: string;
}
interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}
interface PresentationSlide {
  title: string;
  bullets: string[];
  speakerNote?: string;
}
interface PresentationResult {
  title: string;
  subtitle: string;
  slides: PresentationSlide[];
}
interface SummarizeResult {
  title: string;
  introduction: string;
  sections: { heading: string; content: string }[];
  keyPoints: string[];
}

// Rich text box overlay
interface TextBoxItem {
  id: string;
  x: number; // percent of canvas container width
  y: number; // percent of canvas container height
  html: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bgColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  align: "left" | "center" | "right";
}

// Board sticky note overlay
interface BoardSticky {
  id: string;
  x: number; // px from container left
  y: number; // px from container top
  width: number;
  height: number;
  text: string;
  color: string;
}

// Code block overlay
interface CodeBlock {
  id: string;
  x: number;
  y: number;
  code: string;
  language: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const WS_URL = API_BASE.replace(/^http/, "ws");

const TOOLS: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: "select",    label: "Select",    icon: "⬡",  shortcut: "S" },
  { id: "draw",      label: "Pen",       icon: "✏️",  shortcut: "P" },
  { id: "eraser",    label: "Eraser",    icon: "⬜",  shortcut: "E" },
  { id: "text",      label: "Text",      icon: "T",   shortcut: "T" },
  { id: "sticky",    label: "Sticky",    icon: "🗒",  shortcut: "N" },
  { id: "rectangle", label: "Rectangle", icon: "▭",   shortcut: "R" },
  { id: "circle",    label: "Circle",    icon: "○",   shortcut: "C" },
  { id: "line",      label: "Line",      icon: "╱",   shortcut: "L" },
  { id: "image",     label: "Image",     icon: "🖼",  shortcut: "I" },
  { id: "code",      label: "Code",      icon: "< >", shortcut: "K" },
];

const STROKE_SIZES = [2, 4, 8, 14, 20];
const PRESET_COLORS = [
  "#1e293b", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#6366f1", "#d946ef",
  "#ffffff",
];

const STICKY_COLORS = [
  "#fef08a", // yellow
  "#bbf7d0", // green
  "#bfdbfe", // blue
  "#fecaca", // pink
  "#e9d5ff", // purple
  "#fed7aa", // orange
];

const FONT_FAMILIES = ["Inter", "Georgia", "Courier New", "Arial"];
const FONT_SIZES = [12, 14, 16, 20, 24, 32, 48, 64];

type StylePreset = { label: string; fontSize: number; bold: boolean; italic: boolean };
const STYLE_PRESETS: StylePreset[] = [
  { label: "H1",          fontSize: 48, bold: true,  italic: false },
  { label: "H2",          fontSize: 32, bold: true,  italic: false },
  { label: "Subheading",  fontSize: 24, bold: false, italic: false },
  { label: "Body",        fontSize: 16, bold: false, italic: false },
  { label: "Caption",     fontSize: 12, bold: false, italic: true  },
];

// ---------------------------------------------------------------------------
// Helper: get auth token from localStorage (same pattern used elsewhere)
// ---------------------------------------------------------------------------
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
}

let _tbCounter = 0;
function nextId(prefix = "id") {
  return `${prefix}-${Date.now()}-${_tbCounter++}`;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SmartBoardPage({
  searchParams,
}: {
  searchParams: { sessionId?: string };
}) {
  const t = useI18n();
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

  // --- Undo/Redo history ---
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // --- Zoom ---
  const [zoom, setZoom] = useState(1.0);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // --- Grid ---
  const [showGrid, setShowGrid] = useState(false);

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

  // --- AI Studio panel ---
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [aiStudioTab, setAiStudioTab] = useState<AiStudioTab>("assist");
  // Magic Write
  const [mwText, setMwText] = useState("");
  const [mwTone, setMwTone] = useState<"formal" | "casual" | "academic" | "simple">("formal");
  const [mwResult, setMwResult] = useState<string | null>(null);
  const [mwLoading, setMwLoading] = useState(false);
  // Brainstorm sticky notes
  const [bsTopic, setBsTopic] = useState("");
  const [bsNotes, setBsNotes] = useState<StickyNote[]>([]);
  const [bsLoading, setBsLoading] = useState(false);
  // Mind Map
  const [mmTopic, setMmTopic] = useState("");
  const [mmData, setMmData] = useState<MindMapNode | null>(null);
  const [mmLoading, setMmLoading] = useState(false);
  // Presentation
  const [pTopic, setPTopic] = useState("");
  const [pSlides, setPSlides] = useState<PresentationResult | null>(null);
  const [pLoading, setPLoading] = useState(false);
  const [pActiveSlide, setPActiveSlide] = useState(0);
  // Summarize
  const [sumResult, setSumResult] = useState<SummarizeResult | null>(null);
  const [sumLoading, setSumLoading] = useState(false);

  // --- Text boxes (DOM overlays) ---
  const [textBoxes, setTextBoxes] = useState<TextBoxItem[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  // Rich text toolbar state (shared for currently editing text box)
  const [rtFontFamily, setRtFontFamily] = useState("Inter");
  const [rtFontSize, setRtFontSize] = useState(16);
  const [rtBold, setRtBold] = useState(false);
  const [rtItalic, setRtItalic] = useState(false);
  const [rtUnderline, setRtUnderline] = useState(false);
  const [rtStrike, setRtStrike] = useState(false);
  const [rtAlign, setRtAlign] = useState<"left" | "center" | "right">("left");
  const [rtColor, setRtColor] = useState("#1e293b");
  const [rtBgColor, setRtBgColor] = useState("transparent");
  const editableRef = useRef<HTMLDivElement>(null);

  // --- Board sticky notes (DOM overlays) ---
  const [boardStickies, setBoardStickies] = useState<BoardSticky[]>([]);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [selectedStickyColor, setSelectedStickyColor] = useState(STICKY_COLORS[0]);
  const draggingStickyRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  // --- Code blocks (DOM overlays) ---
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState("");
  const [pendingLang, setPendingLang] = useState("javascript");

  // --- Image upload ---
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Timer widget ---
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState(300); // seconds
  const [timerLeft, setTimerLeft] = useState(300);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  // Undo / Redo helpers
  // -------------------------------------------------------------------------
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Truncate forward history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);
    // Keep max 50 snapshots
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
  }, [getCtx]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
  }, [getCtx]);

  // Save initial blank state
  useEffect(() => {
    // Wait a tick for canvas to be in DOM
    const t = setTimeout(() => saveHistory(), 100);
    return () => clearTimeout(t);
  }, [saveHistory]);

  // -------------------------------------------------------------------------
  // Grid drawing
  // -------------------------------------------------------------------------
  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const CELL = 32;
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    if (showGrid) drawGrid();
  }, [showGrid, drawGrid]);

  // -------------------------------------------------------------------------
  // Zoom (ctrl+wheel)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((prev) => Math.min(3.0, Math.max(0.25, prev - e.deltaY * 0.001)));
    };
    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, []);

  // -------------------------------------------------------------------------
  // Timer logic
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  const timerReset = useCallback(() => {
    setTimerRunning(false);
    const total = timerMinutes * 60 + timerSeconds;
    setTimerTotal(total);
    setTimerLeft(total);
  }, [timerMinutes, timerSeconds]);

  const timerDisplay = `${String(Math.floor(timerLeft / 60)).padStart(2, "0")}:${String(timerLeft % 60).padStart(2, "0")}`;

  // -------------------------------------------------------------------------
  // Drawing logic
  // -------------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (activeTool === "select" || activeTool === "text" || activeTool === "sticky" || activeTool === "image" || activeTool === "code") return;
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
        if (showGrid) drawGrid();
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
        if (showGrid) drawGrid();
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
        if (showGrid) drawGrid();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(shapeStart.current.x, shapeStart.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    },
    [activeTool, getCanvasPos, getCtx, strokeColor, strokeSize, showGrid, drawGrid]
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

      saveHistory();

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
    [activeTool, connected, getCanvasPos, getCtx, sessionId, strokeColor, strokeSize, saveHistory]
  );

  // -------------------------------------------------------------------------
  // Canvas click handler (text, sticky, image, code)
  // -------------------------------------------------------------------------
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return;
      const wRect = wrapper.getBoundingClientRect();
      const xPct = ((e.clientX - wRect.left) / wRect.width) * 100;
      const yPct = ((e.clientY - wRect.top) / wRect.height) * 100;

      if (activeTool === "text") {
        const id = nextId("tb");
        const newTb: TextBoxItem = {
          id,
          x: xPct,
          y: yPct,
          html: "",
          fontFamily: rtFontFamily,
          fontSize: rtFontSize,
          color: rtColor,
          bgColor: rtBgColor,
          bold: rtBold,
          italic: rtItalic,
          underline: rtUnderline,
          strikethrough: rtStrike,
          align: rtAlign,
        };
        setTextBoxes((prev) => [...prev, newTb]);
        setEditingTextId(id);
        return;
      }

      if (activeTool === "sticky") {
        const id = nextId("st");
        const xPx = e.clientX - wRect.left;
        const yPx = e.clientY - wRect.top;
        const newSticky: BoardSticky = {
          id,
          x: xPx,
          y: yPx,
          width: 180,
          height: 160,
          text: "",
          color: selectedStickyColor,
        };
        setBoardStickies((prev) => [...prev, newSticky]);
        setEditingStickyId(id);
        return;
      }

      if (activeTool === "image") {
        imageInputRef.current?.click();
        return;
      }

      if (activeTool === "code") {
        const id = nextId("cb");
        const xPx = e.clientX - wRect.left;
        const yPx = e.clientY - wRect.top;
        const newCb: CodeBlock = { id, x: xPx, y: yPx, code: "", language: "javascript" };
        setCodeBlocks((prev) => [...prev, newCb]);
        setEditingCodeId(id);
        setPendingCode("");
        setPendingLang("javascript");
        return;
      }
    },
    [activeTool, rtFontFamily, rtFontSize, rtColor, rtBgColor, rtBold, rtItalic, rtUnderline, rtStrike, rtAlign, selectedStickyColor]
  );

  // -------------------------------------------------------------------------
  // Image upload
  // -------------------------------------------------------------------------
  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d");
          if (!canvas || !ctx) return;
          const scale = Math.min(
            (canvas.width * 0.6) / img.width,
            (canvas.height * 0.6) / img.height,
            1
          );
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.drawImage(img, x, y, w, h);
          saveHistory();
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
      // Reset input
      e.target.value = "";
    },
    [saveHistory]
  );

  // -------------------------------------------------------------------------
  // Text box actions
  // -------------------------------------------------------------------------
  const confirmTextBox = useCallback(
    (id: string) => {
      const el = editableRef.current;
      if (!el) return;
      const html = el.innerHTML;
      setTextBoxes((prev) =>
        prev.map((tb) =>
          tb.id === id
            ? { ...tb, html, fontFamily: rtFontFamily, fontSize: rtFontSize, color: rtColor, bgColor: rtBgColor, bold: rtBold, italic: rtItalic, underline: rtUnderline, strikethrough: rtStrike, align: rtAlign }
            : tb
        )
      );
      setEditingTextId(null);
    },
    [rtFontFamily, rtFontSize, rtColor, rtBgColor, rtBold, rtItalic, rtUnderline, rtStrike, rtAlign]
  );

  const cancelTextBox = useCallback(
    (id: string) => {
      // Remove if empty
      setTextBoxes((prev) => {
        const tb = prev.find((t) => t.id === id);
        if (!tb || !tb.html) return prev.filter((t) => t.id !== id);
        return prev;
      });
      setEditingTextId(null);
    },
    []
  );

  const applyRtStyle = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editableRef.current?.focus();
  }, []);

  const applyPreset = useCallback((preset: StylePreset) => {
    setRtFontSize(preset.fontSize);
    setRtBold(preset.bold);
    setRtItalic(preset.italic);
    document.execCommand("fontSize", false, "7"); // placeholder
    editableRef.current?.focus();
  }, []);

  // -------------------------------------------------------------------------
  // Sticky dragging
  // -------------------------------------------------------------------------
  const handleStickyMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, id: string) => {
      e.stopPropagation();
      const sticky = boardStickies.find((s) => s.id === id);
      if (!sticky) return;
      draggingStickyRef.current = { id, ox: e.clientX - sticky.x, oy: e.clientY - sticky.y };
    },
    [boardStickies]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingStickyRef.current) return;
      const { id, ox, oy } = draggingStickyRef.current;
      setBoardStickies((prev) =>
        prev.map((s) => s.id === id ? { ...s, x: e.clientX - ox, y: e.clientY - oy } : s)
      );
    };
    const onUp = () => { draggingStickyRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

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
  // AI Studio handlers
  // -------------------------------------------------------------------------
  const handleMagicWrite = useCallback(async () => {
    if (!mwText.trim()) return;
    setMwLoading(true); setMwResult(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ai/content/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: mwText, tone: mwTone, language: "tr" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMwResult(data.rewritten ?? JSON.stringify(data));
    } catch { setMwResult("(Sunucuya ulaşılamadı — demo modu)"); }
    finally { setMwLoading(false); }
  }, [mwText, mwTone]);

  const handleBrainstorm = useCallback(async () => {
    if (!bsTopic.trim()) return;
    setBsLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/whiteboard/${sessionId}/sticky-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ topic: bsTopic, count: 6, language: "tr" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setBsNotes(data.notes ?? []);
    } catch {
      setBsNotes([
        { id: "1", text: `${bsTopic} temel kavramları`, color: "#fef08a" },
        { id: "2", text: `${bsTopic} uygulama örnekleri`, color: "#bbf7d0" },
        { id: "3", text: `${bsTopic} tarihsel gelişimi`, color: "#bfdbfe" },
        { id: "4", text: `${bsTopic} avantajları`, color: "#fecaca" },
        { id: "5", text: `${bsTopic} zorlukları`, color: "#e9d5ff" },
        { id: "6", text: `${bsTopic} gelecek trendleri`, color: "#fed7aa" },
      ]);
    }
    finally { setBsLoading(false); }
  }, [bsTopic, sessionId]);

  const handleMindMap = useCallback(async () => {
    if (!mmTopic.trim()) return;
    setMmLoading(true); setMmData(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ai/mind-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ topic: mmTopic, depth: 2, language: "tr" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMmData(data.root ?? null);
    } catch { setMmData({ id: "root", label: mmTopic, children: [{ id: "b1", label: "Temel Kavramlar", children: [] }, { id: "b2", label: "Uygulama", children: [] }, { id: "b3", label: "Örnekler", children: [] }] }); }
    finally { setMmLoading(false); }
  }, [mmTopic]);

  const handlePresentation = useCallback(async () => {
    if (!pTopic.trim()) return;
    setPLoading(true); setPSlides(null); setPActiveSlide(0);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/ai/presentation/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ topic: pTopic, slideCount: 8, language: "tr" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setPSlides(data);
    } catch { setPSlides({ title: `${pTopic} Sunumu`, subtitle: "Atlasio AI", slides: [{ title: "Giriş", bullets: [`${pTopic} nedir?`, "Önem ve kapsam"] }] }); }
    finally { setPLoading(false); }
  }, [pTopic]);

  const handleSummarize = useCallback(async () => {
    setSumLoading(true); setSumResult(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/whiteboard/${sessionId}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ language: "tr" }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setSumResult(data);
    } catch { setSumResult({ title: "Tahta Özeti", introduction: "Bu tahta oturumunun yapılandırılmış özeti.", sections: [], keyPoints: ["İçerik bulunamadı — tahtaya yazı ekleyin ve tekrar deneyin."] }); }
    finally { setSumLoading(false); }
  }, [sessionId]);

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
      setTextBoxes([]);
      setBoardStickies([]);
      setCodeBlocks([]);
      saveHistory();
    }
  }, [saveHistory]);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isEditing = e.target instanceof HTMLInputElement
        || e.target instanceof HTMLTextAreaElement
        || (e.target as HTMLElement)?.isContentEditable;

      // Undo/Redo — always handle
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (isEditing) return;

      const map: Record<string, Tool> = {
        s: "select", p: "draw", e: "eraser", t: "text",
        n: "sticky", r: "rectangle", c: "circle", l: "line",
        i: "image", k: "code",
      };
      const tool = map[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);

      if (e.key === "Escape" && editingTextId) {
        cancelTextBox(editingTextId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, editingTextId, cancelTextBox]);

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

        {/* Undo / Redo */}
        <button
          onClick={undo}
          title="Undo (Ctrl+Z)"
          className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-all text-sm"
        >
          ↩
        </button>
        <button
          onClick={redo}
          title="Redo (Ctrl+Y)"
          className="flex h-8 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-all text-sm"
        >
          ↪
        </button>

        <div className="h-px w-8 bg-slate-700 my-1" />

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
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${connected ? "bg-amber-900/40 text-amber-400" : "bg-slate-700 text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Grid toggle */}
            <button
              onClick={() => {
                const next = !showGrid;
                setShowGrid(next);
                if (!next) {
                  // Re-draw without grid by restoring current snapshot
                  const canvas = canvasRef.current;
                  const ctx = canvas?.getContext("2d");
                  if (ctx && canvas && historyRef.current[historyIndexRef.current]) {
                    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
                  }
                } else {
                  drawGrid();
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${showGrid ? "border-violet-600 bg-violet-900/30 text-violet-300" : "border-slate-600 bg-slate-700/60 text-slate-400 hover:bg-slate-700"}`}
              title="Toggle grid"
            >
              ⊞ Grid
            </button>
            {/* Timer toggle */}
            <button
              onClick={() => setShowTimer((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${showTimer ? "border-amber-600 bg-amber-900/30 text-amber-300" : "border-slate-600 bg-slate-700/60 text-slate-400 hover:bg-slate-700"}`}
              title="Classroom timer"
            >
              ⏱ Timer
            </button>
            {/* AI Studio */}
            <button
              onClick={() => setShowAiStudio((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all ${showAiStudio ? "bg-violet-700 text-white" : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"}`}
            >
              ✦ AI Studio
            </button>
            {/* AI Assist */}
            <button
              onClick={() => { setShowAiModal(true); setAiSuggestion(null); setAiError(null); setAiPrompt(""); }}
              className="flex items-center gap-1.5 rounded-lg border border-violet-700/50 bg-slate-800 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-slate-700 transition-all"
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

        {/* CANVAS AREA */}
        <div
          ref={canvasWrapperRef}
          className="relative flex-1 overflow-hidden bg-white"
          onClick={(e) => {
            // Close color picker on outside click
            if (showColorPicker) setShowColorPicker(false);
          }}
        >
          {/* Zoom transform wrapper */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
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
                        : activeTool === "sticky" ? "copy"
                          : activeTool === "image" ? "cell"
                            : activeTool === "code" ? "text"
                              : "crosshair",
              }}
            />

            {/* ---- Text box overlays ---- */}
            {textBoxes.map((tb) => {
              const isEditing = editingTextId === tb.id;
              return (
                <div
                  key={tb.id}
                  style={{
                    position: "absolute",
                    left: `${tb.x}%`,
                    top: `${tb.y}%`,
                    zIndex: 20,
                    minWidth: 120,
                    minHeight: 32,
                  }}
                >
                  {isEditing && (
                    /* Rich text floating toolbar */
                    <div
                      className="absolute -top-10 left-0 z-30 flex items-center gap-0.5 rounded-xl border border-slate-600 bg-slate-900 px-1.5 py-1 shadow-2xl"
                      style={{ whiteSpace: "nowrap" }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {/* Style presets */}
                      <select
                        value=""
                        onChange={(e) => {
                          const preset = STYLE_PRESETS.find((p) => p.label === e.target.value);
                          if (preset) applyPreset(preset);
                        }}
                        className="h-6 rounded bg-slate-800 px-1 text-[10px] text-slate-300 border border-slate-700 focus:outline-none"
                      >
                        <option value="">Style</option>
                        {STYLE_PRESETS.map((p) => (
                          <option key={t.tr(p.label)} value={t.tr(p.label)}>{t.tr(p.label)}</option>
                        ))}
                      </select>
                      {/* Font family */}
                      <select
                        value={rtFontFamily}
                        onChange={(e) => setRtFontFamily(e.target.value)}
                        className="h-6 rounded bg-slate-800 px-1 text-[10px] text-slate-300 border border-slate-700 focus:outline-none"
                      >
                        {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      {/* Font size */}
                      <select
                        value={rtFontSize}
                        onChange={(e) => setRtFontSize(Number(e.target.value))}
                        className="h-6 w-12 rounded bg-slate-800 px-1 text-[10px] text-slate-300 border border-slate-700 focus:outline-none"
                      >
                        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {/* Bold */}
                      <button
                        onClick={() => { setRtBold((v) => !v); applyRtStyle("bold"); }}
                        className={`h-6 w-6 rounded text-xs font-bold transition-all ${rtBold ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        title="Bold"
                      >B</button>
                      {/* Italic */}
                      <button
                        onClick={() => { setRtItalic((v) => !v); applyRtStyle("italic"); }}
                        className={`h-6 w-6 rounded text-xs italic transition-all ${rtItalic ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        title="Italic"
                      >I</button>
                      {/* Underline */}
                      <button
                        onClick={() => { setRtUnderline((v) => !v); applyRtStyle("underline"); }}
                        className={`h-6 w-6 rounded text-xs underline transition-all ${rtUnderline ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        title="Underline"
                      >U</button>
                      {/* Strikethrough */}
                      <button
                        onClick={() => { setRtStrike((v) => !v); applyRtStyle("strikeThrough"); }}
                        className={`h-6 w-6 rounded text-xs line-through transition-all ${rtStrike ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
                        title="Strikethrough"
                      >S</button>
                      {/* Align */}
                      <button onClick={() => { setRtAlign("left"); applyRtStyle("justifyLeft"); }} className={`h-6 w-6 rounded text-[10px] transition-all ${rtAlign === "left" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`} title="Align left">⬅</button>
                      <button onClick={() => { setRtAlign("center"); applyRtStyle("justifyCenter"); }} className={`h-6 w-6 rounded text-[10px] transition-all ${rtAlign === "center" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`} title="Align center">↔</button>
                      <button onClick={() => { setRtAlign("right"); applyRtStyle("justifyRight"); }} className={`h-6 w-6 rounded text-[10px] transition-all ${rtAlign === "right" ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-700"}`} title="Align right">➡</button>
                      {/* Text color */}
                      <label className="flex items-center gap-0.5 cursor-pointer" title="Text color">
                        <span className="text-[9px] text-slate-500">A</span>
                        <input
                          type="color"
                          value={rtColor}
                          onChange={(e) => { setRtColor(e.target.value); applyRtStyle("foreColor", e.target.value); }}
                          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                        />
                      </label>
                      {/* Highlight color */}
                      <label className="flex items-center gap-0.5 cursor-pointer" title="Background color">
                        <span className="text-[9px] text-slate-500">BG</span>
                        <input
                          type="color"
                          value={rtBgColor === "transparent" ? "#ffffff" : rtBgColor}
                          onChange={(e) => setRtBgColor(e.target.value)}
                          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                        />
                      </label>
                      <div className="w-px h-4 bg-slate-700 mx-0.5" />
                      {/* Confirm */}
                      <button
                        onClick={() => confirmTextBox(tb.id)}
                        className="h-6 w-6 rounded text-white text-xs hover:opacity-80 transition-all"
                        style={{ background: "#0B1F3A" }}
                        title="Confirm (Enter)"
                      >✓</button>
                      {/* Cancel */}
                      <button
                        onClick={() => cancelTextBox(tb.id)}
                        className="h-6 w-6 rounded bg-red-900/60 text-red-300 text-xs hover:bg-red-800 transition-all"
                        title="Cancel (Esc)"
                      >✕</button>
                    </div>
                  )}

                  {/* Editable area */}
                  <div
                    ref={isEditing ? editableRef : undefined}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelTextBox(tb.id);
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) confirmTextBox(tb.id);
                      e.stopPropagation();
                    }}
                    onBlur={() => {
                      // Don't auto-confirm on blur — user might click toolbar
                    }}
                    dangerouslySetInnerHTML={isEditing ? undefined : { __html: tb.html || "Click to edit" }}
                    style={{
                      fontFamily: tb.fontFamily,
                      fontSize: tb.fontSize,
                      color: tb.color,
                      background: tb.bgColor,
                      fontWeight: tb.bold ? "bold" : "normal",
                      fontStyle: tb.italic ? "italic" : "normal",
                      textDecoration: [tb.underline ? "underline" : "", tb.strikethrough ? "line-through" : ""].filter(Boolean).join(" ") || "none",
                      textAlign: tb.align,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: isEditing ? "2px dashed #7c3aed" : "2px dashed transparent",
                      cursor: isEditing ? "text" : "pointer",
                      outline: "none",
                      minWidth: 80,
                      minHeight: 28,
                      maxWidth: 400,
                    }}
                    onClick={(e) => {
                      if (!isEditing) {
                        e.stopPropagation();
                        setEditingTextId(tb.id);
                        setRtFontFamily(tb.fontFamily);
                        setRtFontSize(tb.fontSize);
                        setRtColor(tb.color);
                        setRtBgColor(tb.bgColor);
                        setRtBold(tb.bold);
                        setRtItalic(tb.italic);
                        setRtUnderline(tb.underline);
                        setRtStrike(tb.strikethrough);
                        setRtAlign(tb.align);
                      }
                    }}
                  />
                  {/* Delete text box button */}
                  {!isEditing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTextBoxes((prev) => prev.filter((t) => t.id !== tb.id)); }}
                      className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ fontSize: 9 }}
                      title="Delete text box"
                    >✕</button>
                  )}
                </div>
              );
            })}

            {/* ---- Board Sticky Note overlays ---- */}
            {boardStickies.map((sticky) => {
              const isEditingThis = editingStickyId === sticky.id;
              return (
                <div
                  key={sticky.id}
                  style={{
                    position: "absolute",
                    left: sticky.x,
                    top: sticky.y,
                    width: sticky.width,
                    height: sticky.height,
                    zIndex: 15,
                    background: sticky.color,
                    borderRadius: 6,
                    boxShadow: "2px 4px 12px rgba(0,0,0,0.18)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    cursor: isEditingThis ? "default" : "move",
                    userSelect: "none",
                  }}
                  onMouseDown={(e) => {
                    if (!isEditingThis) handleStickyMouseDown(e, sticky.id);
                  }}
                >
                  {/* Sticky header / drag handle */}
                  <div
                    className="flex items-center justify-between px-2 py-1"
                    style={{ background: "rgba(0,0,0,0.07)", fontSize: 11 }}
                  >
                    <div className="flex gap-1">
                      {STICKY_COLORS.map((c) => (
                        <button
                          key={c}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoardStickies((prev) => prev.map((s) => s.id === sticky.id ? { ...s, color: c } : s));
                          }}
                          className="h-3 w-3 rounded-full border border-black/10 transition-transform hover:scale-110"
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoardStickies((prev) => prev.filter((s) => s.id !== sticky.id));
                        if (editingStickyId === sticky.id) setEditingStickyId(null);
                      }}
                      className="text-black/40 hover:text-red-600 transition-colors text-[10px] leading-none"
                      title="Delete sticky"
                    >✕</button>
                  </div>
                  {/* Sticky text */}
                  <textarea
                    value={t.tr(sticky.text)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBoardStickies((prev) => prev.map((s) => s.id === sticky.id ? { ...s, text: val } : s));
                    }}
                    onFocus={() => setEditingStickyId(sticky.id)}
                    onBlur={() => setEditingStickyId(null)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Note…"
                    className="flex-1 resize-none bg-transparent p-2 text-xs text-slate-800 placeholder-slate-500/70 focus:outline-none"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              );
            })}

            {/* ---- Code Block overlays ---- */}
            {codeBlocks.map((cb) => {
              const isEditingThis = editingCodeId === cb.id;
              return (
                <div
                  key={cb.id}
                  style={{
                    position: "absolute",
                    left: cb.x,
                    top: cb.y,
                    zIndex: 18,
                    minWidth: 280,
                    minHeight: 140,
                    borderRadius: 8,
                    overflow: "hidden",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    border: isEditingThis ? "2px solid #7c3aed" : "2px solid #334155",
                  }}
                >
                  {/* Code block header */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-700">
                    <div className="flex gap-1.5 items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                    </div>
                    <select
                      value={isEditingThis ? pendingLang : cb.language}
                      onChange={(e) => {
                        if (isEditingThis) setPendingLang(e.target.value);
                      }}
                      className="bg-slate-800 text-slate-400 text-[10px] border border-slate-700 rounded px-1 focus:outline-none"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {["javascript", "typescript", "python", "html", "css", "json", "bash"].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {isEditingThis ? (
                        <>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCodeBlocks((prev) => prev.map((b) => b.id === cb.id ? { ...b, code: pendingCode, language: pendingLang } : b));
                              setEditingCodeId(null);
                            }}
                            className="text-amber-400 text-[10px] hover:text-amber-300 transition-colors"
                          >✓ Save</button>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!cb.code) {
                                setCodeBlocks((prev) => prev.filter((b) => b.id !== cb.id));
                              }
                              setEditingCodeId(null);
                            }}
                            className="text-slate-500 text-[10px] hover:text-slate-300 transition-colors ml-1"
                          >✕</button>
                        </>
                      ) : (
                        <>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingCode(cb.code);
                              setPendingLang(cb.language);
                              setEditingCodeId(cb.id);
                            }}
                            className="text-slate-400 text-[10px] hover:text-slate-200 transition-colors"
                          >Edit</button>
                          <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCodeBlocks((prev) => prev.filter((b) => b.id !== cb.id));
                            }}
                            className="text-slate-500 text-[10px] hover:text-red-400 transition-colors ml-1"
                          >✕</button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Code editor / display */}
                  {isEditingThis ? (
                    <textarea
                      value={pendingCode}
                      onChange={(e) => setPendingCode(e.target.value)}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="// Write your code here…"
                      spellCheck={false}
                      className="w-full min-h-[120px] resize-y bg-slate-950 text-amber-300 text-xs font-mono p-3 focus:outline-none border-0"
                      style={{ lineHeight: 1.6, tabSize: 2 }}
                    />
                  ) : (
                    <pre
                      className="bg-slate-950 text-amber-300 text-xs font-mono p-3 overflow-auto max-h-48"
                      style={{ lineHeight: 1.6 }}
                    >
                      {cb.code || <span className="text-slate-600 italic">// empty</span>}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tool indicator watermark */}
          <div className="pointer-events-none absolute bottom-10 left-4 text-[11px] font-medium text-slate-400/70 select-none z-10">
            {TOOLS.find((t) => t.id === activeTool)?.label} · {strokeSize}px
          </div>

          {/* Zoom controls — bottom right */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1 z-20">
            <button
              onClick={() => setZoom((v) => Math.max(0.25, v - 0.1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 text-sm hover:bg-white transition-all shadow"
              title="Zoom out"
            >−</button>
            <button
              onClick={() => setZoom(1.0)}
              className="flex h-7 min-w-[52px] items-center justify-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 text-xs font-mono hover:bg-white transition-all shadow"
              title="Reset zoom"
            >{Math.round(zoom * 100)}%</button>
            <button
              onClick={() => setZoom((v) => Math.min(3.0, v + 0.1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 text-sm hover:bg-white transition-all shadow"
              title="Zoom in"
            >+</button>
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

        {/* Sticky color picker (only visible when sticky tool active) */}
        {activeTool === "sticky" && (
          <section className="border-b border-slate-700/40 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Sticky Color</h3>
            <div className="flex flex-wrap gap-2">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedStickyColor(c)}
                  className={`h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110 ${selectedStickyColor === c ? "border-violet-400 scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </section>
        )}

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
                  <span className="truncate">{t.tr(layer.name)}</span>
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
            SmartBoard v2.0<br />
            {sessionId.slice(0, 22)}
          </p>
        </div>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* AI STUDIO PANEL                                                     */}
      {/* ------------------------------------------------------------------ */}
      {showAiStudio && (
        <aside className="flex w-80 flex-col border-l border-violet-800/40 bg-slate-900/95 backdrop-blur shrink-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                <span className="text-violet-400">✦</span> AI Studio
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Canva Magic — Atlasio Edition</p>
            </div>
            <button onClick={() => setShowAiStudio(false)} className="text-slate-600 hover:text-slate-300 transition-colors">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700/50 overflow-x-auto">
            {([ ["assist","✦","AI"], ["write","✏️","Write"], ["brainstorm","💡","Ideas"], ["mindmap","🗺","Map"], ["presentation","🎨","Slides"], ["summarize","📄","Switch"] ] as [AiStudioTab, string, string][]).map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => setAiStudioTab(tab)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors shrink-0 ${aiStudioTab === tab ? "border-b-2 border-violet-500 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* AI Assist */}
            {aiStudioTab === "assist" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("Tahtaya ne çizmek istediğinizi açıklayın, AI önerisini alın.")}</p>
                <textarea
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                  rows={4} placeholder={t.tr("örn. Fotosentez için mind map oluştur")} value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button onClick={handleAiAssist} disabled={aiLoading || !aiPrompt.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:from-violet-500 hover:to-indigo-500 transition-all">
                  {aiLoading ? t.tr("Düşünüyor…") : t.tr("Oluştur")}
                </button>
                {aiError && <p className="text-xs text-red-400">{aiError}</p>}
                {aiSuggestion?.text && <div className="rounded-xl border border-violet-800/40 bg-violet-950/20 p-3 text-xs text-slate-300 leading-relaxed">{t.tr(aiSuggestion.text)}</div>}
              </div>
            )}

            {/* Magic Write */}
            {aiStudioTab === "write" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("İçeriği yeniden yaz veya tonu değiştir.")}</p>
                <textarea
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                  rows={4} placeholder={t.tr("Yeniden yazmak istediğiniz metni girin…")} value={mwText}
                  onChange={(e) => setMwText(e.target.value)}
                />
                <div className="flex gap-2">
                  {(["formal","casual","academic","simple"] as const).map((tone) => (
                    <button key={tone} onClick={() => setMwTone(tone)}
                      className={`flex-1 rounded-lg py-1.5 text-[10px] font-medium transition-all ${mwTone === tone ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                      {tone === "formal" ? t.tr("Resmi") : tone === "casual" ? t.tr("Sade") : tone === "academic" ? t.tr("Akademik") : t.tr("Basit")}
                    </button>
                  ))}
                </div>
                <button onClick={handleMagicWrite} disabled={mwLoading || !mwText.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all">
                  {mwLoading ? t.tr("Yazıyor…") : t.tr("✏️ Yeniden Yaz")}
                </button>
                {mwResult && (
                  <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {mwResult}
                  </div>
                )}
              </div>
            )}

            {/* Brainstorm Sticky Notes */}
            {aiStudioTab === "brainstorm" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("Konu için yapışkan not fikirleri üret.")}</p>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                  placeholder={t.tr("örn. Fotosentez")} value={bsTopic}
                  onChange={(e) => setBsTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBrainstorm()}
                />
                <button onClick={handleBrainstorm} disabled={bsLoading || !bsTopic.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all">
                  {bsLoading ? t.tr("Üretiyor…") : t.tr("💡 Fikir Üret")}
                </button>
                {bsNotes.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {bsNotes.map((n) => (
                      <div key={n.id} className="rounded-lg p-2.5 text-[11px] font-medium text-slate-800 shadow-sm leading-snug" style={{ background: n.color }}>
                        {t.tr(n.text)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mind Map */}
            {aiStudioTab === "mindmap" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("Konunun zihin haritasını oluştur.")}</p>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                  placeholder={t.tr("örn. Hücre Bölünmesi")} value={mmTopic}
                  onChange={(e) => setMmTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMindMap()}
                />
                <button onClick={handleMindMap} disabled={mmLoading || !mmTopic.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all">
                  {mmLoading ? t.tr("Oluşturuyor…") : t.tr("🗺 Harita Oluştur")}
                </button>
                {mmData && (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                    <div className="text-xs font-bold text-violet-300 mb-2 text-center">{t.tr(mmData.label)}</div>
                    <div className="space-y-1.5">
                      {mmData.children.map((branch) => (
                        <div key={branch.id} className="rounded-lg bg-slate-700/60 px-3 py-2">
                          <div className="text-[11px] font-semibold text-slate-200 mb-1">{t.tr(branch.label)}</div>
                          {branch.children.length > 0 && (
                            <div className="space-y-1 pl-2 border-l border-slate-600">
                              {branch.children.map((child) => (
                                <div key={child.id} className="text-[10px] text-slate-400">{t.tr(child.label)}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Presentation */}
            {aiStudioTab === "presentation" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("Konudan tam slayt sunumu oluştur.")}</p>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                  placeholder={t.tr("örn. Makine Öğrenmesi")} value={pTopic}
                  onChange={(e) => setPTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePresentation()}
                />
                <button onClick={handlePresentation} disabled={pLoading || !pTopic.trim()} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all">
                  {pLoading ? t.tr("Hazırlıyor…") : t.tr("🎨 Sunum Oluştur")}
                </button>
                {pSlides && (
                  <div className="space-y-2">
                    <div className="rounded-xl bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border border-violet-700/40 p-4 text-center">
                      <div className="text-sm font-bold text-slate-100">{t.tr(pSlides.title)}</div>
                      <div className="text-[11px] text-violet-300 mt-0.5">{t.tr(pSlides.subtitle)}</div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {pSlides.slides.map((_, i) => (
                        <button key={i} onClick={() => setPActiveSlide(i)}
                          className={`rounded px-2 py-0.5 text-[10px] transition-all ${pActiveSlide === i ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    {pSlides.slides[pActiveSlide] && (
                      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                        <div className="text-xs font-bold text-slate-200 mb-2">{pSlides.slides[pActiveSlide].title}</div>
                        <ul className="space-y-1">
                          {pSlides.slides[pActiveSlide].bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <span className="text-violet-400 mt-0.5">•</span>{b}
                            </li>
                          ))}
                        </ul>
                        {pSlides.slides[pActiveSlide].speakerNote && (
                          <div className="mt-2 rounded-lg bg-amber-950/30 border border-amber-800/30 px-2 py-1.5 text-[10px] text-amber-300/80">
                            {t.tr("Not:")} {pSlides.slides[pActiveSlide].speakerNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Magic Switch — Summarize */}
            {aiStudioTab === "summarize" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">{t.tr("Tahta içeriğini yapılandırılmış ders dokümanına dönüştür.")}</p>
                <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-[11px] text-slate-500">
                  {t.tr("Tahtadaki tüm TEXT eylemleri otomatik analiz edilir.")}
                </div>
                <button onClick={handleSummarize} disabled={sumLoading} className="w-full rounded-xl py-2 text-xs font-semibold text-white disabled:opacity-50 hover:opacity-80 transition-all" style={{ background: "#0B1F3A" }}>
                  {sumLoading ? t.tr("Analiz ediliyor…") : t.tr("📄 Dönüştür")}
                </button>
                {sumResult && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3">
                      <div className="text-xs font-bold text-amber-300 mb-1">{t.tr(sumResult.title)}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{sumResult.introduction}</p>
                    </div>
                    {sumResult.sections.map((s, i) => (
                      <div key={i} className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                        <div className="text-[11px] font-semibold text-slate-200 mb-1">{t.tr(s.heading)}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{t.tr(s.content)}</p>
                      </div>
                    ))}
                    {sumResult.keyPoints.length > 0 && (
                      <div className="rounded-xl border border-blue-800/30 bg-blue-950/20 p-3">
                        <div className="text-[11px] font-semibold text-blue-300 mb-2">{t.tr("Anahtar Noktalar")}</div>
                        <ul className="space-y-1">
                          {sumResult.keyPoints.map((kp, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300">
                              <span className="text-blue-400 mt-0.5">✓</span>{kp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* AI ASSIST MODAL                                                     */}
      {/* ------------------------------------------------------------------ */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowAiModal(false)}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
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

            {aiError && (
              <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {aiError}
              </div>
            )}

            {aiSuggestion && (
              <div className="mt-4 rounded-xl border border-violet-900/40 bg-violet-950/20 p-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-500">
                  AI Suggestion
                </div>
                {aiSuggestion.text && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {t.tr(aiSuggestion.text)}
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

      {/* ------------------------------------------------------------------ */}
      {/* CLASSROOM TIMER WIDGET                                              */}
      {/* ------------------------------------------------------------------ */}
      {showTimer && (
        <div className="fixed top-16 right-4 z-40 w-[200px] rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Timer</span>
            <button
              onClick={() => { setShowTimer(false); setTimerRunning(false); }}
              className="text-slate-600 hover:text-slate-300 transition-colors text-sm"
            >✕</button>
          </div>

          {/* Countdown display */}
          <div
            className={`text-center font-mono text-4xl font-bold mb-3 transition-colors ${timerLeft <= 10 && timerRunning ? "text-red-400 animate-pulse" : "text-slate-100"}`}
          >
            {timerDisplay}
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-slate-700 mb-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${timerLeft <= 10 ? "bg-red-500" : "bg-violet-500"}`}
              style={{ width: `${timerTotal > 0 ? (timerLeft / timerTotal) * 100 : 0}%` }}
            />
          </div>

          {/* Input */}
          {!timerRunning && (
            <div className="flex gap-1 mb-3">
              <div className="flex-1">
                <label className="text-[9px] text-slate-600 block mb-0.5">MIN</label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex items-end pb-1 text-slate-500">:</div>
              <div className="flex-1">
                <label className="text-[9px] text-slate-600 block mb-0.5">SEC</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (!timerRunning) {
                  const total = timerMinutes * 60 + timerSeconds;
                  if (timerLeft === 0 || timerLeft === timerTotal) {
                    setTimerTotal(total);
                    setTimerLeft(total);
                  }
                }
                setTimerRunning((v) => !v);
              }}
              className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${timerRunning ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"}`}
            >
              {timerRunning ? "Pause" : timerLeft === 0 ? "Restart" : "Start"}
            </button>
            <button
              onClick={timerReset}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
    </div>
  );
}
