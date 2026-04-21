'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'IDLE' | 'ERROR';
  lastRun?: string;
  successRate?: number;
  totalRuns?: number;
}

interface AgentLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

interface ExecuteResult {
  jobId: string;
  status: 'QUEUED' | 'RUNNING';
}

/* ── Demo data ──────────────────────────────────────────────────────────── */

const DEMO_AGENTS: Agent[] = [
  {
    id: 'agent-001',
    name: 'Öneri Motoru',
    description: 'Kullanıcı davranışlarına göre kişiselleştirilmiş kurs önerileri üretir.',
    status: 'ACTIVE',
    lastRun: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    successRate: 94.7,
    totalRuns: 1842,
  },
  {
    id: 'agent-002',
    name: 'Sınav Üreticisi',
    description: 'Kurs içeriğinden otomatik soru ve sınav setleri oluşturur.',
    status: 'ACTIVE',
    lastRun: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    successRate: 88.3,
    totalRuns: 634,
  },
  {
    id: 'agent-003',
    name: 'İçerik Moderatörü',
    description: 'Gönderilen içerikleri politika ihlalleri ve spam için tarar.',
    status: 'IDLE',
    lastRun: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    successRate: 97.1,
    totalRuns: 3210,
  },
  {
    id: 'agent-004',
    name: 'Dil Analisti',
    description: 'Metin içeriklerinin dil kalitesini ve okunabilirliğini analiz eder.',
    status: 'ERROR',
    lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    successRate: 41.2,
    totalRuns: 289,
  },
  {
    id: 'agent-005',
    name: 'Devamsızlık Dedektörü',
    description: 'Öğrenci katılım verilerini izleyerek erken uyarı sinyalleri üretir.',
    status: 'ACTIVE',
    lastRun: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    successRate: 82.5,
    totalRuns: 917,
  },
];

const DEMO_LOGS: Record<string, AgentLog[]> = {
  'agent-001': [
    { timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), level: 'INFO', message: 'Öneri batch işlemi tamamlandı. 342 kullanıcı için öneri üretildi.' },
    { timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(), level: 'INFO', message: 'Model güncellendi: v2.4.1 aktif.' },
    { timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), level: 'WARN', message: 'Kullanıcı segmenti "premium" için veri yetersizliği.' },
    { timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), level: 'INFO', message: 'Çalışma başlatıldı. 1,204 öğrenci profili yüklendi.' },
  ],
  'agent-002': [
    { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), level: 'INFO', message: 'Sınav seti oluşturuldu: "İleri Python" - 25 soru.' },
    { timestamp: new Date(Date.now() - 17 * 60 * 1000).toISOString(), level: 'INFO', message: 'Kaynak metin analiz edildi: 48 sayfa, 12.430 kelime.' },
    { timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(), level: 'WARN', message: 'Soru tekrarı tespit edildi, yeniden üretiliyor.' },
    { timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(), level: 'INFO', message: 'Yeni istek alındı: Kurs ID #4821.' },
  ],
  'agent-003': [
    { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), level: 'INFO', message: 'Günlük tarama tamamlandı. 0 ihlal tespit edildi.' },
    { timestamp: new Date(Date.now() - 3.1 * 60 * 60 * 1000).toISOString(), level: 'INFO', message: '1,021 içerik öğesi incelendi.' },
    { timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), level: 'INFO', message: 'Tarama başlatıldı.' },
  ],
  'agent-004': [
    { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), level: 'ERROR', message: 'NLP servisi bağlantı hatası: timeout after 30s.' },
    { timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(), level: 'ERROR', message: 'Yeniden bağlanma denemesi başarısız (3/3).' },
    { timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), level: 'WARN', message: 'Servis yanıt süresi yüksek: 8.4s.' },
    { timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), level: 'INFO', message: 'Analiz görevi kuyruğa alındı.' },
  ],
  'agent-005': [
    { timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), level: 'INFO', message: '12 öğrenci için devamsızlık uyarısı gönderildi.' },
    { timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), level: 'INFO', message: 'Haftalık katılım verisi işlendi: 2.304 kayıt.' },
    { timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(), level: 'WARN', message: '"İleri Matematik" kursunda katılım düşüşü: %18.' },
    { timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), level: 'INFO', message: 'Veri senkronizasyonu tamamlandı.' },
  ],
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function relativeTime(isoString?: string, tr?: (s: string) => string): string {
  const _tr = tr ?? ((s: string) => s);
  if (!isoString) return _tr('Hiç çalışmadı');
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}${_tr('sn önce')}`;
  if (diff < 3600) return `${Math.floor(diff / 60)}${_tr('dk önce')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${_tr('sa önce')}`;
  return `${Math.floor(diff / 86400)}${_tr('g önce')}`;
}

function statusLabel(status: Agent['status'], tr: (s: string) => string): string {
  switch (status) {
    case 'ACTIVE': return tr('Aktif');
    case 'IDLE':   return tr('Beklemede');
    case 'ERROR':  return tr('Hata');
  }
}

function statusClasses(status: Agent['status']): string {
  switch (status) {
    case 'ACTIVE': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case 'IDLE':   return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
    case 'ERROR':  return 'bg-red-500/20 text-red-300 border border-red-500/30';
  }
}

function statusDot(status: Agent['status']): string {
  switch (status) {
    case 'ACTIVE': return 'bg-amber-400';
    case 'IDLE':   return 'bg-slate-400';
    case 'ERROR':  return 'bg-red-400';
  }
}

function rateColor(rate?: number): string {
  if (rate === undefined) return 'bg-slate-600';
  if (rate > 80) return 'bg-amber-500';
  if (rate > 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function rateTextColor(rate?: number): string {
  if (rate === undefined) return 'text-slate-400';
  if (rate > 80) return 'text-amber-400';
  if (rate > 50) return 'text-amber-400';
  return 'text-red-400';
}

function logLevelDot(level: AgentLog['level']): string {
  switch (level) {
    case 'INFO':  return 'bg-blue-400';
    case 'WARN':  return 'bg-amber-400';
    case 'ERROR': return 'bg-red-400';
  }
}

function logLevelText(level: AgentLog['level']): string {
  switch (level) {
    case 'INFO':  return 'text-blue-300';
    case 'WARN':  return 'text-amber-300';
    case 'ERROR': return 'text-red-300';
  }
}

function formatLogTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} yıldız`}
        >
          <span
            className={
              star <= (hovered || value)
                ? 'text-amber-400'
                : 'text-slate-600'
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

interface LogPanelProps {
  agentId: string;
  isDemo: boolean;
}

function LogPanel({ agentId, isDemo }: LogPanelProps) {
  const t = useI18n();
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setTimeout(() => {
        setLogs(DEMO_LOGS[agentId] ?? []);
        setLoading(false);
      }, 400);
      return;
    }
    apiFetch<AgentLog[]>(`/ai-agents/agents/${agentId}/logs`)
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        setLogs(DEMO_LOGS[agentId] ?? []);
        setLoading(false);
        setError(t.tr('API erişilemedi, demo verisi gösteriliyor.'));
      });
  }, [agentId, isDemo]);

  if (loading) {
    return (
      <div className="mt-4 space-y-2 px-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-5 rounded" />
        ))}
      </div>
    );
  }

  const displayed = logs.slice(0, 10);

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {error && (
        <p className="mb-3 text-xs text-amber-400">{error}</p>
      )}
      {displayed.length === 0 ? (
        <p className="text-sm text-slate-500">{t.tr("Henüz log kaydı bulunmuyor.")}</p>
      ) : (
        <ul className="space-y-2">
          {displayed.map((log, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="relative mt-1.5 flex-shrink-0">
                <span
                  className={`block h-2.5 w-2.5 rounded-full ${logLevelDot(log.level)}`}
                />
                {idx < displayed.length - 1 && (
                  <span className="absolute left-1/2 top-3 h-full w-px -translate-x-1/2 bg-white/10" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {formatLogTime(log.timestamp)}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${logLevelText(log.level)} bg-white/5`}
                  >
                    {log.level}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-300 break-words">
                  {log.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FeedbackFormProps {
  agentId: string;
  isDemo: boolean;
  onClose: () => void;
}

function FeedbackForm({ agentId, isDemo, onClose }: FeedbackFormProps) {
  const t = useI18n();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError(t.tr('Lütfen bir puan seçin.'));
      return;
    }
    setSubmitting(true);
    setError(null);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitting(false);
      setSubmitted(true);
      return;
    }

    try {
      await apiFetch(`/ai-agents/agents/${agentId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setSubmitted(true);
    } catch {
      setError(t.tr('Geri bildirim gönderilemedi. Lütfen tekrar deneyin.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="text-3xl">✅</span>
          <p className="font-medium text-amber-400">{t.tr("Geri bildiriminiz alındı!")}</p>
          <p className="text-sm text-slate-400">{t.tr("Teşekkür ederiz.")}</p>
          <button
            onClick={onClose}
            className="mt-2 rounded-lg bg-white/10 px-4 py-1.5 text-sm text-slate-300 hover:bg-white/20 transition-colors"
          >
            {t.tr("Kapat")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            {t.tr("Ajan performansını puanlayın")}
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label
            htmlFor={`comment-${agentId}`}
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            {t.tr("Yorum (isteğe bağlı)")}
          </label>
          <textarea
            id={`comment-${agentId}`}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.tr("Bu ajan hakkında görüşlerinizi paylaşın...")}
            className="w-full resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t.tr("Gönderiliyor...")}
              </>
            ) : (
              t.tr('Gönder')
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/20 transition-colors"
          >
            {t.tr("İptal")}
          </button>
        </div>
      </form>
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  isDemo: boolean;
  onExecute: (id: string) => Promise<void>;
  executingIds: Set<string>;
}

function AgentCard({ agent, isDemo, onExecute, executingIds }: AgentCardProps) {
  const t = useI18n();
  const [showLogs, setShowLogs] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isExecuting = executingIds.has(agent.id);

  const handleLogsToggle = () => {
    setShowLogs((v) => !v);
    if (showFeedback) setShowFeedback(false);
  };

  const handleFeedbackToggle = () => {
    setShowFeedback((v) => !v);
    if (showLogs) setShowLogs(false);
  };

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4 transition-shadow hover:shadow-lg hover:shadow-black/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">
            {agent.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400 line-clamp-2">
            {agent.description}
          </p>
        </div>
        <span
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(agent.status)}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusDot(agent.status)} ${agent.status === 'ACTIVE' ? 'animate-pulse' : ''}`}
          />
          {statusLabel(agent.status, t.tr)}
        </span>
      </div>

      {/* Success rate bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t.tr("Başarı Oranı")}</span>
          <span className={`font-semibold ${rateTextColor(agent.successRate)}`}>
            {agent.successRate !== undefined
              ? `${agent.successRate.toFixed(1)}%`
              : '—'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${rateColor(agent.successRate)}`}
            style={{ width: `${agent.successRate ?? 0}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {t.tr("Son çalışma:")} {' '}
          <span className="text-slate-300">{relativeTime(agent.lastRun, t.tr)}</span>
        </span>
        <span>
          <span className="text-slate-300 font-medium">
            {agent.totalRuns?.toLocaleString('tr-TR') ?? 0}
          </span>{' '}
          {t.tr("çalışma")}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onExecute(agent.id)}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
        >
          {isExecuting ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t.tr("Çalışıyor...")}
            </>
          ) : (
            <>▶ {t.tr("Çalıştır")}</>
          )}
        </button>
        <button
          onClick={handleLogsToggle}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showLogs
              ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          📋 {t.tr("Loglar")}
        </button>
        <button
          onClick={handleFeedbackToggle}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showFeedback
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          ⭐ {t.tr("Geri Bildirim")}
        </button>
      </div>

      {/* Collapsible panels */}
      {showLogs && <LogPanel agentId={agent.id} isDemo={isDemo} />}
      {showFeedback && (
        <FeedbackForm
          agentId={agent.id}
          isDemo={isDemo}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function AIAgentsPage() {
  const t = useI18n();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [executeMessages, setExecuteMessages] = useState<
    Record<string, { jobId: string; status: string }>
  >({});

  /* Load agents */
  useEffect(() => {
    apiFetch<Agent[]>('/ai-agents/agents')
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch(() => {
        setAgents(DEMO_AGENTS);
        setIsDemo(true);
        setLoading(false);
      });
  }, []);

  /* Execute agent */
  const handleExecute = useCallback(
    async (id: string) => {
      setExecutingIds((prev) => new Set(prev).add(id));

      // Optimistic status update
      setAgents((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: 'ACTIVE' as const } : a
        )
      );

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1500));
        const fakeJobId = `job-${Math.random().toString(36).slice(2, 8)}`;
        setExecuteMessages((prev) => ({
          ...prev,
          [id]: { jobId: fakeJobId, status: 'QUEUED' },
        }));
        setAgents((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'ACTIVE' as const,
                  lastRun: new Date().toISOString(),
                  totalRuns: (a.totalRuns ?? 0) + 1,
                }
              : a
          )
        );
        setExecutingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      try {
        const result = await apiFetch<ExecuteResult>(
          `/ai-agents/agents/${id}/execute`,
          { method: 'POST' }
        );
        setExecuteMessages((prev) => ({ ...prev, [id]: result }));
        setAgents((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'ACTIVE' as const,
                  lastRun: new Date().toISOString(),
                  totalRuns: (a.totalRuns ?? 0) + 1,
                }
              : a
          )
        );
      } catch {
        // Revert on error
        setAgents((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, status: 'ERROR' as const } : a
          )
        );
      } finally {
        setExecutingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [isDemo]
  );

  /* Stats */
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'ACTIVE').length;
  const avgSuccessRate =
    agents.length > 0
      ? agents
          .filter((a) => a.successRate !== undefined)
          .reduce((sum, a) => sum + (a.successRate ?? 0), 0) /
        agents.filter((a) => a.successRate !== undefined).length
      : 0;
  const totalRuns = agents.reduce((sum, a) => sum + (a.totalRuns ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Hero */}
      <div className="hero">
        <div className="hero-content animate-fade-slide-up">
          <div className="mb-3 text-5xl">🤖</div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t.tr("AI Ajan Yönetimi")}
          </h1>
          <p className="mt-2 text-base text-slate-400">
            {t.tr("Otonom yapay zeka ajanlarını izle ve yönet")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Demo banner */}
        {isDemo && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 animate-fade-slide-up">
            <span className="text-lg">⚠️</span>
            <span>
              {t.tr("API'ye erişilemedi. Demo verileri gösteriliyor. Gerçek veriler için API bağlantısını kontrol edin.")}
            </span>
          </div>
        )}

        {/* Execute messages */}
        {Object.entries(executeMessages).length > 0 && (
          <div className="mb-6 space-y-2">
            {Object.entries(executeMessages).map(([agentId, msg]) => {
              const agent = agents.find((a) => a.id === agentId);
              return (
                <div
                  key={agentId}
                  className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300"
                >
                  <span>✅</span>
                  <span>
                    <strong>{agent?.name ?? agentId}</strong> {t.tr("başlatıldı")} — {t.tr("İş ID:")} {' '}
                    <code className="rounded bg-white/10 px-1 text-xs">
                      {msg.jobId}
                    </code>{' '}
                    <span className="opacity-70">({msg.status})</span>
                  </span>
                  <button
                    onClick={() =>
                      setExecuteMessages((prev) => {
                        const next = { ...prev };
                        delete next[agentId];
                        return next;
                      })
                    }
                    className="ml-auto text-amber-400 hover:text-white transition-colors"
                    aria-label={t.tr("Kapat")}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-slide-up stagger-1">
          <div className="metric glass rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t.tr("Toplam Ajan")}
            </p>
            {loading ? (
              <div className="skeleton mt-2 h-8 w-16 rounded" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-white">{totalAgents}</p>
            )}
          </div>
          <div className="metric glass rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t.tr("Aktif")}
            </p>
            {loading ? (
              <div className="skeleton mt-2 h-8 w-16 rounded" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-amber-400">
                {activeAgents}
              </p>
            )}
          </div>
          <div className="metric glass rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t.tr("Başarı Oranı")}
            </p>
            {loading ? (
              <div className="skeleton mt-2 h-8 w-20 rounded" />
            ) : (
              <p
                className={`mt-1 text-3xl font-bold ${rateTextColor(avgSuccessRate)}`}
              >
                {avgSuccessRate > 0 ? `${avgSuccessRate.toFixed(1)}%` : '—'}
              </p>
            )}
          </div>
          <div className="metric glass rounded-xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {t.tr("Toplam Çalışma")}
            </p>
            {loading ? (
              <div className="skeleton mt-2 h-8 w-20 rounded" />
            ) : (
              <p className="mt-1 text-3xl font-bold text-white">
                {totalRuns.toLocaleString('tr-TR')}
              </p>
            )}
          </div>
        </div>

        {/* Agent grid */}
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 space-y-4">
                <div className="skeleton h-5 w-2/5 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="skeleton h-2 w-full rounded-full" />
                <div className="skeleton h-4 w-3/5 rounded" />
                <div className="flex gap-2">
                  <div className="skeleton h-7 w-20 rounded-lg" />
                  <div className="skeleton h-7 w-16 rounded-lg" />
                  <div className="skeleton h-7 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 animate-fade-slide-up stagger-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isDemo={isDemo}
                onExecute={handleExecute}
                executingIds={executingIds}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center animate-fade-slide-up">
            <span className="text-6xl opacity-40">🤖</span>
            <p className="text-lg font-medium text-slate-400">
              {t.tr("Henüz hiç ajan yapılandırılmamış.")}
            </p>
            <p className="text-sm text-slate-500">
              {t.tr("API üzerinden ajan ekleyerek başlayın.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
