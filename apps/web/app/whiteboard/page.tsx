"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { WhiteboardLocal, WhiteboardLocalHandle, WhiteboardTool } from "./whiteboard-local";
import { useI18n } from "../_i18n/use-i18n";

// ─── API ─────────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type RightPanel = "ai" | "brainstorm" | "magic" | "layers" | "chat" | "participants" | "files" | "records" | "quiz" | null;

interface ChatMsg { id: string; sender: string; text: string; time: Date; self?: boolean; }
interface ParticipantEntry { id: string; name: string; online: boolean; handRaised: boolean; muted?: boolean; }
interface FileEntry { id: string; name: string; size: string; type: string; uploadedAt: Date; }
interface Recording { id: string; name: string; duration: string; date: Date; }
interface QuizQ { id: string; text: string; options: string[]; correct: number; votes?: number[]; }

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ic = {
  Back: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
  Cursor: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-7 1-3 7z"/></svg>,
  Pan: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>,
  Pen: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  Highlighter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h3l6-6m2-13 6 6-10 10"/></svg>,
  Eraser: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/></svg>,
  Laser: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="m4.9 4.9 2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></svg>,
  Text: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Note: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Rect: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  Circle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>,
  Arrow: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></svg>,
  Math: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16M4 12h8M4 20h16M16 8l4 4-4 4"/></svg>,
  Undo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13A9 9 0 1 0 5.7 5.7L3 7"/></svg>,
  Redo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M21 13A9 9 0 1 1 18.3 5.7L21 7"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ChevLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Send: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Sparkle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>,
  AI: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M9 17v1a3 3 0 0 0 6 0v-1M12 17v4"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="8" r="1" fill="currentColor" stroke="none"/></svg>,
  Bulb: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/></svg>,
  Magic: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M12.2 6.2 11 5M12.2 11.8 11 13"/><path d="M3 21 12 12"/><path d="M12.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"/></svg>,
  Layers: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Signal: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h.01M7 20v-4M12 20V10M17 20V4M22 20h.01"/></svg>,
  Chat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  FileText: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Record: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>,
  Quiz: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Hand: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 012.83-2.82L7 15"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  Mic: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  MicOff: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Video: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  VideoOff: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Screen: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2v-3"/><path d="M8 21h8M12 17v4"/><polyline points="17 8 21 4 17 0"/><line x1="21" y1="4" x2="9" y2="4"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Unlock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>,
  Focus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h5M3 3v5M21 3h-5M21 3v5M3 21h5M3 21v-5M21 21h-5M21 21v-5"/><circle cx="12" cy="12" r="3"/></svg>,
  EndCall: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36.54 2 2 0 012.34-1.5H5.5a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.48 8.3"/><line x1="23" y1="1" x2="1" y2="23"/></svg>,
  Maximize: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>,
  Minimize: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/></svg>,
  Camera: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Palette: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
};

// ─── Palettes ────────────────────────────────────────────────────────────────
const PALETTE: { label: string; colors: string[] }[] = [
  { label: "Nötr", colors: ["#FFFFFF", "#E2E8F0", "#94A3B8", "#334155"] },
  { label: "Ateş", colors: ["#FEF3C7", "#FCA5A5", "#F87171", "#EF4444"] },
  { label: "Okyanus", colors: ["#BAE6FD", "#38BDF8", "#0EA5E9", "#0284C7"] },
  { label: "Orman", colors: ["#BBF7D0", "#4ADE80", "#06D6A0", "#00A878"] },
  { label: "Mor", colors: ["#E9D5FF", "#C084FC", "#9B59FF", "#7C3AED"] },
  { label: "Fuchsia", colors: ["#FBCFE8", "#F472B6", "#FF6BCC", "#DB2777"] },
];
const ALL_COLORS = PALETTE.flatMap((p) => p.colors);
const STROKE_WIDTHS = [2, 4, 6, 10, 16];

// ─── Tool groups ──────────────────────────────────────────────────────────────
type ToolItem = { id: WhiteboardTool; label: string; icon: React.ReactNode };
const TOOL_GROUPS: ToolItem[][] = [
  [
    { id: "cursor", label: "Seç (V)", icon: <Ic.Cursor /> },
    { id: "pan",    label: "Kaydır (H)", icon: <Ic.Pan /> },
  ],
  [
    { id: "pen",         label: "Kalem (P)", icon: <Ic.Pen /> },
    { id: "highlighter", label: "Fosforlu (L)", icon: <Ic.Highlighter /> },
    { id: "eraser",      label: "Silgi (E)", icon: <Ic.Eraser /> },
    { id: "laser",       label: "Lazer Pointer", icon: <Ic.Laser /> },
  ],
  [
    { id: "text",     label: "Metin (T)", icon: <Ic.Text /> },
    { id: "note",     label: "Not Kartı (N)", icon: <Ic.Note /> },
    { id: "math",     label: "Formül / Denklem", icon: <Ic.Math /> },
  ],
  [
    { id: "rect",     label: "Dikdörtgen (R)", icon: <Ic.Rect /> },
    { id: "circle",   label: "Daire (C)", icon: <Ic.Circle /> },
    { id: "arrow",    label: "Ok (A)", icon: <Ic.Arrow /> },
    { id: "line" as WhiteboardTool, label: "Düz Çizgi", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg> },
    { id: "triangle", label: "Üçgen", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 3 22 21 2 21"/></svg> },
    { id: "star",     label: "Yıldız", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  ],
];

const DRAWING_TOOLS: Set<WhiteboardTool> = new Set([
  "pen","highlighter","eraser","rect","circle","arrow","line","text","note","laser","math","triangle","star",
]);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhiteboardPage() {
  const t = useI18n();
  const wb = t.whiteboard.labels;
  const wbRef = useRef<WhiteboardLocalHandle>(null);

  const [activeTool, setActiveTool]   = useState<WhiteboardTool>("pen");
  const [color, setColor]             = useState("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [rightPanel, setRightPanel]   = useState<RightPanel>(null);
  const [colorOpen, setColorOpen]     = useState(false);

  const [sessionId, setSessionId]           = useState<string | null>(null);
  const [roomName, setRoomName]             = useState("Tahta — Demo");
  const [sessionStatus, setSessionStatus]   = useState<"idle"|"connecting"|"live">("idle");

  const [wbPageCount, setWbPageCount]     = useState(1);
  const [wbCurrentPage, setWbCurrentPage] = useState(0);

  const [aiPrompt, setAiPrompt]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState<string | null>(null);

  const [bsTopic, setBsTopic]   = useState("");
  const [bsCount, setBsCount]   = useState(6);
  const [bsLoading, setBsLoading] = useState(false);
  const [bsNotes, setBsNotes]   = useState<string[]>([]);

  const [magicLoading, setMagicLoading] = useState(false);
  const [magicDoc, setMagicDoc]         = useState<string | null>(null);

  const [layers, setLayers]       = useState<string[]>(["Katman 1"]);
  const [activeLayer, setActiveLayer] = useState("Katman 1");

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: "c1", sender: "Ayşe Kaya",    text: "Hocam soruyu anlayamadım 🙋",          time: new Date(Date.now()-180000) },
    { id: "c2", sender: "Mehmet Demir", text: "Ben de aynı soruyu sormak istiyordum",  time: new Date(Date.now()-120000) },
    { id: "c3", sender: "Öğretmen",     text: "Şimdi tahtadan açıklıyorum 👍",         time: new Date(Date.now()-60000), self: true },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Participants ──────────────────────────────────────────────────────────
  const [participants] = useState<ParticipantEntry[]>([
    { id: "u1", name: "Ayşe Kaya",     online: true,  handRaised: true,  muted: false },
    { id: "u2", name: "Mehmet Demir",  online: true,  handRaised: false, muted: true },
    { id: "u3", name: "Zeynep Arslan", online: false, handRaised: false, muted: true },
    { id: "u4", name: "Ali Yılmaz",    online: true,  handRaised: true,  muted: false },
    { id: "u5", name: "Fatma Şahin",   online: true,  handRaised: false, muted: false },
    { id: "u6", name: "Emre Kılıç",    online: true,  handRaised: false, muted: true },
  ]);

  // ── Files ─────────────────────────────────────────────────────────────────
  const [sharedFiles, setSharedFiles] = useState<FileEntry[]>([
    { id: "f1", name: "ders_notları.pdf",    size: "1.2 MB", type: "pdf",   uploadedAt: new Date(Date.now()-3600000) },
    { id: "f2", name: "alıştırmalar.docx",  size: "340 KB", type: "docx",  uploadedAt: new Date(Date.now()-7200000) },
    { id: "f3", name: "grafik.png",          size: "220 KB", type: "image", uploadedAt: new Date(Date.now()-1800000) },
  ]);

  // ── Recordings ────────────────────────────────────────────────────────────
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([
    { id: "r1", name: "Ders Kaydı — 28 Mar", duration: "42:15", date: new Date(Date.now()-86400000) },
    { id: "r2", name: "Ders Kaydı — 27 Mar", duration: "38:02", date: new Date(Date.now()-172800000) },
  ]);

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState<QuizQ[]>([
    { id: "q1", text: "HTTP'de hangi durum kodu 'Bulunamadı' anlamına gelir?",          options: ["200","301","404","500"], correct: 2, votes: [3,1,14,2] },
    { id: "q2", text: "JavaScript'te hangi anahtar kelime değişken tanımlamak için kullanılmaz?", options: ["var","let","const","dim"], correct: 3, votes: [2,3,4,11] },
    { id: "q3", text: "Bir üçgenin iç açıları toplamı kaç derecedir?",                  options: ["90°","180°","270°","360°"], correct: 1, votes: [1,18,0,1] },
  ]);
  const [activeQuizIdx, setActiveQuizIdx] = useState(0);
  const [publishedQuiz, setPublishedQuiz] = useState<string | null>(null);

  // ── Media / Session controls ───────────────────────────────────────────────
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [boardLocked, setBoardLocked] = useState(false);
  const [cursorsVisible, setCursorsVisible] = useState(true);
  const [studentPerms, setStudentPerms] = useState<Record<string, { mic: boolean; cam: boolean; screen: boolean; file: boolean }>>({});

  // ── Instructor camera PiP ─────────────────────────────────────────────────
  const [showCamera, setShowCamera] = useState(true);
  const [camPos, setCamPos] = useState({ x: 16, y: 16 });
  const camDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sbTip, setSbTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const [focusBroadcast, setFocusBroadcast] = useState(false);
  const wbContainerRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      wbContainerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isFullscreen]);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Contextual text toolbar — shows only while actively editing text
  const [textEditing, setTextEditing] = useState(false);
  const [textEditProps, setTextEditProps] = useState<{ fontSize: number; bold: boolean; italic: boolean; fontFamily: string; color: string } | null>(null);

  // Recording timer
  useEffect(() => {
    if (recordingActive) {
      recordTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => { if (recordTimerRef.current) clearInterval(recordTimerRef.current); };
  }, [recordingActive]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // close color picker on outside click
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!colorOpen) return;
    const handler = (e: MouseEvent) => {
      if (colorBtnRef.current && !colorBtnRef.current.closest("[data-color-panel]")?.contains(e.target as Node)) {
        setColorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorOpen]);

  const pickTool = useCallback((tool: WhiteboardTool) => {
    setActiveTool(tool);
    wbRef.current?.setTool(tool);
  }, []);

  const pickColor = useCallback((c: string) => {
    setColor(c);
    wbRef.current?.setColor(c);
  }, []);

  const pickWidth = useCallback((w: number) => {
    setStrokeWidth(w);
    wbRef.current?.setWidth(w);
  }, []);

  const sendChat = useCallback(() => {
    const txt = chatInput.trim();
    if (!txt) return;
    setChatMessages((prev) => [...prev, { id: `c${Date.now()}`, sender: "Ben", text: txt, time: new Date(), self: true }]);
    setChatInput("");
  }, [chatInput]);

  const toggleRecording = useCallback(() => {
    if (recordingActive) {
      const mins = Math.floor(recordingSeconds / 60).toString().padStart(2,"0");
      const secs = (recordingSeconds % 60).toString().padStart(2,"0");
      setRecordings((prev) => [
        { id: `r${Date.now()}`, name: `Ders Kaydı — ${new Date().toLocaleDateString("tr-TR")}`, duration: `${mins}:${secs}`, date: new Date() },
        ...prev,
      ]);
      setRecordingSeconds(0);
    }
    setRecordingActive((a) => !a);
  }, [recordingActive, recordingSeconds]);

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
      } else { setSessionStatus("idle"); }
    } catch { setSessionStatus("idle"); }
  }, []);

  const runAiAssist = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult(null);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/ai-assist`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (res.ok) { const d = await res.json(); setAiResult(d.suggestion ?? JSON.stringify(d, null, 2)); }
      else setAiResult("AI servisi şu an yanıt vermiyor.");
    } catch { setAiResult("Bağlantı hatası."); }
    finally { setAiLoading(false); }
  }, [aiPrompt, sessionId]);

  const runBrainstorm = useCallback(async () => {
    if (!bsTopic.trim()) return;
    setBsLoading(true); setBsNotes([]);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/sticky-notes`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ topic: bsTopic, count: bsCount, language: "tr" }),
      });
      if (res.ok) {
        const d = await res.json();
        const notes: string[] = Array.isArray(d.notes) ? d.notes : Array.isArray(d) ? d : [String(d)];
        setBsNotes(notes);
        notes.forEach((n) => wbRef.current?.addNote(n));
      } else setBsNotes(["Servis yanıt vermedi."]);
    } catch { setBsNotes(["Bağlantı hatası."]); }
    finally { setBsLoading(false); }
  }, [bsTopic, bsCount, sessionId]);

  const runMagicSwitch = useCallback(async () => {
    setMagicLoading(true); setMagicDoc(null);
    const sid = sessionId ?? "demo-session";
    try {
      const res = await fetch(`${API}/whiteboard/${sid}/summarize`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ language: "tr" }),
      });
      if (res.ok) {
        const d = await res.json();
        setMagicDoc(typeof d.document === "string" ? d.document : d.content ?? JSON.stringify(d, null, 2));
      } else setMagicDoc("Servis yanıt vermedi.");
    } catch { setMagicDoc("Bağlantı hatası."); }
    finally { setMagicLoading(false); }
  }, [sessionId]);

  const addLayer = useCallback(() => {
    const name = `Katman ${layers.length + 1}`;
    setLayers((p) => [...p, name]);
    setActiveLayer(name);
  }, [layers]);

  const toggleRight = (p: RightPanel) => setRightPanel((prev) => (prev === p ? null : p));

  const isDrawingTool = DRAWING_TOOLS.has(activeTool);

  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div ref={wbContainerRef} style={{
      display: "flex", flexDirection: "column",
      margin: isFullscreen ? "0" : "-28px",
      width: isFullscreen ? "100vw" : "calc(100% + 56px)",
      height: isFullscreen ? "100vh" : "calc(100vh - 148px)",
      overflow: "hidden",
      background: "#060812",
      position: isFullscreen ? "fixed" : "relative",
      inset: isFullscreen ? 0 : "auto",
      zIndex: isFullscreen ? 9999 : "auto",
    }}>

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <header data-wb-header style={{
        height: 50, flexShrink: 0, zIndex: 40,
        display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
        background: "rgba(6,8,18,0.96)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        {/* Back */}
        <a href="/dashboard" style={{
          display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
          color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600,
          padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)", transition: "all 0.15s", flexShrink: 0,
        }}>
          <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Back /></span>
          {t.tr("Geri")}
        </a>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />

        {/* Title */}
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 700,
            letterSpacing: "-0.02em", flex: 1, minWidth: 0,
          }}
        />

        {/* Session badge */}
        {sessionStatus === "live" ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800,
            color: "#00B4D8", background: "rgba(0,180,216,0.12)",
            border: "1px solid rgba(0,180,216,0.3)", borderRadius: 99, padding: "3px 10px",
            textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00B4D8" }} />
            {t.tr("Canlı")}
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700,
            color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "3px 10px",
            textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t.tr("Yerel")}
          </span>
        )}

        {/* Page nav pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 1,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "2px 4px", flexShrink: 0,
        }}>
          <HBtn onClick={() => {
            const cur = wbRef.current?.getCurrentPage() ?? 0;
            if (cur > 0) { wbRef.current?.goToPage(cur - 1); setWbCurrentPage(cur - 1); }
          }} title={t.tr("Önceki")}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.ChevLeft /></span>
          </HBtn>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", minWidth: 44, textAlign: "center", padding: "0 4px" }}>
            {wbCurrentPage + 1} / {wbPageCount}
          </span>
          <HBtn onClick={() => {
            const cur = wbRef.current?.getCurrentPage() ?? 0;
            const tot = wbRef.current?.getPageCount() ?? 1;
            if (cur < tot - 1) { wbRef.current?.goToPage(cur + 1); setWbCurrentPage(cur + 1); }
          }} title={t.tr("Sonraki")}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.ChevRight /></span>
          </HBtn>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />
          <HBtn onClick={() => {
            wbRef.current?.addPage();
            const tot = wbRef.current?.getPageCount() ?? 1;
            setWbPageCount(tot); setWbCurrentPage(tot - 1);
          }} title={t.tr("Yeni sayfa")} style={{ color: "#5B6EFF" }}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Plus /></span>
          </HBtn>
        </div>

        {/* Right panel toggles — Sınıf */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2 }}>SINIF</span>
          {([
            { id: "chat"         as RightPanel, icon: <Ic.Chat />,     color: "#22d3ee", label: "Sohbet" },
            { id: "participants" as RightPanel, icon: <Ic.Users />,    color: "#34d399", label: "Katılımcılar" },
            { id: "files"        as RightPanel, icon: <Ic.FileText />, color: "#fb923c", label: "Dosyalar" },
            { id: "records"      as RightPanel, icon: <Ic.Record />,   color: "#f43f5e", label: "Kayıtlar" },
            { id: "quiz"         as RightPanel, icon: <Ic.Quiz />,     color: "#a78bfa", label: "Quiz / Anket" },
          ] as { id: RightPanel; icon: React.ReactNode; color: string; label: string }[]).map((b) => (
            <HBtn
              key={String(b.id)}
              onClick={() => toggleRight(b.id)}
              title={t.tr(b.label)}
              style={rightPanel === b.id ? { color: b.color, background: `${b.color}18`, border: `1px solid ${b.color}30` } : {}}
            >
              <span style={{ width: 15, height: 15, display: "flex" }}>{b.icon}</span>
            </HBtn>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />

        {/* Right panel toggles — AI Araçları */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2 }}>AI</span>
          {([
            { id: "ai"         as RightPanel, icon: <Ic.AI />,     color: "#5B6EFF", label: "AI Asistan" },
            { id: "brainstorm" as RightPanel, icon: <Ic.Bulb />,   color: "#9B59FF", label: "Beyin Fırtınası" },
            { id: "magic"      as RightPanel, icon: <Ic.Magic />,  color: "#00B4D8", label: "Sihirli Dönüştür" },
            { id: "layers"     as RightPanel, icon: <Ic.Layers />, color: "#FFB347", label: "Katmanlar" },
          ] as { id: RightPanel; icon: React.ReactNode; color: string; label: string }[]).map((b) => (
            <HBtn
              key={String(b.id)}
              onClick={() => toggleRight(b.id)}
              title={t.tr(b.label)}
              style={rightPanel === b.id ? { color: b.color, background: `${b.color}18`, border: `1px solid ${b.color}30` } : {}}
            >
              <span style={{ width: 15, height: 15, display: "flex" }}>{b.icon}</span>
            </HBtn>
          ))}
        </div>

        {/* Download + Undo/Redo/Clear + Live start */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <HBtn onClick={() => wbRef.current?.undo()} title="Geri Al (Ctrl+Z)">
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Undo /></span>
          </HBtn>
          <HBtn onClick={() => wbRef.current?.redo()} title="Yinele (Ctrl+Y)">
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Redo /></span>
          </HBtn>
          <HBtn onClick={() => wbRef.current?.clear()} title={t.tr("Tahtayı Temizle")} style={{ color: "rgba(248,113,113,0.6)" }}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Trash /></span>
          </HBtn>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />
          <HBtn onClick={() => wbRef.current?.download()} title={t.tr("PNG İndir")}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Download /></span>
          </HBtn>
          <HBtn onClick={toggleFullscreen} title={isFullscreen ? t.tr("Tam Ekrandan Çık") : t.tr("Tam Ekran")} style={isFullscreen ? { color: "#a5b4fc" } : {}}>
            <span style={{ width: 14, height: 14, display: "flex" }}>{isFullscreen ? <Ic.Minimize /> : <Ic.Maximize />}</span>
          </HBtn>
          <HBtn onClick={() => setShowCamera(v => !v)} title={showCamera ? t.tr("Kamerayı Gizle") : t.tr("Kamerayı Göster")} style={showCamera ? { color: "#4ade80" } : {}}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Camera /></span>
          </HBtn>
          {sessionStatus !== "live" && (
            <button
              onClick={startSession}
              disabled={sessionStatus === "connecting"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: sessionStatus === "connecting"
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, #5B6EFF, #00B4D8)",
                color: sessionStatus === "connecting" ? "rgba(255,255,255,0.4)" : "#fff",
                fontSize: 11, fontWeight: 800, letterSpacing: "0.02em",
                boxShadow: sessionStatus !== "connecting" ? "0 0 20px rgba(91,110,255,0.35)" : "none",
              }}
            >
              <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Signal /></span>
              {sessionStatus === "connecting" ? t.tr("Bağlanıyor…") : t.tr("Canlı Başlat")}
            </button>
          )}
        </div>
      </header>

      {/* ══ PERMANENT COLOR BAR ══════════════════════════════════════════════ */}
      <div style={{
        height: 38, flexShrink: 0, zIndex: 25,
        display: "flex", alignItems: "center", gap: 6, padding: "0 14px",
        background: "rgba(6,8,18,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>RENK</span>
        <div
          onClick={() => document.getElementById("wb-color-input")?.click()}
          style={{ width: 18, height: 18, borderRadius: "50%", background: color, border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", flexShrink: 0, boxShadow: `0 0 8px ${color}66` }}
        />
        <input id="wb-color-input" type="color" value={color} onChange={e => pickColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
        {(["#FFFFFF","#ef4444","#f59e0b","#facc15","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#f43f5e","#fb923c","#a3e635","#2dd4bf","#60a5fa","#c084fc","#1e293b","#000000"] as string[]).map(c => (
          <button key={c} onClick={() => pickColor(c)} style={{ width: 16, height: 16, borderRadius: "50%", border: color === c ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.1)", background: c, cursor: "pointer", flexShrink: 0, transform: color === c ? "scale(1.25)" : "scale(1)", transition: "transform 0.1s" }} />
        ))}
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
        <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>KALINLIK</span>
        {STROKE_WIDTHS.map(w => (
          <button key={w} onClick={() => pickWidth(w)} style={{
            height: 28, minWidth: 32, borderRadius: 6, border: "none", cursor: "pointer",
            background: strokeWidth === w ? "rgba(91,110,255,0.2)" : "transparent",
            boxShadow: strokeWidth === w ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
          }}>
            <div style={{ width: Math.max(16, w * 2), height: w, borderRadius: 99, background: strokeWidth === w ? "#a5b4fc" : "rgba(255,255,255,0.3)" }} />
          </button>
        ))}
      </div>

      {/* ══ CONTEXT TOOLBAR ══════════════════════════════════════════════════ */}
      {(isDrawingTool || textEditing) && (
        <div style={{
          height: 40, flexShrink: 0, zIndex: 30,
          display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
          background: "rgba(8,9,22,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          animation: "fadeUp 0.15s ease",
        }}>
          {/* Pen / Highlighter toolbar */}
          {(activeTool === "pen" || activeTool === "highlighter") && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
                {activeTool === "pen" ? t.tr("Kalem") : t.tr("Fosforlu")}
              </span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {STROKE_WIDTHS.map(w => (
                <button key={w} onClick={() => pickWidth(w)} style={{
                  height: 28, minWidth: 32, borderRadius: 6, border: "none", cursor: "pointer",
                  background: strokeWidth === w ? "rgba(91,110,255,0.2)" : "transparent",
                  boxShadow: strokeWidth === w ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
                }}>
                  <div style={{ width: Math.max(16, w*2), height: w, borderRadius: 99, background: strokeWidth === w ? "#a5b4fc" : "rgba(255,255,255,0.3)" }} />
                </button>
              ))}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Opacity:</span>
              {[100,75,50,25].map(op => (
                <button key={op} onClick={() => {}} style={{ height: 22, padding: "0 7px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, background: op === 100 ? "rgba(91,110,255,0.15)" : "transparent", color: op === 100 ? "#a5b4fc" : "rgba(255,255,255,0.3)" }}>{op}%</button>
              ))}
            </>
          )}
          {/* Eraser toolbar */}
          {activeTool === "eraser" && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Silgi Boyutu")}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {[8,14,22,36].map(w => (
                <button key={w} onClick={() => pickWidth(w)} style={{
                  width: 36, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                  background: strokeWidth === w ? "rgba(91,110,255,0.2)" : "transparent",
                  boxShadow: strokeWidth === w ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: w/2, height: w/2, borderRadius: 3, border: `${strokeWidth === w ? 1.5 : 1}px solid ${strokeWidth === w ? "#a5b4fc" : "rgba(255,255,255,0.3)"}` }} />
                </button>
              ))}
            </>
          )}
          {/* Text toolbar — only shows while actively editing text (Word-like) */}
          {textEditing && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Metin")}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {["Inter","Georgia","Courier New","Arial Black"].map(f => (
                <button key={f} onClick={() => {}} style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: f }}>{f.split(" ")[0]}</button>
              ))}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {[12,16,20,28,36,48].map(s => (
                <button key={s} onClick={() => {}} style={{ padding: "2px 7px", borderRadius: 5, border: "none", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer" }}>{s}</button>
              ))}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {[
                { label: "B", style: { fontWeight: 900 }, title: "Kalın" },
                { label: "I", style: { fontStyle: "italic" }, title: "İtalik" },
                { label: "U", style: { textDecoration: "underline" }, title: "Altı çizili" },
              ].map(b => (
                <button key={t.tr(b.title)} title={t.tr(b.title)} onClick={() => {}} style={{ width: 26, height: 24, borderRadius: 5, border: "none", background: "transparent", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 13, ...b.style, display: "flex", alignItems: "center", justifyContent: "center" }}>{t.tr(b.label)}</button>
              ))}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {["#FFFFFF","#ef4444","#f59e0b","#22c55e","#3b82f6","#a855f7"].map(c => (
                <button key={c} onClick={() => pickColor(c)} style={{ width: 18, height: 18, borderRadius: "50%", border: color === c ? "2px solid rgba(255,255,255,0.9)" : "1.5px solid rgba(255,255,255,0.12)", background: c, cursor: "pointer", flexShrink: 0 }} />
              ))}
            </>
          )}
          {/* Shape toolbar */}
          {(activeTool === "rect" || activeTool === "circle" || activeTool === "arrow" || activeTool === "triangle" || activeTool === "star") && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Şekil")}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{t.tr("Kenarlık:")}</span>
              {STROKE_WIDTHS.map(w => (
                <button key={w} onClick={() => pickWidth(w)} style={{ height: 26, minWidth: 28, borderRadius: 6, border: "none", cursor: "pointer", background: strokeWidth === w ? "rgba(91,110,255,0.2)" : "transparent", boxShadow: strokeWidth === w ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "none", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                  <div style={{ width: Math.max(14, w*2), height: w, borderRadius: 99, background: strokeWidth === w ? "#a5b4fc" : "rgba(255,255,255,0.3)" }} />
                </button>
              ))}
            </>
          )}
          {/* Laser toolbar */}
          {activeTool === "laser" && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Lazer Pointer")}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {["#ef4444","#22c55e","#3b82f6","#FFFFFF"].map(c => (
                <button key={c} onClick={() => pickColor(c)} style={{ width: 18, height: 18, borderRadius: "50%", border: color === c ? "2px solid rgba(255,255,255,0.9)" : "1.5px solid rgba(255,255,255,0.12)", background: c, cursor: "pointer", flexShrink: 0 }} />
              ))}
            </>
          )}
          {/* Math toolbar */}
          {activeTool === "math" && (
            <>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t.tr("Formül")}</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              {["\\frac{a}{b}","\\sqrt{x}","\\sum_{i=1}^{n}","\\int_{a}^{b}","x^2","\\alpha\\beta","\\pi","\\infty"].map(f => (
                <button key={f} onClick={() => {}} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>{f}</button>
              ))}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />
              <button onClick={() => wbRef.current?.openCalculator()} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,180,216,0.3)", background: "rgba(0,180,216,0.08)", color: "#67e8f9", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{t.tr("🧮 Hesap Makinesi")}</button>
            </>
          )}
        </div>
      )}

      {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* ── LEFT TOOLBAR ─────────────────────────────────────────────────── */}
        <aside
          data-color-panel
          className="wb-sidebar"
          style={{
            width: 58, flexShrink: 0, zIndex: 20,
            minHeight: 0, height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "10px 7px",
            background: "rgba(8,9,20,0.97)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            overflowY: "auto", overflowX: "hidden",
          }}
        >
          {TOOL_GROUPS.map((group, gi) => (
            <div key={gi} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
              {gi > 0 && (
                <div style={{ width: 26, height: 1, background: "rgba(255,255,255,0.07)", margin: "3px 0" }} />
              )}
              {group.map((item) => {
                const active = activeTool === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => pickTool(item.id)}
                    onMouseEnter={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSbTip({ text: item.label, top: r.top + r.height / 2, left: r.right + 4 }); }}
                    onMouseLeave={() => setSbTip(null)}
                    style={{
                      width: 38, height: 34, borderRadius: 9, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: active
                        ? "linear-gradient(135deg, rgba(91,110,255,0.25), rgba(0,180,216,0.18))"
                        : "transparent",
                      color: active ? "#a5b4fc" : "rgba(255,255,255,0.38)",
                      boxShadow: active
                        ? "inset 0 0 0 1px rgba(91,110,255,0.45), 0 0 12px rgba(91,110,255,0.15)"
                        : "none",
                      transition: "all 0.18s",
                    }}
                  >
                    <span style={{ width: 17, height: 17, display: "flex" }}>{item.icon}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Calculator + Image + Selection buttons at bottom */}
          <div style={{ marginTop: "auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }))}
              onMouseEnter={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSbTip({ text: "Hepsini Seç (Ctrl+A)", top: r.top + r.height / 2, left: r.right + 4 }); }}
              onMouseLeave={() => setSbTip(null)}
              style={{ width: 38, height: 32, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            >
              <span style={{ width: 17, height: 17, display: "flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/></svg>
              </span>
            </button>
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }))}
              onMouseEnter={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSbTip({ text: "Seçili Sil (Del)", top: r.top + r.height / 2, left: r.right + 4 }); }}
              onMouseLeave={() => setSbTip(null)}
              style={{ width: 38, height: 32, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            >
              <span style={{ width: 17, height: 17, display: "flex" }}><Ic.Trash /></span>
            </button>
            <div style={{ width: 26, height: 1, background: "rgba(255,255,255,0.07)", margin: "3px 0" }} />
            <button onClick={() => wbRef.current?.openCalculator()} onMouseEnter={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSbTip({ text: "Hesap Makinesi", top: r.top + r.height / 2, left: r.right + 4 }); }} onMouseLeave={() => setSbTip(null)} style={{ width: 38, height: 32, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>🧮</button>
            <button onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) wbRef.current?.addImageFromFile(f); }; input.click(); }} onMouseEnter={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setSbTip({ text: "Görsel Ekle", top: r.top + r.height / 2, left: r.right + 4 }); }} onMouseLeave={() => setSbTip(null)} style={{ width: 38, height: 32, borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>🖼</button>
          </div>
        </aside>

        {/* ── SIDEBAR TOOLTIP (fixed, escapes overflow:hidden) ─────────────── */}
        {sbTip && (
          <div style={{
            position: "fixed",
            left: sbTip.left,
            top: sbTip.top,
            transform: "translateY(-50%)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: 4,
            pointerEvents: "none",
          }}>
            {/* ok işareti */}
            <div style={{
              width: 0, height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderRight: "5px solid #1e293b",
              flexShrink: 0,
            }} />
            <div style={{
              background: "#1e293b",
              color: "#f1f5f9",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
              letterSpacing: "0.01em",
            }}>
              {t.tr(sbTip.text)}
            </div>
          </div>
        )}

        {/* ── CANVAS AREA ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0d1117" }}>
          {/* Cross-hatch grid — small cells */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }} />
          {/* Large grid accent lines */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "200px 200px",
          }} />

          <WhiteboardLocal
            ref={wbRef}
            background="transparent"
            showControls={false}
            tool={activeTool}
            color={color}
            width={strokeWidth}
            onTextEditChange={(editing, props) => {
              setTextEditing(editing);
              setTextEditProps(editing && props ? props : null);
            }}
            onToolChange={(tool) => setActiveTool(tool)}
          />

          {/* Current tool badge — bottom right */}
          {(() => {
            const toolLabel = TOOL_GROUPS.flat().find(item => item.id === activeTool)?.label?.split(" ")[0] ?? activeTool;
            const isDrawing = DRAWING_TOOLS.has(activeTool) && activeTool !== "eraser" && activeTool !== "laser";
            return (
              <div style={{
                position: "absolute", bottom: 14, right: 14, zIndex: 10,
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(6,8,18,0.85)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 8, padding: "5px 10px",
                backdropFilter: "blur(16px)",
              }}>
                {isDrawing && <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}88` }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                  {toolLabel}
                </span>
                {isDrawing && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
                    {strokeWidth}px
                  </span>
                )}
              </div>
            );
          })()}

          {/* ── Instructor Camera PiP ──────────────────────────────────────── */}
          {showCamera && (
            <div
              style={{
                position: "absolute", left: camPos.x, top: camPos.y, zIndex: 20,
                width: 180, height: 120, borderRadius: 12,
                background: "rgba(8,9,20,0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden", cursor: "move",
                display: "flex", flexDirection: "column",
              }}
              onMouseDown={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                camDragRef.current = { startX: e.clientX, startY: e.clientY, origX: camPos.x, origY: camPos.y };
                const onMove = (ev: MouseEvent) => {
                  if (!camDragRef.current) return;
                  const dx = ev.clientX - camDragRef.current.startX;
                  const dy = ev.clientY - camDragRef.current.startY;
                  setCamPos({ x: Math.max(0, camDragRef.current.origX + dx), y: Math.max(0, camDragRef.current.origY + dy) });
                };
                const onUp = () => { camDragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
            >
              {/* Camera feed area */}
              <div style={{ flex: 1, background: cameraOn ? "linear-gradient(135deg,#0f172a,#1e293b)" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {cameraOn ? (
                  <>
                    {/* Simulated camera feed */}
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#5B6EFF,#00B4D8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>{t.tr("Ö")}</div>
                    <div style={{ position: "absolute", bottom: 6, left: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{t.tr("Canlı")}</span>
                    </div>
                    {micOn && (
                      <div style={{ position: "absolute", bottom: 6, right: 8, width: 18, height: 18, borderRadius: "50%", background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ width: 10, height: 10, display: "flex", color: "#4ade80" }}><Ic.Mic /></span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ width: 24, height: 24, display: "flex", color: "rgba(255,255,255,0.2)", margin: "0 auto 4px" }}><Ic.VideoOff /></span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{t.tr("Kamera Kapalı")}</span>
                  </div>
                )}
              </div>
              {/* Bottom controls */}
              <div style={{ height: 26, flexShrink: 0, background: "rgba(6,8,18,0.9)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{t.tr("Eğitmen")}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => setMicOn(v => !v)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", cursor: "pointer", background: micOn ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: micOn ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 10, height: 10, display: "flex" }}>{micOn ? <Ic.Mic /> : <Ic.MicOff />}</span>
                  </button>
                  <button onClick={() => setCameraOn(v => !v)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", cursor: "pointer", background: cameraOn ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: cameraOn ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 10, height: 10, display: "flex" }}>{cameraOn ? <Ic.Video /> : <Ic.VideoOff />}</span>
                  </button>
                  <button onClick={() => setShowCamera(false)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 9, height: 9, display: "flex" }}><Ic.Close /></span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI FAB — bottom right */}
          <button
            onClick={() => toggleRight("ai")}
            title="AI Asistan"
            style={{
              position: "absolute", bottom: 14, right: 14, zIndex: 10,
              width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #5B6EFF, #9B59FF, #00B4D8)",
              boxShadow: rightPanel === "ai"
                ? "0 0 0 3px rgba(91,110,255,0.4), 0 8px 24px rgba(91,110,255,0.5)"
                : "0 4px 20px rgba(91,110,255,0.4), 0 2px 8px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", transition: "all 0.2s",
            }}
          >
            <span style={{ width: 20, height: 20, display: "flex" }}><Ic.Sparkle /></span>
          </button>
        </div>

        {/* ── RIGHT PANEL — AI tools (ai / brainstorm / magic / layers) ─────── */}
        {(rightPanel === "ai" || rightPanel === "brainstorm" || rightPanel === "magic" || rightPanel === "layers") && (
          <aside style={{
            width: 340, flexShrink: 0,
            display: "flex", flexDirection: "column",
            background: "rgba(8,9,20,0.98)",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            minHeight: 0, overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                {rightPanel === "ai"         && <><GlowDot color="#5B6EFF"/><span style={{ color: "#818cf8", width: 16, height: 16, display: "flex" }}><Ic.AI /></span>AI Asistan</>}
                {rightPanel === "brainstorm" && <><GlowDot color="#9B59FF"/><span style={{ color: "#c084fc", width: 16, height: 16, display: "flex" }}><Ic.Bulb /></span>{t.tr("Beyin Fırtınası")}</>}
                {rightPanel === "magic"      && <><GlowDot color="#00B4D8"/><span style={{ color: "#67e8f9", width: 16, height: 16, display: "flex" }}><Ic.Magic /></span>{t.tr("Sihirli Dönüştür")}</>}
                {rightPanel === "layers"     && <><GlowDot color="#FFB347"/><span style={{ color: "#fbbf24", width: 16, height: 16, display: "flex" }}><Ic.Layers /></span>{t.tr("Katmanlar")}</>}
              </span>
              <button onClick={() => setRightPanel(null)} style={{
                width: 28, height: 28, borderRadius: 7, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ width: 13, height: 13, display: "flex" }}><Ic.Close /></span>
              </button>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

              {/* AI ASSIST */}
              {rightPanel === "ai" && (
                <>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
                    {t.tr("Tahta içeriğiniz için AI'dan öneri veya çizim planı alın.")}
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAiAssist(); }}
                    placeholder={t.tr("Örn: Fotosentez için zihin haritası oluştur…")}
                    rows={4}
                    style={taStyle}
                  />
                  <PrimaryBtn onClick={runAiAssist} disabled={aiLoading || !aiPrompt.trim()}
                    loading={aiLoading} color="#5B6EFF" loadingText={t.tr("Düşünüyor…")} label={t.tr("Gönder")}
                    icon={<Ic.Send />}
                  />
                  {aiResult && <ResultBox text={aiResult} color="#818cf8" />}
                </>
              )}

              {/* BRAINSTORM */}
              {rightPanel === "brainstorm" && (
                <>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
                    {t.tr("Konu gir, AI sticky notlar oluştursun ve tahtaya yapıştırsın.")}
                  </p>
                  <input value={bsTopic} onChange={(e) => setBsTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runBrainstorm(); }}
                    placeholder={t.tr("Konu: Hücre bölünmesi…")} style={inStyle} />
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", alignSelf: "center" }}>{t.tr("Not sayısı:")}</span>
                    {[4, 6, 8, 12].map((n) => (
                      <button key={n} onClick={() => setBsCount(n)} style={{
                        flex: 1, height: 30, borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                        background: bsCount === n ? "rgba(155,89,255,0.25)" : "rgba(255,255,255,0.04)",
                        color: bsCount === n ? "#c084fc" : "rgba(255,255,255,0.4)",
                        boxShadow: bsCount === n ? "inset 0 0 0 1px rgba(155,89,255,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.06)",
                      }}>{n}</button>
                    ))}
                  </div>
                  <PrimaryBtn onClick={runBrainstorm} disabled={bsLoading || !bsTopic.trim()}
                    loading={bsLoading} color="#9B59FF" loadingText={t.tr("Oluşturuluyor…")} label={t.tr("Beyin Fırtınası Başlat")}
                    icon={<Ic.Sparkle />}
                  />
                  {bsNotes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {bsNotes.length} {t.tr("not oluşturuldu")}
                      </span>
                      {bsNotes.map((n, i) => (
                        <div key={i} style={{
                          background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.18)",
                          borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
                        }}>{n}</div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* MAGIC SWITCH */}
              {rightPanel === "magic" && (
                <>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
                    {t.tr("Tahta içeriğini yapılandırılmış bir ders dokümanına dönüştür.")}
                  </p>
                  <div style={{
                    background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.15)",
                    borderRadius: 10, padding: 12, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
                  }}>
                    {t.tr("✨ Tahta üzerindeki tüm metin, şekil ve notları okur, mantıklı bir ders planına dönüştürür.")}
                  </div>
                  <PrimaryBtn onClick={runMagicSwitch} disabled={magicLoading}
                    loading={magicLoading} color="#00B4D8" loadingText={t.tr("Dönüştürülüyor…")} label={t.tr("Dönüştür")}
                    icon={<Ic.Magic />}
                  />
                  {magicDoc && <ResultBox text={magicDoc} color="#67e8f9" />}
                </>
              )}

              {/* LAYERS */}
              {rightPanel === "layers" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {layers.map((l) => (
                      <div key={l} onClick={() => setActiveLayer(l)} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                        borderRadius: 9, cursor: "pointer",
                        background: activeLayer === l ? "rgba(255,179,71,0.1)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${activeLayer === l ? "rgba(255,179,71,0.35)" : "rgba(255,255,255,0.06)"}`,
                        transition: "all 0.15s",
                      }}>
                        <span style={{ width: 14, height: 14, display: "flex", color: activeLayer === l ? "#fbbf24" : "rgba(255,255,255,0.3)" }}><Ic.Layers /></span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: activeLayer === l ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)" }}>{l}</span>
                        {activeLayer === l && <span style={{ marginLeft: "auto", fontSize: 9, color: "#fbbf24", fontWeight: 900, letterSpacing: "0.06em" }}>{t.tr("AKTİF")}</span>}
                      </div>
                    ))}
                  </div>
                  <PrimaryBtn onClick={addLayer} disabled={false} color="#FFB347" label={t.tr("+ Yeni Katman")} />
                </>
              )}
            </div>
          </aside>
        )}

        {/* ── CHAT PANEL ────────────────────────────────────────────────────── */}
        {rightPanel === "chat" && (
          <aside style={{
            width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
            background: "rgba(8,9,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)",
            minHeight: 0, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                <GlowDot color="#22d3ee" />
                <span style={{ color: "#67e8f9", width: 15, height: 15, display: "flex" }}><Ic.Chat /></span>
                {t.tr("Sınıf Sohbeti")}
              </span>
              <button onClick={() => setRightPanel(null)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Close /></span>
              </button>
            </div>
            {/* Message list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {chatMessages.map((m) => (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.self ? "flex-end" : "flex-start" }}>
                  {!m.self && <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 3, paddingLeft: 2 }}>{m.sender}</span>}
                  <div style={{
                    maxWidth: "82%", padding: "8px 11px", borderRadius: m.self ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                    background: m.self ? "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(91,110,255,0.18))" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${m.self ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.07)"}`,
                    fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.5,
                  }}>{t.tr(m.text)}</div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3, paddingLeft: 2 }}>
                    {m.time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {/* Input */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                placeholder={t.tr("Mesaj yaz…")}
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, color: "rgba(255,255,255,0.85)", fontSize: 12, padding: "8px 11px", outline: "none" }}
              />
              <button onClick={sendChat} style={{ width: 34, height: 34, borderRadius: 9, border: "none", cursor: "pointer", background: "rgba(34,211,238,0.15)", color: "#67e8f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Send /></span>
              </button>
            </div>
          </aside>
        )}

        {/* ── PARTICIPANTS PANEL ────────────────────────────────────────────── */}
        {rightPanel === "participants" && (
          <aside style={{
            width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            background: "rgba(8,9,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)",
            minHeight: 0, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                <GlowDot color="#34d399" />
                <span style={{ color: "#6ee7b7", width: 15, height: 15, display: "flex" }}><Ic.Users /></span>
                {t.tr("Katılımcılar")}
                <span style={{ fontSize: 10, background: "rgba(52,211,153,0.15)", color: "#6ee7b7", borderRadius: 99, padding: "1px 7px", fontWeight: 700 }}>
                  {participants.filter(p => p.online).length}/{participants.length}
                </span>
              </span>
              <button onClick={() => setRightPanel(null)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Close /></span>
              </button>
            </div>
            {/* Hand raise queue */}
            {participants.filter(p => p.handRaised).length > 0 && (
              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#fbbf24", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.tr("✋ El Kaldıranlar")}</span>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                  {participants.filter(p => p.handRaised).map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>✋</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", flex: 1 }}>{t.tr(p.name)}</span>
                      <button style={{ fontSize: 9, padding: "2px 8px", borderRadius: 5, border: "none", cursor: "pointer", background: "rgba(52,211,153,0.15)", color: "#6ee7b7", fontWeight: 700 }}>{t.tr("Söz Ver")}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Full list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {participants.map((p) => {
                const perm = studentPerms[p.id] ?? { mic: !p.muted, cam: true, screen: false, file: false };
                return (
                  <div key={p.id} style={{ flexShrink: 0, borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", opacity: p.online ? 1 : 0.45 }}>
                    {/* Name row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `hsl(${p.id.charCodeAt(1)*40},60%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {p.name[0]}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{t.tr(p.name)}</span>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {p.handRaised && <span style={{ fontSize: 10 }}>✋</span>}
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.online ? "#34d399" : "rgba(255,255,255,0.15)" }} />
                      </div>
                    </div>
                    {/* Permission controls — online only */}
                    {p.online && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 3, padding: "0 8px 8px" }}>
                        {[
                          { key: "mic" as const, label: perm.mic ? "Ses Açık" : "Sessiz", on: perm.mic, iconOn: <Ic.Mic />, iconOff: <Ic.MicOff />, colorOn: "#4ade80", colorOff: "#f87171" },
                          { key: "cam" as const, label: perm.cam ? "Kamera" : "Kamera Off", on: perm.cam, iconOn: <Ic.Video />, iconOff: <Ic.VideoOff />, colorOn: "#4ade80", colorOff: "#f87171" },
                          { key: "screen" as const, label: perm.screen ? "Ekran İzni" : "Ekran Yok", on: perm.screen, iconOn: <Ic.Screen />, iconOff: <Ic.Screen />, colorOn: "#a5b4fc", colorOff: "rgba(255,255,255,0.25)" },
                          { key: "file" as const, label: perm.file ? "Dosya İzni" : "Dosya Yok", on: perm.file, iconOn: <Ic.FileText />, iconOff: <Ic.FileText />, colorOn: "#fdba74", colorOff: "rgba(255,255,255,0.25)" },
                        ].map(ctrl => (
                          <button
                            key={ctrl.key}
                            onClick={() => setStudentPerms(prev => ({ ...prev, [p.id]: { ...perm, [ctrl.key]: !perm[ctrl.key] } }))}
                            data-tip={t.tr(ctrl.label)}
                            style={{
                              padding: "4px 2px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 8, fontWeight: 800,
                              background: ctrl.on ? `${ctrl.colorOn}18` : "rgba(255,255,255,0.04)",
                              color: ctrl.on ? ctrl.colorOn : ctrl.colorOff,
                              boxShadow: ctrl.on ? `inset 0 0 0 1px ${ctrl.colorOn}35` : "inset 0 0 0 1px rgba(255,255,255,0.07)",
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.15s", position: "relative",
                            }}
                          >
                            <span style={{ width: 12, height: 12, display: "flex" }}>{ctrl.on ? ctrl.iconOn : ctrl.iconOff}</span>
                            <span style={{ fontSize: 7, lineHeight: 1.2 }}>{t.tr(ctrl.label)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* ── FILES PANEL ───────────────────────────────────────────────────── */}
        {rightPanel === "files" && (
          <aside style={{
            width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            background: "rgba(8,9,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)",
            minHeight: 0, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                <GlowDot color="#fb923c" />
                <span style={{ color: "#fdba74", width: 15, height: 15, display: "flex" }}><Ic.FileText /></span>
                {t.tr("Dosya Paylaşımı")}
              </span>
              <button onClick={() => setRightPanel(null)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Close /></span>
              </button>
            </div>
            {/* Upload button */}
            <div style={{ padding: "10px 14px", flexShrink: 0 }}>
              <button
                onClick={() => {
                  const inp = document.createElement("input");
                  inp.type = "file";
                  inp.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (!f) return;
                    const ext = f.name.split(".").pop() ?? "file";
                    const sizeMB = (f.size / 1024 / 1024).toFixed(1);
                    setSharedFiles((prev) => [
                      { id: `f${Date.now()}`, name: f.name, size: `${sizeMB} MB`, type: ext, uploadedAt: new Date() },
                      ...prev,
                    ]);
                  };
                  inp.click();
                }}
                style={{ width: "100%", padding: "9px 14px", borderRadius: 9, border: "1px dashed rgba(251,146,60,0.35)", background: "rgba(251,146,60,0.06)", color: "#fdba74", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Upload /></span>
                {t.tr("Dosya Yükle")}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {sharedFiles.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: "#fdba74", textTransform: "uppercase" }}>{f.type}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.tr(f.name)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{f.size} · {f.uploadedAt.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                  <button style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Download /></span>
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ── RECORDS PANEL ─────────────────────────────────────────────────── */}
        {rightPanel === "records" && (
          <aside style={{
            width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
            background: "rgba(8,9,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)",
            minHeight: 0, overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                <GlowDot color={recordingActive ? "#f43f5e" : "#6b7280"} />
                <span style={{ color: recordingActive ? "#fb7185" : "#9ca3af", width: 15, height: 15, display: "flex" }}><Ic.Record /></span>
                {t.tr("Kayıtlar")}
              </span>
              <button onClick={() => setRightPanel(null)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Close /></span>
              </button>
            </div>
            {/* Record control */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
              {recordingActive && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "7px 12px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e", animation: "pulse 1s infinite" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fb7185" }}>{t.tr("Kaydediliyor")}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#fb7185" }}>
                    {Math.floor(recordingSeconds/60).toString().padStart(2,"0")}:{(recordingSeconds%60).toString().padStart(2,"0")}
                  </span>
                </div>
              )}
              <button
                onClick={toggleRecording}
                style={{
                  width: "100%", padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: recordingActive ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.08)",
                  color: "#fb7185",
                  boxShadow: recordingActive ? "inset 0 0 0 1px rgba(244,63,94,0.4)" : "inset 0 0 0 1px rgba(244,63,94,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Record /></span>
                {recordingActive ? t.tr("Kaydı Durdur") : t.tr("Kayıt Başlat")}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.tr("Önceki Kayıtlar")}</span>
              {recordings.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fb7185" }}>
                    <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Record /></span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{t.tr(r.name)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{r.duration} · {r.date.toLocaleDateString("tr-TR")}</div>
                  </div>
                  <button style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Download /></span>
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ── QUIZ PANEL ────────────────────────────────────────────────────── */}
        {rightPanel === "quiz" && (() => {
          const q = quizQuestions[activeQuizIdx];
          const totalVotes = (q.votes ?? []).reduce((a, b) => a + b, 0);
          return (
            <aside style={{
              width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
              background: "rgba(8,9,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)",
              minHeight: 0, overflow: "hidden",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8 }}>
                  <GlowDot color="#a78bfa" />
                  <span style={{ color: "#c4b5fd", width: 15, height: 15, display: "flex" }}><Ic.Quiz /></span>
                  {t.tr("Quiz / Anket")}
                </span>
                <button onClick={() => setRightPanel(null)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 12, height: 12, display: "flex" }}><Ic.Close /></span>
                </button>
              </div>
              {/* Question selector */}
              <div style={{ display: "flex", gap: 4, padding: "10px 14px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {quizQuestions.map((_, i) => (
                  <button key={i} onClick={() => setActiveQuizIdx(i)} style={{
                    flex: 1, height: 26, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                    background: activeQuizIdx === i ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.04)",
                    color: activeQuizIdx === i ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                    boxShadow: activeQuizIdx === i ? "inset 0 0 0 1px rgba(167,139,250,0.4)" : "none",
                  }}>S{i+1}</button>
                ))}
                <button
                  onClick={() => {
                    setQuizQuestions((prev) => [...prev, { id: `q${Date.now()}`, text: "Yeni soru…", options: ["A","B","C","D"], correct: 0, votes: [0,0,0,0] }]);
                    setActiveQuizIdx(quizQuestions.length);
                  }}
                  style={{ width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                >+</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Question text */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>{t.tr(q.text)}</div>
                {/* Options with vote bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {q.options.map((opt, oi) => {
                    const votes = q.votes?.[oi] ?? 0;
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isCorrect = oi === q.correct;
                    return (
                      <div key={oi} style={{ borderRadius: 9, overflow: "hidden", border: `1px solid ${isCorrect ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.07)"}`, position: "relative" }}>
                        <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: isCorrect ? "rgba(52,211,153,0.1)" : "rgba(167,139,250,0.08)", transition: "width 0.4s" }} />
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                          <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${isCorrect ? "#34d399" : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: isCorrect ? "#34d399" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                            {String.fromCharCode(65+oi)}
                          </span>
                          <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{opt}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: isCorrect ? "#34d399" : "rgba(255,255,255,0.3)", minWidth: 32, textAlign: "right" }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{t.tr("Toplam oy:")} {totalVotes}</div>
                {/* Publish button */}
                <button
                  onClick={() => setPublishedQuiz(publishedQuiz === q.id ? null : q.id)}
                  style={{
                    padding: "9px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: publishedQuiz === q.id ? "rgba(52,211,153,0.15)" : "rgba(167,139,250,0.12)",
                    color: publishedQuiz === q.id ? "#34d399" : "#c4b5fd",
                    boxShadow: `inset 0 0 0 1px ${publishedQuiz === q.id ? "rgba(52,211,153,0.35)" : "rgba(167,139,250,0.3)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span style={{ width: 14, height: 14, display: "flex" }}><Ic.Quiz /></span>
                  {publishedQuiz === q.id ? t.tr("✓ Yayınlandı — Geri Al") : t.tr("Öğrencilere Yayınla")}
                </button>
              </div>
            </aside>
          );
        })()}
      </div>

      {/* ══ BOTTOM CONTROL BAR ═══════════════════════════════════════════════ */}
      <div data-wb-header style={{
        height: 50, flexShrink: 0, zIndex: 30,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px",
        background: "rgba(6,8,18,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Left: A/V */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setMicOn(v => !v)} data-tip={micOn ? "Mikrofonu Kapat" : "Mikrofonu Aç"} style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", background: micOn ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: micOn ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: micOn ? "inset 0 0 0 1px rgba(34,197,94,0.3)" : "inset 0 0 0 1px rgba(239,68,68,0.3)", transition: "all 0.15s", position: "relative" }}>
            <span style={{ width: 16, height: 16, display: "flex" }}>{micOn ? <Ic.Mic /> : <Ic.MicOff />}</span>
          </button>
          <button onClick={() => setCameraOn(v => !v)} data-tip={cameraOn ? "Kamerayı Kapat" : "Kamerayı Aç"} style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", background: cameraOn ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: cameraOn ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: cameraOn ? "inset 0 0 0 1px rgba(34,197,94,0.3)" : "inset 0 0 0 1px rgba(239,68,68,0.3)", transition: "all 0.15s", position: "relative" }}>
            <span style={{ width: 16, height: 16, display: "flex" }}>{cameraOn ? <Ic.Video /> : <Ic.VideoOff />}</span>
          </button>
          <button onClick={() => setScreenSharing(v => !v)} data-tip={screenSharing ? "Ekran Paylaşımını Durdur" : "Ekranı Paylaş"} style={{ width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer", background: screenSharing ? "rgba(91,110,255,0.2)" : "rgba(255,255,255,0.05)", color: screenSharing ? "#a5b4fc" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: screenSharing ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.08)", transition: "all 0.15s", position: "relative" }}>
            <span style={{ width: 16, height: 16, display: "flex" }}><Ic.Screen /></span>
          </button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.07)", margin: "0 2px" }} />
          <button onClick={toggleRecording} data-tip={recordingActive ? "Kaydı Durdur" : "Kayıt Başlat"} style={{ height: 36, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer", background: recordingActive ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)", color: recordingActive ? "#f87171" : "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6, boxShadow: recordingActive ? "inset 0 0 0 1px rgba(239,68,68,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.08)", fontSize: 11, fontWeight: 800, transition: "all 0.15s", position: "relative" }}>
            {recordingActive
              ? <><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f87171", flexShrink: 0 }} />{Math.floor(recordingSeconds/60).toString().padStart(2,"0")}:{(recordingSeconds%60).toString().padStart(2,"0")}</>
              : <><span style={{ width: 14, height: 14, display: "flex" }}><Ic.Record /></span>{t.tr("Kayıt")}</>}
          </button>
        </div>

        {/* Center: classroom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setBoardLocked(v => !v)} data-tip={boardLocked ? "Tahtayı Aç" : "Tahtayı Kilitle"} style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer", background: boardLocked ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.1)", color: boardLocked ? "#fbbf24" : "#4ade80", display: "flex", alignItems: "center", gap: 6, boxShadow: boardLocked ? "inset 0 0 0 1px rgba(245,158,11,0.3)" : "inset 0 0 0 1px rgba(34,197,94,0.3)", fontSize: 10, fontWeight: 800, transition: "all 0.15s", position: "relative" }}>
            <span style={{ width: 13, height: 13, display: "flex" }}>{boardLocked ? <Ic.Lock /> : <Ic.Unlock />}</span>
            {boardLocked ? t.tr("Tahta Kilitli") : t.tr("Tahta Açık")}
          </button>
          <button onClick={() => setCursorsVisible(v => !v)} data-tip="Canlı İmleçleri Göster/Gizle" style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer", background: cursorsVisible ? "rgba(91,110,255,0.15)" : "rgba(255,255,255,0.04)", color: cursorsVisible ? "#a5b4fc" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6, boxShadow: cursorsVisible ? "inset 0 0 0 1px rgba(91,110,255,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.07)", fontSize: 10, fontWeight: 800, transition: "all 0.15s", position: "relative" }}>
            <span style={{ width: 13, height: 13, display: "flex" }}><Ic.Users /></span>
            {t.tr("İmleçler")}
          </button>
          <button
            onClick={() => {
              setFocusBroadcast(true);
              if (sessionId) {
                fetch(`${API}/whiteboard/${sessionId}/focus`, { method: "POST", headers: authHeader() }).catch(() => {});
              }
              setTimeout(() => setFocusBroadcast(false), 1800);
            }}
            style={{ height: 34, padding: "0 12px", borderRadius: 9, border: "none", cursor: "pointer", background: focusBroadcast ? "rgba(0,180,216,0.3)" : "rgba(0,180,216,0.1)", color: focusBroadcast ? "#22d3ee" : "#67e8f9", display: "flex", alignItems: "center", gap: 6, boxShadow: focusBroadcast ? "inset 0 0 0 1px rgba(0,180,216,0.6), 0 0 12px rgba(0,180,216,0.3)" : "inset 0 0 0 1px rgba(0,180,216,0.25)", fontSize: 10, fontWeight: 800, position: "relative", transition: "all 0.2s" }}
          >
            <span style={{ width: 13, height: 13, display: "flex" }}><Ic.Focus /></span>
            {focusBroadcast ? t.tr("Gönderildi ✓") : t.tr("Odakla")}
          </button>
        </div>

        {/* Right: end */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.15)", color: "#f87171", display: "flex", alignItems: "center", gap: 6, boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.3)", fontSize: 11, fontWeight: 800 }}>
            <span style={{ width: 14, height: 14, display: "flex" }}><Ic.EndCall /></span>
            {t.tr("Dersi Bitir")}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function HBtn({ onClick, title, children, style }: {
  onClick: () => void; title?: string; children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} data-tip={title} style={{
      width: 30, height: 30, borderRadius: 7, border: "1px solid transparent", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "transparent", color: "rgba(255,255,255,0.4)",
      transition: "all 0.15s", ...style,
    }}>
      {children}
    </button>
  );
}

function GlowDot({ color }: { color: string }) {
  return (
    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
  );
}

function ResultBox({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}20`,
      borderRadius: 10, padding: 12, fontSize: 12,
      color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
      whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto",
    }}>
      {text}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, loading, color, loadingText, label, icon }: {
  onClick: () => void; disabled: boolean; loading?: boolean;
  color: string; loadingText?: string; label: string; icon?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "10px 16px", borderRadius: 9, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${color}cc, ${color}99)`,
      color: disabled ? "rgba(255,255,255,0.25)" : "#fff",
      fontSize: 12, fontWeight: 800,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      boxShadow: disabled ? "none" : `0 4px 16px ${color}33`,
      transition: "all 0.15s",
    }}>
      {loading ? (
        <><Spinner />{loadingText}</>
      ) : (
        <>{icon && <span style={{ width: 13, height: 13, display: "flex" }}>{icon}</span>}{label}</>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, animation: "spin 0.9s linear infinite" }}
      fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

const taStyle: React.CSSProperties = {
  width: "100%", resize: "vertical", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "10px 12px", lineHeight: 1.6,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const inStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "10px 12px",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};
