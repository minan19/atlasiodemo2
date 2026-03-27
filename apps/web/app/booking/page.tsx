'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ── Types ──────────────────────────────────────────────────────────────────

type BookingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

interface Booking {
  id: string;
  instructorId: string;
  studentId: string;
  start: string;
  end: string;
  meetingLink: string | null;
  status: BookingStatus;
  createdAt: string;
}

type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled';

// ── Demo data ──────────────────────────────────────────────────────────────

const DEMO_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    instructorId: 'inst-1',
    studentId: 'me',
    start: '2026-04-02T14:00:00',
    end: '2026-04-02T15:00:00',
    meetingLink: 'https://meet.google.com/abc',
    status: 'SCHEDULED',
    createdAt: '2026-03-20',
  },
  {
    id: 'b2',
    instructorId: 'inst-2',
    studentId: 'me',
    start: '2026-03-25T10:00:00',
    end: '2026-03-25T11:00:00',
    meetingLink: null,
    status: 'COMPLETED',
    createdAt: '2026-03-15',
  },
  {
    id: 'b3',
    instructorId: 'inst-1',
    studentId: 'me',
    start: '2026-03-18T16:00:00',
    end: '2026-03-18T17:00:00',
    meetingLink: 'https://zoom.us/j/123',
    status: 'CANCELLED',
    createdAt: '2026-03-10',
  },
  {
    id: 'b4',
    instructorId: 'inst-3',
    studentId: 'me',
    start: '2026-04-10T09:00:00',
    end: '2026-04-10T10:00:00',
    meetingLink: 'https://teams.microsoft.com/l/xyz',
    status: 'SCHEDULED',
    createdAt: '2026-03-22',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const day = s.getDate();
  const month = TR_MONTHS[s.getMonth()];
  const year = s.getFullYear();
  const startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
  return `${day} ${month} ${year}, ${startTime}–${endTime}`;
}

function isUpcoming(booking: Booking): boolean {
  return booking.status !== 'CANCELLED' && new Date(booking.start) > new Date();
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === 'SCHEDULED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
        Planlandı
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        Tamamlandı
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
      İptal Edildi
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function BookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New booking form state
  const [formInstructorId, setFormInstructorId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formMeetingLink, setFormMeetingLink] = useState('');

  // Load bookings on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${API_BASE}/booking/student/me`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json() as Promise<Booking[]>;
      })
      .then((data) => {
        setBookings(Array.isArray(data) && data.length > 0 ? data : DEMO_BOOKINGS);
      })
      .catch(() => {
        setBookings(DEMO_BOOKINGS);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────

  const now = new Date();
  const totalCount = bookings.length;
  const upcomingCount = bookings.filter(isUpcoming).length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;

  // ── Filter ─────────────────────────────────────────────────────────────

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') return isUpcoming(b);
    if (activeTab === 'past') return new Date(b.start) <= now && b.status !== 'CANCELLED';
    if (activeTab === 'cancelled') return b.status === 'CANCELLED';
    return true;
  });

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleCancel(id: string) {
    if (!window.confirm('Bu seansı iptal etmek istediğinizden emin misiniz?')) return;
    setCancelling(id);
    try {
      const res = await fetch(`${API_BASE}/booking/${id}/cancel`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('İptal edilemedi');
      // Optimistic update
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' as BookingStatus } : b))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İptal işlemi başarısız');
    } finally {
      setCancelling(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formInstructorId || !formStart || !formEnd) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        instructorId: formInstructorId,
        studentId: 'me',
        start: formStart,
        end: formEnd,
      };
      if (formMeetingLink) body.meetingLink = formMeetingLink;

      const res = await fetch(`${API_BASE}/booking`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Seans oluşturulamadı');
      const newBooking = (await res.json()) as Booking;
      setBookings((prev) => [newBooking, ...prev]);
      setShowForm(false);
      setFormInstructorId('');
      setFormStart('');
      setFormEnd('');
      setFormMeetingLink('');
    } catch {
      // Optimistic demo add
      const optimistic: Booking = {
        id: `local-${Date.now()}`,
        instructorId: formInstructorId,
        studentId: 'me',
        start: formStart,
        end: formEnd,
        meetingLink: formMeetingLink || null,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setBookings((prev) => [optimistic, ...prev]);
      setShowForm(false);
      setFormInstructorId('');
      setFormStart('');
      setFormEnd('');
      setFormMeetingLink('');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Tab config ─────────────────────────────────────────────────────────

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'upcoming', label: 'Yaklaşan' },
    { key: 'past', label: 'Geçmiş' },
    { key: 'cancelled', label: 'İptal' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* ── Hero ── */}
      <header className="hero glass rounded-2xl p-8">
        <div className="hero-content space-y-3 animate-fade-slide-up">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              📅 Seans Rezervasyonu
            </h1>
          </div>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl">
            Eğitmenlerle bire bir seans planlayın.
          </p>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Toplam Seans',
            value: totalCount,
            icon: '📋',
            bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/10 dark:border-indigo-700',
            val: 'text-indigo-700 dark:text-indigo-300',
            stagger: 'stagger-1',
          },
          {
            label: 'Yaklaşan',
            value: upcomingCount,
            icon: '🔜',
            bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/10 dark:border-emerald-700',
            val: 'text-emerald-700 dark:text-emerald-300',
            stagger: 'stagger-2',
          },
          {
            label: 'İptal Edilen',
            value: cancelledCount,
            icon: '🚫',
            bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 dark:from-rose-900/20 dark:to-rose-800/10 dark:border-rose-700',
            val: 'text-rose-700 dark:text-rose-300',
            stagger: 'stagger-3',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border ${stat.bg} p-5 flex flex-col gap-1 animate-fade-slide-up ${stat.stagger}`}
          >
            <span className="text-2xl">{stat.icon}</span>
            <span className={`metric text-3xl font-bold ${stat.val}`}>{stat.value}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Actions row ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* New booking button */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className={[
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
            showForm
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/30',
          ].join(' ')}
        >
          <span>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Kapat' : 'Yeni Seans Planla'}
        </button>
      </div>

      {/* ── Inline create form ── */}
      {showForm && (
        <section className="glass rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6 animate-fade-slide-up">
          <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400 inline-block" />
            Yeni Seans Planla
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Eğitmen ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="inst-1"
                  value={formInstructorId}
                  onChange={(e) => setFormInstructorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Toplantı Linki
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={formMeetingLink}
                  onChange={(e) => setFormMeetingLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Başlangıç <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Bitiş <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-500 dark:text-rose-400">{error}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !formInstructorId || !formStart || !formEnd}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting && (
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Planla
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Booking list ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400 inline-block" />
          Seanslarım
          <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
            ({filteredBookings.length})
          </span>
        </div>

        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton glass rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-24 animate-pulse"
              />
            ))}
          </>
        ) : filteredBookings.length === 0 ? (
          <div className="glass rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Bu filtrede seans bulunamadı.
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const upcoming = isUpcoming(booking);
            const isCancelling = cancelling === booking.id;

            return (
              <div
                key={booking.id}
                className={[
                  'glass rounded-2xl border p-5 transition-all hover:shadow-md',
                  booking.status === 'CANCELLED'
                    ? 'border-rose-200 dark:border-rose-900/50 opacity-60'
                    : booking.status === 'COMPLETED'
                    ? 'border-emerald-200 dark:border-emerald-800/50'
                    : 'border-blue-200 dark:border-blue-800/50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Date + time */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">📅</span>
                      <span
                        className={[
                          'text-sm font-semibold text-slate-800 dark:text-white',
                          booking.status === 'CANCELLED' ? 'line-through text-slate-400 dark:text-slate-500' : '',
                        ].join(' ')}
                      >
                        {formatDateRange(booking.start, booking.end)}
                      </span>
                    </div>

                    {/* Instructor pill */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="pill inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                        Eğitmen: {booking.instructorId}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>

                    {/* Meeting link preview */}
                    {booking.meetingLink && booking.status !== 'CANCELLED' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs font-mono">
                        {booking.meetingLink}
                      </p>
                    )}
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {booking.meetingLink && booking.status !== 'CANCELLED' && (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <span>🔗</span>
                        Toplantıya Katıl
                      </a>
                    )}
                    {upcoming && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={isCancelling}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isCancelling ? (
                          <span className="inline-block h-3 w-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>✕</span>
                        )}
                        İptal Et
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
