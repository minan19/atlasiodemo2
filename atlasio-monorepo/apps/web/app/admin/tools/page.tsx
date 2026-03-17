'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN_KEY = 'accessToken';

type LtiTool = {
  id: string;
  name: string;
  issuer: string;
  description?: string;
  deployments?: { id: string; courseId: string }[];
  createdAt: string;
};

type AiAgent = {
  id: string;
  name: string;
  status: string;
  lastActivity: string;
};

type PerformanceSnapshot = {
  id: string;
  metrics: Record<string, number>;
  recordedAt: string;
};

type LiveSession = {
  id: string;
  topic?: string;
  status: string;
  instructorId: string;
  startedAt?: string;
  participants?: { userId: string; role: string }[];
};

const DEMO_TOOLS: LtiTool[] = [
  {
    id: 'demo-1',
    name: 'Moodle LTI Bağlayıcı',
    issuer: 'moodle.atlasio.io',
    description: 'Moodle platformu ile iki yönlü LTI 1.3 entegrasyonu sağlar.',
    deployments: [{ id: 'd1', courseId: 'c1' }, { id: 'd2', courseId: 'c2' }],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Google Classroom',
    issuer: 'classroom.google.com',
    description: 'Google Classroom ile ödev ve not senkronizasyonu.',
    deployments: [{ id: 'd3', courseId: 'c3' }],
    createdAt: new Date().toISOString(),
  },
];

const DEMO_AGENTS: AiAgent[] = [
  { id: 'da-1', name: 'Özet Asistanı', status: 'ACTIVE', lastActivity: new Date().toISOString() },
  { id: 'da-2', name: 'Değerlendirme Botu', status: 'IDLE', lastActivity: new Date(Date.now() - 3600000).toISOString() },
];

function agentStatusStyle(status: string): string {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (status === 'ERROR') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

function sessionStatusStyle(status: string): string {
  if (status === 'RUNNING') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse';
  if (status === 'SCHEDULED') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
}

function formatTurkish(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminToolsPage() {
  const [token, setToken] = useState('');
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agentMoment, setAgentMoment] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? '');
  }, []);

  const headers = useMemo(() => {
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  const refresh = () => {
    if (!headers) return;
    setError(null);
    setBusy(true);
    Promise.all([
      fetch(`${API_BASE}/lti/tools`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE}/ai/agents`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE}/performance/snapshots?limit=3`, { headers }).then((res) => res.json()),
      fetch(`${API_BASE}/live/sessions`, { headers }).then((res) => res.json()),
    ])
      .then(([toolsResponse, agentsResponse, performanceResponse, liveResponse]) => {
        setTools(toolsResponse ?? []);
        setAgents(agentsResponse ?? []);
        setSessions(liveResponse ?? []);
        setSnapshots(performanceResponse ?? []);
      })
      .catch((err) => setError(err?.message ?? 'Veri yüklenemedi'))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    if (headers) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const executeFirstAgent = async () => {
    if (!headers || agents.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/ai/agents/${agents[0].id}/execute`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setAgentMoment(data.summary ?? 'Hazırlandı');
      setError(data.message ? String(data.message) : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Agent çalıştırılamadı');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-slate-600 dark:text-slate-400">
        Lütfen giriş yapınız.
      </div>
    );
  }

  const displayTools = tools.length > 0 ? tools : DEMO_TOOLS;
  const isToolDemo = tools.length === 0;
  const displayAgents = agents.length > 0 ? agents : DEMO_AGENTS;
  const isAgentDemo = agents.length === 0;
  const runningSessions = sessions.filter((s) => s.status === 'RUNNING').length;
  const latestSnapshot = snapshots[0] ?? null;
  const snapshotMetricCount = latestSnapshot ? Object.keys(latestSnapshot.metrics).length : 0;

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <header className="glass rounded-2xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hero">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Kurumsal Dış Araçlar &amp; AI
            </h1>
            <span className="pill text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
              Platform İntegrasyon
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Atlasio'ya entegre edilmiş LTI araçlarını yönetin, AI asistanlarını çalıştırın ve platform performansını izleyin.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={refresh}
            disabled={busy}
            className="btn-link inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            <span
              className={`inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full ${busy ? 'animate-spin' : 'hidden'}`}
            />
            {busy ? 'Yükleniyor…' : 'Yenile'}
          </button>
          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400 max-w-xs text-right">{error}</p>
          )}
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'LTI Araçları', value: tools.length, icon: '🔧', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200', val: 'text-indigo-700' },
          { label: 'AI Agentlar', value: agents.length, icon: '🤖', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200', val: 'text-emerald-700' },
          { label: 'Aktif Oturum', value: runningSessions, icon: '📡', bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200', val: 'text-rose-700' },
          { label: 'Performans', value: snapshotMetricCount, icon: '📊', bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', val: 'text-amber-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border ${stat.bg} p-4 flex flex-col gap-1`}
          >
            <span className="text-xl">{stat.icon}</span>
            <span className={`text-2xl font-bold ${stat.val}`}>{stat.value}</span>
            <span className="text-xs text-slate-500">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── LTI Tools Section ── */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400 inline-block" />
              LTI Araçları
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isToolDemo ? 'Örnek veriler gösteriliyor' : `${tools.length} entegre araç`}
            </p>
          </div>
          {isToolDemo && (
            <span className="pill text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
              DEMO
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {displayTools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 flex flex-col justify-between p-4 gap-3 hover:shadow-md transition-shadow"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {tool.issuer}
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tool.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tool.description || 'Açıklama yok'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="pill text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {tool.deployments?.length ?? 0} deployment
                </span>
                <button className="btn-link text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Araç Ekle
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Agents Section ── */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
              AI Agentlar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAgentDemo ? 'Örnek veriler gösteriliyor' : `${agents.length} agent kayıtlı`}
            </p>
          </div>
          {isAgentDemo && (
            <span className="pill text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
              DEMO
            </span>
          )}
        </div>

        {agentMoment && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-4 py-3 flex gap-3 items-start">
            <span className="text-emerald-500 mt-0.5 text-sm">✦</span>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">{agentMoment}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {displayAgents.map((agent, idx) => (
            <div
              key={agent.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{agent.name}</p>
                <span className={`pill shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${agentStatusStyle(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Son etkinlik: {formatTurkish(agent.lastActivity)}
              </p>
              {idx === 0 && (
                <button
                  onClick={executeFirstAgent}
                  disabled={busy || isAgentDemo}
                  className="btn-link mt-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 self-start"
                >
                  {busy ? 'Çalışıyor…' : 'Çalıştır'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Sessions Section ── */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-400 to-orange-400 inline-block" />
              Canlı Oturumlar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sessions.length} oturum</p>
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Henüz aktif oturum yok.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`pill shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sessionStatusStyle(session.status)}`}>
                    {session.status}
                  </span>
                  <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {session.topic || 'Canlı Ders'}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  <span>{session.participants?.length ?? 0} katılımcı</span>
                  <span>{session.startedAt ? formatTurkish(session.startedAt) : '—'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Performance Snapshot ── */}
      <section className="glass rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 inline-block" />
            Performans Snapshot
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {latestSnapshot
              ? `Son güncelleme: ${formatTurkish(latestSnapshot.recordedAt)}`
              : 'Snapshot bulunamadı'}
          </p>
        </div>
        {latestSnapshot ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(latestSnapshot.metrics).map(([key, value]) => {
              const barWidth = Math.min(100, Math.max(4, (value / 1000) * 100));
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 p-4 space-y-2"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Snapshot verisi bulunamadı.</p>
        )}
      </section>

    </div>
  );
}
