'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

/* ── Config ───────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ── Types ────────────────────────────────────────────────────── */

interface SafetyStats {
  totalChecks: number;
  flagged: number;
  blocked: number;
  piiMasked: number;
  safeRate: number;
}

interface CheckResult {
  safe: boolean;
  flags: string[];
  score: number;
}

interface MaskResult {
  masked: string;
  detectedTypes: string[];
}

interface ModelResult {
  approved: boolean;
  issues: string[];
}

type TabId = 'input' | 'output' | 'pii' | 'model';

/* ── Demo data ────────────────────────────────────────────────── */

const DEMO_STATS: SafetyStats = {
  totalChecks: 14_823,
  flagged: 312,
  blocked: 87,
  piiMasked: 2_041,
  safeRate: 97.9,
};

/* ── Demo logic helpers ───────────────────────────────────────── */

const DEMO_KEYWORDS = ['şiddet', 'nefret', 'spam', 'hakaret', 'tehdit', 'saldırı'];

function demoCheckText(text: string): CheckResult {
  const lower = text.toLowerCase();
  const found = DEMO_KEYWORDS.filter((kw) => lower.includes(kw));
  const safe = found.length === 0;
  const score = safe ? 0.95 - Math.random() * 0.1 : 0.25 + Math.random() * 0.3;
  return { safe, flags: found, score: parseFloat(score.toFixed(2)) };
}

function demoMaskPii(text: string): MaskResult {
  const detectedTypes: string[] = [];
  let masked = text;

  // Email
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  if (emailRe.test(text)) {
    detectedTypes.push('E-POSTA');
    masked = masked.replace(
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      '[E-POSTA]',
    );
  }

  // Turkish phone numbers
  const phoneRe = /(\+?90[\s\-]?)?(\(0?\d{3}\)|0?\d{3})[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g;
  if (phoneRe.test(text)) {
    detectedTypes.push('TELEFON');
    masked = masked.replace(
      /(\+?90[\s\-]?)?(\(0?\d{3}\)|0?\d{3})[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
      '[TELEFON]',
    );
  }

  // Turkish TC Identity No (11 digits, starts with non-zero)
  const tcRe = /\b[1-9]\d{10}\b/g;
  if (tcRe.test(text)) {
    detectedTypes.push('TC KİMLİK');
    masked = masked.replace(/\b[1-9]\d{10}\b/g, '[TC KİMLİK]');
  }

  // Credit card (basic 16-digit pattern)
  const ccRe = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g;
  if (ccRe.test(text)) {
    detectedTypes.push('KART NO');
    masked = masked.replace(/\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g, '[KART NO]');
  }

  return { masked, detectedTypes };
}

const APPROVED_MODELS = ['gpt-4o', 'claude-3-5', 'gpt-3.5-turbo'];
const RISKY_MODELS = ['llama-3', 'mistral-7b', 'falcon-40b'];

function demoCheckModel(modelId: string): ModelResult {
  const lower = modelId.toLowerCase().trim();
  if (APPROVED_MODELS.some((m) => lower.includes(m.toLowerCase()))) {
    return { approved: true, issues: [] };
  }
  if (RISKY_MODELS.some((m) => lower.includes(m.toLowerCase()))) {
    return {
      approved: false,
      issues: [
        'Model güvenlik politikasında onaylanmamış',
        'Bias değerlendirmesi tamamlanmamış',
        'Çıktı kalite garantisi eksik',
      ],
    };
  }
  return {
    approved: false,
    issues: ['Bilinmeyen model — değerlendirme gerekiyor', 'Güvenlik denetimi bekleniyor'],
  };
}

/* ── Score ring ───────────────────────────────────────────────── */

interface ScoreRingProps {
  score: number;
  safe: boolean;
}

function ScoreRing({ score, safe }: ScoreRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const fill = score * circumference;
  const color = safe
    ? score >= 0.8
      ? '#C8A96A' // gold
      : '#f59e0b' // amber
    : score >= 0.5
    ? '#f59e0b'
    : '#ef4444'; // red

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${fill} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="text-center -mt-20 pb-16">
        <span className="text-2xl font-extrabold" style={{ color }}>
          {Math.round(score * 100)}
        </span>
        <span className="text-xs text-slate-400 block">/ 100</span>
      </div>
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  bg: string;
  valueColor: string;
  stagger: string;
}

function StatCard({ label, value, icon, bg, valueColor, stagger }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm animate-fade-slide-up ${stagger} ${bg}`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

/* ── Skeleton strip ───────────────────────────────────────────── */

function StatsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-100 p-5 shadow-sm animate-pulse"
        >
          <div className="skeleton h-3 w-24 rounded mb-3" />
          <div className="skeleton h-8 w-16 rounded" />
        </div>
      ))}
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function AiSafetyPage() {
  const t = useI18n();
  /* stats */
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  /* tab */
  const [activeTab, setActiveTab] = useState<TabId>('input');

  /* input check */
  const [inputText, setInputText] = useState('');
  const [inputResult, setInputResult] = useState<CheckResult | null>(null);
  const [inputLoading, setInputLoading] = useState(false);

  /* output check */
  const [outputText, setOutputText] = useState('');
  const [outputResult, setOutputResult] = useState<CheckResult | null>(null);
  const [outputLoading, setOutputLoading] = useState(false);

  /* pii */
  const [piiText, setPiiText] = useState('');
  const [piiResult, setPiiResult] = useState<MaskResult | null>(null);
  const [piiLoading, setPiiLoading] = useState(false);

  /* model */
  const [modelId, setModelId] = useState('');
  const [modelResult, setModelResult] = useState<ModelResult | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  /* ── Load stats ── */
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const data = await apiFetch<SafetyStats>('/ai-safety/stats');
        if (!cancelled) {
          setStats(data);
          setIsDemo(false);
        }
      } catch {
        if (!cancelled) {
          setStats(DEMO_STATS);
          setIsDemo(true);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  /* ── Input check ── */
  const handleInputCheck = useCallback(async () => {
    if (!inputText.trim()) return;
    setInputLoading(true);
    setInputResult(null);
    try {
      const data = await apiFetch<CheckResult>('/ai-safety/check-input', {
        method: 'POST',
        body: JSON.stringify({ text: inputText }),
      });
      setInputResult(data);
    } catch {
      setInputResult(demoCheckText(inputText));
    } finally {
      setInputLoading(false);
    }
  }, [inputText]);

  /* ── Output check ── */
  const handleOutputCheck = useCallback(async () => {
    if (!outputText.trim()) return;
    setOutputLoading(true);
    setOutputResult(null);
    try {
      const data = await apiFetch<CheckResult>('/ai-safety/check-output', {
        method: 'POST',
        body: JSON.stringify({ text: outputText }),
      });
      setOutputResult(data);
    } catch {
      setOutputResult(demoCheckText(outputText));
    } finally {
      setOutputLoading(false);
    }
  }, [outputText]);

  /* ── PII mask ── */
  const handlePiiMask = useCallback(async () => {
    if (!piiText.trim()) return;
    setPiiLoading(true);
    setPiiResult(null);
    try {
      const data = await apiFetch<MaskResult>('/ai-safety/mask-pii', {
        method: 'POST',
        body: JSON.stringify({ text: piiText }),
      });
      setPiiResult(data);
    } catch {
      setPiiResult(demoMaskPii(piiText));
    } finally {
      setPiiLoading(false);
    }
  }, [piiText]);

  /* ── Model check ── */
  const handleModelCheck = useCallback(async () => {
    if (!modelId.trim()) return;
    setModelLoading(true);
    setModelResult(null);
    try {
      const data = await apiFetch<ModelResult>('/ai-safety/check-model', {
        method: 'POST',
        body: JSON.stringify({ modelId }),
      });
      setModelResult(data);
    } catch {
      setModelResult(demoCheckModel(modelId));
    } finally {
      setModelLoading(false);
    }
  }, [modelId]);

  /* ── Derived stats ── */
  const raw = stats ?? DEMO_STATS;
  const s: SafetyStats = {
    totalChecks: raw?.totalChecks ?? DEMO_STATS.totalChecks,
    flagged:     raw?.flagged     ?? DEMO_STATS.flagged,
    blocked:     raw?.blocked     ?? DEMO_STATS.blocked,
    piiMasked:   raw?.piiMasked   ?? DEMO_STATS.piiMasked,
    safeRate:    raw?.safeRate    ?? DEMO_STATS.safeRate,
  };

  const safeRateColor =
    s.safeRate >= 95
      ? 'text-amber-600'
      : s.safeRate >= 85
      ? 'text-amber-600'
      : 'text-red-600';

  const STAT_CARDS: StatCardProps[] = [
    {
      label: 'Toplam Kontrol',
      value: s.totalChecks.toLocaleString('tr-TR'),
      icon: '🔍',
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200',
      valueColor: 'text-slate-800',
      stagger: 'stagger-1',
    },
    {
      label: 'İşaretlenen',
      value: s.flagged.toLocaleString('tr-TR'),
      icon: '🚩',
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200',
      valueColor: 'text-amber-700',
      stagger: 'stagger-2',
    },
    {
      label: 'Engellenen',
      value: s.blocked.toLocaleString('tr-TR'),
      icon: '🚫',
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200',
      valueColor: 'text-rose-700',
      stagger: 'stagger-3',
    },
    {
      label: 'PII Maskelendi',
      value: s.piiMasked.toLocaleString('tr-TR'),
      icon: '🔐',
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/60 border-violet-200',
      valueColor: 'text-violet-700',
      stagger: 'stagger-4',
    },
    {
      label: 'Güvenli Oran',
      value: `%${s.safeRate.toFixed(1)}`,
      icon: '✅',
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60 border-amber-200',
      valueColor: safeRateColor,
      stagger: 'stagger-4',
    },
  ];

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'input',  label: 'Giriş Kontrolü',  icon: '📥' },
    { id: 'output', label: 'Çıkış Kontrolü',  icon: '📤' },
    { id: 'pii',    label: 'PII Maskeleme',    icon: '🔐' },
    { id: 'model',  label: 'Model Onay',       icon: '🤖' },
  ];

  /* ── Check result panel (shared for input/output) ── */
  function CheckResultPanel({ result }: { result: CheckResult }) {
    const statusColor = result.safe ? 'text-amber-600' : 'text-rose-600';
    const statusBg = result.safe
      ? 'bg-amber-50 border-amber-200'
      : 'bg-rose-50 border-rose-200';
    const statusLabel = result.safe ? 'GÜVENLİ' : 'GÜVENSİZ';
    const statusIcon = result.safe ? '✅' : '🚨';

    return (
      <div className={`rounded-2xl border p-5 space-y-4 ${statusBg}`}>
        {/* Badge row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusIcon}</span>
            <span className={`text-2xl font-extrabold tracking-wide ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <ScoreRing score={result.score} safe={result.safe} />
        </div>

        {/* Flags */}
        {result.flags.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 mb-2">
              {t.tr("Tespit Edilen Sorunlar")}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.flags.map((flag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1 text-xs font-semibold"
                >
                  {flag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-700">
            {t.tr("Herhangi bir sorun tespit edilmedi.")}
          </p>
        )}
      </div>
    );
  }

  /* ── Text check tab content (shared layout for input/output) ── */
  function TextCheckTab({
    text,
    setText,
    result,
    loading,
    onCheck,
    placeholder,
    endpoint,
  }: {
    text: string;
    setText: (v: string) => void;
    result: CheckResult | null;
    loading: boolean;
    onCheck: () => void;
    placeholder: string;
    endpoint: string;
  }) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-400 font-mono">
          POST {endpoint}
        </div>
        <textarea
          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 placeholder:text-slate-400 resize-y min-h-[140px] focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
        />
        <button
          onClick={onCheck}
          disabled={loading || !text.trim()}
          className="rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              {t.tr("Kontrol ediliyor...")}
            </span>
          ) : (
            t.tr("Kontrol Et")
          )}
        </button>
        {result && <CheckResultPanel result={result} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50/30 p-6 space-y-6">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="glass hero rounded-2xl border border-slate-200 p-6 animate-fade-slide-up stagger-1">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Admin Panel</div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            {t.tr("🛡️ AI Güvenlik Merkezi")}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {t.tr("İçerik moderasyonu ve PII koruması")}
          </p>
        </div>
      </header>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            {isDemo && (
              <div className="lg:col-span-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                {t.tr("⚠ Demo verisi gösteriliyor. Gerçek veriler için API bağlantısını kontrol edin.")}
              </div>
            )}
            {STAT_CARDS.map((card) => (
              <StatCard key={t.tr(card.label)} {...card} />
            ))}
          </>
        )}
      </section>

      {/* ── Tab panel ────────────────────────────────────────── */}
      <section className="glass rounded-2xl border border-slate-200 p-0 overflow-hidden animate-fade-slide-up stagger-2">

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-slate-800 text-slate-800 bg-white/60'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/60'
              }`}
            >
              <span>{tab.icon}</span>
              {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">

          {/* ── Giriş Kontrolü ── */}
          {activeTab === 'input' && (
            <TextCheckTab
              text={inputText}
              setText={setInputText}
              result={inputResult}
              loading={inputLoading}
              onCheck={handleInputCheck}
              placeholder={t.tr("Kontrol edilecek metni girin... (örn: Bu içerik şiddet içeriyor mu?)")}
              endpoint="/ai-safety/check-input"
            />
          )}

          {/* ── Çıkış Kontrolü ── */}
          {activeTab === 'output' && (
            <TextCheckTab
              text={outputText}
              setText={setOutputText}
              result={outputResult}
              loading={outputLoading}
              onCheck={handleOutputCheck}
              placeholder={t.tr("Kontrol edilecek metni girin... (örn: Model çıktısı buraya yapıştırın)")}
              endpoint="/ai-safety/check-output"
            />
          )}

          {/* ── PII Maskeleme ── */}
          {activeTab === 'pii' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-400 font-mono">
                POST /ai-safety/mask-pii
              </div>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 placeholder:text-slate-400 resize-y min-h-[140px] focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                placeholder={t.tr("PII içerebilecek metni girin... (e-posta, telefon, TC kimlik no, kredi kartı)")}
                value={piiText}
                onChange={(e) => setPiiText(e.target.value)}
                rows={5}
              />
              <button
                onClick={handlePiiMask}
                disabled={piiLoading || !piiText.trim()}
                className="rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition-all"
              >
                {piiLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {t.tr("Maskeleniyor...")}
                  </span>
                ) : (
                  t.tr("Maskele")
                )}
              </button>

              {piiResult && (
                <div className="space-y-4">
                  {/* Detected types */}
                  {piiResult.detectedTypes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 mb-2">
                        {t.tr("Tespit Edilen PII Türleri")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {piiResult.detectedTypes.map((type, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-violet-100 border border-violet-200 text-violet-700 px-3 py-1 text-xs font-semibold"
                          >
                            🔐 {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t.tr("Orijinal Metin")}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {piiText}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                        {t.tr("Maskelenmiş Metin")}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {piiResult.masked}
                      </p>
                    </div>
                  </div>

                  {piiResult.detectedTypes.length === 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                      <span>✅</span>
                      {t.tr("Metinde kişisel veri (PII) tespit edilmedi.")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Model Onay ── */}
          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-400 font-mono">
                POST /ai-safety/check-model
              </div>

              {/* Quick select chips */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {t.tr("Hızlı Seçim")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {['gpt-4o', 'claude-3-5', 'llama-3'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setModelId(m);
                        setModelResult(null);
                      }}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                        modelId === m
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model ID input */}
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                placeholder={t.tr("Model ID girin... (örn: gpt-4o, claude-3-5, llama-3)")}
                value={modelId}
                onChange={(e) => {
                  setModelId(e.target.value);
                  setModelResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleModelCheck();
                }}
              />

              <button
                onClick={handleModelCheck}
                disabled={modelLoading || !modelId.trim()}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition-all"
              >
                {modelLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {t.tr("Onaylanıyor...")}
                  </span>
                ) : (
                  t.tr("Onayla")
                )}
              </button>

              {modelResult && (
                <div
                  className={`rounded-2xl border p-5 space-y-4 ${
                    modelResult.approved
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">
                      {modelResult.approved ? '🛡️' : '✖️'}
                    </span>
                    <div>
                      <p
                        className={`text-2xl font-extrabold ${
                          modelResult.approved ? 'text-amber-700' : 'text-rose-700'
                        }`}
                      >
                        {modelResult.approved ? t.tr("ONAYLANDI") : t.tr("REDDEDİLDİ")}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Model: <span className="font-mono font-semibold text-slate-700">{modelId}</span>
                      </p>
                    </div>
                  </div>

                  {modelResult.issues.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 mb-2">
                        {t.tr("Tespit Edilen Sorunlar")}
                      </p>
                      <ul className="space-y-2">
                        {modelResult.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-rose-800"
                          >
                            <span className="mt-0.5 shrink-0 text-rose-400">✗</span>
                            {t.tr(issue)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {modelResult.approved && modelResult.issues.length === 0 && (
                    <p className="text-sm text-amber-700">
                      {t.tr("Bu model güvenlik politikasına uygundur ve kullanıma hazırdır.")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
