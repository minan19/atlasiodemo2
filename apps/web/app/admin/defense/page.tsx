'use client';

import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ActionType = 'WARN' | 'SUSPEND' | 'BAN' | 'DISMISS';
type FilterTab = 'ALL' | Severity;

interface DefenseEvent {
  id: string;
  type: string;
  userId: string;
  severity: Severity;
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface ConfirmState {
  eventId: string;
  actionType: ActionType;
  label: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_EVENTS: DefenseEvent[] = [
  {
    id: 'evt-001',
    type: 'TAB_SWITCH',
    userId: 'usr_ayse_kaya',
    severity: 'MEDIUM',
    description: 'Kullanıcı sınav süresince 7 kez sekme değiştirdi. Son 5 dakikada frekans arttı.',
    timestamp: new Date(Date.now() - 1_200_000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-002',
    type: 'COPY_PASTE',
    userId: 'usr_mehmet_demir',
    severity: 'HIGH',
    description: 'Sınav metin alanına dışarıdan 3 farklı yapıştırma işlemi tespit edildi.',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-003',
    type: 'FACE_ABSENCE',
    userId: 'usr_zeynep_sahin',
    severity: 'HIGH',
    description: 'Kamera görüntüsünde yüz 4 dk boyunca tespit edilemedi. Kullanıcı uzaklaştı.',
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    resolved: true,
  },
  {
    id: 'evt-004',
    type: 'MULTIPLE_IPS',
    userId: 'usr_ali_celik',
    severity: 'CRITICAL',
    description: '3 farklı IP adresinden (TR, DE, US) eş zamanlı oturum tespit edildi.',
    timestamp: new Date(Date.now() - 300_000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-005',
    type: 'SUSPICIOUS_TIMING',
    userId: 'usr_fatma_yildiz',
    severity: 'MEDIUM',
    description: 'Her soru ortalama 3 sn içinde yanıtlandı. İnsan hızıyla bağdaşmıyor.',
    timestamp: new Date(Date.now() - 900_000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-006',
    type: 'DEVTOOLS_OPEN',
    userId: 'usr_can_arslan',
    severity: 'CRITICAL',
    description: 'Tarayıcı geliştirici araçları açılarak DOM manipülasyonu denemesi algılandı.',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    resolved: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1_000);
  if (s < 60) return `${s} sn önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function isSameDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const SEVERITY_CONFIG: Record<
  Severity,
  { badge: string; border: string; label: string; dot: string }
> = {
  CRITICAL: {
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    border: 'border-l-rose-500',
    label: 'Kritik',
    dot: 'bg-rose-500',
  },
  HIGH: {
    badge: 'bg-orange-100 text-orange-700 border border-orange-200',
    border: 'border-l-orange-500',
    label: 'Yüksek',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    border: 'border-l-amber-500',
    label: 'Orta',
    dot: 'bg-amber-400',
  },
  LOW: {
    badge: 'bg-slate-100 text-slate-600 border border-slate-200',
    border: 'border-l-slate-400',
    label: 'Düşük',
    dot: 'bg-slate-400',
  },
};

const ACTION_CONFIG: Record<
  ActionType,
  { label: string; cls: string }
> = {
  WARN: {
    label: 'Uyar',
    cls: 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  SUSPEND: {
    label: 'Askıya Al',
    cls: 'border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  BAN: {
    label: 'Engelle',
    cls: 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
  },
  DISMISS: {
    label: 'Yoksay',
    cls: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  },
};

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'Tümü', value: 'ALL' },
  { label: 'Kritik', value: 'CRITICAL' },
  { label: 'Yüksek', value: 'HIGH' },
  { label: 'Orta', value: 'MEDIUM' },
  { label: 'Düşük', value: 'LOW' },
];

const EVENT_TYPE_OPTIONS = [
  'TAB_SWITCH',
  'COPY_PASTE',
  'FACE_ABSENCE',
  'MULTIPLE_IPS',
  'SUSPICIOUS_TIMING',
  'DEVTOOLS_OPEN',
  'SCREEN_SHARE',
  'AUDIO_DETECTED',
  'PHONE_DETECTED',
  'PROXY_DETECTED',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DefenseDashboardPage() {
  const t = useI18n();
  const [events, setEvents] = useState<DefenseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create-event form state
  const [formType, setFormType] = useState<string>(EVENT_TYPE_OPTIONS[0]);
  const [formUserId, setFormUserId] = useState('');
  const [formSeverity, setFormSeverity] = useState<Severity>('MEDIUM');
  const [formDescription, setFormDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Fetch events ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/defense/events`, { headers: authHeaders() });
      if (!res.ok) throw new Error('API error');
      const data: DefenseEvent[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        setIsDemo(false);
      } else {
        setEvents(DEMO_EVENTS);
        setIsDemo(true);
      }
    } catch {
      setEvents(DEMO_EVENTS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalCount = events.length;
  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const unresolvedCount = events.filter((e) => !e.resolved).length;
  const todayCount = events.filter((e) => isSameDay(e.timestamp)).length;

  const STATS = [
    {
      label: 'Toplam Olay',
      value: totalCount,
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200',
      val: 'text-slate-800',
      icon: '📋',
    },
    {
      label: 'Kritik',
      value: criticalCount,
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200',
      val: 'text-rose-700',
      icon: '🔴',
    },
    {
      label: 'Çözümlenmemiş',
      value: unresolvedCount,
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/60 border-orange-200',
      val: 'text-orange-700',
      icon: '⚠️',
    },
    {
      label: 'Bugün',
      value: todayCount,
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/60 border-violet-200',
      val: 'text-violet-700',
      icon: '📅',
    },
  ];

  // ── Filtered events ─────────────────────────────────────────────────────────
  const filtered = filter === 'ALL' ? events : events.filter((e) => e.severity === filter);

  // ── Take action ─────────────────────────────────────────────────────────────
  async function handleAction(eventId: string, actionType: ActionType) {
    setActionLoading(eventId + actionType);
    try {
      // Create the action
      const createRes = await fetch(`${API}/defense/actions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ eventId, actionType, reason: `Admin action: ${actionType}` }),
      });
      if (!createRes.ok) throw new Error('Action create failed');
      const created = await createRes.json();
      const actionId: string = created?.id ?? created?.actionId ?? 'unknown';

      // Apply the action
      await fetch(`${API}/defense/actions/${actionId}/apply`, {
        method: 'POST',
        headers: authHeaders(),
      });

      // Optimistically mark as resolved
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, resolved: true } : e))
      );
    } catch {
      // In demo mode, still mark as resolved for UX
      if (isDemo) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, resolved: true } : e))
        );
      }
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  }

  function openConfirm(eventId: string, actionType: ActionType) {
    setConfirm({ eventId, actionType, label: ACTION_CONFIG[actionType].label });
  }

  // ── Create event ─────────────────────────────────────────────────────────────
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formUserId.trim() || !formDescription.trim()) {
      setFormError('Kullanıcı ID ve açıklama zorunludur.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API}/defense/events`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type: formType,
          userId: formUserId.trim(),
          severity: formSeverity,
          description: formDescription.trim(),
        }),
      });
      const newEvent: DefenseEvent = res.ok
        ? await res.json()
        : {
            id: `evt-${Date.now()}`,
            type: formType,
            userId: formUserId.trim(),
            severity: formSeverity,
            description: formDescription.trim(),
            timestamp: new Date().toISOString(),
            resolved: false,
          };
      setEvents((prev) => [newEvent, ...prev]);
      setFormUserId('');
      setFormDescription('');
      setFormType(EVENT_TYPE_OPTIONS[0]);
      setFormSeverity('MEDIUM');
      setShowCreateForm(false);
    } catch {
      // Demo fallback: add locally
      const fallback: DefenseEvent = {
        id: `evt-${Date.now()}`,
        type: formType,
        userId: formUserId.trim(),
        severity: formSeverity,
        description: formDescription.trim(),
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      setEvents((prev) => [fallback, ...prev]);
      setFormUserId('');
      setFormDescription('');
      setFormType(EVENT_TYPE_OPTIONS[0]);
      setFormSeverity('MEDIUM');
      setShowCreateForm(false);
    } finally {
      setFormSubmitting(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-6">

      {/* ── Hero ── */}
      <header className="glass hero rounded-2xl border border-slate-200 p-6">
        <div className="hero-content flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {isDemo && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 mb-1">
                {t.tr("⚠️ Demo modu — API bağlı değil, örnek veriler gösteriliyor")}
              </div>
            )}
            <div className="pill w-fit">{t.tr("🛡️ Güvenlik")}</div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              {t.tr("🛡️⚔️ Savunma Merkezi")}
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              {t.tr("Hile tespiti ve güvenlik olayları yönetimi")}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm ${
              showCreateForm
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {showCreateForm ? t.tr("✕ İptal") : t.tr("+ Olay Oluştur")}
          </button>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={t.tr(s.label)}
            className={`metric rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${i + 1 as 1|2|3|4} ${s.bg}`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>{s.icon}</span>
              <span>{t.tr(s.label)}</span>
            </div>
            <p className={`text-3xl font-extrabold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* ── Create event form ── */}
      {showCreateForm && (
        <section className="glass rounded-2xl border border-violet-200 bg-violet-50/30 p-5 animate-fade-slide-up">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 inline-block" />
            {t.tr("Yeni Olay Oluştur")}
          </h2>
          <form onSubmit={handleCreateEvent} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">{t.tr("Olay Türü")}</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {EVENT_TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">{t.tr("Önem Derecesi")}</label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as Severity)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((sv) => (
                  <option key={sv} value={sv}>{SEVERITY_CONFIG[sv].label}</option>
                ))}
              </select>
            </div>

            {/* User ID */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">{t.tr("Kullanıcı ID")}</label>
              <input
                type="text"
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                placeholder={t.tr("Ör: usr_12345")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {/* Description — full width */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600">{t.tr("Açıklama")}</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                placeholder={t.tr("Olayın ayrıntılı açıklamasını girin…")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
            </div>

            {formError && (
              <p className="sm:col-span-2 text-xs text-rose-600 font-medium">{formError}</p>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                {t.tr("İptal")}
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-all"
              >
                {formSubmitting ? t.tr("Oluşturuluyor…") : t.tr("Olay Oluştur")}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Events section ── */}
      <section className="glass rounded-2xl border border-slate-200">

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
          <span className="text-sm font-semibold text-slate-600 mr-1">{t.tr("Filtre:")}</span>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                filter === tab.value
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.tr(tab.label)}
              {tab.value !== 'ALL' && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === tab.value ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  {events.filter((e) => e.severity === tab.value).length}
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} {t.tr("olay")}</span>
        </div>

        {/* Event list */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="h-10 w-1 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-5 w-20 rounded-full bg-slate-200" />
                      <div className="h-5 w-28 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-3 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm text-slate-500">{t.tr("Bu filtrede olay bulunamadı.")}</p>
            </div>
          ) : (
            filtered.map((event) => {
              const sev = SEVERITY_CONFIG[event.severity];
              const isActing = actionLoading?.startsWith(event.id);
              return (
                <div
                  key={event.id}
                  className={`border-l-4 px-5 py-4 transition-all hover:bg-slate-50/60 ${sev.border} ${
                    event.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: badges + info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Severity badge */}
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${sev.badge}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sev.dot} mr-1 align-middle`} />
                          {t.tr(sev.label)}
                        </span>

                        {/* Event type pill */}
                        <span className="pill pill-sm font-mono tracking-tight">
                          {event.type}
                        </span>

                        {/* Resolved badge */}
                        {event.resolved && (
                          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(200,169,106,0.15)", border: "1px solid rgba(200,169,106,0.3)", color: "#C8A96A" }}>
                            {t.tr("✓ Çözümlendi")}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-700">{event.userId}</span>
                        <span>·</span>
                        <span>{relTime(event.timestamp)}</span>
                        <span>·</span>
                        <span className="font-mono text-[10px] text-slate-400">{event.id}</span>
                      </div>

                      <p className="text-sm text-slate-700 leading-snug">{t.tr(event.description)}</p>
                    </div>

                    {/* Right: action buttons */}
                    {!event.resolved && (
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {((['WARN', 'SUSPEND', 'BAN', 'DISMISS'] as ActionType[])).map((at) => {
                          const ac = ACTION_CONFIG[at];
                          return (
                            <button
                              key={at}
                              disabled={!!isActing}
                              onClick={() => openConfirm(event.id, at)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${ac.cls}`}
                            >
                              {isActing && actionLoading === event.id + at ? (
                                <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                              ) : (
                                ac.label
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Confirm dialog ── */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="glass rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl w-full max-w-sm animate-fade-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <div className="text-4xl">
                {confirm.actionType === 'BAN'
                  ? '🚫'
                  : confirm.actionType === 'SUSPEND'
                  ? '⏸️'
                  : confirm.actionType === 'WARN'
                  ? '⚠️'
                  : '✕'}
              </div>
              <h3 className="text-base font-bold text-slate-800">
                {t.tr("Eylemi Onayla")}
              </h3>
              <p className="text-sm text-slate-500">
                <strong className="text-slate-700">{t.tr(confirm.label)}</strong> {t.tr("eylemini")}{' '}
                <span className="font-mono text-xs bg-slate-100 px-1 rounded">{confirm.eventId}</span>{' '}
                {t.tr("olayı için uygulamak istediğinize emin misiniz?")}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                  {t.tr("İptal")}
                </button>
                <button
                  onClick={() => handleAction(confirm.eventId, confirm.actionType)}
                  disabled={actionLoading !== null}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white transition-all disabled:opacity-60 ${
                    confirm.actionType === 'BAN'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirm.actionType === 'SUSPEND'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : confirm.actionType === 'WARN'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {actionLoading !== null ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                      {t.tr("İşleniyor…")}
                    </span>
                  ) : (
                    `${t.tr("Evet,")} ${t.tr(confirm.label)}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
