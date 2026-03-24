"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProctoringHooks from "../../_components/proctoring/ProctoringHooks";

type Choice = { id: string; text: string; isCorrect?: boolean };

type Question = {
  id: string;
  stem: string;
  explanation?: string | null;
  difficulty: number;
  topicId: string;
  choices: Choice[];
  correctChoiceId?: string | null;
};

type AnswerResult = "correct" | "wrong" | null;

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

// Demo questions for when API is unavailable
const DEMO_QUESTIONS: Question[] = [
  {
    id: "q1", stem: "Türkiye'nin başkenti hangisidir?", difficulty: 1, topicId: "coğrafya",
    choices: [
      { id: "a", text: "İstanbul" },
      { id: "b", text: "Ankara", isCorrect: true },
      { id: "c", text: "İzmir" },
      { id: "d", text: "Bursa" },
    ],
    correctChoiceId: "b",
  },
  {
    id: "q2", stem: "2x + 5 = 13 denkleminde x'in değeri nedir?", difficulty: 2, topicId: "matematik",
    choices: [
      { id: "a", text: "3" },
      { id: "b", text: "4", isCorrect: true },
      { id: "c", text: "5" },
      { id: "d", text: "6" },
    ],
    correctChoiceId: "b",
    explanation: "2x = 13 - 5 = 8, dolayısıyla x = 4.",
  },
  {
    id: "q3", stem: "Işığın boşluktaki hızı yaklaşık kaç km/s'dir?", difficulty: 3, topicId: "fizik",
    choices: [
      { id: "a", text: "150.000 km/s" },
      { id: "b", text: "200.000 km/s" },
      { id: "c", text: "300.000 km/s", isCorrect: true },
      { id: "d", text: "400.000 km/s" },
    ],
    correctChoiceId: "c",
    explanation: "Işık boşlukta yaklaşık 299.792 km/s hızla ilerler.",
  },
  {
    id: "q4", stem: "Fotosentez hangi organel tarafından gerçekleştirilir?", difficulty: 2, topicId: "biyoloji",
    choices: [
      { id: "a", text: "Mitokondri" },
      { id: "b", text: "Ribozom" },
      { id: "c", text: "Kloroplast", isCorrect: true },
      { id: "d", text: "Çekirdek" },
    ],
    correctChoiceId: "c",
    explanation: "Kloroplastlar, ışık enerjisini kimyasal enerjiye dönüştürür.",
  },
  {
    id: "q5", stem: "Osmanlı İmparatorluğu hangi yıl kuruldu?", difficulty: 2, topicId: "tarih",
    choices: [
      { id: "a", text: "1071" },
      { id: "b", text: "1299", isCorrect: true },
      { id: "c", text: "1453" },
      { id: "d", text: "1683" },
    ],
    correctChoiceId: "b",
  },
];

const DIFFICULTY_LABELS: Record<number, { label: string; color: string; stars: number }> = {
  1: { label: "Kolay",  color: "text-emerald-600 bg-emerald-50 border-emerald-200", stars: 1 },
  2: { label: "Orta",   color: "text-amber-600 bg-amber-50 border-amber-200",       stars: 2 },
  3: { label: "Zor",    color: "text-rose-600 bg-rose-50 border-rose-200",          stars: 3 },
};

export default function AdaptiveExamPage() {
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResult>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [mastery, setMastery] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0, streak: 0 });
  const [history, setHistory] = useState<boolean[]>([]);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Question timer
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setTimer((v) => v + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const pct = useMemo(() =>
    stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
    [stats]
  );

  async function start() {
    setLoading(true);
    setFeedback(null);
    setLastResult(null);
    setSelectedChoice(null);
    setShowExplanation(false);
    setStats({ correct: 0, total: 0, streak: 0 });
    setHistory([]);
    setTimer(0);
    try {
      const res = await fetch(`${API}/quiz/adaptive/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setSessionId(data.sessionId);
      setQuestion(data.question);
      setMastery(data.masteryHint);
      setDemoMode(false);
    } catch {
      // Fallback to demo questions
      setDemoMode(true);
      setDemoIdx(0);
      setQuestion(DEMO_QUESTIONS[0]);
      setSessionId("demo-session");
    } finally {
      setLoading(false);
      setTimerActive(true);
    }
  }

  async function answer(choiceId: string) {
    if (!question || selectedChoice) return;
    setSelectedChoice(choiceId);
    setTimerActive(false);

    const correct = question.correctChoiceId
      ? choiceId === question.correctChoiceId
      : question.choices.find((c) => c.id === choiceId)?.isCorrect;
    const wasCorrect = correct ?? false;

    setLastResult(wasCorrect ? "correct" : "wrong");
    setFeedback(wasCorrect ? "✅ Doğru!" : `❌ Yanlış — Doğru: ${question.choices.find(c => c.id === question.correctChoiceId)?.text ?? "?"}`);
    setStats((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
      streak: wasCorrect ? s.streak + 1 : 0,
    }));
    setHistory((h) => [...h, wasCorrect]);

    // Show explanation briefly then load next
    if (question.explanation) {
      setShowExplanation(true);
    }

    setTimeout(async () => {
      setFeedback(null);
      setLastResult(null);
      setSelectedChoice(null);
      setShowExplanation(false);
      setTimer(0);
      setTimerActive(true);

      if (demoMode) {
        const next = (demoIdx + 1) % DEMO_QUESTIONS.length;
        setDemoIdx(next);
        setQuestion(DEMO_QUESTIONS[next]);
      } else {
        setLoading(true);
        try {
          const body = {
            excludeIds: [question.id],
            last: { questionId: question.id, correct: wasCorrect },
          };
          const res = await fetch(`${API}/quiz/adaptive/next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          setQuestion(data.question);
          setMastery(data.masteryHint);
        } catch {
          const next = (demoIdx + 1) % DEMO_QUESTIONS.length;
          setDemoIdx(next);
          setQuestion(DEMO_QUESTIONS[next]);
        } finally {
          setLoading(false);
        }
      }
    }, question.explanation ? 2500 : 1200);
  }

  // Auto-start
  useEffect(() => {
    start().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diff = DIFFICULTY_LABELS[question?.difficulty ?? 1] ?? DIFFICULTY_LABELS[1];

  return (
    <main className="space-y-5">
      {/* Proctoring — headless, runs silently during exam */}
      {sessionId && (
        <ProctoringHooks
          sessionId={sessionId}
          enabled={!demoMode}
          onAlert={(msg) => console.warn("[Proctoring]", msg)}
        />
      )}

      {/* Header */}
      <header className="glass p-5 rounded-2xl border border-slate-200 hero">
        <div className="hero-content flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">
              <span className="status-dot online" />
              Adaptif Deneme {demoMode && <span className="ml-1 text-amber-600">(Demo)</span>}
            </div>
            <h1 className="text-2xl font-bold">Akıllı Quiz</h1>
            <p className="text-sm text-slate-500">Zorluk dinamik ayarlanır · Zayıf konulara odaklanır</p>
          </div>

          {/* Score stats */}
          <div className="flex gap-3">
            <div className={`rounded-xl border px-4 py-2.5 text-center ${
              pct >= 70
                ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200"
                : pct >= 40
                ? "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200"
                : "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200"
            }`}>
              <div className={`text-2xl font-extrabold ${pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                {pct}%
              </div>
              <div className="text-[10px] text-slate-500">Doğruluk</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 py-2.5 text-center">
              <div className="text-2xl font-extrabold text-blue-700">{stats.total}</div>
              <div className="text-[10px] text-slate-500">Soru</div>
            </div>
            {stats.streak >= 2 && (
              <div className="glass rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-center">
                <div className="text-2xl font-extrabold text-amber-600">🔥{stats.streak}</div>
                <div className="text-[10px] text-amber-600">Seri</div>
              </div>
            )}
          </div>
        </div>

        {/* Progress history dots */}
        {history.length > 0 && (
          <div className="hero-content mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 mr-1">Geçmiş:</span>
            {history.map((correct, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  correct ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-rose-100 text-rose-700 border border-rose-300"
                }`}
              >
                {correct ? "✓" : "✗"}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Question card */}
      <section className="glass p-5 rounded-2xl border border-slate-200 space-y-5">
        {/* Difficulty + timer bar */}
        <div className="flex items-center justify-between gap-3">
          <div className={`pill pill-sm border ${diff.color}`}>
            {"★".repeat(diff.stars)}{"☆".repeat(3 - diff.stars)} {diff.label}
          </div>
          {question && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">⏱ {timer}s</span>
              {mastery && (
                <span className="pill pill-xs">{mastery}</span>
              )}
            </div>
          )}
        </div>

        {/* Question stem */}
        {loading && !question ? (
          <div className="space-y-3">
            <div className="h-6 skeleton w-3/4 rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
            </div>
          </div>
        ) : question ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">{question.stem}</h2>

            {/* Choices */}
            <div className="grid gap-3 sm:grid-cols-2">
              {question.choices.map((c, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedChoice === c.id;
                const isCorrect = c.id === question.correctChoiceId || c.isCorrect;

                let choiceClass = "glass text-left border rounded-xl px-4 py-3 transition-all duration-200 flex items-center gap-3 group ";
                if (!selectedChoice) {
                  choiceClass += "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 hover:-translate-y-0.5 hover:shadow-md cursor-pointer";
                } else if (isSelected && lastResult === "correct") {
                  choiceClass += "border-emerald-400 bg-emerald-50 text-emerald-800";
                } else if (isSelected && lastResult === "wrong") {
                  choiceClass += "border-rose-400 bg-rose-50 text-rose-800";
                } else if (selectedChoice && isCorrect) {
                  choiceClass += "border-emerald-400 bg-emerald-50/60 text-emerald-800";
                } else {
                  choiceClass += "border-slate-200 opacity-60";
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => answer(c.id)}
                    disabled={!!selectedChoice || loading}
                    className={choiceClass}
                  >
                    <span className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                      !selectedChoice ? "border-slate-300 bg-slate-100 text-slate-600 group-hover:border-emerald-400 group-hover:bg-emerald-100 group-hover:text-emerald-700" :
                      isSelected && lastResult === "correct" ? "bg-emerald-500 text-white border-emerald-500" :
                      isSelected && lastResult === "wrong" ? "bg-rose-500 text-white border-rose-500" :
                      selectedChoice && isCorrect ? "bg-emerald-500 text-white border-emerald-500" :
                      "border-slate-200 bg-slate-50 text-slate-400"
                    }`}>
                      {letter}
                    </span>
                    <span className="text-sm leading-tight">{c.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`rounded-xl border px-4 py-3 text-sm font-medium animate-scale-in ${
                lastResult === "correct"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-rose-50 border-rose-300 text-rose-800"
              }`}>
                {feedback}
                {showExplanation && question.explanation && (
                  <p className="mt-1 text-xs font-normal opacity-80">💡 {question.explanation}</p>
                )}
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-400 font-mono">
          {demoMode ? "Demo modu • API bağlı değil" : `Oturum: ${sessionId?.slice(0, 12) ?? "—"}`}
        </div>
        <div className="flex gap-2">
          <button className="btn-link text-sm" onClick={() => window.history.back()}>
            ← Geri
          </button>
          <button
            className="btn-link text-sm border-emerald-400 text-emerald-700 bg-emerald-50/60"
            onClick={start}
            disabled={loading}
          >
            {loading ? "Yükleniyor…" : "🔄 Yeniden Başlat"}
          </button>
        </div>
      </div>
    </main>
  );
}
