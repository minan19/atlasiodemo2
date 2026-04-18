'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

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

/* ── Icon System ── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', flexShrink: 0 },
  };

  switch (name) {
    case 'wrench':
      return (
        <svg {...props}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'bot':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" strokeWidth={2.5} />
          <line x1="16" y1="16" x2="16" y2="16" strokeWidth={2.5} />
        </svg>
      );
    case 'radio':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="2" />
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
        </svg>
      );
    case 'bar-chart':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...props}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );
    case 'loader':
      return (
        <svg {...props}>
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...props}>
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 8V2" />
          <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...props}>
          <path d="M12 2l2.4 7.6H22l-6.4 4.8 2.4 7.6L12 17.2 6 22l2.4-7.6L2 9.6h7.6L12 2z" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...props}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── Status helpers ── */
function agentStatusStyle(status: string): React.CSSProperties {
  if (status === 'ACTIVE') return { background: 'color-mix(in srgb, #10b981 15%, var(--panel))', color: '#10b981', border: '1px solid color-mix(in srgb, #10b981 30%, transparent)' };
  if (status === 'ERROR') return { background: 'color-mix(in srgb, #f43f5e 15%, var(--panel))', color: '#f43f5e', border: '1px solid color-mix(in srgb, #f43f5e 30%, transparent)' };
  return { background: 'color-mix(in srgb, var(--muted) 20%, var(--panel))', color: 'var(--ink-2)', border: '1px solid var(--line)' };
}

function sessionStatusStyle(status: string): React.CSSProperties {
  if (status === 'RUNNING') return { background: 'color-mix(in srgb, #f43f5e 15%, var(--panel))', color: '#f43f5e', border: '1px solid color-mix(in srgb, #f43f5e 30%, transparent)' };
  if (status === 'SCHEDULED') return { background: 'color-mix(in srgb, #f59e0b 15%, var(--panel))', color: '#f59e0b', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)' };
  return { background: 'color-mix(in srgb, var(--muted) 20%, var(--panel))', color: 'var(--ink-2)', border: '1px solid var(--line)' };
}

function formatTurkish(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminToolsPage() {
  const t = useI18n();
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
      <div
        style={{
          borderRadius: 'var(--r-xl)',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
          fontSize: 14,
          color: 'var(--ink-2)',
        }}
      >
        {t.tr("Lütfen giriş yapınız.")}
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

  /* ── Shared style tokens ── */
  const card: React.CSSProperties = {
    borderRadius: 'var(--r-xl)',
    background: 'var(--panel)',
    border: '1.5px solid var(--line)',
    padding: 16,
    boxShadow: 'var(--shadow-sm)',
  };

  const sectionCard: React.CSSProperties = {
    borderRadius: 'var(--r-xl)',
    background: 'var(--panel)',
    border: '1.5px solid var(--line)',
    padding: 24,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const pillBase: React.CSSProperties = {
    borderRadius: 99,
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap' as const,
  };

  const accentBar = (gradient: string): React.CSSProperties => ({
    width: 4,
    height: 20,
    borderRadius: 4,
    background: gradient,
    flexShrink: 0,
  });

  const statIcons: { label: string; value: number; icon: string; accent: string }[] = [
    { label: 'LTI Araçları',  value: tools.length,           icon: 'wrench',    accent: 'var(--accent)' },
    { label: 'AI Agentlar',   value: agents.length,          icon: 'bot',       accent: '#10b981' },
    { label: 'Aktif Oturum',  value: runningSessions,        icon: 'radio',     accent: '#f43f5e' },
    { label: 'Performans',    value: snapshotMetricCount,    icon: 'bar-chart', accent: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        .tools-spin { animation: spin 0.8s linear infinite; }
        .tools-pulse { animation: pulse 1.5s ease-in-out infinite; }
        .tools-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .tools-stats-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .tools-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .tools-2col { grid-template-columns: repeat(2, 1fr); }
        }
        .tools-3col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .tools-3col { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .tools-3col { grid-template-columns: repeat(3, 1fr); }
        }
        .tools-card-hover {
          transition: box-shadow var(--t-fast), transform var(--t-fast);
        }
        .tools-card-hover:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .tools-btn-primary {
          transition: opacity var(--t-fast), background var(--t-fast);
        }
        .tools-btn-primary:hover:not(:disabled) {
          opacity: 0.88;
        }
        .tools-link-btn:hover {
          text-decoration: underline;
        }
        .tools-header-row {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 640px) {
          .tools-header-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          borderRadius: 'var(--r-xl)',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          padding: 24,
          boxShadow: 'var(--shadow-md)',
        }}
        className="tools-header-row"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
              {t.tr("Kurumsal Dış Araçlar")} &amp; AI
            </h1>
            <span
              style={{
                ...pillBase,
                background: 'color-mix(in srgb, var(--accent) 12%, var(--panel))',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                fontSize: 11,
                padding: '3px 10px',
              }}
            >
              {t.tr("Platform İntegrasyon")}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, maxWidth: 500 }}>
            {t.tr("Atlasio'ya entegre edilmiş LTI araçlarını yönetin, AI asistanlarını çalıştırın ve platform performansını izleyin.")}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button
            onClick={refresh}
            disabled={busy}
            className="tools-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 'var(--r-md)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.65 : 1,
              boxShadow: busy ? 'none' : 'var(--glow-blue)',
            }}
          >
            <span className={busy ? 'tools-spin' : ''} style={{ display: 'inline-flex' }}>
              <Icon name={busy ? 'loader' : 'refresh'} size={15} />
            </span>
            {busy ? t.tr('Yükleniyor…') : t.tr('Yenile')}
          </button>
          {error && (
            <p style={{ fontSize: 11, color: '#f43f5e', margin: 0, maxWidth: 260, textAlign: 'right' }}>{error}</p>
          )}
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="tools-stats-grid">
        {statIcons.map((stat) => (
          <div
            key={t.tr(stat.label)}
            style={{
              ...card,
              background: `color-mix(in srgb, ${stat.accent} 8%, var(--panel))`,
              border: `1.5px solid color-mix(in srgb, ${stat.accent} 22%, var(--line))`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span style={{ color: stat.accent, display: 'inline-flex' }}>
              <Icon name={stat.icon} size={20} />
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: stat.accent, lineHeight: 1 }}>
              {stat.value}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{t.tr(stat.label)}</span>
          </div>
        ))}
      </div>

      {/* ── LTI Tools Section ── */}
      <section style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={accentBar('linear-gradient(180deg, var(--accent-2), var(--accent))')} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                <Icon name="plug" size={15} />
              </span>
              {t.tr("LTI Araçları")}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
              {isToolDemo ? t.tr('Örnek veriler gösteriliyor') : `${tools.length} ${t.tr('entegre araç')}`}
            </p>
          </div>
          {isToolDemo && (
            <span
              style={{
                ...pillBase,
                background: 'color-mix(in srgb, #f59e0b 14%, var(--panel))',
                color: '#f59e0b',
                border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
              }}
            >
              DEMO
            </span>
          )}
        </div>

        <div className="tools-2col">
          {displayTools.map((tool) => (
            <div
              key={tool.id}
              className="tools-card-hover"
              style={{
                borderRadius: 'var(--r-lg)',
                background: 'color-mix(in srgb, var(--accent) 4%, var(--panel))',
                border: '1.5px solid var(--line)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  {tool.issuer}
                </p>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  {t.tr(tool.name)}
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {t.tr(tool.description || 'Açıklama yok')}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span
                  style={{
                    ...pillBase,
                    background: 'color-mix(in srgb, var(--muted) 18%, var(--panel))',
                    color: 'var(--ink-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {tool.deployments?.length ?? 0} deployment
                </span>
                <button
                  className="tools-link-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name="plus" size={13} />
                  {t.tr("Araç Ekle")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Agents Section ── */}
      <section style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={accentBar('linear-gradient(180deg, #6ee7b7, #06b6d4)')} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                <Icon name="bot" size={15} />
              </span>
              {t.tr("AI Agentlar")}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
              {isAgentDemo ? t.tr('Örnek veriler gösteriliyor') : `${agents.length} ${t.tr('agent kayıtlı')}`}
            </p>
          </div>
          {isAgentDemo && (
            <span
              style={{
                ...pillBase,
                background: 'color-mix(in srgb, #f59e0b 14%, var(--panel))',
                color: '#f59e0b',
                border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
              }}
            >
              DEMO
            </span>
          )}
        </div>

        {agentMoment && (
          <div
            style={{
              borderRadius: 'var(--r-md)',
              background: 'color-mix(in srgb, #10b981 10%, var(--panel))',
              border: '1.5px solid color-mix(in srgb, #10b981 28%, var(--line))',
              padding: '12px 16px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <span style={{ color: '#10b981', display: 'inline-flex', marginTop: 1 }}>
              <Icon name="sparkle" size={14} />
            </span>
            <p style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, margin: 0 }}>{agentMoment}</p>
          </div>
        )}

        <div className="tools-2col">
          {displayAgents.map((agent, idx) => (
            <div
              key={agent.id}
              className="tools-card-hover"
              style={{
                borderRadius: 'var(--r-lg)',
                background: 'color-mix(in srgb, #10b981 4%, var(--panel))',
                border: '1.5px solid var(--line)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.tr(agent.name)}
                </p>
                <span style={{ ...pillBase, ...agentStatusStyle(agent.status) }}>
                  {agent.status}
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--ink-2)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon name="clock" size={12} />
                {t.tr("Son etkinlik:")} {formatTurkish(agent.lastActivity)}
              </p>
              {idx === 0 && (
                <button
                  onClick={executeFirstAgent}
                  disabled={busy || isAgentDemo}
                  className="tools-btn-primary"
                  style={{
                    marginTop: 'auto',
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    cursor: busy || isAgentDemo ? 'not-allowed' : 'pointer',
                    opacity: busy || isAgentDemo ? 0.5 : 1,
                  }}
                >
                  <Icon name={busy ? 'loader' : 'play'} size={12} />
                  {busy ? t.tr('Çalışıyor…') : t.tr('Çalıştır')}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Sessions Section ── */}
      <section style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={accentBar('linear-gradient(180deg, #fb7185, #fb923c)')} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                <Icon name="radio" size={15} />
              </span>
              {t.tr("Canlı Oturumlar")}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{sessions.length} {t.tr("oturum")}</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>{t.tr("Henüz aktif oturum yok.")}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sessions.map((session, i) => (
              <li
                key={session.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    className={session.status === 'RUNNING' ? 'tools-pulse' : ''}
                    style={{ ...pillBase, ...sessionStatusStyle(session.status) }}
                  >
                    {session.status}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.tr(session.topic || 'Canlı Ders')}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexShrink: 0,
                    fontSize: 12,
                    color: 'var(--ink-2)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="users" size={12} />
                    {session.participants?.length ?? 0} {t.tr("katılımcı")}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock" size={12} />
                    {session.startedAt ? formatTurkish(session.startedAt) : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Performance Snapshot ── */}
      <section style={sectionCard}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={accentBar('linear-gradient(180deg, #fbbf24, #fb923c)')} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
              <Icon name="activity" size={15} />
            </span>
            {t.tr("Performans Snapshot")}
          </h2>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
            {latestSnapshot
              ? `${t.tr("Son güncelleme:")} ${formatTurkish(latestSnapshot.recordedAt)}`
              : t.tr('Snapshot bulunamadı')}
          </p>
        </div>

        {latestSnapshot ? (
          <div className="tools-3col">
            {Object.entries(latestSnapshot.metrics).map(([key, value]) => {
              const barWidth = Math.min(100, Math.max(4, (value / 1000) * 100));
              return (
                <div
                  key={key}
                  className="tools-card-hover"
                  style={{
                    borderRadius: 'var(--r-lg)',
                    background: 'color-mix(in srgb, #fbbf24 6%, var(--panel))',
                    border: '1.5px solid var(--line)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--muted)',
                      margin: 0,
                    }}
                  >
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0, lineHeight: 1 }}>
                    {value}
                  </p>
                  <div
                    style={{
                      height: 6,
                      width: '100%',
                      borderRadius: 99,
                      background: 'var(--line)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 99,
                        background: 'linear-gradient(90deg, var(--accent-2), var(--accent))',
                        width: `${barWidth}%`,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>{t.tr("Snapshot verisi bulunamadı.")}</p>
        )}
      </section>
    </div>
  );
}
