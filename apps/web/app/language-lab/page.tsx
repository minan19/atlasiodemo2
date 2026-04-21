'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisResult {
  score: number;
  feedback: {
    pronunciation: string;
    grammar: string;
  };
}

interface HistoryEntry {
  id: string;
  type: string;
  score: number;
  transcription: string;
  aiFeedback: { pronunciation: string; grammar: string } | string;
  createdAt: string;
}

// ─── Demo / fallback data ─────────────────────────────────────────────────────

const DEMO_HISTORY: HistoryEntry[] = [
  {
    id: '1',
    type: 'SPEAKING',
    score: 87,
    transcription: 'Merhaba, nasılsınız?',
    aiFeedback: { pronunciation: 'Mükemmel', grammar: 'Doğru kullanım' },
    createdAt: '2026-03-25T10:00:00Z',
  },
  {
    id: '2',
    type: 'SPEAKING',
    score: 64,
    transcription: 'Ben okula gidiyorum.',
    aiFeedback: { pronunciation: 'Geliştirilmeli', grammar: 'Doğru kullanım' },
    createdAt: '2026-03-24T14:30:00Z',
  },
  {
    id: '3',
    type: 'SPEAKING',
    score: 92,
    transcription: 'Türkçe öğrenmek çok eğlenceli.',
    aiFeedback: { pronunciation: 'Mükemmel', grammar: 'Mükemmel' },
    createdAt: '2026-03-23T09:15:00Z',
  },
];

const FAKE_AUDIO_BASE64 = 'c2ltdWxhdGVk';

// ─── Helper: auth token ────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Score colour ──────────────────────────────────────────────────────────────

function scoreColor(score: number): { ring: string; badge: string; text: string } {
  if (score > 80)
    return {
      ring: '#C8A96A',
      badge: 'bg-amber-50 border-amber-200 text-amber-700',
      text: 'text-amber-600',
    };
  if (score > 50)
    return {
      ring: '#f59e0b',
      badge: 'bg-amber-50 border-amber-200 text-amber-700',
      text: 'text-amber-600',
    };
  return {
    ring: '#ef4444',
    badge: 'bg-red-50 border-red-200 text-red-700',
    text: 'text-red-600',
  };
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  const { ring, text } = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        {/* Track */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-100"
        />
        {/* Progress */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold leading-none ${text}`}>{score}</span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        active
          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200'
          : 'text-slate-500 hover:text-violet-700 hover:bg-violet-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─── Feedback badge ────────────────────────────────────────────────────────────

function FeedbackBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 backdrop-blur">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function LanguageLabPage() {
  const t = useI18n();
  const [activeTab, setActiveTab] = useState<'pronunciation' | 'transcription' | 'history'>('pronunciation');

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <header className="glass hero p-6 rounded-2xl">
        <div className="hero-content flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="pill w-fit">
              <span className="status-dot online" />
              <span>{t.tr("Dil Laboratuvarı · AI Konuşma Koçu")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.languageLab.title}
              <span
                className="block text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(120deg, #7c3aed, #4f46e5)' }}
              >
                {t.tr("AI Konuşma Koçu")}
              </span>
            </h1>
            <p className="text-sm text-slate-500 max-w-md">
              {t.languageLab.subtitle}
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2">
            <span className="pill pill-sm" style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)', color: '#7c3aed' }}>
              {t.tr("🎙 Ses Analizi")}
            </span>
            <span className="pill pill-sm" style={{ background: 'rgba(79,70,229,0.08)', borderColor: 'rgba(79,70,229,0.25)', color: '#4f46e5' }}>
              {t.tr("🤖 AI Koçluk")}
            </span>
            <span className="pill pill-sm" style={{ background: 'rgba(16,169,123,0.08)', borderColor: 'rgba(16,169,123,0.25)', color: '#10a97b' }}>
              📊 Skor Takibi
            </span>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="glass rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
        <TabBtn active={activeTab === 'pronunciation'} onClick={() => setActiveTab('pronunciation')}>
          {t.tr("🎤 Telaffuz Analizi")}
        </TabBtn>
        <TabBtn active={activeTab === 'transcription'} onClick={() => setActiveTab('transcription')}>
          {t.tr("🎙 Canlı Transkripsiyon")}
        </TabBtn>
        <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
          {t.tr("📋 Geçmiş")}
        </TabBtn>
      </div>

      {/* Tab panels */}
      <div className="glass rounded-2xl p-6">
        {activeTab === 'pronunciation' && <PronunciationTab />}
        {activeTab === 'transcription' && <TranscriptionTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — Pronunciation Analysis
// ═══════════════════════════════════════════════════════════════

function PronunciationTab() {
  const t = useI18n();
  const [expectedText, setExpectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleAnalyze() {
    if (!expectedText.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setIsDemo(false);

    try {
      const res = await fetch(`${API_BASE}/language-lab/analyze-speech`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ audioBase64: FAKE_AUDIO_BASE64, expectedText: expectedText.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
    } catch {
      // Demo fallback
      const demoScore = Math.floor(55 + Math.random() * 40);
      setResult({
        score: demoScore,
        feedback: {
          pronunciation: demoScore > 80 ? t.tr('Mükemmel telaffuz') : demoScore > 60 ? t.tr('İyi, geliştirebilirsin') : t.tr('Pratik yapman önerilir'),
          grammar: demoScore > 75 ? t.tr('Doğru kullanım') : t.tr('Bazı hatalar mevcut'),
        },
      });
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }

  const scoreInfo = result ? scoreColor(result.score) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-800">{t.tr("Telaffuz Analizi")}</h2>
        <p className="text-sm text-slate-500">{t.tr("Hedef metni gir, ses kaydını simüle et ve AI koçundan anında geri bildirim al.")}</p>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t.tr("Hedef Metin")}
        </label>
        <textarea
          value={expectedText}
          onChange={(e) => setExpectedText(e.target.value)}
          placeholder={t.tr("Okumak istediğiniz metni yazın...")}
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
        />
      </div>

      {/* Record button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAnalyze}
          disabled={!expectedText.trim() || loading}
          className="btn-link disabled:opacity-50 disabled:cursor-not-allowed"
          style={expectedText.trim() && !loading ? { borderColor: '#7c3aed', color: '#7c3aed' } : undefined}
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              Analiz ediliyor...
            </>
          ) : (
            <>
              <span>🎤</span>
              Ses Kaydını Simüle Et
            </>
          )}
        </button>

        {isDemo && (
          <span className="pill pill-sm" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#b45309' }}>
            ⚡ Demo modu
          </span>
        )}
      </div>

      {/* Result card */}
      {result && (
        <div
          className="rounded-2xl border bg-white/80 p-6 space-y-5 backdrop-blur"
          style={{ borderColor: scoreInfo?.ring + '40', boxShadow: `0 8px 32px ${scoreInfo?.ring}18` }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Ring */}
            <div className="flex-shrink-0">
              <ScoreRing score={result.score} />
            </div>

            {/* Feedback */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Genel Puan</p>
                <p className={`text-xl font-extrabold ${scoreInfo?.text}`}>
                  {result.score > 80 ? 'Harika!' : result.score > 50 ? 'İyi Çalışma' : 'Gelişim Gerekli'}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <FeedbackBadge label="Telaffuz" value={result.feedback.pronunciation} />
                <FeedbackBadge label="Dilbilgisi" value={result.feedback.grammar} />
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Başarı oranı</span>
              <span className={`font-semibold ${scoreInfo?.text}`}>{result.score}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${result.score}%`, background: `linear-gradient(90deg, ${scoreInfo?.ring}, ${scoreInfo?.ring}cc)` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — Live Transcription
// ═══════════════════════════════════════════════════════════════

function TranscriptionTab() {
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [tickCount, setTickCount] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const DEMO_PHRASES = [
    'Merhaba, bu bir test.',
    ' Türkçe konuşmak çok güzel.',
    ' Dil öğrenmek sabır gerektirir.',
    ' Her gün pratik yapmak önemlidir.',
    ' AI destekli koçluk harika bir araç.',
    ' Telaffuzumu geliştirmek istiyorum.',
  ];

  const fetchTranscription = useCallback(async (tick: number) => {
    try {
      const res = await fetch(`${API_BASE}/language-lab/live-transcription`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ audioBase64: FAKE_AUDIO_BASE64 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { text: string };
      if (data.text) {
        setTranscript((prev) => prev + (prev ? ' ' : '') + data.text);
        setIsDemo(false);
      }
    } catch {
      // Demo fallback: cycle through phrases
      const phrase = DEMO_PHRASES[tick % DEMO_PHRASES.length];
      setTranscript((prev) => prev + phrase);
      setIsDemo(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    setRunning(true);
    setTickCount(0);
    // Fetch immediately then every 3s
    fetchTranscription(0);
    intervalRef.current = setInterval(() => {
      setTickCount((c) => {
        fetchTranscription(c + 1);
        return c + 1;
      });
    }, 3000);
  }

  function handleStop() {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleClear() {
    handleStop();
    setTranscript('');
    setIsDemo(false);
    setTickCount(0);
  }

  // Auto-scroll textarea to bottom
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-800">Canlı Transkripsiyon</h2>
        <p className="text-sm text-slate-500">
          Başlat düğmesine bas — ses her 3 saniyede bir işlenerek metin alanına eklenir.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <button
            onClick={handleStart}
            className="btn-link"
            style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
          >
            <span>🎙</span>
            Transkripsiyon Başlat
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="btn-link"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            <span className="inline-block w-3 h-3 rounded bg-red-500" />
            Durdur
          </button>
        )}

        <button
          onClick={handleClear}
          className="btn-link text-slate-500"
          disabled={running}
        >
          🗑 Temizle
        </button>

        {running && (
          <span className="pill pill-sm flex items-center gap-2" style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.3)', color: '#7c3aed' }}>
            <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            Dinleniyor…
          </span>
        )}

        {isDemo && (
          <span className="pill pill-sm" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#b45309' }}>
            ⚡ Demo modu
          </span>
        )}
      </div>

      {/* Transcript area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Transkript
          </label>
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span>{wordCount} kelime</span>
            <span>{charCount} karakter</span>
          </div>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            readOnly
            value={transcript}
            placeholder="Transkripsiyon başlatıldığında metin burada görünecek…"
            rows={10}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none transition-all font-mono leading-relaxed"
          />
          {running && (
            <div className="absolute bottom-3 right-4 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>

      {/* Tick info */}
      {tickCount > 0 && (
        <p className="text-[11px] text-slate-400">
          {tickCount} transkripsiyon döngüsü tamamlandı
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — History
// ═══════════════════════════════════════════════════════════════

function HistoryTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/language-lab/history`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HistoryEntry[];
        if (!cancelled) {
          setHistory(data);
          setIsDemo(false);
        }
      } catch {
        if (!cancelled) {
          setHistory(DEMO_HISTORY);
          setIsDemo(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function parseFeedback(aiFeedback: HistoryEntry['aiFeedback']): { pronunciation: string; grammar: string } {
    if (typeof aiFeedback === 'string') {
      try {
        return JSON.parse(aiFeedback);
      } catch {
        return { pronunciation: aiFeedback, grammar: '—' };
      }
    }
    return aiFeedback;
  }

  function typeLabel(type: string): string {
    const map: Record<string, string> = {
      SPEAKING: 'Konuşma',
      READING: 'Okuma',
      LISTENING: 'Dinleme',
      WRITING: 'Yazma',
    };
    return map[type] ?? type;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-slate-800">Geçmiş Kayıtlar</h2>
          <p className="text-sm text-slate-500">Tüm konuşma analizi geçmişin burada listelenir.</p>
        </div>
        {isDemo && (
          <span className="pill pill-sm" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#b45309' }}>
            ⚡ Demo verisi
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="text-5xl opacity-30">🎙</div>
          <p className="text-slate-500 font-medium">Henüz kayıt yok</p>
          <p className="text-sm text-slate-400">İlk telaffuz analizini yaptıktan sonra burada görünecek.</p>
        </div>
      )}

      {/* Table */}
      {!loading && history.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tür</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Skor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Transkripsiyon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Telaffuz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dilbilgisi</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, idx) => {
                const feedback = parseFeedback(entry.aiFeedback);
                const { badge, text } = scoreColor(entry.score);
                return (
                  <tr
                    key={entry.id}
                    className={[
                      'border-b border-slate-100 transition-colors hover:bg-violet-50/40',
                      idx % 2 === 0 ? 'bg-white/60' : 'bg-slate-50/40',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[12px]">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="pill pill-xs pill-dark">{typeLabel(entry.type)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${text.replace('text-', 'bg-')}`} />
                        {entry.score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px]">
                      <span className="truncate block" title={entry.transcription}>
                        {entry.transcription}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{feedback.pronunciation}</td>
                    <td className="px-4 py-3 text-slate-600">{feedback.grammar}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary row */}
      {!loading && history.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="metric flex-1 min-w-[120px]">
            <span className="label">Toplam Kayıt</span>
            <span className="value" style={{ color: '#7c3aed' }}>{history.length}</span>
          </div>
          <div className="metric flex-1 min-w-[120px]">
            <span className="label">Ortalama Skor</span>
            <span
              className="value"
              style={{ color: scoreColor(Math.round(history.reduce((s, e) => s + e.score, 0) / history.length)).ring }}
            >
              {Math.round(history.reduce((s, e) => s + e.score, 0) / history.length)}
            </span>
          </div>
          <div className="metric flex-1 min-w-[120px]">
            <span className="label">En Yüksek Skor</span>
            <span className="value" style={{ color: '#22c55e' }}>
              {Math.max(...history.map((e) => e.score))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
