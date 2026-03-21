'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../api/client';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
};

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
  STUDENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  GUARDIAN: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msgs, setMsgs] = useState<Record<string, { ok: boolean; text: string }>>({});

  useEffect(() => {
    api<User[]>('/users')
      .then(setUsers)
      .catch((e) => {
        if (e?.message?.includes('401') || e?.message?.includes('403')) {
          router.push('/login');
        } else {
          setError(e?.message ?? 'Kullanıcılar yüklenemedi');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleRoleChange(userId: string, role: string) {
    setSaving((s) => ({ ...s, [userId]: true }));
    setMsgs((m) => ({ ...m, [userId]: { ok: true, text: '' } }));
    try {
      const updated = await api<User>(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setMsgs((m) => ({ ...m, [userId]: { ok: true, text: '✓ Rol güncellendi' } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Hata';
      setMsgs((m) => ({ ...m, [userId]: { ok: false, text: msg } }));
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
      setTimeout(() => setMsgs((m) => { const n = { ...m }; delete n[userId]; return n; }), 2500);
    }
  }

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
        [userId]: { ok: true, text: `✓ Hesap ${!current ? 'aktif' : 'devre dışı'}` },
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Hata';
      setMsgs((m) => ({ ...m, [userId]: { ok: false, text: msg } }));
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
      setTimeout(() => setMsgs((m) => { const n = { ...m }; delete n[userId]; return n; }), 2500);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass p-5 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-1">
          <div className="pill w-fit">Yönetici Paneli</div>
          <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-slate-600">
            Rol atama, hesap aktif/pasif işlemleri
          </p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && !error && users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Toplam', value: users.length, color: 'text-slate-700', bg: 'glass' },
            { label: 'Admin', value: users.filter(u => u.role === 'ADMIN').length, color: 'text-purple-700', bg: 'bg-purple-50/50 border border-purple-100' },
            { label: 'Eğitmen', value: users.filter(u => u.role === 'INSTRUCTOR' || u.role === 'HEAD_INSTRUCTOR').length, color: 'text-blue-700', bg: 'bg-blue-50/50 border border-blue-100' },
            { label: 'Öğrenci', value: users.filter(u => u.role === 'STUDENT').length, color: 'text-emerald-700', bg: 'bg-emerald-50/50 border border-emerald-100' },
            { label: 'Aktif', value: users.filter(u => u.isActive).length, color: 'text-teal-700', bg: 'bg-teal-50/50 border border-teal-100' },
          ].map((s, i) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg} animate-fade-slide-up stagger-${i + 1}`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + count */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="E-posta veya ad ile ara…"
          className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
        />
        {!loading && (
          <span className="text-xs text-slate-500">
            {filtered.length} / {users.length} kullanıcı
          </span>
        )}
      </div>

      {/* Role filter buttons */}
      {!loading && !error && (
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '', label: 'Tümü' },
            { key: 'ADMIN', label: '👑 Admin' },
            { key: 'HEAD_INSTRUCTOR', label: '🎓 Baş Eğitmen' },
            { key: 'INSTRUCTOR', label: '🖊️ Eğitmen' },
            { key: 'STUDENT', label: '📚 Öğrenci' },
            { key: 'GUARDIAN', label: '🛡️ Veli' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                roleFilter === f.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="glass flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
              <span className="text-4xl">👥</span>
              <p className="text-sm text-slate-500">Sonuç bulunamadı</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kullanıcı</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">Kayıt</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Rol</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    {/* User info with avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(u.name ?? u.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 line-clamp-1">
                            {u.name ?? <span className="text-slate-400 italic">İsimsiz</span>}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            {u.email}
                            {u.emailVerified ? (
                              <span className="text-emerald-600" title="E-posta doğrulandı">✓</span>
                            ) : (
                              <span className="text-amber-500" title="E-posta doğrulanmadı">!</span>
                            )}
                          </div>
                        </div>
                      </div>
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
                          <option key={r.value} value={r.value}>{r.label}</option>
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
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>

                    {/* Feedback */}
                    <td className="px-4 py-3 text-right">
                      {saving[u.id] && (
                        <span className="text-xs text-slate-400">…</span>
                      )}
                      {!saving[u.id] && msgs[u.id] && (
                        <span className={`text-xs ${msgs[u.id].ok ? 'text-emerald-600' : 'text-rose-600'}`}>
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
    </div>
  );
}
