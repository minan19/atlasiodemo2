'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '../_i18n/use-i18n';

/* ─── Config ─────────────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type NodeType = 'COURSE' | 'SKILL' | 'MILESTONE';
type NodeStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
type FilterTab = 'ALL' | 'COMPLETED' | 'ACTIVE' | 'LOCKED';

interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  status: NodeStatus;
  xpReward: number;
  prerequisites: string[];
  position: { x: number; y: number };
  progress?: number; // 0-100 for IN_PROGRESS nodes
}

interface RoadmapEdge {
  from: string;
  to: string;
}

interface RoadmapData {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

interface XpPopup {
  id: number;
  amount: number;
  nodeId: string;
}

/* ─── Demo Data ──────────────────────────────────────────────────────────── */

const DEMO_NODES: RoadmapNode[] = [
  // Column 1 — Foundation
  {
    id: 'prog-temelleri',
    title: 'Programlama Temelleri',
    description:
      'Değişkenler, döngüler, koşullar ve fonksiyonlar ile programlamaya ilk adım. Python ve JavaScript dillerinde temel kavramlar.',
    type: 'COURSE',
    status: 'COMPLETED',
    xpReward: 200,
    prerequisites: [],
    position: { x: 0, y: 0 },
    progress: 100,
  },
  {
    id: 'veri-yapilari',
    title: 'Veri Yapıları',
    description:
      'Dizi, yığın, kuyruk, bağlı liste, ağaç ve grafik veri yapıları. Bellekte etkin veri organizasyonu ve erişim stratejileri.',
    type: 'COURSE',
    status: 'COMPLETED',
    xpReward: 250,
    prerequisites: ['prog-temelleri'],
    position: { x: 0, y: 1 },
    progress: 100,
  },
  {
    id: 'algoritmalar',
    title: 'Algoritmalar',
    description:
      'Sıralama, arama ve graf algoritmaları. Zaman-uzay karmaşıklığı analizi, dinamik programlama ve açgözlü yaklaşımlar.',
    type: 'COURSE',
    status: 'IN_PROGRESS',
    xpReward: 300,
    prerequisites: ['veri-yapilari'],
    position: { x: 0, y: 2 },
    progress: 62,
  },
  // Column 2 — Intermediate
  {
    id: 'web-gelistirme',
    title: 'Web Geliştirme',
    description:
      'HTML5, CSS3 ve modern JavaScript ile responsive web sayfaları oluşturma. React ile bileşen tabanlı UI geliştirme.',
    type: 'COURSE',
    status: 'AVAILABLE',
    xpReward: 350,
    prerequisites: ['prog-temelleri'],
    position: { x: 1, y: 0 },
    progress: 0,
  },
  {
    id: 'veritabanlari',
    title: 'Veritabanları',
    description:
      'SQL ve NoSQL veritabanları. PostgreSQL, MongoDB, Redis ile veri modelleme, sorgulama ve optimizasyon teknikleri.',
    type: 'COURSE',
    status: 'LOCKED',
    xpReward: 300,
    prerequisites: ['algoritmalar', 'web-gelistirme'],
    position: { x: 1, y: 1 },
    progress: 0,
  },
  {
    id: 'api-tasarimi',
    title: 'API Tasarımı',
    description:
      'RESTful ve GraphQL API tasarım prensipleri. OpenAPI spesifikasyonu, kimlik doğrulama, oran sınırlama ve versiyon yönetimi.',
    type: 'SKILL',
    status: 'LOCKED',
    xpReward: 280,
    prerequisites: ['web-gelistirme'],
    position: { x: 1, y: 2 },
    progress: 0,
  },
  // Column 3 — Advanced
  {
    id: 'full-stack',
    title: 'Full-Stack Geliştirme',
    description:
      'Next.js, Node.js ve PostgreSQL ile uçtan uca uygulama geliştirme. CI/CD, test otomasyonu ve deployment süreçleri.',
    type: 'MILESTONE',
    status: 'LOCKED',
    xpReward: 500,
    prerequisites: ['veritabanlari', 'api-tasarimi'],
    position: { x: 2, y: 0 },
    progress: 0,
  },
  {
    id: 'devops',
    title: 'DevOps',
    description:
      'Docker, Kubernetes ve cloud platformları. Infrastructure as Code, monitoring, logging ve güvenilirlik mühendisliği.',
    type: 'COURSE',
    status: 'LOCKED',
    xpReward: 450,
    prerequisites: ['full-stack'],
    position: { x: 2, y: 1 },
    progress: 0,
  },
  {
    id: 'yapay-zeka',
    title: 'Yapay Zeka',
    description:
      'Makine öğrenmesi, derin öğrenme ve doğal dil işleme. TensorFlow, PyTorch ve büyük dil modelleri ile uygulama geliştirme.',
    type: 'MILESTONE',
    status: 'LOCKED',
    xpReward: 600,
    prerequisites: ['algoritmalar', 'full-stack'],
    position: { x: 2, y: 2 },
    progress: 0,
  },
];

const DEMO_EDGES: RoadmapEdge[] = [
  { from: 'prog-temelleri', to: 'veri-yapilari' },
  { from: 'veri-yapilari', to: 'algoritmalar' },
  { from: 'prog-temelleri', to: 'web-gelistirme' },
  { from: 'algoritmalar', to: 'veritabanlari' },
  { from: 'web-gelistirme', to: 'veritabanlari' },
  { from: 'web-gelistirme', to: 'api-tasarimi' },
  { from: 'veritabanlari', to: 'full-stack' },
  { from: 'api-tasarimi', to: 'full-stack' },
  { from: 'full-stack', to: 'devops' },
  { from: 'full-stack', to: 'yapay-zeka' },
  { from: 'algoritmalar', to: 'yapay-zeka' },
];

/* ─── Constants ──────────────────────────────────────────────────────────── */

const NODE_W = 148;
const NODE_H = 104;
const COL_GAP = 220;
const ROW_GAP = 140;
const SVG_PAD = 24;

const STATUS_COLOR: Record<NodeStatus, string> = {
  LOCKED: 'bg-slate-100 border-slate-200 text-slate-400',
  AVAILABLE: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  IN_PROGRESS: 'bg-amber-50 border-amber-300 text-amber-800',
  COMPLETED: 'bg-emerald-50 border-emerald-300 text-emerald-800',
};

const STATUS_ACCENT: Record<NodeStatus, string> = {
  LOCKED: 'bg-slate-300',
  AVAILABLE: 'bg-indigo-500',
  IN_PROGRESS: 'bg-amber-400',
  COMPLETED: 'bg-emerald-500',
};

const STATUS_ICON: Record<NodeStatus, string> = {
  LOCKED: '🔒',
  AVAILABLE: '▶',
  IN_PROGRESS: '⏳',
  COMPLETED: '✓',
};

const TYPE_BADGE: Record<NodeType, string> = {
  COURSE: 'Kurs',
  SKILL: 'Beceri',
  MILESTONE: 'Kilometre Taşı',
};

const TYPE_COLOR: Record<NodeType, string> = {
  COURSE: 'bg-blue-100 text-blue-700',
  SKILL: 'bg-violet-100 text-violet-700',
  MILESTONE: 'bg-rose-100 text-rose-700',
};

const COL_LABELS = ['Temel', 'Orta Seviye', 'İleri Seviye'];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'Tümü' },
  { key: 'COMPLETED', label: 'Tamamlanan' },
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'LOCKED', label: 'Kilitli' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function nodeCenter(node: RoadmapNode): { cx: number; cy: number } {
  return {
    cx: SVG_PAD + node.position.x * (NODE_W + COL_GAP) + NODE_W / 2,
    cy: SVG_PAD + node.position.y * (NODE_H + ROW_GAP) + NODE_H / 2,
  };
}

function svgDimensions(nodes: RoadmapNode[]): { width: number; height: number } {
  const maxX = Math.max(...nodes.map((n) => n.position.x));
  const maxY = Math.max(...nodes.map((n) => n.position.y));
  return {
    width: SVG_PAD * 2 + (maxX + 1) * NODE_W + maxX * COL_GAP,
    height: SVG_PAD * 2 + (maxY + 1) * NODE_H + maxY * ROW_GAP,
  };
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  bg,
  valClass,
  delay,
}: {
  icon: string;
  label: string;
  value: string | number;
  bg: string;
  valClass: string;
  delay: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${delay} ${bg}`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`metric text-3xl font-bold ${valClass}`}>{value}</p>
    </div>
  );
}

function SkeletonNode() {
  return (
    <div className="skeleton rounded-2xl border border-slate-100 p-3 space-y-2 w-[148px] h-[104px]">
      <div className="animate-pulse h-3 w-20 bg-slate-200 rounded" />
      <div className="animate-pulse h-2 w-28 bg-slate-100 rounded" />
      <div className="animate-pulse h-2 w-16 bg-slate-100 rounded" />
    </div>
  );
}

/* ─── Detail Panel ───────────────────────────────────────────────────────── */

function NodeDetailPanel({
  node,
  allNodes,
  onClose,
  onStart,
}: {
  node: RoadmapNode;
  allNodes: RoadmapNode[];
  onClose: () => void;
  onStart: (node: RoadmapNode) => void;
}) {
  const router = useRouter();
  const t = useI18n();
  const nodeMap = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

  const canInteract = node.status === 'AVAILABLE' || node.status === 'IN_PROGRESS';

  function handleAction() {
    if (!canInteract) return;
    onStart(node);
    router.push('/courses');
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl"
      style={{ animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLOR[node.type]}`}
            >
              {t.tr(TYPE_BADGE[node.type])}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[node.status]}`}
            >
              <span>{STATUS_ICON[node.status]}</span>
              {node.status === 'LOCKED'
                ? t.tr('Kilitli')
                : node.status === 'AVAILABLE'
                  ? t.tr('Hazır')
                  : node.status === 'IN_PROGRESS'
                    ? t.tr('Devam Ediyor')
                    : t.tr('Tamamlandı')}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-800 leading-snug truncate">{node.title}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label={t.tr("Paneli kapat")}
          className="shrink-0 mt-1 rounded-xl w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Description */}
        <div>
          <p className="text-sm text-slate-600 leading-relaxed">{node.description}</p>
        </div>

        {/* XP Reward */}
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">
              {t.tr("XP Ödülü")}
            </p>
            <p className="text-xl font-bold text-amber-700">+{node.xpReward} XP</p>
          </div>
        </div>

        {/* Progress bar (IN_PROGRESS only) */}
        {node.status === 'IN_PROGRESS' && typeof node.progress === 'number' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{t.tr("İlerleme")}</span>
              <span>{node.progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-700"
                style={{ width: `${node.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Prerequisites */}
        {node.prerequisites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.tr("Ön Koşullar")}
            </p>
            <ul className="space-y-1.5">
              {node.prerequisites.map((preId) => {
                const pre = nodeMap.get(preId);
                if (!pre) return null;
                const done = pre.status === 'COMPLETED';
                return (
                  <li key={preId} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        done
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? '✓' : '·'}
                    </span>
                    <span className={done ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                      {pre.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Locked message */}
        {node.status === 'LOCKED' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span className="text-lg">🔒</span>
              <span>{t.tr("Bu düğüm kilitli")}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.tr("Bu içeriğe erişmek için önce aşağıdaki konuları tamamlamanız gerekiyor:")}
            </p>
            <ul className="space-y-1 mt-2">
              {node.prerequisites
                .map((id) => nodeMap.get(id))
                .filter(Boolean)
                .filter((n) => n!.status !== 'COMPLETED')
                .map((n) => (
                  <li key={n!.id} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="text-slate-300">›</span>
                    {n!.title}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Completed message */}
        {node.status === 'COMPLETED' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-emerald-700">{t.tr("Tamamlandı!")}</p>
              <p className="text-xs text-emerald-600">{t.tr("Bu konuyu başarıyla bitirdiniz.")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="px-6 py-5 border-t border-slate-100">
        {node.status === 'AVAILABLE' && (
          <button
            onClick={handleAction}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
          >
            ▶ {t.tr("Başla")}
          </button>
        )}
        {node.status === 'IN_PROGRESS' && (
          <button
            onClick={handleAction}
            className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-200"
          >
            ⏳ {t.tr("Devam Et")}
          </button>
        )}
        {node.status === 'LOCKED' && (
          <button
            disabled
            className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed"
          >
            🔒 {t.tr("Kilitli")}
          </button>
        )}
        {node.status === 'COMPLETED' && (
          <button
            onClick={() => router.push('/courses')}
            className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
          >
            ✓ {t.tr("Kurslara Git")}
          </button>
        )}
      </div>
    </aside>
  );
}

/* ─── Skill Tree Canvas ──────────────────────────────────────────────────── */

function SkillTreeCanvas({
  nodes,
  edges,
  filteredIds,
  onNodeClick,
}: {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  filteredIds: Set<string>;
  onNodeClick: (node: RoadmapNode) => void;
}) {
  const t = useI18n();
  const { width, height } = svgDimensions(nodes);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="relative overflow-x-auto rounded-2xl">
      {/* Column headers */}
      <div
        className="absolute top-0 left-0 flex pointer-events-none"
        style={{ paddingLeft: SVG_PAD, gap: COL_GAP }}
      >
        {COL_LABELS.map((label, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400"
            style={{ width: NODE_W, paddingTop: 6 }}
          >
            {t.tr(label)}
          </div>
        ))}
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute top-0 left-0 pointer-events-none"
        aria-hidden
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#cbd5e1" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return null;

          const { cx: x1, cy: y1 } = nodeCenter(fromNode);
          const { cx: x2, cy: y2 } = nodeCenter(toNode);

          const isActive =
            filteredIds.has(edge.from) || filteredIds.has(edge.to) || filteredIds.size === 0;
          const isCompleted =
            fromNode.status === 'COMPLETED' && toNode.status !== 'LOCKED';

          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isCompleted ? '#10b981' : isActive ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={isCompleted ? 2.5 : 1.5}
              strokeDasharray={fromNode.status === 'LOCKED' || toNode.status === 'LOCKED' ? '6 4' : undefined}
              opacity={isActive ? 1 : 0.3}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>

      {/* Node cards */}
      <div className="relative" style={{ width, height }}>
        {nodes.map((node) => {
          const { cx, cy } = nodeCenter(node);
          const left = cx - NODE_W / 2;
          const top = cy - NODE_H / 2;
          const isFiltered = filteredIds.size > 0 && !filteredIds.has(node.id);
          const clickable = node.status !== 'LOCKED';

          return (
            <button
              key={node.id}
              onClick={() => onNodeClick(node)}
              className={[
                'absolute flex flex-col items-start gap-1.5 rounded-2xl border-2 p-3 text-left transition-all duration-200',
                STATUS_COLOR[node.status],
                isFiltered ? 'opacity-25 scale-95' : 'opacity-100',
                clickable
                  ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.03]'
                  : 'cursor-default',
                node.status === 'LOCKED' ? 'filter blur-[0.4px]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left, top, width: NODE_W, height: NODE_H }}
              aria-label={node.title}
              aria-disabled={node.status === 'LOCKED'}
            >
              {/* Status dot + icon */}
              <div className="flex w-full items-center justify-between">
                <span className="text-base leading-none">
                  {node.status === 'COMPLETED'
                    ? '✅'
                    : node.status === 'IN_PROGRESS'
                      ? '⏳'
                      : node.status === 'AVAILABLE'
                        ? '🎯'
                        : '🔒'}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    node.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-600'
                      : node.status === 'IN_PROGRESS'
                        ? 'bg-amber-100 text-amber-600'
                        : node.status === 'AVAILABLE'
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  +{node.xpReward}
                </span>
              </div>

              {/* Title */}
              <p className="text-xs font-bold leading-snug line-clamp-2 flex-1">{t.tr(node.title)}</p>

              {/* Progress mini-bar (IN_PROGRESS) */}
              {node.status === 'IN_PROGRESS' && typeof node.progress === 'number' && (
                <div className="w-full h-1 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
              )}

              {/* Accent dot bottom left */}
              <div
                className={`absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${STATUS_ACCENT[node.status]}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── XP Popup ───────────────────────────────────────────────────────────── */

function XpCelebration({ popups }: { popups: XpPopup[] }) {
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {popups.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-white font-bold shadow-xl text-sm"
          style={{
            animation: 'xpPop 2.4s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <span className="text-lg">⭐</span>+{p.amount} XP
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function RoadmapPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [edges, setEdges] = useState<RoadmapEdge[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [xpPopups, setXpPopups] = useState<XpPopup[]>([]);
  const xpCounterRef = useRef(0);

  /* ── Load token ── */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('accessToken') ?? '');
    }
  }, []);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
    [token]
  );

  /* ── Fetch roadmap ── */
  useEffect(() => {
    async function load() {
      setBusy(true);
      try {
        const res = await fetch(`${API_BASE}/learning-plans/roadmap`, {
          headers: authHeaders,
        });
        if (!res.ok) throw new Error('API error');
        const data: RoadmapData = await res.json();
        setNodes(data.nodes);
        setEdges(data.edges);
        setIsDemo(false);
      } catch {
        setNodes(DEMO_NODES);
        setEdges(DEMO_EDGES);
        setIsDemo(true);
      } finally {
        setBusy(false);
      }
    }
    load();
  }, [authHeaders]);

  /* ── Stats ── */
  const completedCount = useMemo(
    () => nodes.filter((n) => n.status === 'COMPLETED').length,
    [nodes]
  );
  const totalXp = useMemo(
    () =>
      nodes
        .filter((n) => n.status === 'COMPLETED')
        .reduce((sum, n) => sum + n.xpReward, 0),
    [nodes]
  );
  const activeCount = useMemo(
    () => nodes.filter((n) => n.status === 'IN_PROGRESS').length,
    [nodes]
  );
  const completionPct = useMemo(
    () => (nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0),
    [completedCount, nodes.length]
  );

  /* ── Filtered node ids ── */
  const filteredIds = useMemo<Set<string>>(() => {
    if (filter === 'ALL') return new Set<string>();
    return new Set(
      nodes
        .filter((n) => {
          if (filter === 'COMPLETED') return n.status === 'COMPLETED';
          if (filter === 'ACTIVE') return n.status === 'IN_PROGRESS' || n.status === 'AVAILABLE';
          if (filter === 'LOCKED') return n.status === 'LOCKED';
          return true;
        })
        .map((n) => n.id)
    );
  }, [nodes, filter]);

  /* ── Node click ── */
  function handleNodeClick(node: RoadmapNode) {
    setSelectedNode(node);
  }

  /* ── Start / Continue ── */
  function handleStart(node: RoadmapNode) {
    const id = ++xpCounterRef.current;
    setXpPopups((prev) => [...prev, { id, amount: node.xpReward, nodeId: node.id }]);
    setTimeout(() => {
      setXpPopups((prev) => prev.filter((p) => p.id !== id));
    }, 2600);
    // Optimistically mark AVAILABLE → IN_PROGRESS
    if (node.status === 'AVAILABLE') {
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, status: 'IN_PROGRESS', progress: 0 } : n))
      );
      if (selectedNode?.id === node.id) {
        setSelectedNode((prev) => prev ? { ...prev, status: 'IN_PROGRESS', progress: 0 } : null);
      }
    }
  }

  /* ── Stats config ── */
  const STATS = [
    {
      icon: '✅',
      label: t.tr('Tamamlanan Düğüm'),
      value: completedCount,
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200',
      valClass: 'text-emerald-700',
      delay: 1,
    },
    {
      icon: '⭐',
      label: t.tr('Toplam XP'),
      value: totalXp,
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',
      valClass: 'text-amber-700',
      delay: 2,
    },
    {
      icon: '⏳',
      label: t.tr('Aktif Görev'),
      value: activeCount,
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',
      valClass: 'text-blue-700',
      delay: 3,
    },
    {
      icon: '📊',
      label: t.tr('Tamamlanma %'),
      value: `${completionPct}%`,
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200',
      valClass: 'text-violet-700',
      delay: 4,
    },
  ];

  return (
    <>
      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes xpPop {
          0%   { transform: translateY(20px); opacity: 0; }
          15%  { transform: translateY(0);    opacity: 1; }
          75%  { transform: translateY(-8px); opacity: 1; }
          100% { transform: translateY(-20px);opacity: 0; }
        }
      `}</style>

      <main className="space-y-6">
        {/* ── Hero ── */}
        <header className="glass p-6 rounded-2xl border border-slate-200 hero">
          <div className="hero-content space-y-2">
            <div className="pill w-fit">{t.roadmap.title}</div>
            <h1 className="text-3xl font-semibold">🗺️ {t.roadmap.title}</h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              {t.tr("Beceri ağacında ilerle, rozetler kazan")}
            </p>
          </div>
        </header>

        {/* ── Stats strip ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </section>

        {/* ── Demo banner ── */}
        {isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
            <span>⚠</span>
            <span>{t.tr("Demo verisi gösteriliyor. Gerçek yol haritası için API bağlantısını kontrol edin.")}</span>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <nav className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                filter === tab.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700',
              ].join(' ')}
            >
              {t.tr(tab.label)}
              {tab.key !== 'ALL' && (
                <span className="ml-1.5 text-[10px] font-bold opacity-70">
                  {tab.key === 'COMPLETED'
                    ? `(${completedCount})`
                    : tab.key === 'ACTIVE'
                      ? `(${activeCount})`
                      : `(${nodes.filter((n) => n.status === 'LOCKED').length})`}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Skill Tree ── */}
        <section className="glass rounded-2xl border border-slate-200 p-6 overflow-hidden animate-fade-slide-up stagger-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500 inline-block" />
              {t.tr("Beceri Ağacı")}
            </h2>
            <div className="flex flex-wrap gap-3 text-xs">
              {(
                [
                  { status: 'COMPLETED', label: 'Tamamlandı' },
                  { status: 'IN_PROGRESS', label: 'Devam Ediyor' },
                  { status: 'AVAILABLE', label: 'Hazır' },
                  { status: 'LOCKED', label: 'Kilitli' },
                ] as { status: NodeStatus; label: string }[]
              ).map(({ status, label }) => (
                <span key={status} className="flex items-center gap-1.5 text-slate-500">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${STATUS_ACCENT[status]}`}
                  />
                  {t.tr(label)}
                </span>
              ))}
            </div>
          </div>

          {busy ? (
            <div className="flex flex-wrap gap-6 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonNode key={i} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <SkillTreeCanvas
                nodes={nodes}
                edges={edges}
                filteredIds={filteredIds}
                onNodeClick={handleNodeClick}
              />
            </div>
          )}
        </section>

        {/* ── Legend / guide ── */}
        <section className="glass rounded-2xl border border-slate-200 p-5 animate-fade-slide-up stagger-3">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span>💡</span> {t.tr("Nasıl İlerlenir?")}
          </h3>
          <ol className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
                1
              </span>
              <span>
                <strong>{t.tr("Mavi düğümlere")}</strong> {t.tr("(Hazır) tıklayarak öğrenmeye başla.")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center mt-0.5">
                2
              </span>
              <span>
                <strong>{t.tr("Turuncu düğümler")}</strong> {t.tr("başladığın ama bitirmediğin konuları gösterir — devam et!")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center mt-0.5">
                3
              </span>
              <span>
                <strong>{t.tr("Yeşil düğümler")}</strong> {t.tr("tamamladığın konular — XP kazandın!")}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center mt-0.5">
                4
              </span>
              <span>
                <strong>{t.tr("Gri/kilitli düğümler")}</strong> {t.tr("ön koşullar tamamlandıktan sonra açılır.")}
              </span>
            </li>
          </ol>
        </section>

        {/* ── Visible node list (filtered view) ── */}
        {filter !== 'ALL' && filteredIds.size > 0 && (
          <section className="space-y-3 animate-fade-slide-up stagger-4">
            <h3 className="text-sm font-bold text-slate-700">
              {filter === 'COMPLETED'
                ? `✅ ${t.tr('Tamamlanan Konular')}`
                : filter === 'ACTIVE'
                  ? `⏳ ${t.tr('Aktif Konular')}`
                  : `🔒 ${t.tr('Kilitli Konular')}`}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nodes
                .filter((n) => filteredIds.has(n.id))
                .map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className={[
                      'rounded-2xl border-2 p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5',
                      STATUS_COLOR[node.status],
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-lg">
                        {node.status === 'COMPLETED'
                          ? '✅'
                          : node.status === 'IN_PROGRESS'
                            ? '⏳'
                            : node.status === 'AVAILABLE'
                              ? '🎯'
                              : '🔒'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${TYPE_COLOR[node.type]}`}
                      >
                        {t.tr(TYPE_BADGE[node.type])}
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-snug mb-1">{t.tr(node.title)}</p>
                    <p className="text-xs opacity-70 line-clamp-2">{t.tr(node.description ?? "")}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-600">
                        +{node.xpReward} XP
                      </span>
                      {node.status === 'IN_PROGRESS' && typeof node.progress === 'number' && (
                        <span className="text-xs font-semibold">{node.progress}%</span>
                      )}
                    </div>
                    {node.status === 'IN_PROGRESS' && typeof node.progress === 'number' && (
                      <div className="mt-1.5 h-1 rounded-full bg-amber-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Detail Panel overlay ── */}
      {selectedNode && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedNode(null)}
          />
          <NodeDetailPanel
            node={selectedNode}
            allNodes={nodes}
            onClose={() => setSelectedNode(null)}
            onStart={handleStart}
          />
        </>
      )}

      {/* ── XP Celebration popups ── */}
      <XpCelebration popups={xpPopups} />
    </>
  );
}
