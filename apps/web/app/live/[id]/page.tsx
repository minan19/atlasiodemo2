"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "../../api/client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { WhiteboardCanvas } from "../WhiteboardCanvas";
import useSWRImmutable from "swr/immutable";
import { useI18n } from "../../_i18n/use-i18n";

// ─── Types ───────────────────────────────────────────────────────────────────

type JoinResponse = {
  sessionId: string;
  role: string;
  whiteboardSessionId: string;
  meetingUrl?: string;
  classCode?: string;
  language?: string;
  targetLevel?: string;
};

type WbAction = {
  sessionId: string;
  userId?: string;
  type: string;
  payload: any;
};

type Participant = {
  id: string;
  name: string;
  initials: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  online: boolean;
  avatarColor: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  initials: string;
  text: string;
  time: string;
  isSystem: boolean;
  avatarColor: string;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PARTICIPANTS: Participant[] = [
  { id: "1", name: "Ahmet Yılmaz", initials: "AY", role: "INSTRUCTOR", micOn: true,  camOn: true,  handRaised: false, online: true,  avatarColor: "linear-gradient(135deg,#10a97b,#2d7df6)" },
  { id: "2", name: "Zeynep Kaya",  initials: "ZK", role: "STUDENT",    micOn: false, camOn: true,  handRaised: true,  online: true,  avatarColor: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  { id: "3", name: "Mert Demir",   initials: "MD", role: "STUDENT",    micOn: true,  camOn: false, handRaised: false, online: true,  avatarColor: "linear-gradient(135deg,#8b5cf6,#2d7df6)" },
  { id: "4", name: "Selin Arslan", initials: "SA", role: "STUDENT",    micOn: false, camOn: false, handRaised: false, online: false, avatarColor: "linear-gradient(135deg,#ec4899,#f59e0b)" },
  { id: "5", name: "Admin",        initials: "AD", role: "ADMIN",      micOn: true,  camOn: true,  handRaised: false, online: true,  avatarColor: "linear-gradient(135deg,#ef4444,#f59e0b)" },
];

const DEMO_MESSAGES: ChatMessage[] = [
  { id: "s1", sender: "",         initials: "", text: "Zeynep Kaya derse katıldı",       time: "14:00", isSystem: true,  avatarColor: "" },
  { id: "m1", sender: "Ahmet Y.", initials: "AY", text: "Herkese merhaba! Bugün vektörler konusunu işleyeceğiz.", time: "14:01", isSystem: false, avatarColor: "linear-gradient(135deg,#10a97b,#2d7df6)" },
  { id: "m2", sender: "Zeynep K.", initials: "ZK", text: "Hocam, soru sormak için elimizi kaldırmamız yeterli mi?", time: "14:02", isSystem: false, avatarColor: "linear-gradient(135deg,#f59e0b,#ef4444)" },
];

const EMOJIS = ["👍", "❤️", "😊", "🔥", "👏", "🎉"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: Participant["role"]): React.CSSProperties {
  if (role === "ADMIN")      return { background: "rgba(239,68,68,0.15)",   color: "#ef4444",   border: "1px solid rgba(239,68,68,0.3)" };
  if (role === "INSTRUCTOR") return { background: "rgba(16,169,123,0.15)",  color: "#10a97b",   border: "1px solid rgba(16,169,123,0.3)" };
  return                            { background: "rgba(45,125,246,0.12)",  color: "#2d7df6",   border: "1px solid rgba(45,125,246,0.25)" };
}

function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const t = useI18n();
  const params       = useParams();
  const router       = useRouter();
  const search       = useSearchParams();
  const sessionId    = params?.id as string;

  // ── Existing socket/whiteboard state ──
  const [socket,    setSocket]    = useState<Socket | null>(null);
  const [joined,    setJoined]    = useState(false);
  const [actions,   setActions]   = useState<WbAction[]>([]);
  const [role,      setRole]      = useState<string>();
  const [meetingUrl,setMeetingUrl]= useState<string>();
  const [classCode, setClassCode] = useState<string>();
  const [targetLevel,setTargetLevel] = useState<string>();
  const [wbSocket,  setWbSocket]  = useState<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);

  // ── New UI state ──
  const [isMicOn,      setIsMicOn]      = useState(true);
  const [isCamOn,      setIsCamOn]      = useState(false);
  const [camError,     setCamError]     = useState<string | null>(null);
  const [isSharing,    setIsSharing]    = useState(false);
  const [isRecording,  setIsRecording]  = useState(false);
  const [handRaised,   setHandRaised]   = useState(false);
  const [handQueue,    setHandQueue]    = useState<{ id: string; name: string; time: string }[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [chatInput,    setChatInput]    = useState("");
  const [showEmojis,   setShowEmojis]   = useState(false);
  const [messages,     setMessages]     = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── View mode (Board / Camera / Hybrid) ──
  const [viewMode, setViewMode] = useState<"board" | "camera" | "hybrid">("board");

  // ── Right panel tabs ──
  const [rightTab, setRightTab] = useState<"chat" | "notes" | "poll" | "calc">("chat");

  // ── Whiteboard pages ──
  const [pages,       setPages]       = useState<number[]>([1]);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Student notes ──
  const [notes, setNotes] = useState("");

  // ── Poll ──
  type PollOption = { id: string; label: string };
  const [pollActive,   setPollActive]   = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions,  setPollOptions]  = useState<PollOption[]>([
    { id: "a", label: "" }, { id: "b", label: "" },
  ]);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [myVote,    setMyVote]    = useState<string | null>(null);
  const [newPollQ,  setNewPollQ]  = useState("");
  const [newPollOpts, setNewPollOpts] = useState("Seçenek A\nSeçenek B\nSeçenek C");

  // ── Calculator ──
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcMemory, setCalcMemory] = useState(0);
  const [calcMode, setCalcMode] = useState<"basic" | "scientific" | "graph" | "matrix" | "equation" | "stats">("basic");
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  // Graph calculator
  const [graphExpr, setGraphExpr] = useState("Math.sin(x)");
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Matrix calculator
  const [matA, setMatA] = useState([["1","0"],["0","1"]]);
  const [matB, setMatB] = useState([["1","0"],["0","1"]]);
  const [matResult, setMatResult] = useState<string[][] | null>(null);
  // Equation solver
  const [eqInput, setEqInput] = useState("2x + 3 = 7");
  const [eqResult, setEqResult] = useState("");
  // Stats calculator
  const [statsData, setStatsData] = useState("10, 20, 30, 40, 50");
  const [statsResult, setStatsResult] = useState<Record<string, string>>({});

  const calcInput = (val: string) => {
    setCalcDisplay((d) => (d === "0" || d === "Error" ? val : d + val));
  };
  const calcOp = (op: string) => {
    setCalcDisplay((d) => d + " " + op + " ");
  };
  const calcEval = () => {
    try {
      const expr = calcDisplay
        .replace(/×/g, "*").replace(/÷/g, "/")
        .replace(/π/g, String(Math.PI))
        .replace(/e(?![x])/g, String(Math.E))
        .replace(/sin\(/g, "Math.sin(").replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(").replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(").replace(/√\(/g, "Math.sqrt(")
        .replace(/\^/g, "**");
      // eslint-disable-next-line no-eval
      const result = new Function(`return (${expr})`)() as number;
      const resultStr = Number.isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : "Error";
      setCalcHistory((h) => [...h.slice(-9), `${calcDisplay} = ${resultStr}`]);
      setCalcDisplay(resultStr);
    } catch {
      setCalcDisplay("Error");
    }
  };
  const calcClear = () => setCalcDisplay("0");

  // Graph draw
  const drawGraph = useCallback(() => {
    const cv = graphCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const w = cv.width; const h = cv.height;
    ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, w, h);
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 10, 0); ctx.lineTo(i * w / 10, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * h / 10); ctx.lineTo(w, i * h / 10); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    // Plot
    ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2;
    ctx.beginPath();
    const rangeX = 12;
    let first = true;
    for (let px = 0; px < w; px++) {
      const x = (px - w / 2) / (w / rangeX);
      try {
        // eslint-disable-next-line no-new-func
        const y = new Function("x", `return ${graphExpr}`)(x) as number;
        if (!Number.isFinite(y)) { first = true; continue; }
        const py = h / 2 - y * (h / rangeX);
        if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
      } catch { first = true; }
    }
    ctx.stroke();
    // Labels
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px monospace";
    ctx.fillText("x", w - 12, h / 2 + 12); ctx.fillText("y", w / 2 + 6, 12);
    ctx.fillText(`f(x) = ${graphExpr}`, 6, 14);
  }, [graphExpr]);

  useEffect(() => { if (calcMode === "graph") drawGraph(); }, [calcMode, drawGraph]);

  // Matrix operations
  const matMul = () => {
    const n = matA.length;
    const res = Array.from({ length: n }, () => Array.from({ length: n }, () => "0"));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += (parseFloat(matA[i][k]) || 0) * (parseFloat(matB[k][j]) || 0);
      res[i][j] = String(Math.round(s * 1e8) / 1e8);
    }
    setMatResult(res);
  };
  const matAdd = () => {
    const n = matA.length;
    setMatResult(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => String((parseFloat(matA[i][j]) || 0) + (parseFloat(matB[i][j]) || 0)))));
  };
  const matDet = () => {
    const a = matA.map((r) => r.map((c) => parseFloat(c) || 0));
    if (a.length === 2) {
      setCalcDisplay(`det = ${a[0][0] * a[1][1] - a[0][1] * a[1][0]}`);
    } else {
      setCalcDisplay(`det: ${t.tr("sadece 2x2")}`);
    }
  };
  const matTranspose = () => {
    const n = matA.length;
    setMatResult(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => matA[j][i])));
  };

  // Equation solver (linear: ax + b = c)
  const solveEquation = () => {
    try {
      const eq = eqInput.replace(/\s/g, "");
      // Simple linear: ax+b=c or ax-b=c
      const m = eq.match(/^(-?\d*\.?\d*)x([+\-]\d+\.?\d*)=(-?\d+\.?\d*)$/);
      if (m) {
        const a = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : parseFloat(m[1]);
        const b = parseFloat(m[2]); const c = parseFloat(m[3]);
        const x = Math.round(((c - b) / a) * 1e8) / 1e8;
        setEqResult(`x = ${x}`);
        return;
      }
      // Quadratic: ax²+bx+c=0
      const q = eq.match(/^(-?\d*\.?\d*)x\^?2([+\-]\d*\.?\d*)x([+\-]\d+\.?\d*)=0$/);
      if (q) {
        const a = q[1] === "" || q[1] === "+" ? 1 : q[1] === "-" ? -1 : parseFloat(q[1]);
        const b = q[2] === "+" ? 1 : q[2] === "-" ? -1 : parseFloat(q[2]);
        const c = parseFloat(q[3]);
        const disc = b * b - 4 * a * c;
        if (disc < 0) { setEqResult(t.tr("Gerçek kök yok (Δ < 0)")); return; }
        const x1 = Math.round(((-b + Math.sqrt(disc)) / (2 * a)) * 1e6) / 1e6;
        const x2 = Math.round(((-b - Math.sqrt(disc)) / (2 * a)) * 1e6) / 1e6;
        setEqResult(disc === 0 ? `x = ${x1}` : `x₁ = ${x1}, x₂ = ${x2}`);
        return;
      }
      setEqResult(t.tr("Desteklenen format: ax+b=c veya ax²+bx+c=0"));
    } catch { setEqResult(t.tr("Hata")); }
  };

  // Statistics calculator
  const calcStats = () => {
    try {
      const nums = statsData.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
      if (nums.length === 0) { setStatsResult({ [t.tr("hata")]: t.tr("Geçerli sayı yok") }); return; }
      const n = nums.length;
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const sorted = [...nums].sort((a, b) => a - b);
      const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      const stdDev = Math.sqrt(variance);
      const min = sorted[0]; const max = sorted[n - 1];
      // Mode
      const freq: Record<number, number> = {};
      nums.forEach((v) => { freq[v] = (freq[v] ?? 0) + 1; });
      const maxFreq = Math.max(...Object.values(freq));
      const modes = Object.entries(freq).filter(([, f]) => f === maxFreq && f > 1).map(([v]) => v);
      const r = (v: number) => String(Math.round(v * 1e6) / 1e6);
      setStatsResult({
        "N": String(n), [t.tr("Toplam")]: r(sum), [t.tr("Ortalama")]: r(mean),
        [t.tr("Medyan")]: r(median), [t.tr("Mod")]: modes.length ? modes.join(", ") : "-",
        [t.tr("Min")]: r(min), [t.tr("Max")]: r(max), [t.tr("Aralık")]: r(max - min),
        [t.tr("Varyans")]: r(variance), [t.tr("Std Sapma")]: r(stdDev),
      });
    } catch { setStatsResult({ [t.tr("hata")]: t.tr("Hesaplama hatası") }); }
  };

  // ── Countdown Timer ──
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownTotal, setCountdownTotal] = useState(300); // seconds
  const [countdownLeft, setCountdownLeft] = useState(300);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = (secs: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdownTotal(secs);
    setCountdownLeft(secs);
    setCountdownActive(true);
    countdownRef.current = setInterval(() => {
      setCountdownLeft((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCountdownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdownActive(false);
  };

  // ── Breakout Rooms ──
  type BreakoutRoom = { id: string; name: string; members: string[] };
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [breakoutOpen, setBreakoutOpen] = useState(false);

  const createBreakoutRooms = (count: number) => {
    const onlineStudents = participants.filter((p) => p.online && p.role === "STUDENT");
    const rooms: BreakoutRoom[] = [];
    for (let i = 0; i < count; i++) {
      rooms.push({ id: String(i + 1), name: `Oda ${i + 1}`, members: [] });
    }
    onlineStudents.forEach((s, i) => {
      rooms[i % count].members.push(s.name);
    });
    setBreakoutRooms(rooms);
  };

  // ── AI Panels ──
  const [aiTab, setAiTab] = useState<"summary" | "quiz" | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiQuizzes, setAiQuizzes] = useState<{ q: string; opts: string[]; ans: number }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAiSummary = () => {
    setAiLoading(true);
    setAiTab("summary");
    // Placeholder — will connect to AI API
    setTimeout(() => {
      setAiSummary("📝 Ders Özeti (AI tarafından oluşturulacak)\n\n• Bu ders boyunca işlenen konuların yapay zeka destekli özeti burada görünecektir.\n• Tahta üzerindeki içerikler analiz edilecektir.\n• Öğrenci katılım verileri değerlendirilecektir.\n\n⚙️ AI motoru bağlandığında otomatik çalışacaktır.");
      setAiLoading(false);
    }, 1500);
  };

  const generateAiQuiz = () => {
    setAiLoading(true);
    setAiTab("quiz");
    // Placeholder — will connect to AI API
    setTimeout(() => {
      setAiQuizzes([
        { q: "Vektörlerin toplama işlemi hangi kurala göre yapılır?", opts: ["Paralelkenar kuralı", "Üçgen kuralı", "Her ikisi de", "Hiçbiri"], ans: 2 },
        { q: "Birim vektörün büyüklüğü nedir?", opts: ["0", "1", "2", "∞"], ans: 1 },
        { q: "İki vektörün skaler çarpımı neye eşittir?", opts: ["|A|·|B|·cosθ", "|A|·|B|·sinθ", "|A|+|B|", "|A|−|B|"], ans: 0 },
      ]);
      setAiLoading(false);
    }, 1500);
  };

  // ── Gamification ──
  const [showGamification, setShowGamification] = useState(false);
  const [studentPoints, setStudentPoints] = useState<Record<string, number>>(
    () => Object.fromEntries(DEMO_PARTICIPANTS.filter((p) => p.role === "STUDENT").map((p) => [p.id, Math.floor(Math.random() * 500) + 100]))
  );
  const [badges] = useState<{ id: string; icon: string; label: string; desc: string }[]>([
    { id: "b1", icon: "⭐", label: "İlk Katılım", desc: "İlk derse katıl" },
    { id: "b2", icon: "🏆", label: "Quiz Şampiyonu", desc: "3 quiz'de tam puan" },
    { id: "b3", icon: "💬", label: "Aktif Katılımcı", desc: "10+ mesaj gönder" },
    { id: "b4", icon: "🎯", label: "Hedef Vurucu", desc: "5 ardışık doğru cevap" },
    { id: "b5", icon: "🔥", label: "Seri Devam", desc: "5 gün üst üste katıl" },
    { id: "b6", icon: "🧠", label: "Bilgi Ustası", desc: "Tüm konuları tamamla" },
  ]);

  const awardPoint = (studentId: string, amount: number) => {
    setStudentPoints((prev) => ({ ...prev, [studentId]: (prev[studentId] ?? 0) + amount }));
  };

  // ── Student Analytics ──
  const [showAnalytics, setShowAnalytics] = useState(false);
  const analyticsData = useMemo(() => {
    return DEMO_PARTICIPANTS.filter((p) => p.role === "STUDENT").map((p) => ({
      ...p,
      participation: Math.floor(Math.random() * 40) + 60,
      attention: Math.floor(Math.random() * 30) + 70,
      quizScore: Math.floor(Math.random() * 40) + 60,
      chatCount: Math.floor(Math.random() * 15) + 2,
      handRaiseCount: Math.floor(Math.random() * 5),
      points: studentPoints[p.id] ?? 0,
    }));
  }, [studentPoints]);

  // ── Listening Lab ──
  const [showListeningLab, setShowListeningLab] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // ── Speaking Analysis ──
  const [showSpeaking, setShowSpeaking] = useState(false);
  const [spkText, setSpkText] = useState("The quick brown fox jumps over the lazy dog.");
  const [spkRecording, setSpkRecording] = useState(false);
  const [spkScore, setSpkScore] = useState<number | null>(null);
  const [spkFeedback, setSpkFeedback] = useState<string[]>([]);

  // ── Reading Tools ──
  const [showReading, setShowReading] = useState(false);
  const [readText, setReadText] = useState("Education is the most powerful weapon which you can use to change the world. — Nelson Mandela");
  const [readSpeed, setReadSpeed] = useState(1);
  const [readHighlight, setReadHighlight] = useState(-1);

  // ── Writing Analysis ──
  const [showWriting, setShowWriting] = useState(false);
  const [writeText, setWriteText] = useState("");
  const [writeStats, setWriteStats] = useState<Record<string, string>>({});

  // ── Attendance (Yoklama) ──
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<{ id: string; name: string; joinTime: string; present: boolean }[]>(
    () => DEMO_PARTICIPANTS.filter((p) => p.online).map((p) => ({
      id: p.id, name: p.name, joinTime: nowTime(), present: true,
    }))
  );

  // ── LMS (Ödev, Not, İlerleme) ──
  const [showLms, setShowLms] = useState(false);
  const [lmsTab, setLmsTab] = useState<"assignments" | "grades" | "progress">("assignments");
  const [assignments] = useState([
    { id: "1", title: "Matematik Ödev 3", due: "2026-03-20", status: "pending" as const, grade: null as number | null },
    { id: "2", title: "Fizik Lab Raporu", due: "2026-03-18", status: "submitted" as const, grade: 85 },
    { id: "3", title: "İngilizce Essay", due: "2026-03-15", status: "graded" as const, grade: 92 },
    { id: "4", title: "Tarih Sunumu", due: "2026-03-22", status: "pending" as const, grade: null },
  ]);
  const [progressData] = useState([
    { subject: "Matematik", progress: 72, grade: 78 },
    { subject: "Fizik", progress: 65, grade: 82 },
    { subject: "İngilizce", progress: 88, grade: 91 },
    { subject: "Tarih", progress: 45, grade: 74 },
    { subject: "Kimya", progress: 58, grade: 69 },
  ]);

  // ── 3D/XR Simulation ──
  const [showXR, setShowXR] = useState(false);
  const [xrScene, setXrScene] = useState<"solar" | "cell" | "molecule" | "volcano">("solar");

  // ── IoT Classroom ──
  const [showIoT, setShowIoT] = useState(false);
  const [iotLights, setIotLights] = useState(80);
  const [iotTemp, setIotTemp] = useState(22);
  const [iotAirQuality, setIotAirQuality] = useState(92);
  const [iotProjector, setIotProjector] = useState(true);
  const [iotBlinds, setIotBlinds] = useState(50);

  // ── Cloud / Archive ──
  const [showCloud, setShowCloud] = useState(false);
  const [cloudTab, setCloudTab] = useState<"files" | "archive" | "sync">("files");
  const [cloudFiles] = useState([
    { id: "1", name: "Matematik_Ders5.pdf", type: "pdf" as const, size: "2.4 MB", date: "2026-03-15" },
    { id: "2", name: "Fizik_Lab_Video.mp4", type: "video" as const, size: "45 MB", date: "2026-03-14" },
    { id: "3", name: "İngilizce_Kelimeler.pptx", type: "pptx" as const, size: "1.8 MB", date: "2026-03-13" },
    { id: "4", name: "Tarih_Sunumu.pdf", type: "pdf" as const, size: "5.1 MB", date: "2026-03-12" },
    { id: "5", name: "Kimya_Deney.docx", type: "doc" as const, size: "320 KB", date: "2026-03-11" },
  ]);
  const [archivedLessons] = useState([
    { id: "a1", title: "Matematik - Türevler", date: "2026-03-14", duration: "45 dk", participants: 28 },
    { id: "a2", title: "Fizik - Newton Yasaları", date: "2026-03-13", duration: "40 dk", participants: 25 },
    { id: "a3", title: "İngilizce - Past Tense", date: "2026-03-12", duration: "35 dk", participants: 30 },
  ]);

  // ── Screen Recording ──
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ── Translation / Subtitles ──
  const [showTranslation, setShowTranslation] = useState(false);
  const [transLang, setTransLang] = useState("en");
  const [transText, setTransText] = useState("");
  const [transResult, setTransResult] = useState("");

  const addPage = () => {
    const next = (pages[pages.length - 1] ?? 0) + 1;
    setPages((p) => [...p, next]);
    setCurrentPage(next);
  };

  const launchPoll = () => {
    if (!newPollQ.trim()) return;
    const opts: PollOption[] = newPollOpts
      .split("\n")
      .map((s, i) => ({ id: String.fromCharCode(97 + i), label: s.trim() }))
      .filter((o) => o.label);
    setPollQuestion(newPollQ.trim());
    setPollOptions(opts);
    setPollVotes({});
    setMyVote(null);
    setPollActive(true);
  };

  const vote = (optId: string) => {
    if (myVote) return;
    setMyVote(optId);
    setPollVotes((prev) => ({ ...prev, [optId]: (prev[optId] ?? 0) + 1 }));
  };

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  // ── SWR ──
  const { data: joinData, error } = useSWR<JoinResponse>(
    sessionId ? `/live/sessions/${sessionId}/join` : null,
    api,
    { revalidateOnFocus: false },
  );

  const { data: snapshot } = useSWRImmutable(
    joinData ? `/whiteboard/${joinData.whiteboardSessionId}/snapshot` : null,
    api,
  );

  // ── Timer ──
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Socket init ──
  useEffect(() => {
    if (joinData && !socket) {
      tokenRef.current = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      setRole(joinData.role);
      setMeetingUrl(joinData.meetingUrl);
      setClassCode(joinData.classCode ?? search?.get("classCode") ?? undefined);
      setTargetLevel(joinData.targetLevel ?? undefined);

      const s = io(process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100", {
        path: "/socket.io",
        transports: ["websocket"],
        withCredentials: true,
        auth: tokenRef.current ? { token: tokenRef.current } : undefined,
      });
      setSocket(s as any);

      const wb = io(`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100"}/whiteboard`, {
        path: "/socket.io",
        transports: ["websocket"],
        withCredentials: true,
        auth: tokenRef.current ? { token: tokenRef.current } : undefined,
      });
      setWbSocket(wb as any);
    }
  }, [joinData, socket, search]);

  useEffect(() => {
    if (!wbSocket || !joinData) return;
    wbSocket.emit("join", { sessionId: joinData.whiteboardSessionId, userId: "me" });
    wbSocket.on("joined", () => setJoined(true));
    wbSocket.on("action", (a: WbAction) => setActions((prev) => [...prev, a]));
    return () => {
      wbSocket.off("joined");
      wbSocket.off("action");
      wbSocket.disconnect();
    };
  }, [wbSocket, joinData]);

  // ── Scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Camera (getUserMedia) ──
  // Toggling `isCamOn` requests/releases the device camera. Stream is held in
  // a ref (not state) so re-renders don't dispose it; the <video> element is
  // wired in the camera view below via `videoRef`.
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setCamError(null);
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("Bu tarayıcı kamera erişimini desteklemiyor.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false, // mic is handled by isMicOn separately
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Some browsers need an explicit play() call after srcObject
          videoRef.current.play().catch(() => {/* autoplay restrictions */});
        }
      } catch (err) {
        const e = err as { name?: string; message?: string };
        let msg = e?.message || "Kamera açılamadı.";
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
          msg = "Kamera izni reddedildi. Tarayıcı ayarlarından izin verin.";
        } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
          msg = "Kullanılabilir kamera cihazı bulunamadı.";
        } else if (e?.name === "NotReadableError" || e?.name === "TrackStartError") {
          msg = "Kamera başka bir uygulama tarafından kullanılıyor.";
        }
        if (!cancelled) {
          setCamError(msg);
          setIsCamOn(false);
        }
      }
    };

    const stop = () => {
      const s = cameraStreamRef.current;
      if (s) {
        s.getTracks().forEach((tr) => tr.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isCamOn) {
      start();
    } else {
      stop();
    }

    return () => {
      cancelled = true;
    };
  }, [isCamOn]);

  // Cleanup on unmount: ensure camera tracks are released even if the user
  // navigates away while the camera is still on.
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      cameraStreamRef.current = null;
    };
  }, []);

  const canWrite = useMemo(() => role === "ADMIN" || role === "INSTRUCTOR", [role]);

  // ── Chat send ──
  const sendMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id:          Date.now().toString(),
      sender:      "Ben",
      initials:    "BN",
      text,
      time:        nowTime(),
      isSystem:    false,
      avatarColor: "linear-gradient(135deg,#10a97b,#2d7df6)",
    };
    setMessages((prev) => [...prev, msg]);
    setChatInput("");
    setShowEmojis(false);
  }, [chatInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ─── Demo / Error layout ──────────────────────────────────────────────────

  const isDemo = !!error;
  const sessionTitle = joinData ? `Canlı Ders #${sessionId?.slice(-4) ?? "—"}` : "Demo Canlı Ders";
  const participantCount = participants.filter((p) => p.online).length;

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (!joinData && !error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, color: "var(--muted)" }}>
        <div className="loading-dots"><span /><span /><span /></div>
        <span style={{ fontSize: 14 }}>{t.tr("Derse bağlanıyor…")}</span>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header className="glass" style={{ margin: "8px 8px 0", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, borderRadius: "var(--r-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="back-btn"
            onClick={() => router.back()}
          >
            {t.tr("← Geri")}
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{sessionTitle}</span>
              {isDemo && (
                <span className="pill pill-sm" style={{ background: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)", color: "#f59e0b", fontSize: 10 }}>DEMO</span>
              )}
              {/* Live badge */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--r-full)", padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#ef4444" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "statusPulse 1.5s ease-in-out infinite" }} />
                CANLI
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {role && <span style={{ marginRight: 8 }}>{t.tr("Rol:")}: <strong style={{ color: "var(--ink-2)" }}>{role}</strong></span>}
              {classCode && <span style={{ marginRight: 8 }}>{t.tr("Kod:")}: {classCode}</span>}
              {targetLevel && <span>{t.tr("Seviye:")}: {targetLevel}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View mode switcher */}
          <div style={{ display: "flex", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", overflow: "hidden" }}>
            {(["board", "hybrid", "camera"] as const).map((m) => {
              const icons: Record<string, string> = { board: "🖊", hybrid: "📐", camera: "🎥" };
              const labels: Record<string, string> = { board: t.tr("Tahta"), hybrid: t.tr("Hibrit"), camera: t.tr("Kamera") };
              return (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  title={labels[m]}
                  style={{
                    padding: "3px 8px", fontSize: 10, border: "none", cursor: "pointer",
                    background: viewMode === m ? "var(--accent-soft)" : "var(--panel)",
                    color: viewMode === m ? "var(--accent)" : "var(--muted)",
                    fontWeight: viewMode === m ? 700 : 500,
                    borderRight: m !== "camera" ? "1px solid var(--line)" : undefined,
                  }}
                >
                  {icons[m]} {labels[m]}
                </button>
              );
            })}
          </div>
          {/* Participant count */}
          <span className="pill pill-sm" style={{ gap: 5 }}>
            <span className="status-dot online" style={{ width: 6, height: 6 }} />
            {participantCount} {t.tr("katılımcı")}
          </span>
          {/* Timer */}
          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))", borderRadius: "var(--r-sm)", padding: "3px 10px" }}>
            {formatTimer(elapsed)}
          </span>

          {/* Countdown timer */}
          {canWrite && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {countdownActive ? (
                <button
                  onClick={stopCountdown}
                  style={{
                    fontFamily: "monospace", fontSize: 12, fontWeight: 700,
                    color: countdownLeft < 30 ? "#ef4444" : "#f59e0b",
                    background: countdownLeft < 30 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${countdownLeft < 30 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                    borderRadius: "var(--r-sm)", padding: "3px 8px", cursor: "pointer",
                    animation: countdownLeft < 10 ? "statusPulse 0.5s ease-in-out infinite" : undefined,
                  }}
                >
                  ⏱ {formatTimer(countdownLeft)}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 2 }}>
                  {[60, 180, 300, 600].map((s) => (
                    <button key={s} onClick={() => startCountdown(s)} style={{
                      padding: "3px 6px", fontSize: 9, fontWeight: 600,
                      borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                      background: "var(--panel)", color: "var(--muted)", cursor: "pointer",
                    }}>
                      ⏱{s < 60 ? `${s}s` : `${s / 60}dk`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {meetingUrl && (
            <Link href={meetingUrl} target="_blank" className="btn-link" style={{ fontSize: 12, padding: "6px 12px" }}>
              {t.tr("🎥 Canlı Yayın")}
            </Link>
          )}
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr 280px", gap: 8, padding: "8px", minHeight: 0, overflow: "hidden" }}>

        {/* ── LEFT: Participants ── */}
        <aside className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "var(--r-lg)" }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{t.tr("Katılımcılar")}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{participantCount} {t.tr("çevrimiçi")}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {participants.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 8px",
                  borderRadius: "var(--r-md)", transition: "background var(--t-fast)",
                  background: p.online ? "color-mix(in srgb,var(--panel) 60%,transparent)" : "transparent",
                  opacity: p.online ? 1 : 0.5,
                }}
              >
                {/* Avatar */}
                <div
                  className={`avatar avatar-sm ${p.online ? "avatar-online" : ""}`}
                  style={{ background: p.avatarColor, color: "#fff", fontSize: 10, flexShrink: 0 }}
                >
                  {p.initials}
                  {p.handRaised && (
                    <span style={{ position: "absolute", top: -6, right: -6, fontSize: 12 }}>✋</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.tr(p.name)}</div>
                  <div>
                    <span style={{ ...roleBadgeStyle(p.role), borderRadius: "var(--r-full)", fontSize: 9, fontWeight: 700, padding: "1px 6px", display: "inline-block", letterSpacing: "0.04em" }}>
                      {p.role}
                    </span>
                  </div>
                </div>

                {/* Mic/Cam icons */}
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, opacity: p.micOn ? 1 : 0.4 }} title={p.micOn ? t.tr("Mikrofon açık") : t.tr("Mikrofon kapalı")}>
                    {p.micOn ? "🎤" : "🔇"}
                  </span>
                  <span style={{ fontSize: 11, opacity: p.camOn ? 1 : 0.4 }} title={p.camOn ? t.tr("Kamera açık") : t.tr("Kamera kapalı")}>
                    {p.camOn ? "📷" : "🚫"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance (Yoklama) */}
          {canWrite && (
            <div style={{ borderTop: "1px solid var(--line)", flexShrink: 0 }}>
              <button
                onClick={() => setAttendanceOpen((v) => !v)}
                style={{
                  width: "100%", padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  color: "var(--ink)", background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span>{t.tr("📋 Yoklama")}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>
                  {attendanceRecords.filter((r) => r.present).length}/{attendanceRecords.length} {attendanceOpen ? "▲" : "▼"}
                </span>
              </button>
              {attendanceOpen && (
                <div style={{ padding: "4px 10px 10px", display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                  {attendanceRecords.map((r) => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                      <button
                        onClick={() => setAttendanceRecords((recs) => recs.map((rec) => rec.id === r.id ? { ...rec, present: !rec.present } : rec))}
                        style={{
                          width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                          border: "1px solid var(--line)", cursor: "pointer",
                          background: r.present ? "var(--accent)" : "var(--panel)",
                          color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >{r.present ? "✓" : ""}</button>
                      <span style={{ flex: 1, color: "var(--ink)" }}>{t.tr(r.name)}</span>
                      <span style={{ fontSize: 9, color: "var(--muted)" }}>{r.joinTime}</span>
                    </div>
                  ))}
                  {/* Download attendance */}
                  <button
                    onClick={() => {
                      const csv = "İsim,Katılım,Saat\n" + attendanceRecords.map((r) => `${t.tr(r.name)},${r.present ? "Var" : "Yok"},${r.joinTime}`).join("\n");
                      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                      a.download = `yoklama-${nowTime().replace(":", "-")}.csv`; a.click();
                    }}
                    style={{ fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontWeight: 600, marginTop: 4 }}
                  >
                    {t.tr("⬇️ CSV indir")}
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── CENTER: Whiteboard + Camera views ── */}
        <main style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, gap: 6 }}>

          {/* Camera view (shown in camera & hybrid modes) */}
          {(viewMode === "camera" || viewMode === "hybrid") && (
            <div className="glass" style={{
              height: viewMode === "camera" ? "100%" : 160,
              flexShrink: viewMode === "camera" ? 1 : 0,
              borderRadius: "var(--r-lg)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
              position: "relative",
            }}>
              {/* Live local camera stream — visible whenever the camera is on.
                  videoRef is wired by the getUserMedia effect above. */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  // Mirror local preview so it feels like a mirror, like every
                  // other video conferencing app.
                  transform: "scaleX(-1)",
                  display: isCamOn && !camError ? "block" : "none",
                }}
              />
              {/* Placeholder shown when camera is off or unavailable */}
              {(!isCamOn || camError) && (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "0 16px" }}>
                  <div style={{ fontSize: viewMode === "camera" ? 48 : 28, marginBottom: 6 }}>
                    {camError ? "⚠️" : "🎥"}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t.tr("Eğitmen Kamerası")}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, lineHeight: 1.5 }}>
                    {camError
                      ? t.tr(camError)
                      : t.tr("Kamera kapalı")}
                  </div>
                  {camError && (
                    <button
                      onClick={() => { setCamError(null); setIsCamOn(true); }}
                      style={{
                        marginTop: 10, padding: "6px 12px", fontSize: 11, fontWeight: 600,
                        borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer",
                      }}
                    >
                      {t.tr("Tekrar Dene")}
                    </button>
                  )}
                </div>
              )}
              {/* Participant mini-cams */}
              {viewMode === "camera" && (
                <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 6 }}>
                  {participants.filter((p) => p.online && p.camOn).slice(0, 4).map((p) => (
                    <div key={p.id} style={{
                      width: 56, height: 42, borderRadius: 6,
                      background: p.avatarColor, border: "2px solid rgba(255,255,255,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 10, fontWeight: 700,
                    }}>{p.initials}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Whiteboard (shown in board & hybrid modes) */}
          {(viewMode === "board" || viewMode === "hybrid") && (
          <div className="glass" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "var(--r-lg)" }}>

            {/* Header row */}
            <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
              {/* Title */}
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {t.tr("🖊 Akıllı Tahta")}
                {isDemo && <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>(demo)</span>}
              </div>

              {/* Page tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: 3, flex: 1, overflowX: "auto" }}>
                {pages.map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    style={{
                      padding: "3px 10px", fontSize: 11, fontWeight: currentPage === pg ? 700 : 500,
                      borderRadius: "var(--r-sm)", border: "1px solid",
                      borderColor: currentPage === pg ? "var(--accent)" : "var(--line)",
                      background: currentPage === pg ? "color-mix(in srgb,var(--accent) 12%,var(--panel))" : "var(--panel)",
                      color: currentPage === pg ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {pg}. {t.tr("Sayfa")}
                  </button>
                ))}
                {canWrite && (
                  <button
                    onClick={addPage}
                    title={t.tr("Yeni sayfa ekle")}
                    style={{
                      width: 24, height: 24, borderRadius: "var(--r-sm)",
                      border: "1px dashed var(--line)", background: "var(--panel)",
                      color: "var(--muted)", fontSize: 16, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >+</button>
                )}
              </div>

              {/* PDF export */}
              {canWrite && (
                <button
                  onClick={() => {
                    // Export current canvas as PDF via print-friendly approach
                    const canvas = document.querySelector("canvas");
                    if (!canvas) return;
                    const dataUrl = canvas.toDataURL("image/png");
                    const win = window.open("");
                    if (win) {
                      win.document.write(`<html><head><title>Tahta Sayfa ${currentPage}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff"><img src="${dataUrl}" style="max-width:100%;max-height:100vh" /></body></html>`);
                      win.document.close();
                      setTimeout(() => { win.print(); }, 300);
                    }
                  }}
                  title={t.tr("PDF olarak yazdır")}
                  style={{
                    padding: "3px 8px", fontSize: 10, fontWeight: 600,
                    borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                    background: "var(--panel)", color: "var(--muted)",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  📄 PDF
                </button>
              )}

              {/* Connection status */}
              <div style={{ fontSize: 11, color: joined ? "var(--accent)" : "var(--muted)", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                {joined
                  ? <><span className="status-dot online" style={{ width: 5, height: 5 }} /> {t.tr("Bağlı")}</>
                  : <><div className="loading-dots"><span /><span /></div> {t.tr("Bağlanıyor")}</>
                }
              </div>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              {wbSocket && joinData ? (
                <WhiteboardCanvas
                  key={`${joinData.whiteboardSessionId}-p${currentPage}`}
                  socket={wbSocket}
                  sessionId={`${joinData.whiteboardSessionId}-p${currentPage}`}
                  canWrite={canWrite}
                  initialActions={currentPage === 1 ? ((snapshot as any)?.actions ?? []) : []}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--muted)" }}>
                  <div style={{ fontSize: 48, opacity: 0.25 }}>🖊</div>
                  <div style={{ fontSize: 13 }}>{t.tr("Tahta")} {isDemo ? t.tr("demo modunda") : t.tr("bağlanıyor…")}</div>
                </div>
              )}
            </div>
          </div>
          )}
        </main>

        {/* ── RIGHT: Tabbed panel ── */}
        <aside className="glass" style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "var(--r-lg)" }}>

          {/* Tab headers */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            {(["chat", "notes", "poll", "calc"] as const).map((tab) => {
              const labels: Record<string, string> = { chat: t.tr("💬 Sohbet"), notes: t.tr("📝 Notlar"), poll: t.tr("📊 Anket"), calc: t.tr("🧮 Hesap") };
              return (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{
                    flex: 1, padding: "9px 4px", fontSize: 11, fontWeight: rightTab === tab ? 700 : 500,
                    border: "none", borderBottom: rightTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                    background: "transparent",
                    color: rightTab === tab ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer", transition: "color 0.15s",
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* ── Chat tab ── */}
          {rightTab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((msg) =>
                  msg.isSystem ? (
                    <div key={msg.id} style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", padding: "3px 8px", background: "var(--line-2)", borderRadius: "var(--r-full)" }}>
                      {t.tr(msg.text)}
                    </div>
                  ) : (
                    <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div className="avatar avatar-sm" style={{ background: msg.avatarColor, color: "#fff", fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                        {msg.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{msg.sender}</span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, background: "color-mix(in srgb,var(--panel) 70%,transparent)", border: "1px solid var(--line-2)", borderRadius: "0 var(--r-md) var(--r-md) var(--r-md)", padding: "6px 10px", wordBreak: "break-word" }}>
                          {t.tr(msg.text)}
                        </div>
                      </div>
                    </div>
                  )
                )}
                <div ref={chatEndRef} />
              </div>
              {showEmojis && (
                <div style={{ padding: "6px 12px", display: "flex", gap: 6, borderTop: "1px solid var(--line-2)", flexShrink: 0 }}>
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => setChatInput((v) => v + e)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "var(--r-sm)" }}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ padding: "8px 10px", borderTop: "1px solid var(--line)", display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                <button onClick={() => setShowEmojis((v) => !v)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", padding: "4px", opacity: showEmojis ? 1 : 0.6 }} title="Emoji">😊</button>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={t.tr("Mesaj yaz…")} style={{ flex: 1, fontSize: 12, padding: "7px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)", minWidth: 0 }} />
                <button onClick={sendMessage} disabled={!chatInput.trim()} className="btn-primary" style={{ padding: "7px 12px", fontSize: 12, flexShrink: 0 }}>↑</button>
              </div>
            </>
          )}

          {/* ── Notes tab ── */}
          {rightTab === "notes" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 10, gap: 8, minHeight: 0 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                {t.tr("Kişisel notlarınız — sadece siz görürsünüz.")}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.tr("Ders notlarını buraya yazın…")}
                style={{
                  flex: 1, resize: "none", fontSize: 12, lineHeight: 1.6,
                  padding: "10px", borderRadius: "var(--r-md)",
                  border: "1px solid var(--line)", background: "var(--panel)",
                  color: "var(--ink)", outline: "none", fontFamily: "inherit",
                }}
              />
              <button
                className="btn-link"
                style={{ fontSize: 11, alignSelf: "flex-end" }}
                onClick={() => {
                  const blob = new Blob([notes], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `ders-notlari-${nowTime().replace(":", "-")}.txt`;
                  a.click();
                }}
              >
                ⬇️ .txt indir
              </button>
            </div>
          )}

          {/* ── Poll tab ── */}
          {rightTab === "poll" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Active poll: vote UI */}
              {pollActive ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }}>{pollQuestion}</div>
                  {pollOptions.map((opt) => {
                    const pct = totalVotes > 0 ? Math.round(((pollVotes[opt.id] ?? 0) / totalVotes) * 100) : 0;
                    const isWinner = myVote !== null && pct === Math.max(...pollOptions.map((o) => totalVotes > 0 ? Math.round(((pollVotes[o.id] ?? 0) / totalVotes) * 100) : 0));
                    return (
                      <button
                        key={opt.id}
                        onClick={() => vote(opt.id)}
                        disabled={myVote !== null}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                          borderRadius: "var(--r-md)", textAlign: "left", cursor: myVote ? "default" : "pointer",
                          border: myVote === opt.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                          background: myVote === opt.id
                            ? "color-mix(in srgb,var(--accent) 10%,var(--panel))"
                            : "var(--panel)",
                          position: "relative", overflow: "hidden",
                        }}
                      >
                        {/* Progress bar */}
                        {myVote !== null && (
                          <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: "color-mix(in srgb,var(--accent) 8%,transparent)", transition: "width 0.4s" }} />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", minWidth: 16, zIndex: 1 }}>{opt.id.toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: "var(--ink)", flex: 1, zIndex: 1 }}>{t.tr(opt.label)}</span>
                        {myVote !== null && (
                          <span style={{ fontSize: 11, color: isWinner ? "var(--accent)" : "var(--muted)", fontWeight: 700, zIndex: 1 }}>{pct}%</span>
                        )}
                      </button>
                    );
                  })}
                  <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                    {myVote ? `${totalVotes} ${t.tr("oy")} — ${t.tr("Teşekkürler!")}` : t.tr("Seçeneğe tıklayarak oy verin.")}
                  </div>
                  {canWrite && (
                    <button className="btn-link" style={{ fontSize: 11 }} onClick={() => { setPollActive(false); setMyVote(null); setPollVotes({}); }}>
                      {t.tr("🗑 Anketi kapat")}
                    </button>
                  )}
                </div>
              ) : (
                /* Create poll (instructor) or waiting (student) */
                canWrite ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("Yeni Anket Oluştur")}</div>
                    <input
                      value={newPollQ}
                      onChange={(e) => setNewPollQ(e.target.value)}
                      placeholder={t.tr("Soru…")}
                      style={{ fontSize: 12, padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)", outline: "none" }}
                    />
                    <textarea
                      value={newPollOpts}
                      onChange={(e) => setNewPollOpts(e.target.value)}
                      rows={4}
                      placeholder={t.tr("Her satıra bir seçenek") + "\n" + t.tr("Seçenek A") + "\n" + t.tr("Seçenek B")}
                      style={{ fontSize: 12, padding: "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)", outline: "none", resize: "none", fontFamily: "inherit" }}
                    />
                    <button
                      className="btn-primary"
                      style={{ fontSize: 12, padding: "8px" }}
                      disabled={!newPollQ.trim()}
                      onClick={launchPoll}
                    >
                      {t.tr("🚀 Anketi Başlat")}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📊</div>
                    {t.tr("Eğitmen bir anket başlattığında burada görünecek.")}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Calculator tab ── */}
          {rightTab === "calc" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 10, gap: 6, minHeight: 0 }}>
              {/* Mode switch */}
              <div style={{ display: "flex", gap: 3, marginBottom: 2, flexWrap: "wrap" }}>
                {([
                  { k: "basic" as const, l: t.tr("Temel") }, { k: "scientific" as const, l: t.tr("Bilimsel") },
                  { k: "graph" as const, l: t.tr("📈 Grafik") }, { k: "matrix" as const, l: t.tr("⊞ Matris") },
                  { k: "equation" as const, l: t.tr("🔣 Denklem") }, { k: "stats" as const, l: t.tr("📊 İstatistik") },
                ]).map(({ k, l }) => (
                  <button key={k} onClick={() => setCalcMode(k)} style={{
                    flex: "1 0 30%", padding: "3px 2px", fontSize: 9, fontWeight: calcMode === k ? 700 : 500,
                    borderRadius: "var(--r-sm)", border: "1px solid",
                    borderColor: calcMode === k ? "var(--accent)" : "var(--line)",
                    background: calcMode === k ? "var(--accent-soft)" : "var(--panel)",
                    color: calcMode === k ? "var(--accent)" : "var(--muted)", cursor: "pointer",
                  }}>{l}</button>
                ))}
              </div>

              {/* Display - basic/scientific only */}
              {(calcMode === "basic" || calcMode === "scientific") && (
              <div style={{
                background: "rgba(15,23,42,0.95)", borderRadius: "var(--r-md)",
                padding: "10px 12px", textAlign: "right",
                fontFamily: "monospace", fontSize: 18, fontWeight: 700,
                color: "#10b981", minHeight: 48,
                overflow: "hidden", wordBreak: "break-all",
                border: "1px solid rgba(16,185,129,0.2)",
              }}>
                {calcDisplay}
              </div>
              )}

              {/* History */}
              {calcHistory.length > 0 && (calcMode === "basic" || calcMode === "scientific") && (
                <div style={{ maxHeight: 50, overflowY: "auto", fontSize: 9, color: "var(--muted)", fontFamily: "monospace", lineHeight: 1.6 }}>
                  {calcHistory.slice(-3).map((h, i) => <div key={i}>{h}</div>)}
                </div>
              )}

              {/* Scientific row */}
              {calcMode === "scientific" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
                  {["sin(", "cos(", "tan(", "log(", "ln(", "√(", "π", "e", "^", "(", ")"].map((b) => (
                    <button key={b} onClick={() => calcInput(b)} style={{
                      padding: "5px 2px", fontSize: 10, fontWeight: 600,
                      borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                      background: "color-mix(in srgb,var(--accent) 8%,var(--panel))",
                      color: "var(--accent)", cursor: "pointer",
                    }}>{b}</button>
                  ))}
                </div>
              )}

              {/* Basic buttons */}
              {(calcMode === "basic" || calcMode === "scientific") && <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, flex: 1 }}>
                {[
                  { l: "C", act: () => calcClear(), bg: "rgba(239,68,68,0.1)", c: "#ef4444" },
                  { l: "⌫", act: () => setCalcDisplay((d) => d.length > 1 ? d.slice(0, -1) : "0"), bg: "rgba(239,68,68,0.06)", c: "#ef4444" },
                  { l: "%", act: () => calcOp("%") },
                  { l: "÷", act: () => calcOp("÷"), bg: "rgba(59,130,246,0.1)", c: "#3b82f6" },
                  { l: "7", act: () => calcInput("7") },
                  { l: "8", act: () => calcInput("8") },
                  { l: "9", act: () => calcInput("9") },
                  { l: "×", act: () => calcOp("×"), bg: "rgba(59,130,246,0.1)", c: "#3b82f6" },
                  { l: "4", act: () => calcInput("4") },
                  { l: "5", act: () => calcInput("5") },
                  { l: "6", act: () => calcInput("6") },
                  { l: "−", act: () => calcOp("-"), bg: "rgba(59,130,246,0.1)", c: "#3b82f6" },
                  { l: "1", act: () => calcInput("1") },
                  { l: "2", act: () => calcInput("2") },
                  { l: "3", act: () => calcInput("3") },
                  { l: "+", act: () => calcOp("+"), bg: "rgba(59,130,246,0.1)", c: "#3b82f6" },
                  { l: "M+", act: () => { try { setCalcMemory(parseFloat(calcDisplay)); } catch { /* skip */ } }, bg: "rgba(139,92,246,0.08)", c: "#8b5cf6" },
                  { l: "0", act: () => calcInput("0") },
                  { l: ".", act: () => calcInput(".") },
                  { l: "=", act: () => calcEval(), bg: "linear-gradient(135deg,#10a97b,#2d7df6)", c: "#fff" },
                ].map((btn) => (
                  <button
                    key={btn.l}
                    onClick={btn.act}
                    style={{
                      padding: "8px 4px", fontSize: 13, fontWeight: 700,
                      borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                      background: btn.bg ?? "var(--panel)",
                      color: btn.c ?? "var(--ink)", cursor: "pointer",
                    }}
                  >{btn.l}</button>
                ))}
              </div>}

              {/* Memory display */}
              {calcMemory !== 0 && calcMode !== "graph" && calcMode !== "matrix" && calcMode !== "equation" && calcMode !== "stats" && (
                <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "right" }}>
                  M = {calcMemory}
                  <button onClick={() => { calcInput(String(calcMemory)); }} style={{ marginLeft: 6, fontSize: 9, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>MR</button>
                  <button onClick={() => setCalcMemory(0)} style={{ marginLeft: 4, fontSize: 9, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>MC</button>
                </div>
              )}

              {/* ── Graph Calculator ── */}
              {calcMode === "graph" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={graphExpr} onChange={(e) => setGraphExpr(e.target.value)}
                      placeholder="Math.sin(x)" style={{
                        flex: 1, padding: "4px 6px", fontSize: 10, fontFamily: "monospace",
                        border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
                        background: "var(--panel)", color: "var(--ink)",
                      }} />
                    <button onClick={drawGraph} style={{ padding: "4px 8px", fontSize: 10, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer" }}>{t.tr("Çiz")}</button>
                  </div>
                  <canvas ref={graphCanvasRef} width={240} height={180} style={{ width: "100%", height: "auto", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }} />
                  <div style={{ fontSize: 8, color: "var(--muted)" }}>
                    Örnekler: Math.sin(x), x**2, Math.sqrt(x), Math.abs(x), Math.tan(x)
                  </div>
                </div>
              )}

              {/* ── Matrix Calculator ── */}
              {calcMode === "matrix" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {/* Matrix A */}
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)" }}>{t.tr("Matris A")}</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${matA[0].length}, 1fr)`, gap: 2 }}>
                    {matA.flatMap((row, ri) => row.map((cell, ci) => (
                      <input key={`a${ri}${ci}`} value={cell} onChange={(e) => {
                        const m = matA.map((r) => [...r]); m[ri][ci] = e.target.value; setMatA(m);
                      }} style={{ width: "100%", padding: "3px", fontSize: 10, fontFamily: "monospace", textAlign: "center", border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)" }} />
                    )))}
                  </div>
                  {/* Matrix B */}
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)" }}>{t.tr("Matris B")}</div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${matB[0].length}, 1fr)`, gap: 2 }}>
                    {matB.flatMap((row, ri) => row.map((cell, ci) => (
                      <input key={`b${ri}${ci}`} value={cell} onChange={(e) => {
                        const m = matB.map((r) => [...r]); m[ri][ci] = e.target.value; setMatB(m);
                      }} style={{ width: "100%", padding: "3px", fontSize: 10, fontFamily: "monospace", textAlign: "center", border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)" }} />
                    )))}
                  </div>
                  {/* Operations */}
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {[
                      { l: "A × B", fn: matMul }, { l: "A + B", fn: matAdd },
                      { l: "det(A)", fn: matDet }, { l: "Aᵀ", fn: matTranspose },
                    ].map(({ l, fn }) => (
                      <button key={l} onClick={fn} style={{ flex: 1, padding: "4px", fontSize: 9, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer" }}>{l}</button>
                    ))}
                  </div>
                  {/* Result */}
                  {matResult && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#10b981", marginBottom: 2 }}>{t.tr("Sonuç")}</div>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${matResult[0].length}, 1fr)`, gap: 2 }}>
                        {matResult.flatMap((row, ri) => row.map((cell, ci) => (
                          <div key={`r${ri}${ci}`} style={{ padding: "3px", fontSize: 10, fontFamily: "monospace", textAlign: "center", background: "rgba(16,185,129,0.08)", borderRadius: 3, border: "1px solid rgba(16,185,129,0.15)", color: "#10b981" }}>{cell}</div>
                        )))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Equation Solver ── */}
              {calcMode === "equation" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>Lineer: ax+b=c &nbsp;|&nbsp; Kuadratik: ax²+bx+c=0</div>
                  <input value={eqInput} onChange={(e) => setEqInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") solveEquation(); }}
                    placeholder="2x+3=7" style={{
                      padding: "6px 8px", fontSize: 13, fontFamily: "monospace",
                      border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
                      background: "var(--panel)", color: "var(--ink)", textAlign: "center",
                    }} />
                  <button onClick={solveEquation} style={{ padding: "8px", fontSize: 12, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer" }}>{t.tr("Çöz")}</button>
                  {eqResult && (
                    <div style={{
                      padding: "10px", borderRadius: "var(--r-sm)",
                      background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)",
                      fontFamily: "monospace", fontSize: 16, fontWeight: 700,
                      color: "#10b981", textAlign: "center",
                    }}>{eqResult}</div>
                  )}
                  {/* Quick examples */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["2x+3=7", "3x-9=0", "x²-5x+6=0", "2x²+4x-6=0"].map((ex) => (
                      <button key={ex} onClick={() => setEqInput(ex)} style={{ padding: "3px 6px", fontSize: 8, border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--muted)", cursor: "pointer" }}>{ex}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Statistics Calculator ── */}
              {calcMode === "stats" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0 }}>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{t.tr("Sayıları virgülle ayırın")}</div>
                  <textarea value={statsData} onChange={(e) => setStatsData(e.target.value)}
                    rows={3} placeholder="10, 20, 30, 40, 50"
                    style={{ padding: "6px", fontSize: 11, fontFamily: "monospace", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", resize: "none" }} />
                  <button onClick={calcStats} style={{ padding: "6px", fontSize: 11, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: "var(--r-sm)", cursor: "pointer" }}>📊 Hesapla</button>
                  {Object.keys(statsResult).length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, flex: 1, overflowY: "auto" }}>
                      {Object.entries(statsResult).map(([k, v]) => (
                        <div key={k} style={{ padding: "4px 6px", borderRadius: 4, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)" }}>
                          <div style={{ fontSize: 8, color: "var(--muted)", fontWeight: 600 }}>{k}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Control bar ── */}
      <footer className="glass" style={{ margin: "0 8px 8px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 0, borderRadius: "var(--r-lg)" }}>

        {/* Mic */}
        <button
          className="btn-link"
          onClick={() => setIsMicOn((v) => !v)}
          style={{
            padding: "9px 14px", fontSize: 13, gap: 6,
            borderColor: isMicOn ? "var(--line)" : "#ef4444",
            color: isMicOn ? "var(--ink)" : "#ef4444",
            background: isMicOn ? "var(--panel)" : "rgba(239,68,68,0.08)",
          }}
          title={isMicOn ? t.tr("Mikrofonu kapat") : t.tr("Mikrofonu aç")}
        >
          {isMicOn ? "🎤" : "🔇"} <span style={{ fontSize: 11 }}>{isMicOn ? t.tr("Mikrofon") : t.tr("Sessiz")}</span>
        </button>

        {/* Camera */}
        <button
          className="btn-link"
          onClick={() => setIsCamOn((v) => !v)}
          style={{
            padding: "9px 14px", fontSize: 13, gap: 6,
            borderColor: isCamOn ? "var(--line)" : "#ef4444",
            color: isCamOn ? "var(--ink)" : "#ef4444",
            background: isCamOn ? "var(--panel)" : "rgba(239,68,68,0.08)",
          }}
          title={isCamOn ? t.tr("Kamerayı kapat") : t.tr("Kamerayı aç")}
        >
          {isCamOn ? "📷" : "🚫"} <span style={{ fontSize: 11 }}>{isCamOn ? t.tr("Kamera") : t.tr("Kamera Kapalı")}</span>
        </button>

        {/* Screen share */}
        <button
          className="btn-link"
          onClick={async () => {
            if (isSharing) {
              screenStreamRef.current?.getTracks().forEach((t) => t.stop());
              screenStreamRef.current = null;
              setIsSharing(false);
            } else {
              try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                screenStreamRef.current = stream;
                stream.getVideoTracks()[0].onended = () => {
                  setIsSharing(false);
                  screenStreamRef.current = null;
                };
                setIsSharing(true);
              } catch { /* user cancelled */ }
            }
          }}
          style={{
            padding: "9px 14px", fontSize: 13, gap: 6,
            borderColor: isSharing ? "var(--accent-2)" : "var(--line)",
            color: isSharing ? "var(--accent-2)" : "var(--ink)",
            background: isSharing ? "var(--accent-2-soft)" : "var(--panel)",
          }}
          title={isSharing ? t.tr("Paylaşımı durdur") : t.tr("Ekran paylaş")}
        >
          🖥️ <span style={{ fontSize: 11 }}>{isSharing ? t.tr("Paylaşılıyor") : t.tr("Ekran")}</span>
        </button>

        {/* Record */}
        <button
          className="btn-link"
          onClick={() => setIsRecording((v) => !v)}
          style={{
            padding: "9px 14px", fontSize: 13, gap: 6,
            borderColor: isRecording ? "#ef4444" : "var(--line)",
            color: isRecording ? "#ef4444" : "var(--ink)",
            background: isRecording ? "rgba(239,68,68,0.08)" : "var(--panel)",
            position: "relative",
          }}
          title={isRecording ? t.tr("Kaydı durdur") : t.tr("Kayıt başlat")}
        >
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            ⏺️
            {isRecording && (
              <span style={{
                position: "absolute", top: -3, right: -3,
                width: 8, height: 8, borderRadius: "50%",
                background: "#ef4444",
                animation: "statusPulse 1s ease-in-out infinite",
                border: "1.5px solid var(--panel)",
              }} />
            )}
          </span>
          <span style={{ fontSize: 11 }}>{isRecording ? t.tr("Kaydediyor") : t.tr("Kayıt")}</span>
        </button>

        {/* Raise hand */}
        <div style={{ position: "relative", display: "inline-flex" }}>
          <button
            className="btn-link"
            onClick={() => {
              const next = !handRaised;
              setHandRaised(next);
              if (next) {
                setHandQueue((q) => [...q, { id: "me", name: "Ben", time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }]);
              } else {
                setHandQueue((q) => q.filter((h) => h.id !== "me"));
              }
            }}
            style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: handRaised ? "var(--accent-3)" : "var(--line)",
              color: handRaised ? "var(--accent-3)" : "var(--ink)",
              background: handRaised ? "rgba(245,158,11,0.10)" : "var(--panel)",
            }}
            title={handRaised ? t.tr("Eli indir") : t.tr("El kaldır")}
          >
            ✋ <span style={{ fontSize: 11 }}>{handRaised ? t.tr("El Kaldırıldı") : t.tr("El Kaldır")}</span>
            {handQueue.length > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 18, height: 18, borderRadius: "50%",
                background: "#f59e0b", color: "#fff", fontSize: 9, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--panel)",
              }}>{handQueue.length}</span>
            )}
          </button>
          {/* Hand queue popup (instructor only) */}
          {canWrite && handQueue.length > 0 && (
            <div style={{
              position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: "var(--r-md)", padding: 8, minWidth: 160,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>{t.tr("✋ El Kaldırma Sırası")}</div>
              {handQueue.map((h, i) => (
                <div key={h.id + i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 6px", borderRadius: 4, marginBottom: 2,
                  background: i === 0 ? "rgba(245,158,11,0.08)" : "transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? "#f59e0b" : "var(--ink)", minWidth: 14 }}>{i + 1}.</span>
                    <span style={{ fontSize: 10, color: "var(--ink)" }}>{t.tr(h.name)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 8, color: "var(--muted)" }}>{h.time}</span>
                    <button onClick={() => setHandQueue((q) => q.filter((_, qi) => qi !== i))} style={{
                      width: 14, height: 14, borderRadius: "50%", border: "none",
                      background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 8,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakout Rooms */}
        {canWrite && (
          <div style={{ position: "relative" }}>
            <button
              className="btn-link"
              onClick={() => setBreakoutOpen((v) => !v)}
              style={{ padding: "9px 14px", fontSize: 13, gap: 6, borderColor: breakoutOpen ? "var(--accent)" : "var(--line)", color: breakoutOpen ? "var(--accent)" : "var(--ink)", background: breakoutOpen ? "var(--accent-soft)" : "var(--panel)" }}
              title={t.tr("Breakout Odaları")}
            >
              🏠 <span style={{ fontSize: 11 }}>{t.tr("Odalar")}</span>
            </button>
            {breakoutOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                width: 260, background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)", padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                zIndex: 50, display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("Breakout Odaları")}</div>
                {breakoutRooms.length === 0 ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {[2, 3, 4].map((n) => (
                      <button key={n} onClick={() => createBreakoutRooms(n)} style={{
                        flex: 1, padding: "6px", fontSize: 11, fontWeight: 600,
                        borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                        background: "var(--panel)", color: "var(--accent)", cursor: "pointer",
                      }}>{n} {t.tr("Oda")}</button>
                    ))}
                  </div>
                ) : (
                  <>
                    {breakoutRooms.map((room) => (
                      <div key={room.id} style={{ padding: "6px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "color-mix(in srgb,var(--panel) 60%,transparent)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>🏠 {t.tr(room.name)}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          {room.members.length > 0 ? room.members.join(", ") : t.tr("Boş")}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { setBreakoutRooms([]); setBreakoutOpen(false); }} style={{
                      fontSize: 10, color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600,
                    }}>{t.tr("🗑 Odaları kapat")}</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI buttons */}
        {canWrite && (
          <>
            <button className="btn-link" onClick={generateAiSummary} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: aiTab === "summary" ? "rgba(139,92,246,0.4)" : "var(--line)",
              color: aiTab === "summary" ? "#8b5cf6" : "var(--ink)",
              background: aiTab === "summary" ? "rgba(139,92,246,0.08)" : "var(--panel)",
            }} title={t.tr("AI Ders Özeti")}>
              🤖 <span style={{ fontSize: 11 }}>{t.tr("Özet")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowAnalytics(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showAnalytics ? "rgba(16,185,129,0.4)" : "var(--line)",
              color: showAnalytics ? "#10b981" : "var(--ink)",
              background: showAnalytics ? "rgba(16,185,129,0.08)" : "var(--panel)",
            }} title={t.tr("Öğrenci Analitiği")}>
              📊 <span style={{ fontSize: 11 }}>{t.tr("Analitik")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowGamification(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showGamification ? "rgba(245,158,11,0.4)" : "var(--line)",
              color: showGamification ? "#f59e0b" : "var(--ink)",
              background: showGamification ? "rgba(245,158,11,0.08)" : "var(--panel)",
            }} title={t.tr("Oyunlaştırma")}>
              🏆 <span style={{ fontSize: 11 }}>{t.tr("Puan")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowListeningLab(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showListeningLab ? "rgba(59,130,246,0.4)" : "var(--line)",
              color: showListeningLab ? "#3b82f6" : "var(--ink)",
              background: showListeningLab ? "rgba(59,130,246,0.08)" : "var(--panel)",
            }} title={t.tr("Dinleme Laboratuvarı")}>
              🎧 <span style={{ fontSize: 11 }}>{t.tr("Dinleme")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowSpeaking(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showSpeaking ? "rgba(16,185,129,0.4)" : "var(--line)",
              color: showSpeaking ? "#10b981" : "var(--ink)",
              background: showSpeaking ? "rgba(16,185,129,0.08)" : "var(--panel)",
            }} title={t.tr("Konuşma Analizi")}>
              🎤 <span style={{ fontSize: 11 }}>{t.tr("Konuşma")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowReading(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showReading ? "rgba(234,179,8,0.4)" : "var(--line)",
              color: showReading ? "#eab308" : "var(--ink)",
              background: showReading ? "rgba(234,179,8,0.08)" : "var(--panel)",
            }} title={t.tr("Okuma Araçları")}>
              📖 <span style={{ fontSize: 11 }}>{t.tr("Okuma")}</span>
            </button>
            <button className="btn-link" onClick={() => setShowWriting(true)} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: showWriting ? "rgba(168,85,247,0.4)" : "var(--line)",
              color: showWriting ? "#a855f7" : "var(--ink)",
              background: showWriting ? "rgba(168,85,247,0.08)" : "var(--panel)",
            }} title={t.tr("Yazma Analizi")}>
              ✍️ <span style={{ fontSize: 11 }}>{t.tr("Yazma")}</span>
            </button>
            <button className="btn-link" onClick={generateAiQuiz} style={{
              padding: "9px 14px", fontSize: 13, gap: 6,
              borderColor: aiTab === "quiz" ? "rgba(139,92,246,0.4)" : "var(--line)",
              color: aiTab === "quiz" ? "#8b5cf6" : "var(--ink)",
              background: aiTab === "quiz" ? "rgba(139,92,246,0.08)" : "var(--panel)",
            }} title={t.tr("AI Soru Üretici")}>
              🧠 <span style={{ fontSize: 11 }}>{t.tr("Soru")}</span>
            </button>
          </>
        )}

        <div style={{ width: 1, height: 32, background: "var(--line)", margin: "0 4px", flexShrink: 0 }} />

        {/* Platform features */}
        <button className="btn-link" onClick={() => setShowLms(true)} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: showLms ? "rgba(59,130,246,0.4)" : "var(--line)",
          color: showLms ? "#3b82f6" : "var(--ink)",
          background: showLms ? "rgba(59,130,246,0.08)" : "var(--panel)",
        }} title={t.tr("Öğrenme Yönetim Sistemi")}>
          📚 <span style={{ fontSize: 11 }}>{t.tr("LMS")}</span>
        </button>
        <button className="btn-link" onClick={() => setShowCloud(true)} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: showCloud ? "rgba(99,102,241,0.4)" : "var(--line)",
          color: showCloud ? "#6366f1" : "var(--ink)",
          background: showCloud ? "rgba(99,102,241,0.08)" : "var(--panel)",
        }} title={t.tr("Bulut Depolama & Arşiv")}>
          ☁️ <span style={{ fontSize: 11 }}>{t.tr("Bulut")}</span>
        </button>
        <button className="btn-link" onClick={() => setShowXR(true)} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: showXR ? "rgba(139,92,246,0.4)" : "var(--line)",
          color: showXR ? "#8b5cf6" : "var(--ink)",
          background: showXR ? "rgba(139,92,246,0.08)" : "var(--panel)",
        }} title={t.tr("3D Simülasyon")}>
          🔬 <span style={{ fontSize: 11 }}>3D</span>
        </button>
        <button className="btn-link" onClick={() => setShowIoT(true)} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: showIoT ? "rgba(16,185,129,0.4)" : "var(--line)",
          color: showIoT ? "#10b981" : "var(--ink)",
          background: showIoT ? "rgba(16,185,129,0.08)" : "var(--panel)",
        }} title={t.tr("IoT Sınıf Kontrol")}>
          🏠 <span style={{ fontSize: 11 }}>{t.tr("IoT")}</span>
        </button>
        <button className="btn-link" onClick={() => setShowTranslation(true)} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: showTranslation ? "rgba(234,179,8,0.4)" : "var(--line)",
          color: showTranslation ? "#eab308" : "var(--ink)",
          background: showTranslation ? "rgba(234,179,8,0.08)" : "var(--panel)",
        }} title={t.tr("Çeviri & Altyazı")}>
          🌐 <span style={{ fontSize: 11 }}>{t.tr("Çeviri")}</span>
        </button>
        <button className="btn-link" onClick={async () => {
          if (isRecordingScreen) {
            mediaRecorderRef.current?.stop();
            setIsRecordingScreen(false);
          } else {
            try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
              const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
              recordedChunksRef.current = [];
              mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
              mr.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `atlasio-kayit-${Date.now()}.webm`; a.click();
                stream.getTracks().forEach((t) => t.stop());
              };
              mr.start();
              mediaRecorderRef.current = mr;
              setIsRecordingScreen(true);
            } catch { /* user cancelled */ }
          }
        }} style={{
          padding: "9px 14px", fontSize: 13, gap: 6,
          borderColor: isRecordingScreen ? "rgba(239,68,68,0.6)" : "var(--line)",
          color: isRecordingScreen ? "#ef4444" : "var(--ink)",
          background: isRecordingScreen ? "rgba(239,68,68,0.1)" : "var(--panel)",
          animation: isRecordingScreen ? "pulse 1.5s infinite" : undefined,
        }} title={t.tr("Ekran Kaydı")}>
          {isRecordingScreen ? "⏹" : "⏺"} <span style={{ fontSize: 11 }}>{isRecordingScreen ? t.tr("Durdur") : t.tr("Kayıt")}</span>
        </button>

        <div style={{ width: 1, height: 32, background: "var(--line)", margin: "0 4px", flexShrink: 0 }} />

        {/* Leave */}
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 18px", fontSize: 13, fontWeight: 600,
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            border: "none", borderRadius: "var(--r-md)", color: "#fff",
            cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            transition: "transform var(--t-fast), box-shadow var(--t-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(239,68,68,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.3)"; }}
          title={t.tr("Dersten ayrıl")}
        >
          {t.tr("📴 Ayrıl")}
        </button>
      </footer>

      {/* ── AI Panel (overlay) ── */}
      {aiTab && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setAiTab(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480, maxHeight: "70vh", background: "var(--panel)",
              border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                {aiTab === "summary" ? t.tr("🤖 AI Ders Özeti") : t.tr("🧠 AI Soru Üretici")}
              </div>
              <button onClick={() => setAiTab(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
              {aiLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, animation: "statusPulse 1s ease-in-out infinite" }}>🤖</div>
                  <div style={{ fontSize: 13 }}>{t.tr("AI işliyor…")}</div>
                </div>
              ) : aiTab === "summary" ? (
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
                  {aiSummary}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {aiQuizzes.map((quiz, qi) => (
                    <div key={qi} style={{ padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "color-mix(in srgb,var(--panel) 60%,transparent)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                        {qi + 1}. {quiz.q}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {quiz.opts.map((opt, oi) => (
                          <div key={oi} style={{
                            padding: "6px 10px", fontSize: 12, borderRadius: "var(--r-sm)",
                            border: `1px solid ${oi === quiz.ans ? "rgba(16,185,129,0.4)" : "var(--line)"}`,
                            background: oi === quiz.ans ? "rgba(16,185,129,0.08)" : "var(--panel)",
                            color: oi === quiz.ans ? "#10b981" : "var(--ink-2)",
                            fontWeight: oi === quiz.ans ? 700 : 400,
                          }}>
                            {String.fromCharCode(65 + oi)}) {opt}
                            {oi === quiz.ans && <span style={{ marginLeft: 6 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics Panel ── */}
      {showAnalytics && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAnalytics(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "75vh", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("📊 Öğrenci Analitik Paneli")}</div>
              <button onClick={() => setShowAnalytics(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {/* Summary row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                {[
                  { label: "Ortalama Katılım", value: `${Math.round(analyticsData.reduce((a, s) => a + s.participation, 0) / Math.max(analyticsData.length, 1))}%`, color: "#10b981" },
                  { label: "Ortalama Dikkat", value: `${Math.round(analyticsData.reduce((a, s) => a + s.attention, 0) / Math.max(analyticsData.length, 1))}%`, color: "#3b82f6" },
                  { label: "Ort. Quiz Puanı", value: `${Math.round(analyticsData.reduce((a, s) => a + s.quizScore, 0) / Math.max(analyticsData.length, 1))}`, color: "#8b5cf6" },
                  { label: "Toplam Mesaj", value: `${analyticsData.reduce((a, s) => a + s.chatCount, 0)}`, color: "#f59e0b" },
                ].map((stat) => (
                  <div key={t.tr(stat.label)} style={{ padding: "10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{t.tr(stat.label)}</div>
                  </div>
                ))}
              </div>

              {/* Student table */}
              <div style={{ fontSize: 11 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px 50px 50px", gap: 4, padding: "6px 8px", background: "var(--line-2)", borderRadius: "var(--r-sm)", fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                  <span>{t.tr("Öğrenci")}</span><span>{t.tr("Katılım")}</span><span>{t.tr("Dikkat")}</span><span>{t.tr("Quiz")}</span><span>{t.tr("Chat")}</span><span>{t.tr("El")}</span>
                </div>
                {analyticsData.map((s) => (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px 50px 50px", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--line-2)", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>{t.tr(s.name)}</span>
                    <span>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--line-2)" }}>
                        <div style={{ height: "100%", width: `${s.participation}%`, background: "#10b981", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 9, color: "var(--muted)" }}>{s.participation}%</span>
                    </span>
                    <span>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--line-2)" }}>
                        <div style={{ height: "100%", width: `${s.attention}%`, background: "#3b82f6", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 9, color: "var(--muted)" }}>{s.attention}%</span>
                    </span>
                    <span style={{ color: s.quizScore >= 80 ? "#10b981" : s.quizScore >= 60 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>{s.quizScore}</span>
                    <span style={{ color: "var(--muted)" }}>{s.chatCount}</span>
                    <span style={{ color: "var(--muted)" }}>{s.handRaiseCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gamification Panel ── */}
      {showGamification && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowGamification(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxHeight: "75vh", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🏆 Oyunlaştırma — Liderlik Tablosu")}</div>
              <button onClick={() => setShowGamification(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

              {/* Leaderboard */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>{t.tr("🥇 Puan Sıralaması")}</div>
                {DEMO_PARTICIPANTS
                  .filter((p) => p.role === "STUDENT")
                  .sort((a, b) => (studentPoints[b.id] ?? 0) - (studentPoints[a.id] ?? 0))
                  .map((p, i) => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                      borderRadius: "var(--r-md)", marginBottom: 4,
                      background: i === 0 ? "rgba(245,158,11,0.08)" : "color-mix(in srgb,var(--panel) 60%,transparent)",
                      border: `1px solid ${i === 0 ? "rgba(245,158,11,0.3)" : "var(--line-2)"}`,
                    }}>
                      <span style={{ fontSize: 16, minWidth: 24, textAlign: "center" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <div className="avatar avatar-sm" style={{ background: p.avatarColor, color: "#fff", fontSize: 10 }}>{p.initials}</div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t.tr(p.name)}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{studentPoints[p.id] ?? 0}</span>
                      {canWrite && (
                        <button onClick={() => awardPoint(p.id, 10)} style={{
                          padding: "2px 6px", fontSize: 9, fontWeight: 700,
                          borderRadius: "var(--r-sm)", border: "1px solid rgba(16,185,129,0.3)",
                          background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer",
                        }}>+10</button>
                      )}
                    </div>
                  ))
                }
              </div>

              {/* Badges */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>🎖 Rozetler</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {badges.map((b) => (
                    <div key={b.id} style={{
                      padding: "10px 8px", borderRadius: "var(--r-md)",
                      border: "1px solid var(--line)", textAlign: "center",
                      background: "color-mix(in srgb,var(--panel) 60%,transparent)",
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink)" }}>{t.tr(b.label)}</div>
                      <div style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>{t.tr(b.desc)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Listening Lab Panel ── */}
      {showListeningLab && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowListeningLab(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🎧 Dinleme Laboratuvarı")}</div>
              <button onClick={() => setShowListeningLab(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Audio player mock */}
              <div style={{ padding: "16px", borderRadius: "var(--r-md)", background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))", color: "#fff" }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{t.tr("🎵 Ders Kaydı — Bölüm 1")}</div>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12 }}>{t.tr("İngilizce — Dinleme Alıştırması")}</div>

                {/* Progress bar */}
                <div
                  style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", marginBottom: 8, cursor: "pointer", position: "relative" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setAudioProgress(((e.clientX - rect.left) / rect.width) * 100);
                  }}
                >
                  <div style={{ height: "100%", width: `${audioProgress}%`, background: "#3b82f6", borderRadius: 2, transition: "width 0.2s" }} />
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <button onClick={() => setAudioProgress(Math.max(0, audioProgress - 5))} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", opacity: 0.7 }}>⏪</button>
                  <button onClick={() => setAudioPlaying((v) => !v)} style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(59,130,246,0.3)", border: "2px solid rgba(59,130,246,0.6)",
                    color: "#fff", fontSize: 16, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {audioPlaying ? "⏸" : "▶️"}
                  </button>
                  <button onClick={() => setAudioProgress(Math.min(100, audioProgress + 5))} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", opacity: 0.7 }}>⏩</button>
                </div>
              </div>

              {/* Speed control */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 40 }}>{t.tr("Hız:")}</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button key={s} onClick={() => setAudioSpeed(s)} style={{
                      padding: "4px 8px", fontSize: 10, fontWeight: audioSpeed === s ? 700 : 500,
                      borderRadius: "var(--r-sm)", border: "1px solid",
                      borderColor: audioSpeed === s ? "var(--accent)" : "var(--line)",
                      background: audioSpeed === s ? "var(--accent-soft)" : "var(--panel)",
                      color: audioSpeed === s ? "var(--accent)" : "var(--muted)", cursor: "pointer",
                    }}>{s}x</button>
                  ))}
                </div>
              </div>

              {/* Repeat section */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "color-mix(in srgb,var(--panel) 60%,transparent)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{t.tr("🔁 Tekrar Bölümü (A-B)")}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
                  {t.tr("Belirli bir bölümü tekrar dinlemek için başlangıç ve bitiş noktası seçin.")}
                  {t.tr("Bu özellik audio kaynağı bağlandığında aktif olacaktır.")}
                </div>
              </div>

              {/* Listening exercise placeholder */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 4 }}>{t.tr("📝 Dinleme Alıştırması")}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
                  {t.tr("Boşluk doldurma, çoktan seçmeli ve transkript takibi alıştırmaları")}
                  {t.tr("eğitmen tarafından yüklendiğinde burada görünecektir.")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Speaking Analysis Panel ── */}
      {showSpeaking && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSpeaking(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,90vw)", maxHeight: "80vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🎤 Konuşma Analizi")}</div>
              <button onClick={() => setShowSpeaking(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              {/* Target text */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>{t.tr("Hedef Metin")}</div>
                <textarea value={spkText} onChange={(e) => setSpkText(e.target.value)} rows={3}
                  style={{ width: "100%", padding: "8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", resize: "none", fontFamily: "inherit" }} />
              </div>
              {/* Record button */}
              <button
                onClick={() => {
                  if (spkRecording) {
                    setSpkRecording(false);
                    // Simulate scoring
                    const score = Math.floor(Math.random() * 30) + 70;
                    setSpkScore(score);
                    const tips: string[] = [];
                    if (score < 80) tips.push("Sesli harflerin telaffuzunu güçlendirin.");
                    if (score < 90) tips.push("Kelime vurgularına dikkat edin.");
                    tips.push(score >= 90 ? "Harika telaffuz! 🎉" : "Cümle akıcılığını artırabilirsiniz.");
                    setSpkFeedback(tips);
                  } else {
                    setSpkRecording(true);
                    setSpkScore(null);
                    setSpkFeedback([]);
                  }
                }}
                style={{
                  padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: "var(--r-md)",
                  border: "none", cursor: "pointer",
                  background: spkRecording ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  animation: spkRecording ? "pulse 1.5s infinite" : undefined,
                }}
              >
                {spkRecording ? t.tr("⏹ Kaydı Durdur") : t.tr("🎙 Kaydet ve Analiz Et")}
              </button>
              {/* Score */}
              {spkScore !== null && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    border: `4px solid ${spkScore >= 90 ? "#10b981" : spkScore >= 75 ? "#eab308" : "#ef4444"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, fontWeight: 900,
                    color: spkScore >= 90 ? "#10b981" : spkScore >= 75 ? "#eab308" : "#ef4444",
                  }}>{spkScore}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>
                    {t.tr("Telaffuz Puanı:")}: {spkScore >= 90 ? t.tr("Mükemmel") : spkScore >= 75 ? t.tr("İyi") : t.tr("Geliştirilebilir")}
                  </div>
                </div>
              )}
              {/* Feedback */}
              {spkFeedback.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {spkFeedback.map((f, i) => (
                    <div key={i} style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", fontSize: 11, color: "var(--ink)" }}>
                      💡 {f}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: "8px 10px", borderRadius: "var(--r-sm)", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 10, color: "var(--muted)" }}>
                {t.tr("ℹ️ Mikrofon erişimi gereklidir. Web Speech API veya harici AI servisi bağlandığında gerçek telaffuz analizi yapılacaktır.")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reading Tools Panel ── */}
      {showReading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowReading(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,90vw)", maxHeight: "80vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("📖 Okuma Araçları")}</div>
              <button onClick={() => { setShowReading(false); setReadHighlight(-1); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              {/* Text input */}
              <textarea value={readText} onChange={(e) => setReadText(e.target.value)} rows={4}
                style={{ width: "100%", padding: "10px", fontSize: 13, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              {/* Speed control */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{t.tr("Hız:")}</span>
                {[0.5, 0.75, 1, 1.25, 1.5].map((s) => (
                  <button key={s} onClick={() => setReadSpeed(s)} style={{
                    padding: "3px 8px", fontSize: 10, fontWeight: readSpeed === s ? 700 : 500,
                    border: `1px solid ${readSpeed === s ? "var(--accent)" : "var(--line)"}`,
                    borderRadius: "var(--r-sm)", cursor: "pointer",
                    background: readSpeed === s ? "var(--accent-soft)" : "var(--panel)",
                    color: readSpeed === s ? "var(--accent)" : "var(--muted)",
                  }}>{s}x</button>
                ))}
              </div>
              {/* Read aloud */}
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => {
                  const utterance = new SpeechSynthesisUtterance(readText);
                  utterance.rate = readSpeed;
                  utterance.lang = "en-US";
                  const words = readText.split(/\s+/);
                  let wi = 0;
                  utterance.onboundary = (e) => {
                    if (e.name === "word") { setReadHighlight(wi); wi++; }
                  };
                  utterance.onend = () => setReadHighlight(-1);
                  speechSynthesis.cancel();
                  speechSynthesis.speak(utterance);
                }} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: "var(--r-md)", cursor: "pointer", background: "linear-gradient(135deg,#eab308,#f59e0b)", color: "#fff" }}>
                  {t.tr("🔊 Sesli Oku")}
                </button>
                <button onClick={() => { speechSynthesis.cancel(); setReadHighlight(-1); }} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, border: "1px solid var(--line)", borderRadius: "var(--r-md)", cursor: "pointer", background: "var(--panel)", color: "var(--muted)" }}>
                  {t.tr("⏹ Dur")}
                </button>
              </div>
              {/* Highlighted text */}
              <div style={{ padding: "14px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "rgba(234,179,8,0.03)", lineHeight: 2, fontSize: 14 }}>
                {readText.split(/\s+/).map((word, i) => (
                  <span key={i} style={{
                    padding: "1px 2px", borderRadius: 3, transition: "background 0.15s",
                    background: readHighlight === i ? "rgba(234,179,8,0.3)" : "transparent",
                    fontWeight: readHighlight === i ? 700 : 400,
                    color: readHighlight === i ? "#b45309" : "var(--ink)",
                  }}>{word} </span>
                ))}
              </div>
              {/* Word stats */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { l: t.tr("Kelime"), v: String(readText.split(/\s+/).filter(Boolean).length) },
                  { l: t.tr("Karakter"), v: String(readText.length) },
                  { l: t.tr("Cümle"), v: String(readText.split(/[.!?]+/).filter(Boolean).length) },
                  { l: t.tr("Tahmini süre"), v: `${Math.ceil(readText.split(/\s+/).filter(Boolean).length / (150 * readSpeed))} dk` },
                ].map(({ l, v }) => (
                  <div key={l} style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.1)", fontSize: 10 }}>
                    <span style={{ color: "var(--muted)" }}>{l}: </span>
                    <span style={{ fontWeight: 700, color: "#b45309" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LMS Panel ── */}
      {showLms && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLms(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,90vw)", maxHeight: "85vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("📚 Öğrenme Yönetim Sistemi")}</div>
              <button onClick={() => setShowLms(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            {/* LMS tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
              {([
                { k: "assignments" as const, l: t.tr("📝 Ödevler") },
                { k: "grades" as const, l: t.tr("📊 Notlar") },
                { k: "progress" as const, l: t.tr("📈 İlerleme") },
              ]).map(({ k, l }) => (
                <button key={k} onClick={() => setLmsTab(k)} style={{
                  flex: 1, padding: "8px", fontSize: 11, fontWeight: lmsTab === k ? 700 : 500,
                  border: "none", borderBottom: lmsTab === k ? "2px solid var(--accent)" : "2px solid transparent",
                  background: lmsTab === k ? "var(--accent-soft)" : "transparent",
                  color: lmsTab === k ? "var(--accent)" : "var(--muted)", cursor: "pointer",
                }}>{l}</button>
              ))}
            </div>
            <div style={{ padding: 16, overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {lmsTab === "assignments" && assignments.map((a) => (
                <div key={a.id} style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t.tr(a.title)}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{t.tr("Teslim:")}: {a.due}</div>
                  </div>
                  <div style={{
                    padding: "3px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700,
                    background: a.status === "graded" ? "rgba(16,185,129,0.1)" : a.status === "submitted" ? "rgba(59,130,246,0.1)" : "rgba(234,179,8,0.1)",
                    color: a.status === "graded" ? "#10b981" : a.status === "submitted" ? "#3b82f6" : "#eab308",
                  }}>
                    {a.status === "graded" ? `✅ ${a.grade}` : a.status === "submitted" ? t.tr("📤 Teslim edildi") : t.tr("⏳ Bekliyor")}
                  </div>
                </div>
              ))}
              {lmsTab === "grades" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--muted)", padding: "4px 8px" }}>
                    <div>{t.tr("Ödev")}</div><div style={{ textAlign: "center" }}>{t.tr("Not")}</div><div style={{ textAlign: "center" }}>{t.tr("Durum")}</div>
                  </div>
                  {assignments.filter((a) => a.grade !== null).map((a) => (
                    <div key={a.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 4, padding: "8px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--ink)" }}>{t.tr(a.title)}</div>
                      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 900, color: (a.grade ?? 0) >= 85 ? "#10b981" : (a.grade ?? 0) >= 70 ? "#eab308" : "#ef4444" }}>{a.grade}</div>
                      <div style={{ textAlign: "center", fontSize: 10, color: "var(--muted)" }}>{(a.grade ?? 0) >= 85 ? "A" : (a.grade ?? 0) >= 70 ? "B" : "C"}</div>
                    </div>
                  ))}
                  <div style={{ padding: "10px", borderRadius: "var(--r-md)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{t.tr("Genel Ortalama")}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981" }}>
                      {Math.round(assignments.filter((a) => a.grade !== null).reduce((s, a) => s + (a.grade ?? 0), 0) / Math.max(1, assignments.filter((a) => a.grade !== null).length))}
                    </div>
                  </div>
                </div>
              )}
              {lmsTab === "progress" && progressData.map((p) => (
                <div key={p.subject} style={{ padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{p.subject}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: p.grade >= 80 ? "#10b981" : p.grade >= 60 ? "#eab308" : "#ef4444" }}>{t.tr("Not:")}: {p.grade}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p.progress}%`, borderRadius: 3, background: p.progress >= 70 ? "linear-gradient(90deg,#10b981,#059669)" : p.progress >= 40 ? "linear-gradient(90deg,#eab308,#f59e0b)" : "linear-gradient(90deg,#ef4444,#dc2626)", transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{t.tr("İlerleme:")}: %{p.progress}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 3D/XR Simulation Panel ── */}
      {showXR && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowXR(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(500px,90vw)", maxHeight: "85vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🔬 3D/XR Simülasyon")}</div>
              <button onClick={() => setShowXR(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              {/* Scene selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {([
                  { k: "solar" as const, l: t.tr("☀️ Güneş Sistemi"), d: t.tr("Gezegenlerin yörüngelerini keşfedin") },
                  { k: "cell" as const, l: t.tr("🧬 Hücre Yapısı"), d: t.tr("Hayvan/Bitki hücresini inceleyin") },
                  { k: "molecule" as const, l: t.tr("⚛️ Molekül"), d: t.tr("H₂O, CO₂, DNA yapıları") },
                  { k: "volcano" as const, l: t.tr("🌋 Volkan"), d: t.tr("Volkanik patlama simülasyonu") },
                ]).map(({ k, l, d }) => (
                  <button key={k} onClick={() => setXrScene(k)} style={{
                    padding: "12px", borderRadius: "var(--r-md)", border: `1.5px solid ${xrScene === k ? "var(--accent)" : "var(--line)"}`,
                    background: xrScene === k ? "var(--accent-soft)" : "var(--panel)",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: xrScene === k ? "var(--accent)" : "var(--ink)" }}>{l}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{d}</div>
                  </button>
                ))}
              </div>
              {/* 3D Preview area */}
              <div style={{
                width: "100%", height: 250, borderRadius: "var(--r-lg)",
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                border: "1px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: 48 }}>
                  {xrScene === "solar" ? "🪐" : xrScene === "cell" ? "🧬" : xrScene === "molecule" ? "⚛️" : "🌋"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                  {xrScene === "solar" ? t.tr("Güneş Sistemi Modeli") : xrScene === "cell" ? t.tr("Hücre 3D Modeli") : xrScene === "molecule" ? t.tr("Molekül Yapısı") : t.tr("Volkan Kesiti")}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                  {t.tr("Three.js / WebXR entegrasyonu bağlandığında 3D model burada render edilecek")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ flex: 1, padding: "8px", fontSize: 11, fontWeight: 700, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", cursor: "pointer" }}>{t.tr("🔄 Döndür")}</button>
                <button style={{ flex: 1, padding: "8px", fontSize: 11, fontWeight: 700, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", cursor: "pointer" }}>{t.tr("🔍 Yakınlaş")}</button>
                <button style={{ flex: 1, padding: "8px", fontSize: 11, fontWeight: 700, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", cursor: "pointer" }}>🥽 VR Modu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IoT Classroom Panel ── */}
      {showIoT && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowIoT(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,90vw)", maxHeight: "80vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🏠 IoT Sınıf Kontrol")}</div>
              <button onClick={() => setShowIoT(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
              {/* Lights */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("💡 Aydınlatma")}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>%{iotLights}</span>
                </div>
                <input type="range" min={0} max={100} value={iotLights} onChange={(e) => setIotLights(Number(e.target.value))} style={{ width: "100%", accentColor: "#eab308" }} />
              </div>
              {/* Temperature */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🌡️ Sıcaklık")}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: iotTemp > 25 ? "#ef4444" : iotTemp < 18 ? "#3b82f6" : "#10b981" }}>{iotTemp}°C</span>
                </div>
                <input type="range" min={16} max={30} value={iotTemp} onChange={(e) => setIotTemp(Number(e.target.value))} style={{ width: "100%", accentColor: "#10b981" }} />
              </div>
              {/* Air Quality */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🍃 Hava Kalitesi")}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: iotAirQuality >= 80 ? "#10b981" : iotAirQuality >= 50 ? "#eab308" : "#ef4444" }}>
                    %{iotAirQuality} — {iotAirQuality >= 80 ? t.tr("İyi") : iotAirQuality >= 50 ? t.tr("Orta") : t.tr("Kötü")}
                  </span>
                </div>
              </div>
              {/* Projector */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("📽️ Projektör")}</span>
                <button onClick={() => setIotProjector(!iotProjector)} style={{
                  padding: "4px 12px", fontSize: 10, fontWeight: 700, borderRadius: 20,
                  border: "none", cursor: "pointer",
                  background: iotProjector ? "linear-gradient(135deg,#10b981,#059669)" : "var(--line)",
                  color: iotProjector ? "#fff" : "var(--muted)",
                }}>{iotProjector ? t.tr("Açık") : t.tr("Kapalı")}</button>
              </div>
              {/* Blinds */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🪟 Panjurlar")}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>%{iotBlinds}</span>
                </div>
                <input type="range" min={0} max={100} value={iotBlinds} onChange={(e) => setIotBlinds(Number(e.target.value))} style={{ width: "100%", accentColor: "#3b82f6" }} />
              </div>
              <div style={{ padding: "8px 10px", borderRadius: "var(--r-sm)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", fontSize: 10, color: "var(--muted)" }}>
                {t.tr("ℹ️ IoT cihaz bağlantıları MQTT/WebSocket üzerinden kurulduğunda gerçek kontrol aktif olacaktır.")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cloud / Archive Panel ── */}
      {showCloud && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCloud(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,90vw)", maxHeight: "85vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("☁️ Bulut Depolama & Arşiv")}</div>
              <button onClick={() => setShowCloud(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
              {([
                { k: "files" as const, l: t.tr("📁 Dosyalar") },
                { k: "archive" as const, l: t.tr("📼 Ders Arşivi") },
                { k: "sync" as const, l: t.tr("🔄 Senkronizasyon") },
              ]).map(({ k, l }) => (
                <button key={k} onClick={() => setCloudTab(k)} style={{
                  flex: 1, padding: "8px", fontSize: 11, fontWeight: cloudTab === k ? 700 : 500,
                  border: "none", borderBottom: cloudTab === k ? "2px solid #6366f1" : "2px solid transparent",
                  background: cloudTab === k ? "rgba(99,102,241,0.06)" : "transparent",
                  color: cloudTab === k ? "#6366f1" : "var(--muted)", cursor: "pointer",
                }}>{l}</button>
              ))}
            </div>
            <div style={{ padding: 16, overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {cloudTab === "files" && (
                <>
                  {/* Upload button */}
                  <button style={{ padding: "10px", fontSize: 12, fontWeight: 700, border: "2px dashed var(--line)", borderRadius: "var(--r-md)", background: "transparent", color: "var(--muted)", cursor: "pointer", textAlign: "center" }}>
                    {t.tr("📤 Dosya Yükle (sürükle-bırak veya tıkla)")}
                  </button>
                  {/* File list */}
                  {cloudFiles.map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>
                          {f.type === "pdf" ? "📄" : f.type === "video" ? "🎬" : f.type === "pptx" ? "📊" : "📝"}
                        </span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{t.tr(f.name)}</div>
                          <div style={{ fontSize: 9, color: "var(--muted)" }}>{f.size} • {f.date}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button style={{ padding: "3px 8px", fontSize: 9, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 4, color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>{t.tr("📥 İndir")}</button>
                        <button style={{ padding: "3px 8px", fontSize: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 4, color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>🗑</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", padding: 8 }}>
                    {t.tr("Toplam:")}: {cloudFiles.length} {t.tr("dosya")} • {t.tr("Kullanılan alan:")} 54.6 MB / 5 GB
                  </div>
                </>
              )}
              {cloudTab === "archive" && archivedLessons.map((l) => (
                <div key={l.id} style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>📼 {t.tr(l.title)}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{l.date} • {l.duration} • {l.participants} {t.tr("katılımcı")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, background: "#6366f1", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>{t.tr("▶ İzle")}</button>
                      <button style={{ padding: "4px 10px", fontSize: 9, fontWeight: 600, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, color: "var(--muted)", cursor: "pointer" }}>📥</button>
                    </div>
                  </div>
                </div>
              ))}
              {cloudTab === "sync" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", padding: 20 }}>
                  <div style={{ fontSize: 40 }}>🔄</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t.tr("Senkronizasyon Durumu")}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                    {[
                      { l: t.tr("Tahta Verileri"), s: t.tr("Güncel"), c: "#10b981" },
                      { l: t.tr("Sohbet Geçmişi"), s: t.tr("Güncel"), c: "#10b981" },
                      { l: t.tr("Anket Sonuçları"), s: t.tr("Güncel"), c: "#10b981" },
                      { l: t.tr("Ders Kaydı"), s: isRecordingScreen ? t.tr("Kaydediliyor...") : t.tr("Bekliyor"), c: isRecordingScreen ? "#eab308" : "var(--muted)" },
                    ].map(({ l, s, c }) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                        <span style={{ fontSize: 11, color: "var(--ink)" }}>{l}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: c }}>● {s}</span>
                      </div>
                    ))}
                  </div>
                  <button style={{ padding: "8px 24px", fontSize: 11, fontWeight: 700, background: "#6366f1", color: "#fff", border: "none", borderRadius: "var(--r-md)", cursor: "pointer", marginTop: 8 }}>{t.tr("🔄 Şimdi Senkronize Et")}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Translation Panel ── */}
      {showTranslation && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowTranslation(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,90vw)", maxHeight: "80vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🌐 Çeviri & Altyazı")}</div>
              <button onClick={() => setShowTranslation(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              {/* Target language */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {[
                  { k: "en", l: "🇬🇧 İngilizce" }, { k: "tr", l: "🇹🇷 Türkçe" },
                  { k: "de", l: "🇩🇪 Almanca" }, { k: "fr", l: "🇫🇷 Fransızca" },
                  { k: "es", l: "🇪🇸 İspanyolca" }, { k: "ar", l: "🇸🇦 Arapça" },
                  { k: "zh", l: "🇨🇳 Çince" }, { k: "ja", l: "🇯🇵 Japonca" },
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setTransLang(k)} style={{
                    padding: "4px 8px", fontSize: 10, fontWeight: transLang === k ? 700 : 500,
                    border: `1px solid ${transLang === k ? "var(--accent)" : "var(--line)"}`,
                    borderRadius: "var(--r-sm)", cursor: "pointer",
                    background: transLang === k ? "var(--accent-soft)" : "var(--panel)",
                    color: transLang === k ? "var(--accent)" : "var(--muted)",
                  }}>{l}</button>
                ))}
              </div>
              {/* Input */}
              <textarea value={transText} onChange={(e) => setTransText(e.target.value)} rows={4}
                placeholder={t.tr("Çevrilecek metni girin...")}
                style={{ width: "100%", padding: "10px", fontSize: 12, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", resize: "none", fontFamily: "inherit" }} />
              <button onClick={() => {
                // Placeholder translation (will use real API when integrated)
                setTransResult(`[${transLang.toUpperCase()}] ${transText}\n\n(Gerçek çeviri API bağlantısı kurulduğunda otomatik çevrilecektir)`);
              }} style={{ padding: "10px", fontSize: 12, fontWeight: 700, border: "none", borderRadius: "var(--r-md)", cursor: "pointer", background: "linear-gradient(135deg,#eab308,#f59e0b)", color: "#fff" }}>
                {t.tr("🌐 Çevir")}
              </button>
              {/* Result */}
              {transResult && (
                <div style={{ padding: "12px", borderRadius: "var(--r-md)", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", fontSize: 12, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                  {transResult}
                </div>
              )}
              {/* Live subtitles toggle */}
              <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{t.tr("🎙️ Canlı Altyazı")}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{t.tr("Konuşmayı gerçek zamanlı çevir")}</div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 20, background: "var(--line)", fontSize: 9, fontWeight: 600, color: "var(--muted)" }}>
                  {t.tr("Yakında")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Writing Analysis Panel ── */}
      {showWriting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowWriting(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,90vw)", maxHeight: "80vh", background: "var(--panel)", borderRadius: "var(--r-lg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{t.tr("✍️ Yazma Analizi")}</div>
              <button onClick={() => setShowWriting(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "var(--muted)" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
              <textarea value={writeText} onChange={(e) => setWriteText(e.target.value)} rows={8}
                placeholder={t.tr("Yazınızı buraya girin...")}
                style={{ width: "100%", padding: "12px", fontSize: 13, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", background: "var(--panel)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
              <button onClick={() => {
                const words = writeText.split(/\s+/).filter(Boolean);
                const sentences = writeText.split(/[.!?]+/).filter(Boolean);
                const paragraphs = writeText.split(/\n\n+/).filter(Boolean);
                const chars = writeText.replace(/\s/g, "").length;
                const avgWordLen = words.length > 0 ? (chars / words.length).toFixed(1) : "0";
                const avgSentLen = sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : "0";
                // Simple readability score (based on avg word + sentence length)
                const readability = Math.max(0, Math.min(100, Math.round(100 - (parseFloat(avgWordLen) * 5 + parseFloat(avgSentLen) * 1.5))));
                // Simple vocabulary richness (unique/total)
                const unique = new Set(words.map((w) => w.toLowerCase()));
                const richness = words.length > 0 ? ((unique.size / words.length) * 100).toFixed(0) : "0";
                setWriteStats({
                  [t.tr("Kelime")]: String(words.length),
                  [t.tr("Karakter")]: String(chars),
                  [t.tr("Cümle")]: String(sentences.length),
                  [t.tr("Paragraf")]: String(paragraphs.length),
                  [t.tr("Ort. Kelime Uzunluğu")]: avgWordLen,
                  [t.tr("Ort. Cümle Uzunluğu")]: `${avgSentLen} ${t.tr("kelime")}`,
                  [t.tr("Kelime Zenginliği")]: `%${richness}`,
                  [t.tr("Okunabilirlik")]: `${readability}/100`,
                  [t.tr("Tahmini Okuma")]: `${Math.ceil(words.length / 200)} dk`,
                });
              }} style={{ padding: "10px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: "var(--r-md)", cursor: "pointer", background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff" }}>
                {t.tr("📊 Analiz Et")}
              </button>
              {Object.keys(writeStats).length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {Object.entries(writeStats).map(([k, v]) => (
                    <div key={k} style={{ padding: "6px 8px", borderRadius: "var(--r-sm)", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.1)" }}>
                      <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#a855f7", fontFamily: "monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: "8px 10px", borderRadius: "var(--r-sm)", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", fontSize: 10, color: "var(--muted)" }}>
                {t.tr("ℹ️ AI yazma analizi (dilbilgisi kontrolü, stil önerileri, kelime hazinesi değerlendirmesi) harici AI servisi bağlandığında aktif olacaktır.")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: hide sidebars via CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          .live-sidebar-left,
          .live-sidebar-right {
            display: none !important;
          }
          .live-body {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
