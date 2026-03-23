"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { WhiteboardLocal, WhiteboardLocalHandle, WhiteboardTool } from "./whiteboard-local";
import "pdfjs-dist/web/pdf_viewer.css";
import { useRole } from "../_components/role-context";
import { useI18n } from "../_i18n/use-i18n";
import { strings } from "../_i18n/strings";

type ToolbarItem = { label: string; icon: string; tool?: WhiteboardTool; onClick?: () => void };

type ResourceSection = {
  title: string;
  items: {
    label: string;
    type: "pdf" | "epub" | "video" | "link";
    actions?: ("view" | "download" | "save" | "delete" | "rename" | "toggle")[];
    visible?: boolean; // öğrenciye görünür
    url?: string;
  }[];
};
type Announcement = { title: string; date: string; body: string };
type QuickAction = { label: string; icon: string; hint?: string; onClick: () => void };

// Lazy pdfjs loader (avoids bundler/SSR issues)
let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist");
  }
  const pdfjsLib = await pdfjsLibPromise;
  // Use CDN worker to skip bundling worker into Next
  const version = (pdfjsLib as any).version || "4.6.82";
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
  return pdfjsLib;
}

export default function WhiteboardPage() {
  const [room, setRoom] = useState("demo-room");
  const [mode, setMode] = useState<"local" | "live">("local");
  const { role } = useRole();
  const [viewRole, setViewRole] = useState<"instructor" | "student">("instructor");
  const t = useI18n();
  const defaultWb = {
    quickActions: {
      pdf: "PDF",
      presentation: "Deck",
      shareScreen: "Share Screen",
      cameraOn: "Camera",
      cameraOff: "Stop Camera",
      quiz: "Quiz",
      downloadPng: "PNG",
    },
    labels: {
      actionsTitle: "Actions",
      viewRole: { instructor: "Instructor", student: "Student" },
      background: "Background",
      thickness: "Thickness",
      color: "Color",
      pages: "Page",
      newPage: "New Page",
      undo: "Undo",
      redo: "Redo",
      clear: "Clear",
      close: "Close",
      privateMsg: "Private Message",
      privateTo: "Student",
      noMsg: "No messages.",
      send: "Send",
    },
  };
  const wb = useMemo(() => {
    const candidate = (t as any)?.whiteboard ?? {};
    return {
      quickActions: { ...defaultWb.quickActions, ...(candidate.quickActions ?? {}) },
      labels: { ...defaultWb.labels, ...(candidate.labels ?? {}) },
    };
  }, [t]);
  const [viewMode, setViewMode] = useState<"board" | "hybrid" | "teacher">("board");
  const [highContrast, setHighContrast] = useState(false);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("pen");
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
  const liveUrl = useMemo(() => `${apiBase.replace(/\/$/, "")}/live/${room}`, [apiBase, room]);
  const boardRef = useRef<WhiteboardLocalHandle | null>(null);
  const [background, setBackground] = useState<"plain" | "grid" | "dots" | "iso" | "music">("plain");
  const [recording, setRecording] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcExpr, setCalcExpr] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [penColor, setPenColor] = useState("#0f172a");
  const [penWidth, setPenWidth] = useState(3);
  const [eraserMode, setEraserMode] = useState<"pixel" | "object">("pixel");
  const [boardReady, setBoardReady] = useState(false);
  const [aiSolve, setAiSolve] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [matrixRows, setMatrixRows] = useState(3);
  const [matrixCols, setMatrixCols] = useState(3);
  const [matrixData, setMatrixData] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("A) Seçenek 1\nB) Seçenek 2\nC) Seçenek 3");
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingNote, setBookingNote] = useState("");
  const [classMessages, setClassMessages] = useState<string[]>([]);
  const roster = useMemo(() => ["Ayşe Yılmaz", "Mehmet Kaya", "Liam Schneider", "Sena Öztürk"], []);
  const [privateTarget, setPrivateTarget] = useState<string>(roster[0]);
  const [privateMessages, setPrivateMessages] = useState<{ to: string; text: string }[]>([]);
  const [classInput, setClassInput] = useState("");
  const [privateInput, setPrivateInput] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [lastCalc, setLastCalc] = useState<string | null>(null);
  const [presentationFiles, setPresentationFiles] = useState<File[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pdfPages, setPdfPages] = useState<{ name: string; url: string; page: number }[]>([]);
  const [pdfActive, setPdfActive] = useState<number | null>(null);
  const [showSlidePreview, setShowSlidePreview] = useState(true);
  const [activeTab, setActiveTab] = useState<"manage" | "chat" | "files" | "records" | "participants">("manage");
  const [calcError, setCalcError] = useState<string | null>(null);
  const [questionQueue, setQuestionQueue] = useState<{ name: string; text: string; ts: number }[]>([]);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState("A) Evet\nB) Hayır");
  const [quizPublish, setQuizPublish] = useState(false);

  // ── Advanced classroom features ────────────────────────
  const [handRaiseQueue, setHandRaiseQueue] = useState<{ name: string; ts: number }[]>([]);
  const [studentHandRaised, setStudentHandRaised] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [countdownTarget, setCountdownTarget] = useState(60);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownMs, setCountdownMs] = useState(60000);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [pollActive, setPollActive] = useState(false);
  const [pollOptionsArr, setPollOptionsArr] = useState<string[]>([]);
  const [emojiReactions, setEmojiReactions] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const emojiIdRef = useRef(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [participantsList, setParticipantsList] = useState([
    { name: "Ayşe Yılmaz", status: "online" as const, handRaised: false, mic: true, cam: false },
    { name: "Mehmet Kaya", status: "online" as const, handRaised: false, mic: false, cam: false },
    { name: "Liam Schneider", status: "idle" as const, handRaised: false, mic: false, cam: false },
    { name: "Sena Öztürk", status: "offline" as const, handRaised: false, mic: false, cam: false },
  ]);

  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const pipCamRef = useRef<HTMLVideoElement | null>(null);
  const pipScreenRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const presentationInputRef = useRef<HTMLInputElement | null>(null);
  const [sections, setSections] = useState<ResourceSection[]>([
    {
      title: "Kitap",
      items: [
        { label: "Kitap (PDF)", type: "pdf", actions: ["view", "download", "save"], visible: true },
        { label: "Kitap Özet (EPUB)", type: "epub", actions: ["view", "download"], visible: true },
        { label: "Kitap (EPUB)", type: "epub", actions: ["view", "download"], visible: true },
      ],
    },
    {
      title: "Canlı Ders Kayıtları",
      items: [
        { label: "Hafta 1 - Temel Çizim", type: "video", actions: ["view", "save"], visible: true },
        { label: "Hafta 2 - Dijital Render", type: "video", actions: ["view", "save"], visible: true },
      ],
    },
    {
      title: "Infografik ve Sınavlar",
      items: [
        { label: "Çıktı Soruları", type: "pdf", actions: ["download"], visible: true },
        { label: "Soru Havuzu", type: "link", actions: ["view"], visible: true },
      ],
    },
  ]);
  const [announcements] = useState<Announcement[]>([
    { title: "Dersimiz Hakkında", date: "20 Şubat", body: "2025-2026 Bahar döneminde canlı ders yapılmayacak. Geçmiş kayıtlar erişilebilir." },
    { title: "Proje Teslim", date: "28 Şubat", body: "PDF + kaynak dosya olarak yükleyin. Geç teslim kabul edilmez." },
  ]);
  const roleToolbarWhitelist = {
    instructor: new Set<string>(),
    student: new Set<string>([
      "Cursor",
      "Kalem",
      "Fosfor",
      "Silgi",
      "Ok",
      "Çizgi",
      "Dolgu",
      "Renk Al",
      "Pan",
      "Şekil",
      "Daire",
      "Not",
      "Metin",
      "AI Kalem",
      "Lazer",
      "Spot",
      "Grid",
      "Tablo",
      "Taşı",
      "Hesap",
      "PNG",
      "El Kaldır",
      "El İndir",
      "Tepki",
      "Yakınlaş",
      "Uzaklaş",
    ]),
  };
  const roleQuickActionsWhitelist = {
    instructor: new Set<string>(),
    student: new Set<string>(["PNG İndir"]),
  };
  const quickActions: QuickAction[] = [
    { label: wb.quickActions.pdf, icon: "📑", onClick: () => fileInputRef.current?.click() },
    { label: wb.quickActions.presentation, icon: "🗂️", onClick: () => presentationInputRef.current?.click() },
    { label: wb.quickActions.shareScreen, icon: "🖥️", onClick: () => toggleScreen() },
    { label: cameraStream ? wb.quickActions.cameraOff : wb.quickActions.cameraOn, icon: cameraStream ? "🛑" : "📷", onClick: () => toggleCamera() },
    { label: wb.quickActions.quiz, icon: "✅", onClick: () => setQuizPublish(true) },
  ];

  useEffect(() => {
    if (timerOn) {
      if (timerRef.current) clearInterval(timerRef.current as any);
      timerRef.current = setInterval(() => setTimerMs((v) => v + 1000), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current as any);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current as any);
    };
  }, [timerOn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current as any);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdownActive) {
      if (countdownRef.current) clearInterval(countdownRef.current as any);
      countdownRef.current = setInterval(() => {
        setCountdownMs((v) => {
          if (v <= 1000) {
            clearInterval(countdownRef.current as any);
            setCountdownActive(false);
            // Flash confetti when countdown ends
            setConfettiActive(true);
            setTimeout(() => setConfettiActive(false), 3000);
            return 0;
          }
          return v - 1000;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current as any);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current as any); };
  }, [countdownActive]);

  useEffect(() => {
    boardRef.current?.setColor(penColor);
  }, [penColor]);

  useEffect(() => {
    boardRef.current?.setWidth(penWidth);
  }, [penWidth]);

  useEffect(() => {
    if (cameraRef.current && cameraStream) cameraRef.current.srcObject = cameraStream;
    if (pipCamRef.current && cameraStream) pipCamRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    if (screenRef.current && screenStream) screenRef.current.srcObject = screenStream;
    if (pipScreenRef.current && screenStream) pipScreenRef.current.srcObject = screenStream;
  }, [screenStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [cameraStream, screenStream, pdfUrl]);

  // eşitle: seçili rol -> görünüm
  useEffect(() => {
    const map: Record<string, "instructor" | "student"> = {
      admin: "instructor",
      "head-instructor": "instructor",
      instructor: "instructor",
      student: "student",
      guardian: "student",
    };
    setViewRole(map[role] ?? "instructor");
  }, [role]);

  async function toggleCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setCameraError(null);
      return;
    }
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera error", err);
      setCameraError("Kamera açılamadı. Tarayıcı izinlerini kontrol edin.");
    }
  }

  async function toggleScreen() {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setScreenError(null);
      return;
    }
    try {
      setScreenError(null);
      // @ts-ignore
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setScreenStream(stream);
    } catch (err) {
      console.error("Screen share error", err);
      setScreenError("Ekran paylaşımı başlatılamadı. Tarayıcı izinlerini kontrol edin.");
    }
  }

  async function onPdfPicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    await renderPdfThumbs(file);
  }

  function onImagePicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    boardRef.current?.addImageFromFile(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function onPresentationPicked(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setPresentationFiles((prev) => [...prev, ...files]);
    if (currentSlide === 0) setCurrentSlide(0);
    if (presentationInputRef.current) presentationInputRef.current.value = "";
  }

  function presentCurrentSlide() {
    const file = presentationFiles[currentSlide];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      boardRef.current?.addImageFromFile(file);
      addClassMessage(`Sunum: ${file.name} ekranda`);
    } else if (file.type === "application/pdf") {
      if (pdfActive != null && pdfPages[pdfActive]) {
        boardRef.current?.addImageFromFile(new File([dataURLtoBlob(pdfPages[pdfActive].url)], pdfPages[pdfActive].name, { type: "image/png" }));
      } else {
        boardRef.current?.addNote(`PDF sunum: ${file.name} (aktif sayfa seçin)`);
      }
    } else {
      boardRef.current?.addNote(`Sunum dosyası: ${file.name}`);
    }
  }

  function projectPdfPage(idx: number) {
    const p = pdfPages[idx];
    if (!p) return;
    setPdfActive(idx);
    const blob = dataURLtoBlob(p.url);
    boardRef.current?.addImageFromFile(new File([blob], p.name, { type: "image/png" }));
    addClassMessage(`PDF sayfa ${p.page} ekranda`);
  }

  function handleCalcEval() {
    try {
      // Basit güvenli eval: sadece Math ve sayılar/işleçler
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; const m=Math; return (${calcExpr});`)();
      setCalcResult(String(val));
    } catch (e) {
      setCalcResult("Hata");
    }
  }

  function pushCalcToBoard() {
    if (!calcResult && !calcExpr) return;
    boardRef.current?.addText(`= ${calcResult ?? ""} (${calcExpr})`);
  }

  function addQuestion(name: string, text: string) {
    if (!text.trim()) return;
    setQuestionQueue((q) => [...q, { name: name || "Öğrenci", text: text.trim(), ts: Date.now() }].slice(-30));
  }

  async function renderPdfThumbs(file: File) {
    try {
      const pdfjsLib = await loadPdfjs();
      const uint8 = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
      const thumbs: { name: string; url: string; page: number }[] = [];
      const pageCount = Math.min(pdf.numPages, 5);
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        thumbs.push({ name: `${file.name}-p${i}.png`, url: canvas.toDataURL("image/png"), page: i });
      }
      setPdfPages(thumbs);
      setPdfActive(0);
    } catch (err) {
      console.error("PDF render error", err);
    }
  }

  function dataURLtoBlob(dataUrl: string) {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  function addClassMessage(text: string) {
    if (!text.trim()) return;
    setClassMessages((prev) => [...prev.slice(-20), text.trim()]);
    setClassInput("");
  }

function addPrivateMessage(text: string, target: string) {
  if (!text.trim()) return;
  setPrivateMessages((prev) => [...prev.slice(-20), { to: target, text: text.trim() }]);
  setPrivateInput("");
}

function deleteResource(sectionIdx: number, itemIdx: number) {
  setSections((prev) =>
    prev.map((sec, sIdx) =>
      sIdx === sectionIdx ? { ...sec, items: sec.items.filter((_, i) => i !== itemIdx) } : sec
    )
  );
}

function renameResource(sectionIdx: number, itemIdx: number) {
  const nextLabel = window.prompt("Yeni ad:", sections[sectionIdx]?.items[itemIdx]?.label ?? "");
  if (!nextLabel) return;
  setSections((prev) =>
    prev.map((sec, sIdx) =>
      sIdx === sectionIdx
        ? {
            ...sec,
            items: sec.items.map((it, i) => (i === itemIdx ? { ...it, label: nextLabel } : it)),
          }
        : sec
    )
  );
}

function toggleResourceVisibility(sectionIdx: number, itemIdx: number) {
  setSections((prev) =>
    prev.map((sec, sIdx) =>
      sIdx === sectionIdx
        ? {
            ...sec,
            items: sec.items.map((it, i) =>
              i === itemIdx ? { ...it, visible: it.visible === false ? true : false } : it
            ),
          }
        : sec
    )
  );
}

function addResource() {
  const sectionNames = sections.map((s) => s.title).join(", ");
  const target = window.prompt(`Hangi kategoriye eklemek istiyorsun? (${sectionNames})`, sections[0]?.title ?? "");
  if (!target) return;
  const title = window.prompt("Materyal adı:", "Yeni doküman");
  if (!title) return;
  const type = window.prompt("Tür: pdf / epub / video / link", "pdf");
  if (!type || !["pdf", "epub", "video", "link"].includes(type)) return;
  const url = window.prompt("URL (isteğe bağlı):", "");
  setSections((prev) =>
    prev.map((sec) =>
      sec.title === target
        ? {
            ...sec,
            items: [
              ...sec.items,
              {
                label: title,
                type: type as any,
                visible: true,
                url: url || undefined,
                actions: ["view", "download", "save", "delete", "rename", "toggle"],
              },
            ],
          }
        : sec
    )
  );
}

function raiseHand() {
  if (viewRole === "student") {
    setStudentHandRaised((v) => !v);
    if (!studentHandRaised) {
      setHandRaiseQueue((q) => [...q, { name: "Ben (Demo)", ts: Date.now() }].slice(-10));
      addClassMessage("✋ El kaldırdınız — eğitmen bilgilendirildi");
    } else {
      setHandRaiseQueue((q) => q.filter((h) => h.name !== "Ben (Demo)"));
      addClassMessage("✋ El indirdiniz");
    }
  }
}

function sendEmojiReaction(emoji: string) {
  const x = 30 + Math.random() * 40; // % from left
  const y = 30 + Math.random() * 40; // % from top
  const id = ++emojiIdRef.current;
  setEmojiReactions((prev) => [...prev, { id, emoji, x, y }]);
  setTimeout(() => setEmojiReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
}

function triggerConfetti() {
  setConfettiActive(true);
  addClassMessage("🎉 Tebrikler!");
  setTimeout(() => setConfettiActive(false), 3000);
}

function startPoll(question: string, options: string[]) {
  const initial: Record<string, number> = {};
  options.forEach((o) => { initial[o] = 0; });
  setPollVotes(initial);
  setPollOptionsArr(options);
  setPollActive(true);
  // Simulate student votes after a delay
  setTimeout(() => {
    const simVotes: Record<string, number> = {};
    options.forEach((o, i) => { simVotes[o] = Math.floor(Math.random() * 8) + (i === 0 ? 3 : 1); });
    setPollVotes(simVotes);
  }, 1500);
}

function votePoll(option: string) {
  setPollVotes((prev) => ({ ...prev, [option]: (prev[option] ?? 0) + 1 }));
}

const typeStyles: Record<string, { icon: string; chip: string }> = {
  pdf: { icon: "📄", chip: "bg-rose-50 text-rose-700 border-rose-200" },
  epub: { icon: "📘", chip: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  video: { icon: "▶️", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  link: { icon: "🔗", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

  const toolbar: ToolbarItem[] = [
    { label: "Cursor", icon: "🖱️", tool: "cursor" },
    { label: "Kalem", icon: "✏️", tool: "pen" },
    { label: "Fosfor", icon: "🖍️", tool: "highlighter" },
    { label: "Silgi", icon: "🧽", tool: "eraser" },
    { label: "Çizgi", icon: "／", tool: "line" },
    { label: "Dolgu", icon: "🪣", tool: "fill" },
    { label: "Renk Al", icon: "🎯", tool: "picker" },
    { label: "Pan", icon: "✋", tool: "pan" },
    { label: "Metin", icon: "🔤", tool: "text" },
    { label: "Not", icon: "📝", tool: "note" },
    { label: "Şekil", icon: "🔷", tool: "rect" },
    { label: "Daire", icon: "⚪", tool: "circle" },
    { label: "Ok", icon: "➜", tool: "arrow" },
    { label: "Lazer", icon: "🔦", tool: "laser" },
    { label: "Spot", icon: "💡", tool: "spotlight" },
    { label: "Grid", icon: "📐", onClick: () => {
      const order = ["plain", "grid", "dots", "iso", "music"] as const;
      const idx = order.indexOf(background as any);
      const next = order[(idx + 1) % order.length];
      setBackground(next as any);
    } },
    { label: "Tablo", icon: "📋", onClick: () => {
      const rows = Number(window.prompt("Satır sayısı", "3") ?? 3);
      const cols = Number(window.prompt("Sütun sayısı", "4") ?? 4);
      if (rows > 0 && cols > 0) boardRef.current?.addTable(rows, cols);
    } },
    { label: "Taşı", icon: "↔️", tool: "move" },
    { label: "Yükle", icon: "📑", onClick: () => fileInputRef.current?.click() },
    { label: "Görsel", icon: "🖼️", onClick: () => imageInputRef.current?.click() },
    { label: "Sunum", icon: "🗂️", onClick: () => presentationInputRef.current?.click() },
    { label: "Quiz", icon: "✅", onClick: () => setShowPoll(true) },
    { label: "AI Kalem", icon: aiSolve ? "🤖" : "🪄", onClick: () => {
      setAiSolve((v) => !v);
    } },
    { label: "Çeviri", icon: "🌐", onClick: () => {
      const text = window.prompt("Çevrilecek metin:");
      if (!text) return;
      boardRef.current?.addNote(`Çeviri: ${text}`);
    } },
    { label: "Ses", icon: "🔊", onClick: () => {
      const say = window.prompt("Seslendirilecek metin:");
      if (!say) return;
      boardRef.current?.addNote(`Seslendirildi: ${say}`);
    } },
    { label: "Hesap", icon: "🧮", onClick: () => setShowCalc((v) => !v) },
    { label: "Analiz", icon: "📊", onClick: () => boardRef.current?.addNote("Analiz modu: Öğrenci performansı anlık izleniyor.") },
    { label: "Sınav", icon: "📄", onClick: () => (window.location.href = "/exams/adaptive") },
    { label: "Çöp", icon: "🗑️", onClick: () => boardRef.current?.clear() },
    { label: "Undo", icon: "↩️", onClick: () => boardRef.current?.undo() },
    { label: "Redo", icon: "↪️", onClick: () => boardRef.current?.redo() },
    { label: "PNG", icon: "💾", onClick: () => boardRef.current?.download() },
    { label: "Yakınlaş", icon: "🔍", onClick: () => setZoomLevel((v) => Math.min(200, v + 10)) },
    { label: "Uzaklaş", icon: "🔎", onClick: () => setZoomLevel((v) => Math.max(50, v - 10)) },
    { label: "Odak", icon: "⛶", onClick: () => setFocusMode((v) => !v) },
    { label: "Cetvel", icon: "📏", onClick: () => boardRef.current?.addNote("📏 Cetvel / Ölçek 1:1") },
    { label: "İşaretçi", icon: "👆", tool: "laser" as const },
    ...(viewRole === "student" ? [
      { label: studentHandRaised ? "El İndir" : "El Kaldır", icon: studentHandRaised ? "🖐️" : "✋", onClick: () => raiseHand() },
      { label: "Tepki", icon: "😊", onClick: () => setShowEmojiPicker((v) => !v) },
    ] : [
      { label: "Kutla", icon: "🎉", onClick: () => triggerConfetti() },
      { label: "Tepki", icon: "😊", onClick: () => setShowEmojiPicker((v) => !v) },
    ]),
  ];

  // Klavye kısayolları
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      const combos: Record<string, () => void> = {
        v: () => { setActiveTool("cursor"); },
        b: () => { setAiSolve(true); setActiveTool("pen"); },
        p: () => { setActiveTool("pen"); },
        h: () => { setActiveTool("highlighter"); },
        e: () => { setActiveTool("eraser"); },
        l: () => { setActiveTool("laser"); },
        t: () => { setActiveTool("text"); },
        g: () => {
          const order = ["plain", "grid", "dots", "iso"] as const;
          const idx = order.indexOf(background as any);
          const next = order[(idx + 1) % order.length];
          setBackground(next as any);
        },
        z: () => { boardRef.current?.undo(); },
        y: () => { boardRef.current?.redo(); },
        u: () => fileInputRef.current?.click(),
        i: () => imageInputRef.current?.click(),
        q: () => setShowPoll(true),
        c: () => setShowCalc((v) => !v),
      };
      if (e.metaKey || e.ctrlKey) return;
      const fn = combos[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [background]);

  const renderMaterials = (readOnly: boolean) => (
    <div className="space-y-2">
      {sections.map((section, sIdx) => (
        <details key={section.title} open={sIdx === 0} className="rounded-xl border border-slate-200 bg-white">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
            <span className="font-semibold text-slate-800">{section.title}</span>
            <span className="text-slate-400">⌄</span>
          </summary>
          <div className="divide-y divide-slate-100">
            {section.items
              .filter((item) => viewRole === "instructor" || item.visible !== false)
              .map((item, iIdx) => {
                const actions = readOnly
                  ? (item.actions ?? ["view", "download"]).filter((a) => a === "view" || a === "download" || a === "save")
                  : item.actions ?? ["view", "download", "save", "delete", "rename", "toggle"];
                return (
                  <div key={item.label} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{typeStyles[item.type]?.icon ?? "📁"}</span>
                      <span className="font-medium">{item.label}</span>
                      <span
                        className={`pill text-[10px] ${
                          typeStyles[item.type]?.chip ?? "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        {item.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      {actions.includes("view") && (
                        <button className="btn-link text-xs" onClick={() => item.url && window.open(item.url, "_blank")}>
                          Gör
                        </button>
                      )}
                      {actions.includes("download") && (
                        <button className="btn-link text-xs" onClick={() => item.url && window.open(item.url, "_blank")}>
                          İndir
                        </button>
                      )}
                      {actions.includes("save") && <button className="btn-link text-xs">Kaydet</button>}
                      {!readOnly && actions.includes("delete") && (
                        <button className="btn-link text-xs text-rose-600 border-rose-200" onClick={() => deleteResource(sIdx, iIdx)}>
                          Sil
                        </button>
                      )}
                      {!readOnly && actions.includes("rename") && (
                        <button className="btn-link text-xs" onClick={() => renameResource(sIdx, iIdx)}>
                          Yeniden Adlandır
                        </button>
                      )}
                      {!readOnly && actions.includes("toggle") && (
                        <button className="btn-link text-xs" onClick={() => toggleResourceVisibility(sIdx, iIdx)}>
                          {item.visible === false ? "Öğrenciye Aç" : "Öğrenciden Gizle"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </details>
      ))}
    </div>
  );


  return (
    <main className={`${highContrast ? "bg-white text-slate-900" : "bg-slate-950 text-slate-50"} h-screen overflow-hidden`}>
      <div className={`grid gap-3 h-[calc(100vh-24px)] overflow-hidden px-3 pt-3 pb-3 transition-all duration-300 ${
        focusMode ? "xl:grid-cols-[0px_1fr_0px]" : "xl:grid-cols-[96px_1fr_360px]"
      }`}>
        {/* Toolbar */}
        <aside
          className={`sticky top-4 self-start w-[96px] rounded-2xl bg-gradient-to-b from-slate-850 to-slate-950 text-white p-2 shadow-2xl shadow-black/40 grid grid-cols-2 gap-1 border border-slate-700/60 transition-all duration-300 ${focusMode ? "opacity-0 pointer-events-none w-0 overflow-hidden p-0" : ""}`}
          aria-label="Araç çubuğu"
        >
          {toolbar
            .filter((item) => (viewRole === "instructor" ? true : roleToolbarWhitelist.student.has(item.label)))
            .map((item, idx) => {
              const isActive = item.tool ? activeTool === item.tool : item.label === "AI Kalem" && aiSolve;
              return (
                <button
                  key={item.label}
                  className={`relative h-11 w-11 grid place-items-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                    isActive
                      ? "bg-white/25 border-amber-300 shadow-inner text-amber-50"
                      : "bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/25"
                  }`}
                  type="button"
                  aria-label={item.label}
                  onClick={() => {
                    if (item.tool) {
                      setActiveTool(item.tool);
                      boardRef.current?.setTool(item.tool);
                    }
                    item.onClick?.();
                    if (item.label === "AI Kalem") {
                      setActiveTool("pen");
                      boardRef.current?.setTool("pen");
                    }
                  }}
                  title={item.label}
                >
                  <span className="text-lg leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">{item.icon}</span>
                  <span className="sr-only">{item.label}</span>
                  {idx === 5 || idx === 12 || idx === 17 ? (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-px w-7 bg-white/25" aria-hidden />
                  ) : null}
                </button>
              );
            })}
        </aside>

        {/* Canvas + controls */}
        <section className="glass rounded-2xl border border-slate-700/50 bg-slate-900/70 text-slate-50 p-3 relative flex flex-col gap-3 min-h-[calc(100vh-140px)] overflow-hidden">
          {/* Üst kontrol şeridi */}
          <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr] text-xs items-center">
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              >
                <option value="demo-room">demo-room</option>
                <option value="math-class">math-class</option>
                <option value="physics-live">physics-live</option>
              </select>
              <select
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                value={viewRole}
                onChange={(e) => setViewRole(e.target.value as any)}
              >
                <option value="instructor">Eğitmen görünümü</option>
                <option value="student">Öğrenci görünümü</option>
              </select>
              <select
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
                value={background}
                onChange={(e) => setBackground(e.target.value as any)}
              >
                <option value="plain">Düz</option>
                <option value="grid">Kareli</option>
                <option value="dots">Noktalı</option>
                <option value="iso">İzometrik</option>
                <option value="music">Porte</option>
              </select>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                <span className="text-[10px] text-slate-400">Renk</span>
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="h-6 w-6 rounded border border-slate-600 bg-transparent"
                  aria-label="Kalem rengi"
                />
                {["#0f172a", "#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#a855f7"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPenColor(c)}
                    className="h-4 w-4 rounded-full border border-slate-600"
                    style={{ background: c }}
                    aria-label={`Renk ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                <span className="text-[10px] text-slate-400">Kalınlık</span>
                <input
                  type="range"
                  min={1}
                  max={16}
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                <span className="text-[10px] text-slate-400">Silgi</span>
                {[
                  { label: "Piksel", value: "pixel" as const },
                  { label: "Obje", value: "object" as const },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-md px-2 py-1 text-[11px] border transition ${
                      eraserMode === opt.value
                        ? "border-amber-300 bg-amber-200/20 text-amber-100"
                        : "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
                    }`}
                    onClick={() => {
                      setEraserMode(opt.value);
                      setActiveTool("eraser");
                      boardRef.current?.setTool("eraser");
                    }}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[
                  { label: "Only Board", value: "board" },
                  { label: "Hybrid", value: "hybrid" },
                  { label: "Only Hoca", value: "teacher" },
                ].map((v) => (
                  <button
                    key={v.value}
                    className={`rounded-full px-3 py-1 text-[11px] border transition ${
                      viewMode === v.value
                        ? "border-amber-300 bg-amber-300 text-slate-900"
                        : "border-slate-600 bg-slate-800 text-slate-100"
                    }`}
                    onClick={() => setViewMode(v.value as any)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <span className="rounded-full px-3 py-1 text-[11px] border border-slate-600 bg-slate-800 text-slate-100">
                Aktif: {activeTool}
                {activeTool === "eraser" ? ` (${eraserMode === "object" ? "obje" : "piksel"})` : ""} {boardReady ? "• Hazır" : "• Yükleniyor"}
              </span>
              <button className={`btn-dark ${mode === "local" ? "border-emerald-400 text-emerald-200" : "border-slate-600"}`} onClick={() => setMode("local")}>Lokal</button>
              <button className={`btn-dark ${mode === "live" ? "border-emerald-400 text-emerald-200" : "border-slate-600"}`} onClick={() => setMode("live")}>Canlı</button>
              <button
                className={`btn-dark text-xs rounded-xl ${focusMode ? "border-amber-300 bg-amber-900/40 text-amber-100" : "border-slate-600 text-slate-100"}`}
                onClick={() => setFocusMode((v) => !v)}
                title="Odak modu (Ctrl+F)"
              >
                {focusMode ? "⛶ Odaktan Çık" : "⛶ Odak Modu"}
              </button>
            </div>
            {viewRole === "instructor" && (
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  className={`btn-dark text-xs rounded-xl ${mode === "live" ? "border-emerald-300 bg-emerald-900/40 text-emerald-100" : "border-slate-600 text-slate-100"}`}
                  onClick={() => setMode("live")}
                >
                  📡 Canlı Yayına Al
                </button>
                <button
                  className={`btn-dark text-xs rounded-xl ${recording ? "border-rose-300 bg-rose-900/40 text-rose-100" : "border-slate-600 text-slate-100"}`}
                  onClick={() => setRecording((v) => !v)}
                >
                  {recording ? "⏹️ Kaydı Durdur" : "⏺️ Kayıt Başlat"}
                </button>
                <span className="rounded-full px-3 py-1 text-[11px] border border-emerald-400 bg-emerald-900/40 text-emerald-100">Ping 18 ms</span>
                <span className="rounded-full px-3 py-1 text-[11px] border border-blue-400 bg-blue-900/40 text-blue-100">HD</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100/15 pt-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">{wb.labels.actionsTitle}</div>
            <div className="flex flex-wrap gap-2">
              {quickActions
                .filter((item) => (viewRole === "instructor" ? true : roleQuickActionsWhitelist.student.has(item.label)))
                .map((item) => (
                  <button
                    key={item.label}
                    className="btn-dark btn-dark-xs"
                    onClick={item.onClick}
                    type="button"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Sayfa + kontrol barı (tek sıra) */}
          <div className="flex items-center gap-2 border-t border-slate-100/20 pt-2 overflow-x-auto flex-nowrap rounded-xl bg-slate-900/60 px-2 py-2">
            <button className="btn-dark btn-dark-xs disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Önceki sayfa">⬅️</button>
            <div className="rounded-full px-3 py-1 text-[11px] border border-slate-600 bg-slate-800 text-slate-100">{wb.labels.pages} 1/1</div>
            <button className="btn-dark btn-dark-xs disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Sonraki sayfa">➡️</button>
            <button className="btn-dark btn-dark-xs disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Yeni sayfa ekle" disabled={viewRole === "student"}>➕ {wb.labels.newPage}</button>
            <span className="mx-2 h-4 w-px bg-slate-700/60" />
            <button className="btn-dark btn-dark-xs disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Geri al" onClick={() => boardRef.current?.undo()} disabled={viewRole === "student"}>↩️ {wb.labels.undo}</button>
            <button className="btn-dark btn-dark-xs disabled:opacity-45 disabled:cursor-not-allowed" aria-label="İleri al" onClick={() => boardRef.current?.redo()} disabled={viewRole === "student"}>↪️ {wb.labels.redo}</button>
            <button className="btn-dark btn-dark-xs text-rose-200 border-rose-400/50 disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Tahtayı temizle" onClick={() => boardRef.current?.clear()} disabled={viewRole === "student"}>🧹 {wb.labels.clear}</button>
            <span className="mx-2 h-4 w-px bg-slate-700/60" />
            <button className="btn-dark btn-dark-xs text-rose-200 border-rose-400/50 disabled:opacity-45 disabled:cursor-not-allowed" aria-label="Dersi kapat" disabled={viewRole === "student"}>⏹️ {wb.labels.close}</button>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex-1 min-h-[520px]">
            <div className="absolute left-3 top-3 z-10 pill text-[11px] bg-slate-800 text-slate-100">Tahta Alanı</div>
            {viewRole === "instructor" && pdfPages.length > 0 ? (
              <div className="absolute right-3 top-3 z-20 w-44 rounded-xl border border-slate-700 bg-slate-900/90 text-slate-100 shadow-xl">
                <div className="flex items-center justify-between px-2 py-2 text-[11px]">
                  <span className="font-semibold">Önizleme</span>
                  <button
                    className="text-slate-300 hover:text-white"
                    onClick={() => setShowSlidePreview((v) => !v)}
                    aria-label="Önizlemeyi aç/kapat"
                  >
                    {showSlidePreview ? "▾" : "▸"}
                  </button>
                </div>
                {showSlidePreview ? (
                  <>
                    <div className="max-h-44 overflow-y-auto px-2 pb-2 space-y-1">
                      {pdfPages.map((p, idx) => (
                        <button
                          key={`${p.name}-${idx}`}
                          className={`w-full rounded-lg overflow-hidden border ${
                            pdfActive === idx ? "border-emerald-400" : "border-slate-700"
                          }`}
                          onClick={() => projectPdfPage(idx)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={`PDF sayfa ${p.page}`} className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-2 pb-2 text-[11px]">
                      <button className="btn-dark btn-dark-xs" onClick={() => projectPdfPage(Math.max(0, (pdfActive ?? 0) - 1))} disabled={pdfActive === 0}>◀︎</button>
                      <span className="text-slate-300">Sayfa {pdfActive != null ? pdfActive + 1 : 1}</span>
                      <button className="btn-dark btn-dark-xs" onClick={() => projectPdfPage(Math.min(pdfPages.length - 1, (pdfActive ?? 0) + 1))} disabled={pdfActive === pdfPages.length - 1}>▶︎</button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="h-full w-full border border-slate-800 bg-slate-950 shadow-inner relative overflow-hidden">
              {mode === "live" ? (
                <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-amber-900/70 text-amber-50 px-3 py-1 text-[11px] border border-amber-400/60 shadow-lg">
                  <span>📡 Canlı Mod (şimdilik lokal çizim, WS senkron devre dışı)</span>
                  <span className="hidden sm:inline text-amber-200/80">Adres: {liveUrl}</span>
                </div>
              ) : null}
              <WhiteboardLocal
                ref={boardRef}
                background={background === "plain" ? undefined : background}
                showControls={false}
                tool={activeTool}
                eraserMode={eraserMode}
                color={penColor}
                width={penWidth}
                onReady={() => setBoardReady(true)}
                onColorPick={(picked) => setPenColor(picked)}
              />
            </div>
          </div>
        </section>

        {/* Right panel */}
        <aside className={`glass rounded-2xl border border-slate-200 p-3 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-32px)] text-slate-900 transition-all duration-300 ${focusMode ? "opacity-0 pointer-events-none w-0 overflow-hidden p-0" : ""}`}>
          <div className="flex gap-2">
            {(["manage", "chat", "files", "records", "participants"] as const).map((t) => (
              <button
                key={t}
                className={`flex-1 rounded-lg border px-1.5 py-1.5 text-xs capitalize ${
                  activeTab === t ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-900"
                }`}
                onClick={() => setActiveTab(t as any)}
              >
                {t === "manage" && "Yönetim"}
                {t === "chat" && "💬"}
                {t === "files" && "📁"}
                {t === "records" && "📋"}
                {t === "participants" && (
                  <span className="flex items-center gap-1">
                    👥
                    {handRaiseQueue.length > 0 && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold">{handRaiseQueue.length}</span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "manage" && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Sınıf Listesi ve Yönetim</div>
              <button className="btn-link justify-center" onClick={() => {
                const names = participantsList.map((p, i) => `${i+1}. ${p.name} — ${p.status === "online" ? "✅" : p.status === "idle" ? "⏸" : "❌"}`).join("\n");
                boardRef.current?.addText(`Yoklama:\n${names}`);
                addClassMessage("Yoklama tahtaya eklendi");
              }}>Sınıf yoklamasını al</button>
              {viewRole === "instructor" && handRaiseQueue.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 space-y-1">
                  <div className="text-xs font-semibold text-amber-700">✋ El Kaldırma ({handRaiseQueue.length})</div>
                  {handRaiseQueue.slice(0, 3).map((h, i) => (
                    <div key={h.ts} className="flex items-center justify-between text-xs">
                      <span>{h.name}</span>
                      <button className="btn-link text-[10px] text-emerald-700" onClick={() => {
                        boardRef.current?.addNote(`${h.name} söz hakkı aldı`);
                        setHandRaiseQueue((q) => q.filter((_, qi) => qi !== i));
                      }}>Söz ver</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Mustafa Mimar</div>
                  <span className="pill text-xs">Eğitmen</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-link">Söz ver</button>
                  <button className="btn-link text-rose-700 border-rose-300">İzni reddet</button>
                  <button className="btn-link" onClick={toggleScreen}>{screenStream ? "🛑 Ekran durdur" : "🖥️ Ekran aç"}</button>
                  <button className="btn-link" onClick={toggleCamera}>{cameraStream ? "🛑 Kamera kapat" : "📷 Kamera aç"}</button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-1 text-xs text-emerald-700">
                <div>SİSTEM: ATLAsio WebRTC armor aktif.</div>
                <div>SİSTEM: Eğitmen olarak tahtaya bağlandınız.</div>
              </div>
              <button className="btn-link justify-center" onClick={() => (window.location.href = "/booking")}>🗓️ Randevu Takvimi</button>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span>Sınıf Mesajları</span>
                  <span className="pill text-[10px]">Herkes</span>
                </div>
                <div className="h-28 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs space-y-1">
                  {classMessages.length === 0 ? <div className="text-slate-400">Henüz mesaj yok.</div> : classMessages.map((m, i) => (
                    <div key={i} className="rounded-md bg-white px-2 py-1 shadow-sm border border-slate-100">
                      {m}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Tüm sınıfa mesaj"
                    value={classInput}
                    onChange={(e) => setClassInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addClassMessage(classInput);
                    }}
                  />
                  <button className="btn-link" onClick={() => addClassMessage(classInput)}>Gönder</button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span>{wb.labels.privateMsg}</span>
                  <span className="pill text-[10px] bg-amber-50 border-amber-200 text-amber-700">Kontrollü</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{wb.labels.privateTo}</span>
                  <select
                    value={privateTarget}
                    onChange={(e) => setPrivateTarget(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                  >
                    {roster.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="h-20 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs space-y-1">
                  {privateMessages.length === 0 ? <div className="text-slate-400">{wb.labels.noMsg}</div> : privateMessages.map((m, i) => (
                    <div key={i} className="rounded-md bg-white px-2 py-1 shadow-sm border border-slate-100">
                      <div className="text-[11px] text-slate-500">→ {m.to}</div>
                      <div>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder={wb.labels.privateMsg}
                    value={privateInput}
                    onChange={(e) => setPrivateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addPrivateMessage(privateInput, privateTarget);
                    }}
                  />
                  <button className="btn-link" onClick={() => addPrivateMessage(privateInput, privateTarget)}>{wb.labels.send}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-3">
              {viewRole === "student" ? (
                <>
                  <div className="text-sm font-semibold">Ders Materyalleri (Öğrenci)</div>
                  {renderMaterials(true)}
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold">Kamera / Ekran</div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500">Kamera Önizleme</div>
                    <video ref={cameraRef} className="w-full rounded-lg border border-slate-200 bg-black aspect-video" autoPlay muted playsInline />
                    {cameraError ? <div className="text-xs text-rose-600">{cameraError}</div> : null}
                    <div className="text-xs text-slate-500">Ekran Paylaşımı</div>
                    <video ref={screenRef} className="w-full rounded-lg border border-slate-200 bg-black aspect-video" autoPlay muted playsInline />
                    {screenError ? <div className="text-xs text-rose-600">{screenError}</div> : null}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">PDF Yükle</div>
                    <button className="btn-link" onClick={() => fileInputRef.current?.click()}>📑 PDF Seç/Yükle</button>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onPdfPicked} />
                    {pdfName ? (
                      <div className="text-xs text-slate-600 break-all">Yüklendi: {pdfName}</div>
                    ) : (
                      <div className="text-xs text-slate-500">Henüz dosya yok.</div>
                    )}
                    {pdfUrl ? (
                      <object data={pdfUrl} type="application/pdf" className="w-full h-40 rounded-lg border border-slate-200">
                        <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-700">PDF’i aç</a>
                      </object>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Sunum (Çoklu Sayfa)</div>
                    <button className="btn-link" onClick={() => presentationInputRef.current?.click()}>🗂️ Dosya Ekle</button>
                    <input ref={presentationInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={onPresentationPicked} />
                    {presentationFiles.length === 0 ? (
                      <div className="text-xs text-slate-500">Henüz sunum yok. Yüklenen dosyalar sadece hocada görünür.</div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span>Toplam {presentationFiles.length} sayfa</span>
                          <div className="flex gap-1">
                            <button
                              className="btn-link px-2 py-1"
                              onClick={() => setCurrentSlide((i) => Math.max(0, i - 1))}
                              disabled={currentSlide === 0}
                            >
                              ◀︎
                            </button>
                            <div className="pill text-[11px]">Sayfa {currentSlide + 1}</div>
                            <button
                              className="btn-link px-2 py-1"
                              onClick={() => setCurrentSlide((i) => Math.min(presentationFiles.length - 1, i + 1))}
                              disabled={currentSlide === presentationFiles.length - 1}
                            >
                              ▶︎
                            </button>
                          </div>
                        </div>
                        <div className="text-slate-700 break-all">{presentationFiles[currentSlide]?.name}</div>
                        <button className="btn-link w-full justify-center" onClick={presentCurrentSlide}>Tahtada Göster</button>
                      </div>
                    )}

                    {pdfPages.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">PDF Sunum Kontrolü (Hoca önizleme)</div>
                          <div className="flex gap-1">
                            <button className="btn-link px-2 py-1 text-[11px]" onClick={() => projectPdfPage(Math.max(0, (pdfActive ?? 0) - 1))} disabled={pdfActive === 0}>Önceki</button>
                            <button className="btn-link px-2 py-1 text-[11px]" onClick={() => projectPdfPage(Math.min(pdfPages.length - 1, (pdfActive ?? 0) + 1))} disabled={pdfActive === pdfPages.length - 1}>Sonraki</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-[90px_1fr] gap-2">
                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                            {pdfPages.map((p, idx) => (
                              <button
                                key={p.url}
                                className={`w-full border rounded-lg overflow-hidden text-left ${pdfActive === idx ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}
                                onClick={() => projectPdfPage(idx)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.url} alt={`PDF sayfa ${p.page}`} className="w-full h-16 object-cover" />
                                <div className="text-[10px] px-2 py-1 text-slate-600">Sayfa {p.page}</div>
                              </button>
                            ))}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 min-h-[120px]">
                            {pdfActive != null && pdfPages[pdfActive] ? (
                              <div className="space-y-2 text-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={pdfPages[pdfActive].url} alt={`Aktif sayfa ${pdfPages[pdfActive].page}`} className="w-full max-h-40 object-contain rounded border border-slate-200" />
                                <div className="flex items-center justify-between">
                                  <span className="pill text-[10px]">Aktif: {pdfPages[pdfActive].page}</span>
                                  <button className="btn-link text-[11px]" onClick={() => projectPdfPage(pdfActive)}>Tahtaya Yansıt</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-xs">Önizleme seçilmedi.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {lastCalc ? (
                    <div className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600 bg-slate-50">
                      Son hesap: {lastCalc}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {activeTab === "records" && (
            <div className="space-y-3 text-sm text-slate-600">
              <div className="text-sm font-semibold">Ders Duyuruları</div>
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-500">★</span>
                        <span className="font-semibold">{a.title}</span>
                      </div>
                      <span className="pill text-[10px] bg-emerald-50 border-emerald-200 text-emerald-700">{a.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{a.body}</p>
                    <div className="flex gap-2 text-[11px] text-slate-500">
                      <button className="btn-link text-[11px]">Oku</button>
                      <button className="btn-link text-[11px]">Sabitle</button>
                      <button className="btn-link text-[11px]">Paylaş</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm font-semibold">Soru Kuyruğu</div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs space-y-2 max-h-40 overflow-y-auto">
                {questionQueue.length === 0 ? (
                  <div className="text-slate-400">Şu an soru yok.</div>
                ) : (
                  questionQueue.map((q, i) => (
                    <div key={i} className="rounded-md bg-white px-2 py-1 border border-slate-100">
                      <div className="font-semibold text-[11px]">{q.name}</div>
                      <div>{q.text}</div>
                      <div className="text-[10px] text-slate-400">{new Date(q.ts).toLocaleTimeString()}</div>
                      <button
                        className="btn-link text-[11px]"
                        onClick={() => {
                          boardRef.current?.addNote(`Soru: ${q.text}`);
                        }}
                      >
                        Tahtada Göster
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="text-sm font-semibold">Mini Quiz</div>
              <div className="space-y-2 text-xs">
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  placeholder="Quiz sorusu"
                  value={quizQuestion}
                  onChange={(e) => setQuizQuestion(e.target.value)}
                />
                <textarea
                  className="w-full rounded-lg border px-3 py-2"
                  rows={3}
                  placeholder="A) ...\nB) ...\nC) ..."
                  value={quizOptions}
                  onChange={(e) => setQuizOptions(e.target.value)}
                />
                <button
                  className="btn-link w-full justify-center"
                  onClick={() => {
                    const opts = quizOptions
                      .split("\n")
                      .map((o) => o.trim())
                      .filter(Boolean);
                    if (!quizQuestion || opts.length === 0) return;
                    const block = `${quizQuestion}\n${opts.join("\n")}`;
                    boardRef.current?.addText(block);
                    setQuizPublish(true);
                    addClassMessage(`Mini quiz yayınlandı: ${quizQuestion}`);
                  }}
                >
                  Quiz Yayınla
                </button>
                {quizPublish ? <div className="pill text-[11px] bg-emerald-50 border-emerald-200 text-emerald-700">Öğrencilere yayınlandı</div> : null}
              </div>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Katılımcılar ({participantsList.filter(p => p.status !== "offline").length} çevrimiçi)</div>
                {handRaiseQueue.length > 0 && (
                  <span className="pill text-[10px] bg-amber-50 border-amber-300 text-amber-700 animate-pulse">
                    ✋ {handRaiseQueue.length} el kaldırıldı
                  </span>
                )}
              </div>

              {/* Hand raise queue */}
              {handRaiseQueue.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="text-xs font-semibold text-amber-800">El Kaldırma Sırası</div>
                  {handRaiseQueue.map((h, i) => (
                    <div key={h.ts} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="text-amber-500">✋</span>
                        <span className="font-medium">{h.name}</span>
                      </span>
                      <div className="flex gap-1">
                        <button className="btn-link text-[11px] text-emerald-700 border-emerald-200" onClick={() => {
                          boardRef.current?.addNote(`${h.name} söz hakkı aldı`);
                          addClassMessage(`✅ ${h.name} — söz hakkı verildi`);
                          setHandRaiseQueue((q) => q.filter((_, qi) => qi !== i));
                        }}>Söz ver</button>
                        <button className="btn-link text-[11px] text-rose-600 border-rose-200" onClick={() => setHandRaiseQueue((q) => q.filter((_, qi) => qi !== i))}>İndir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Participant list */}
              <div className="space-y-1.5">
                {participantsList.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        p.status === "online" ? "bg-emerald-400" : p.status === "idle" ? "bg-amber-400" : "bg-slate-300"
                      }`} />
                      <span className="text-xs font-medium text-slate-800">{p.name}</span>
                      {p.handRaised && <span className="text-xs">✋</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        p.mic ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>🎤</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        p.cam ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}>📷</span>
                      {viewRole === "instructor" && (
                        <button
                          className="text-[10px] text-rose-500 hover:text-rose-700 ml-1"
                          title="Çıkar"
                          onClick={() => {
                            setParticipantsList((prev) => prev.filter((_, pi) => pi !== i));
                            addClassMessage(`${p.name} dersten çıkarıldı`);
                          }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Countdown timer */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                <div className="text-xs font-semibold">Geri Sayım Zamanlayıcı</div>
                <div className="flex items-center gap-2">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={countdownMs === 0 ? "#10b981" : countdownMs < countdownTarget * 200 ? "#ef4444" : "#3b82f6"}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdownMs / (countdownTarget * 1000))}`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-800">{Math.ceil(countdownMs / 1000)}s</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-slate-500">Süre (s)</label>
                      <input
                        type="number"
                        min={5}
                        max={600}
                        value={countdownTarget}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setCountdownTarget(v);
                          if (!countdownActive) setCountdownMs(v * 1000);
                        }}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                          countdownActive
                            ? "bg-rose-50 border-rose-300 text-rose-700"
                            : "bg-blue-50 border-blue-300 text-blue-700"
                        }`}
                        onClick={() => {
                          if (!countdownActive) setCountdownMs(countdownTarget * 1000);
                          setCountdownActive((v) => !v);
                        }}
                      >
                        {countdownActive ? "⏸ Durdur" : "▶ Başlat"}
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px]"
                        onClick={() => { setCountdownActive(false); setCountdownMs(countdownTarget * 1000); }}
                      >↺</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active poll results */}
              {pollActive && pollOptionsArr.length > 0 && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-violet-800">Canlı Anket Sonuçları</div>
                    <button className="text-[10px] text-violet-600 hover:underline" onClick={() => setPollActive(false)}>Kapat</button>
                  </div>
                  {(() => {
                    const total = Object.values(pollVotes).reduce((s, v) => s + v, 0) || 1;
                    return pollOptionsArr.map((opt) => {
                      const votes = pollVotes[opt] ?? 0;
                      const pct = Math.round((votes / total) * 100);
                      return (
                        <div key={opt} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-violet-800 font-medium">{opt}</span>
                            <span className="text-violet-600">{votes} oy ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-violet-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {viewRole === "student" && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pollOptionsArr.map((opt) => (
                        <button
                          key={opt}
                          className="rounded-lg border border-violet-300 bg-white px-2 py-1 text-[11px] text-violet-700 hover:bg-violet-100 transition"
                          onClick={() => votePoll(opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePicked} />

      {/* PiP küçük görüntüler */}
      <DraggablePip visible={!!cameraStream} videoRef={pipCamRef} initial={{ x: 40, y: 40 }} />
      <DraggablePip visible={!!screenStream} videoRef={pipScreenRef} initial={{ x: 40, y: 140 }} />

      {showCalc && (
        <CalculatorPanel
          expr={calcExpr}
          result={calcResult}
          setExpr={setCalcExpr}
          setResult={setCalcResult}
          onClose={() => setShowCalc(false)}
          onPush={() => {
            const raw = calcExpr.trim();
            let resultText = calcResult && calcResult !== "Hata" ? calcResult : null;
            if (!resultText && raw) {
              try {
                const pre = raw
                  .replace(/π/gi, "Math.PI")
                  .replace(/\be\b/g, "Math.E")
                  .replace(/sin\(/g, "Math.sin(")
                  .replace(/cos\(/g, "Math.cos(")
                  .replace(/tan\(/g, "Math.tan(")
                  .replace(/log\(/g, "Math.log10(")
                  .replace(/ln\(/g, "Math.log(")
                  .replace(/sqrt\(/g, "Math.sqrt(")
                  .replace(/\^/g, "**");
                // eslint-disable-next-line no-new-func
                const r = Function("Math", `"use strict"; return (${pre});`)(Math);
                resultText = String(r);
                setCalcResult(resultText);
              } catch (err) {
                setCalcResult("Hata");
                setCalcError("Hatalı ifade, kontrol edin.");
                return;
              }
            }
            const text = raw && resultText ? `${raw} = ${resultText}` : (resultText ?? raw);
            if (!text) return;
            boardRef.current?.addText(text);
            setLastCalc(text);
            setShowCalc(false);
          }}
          onEval={() => {
            try {
              const pre = calcExpr
                .replace(/π/gi, "Math.PI")
                .replace(/\be\b/g, "Math.E")
                .replace(/sin\(/g, "Math.sin(")
                .replace(/cos\(/g, "Math.cos(")
                .replace(/tan\(/g, "Math.tan(")
                .replace(/log\(/g, "Math.log10(")
                .replace(/ln\(/g, "Math.log(")
                .replace(/sqrt\(/g, "Math.sqrt(")
                .replace(/\^/g, "**");
              // eslint-disable-next-line no-new-func
              const r = Function("Math", `\"use strict\"; return (${pre});`)(Math);
              setCalcResult(String(r));
              setLastCalc(`${calcExpr} = ${r}`);
            } catch (err) {
              setCalcResult("Hata");
              setCalcError("Hatalı ifade, kontrol edin.");
            }
          }}
        />
      )}

      <HelperWidget
        open={showHelper}
        onClose={() => {
          setShowHelper(false);
        }}
        calcExpr={calcExpr}
        setCalcExpr={setCalcExpr}
        calcResult={calcResult}
        setCalcResult={setCalcResult}
        setCalcError={setCalcError}
        onCalcToBoard={(text) => {
          setLastCalc(text);
          boardRef.current?.addText(text);
        }}
        onSolveMath={() => {
          const expr = window.prompt("Tahtaya çözülecek matematik ifadesi:", calcExpr || "");
          if (!expr) return;
          try {
            // eslint-disable-next-line no-new-func
            const result = Function(`"use strict"; return (${expr});`)();
            const text = `${expr} = ${result}`;
            setCalcResult(String(text));
            setLastCalc(text);
            boardRef.current?.addText(text);
          } catch (err) {
            setCalcResult("Hata: ifade");
          }
        }}
        timerOn={timerOn}
        timerMs={timerMs}
        toggleTimer={() => setTimerOn((v) => !v)}
      />

      {showMatrix && (
        <Modal onClose={() => setShowMatrix(false)} title="Tablo Oluştur">
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <input type="number" min={1} max={20} value={matrixRows} onChange={(e) => setMatrixRows(Number(e.target.value))} className="w-20 rounded-lg border px-3 py-2" />
              <input type="number" min={1} max={20} value={matrixCols} onChange={(e) => setMatrixCols(Number(e.target.value))} className="w-20 rounded-lg border px-3 py-2" />
            </div>
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              rows={4}
              placeholder="İsteğe bağlı hücre verisi: satırlar yeni satırda, sütunlar virgül veya boşlukla ayrılır"
              value={matrixData}
              onChange={(e) => setMatrixData(e.target.value)}
            />
            <button
              className="btn-link"
              onClick={() => {
                if (matrixRows > 0 && matrixCols > 0) {
                  const parsed = parseMatrix(matrixData, matrixRows, matrixCols);
                  boardRef.current?.addTable(parsed.rows, parsed.cols, parsed.data);
                  setShowMatrix(false);
                }
              }}
            >
              Tahtaya Ekle
            </button>
          </div>
        </Modal>
      )}

      {showPoll && (
        <Modal onClose={() => setShowPoll(false)} title="Hızlı Anket / Quiz">
          <div className="space-y-3 text-sm">
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Soru başlığı"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              rows={4}
              placeholder="Her satıra bir seçenek yazın"
              value={pollOptions}
              onChange={(e) => setPollOptions(e.target.value)}
            />
            <button
              className="btn-link"
              onClick={() => {
                const options = pollOptions
                  .split("\n")
                  .map((o) => o.trim())
                  .filter(Boolean);
                if (!pollQuestion || options.length === 0) return;
                const textBlock = `${pollQuestion}\n${options
                  .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
                  .join("\n")}`;
                boardRef.current?.addText(textBlock);
                startPoll(pollQuestion, options);
                setActiveTab("participants");
                setShowPoll(false);
              }}
            >
              Tahtaya Ekle & Oylamayı Başlat
            </button>
          </div>
        </Modal>
      )}

      {showBooking && (
        <Modal onClose={() => setShowBooking(false)} title="Toplantı / Ders Randevusu">
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-500">Tarih</label>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-500">Saat</label>
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                />
              </div>
            </div>
            <textarea
              className="w-full rounded-lg border px-3 py-2"
              rows={3}
              placeholder="Ders içeriği / not"
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-link flex-1" onClick={() => setShowBooking(false)}>Vazgeç</button>
              <button
                className="btn-link flex-1"
                onClick={() => {
                  const text = `Randevu talebi: ${bookingDate} ${bookingTime} ${bookingNote ? " - " + bookingNote : ""}`;
                  boardRef.current?.addNote(text);
                  addClassMessage(`Takvimde yeni rezervasyon: ${bookingDate} ${bookingTime}`);
                  setShowBooking(false);
                }}
              >
                Takvime Yaz
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Emoji reactions floating overlay */}
      {emojiReactions.map((r) => (
        <div
          key={r.id}
          className="fixed pointer-events-none z-[100] animate-scale-in text-4xl select-none"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            animation: "emojiFloat 2.5s ease-out forwards",
          }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div className="fixed left-28 bottom-20 z-50 rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-semibold">Tepki Gönder</span>
            <button className="text-slate-400 text-sm" onClick={() => setShowEmojiPicker(false)}>✕</button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {["👍", "❤️", "😂", "😮", "🔥", "👏", "🤔", "😢", "🎉", "💯"].map((emoji) => (
              <button
                key={emoji}
                className="text-2xl p-1.5 rounded-lg hover:bg-white/10 transition"
                onClick={() => { sendEmojiReaction(emoji); addClassMessage(`${emoji} tepkisi gönderildi`); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confetti overlay */}
      {confettiActive && (
        <div className="fixed inset-0 z-[99] pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm opacity-90"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                background: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7", "#ec4899"][i % 6],
                animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Hand raise indicator for student */}
      {viewRole === "student" && studentHandRaised && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-400 text-slate-900 px-4 py-2 text-sm font-bold shadow-lg animate-pulse flex items-center gap-2">
          <span>✋</span> El kaldırıldı — Eğitmen onayı bekleniyor
        </div>
      )}

      {/* Zoom indicator */}
      {zoomLevel !== 100 && (
        <div className="fixed bottom-20 right-4 z-50 rounded-xl bg-slate-800/90 text-slate-100 px-3 py-1.5 text-xs font-mono border border-slate-700">
          {zoomLevel}%
        </div>
      )}

      {calcError ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-xl bg-rose-600 text-white px-4 py-2 shadow-2xl border border-rose-500">
            {calcError}
            <button className="ml-3 text-xs underline" onClick={() => setCalcError(null)}>Kapat</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function parseMatrix(raw: string, fallbackRows: number, fallbackCols: number) {
  const rowsArr = raw
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((row) => row.split(/[,\s]+/).filter(Boolean));
  const rows = rowsArr.length || fallbackRows;
  const cols = rowsArr.reduce((m, r) => Math.max(m, r.length), 0) || fallbackCols;
  const data: string[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => rowsArr[r]?.[c] ?? "")
  );
  return { rows, cols, data };
}

function HelperWidget({
  open,
  onClose,
  calcExpr,
  setCalcExpr,
  calcResult,
  setCalcResult,
  setCalcError,
  onCalcToBoard,
  onSolveMath,
  timerOn,
  timerMs,
  toggleTimer,
}: {
  open: boolean;
  onClose: () => void;
  calcExpr: string;
  setCalcExpr: (v: string | ((prev: string) => string)) => void;
  calcResult: string | null;
  setCalcResult: (v: string | null) => void;
  setCalcError: (v: string | null) => void;
  onCalcToBoard: (text: string) => void;
  onSolveMath: () => void;
  timerOn: boolean;
  timerMs: number;
  toggleTimer: () => void;
}) {
  const buttons = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "="];
  const sci = ["sin", "cos", "tan", "log", "ln", "sqrt", "π", "e", "(", ")", "^"];

  const evaluate = () => {
    try {
      const pre = calcExpr
        .replace(/π/gi, "Math.PI")
        .replace(/\be\b/g, "Math.E")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/\^/g, "**");
      const result = Function("Math", `\"use strict\"; return (${pre});`)(Math);
      setCalcResult(String(result));
      return `${calcExpr} = ${result}`;
    } catch (err) {
      setCalcResult("Hata: ifade");
      setCalcError("Hatalı ifade, lütfen kontrol edin.");
      return null;
    }
  };

  if (!open) return null;
  return (
    <div className="fixed right-4 bottom-4 z-50 w-[300px] rounded-2xl border border-slate-200 shadow-2xl bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <div className="text-sm font-semibold">Yardımcı Araçlar</div>
        <button className="text-sm text-slate-500" onClick={onClose}>×</button>
      </div>
      <div className="p-3 space-y-3">
        <div className="rounded-xl border border-slate-200 p-2 bg-slate-50">
          <div className="text-xs text-slate-500 mb-1">Hesap Makinesi</div>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="(5+3)*2"
            value={calcExpr}
            onChange={(e) => setCalcExpr(e.target.value)}
          />
          <div className="grid grid-cols-7 gap-1 mt-2">
            {sci.map((b) => (
              <button
                key={b}
                className="rounded-lg border border-slate-200 bg-white text-xs py-1.5"
                onClick={() =>
                  setCalcExpr((prev) =>
                    prev +
                    (["sin", "cos", "tan", "log", "ln", "sqrt"].includes(b) ? `${b}(` : b)
                  )
                }
              >
                {b}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 mt-2">
            {buttons.map((b) => (
              <button
                key={b}
                className="rounded-lg border border-slate-200 bg-white text-sm py-2"
                onClick={() => {
                  if (b === "=") evaluate();
                  else setCalcExpr((prev) => prev + b);
                }}
              >
                {b}
              </button>
            ))}
            <button className="col-span-2 rounded-lg border border-slate-200 bg-rose-50 text-rose-700 py-2" onClick={() => { setCalcExpr(""); setCalcResult(null); }}>C</button>
            <button className="col-span-2 rounded-lg border border-slate-200 bg-emerald-50 text-emerald-700 py-2" onClick={() => {
              const text = calcResult ?? evaluate();
              if (text) onCalcToBoard(text);
            }}>Tahtaya Aktar</button>
          </div>
          {calcResult ? <div className="text-xs text-slate-700 mt-2">Sonuç: {calcResult}</div> : null}
        </div>
        <div className="flex gap-2 text-xs">
          <button className="flex-1 rounded-lg border border-slate-200 py-2 bg-white" onClick={toggleTimer}>
            ⏱️ {timerOn ? "Durdur" : "Başlat"} ({Math.floor(timerMs / 1000)}s)
          </button>
          <button className="flex-1 rounded-lg border border-slate-200 py-2 bg-white" onClick={onSolveMath}>🧮 AI Hesap</button>
        </div>
      </div>
    </div>
  );
}

function CalculatorPanel({
  expr,
  result,
  setExpr,
  setResult,
  onClose,
  onEval,
  onPush,
}: {
  expr: string;
  result: string | null;
  setExpr: (v: string | ((prev: string) => string)) => void;
  setResult: (v: string | null) => void;
  onClose: () => void;
  onEval: () => void;
  onPush: () => void;
}) {
  const sci = ["sin", "cos", "tan", "log", "ln", "sqrt", "π", "e", "(", ")", "^"];
  const digits = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+", "="];
  return (
    <div className="fixed left-28 bottom-4 z-50 w-[360px] rounded-2xl border border-amber-500/60 bg-slate-900/95 text-slate-50 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/30">
        <div className="font-semibold text-sm">Bilimsel Hesap</div>
        <button className="text-slate-300 hover:text-white" onClick={onClose}>✕</button>
      </div>
      <div className="p-4 space-y-3">
        <input
          className="w-full rounded-xl border border-amber-500/30 bg-slate-800 px-3 py-2 text-sm"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="(5+sin(30))^2"
        />
        <div className="grid grid-cols-6 gap-1">
          {sci.map((b) => (
            <button
              key={b}
              className="rounded-lg bg-slate-800 border border-amber-500/20 py-2 text-xs"
              onClick={() => setExpr((p) => p + (["sin", "cos", "tan", "log", "ln", "sqrt"].includes(b) ? `${b}(` : b))}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-lg bg-rose-900/70 border border-rose-500/40 py-2 text-sm"
            onClick={() => {
              setExpr("");
              setResult(null);
            }}
          >
            Temizle
          </button>
          <button
            className="rounded-lg bg-emerald-900/70 border border-emerald-500/40 py-2 text-sm"
            onClick={onEval}
          >
            Hesapla
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {digits.map((d) => (
            <button
              key={d}
              className="rounded-lg bg-slate-800 border border-amber-500/20 py-2 text-sm"
              onClick={() => {
                if (d === "=") onEval();
                else setExpr((p) => p + d);
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          className="w-full rounded-lg bg-amber-900/70 border border-amber-500/40 py-2 text-sm"
          onClick={onPush}
        >
          Tahtaya Aktar
        </button>
        {result ? <div className="text-xs text-emerald-200">Sonuç: {result}</div> : null}
      </div>
    </div>
  );
}

function DraggablePip({ visible, videoRef, initial }: { visible: boolean; videoRef: React.RefObject<HTMLVideoElement>; initial: { x: number; y: number } }) {
  const [pos, setPos] = useState(initial);
  const [big, setBig] = useState(false);
  const [z, setZ] = useState(50);
  const dragging = useRef(false);
  const start = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  if (!visible) return null;
  return (
    <div
      className="fixed cursor-move"
      style={{ left: pos.x, bottom: pos.y, zIndex: z }}
      onMouseDown={(e) => {
        dragging.current = true;
        start.current = { x: e.clientX - pos.x, y: e.clientY + pos.y };
        const move = (ev: MouseEvent) => {
          if (!dragging.current) return;
          setPos({ x: ev.clientX - start.current.x, y: -(ev.clientY - start.current.y) });
        };
        const up = () => {
          dragging.current = false;
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      onClick={() => setZ((v) => v + 1)}
    >
      <video
        ref={videoRef}
        className={`rounded-xl border border-amber-400/60 bg-black object-cover shadow-lg transition-all duration-200 ${big ? "w-60 h-40" : "w-32 h-24"}`}
        autoPlay
        muted
        playsInline
        onDoubleClick={() => setBig((v) => !v)}
      />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button className="text-sm text-slate-500" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
