'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type Phase = 'SETUP' | 'QUIZ' | 'RESULTS';
type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

interface Question {
  id: string;
  text: string;
  options: string[];
  type: QuestionType;
}

interface AnswerResult {
  correct: boolean;
  explanation: string;
  nextQuestion?: Question;
  score: number;
  difficulty: Difficulty;
}

interface SessionResult {
  totalScore: number;
  correctCount: number;
  totalCount: number;
  timeSpent: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  xpEarned: number;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Python\'da bir liste içindeki elemanları tekrar eden döngü hangisidir?',
    options: ['for döngüsü', 'while döngüsü', 'do-while döngüsü', 'repeat döngüsü'],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q2',
    text: 'JavaScript\'te "===" ile "==" arasındaki fark nedir?',
    options: [
      '=== tip dönüşümü yapar, == yapmaz',
      '=== hem değer hem tip kontrolü yapar, == sadece değer',
      'İkisi aynı işlevi görür',
      '== daha hızlıdır',
    ],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q3',
    text: 'Python\'da bir fonksiyon tanımlamak için kullanılan anahtar kelime nedir?',
    options: ['func', 'function', 'def', 'define'],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q4',
    text: 'O(log n) zaman karmaşıklığına sahip arama algoritması Binary Search\'tür.',
    options: ['Doğru', 'Yanlış'],
    type: 'TRUE_FALSE',
  },
  {
    id: 'q5',
    text: 'JavaScript\'te "let" ile "var" arasındaki kapsam (scope) farkı nedir?',
    options: [
      'let fonksiyon kapsamlı, var blok kapsamlıdır',
      'let blok kapsamlı, var fonksiyon kapsamlıdır',
      'Her ikisi de global kapsamlıdır',
      'Hiçbir fark yoktur',
    ],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q6',
    text: 'Python\'da liste anlamlandırma (list comprehension) hangi sözdizimini kullanır?',
    options: [
      '[x for x in liste]',
      '{x for x in liste}',
      '(x for x in liste)',
      'list(x for x in liste)',
    ],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q7',
    text: 'Bubble Sort algoritmasının ortalama zaman karmaşıklığı O(n²)\'dir.',
    options: ['Doğru', 'Yanlış'],
    type: 'TRUE_FALSE',
  },
  {
    id: 'q8',
    text: 'JavaScript Promise nedir?',
    options: [
      'Eşzamansız işlemleri temsil eden nesne',
      'Senkron fonksiyon çağrısı',
      'Bir döngü türü',
      'Bir veri yapısı',
    ],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q9',
    text: 'Python\'da "None" değeri JavaScript\'teki hangi değere karşılık gelir?',
    options: ['undefined', 'null', 'false', '0'],
    type: 'MULTIPLE_CHOICE',
  },
  {
    id: 'q10',
    text: 'Stack veri yapısı LIFO (Last In, First Out) prensibine göre çalışır.',
    options: ['Doğru', 'Yanlış'],
    type: 'TRUE_FALSE',
  },
];

const DEMO_EXPLANATIONS: Record<string, { correct: number; explanation: string }> = {
  q1: { correct: 0, explanation: '"for" döngüsü Python\'da listeler, demetler ve diğer yinelenebilir nesneler üzerinde dolaşmak için kullanılır. "while" ile de kullanılabilir fakat "for" daha yaygın ve Pythonic\'tir.' },
  q2: { correct: 1, explanation: '"===" katı eşitlik operatörüdür; hem değeri hem de tipi karşılaştırır. "==" ise tip dönüşümü yaparak karşılaştırır; bu yüzden "1 == \'1\'" true dönerken "1 === \'1\'" false döner.' },
  q3: { correct: 2, explanation: 'Python\'da fonksiyonlar "def" anahtar kelimesiyle tanımlanır. Örnek: def merhaba(): print("Merhaba!")' },
  q4: { correct: 0, explanation: 'Binary Search, sıralı bir dizide her adımda arama alanını yarıya indirdiği için O(log n) zaman karmaşıklığına sahiptir. Bu onu doğrusal arama O(n)\'den çok daha hızlı yapar.' },
  q5: { correct: 1, explanation: '"let" ES6 ile gelen blok kapsamlı bir değişken tanımlayıcıdır. "var" ise fonksiyon kapsamlıdır ve hoisting\'e tabi tutulur. Modern JavaScript\'te "let" ve "const" tercih edilir.' },
  q6: { correct: 0, explanation: 'Liste anlamlandırma için köşeli parantez kullanılır: [ifade for eleman in yinelenebilir]. Süslü parantez küme anlamlandırması (set comprehension), normal parantez ise generator ifadesidir.' },
  q7: { correct: 0, explanation: 'Bubble Sort, her geçişte en büyük elemanı sona taşır. En iyi durum O(n), ortalama ve en kötü durum O(n²) zaman karmaşıklığına sahiptir.' },
  q8: { correct: 0, explanation: 'Promise, asenkron bir işlemin nihai tamamlanmasını veya başarısızlığını temsil eden bir nesnedir. .then() ve .catch() metodlarıyla kullanılır.' },
  q9: { correct: 1, explanation: 'Python\'da "None" bir değerin yokluğunu belirtir; JavaScript\'teki "null"a karşılık gelir. JavaScript\'teki "undefined" ise Python\'da karşılığı olmayan bir kavramdır.' },
  q10: { correct: 0, explanation: 'Stack (Yığın) LIFO prensibiyle çalışır: Son eklenen eleman ilk çıkarılır. Fonksiyon çağrı yığınları, geri al/yinele işlemleri bu yapıyı kullanır.' },
};

function getDemoAnswer(questionId: string, answer: string, questionIndex: number, consecutiveCorrect: number): AnswerResult {
  const info = DEMO_EXPLANATIONS[questionId];
  const question = DEMO_QUESTIONS.find(q => q.id === questionId);
  if (!info || !question) {
    return { correct: false, explanation: 'Bilinmeyen soru', score: 0, difficulty: 'MEDIUM' };
  }

  const correctAnswer = question.options[info.correct] ?? '';
  const isCorrect = answer === correctAnswer || answer.toLowerCase() === correctAnswer.toLowerCase();

  // Adaptive difficulty logic: increase after 3 consecutive correct
  const newConsecutive = isCorrect ? consecutiveCorrect + 1 : 0;
  let difficulty: Difficulty = 'EASY';
  if (newConsecutive >= 3) difficulty = 'HARD';
  else if (newConsecutive >= 1) difficulty = 'MEDIUM';

  const nextIndex = questionIndex + 1;
  const nextQuestion = DEMO_QUESTIONS[nextIndex];

  return {
    correct: isCorrect,
    explanation: info.explanation,
    nextQuestion: nextQuestion,
    score: isCorrect ? Math.round(100 * (nextIndex) / DEMO_QUESTIONS.length) : Math.round(100 * (nextIndex - 1 < 0 ? 0 : nextIndex - 1) / DEMO_QUESTIONS.length),
    difficulty,
  };
}

function getDemoResult(correctCount: number, totalCount: number, elapsedSeconds: number): SessionResult {
  const pct = totalCount > 0 ? correctCount / totalCount : 0;
  let grade: SessionResult['grade'] = 'F';
  if (pct >= 0.9) grade = 'A';
  else if (pct >= 0.8) grade = 'B';
  else if (pct >= 0.7) grade = 'C';
  else if (pct >= 0.6) grade = 'D';

  const xpEarned = correctCount * 15 + (grade === 'A' ? 50 : grade === 'B' ? 30 : grade === 'C' ? 15 : 0);

  return {
    totalScore: Math.round(pct * 100),
    correctCount,
    totalCount,
    timeSpent: elapsedSeconds,
    grade,
    xpEarned,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function difficultyLabel(d: Difficulty): string {
  return d === 'EASY' ? 'Kolay' : d === 'MEDIUM' ? 'Orta' : 'Zor';
}

function difficultyStyle(d: Difficulty): React.CSSProperties {
  if (d === 'EASY')   return { background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' };
  if (d === 'MEDIUM') return { background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' };
  return { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' };
}

function gradeColor(g: SessionResult['grade']): string {
  return g === 'A'
    ? '#10b981'
    : g === 'B'
    ? '#3b82f6'
    : g === 'C'
    ? '#f59e0b'
    : g === 'D'
    ? '#f97316'
    : '#ef4444';
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_STYLE = `
@keyframes confettiFall {
  0%   { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity: 0; }
}
.confetti-particle {
  position: fixed;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  animation: confettiFall linear forwards;
  pointer-events: none;
  z-index: 9999;
}
@keyframes difficultyPop {
  0%   { opacity: 0; transform: translateY(8px) scale(0.85); }
  60%  { opacity: 1; transform: translateY(-4px) scale(1.08); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.difficulty-pop {
  animation: difficultyPop 0.4s cubic-bezier(.2,.6,.3,1) both;
}
@keyframes xpCount {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.xp-bump { animation: xpCount 0.35s cubic-bezier(.2,.6,.3,1) both; }
`;

interface ConfettiParticle {
  id: number;
  left: number;
  color: string;
  duration: number;
  delay: number;
}

function generateConfetti(): ConfettiParticle[] {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)] ?? '#10b981',
    duration: 2.5 + Math.random() * 2,
    delay: Math.random() * 1.5,
  }));
}

// ─── Setup Phase ──────────────────────────────────────────────────────────────
interface SetupProps {
  onStart: (courseId: string, difficulty: Difficulty, questionCount: number) => void;
  loading: boolean;
}

function SetupPhase({ onStart, loading }: SetupProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [courseId, setCourseId] = useState('');
  const [questionCount, setQuestionCount] = useState(10);

  const diffOptions: { key: Difficulty; label: string; icon: string; desc: string; border: string; bg: string; text: string }[] = [
    { key: 'EASY',   label: 'Kolay',  icon: '🟢', desc: 'Temel kavramlar',     border: '#a7f3d0', bg: '#d1fae5', text: '#065f46' },
    { key: 'MEDIUM', label: 'Orta',   icon: '🟡', desc: 'Orta düzey sorular', border: '#fde68a', bg: '#fef3c7', text: '#92400e' },
    { key: 'HARD',   label: 'Zor',    icon: '🔴', desc: 'İleri seviye',       border: '#fca5a5', bg: '#fee2e2', text: '#991b1b' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Hero */}
      <div
        className="glass hero animate-fade-slide-up"
        style={{ padding: '40px 32px', textAlign: 'center', marginBottom: 24 }}
      >
        <div className="hero-content">
          <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>🧠</div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            margin: '0 0 8px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Adaptif Sınav Motoru
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
            Sana göre zorlanan, sana göre öğreten
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <span className="pill pill-sm">🤖 Yapay Zeka Destekli</span>
            <span className="pill pill-sm pill-dark">⚡ Anlık Adaptasyon</span>
          </div>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className="glass animate-fade-slide-up stagger-1" style={{ padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Başlangıç Zorluğu
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {diffOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setDifficulty(opt.key)}
              style={{
                border: `2px solid ${difficulty === opt.key ? opt.border : 'var(--line)'}`,
                borderRadius: 'var(--r-lg)',
                padding: '16px 12px',
                background: difficulty === opt.key ? opt.bg : 'var(--panel)',
                cursor: 'pointer',
                transition: 'all var(--t-mid)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: difficulty === opt.key ? opt.text : 'var(--ink)' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Course ID */}
      <div className="glass animate-fade-slide-up stagger-2" style={{ padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Kurs Bağlantısı
        </p>
        <input
          type="text"
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          placeholder="Kurs ID (opsiyonel)"
          style={{
            width: '100%',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Question count slider */}
      <div className="glass animate-fade-slide-up stagger-3" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Soru Sayısı
          </p>
          <span style={{
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 'var(--r-full)',
            padding: '2px 10px',
            fontSize: 13,
            fontWeight: 700,
          }}>
            {questionCount}
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={20}
          value={questionCount}
          onChange={e => setQuestionCount(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          <span>5 (Hızlı)</span>
          <span>20 (Kapsamlı)</span>
        </div>
      </div>

      {/* Start button */}
      <div className="animate-fade-slide-up stagger-4">
        <button
          onClick={() => onStart(courseId, difficulty, questionCount)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? 'var(--muted)' : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none',
            borderRadius: 'var(--r-lg)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all var(--t-mid)',
            boxShadow: loading ? 'none' : 'var(--glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Hazırlanıyor...
            </>
          ) : (
            <>🚀 Sınava Başla</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Quiz Phase ───────────────────────────────────────────────────────────────
interface QuizProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  difficulty: Difficulty;
  elapsedSeconds: number;
  xp: number;
  difficultyChanged: 'up' | 'down' | null;
  onAnswer: (answer: string) => void;
  answerResult: AnswerResult | null;
  onNext: () => void;
  loadingAnswer: boolean;
}

function QuizPhase({
  question,
  questionIndex,
  totalQuestions,
  score,
  difficulty,
  elapsedSeconds,
  xp,
  difficultyChanged,
  onAnswer,
  answerResult,
  onNext,
  loadingAnswer,
}: QuizProps) {
  const [selected, setSelected] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState('');

  // Reset on new question
  useEffect(() => {
    setSelected('');
    setShortAnswer('');
  }, [question.id]);

  const handleSubmit = () => {
    const ans = question.type === 'SHORT_ANSWER' ? shortAnswer : selected;
    if (!ans.trim()) return;
    onAnswer(ans);
  };

  const correctAnswer = answerResult
    ? (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE')
      ? question.options.find(o => o === answerResult.correct ? selected : null) // just highlight from result
      : null
    : null;
  void correctAnswer;

  const progressPct = ((questionIndex) / totalQuestions) * 100;

  const optionLabel = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Progress bar & meta */}
      <div className="glass animate-fade-slide-up" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Soru {questionIndex + 1}<span style={{ color: 'var(--muted)', fontWeight: 400 }}>/{totalQuestions}</span>
            </span>
            {difficultyChanged && (
              <span
                className="pill pill-sm difficulty-pop"
                key={`${difficultyChanged}-${questionIndex}`}
                style={{
                  background: difficultyChanged === 'up' ? '#fee2e2' : '#d1fae5',
                  borderColor: difficultyChanged === 'up' ? '#fca5a5' : '#a7f3d0',
                  color: difficultyChanged === 'up' ? '#991b1b' : '#065f46',
                }}
              >
                {difficultyChanged === 'up' ? '↑ Zorluk arttı' : '↓ Zorluk azaldı'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="pill pill-sm"
              style={difficultyStyle(difficulty)}
            >
              {difficultyLabel(difficulty)}
            </span>
            <span className="pill pill-sm pill-dark">⏱ {formatTime(elapsedSeconds)}</span>
            <span
              className={`pill pill-sm${answerResult && answerResult.correct ? ' xp-bump' : ''}`}
              style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              ⚡ {xp} XP
            </span>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
          <span>İlerleme</span>
          <span>Puan: {score}</span>
        </div>
      </div>

      {/* Question card */}
      <div className="glass animate-fade-slide-up stagger-1" style={{ padding: 28, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          {question.type === 'MULTIPLE_CHOICE' ? '📋 Çoktan Seçmeli' : question.type === 'TRUE_FALSE' ? '⚖️ Doğru / Yanlış' : '✍️ Kısa Yanıt'}
        </p>
        <p style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.5, margin: 0, color: 'var(--ink)' }}>
          {question.text}
        </p>
      </div>

      {/* Options */}
      {question.type === 'MULTIPLE_CHOICE' && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {question.options.map((opt, i) => {
            let borderColor = 'var(--line)';
            let bg = 'var(--panel)';
            let textColor = 'var(--ink)';

            if (answerResult) {
              const isCorrectOpt = i === (DEMO_EXPLANATIONS[question.id]?.correct ?? -1);
              if (opt === selected) {
                if (answerResult.correct) { borderColor = '#10b981'; bg = '#d1fae5'; textColor = '#065f46'; }
                else { borderColor = '#ef4444'; bg = '#fee2e2'; textColor = '#991b1b'; }
              } else if (isCorrectOpt) {
                borderColor = '#10b981'; bg = '#d1fae5'; textColor = '#065f46';
              }
            } else if (opt === selected) {
              borderColor = 'var(--accent-2)';
              bg = 'var(--accent-2-soft)';
              textColor = 'var(--accent-2)';
            }

            return (
              <button
                key={opt}
                onClick={() => !answerResult && setSelected(opt)}
                disabled={!!answerResult}
                className="animate-fade-slide-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  border: `2px solid ${borderColor}`,
                  borderRadius: 'var(--r-lg)',
                  background: bg,
                  color: textColor,
                  cursor: answerResult ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all var(--t-mid)',
                  width: '100%',
                }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--r-full)',
                  border: `1.5px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: opt === selected && !answerResult ? 'var(--accent-2)' : 'transparent',
                  color: opt === selected && !answerResult ? '#fff' : textColor,
                }}>
                  {optionLabel[i]}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'TRUE_FALSE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {question.options.map((opt) => {
            const isTrue = opt === 'Doğru';
            let borderColor = 'var(--line)';
            let bg = 'var(--panel)';
            let textColor = 'var(--ink)';

            if (answerResult) {
              const correctIdx = DEMO_EXPLANATIONS[question.id]?.correct ?? 0;
              const correctOpt = question.options[correctIdx];
              if (opt === selected) {
                if (answerResult.correct) { borderColor = '#10b981'; bg = '#d1fae5'; textColor = '#065f46'; }
                else { borderColor = '#ef4444'; bg = '#fee2e2'; textColor = '#991b1b'; }
              } else if (opt === correctOpt) {
                borderColor = '#10b981'; bg = '#d1fae5'; textColor = '#065f46';
              }
            } else if (opt === selected) {
              borderColor = 'var(--accent-2)';
              bg = 'var(--accent-2-soft)';
              textColor = 'var(--accent-2)';
            }

            return (
              <button
                key={opt}
                onClick={() => !answerResult && setSelected(opt)}
                disabled={!!answerResult}
                className="animate-fade-slide-up"
                style={{
                  animationDelay: isTrue ? '0ms' : '60ms',
                  padding: '22px 16px',
                  border: `2px solid ${borderColor}`,
                  borderRadius: 'var(--r-lg)',
                  background: bg,
                  color: textColor,
                  cursor: answerResult ? 'default' : 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                  transition: 'all var(--t-mid)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 28 }}>{isTrue ? '✅' : '❌'}</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'SHORT_ANSWER' && (
        <div className="glass animate-fade-slide-up stagger-2" style={{ padding: 20, marginBottom: 16 }}>
          <input
            type="text"
            value={shortAnswer}
            onChange={e => setShortAnswer(e.target.value)}
            disabled={!!answerResult}
            placeholder="Cevabınızı buraya yazın..."
            onKeyDown={e => { if (e.key === 'Enter' && !answerResult) handleSubmit(); }}
            style={{
              width: '100%',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              padding: '12px 16px',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Explanation card */}
      {answerResult && (
        <div
          className="animate-fade-slide-up"
          style={{
            padding: '18px 20px',
            border: `1.5px solid ${answerResult.correct ? '#a7f3d0' : '#fca5a5'}`,
            borderRadius: 'var(--r-lg)',
            background: answerResult.correct ? '#d1fae5' : '#fee2e2',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: answerResult.correct ? '#065f46' : '#991b1b' }}>
            <span style={{ fontSize: 20 }}>{answerResult.correct ? '🎉' : '❗'}</span>
            {answerResult.correct ? 'Doğru Cevap!' : 'Yanlış Cevap'}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: answerResult.correct ? '#065f46' : '#991b1b', lineHeight: 1.6 }}>
            {answerResult.explanation}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!answerResult ? (
        <button
          onClick={handleSubmit}
          disabled={loadingAnswer || (question.type !== 'SHORT_ANSWER' ? !selected : !shortAnswer.trim())}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none',
            borderRadius: 'var(--r-lg)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: (!selected && question.type !== 'SHORT_ANSWER') || (!shortAnswer.trim() && question.type === 'SHORT_ANSWER') || loadingAnswer ? 'not-allowed' : 'pointer',
            opacity: (!selected && question.type !== 'SHORT_ANSWER') || (!shortAnswer.trim() && question.type === 'SHORT_ANSWER') ? 0.55 : 1,
            transition: 'all var(--t-mid)',
            boxShadow: 'var(--glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {loadingAnswer ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Kontrol ediliyor...
            </>
          ) : '✔ Cevapla'}
        </button>
      ) : (
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, var(--accent-2), var(--accent))',
            border: 'none',
            borderRadius: 'var(--r-lg)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--t-mid)',
            boxShadow: 'var(--glow-blue)',
          }}
        >
          Sonraki Soru →
        </button>
      )}
    </div>
  );
}

// ─── Results Phase ────────────────────────────────────────────────────────────
interface ResultsProps {
  result: SessionResult;
  onRetry: () => void;
}

function ResultsPhase({ result, onRetry }: ResultsProps) {
  const [animXp, setAnimXp] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    // Animate XP counter
    let current = 0;
    const step = Math.ceil(result.xpEarned / 40);
    const interval = setInterval(() => {
      current = Math.min(current + step, result.xpEarned);
      setAnimXp(current);
      if (current >= result.xpEarned) clearInterval(interval);
    }, 40);

    // Confetti for A grade
    if (result.grade === 'A') {
      setConfetti(generateConfetti());
      const t = setTimeout(() => setConfetti([]), 4500);
      return () => { clearInterval(interval); clearTimeout(t); };
    }

    return () => clearInterval(interval);
  }, [result]);

  const correctPct = result.totalCount > 0 ? Math.round((result.correctCount / result.totalCount) * 100) : 0;
  const wrongCount = result.totalCount - result.correctCount;
  const color = gradeColor(result.grade);

  const metrics = [
    { label: 'Doğru', value: result.correctCount, icon: '✅', color: '#10b981' },
    { label: 'Yanlış', value: wrongCount, icon: '❌', color: '#ef4444' },
    { label: 'Süre', value: formatTime(result.timeSpent), icon: '⏱', color: 'var(--accent-2)' },
    { label: 'XP Kazanılan', value: `+${animXp}`, icon: '⚡', color: '#f59e0b' },
  ];

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Confetti */}
      {confetti.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            top: 0,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Grade circle */}
      <div className="glass hero animate-fade-slide-up" style={{ padding: '40px 32px', textAlign: 'center', marginBottom: 20 }}>
        <div className="hero-content">
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `6px solid ${color}`,
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 0 40px color-mix(in srgb, ${color} 35%, transparent)`,
              animation: 'scaleIn 0.5s cubic-bezier(.2,.6,.3,1) both',
            }}
          >
            <span style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1 }}>{result.grade}</span>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>
            {result.grade === 'A' ? '🏆 Mükemmel!' : result.grade === 'B' ? '🎯 Çok İyi!' : result.grade === 'C' ? '👍 İyi!' : result.grade === 'D' ? '💪 Gelişiyor!' : '📚 Tekrar Dene!'}
          </h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 15 }}>
            {result.correctCount}/{result.totalCount} soruyu doğru cevapladın
          </p>
          <div style={{ marginTop: 16 }}>
            <div className="progress-track" style={{ height: 10 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${correctPct}%`,
                  background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, var(--accent-2)))`,
                }}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>{correctPct}% başarı oranı</p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`metric animate-fade-slide-up stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
          >
            <div className="label">{m.icon} {m.label}</div>
            <div className="value" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="animate-fade-slide-up stagger-4">
        <button
          onClick={onRetry}
          style={{
            padding: '14px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none',
            borderRadius: 'var(--r-lg)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--glow)',
          }}
        >
          🔄 Tekrar Dene
        </button>
        <Link
          href="/courses"
          style={{
            padding: '14px',
            border: '1.5px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            color: 'var(--ink)',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--panel)',
            textDecoration: 'none',
          }}
        >
          📚 Kursa Dön
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdaptiveQuizPage() {
  const [phase, setPhase] = useState<Phase>('SETUP');
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [difficultyChanged, setDifficultyChanged] = useState<'up' | 'down' | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [xp, setXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Timer
  useEffect(() => {
    if (phase === 'QUIZ') {
      startTimeRef.current = Date.now() - elapsedSeconds * 1000;
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleStart = useCallback(async (courseId: string, diff: Difficulty, qCount: number) => {
    setLoadingStart(true);
    setDifficulty(diff);
    setTotalQuestions(qCount);

    try {
      const res = await apiFetch<{ sessionId: string; question: Question }>('/quiz/adaptive/start', {
        ...(courseId ? { courseId } : {}),
        difficulty: diff,
      });
      setSessionId(res.sessionId);
      setCurrentQuestion(res.question);
    } catch {
      // Demo fallback
      const demoId = `demo-${Date.now()}`;
      setSessionId(demoId);
      setCurrentQuestion(DEMO_QUESTIONS[0] ?? null);
    }

    setQuestionIndex(0);
    setScore(0);
    setXp(0);
    setCorrectCount(0);
    setConsecutiveCorrect(0);
    setAnswerResult(null);
    setElapsedSeconds(0);
    setDifficultyChanged(null);
    setLoadingStart(false);
    setPhase('QUIZ');
  }, []);

  const handleAnswer = useCallback(async (answer: string) => {
    if (!currentQuestion || !sessionId) return;
    setLoadingAnswer(true);

    try {
      const res = await apiFetch<AnswerResult>('/quiz/adaptive/answer', {
        sessionId,
        questionId: currentQuestion.id,
        answer,
      });
      setAnswerResult(res);

      if (res.correct) {
        setCorrectCount(c => c + 1);
        setXp(x => x + 15);
        setConsecutiveCorrect(c => c + 1);
      } else {
        setConsecutiveCorrect(0);
      }

      // Detect difficulty change
      const newDiff = res.difficulty as Difficulty;
      if (newDiff !== difficulty) {
        setDifficultyChanged(newDiff === 'HARD' || (newDiff === 'MEDIUM' && difficulty === 'EASY') ? 'up' : 'down');
        setTimeout(() => setDifficultyChanged(null), 3000);
      }
      setDifficulty(newDiff);
      setScore(res.score);
    } catch {
      // Demo fallback
      const res = getDemoAnswer(currentQuestion.id, answer, questionIndex, consecutiveCorrect);
      setAnswerResult(res);

      if (res.correct) {
        setCorrectCount(c => c + 1);
        setXp(x => x + 15);
        setConsecutiveCorrect(c => {
          const next = c + 1;
          if (next % 3 === 0) {
            setDifficultyChanged('up');
            setTimeout(() => setDifficultyChanged(null), 3000);
          }
          return next;
        });
      } else {
        if (consecutiveCorrect > 0) {
          setDifficultyChanged('down');
          setTimeout(() => setDifficultyChanged(null), 3000);
        }
        setConsecutiveCorrect(0);
      }

      const newDiff = res.difficulty;
      setDifficulty(newDiff);
      setScore(res.score);
    }

    setLoadingAnswer(false);
  }, [currentQuestion, sessionId, difficulty, questionIndex, consecutiveCorrect]);

  const handleNext = useCallback(async () => {
    const nextIndex = questionIndex + 1;

    if (nextIndex >= totalQuestions || !answerResult?.nextQuestion) {
      // Finish quiz
      try {
        const res = await apiFetch<SessionResult>('/quiz/adaptive/finish', { sessionId });
        setSessionResult(res);
      } catch {
        // Demo fallback
        const res = getDemoResult(correctCount, nextIndex > totalQuestions ? totalQuestions : nextIndex, elapsedSeconds);
        setSessionResult(res);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('RESULTS');
      return;
    }

    setCurrentQuestion(answerResult.nextQuestion ?? DEMO_QUESTIONS[nextIndex] ?? null);
    setQuestionIndex(nextIndex);
    setAnswerResult(null);
  }, [questionIndex, totalQuestions, answerResult, sessionId, correctCount, elapsedSeconds]);

  const handleRetry = useCallback(() => {
    setPhase('SETUP');
    setSessionId('');
    setCurrentQuestion(null);
    setQuestionIndex(0);
    setScore(0);
    setXp(0);
    setCorrectCount(0);
    setConsecutiveCorrect(0);
    setAnswerResult(null);
    setSessionResult(null);
    setElapsedSeconds(0);
    setDifficultyChanged(null);
  }, []);

  return (
    <>
      <style>{CONFETTI_STYLE}</style>
      <div className="bg-canvas" />
      <div className="bg-grid" />

      <div className="page-shell" style={{ paddingTop: 24 }}>
        {/* Top nav breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="back-btn">← Dashboard</Link>
          <span className="sep">›</span>
          <span className="pill pill-sm">🧠 Adaptif Sınav</span>
          {phase === 'QUIZ' && (
            <>
              <span className="sep">›</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Aktif Oturum</span>
            </>
          )}
          {phase === 'RESULTS' && (
            <>
              <span className="sep">›</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sonuçlar</span>
            </>
          )}
        </div>

        {/* Loading skeleton for SETUP while starting */}
        {phase === 'SETUP' && loadingStart && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="skeleton" style={{ height: 200, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 120, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        )}

        {/* SETUP */}
        {phase === 'SETUP' && !loadingStart && (
          <SetupPhase onStart={handleStart} loading={loadingStart} />
        )}

        {/* QUIZ */}
        {phase === 'QUIZ' && currentQuestion && (
          <QuizPhase
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            score={score}
            difficulty={difficulty}
            elapsedSeconds={elapsedSeconds}
            xp={xp}
            difficultyChanged={difficultyChanged}
            onAnswer={handleAnswer}
            answerResult={answerResult}
            onNext={handleNext}
            loadingAnswer={loadingAnswer}
          />
        )}

        {/* Loading quiz state */}
        {phase === 'QUIZ' && !currentQuestion && (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 120, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 48 }} />
          </div>
        )}

        {/* RESULTS */}
        {phase === 'RESULTS' && sessionResult && (
          <ResultsPhase result={sessionResult} onRetry={handleRetry} />
        )}
      </div>
    </>
  );
}
