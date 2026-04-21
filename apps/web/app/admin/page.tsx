'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../api/client';
import { useI18n } from '../_i18n/use-i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string | null;
  enrollmentCount?: number;
  xp?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Yönetici' },
  { value: 'HEAD_INSTRUCTOR', label: 'Baş Eğitmen' },
  { value: 'INSTRUCTOR', label: 'Eğitmen' },
  { value: 'STUDENT', label: 'Öğrenci' },
  { value: 'GUARDIAN', label: 'Veli' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  HEAD_INSTRUCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
  INSTRUCTOR: 'bg-sky-50 text-sky-700 border-sky-200',
  STUDENT: 'bg-amber-50 text-amber-700 border-amber-200',
  GUARDIAN: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── CSV export helper ────────────────────────────────────────────────────────

function exportCSV(rows: User[]) {
  const headers = ['ID', 'Ad', 'E-posta', 'Rol', 'Durum', 'E-posta Doğrulandı', 'Kayıt Tarihi'];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((u) =>
      [
        u.id,
        escape(u.name ?? ''),
        escape(u.email),
        u.role,
        u.isActive ? 'Aktif' : 'Pasif',
        u.emailVerified ? 'Evet' : 'Hayır',
        new Date(u.createdAt).toLocaleDateString('tr-TR'),
      ].join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kullanicilar_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Detail side panel ────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const t = useI18n();

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  const gradientFor = (id: string) => {
    const palette = [
      'from-amber-400 to-yellow-400',
      'from-violet-400 to-purple-400',
      'from-rose-400 to-orange-400',
      'from-sky-400 to-blue-400',
      'from-amber-400 to-yellow-400',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % palette.length;
    return palette[hash];
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease' }}
    >
      <div
        className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-y-auto"
        style={{ animation: 'slideInRight 0.2s ease' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-lg transition-colors z-10"
          aria-label={t.tr("Kapat")}
        >
          ×
        </button>

        {/* Avatar + name header */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200 px-6 pt-8 pb-6 flex flex-col items-center gap-3">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientFor(user.id)} flex items-center justify-center text-white text-3xl font-bold shadow-md`}
          >
            {initial}
          </div>
          <div className="text-center">
            <div className="font-semibold text-slate-900 text-lg leading-tight">
              {user.name ?? <span className="text-slate-400 italic">{t.tr("İsimsiz")}</span>}
            </div>
            <div className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-0.5">
              {user.email}
              {user.emailVerified ? (
                <span className="text-xs font-medium" style={{ color: "#C8A96A" }} title={t.tr("Doğrulandı")}>✓</span>
              ) : (
                <span className="text-amber-500 text-xs" title={t.tr("Doğrulanmadı")}>!</span>
              )}
            </div>
          </div>
          <span
            className={`pill text-xs border rounded-full px-3 py-1 font-semibold ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
          >
            {ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 px-6 py-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">{t.tr("Hesap Durumu")}</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                user.isActive
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-amber-500' : 'bg-slate-400'}`} />
              {user.isActive ? t.tr('Aktif') : t.tr('Pasif')}
            </span>
          </div>

          {/* Join date */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">{t.tr("Kayıt Tarihi")}</span>
            <span className="text-sm font-medium text-slate-700">
              {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Last login */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500">{t.tr("Son Giriş")}</span>
            <span className="text-sm font-medium text-slate-700">
              {user.lastLogin
                ? new Date(user.lastLogin).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="glass rounded-xl p-4 text-center border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">
                {user.enrollmentCount ?? '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.tr("Toplam Kayıt")}</div>
            </div>
            <div className="glass rounded-xl p-4 text-center" style={{ border: "1px solid rgba(200,169,106,0.2)", background: "rgba(200,169,106,0.06)" }}>
              <div className="text-2xl font-bold" style={{ color: "#C8A96A" }}>
                {user.xp !== undefined ? user.xp.toLocaleString('tr-TR') : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">XP</div>
            </div>
          </div>

          {/* User ID */}
          <div className="pt-2">
            <div className="text-xs text-slate-400 mb-1">{t.tr("Kullanıcı ID")}</div>
            <div className="font-mono text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 break-all border border-slate-100">
              {user.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk role change modal ───────────────────────────────────────────────────

function BulkRoleModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: (role: string) => void;
  onCancel: () => void;
}) {
  const t = useI18n();
  const [role, setRole] = useState('STUDENT');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="glass bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4 border border-slate-200">
        <h2 className="font-semibold text-slate-900">
          {count} {t.tr("kullanıcının rolünü değiştir")}
        </h2>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{t.tr(r.label)}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {t.tr("İptal")}
          </button>
          <button
            onClick={() => onConfirm(role)}
            className="px-4 py-2 rounded-xl text-sm bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          >
            {t.tr("Uygula")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const t = useI18n();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Bulk select ──────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkRole, setShowBulkRole] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // ── Detail panel ─────────────────────────────────────────────────────────────
  const [detailUser, setDetailUser] = useState<User | null>(null);

  // ── Load users ───────────────────────────────────────────────────────────────
  useEffect(() => {
    api<User[]>('/users')
      .then(setUsers)
      .catch((e) => {
        if (e?.message?.includes('401') || e?.message?.includes('403')) {
          router.push('/login');
        } else {
          setError(e?.message ?? t.tr('Kullanıcılar yüklenemedi'));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  // ── Reset page on filter change ───────────────────────────────────────────────
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, roleFilter, statusFilter]);

  // ── Per-row role change (existing) ───────────────────────────────────────────
  async function handleRoleChange(userId: string, role: string) {
    setSaving((s) => ({ ...s, [userId]: true }));
    setMsgs((m) => ({ ...m, [userId]: { ok: true, text: '' } }));
    try {
      const updated = await api<User>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsgs((m) => ({ ...m, [userId]: { ok: true, text: t.tr('✓ Rol güncellendi') } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.tr('Hata');
      setMsgs((m) => ({ ...m, [userId]: { ok: false, text: msg } }));
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
      setTimeout(() => setMsgs((m) => { const n = { ...m }; delete n[userId]; return n; }), 2500);
    }
  }

  // ── Toggle active (existing) ──────────────────────────────────────────────────
  async function toggleActive(userId: string, current: boolean) {
    setSaving((s) => ({ ...s, [userId]: true }));
    try {
      const updated = await api<User>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !current }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsgs((m) => ({
        ...m,
        [userId]: { ok: true, text: `✓ ${t.tr('Hesap')} ${!current ? t.tr('aktif') : t.tr('devre dışı')}` },
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.tr('Hata');
      setMsgs((m) => ({ ...m, [userId]: { ok: false, text: msg } }));
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
      setTimeout(() => setMsgs((m) => { const n = { ...m }; delete n[userId]; return n; }), 2500);
    }
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    const confirmed = window.confirm(`${selected.size} ${t.tr('kullanıcıyı silmek istediğinize emin misiniz?')}`);
    if (!confirmed) return;
    setBulkSaving(true);
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => api(`/users/${id}`, { method: 'DELETE' })));
      setUsers((prev) => prev.filter((u) => !selected.has(u.id)));
      setSelected(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.tr('Toplu silme hatası');
      alert(msg);
    } finally {
      setBulkSaving(false);
    }
  }

  // ── Bulk role change ──────────────────────────────────────────────────────────
  async function handleBulkRoleConfirm(role: string) {
    setShowBulkRole(false);
    setBulkSaving(true);
    const ids = Array.from(selected);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          api<User>(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
          })
        )
      );
      setUsers((prev) => {
        const map = new Map(results.map((u) => [u.id, u]));
        return prev.map((u) => map.get(u.id) ?? u);
      });
      setSelected(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.tr('Toplu rol değiştirme hatası');
      alert(msg);
    } finally {
      setBulkSaving(false);
    }
  }

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'active' ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const paginated = filtered.slice(pageStart, pageEnd);

  // ── Checkbox helpers ──────────────────────────────────────────────────────────
  const pageIds = paginated.map((u) => u.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">

      {/* ── Keyframe styles (injected once) ────────────────────────────────── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="glass p-5 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-1">
          <div className="pill w-fit">{t.roles.admin}</div>
          <h1 className="text-2xl font-semibold">{t.admin.users}</h1>
          <p className="text-sm text-slate-600">
            {t.tr("Rol atama, hesap aktif/pasif işlemleri")}
          </p>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Toplam', value: users.length, color: 'text-slate-700', bg: 'glass' },
            { label: 'Admin', value: users.filter((u) => u.role === 'ADMIN').length, color: 'text-purple-700', bg: 'bg-purple-50/50 border border-purple-100' },
            { label: t.roles.instructor, value: users.filter((u) => u.role === 'INSTRUCTOR' || u.role === 'HEAD_INSTRUCTOR').length, color: 'text-blue-700', bg: 'bg-blue-50/50 border border-blue-100' },
            { label: t.roles.student, value: users.filter((u) => u.role === 'STUDENT').length, color: 'text-amber-700', bg: 'bg-amber-50/50 border border-amber-100' },
            { label: 'Aktif', value: users.filter((u) => u.isActive).length, color: 'text-teal-700', bg: 'bg-teal-50/50 border border-teal-100' },
          ].map((s, i) => (
            <div key={t.tr(s.label)} className={`rounded-xl p-3 text-center ${s.bg} animate-fade-slide-up stagger-${i + 1}`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t.tr(s.label)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + status filter + export ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input (existing) */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.tr("E-posta veya ad ile ara…")}
          className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none bg-white"
        />

        {/* Status filter dropdown (NEW) */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-amber-400 shadow-sm"
        >
          <option value="">{t.tr("Tüm durumlar")}</option>
          <option value="active">{t.tr("Aktif")}</option>
          <option value="inactive">{t.tr("Pasif")}</option>
        </select>

        {/* Export CSV (NEW) */}
        {!loading && !error && filtered.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
            title={t.tr("Filtrelenmiş listeyi CSV olarak indir")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            CSV
          </button>
        )}

        {/* Counter */}
        {!loading && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {filtered.length} / {users.length} {t.tr("kullanıcı")}
          </span>
        )}
      </div>

      {/* ── Role filter pills (existing) ────────────────────────────────────── */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '', label: 'Tümü' },
            { key: 'ADMIN', label: '👑 Admin' },
            { key: 'HEAD_INSTRUCTOR', label: '🎓 Baş Eğitmen' },
            { key: 'INSTRUCTOR', label: '🖊️ Eğitmen' },
            { key: 'STUDENT', label: '📚 Öğrenci' },
            { key: 'GUARDIAN', label: '🛡️ Veli' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                roleFilter === f.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {t.tr(f.label)}
            </button>
          ))}
        </div>
      )}

      {/* ── Bulk action bar (NEW) ───────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-amber-800">
            {selected.size} {t.tr("kullanıcı seçildi")}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              disabled={bulkSaving}
              onClick={() => setShowBulkRole(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {t.tr("Rol Değiştir")}
            </button>
            <button
              disabled={bulkSaving}
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
            >
              {bulkSaving ? t.tr('İşleniyor…') : t.tr('Seçilenleri Sil')}
            </button>
            <button
              disabled={bulkSaving}
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {t.tr("Seçimi Temizle")}
            </button>
          </div>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ── Skeleton ───────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="glass flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
              <span className="text-4xl">👥</span>
              <p className="text-sm text-slate-500">{t.tr("Sonuç bulunamadı")}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                <tr>
                  {/* Checkbox column (NEW) */}
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allPageSelected && somePageSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                      aria-label={t.tr("Sayfadakilerin tümünü seç")}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">{t.tr("Kullanıcı")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">{t.tr("Kayıt")}</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">{t.tr("Rol")}</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">{t.tr("Durum")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50 transition-colors ${selected.has(u.id) ? 'bg-amber-50/40' : ''}`}
                  >
                    {/* Checkbox (NEW) */}
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelectOne(u.id)}
                        className="w-4 h-4 accent-amber-600 cursor-pointer"
                        aria-label={`${u.name ?? u.email} seç`}
                      />
                    </td>

                    {/* User info — clicking opens detail panel (NEW) */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailUser(u)}
                        className="flex items-center gap-2.5 text-left w-full group"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:opacity-80 transition-opacity" style={{ background: "linear-gradient(135deg, #C8A96A, #0B1F3A)" }}>
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                            {u.name ?? <span className="text-slate-400 italic">{t.tr("İsimsiz")}</span>}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            {u.email}
                            {u.emailVerified ? (
                              <span className="font-medium" style={{ color: "#C8A96A" }} title={t.tr("E-posta doğrulandı")}>✓</span>
                            ) : (
                              <span className="text-amber-500" title={t.tr("E-posta doğrulanmadı")}>!</span>
                            )}
                          </div>
                        </div>
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Role select */}
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={saving[u.id]}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-50 text-slate-700 border-slate-200'} disabled:opacity-60 cursor-pointer`}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{t.tr(r.label)}</option>
                        ))}
                      </select>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={saving[u.id]}
                        onClick={() => toggleActive(u.id, u.isActive)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border transition-colors disabled:opacity-60 ${
                          u.isActive
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {u.isActive ? t.tr('Aktif') : t.tr('Pasif')}
                      </button>
                    </td>

                    {/* Feedback */}
                    <td className="px-4 py-3 text-right">
                      {saving[u.id] && (
                        <span className="text-xs text-slate-400">…</span>
                      )}
                      {!saving[u.id] && msgs[u.id] && (
                        <span className={`text-xs ${msgs[u.id].ok ? 'text-amber-600' : 'text-rose-600'}`}>
                          {msgs[u.id].text}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Pagination (NEW) ────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-xs text-slate-500">
            {pageStart + 1} – {pageEnd} / {filtered.length} {t.tr("kullanıcı")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t.tr("← Önceki")}
            </button>
            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                      safePage === p
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t.tr("Sonraki →")}
            </button>
          </div>
        </div>
      )}

      {/* ── User detail side panel (NEW) ────────────────────────────────────── */}
      {detailUser && (
        <UserDetailPanel user={detailUser} onClose={() => setDetailUser(null)} />
      )}

      {/* ── Bulk role modal (NEW) ────────────────────────────────────────────── */}
      {showBulkRole && (
        <BulkRoleModal
          count={selected.size}
          onConfirm={handleBulkRoleConfirm}
          onCancel={() => setShowBulkRole(false)}
        />
      )}
    </div>
  );
}
