'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN_KEY = 'accessToken';

type Instructor = {
  id: string;
  name?: string | null;
  email: string;
};

type Department = {
  id: string;
  name: string;
  tenantId: string;
  headInstructorId: string;
  HeadInstructor?: Instructor | null;
  DepartmentInstructor?: { Instructor: Instructor }[];
  createdAt: string;
};

const DEMO_DEPARTMENTS: Department[] = [
  {
    id: 'd1',
    name: 'Matematik Bölümü',
    tenantId: 't1',
    headInstructorId: 'u1',
    HeadInstructor: { id: 'u1', name: 'Prof. Ahmet Yıldız', email: 'ahmet@atlasio.io' },
    DepartmentInstructor: [
      { Instructor: { id: 'u2', name: 'Dr. Fatma Kaya', email: 'fatma@atlasio.io' } },
      { Instructor: { id: 'u3', name: 'Ali Demir', email: 'ali@atlasio.io' } },
    ],
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'd2',
    name: 'Fen Bilimleri',
    tenantId: 't1',
    headInstructorId: 'u4',
    HeadInstructor: { id: 'u4', name: 'Prof. Zeynep Arslan', email: 'zeynep@atlasio.io' },
    DepartmentInstructor: [],
    createdAt: '2026-02-05T10:00:00Z',
  },
];

const DEMO_INSTRUCTORS: Instructor[] = [
  { id: 'u1', name: 'Prof. Ahmet Yıldız', email: 'ahmet@atlasio.io' },
  { id: 'u2', name: 'Dr. Fatma Kaya', email: 'fatma@atlasio.io' },
  { id: 'u3', name: 'Ali Demir', email: 'ali@atlasio.io' },
  { id: 'u4', name: 'Prof. Zeynep Arslan', email: 'zeynep@atlasio.io' },
  { id: 'u5', name: 'Dr. Murat Şahin', email: 'murat@atlasio.io' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function displayName(instructor: Instructor) {
  return instructor.name ?? instructor.email;
}

export default function AdminDepartmentsPage() {
  const [token, setToken] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Expanded department ids
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create Department form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHeadId, setNewHeadId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Add Instructor forms keyed by department id
  const [addInstructorDeptId, setAddInstructorDeptId] = useState<string | null>(null);
  const [addInstructorId, setAddInstructorId] = useState('');
  const [addingInstructor, setAddingInstructor] = useState(false);
  const [addInstructorError, setAddInstructorError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? '');
    }
  }, []);

  const headers = useMemo<Record<string, string> | undefined>(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  const loadDepartments = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/departments/me`, {
        headers: headers ?? {},
      });
      if (!res.ok) throw new Error('Bölümler yüklenemedi');
      const data = (await res.json()) as Department[];
      if (data.length === 0) {
        setIsDemo(true);
        setDepartments(DEMO_DEPARTMENTS);
      } else {
        setIsDemo(false);
        setDepartments(data);
      }
    } catch {
      setIsDemo(true);
      setDepartments(DEMO_DEPARTMENTS);
    } finally {
      setBusy(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const res = await fetch(`${API_BASE}/users?role=INSTRUCTOR`, {
        headers: headers ?? {},
      });
      if (!res.ok) throw new Error('Eğitmenler yüklenemedi');
      const data = (await res.json()) as Instructor[];
      setInstructors(data.length > 0 ? data : DEMO_INSTRUCTORS);
    } catch {
      setInstructors(DEMO_INSTRUCTORS);
    }
  };

  useEffect(() => {
    if (token !== undefined) {
      loadDepartments();
      loadInstructors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    setCreateError(null);
    if (!newName.trim()) { setCreateError('Bölüm adı zorunludur.'); return; }
    if (!newHeadId) { setCreateError('Bölüm başkanı seçilmelidir.'); return; }

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        method: 'POST',
        headers: { ...(headers ?? {}), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), headInstructorId: newHeadId }),
      });
      if (!res.ok) throw new Error('Bölüm oluşturulamadı');
      const created = (await res.json()) as Department;
      // Enrich with head instructor from local list
      const head = instructors.find((i) => i.id === newHeadId);
      setDepartments((prev) => [
        { ...created, HeadInstructor: head ?? null, DepartmentInstructor: [] },
        ...prev,
      ]);
      setIsDemo(false);
      setShowCreateForm(false);
      setNewName('');
      setNewHeadId('');
      setSuccessMsg('Yeni bölüm başarıyla oluşturuldu.');
    } catch (err: unknown) {
      setCreateError((err as Error)?.message ?? 'Oluşturma başarısız');
    } finally {
      setCreating(false);
    }
  };

  const handleAddInstructor = async (deptId: string) => {
    setAddInstructorError(null);
    if (!addInstructorId) { setAddInstructorError('Eğitmen seçilmelidir.'); return; }

    setAddingInstructor(true);
    try {
      const res = await fetch(`${API_BASE}/departments/${deptId}/instructors`, {
        method: 'POST',
        headers: { ...(headers ?? {}), 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId: addInstructorId }),
      });
      if (!res.ok) throw new Error('Eğitmen eklenemedi');
      const instructor = instructors.find((i) => i.id === addInstructorId);
      if (instructor) {
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === deptId
              ? {
                  ...d,
                  DepartmentInstructor: [
                    ...(d.DepartmentInstructor ?? []),
                    { Instructor: instructor },
                  ],
                }
              : d
          )
        );
      }
      setAddInstructorDeptId(null);
      setAddInstructorId('');
      setSuccessMsg('Eğitmen bölüme başarıyla eklendi.');
    } catch (err: unknown) {
      setAddInstructorError((err as Error)?.message ?? 'Ekleme başarısız');
    } finally {
      setAddingInstructor(false);
    }
  };

  const totalInstructors = departments.reduce(
    (acc, d) => acc + (d.DepartmentInstructor?.length ?? 0),
    0
  );

  const STATS = [
    {
      label: 'Toplam Bölüm',
      value: departments.length,
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200',
      val: 'text-slate-700',
      icon: '🏫',
    },
    {
      label: 'Bölüm Başkanı',
      value: departments.filter((d) => d.headInstructorId).length,
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200',
      val: 'text-violet-700',
      icon: '👩‍🏫',
    },
    {
      label: 'Toplam Eğitmen',
      value: totalInstructors,
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',
      val: 'text-blue-700',
      icon: '👥',
    },
  ];

  return (
    <main className="space-y-6">
      {/* Hero */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Organizasyon</div>
          <h1 className="text-3xl font-semibold">Bölüm Yönetimi</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Eğitim birimleri ve kadro yapısı — bölümleri oluşturun, başkanları atayın ve eğitmenleri yönetin.
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        {STATS.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${i + 1} ${s.bg}`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between gap-4">
          <span>✓ {successMsg}</span>
          <button className="btn-link text-xs" onClick={() => setSuccessMsg(null)}>Kapat</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-4">
          <span>✗ {error}</span>
          <button className="btn-link text-xs" onClick={() => setError(null)}>Kapat</button>
        </div>
      )}

      {/* Department List */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-500 inline-block" />
            Bölümler
            <span className="pill pill-sm">{departments.length}</span>
          </h2>
          <div className="flex gap-2">
            <button className="btn-link text-sm" onClick={loadDepartments} disabled={busy}>
              {busy ? 'Yükleniyor…' : 'Yenile'}
            </button>
            <button
              onClick={() => { setShowCreateForm((v) => !v); setCreateError(null); }}
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition"
            >
              {showCreateForm ? 'Formu Kapat' : '+ Yeni Bölüm Oluştur'}
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            ⚠ Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.
          </div>
        )}

        {/* Create Department Form */}
        {showCreateForm && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 space-y-4">
            <h3 className="text-sm font-bold text-violet-800">Yeni Bölüm Oluştur</h3>

            {createError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {createError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Bölüm Adı *</label>
                <input
                  type="text"
                  placeholder="ör. Bilgisayar Bilimleri"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Bölüm Başkanı *</label>
                <select
                  value={newHeadId}
                  onChange={(e) => setNewHeadId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="">— Eğitmen seçin —</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {displayName(inst)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
              >
                {creating ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewName(''); setNewHeadId(''); setCreateError(null); }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Department Cards */}
        {busy && departments.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-100 p-4 space-y-2"
              >
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <div className="text-4xl mb-3">🏫</div>
            <p className="font-semibold text-slate-700">Henüz bölüm yok</p>
            <p className="text-sm text-slate-400 mt-1">Yukarıdaki butonu kullanarak ilk bölümü oluşturun.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => {
              const instrCount = dept.DepartmentInstructor?.length ?? 0;
              const isExpanded = expanded.has(dept.id);
              const isAddingHere = addInstructorDeptId === dept.id;

              return (
                <div
                  key={dept.id}
                  className="rounded-2xl border border-slate-100 overflow-hidden hover:border-violet-200 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-base leading-snug">{dept.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {dept.HeadInstructor && (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                            Başkan: {displayName(dept.HeadInstructor)}
                          </span>
                        )}
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {instrCount} Eğitmen
                        </span>
                        <span className="text-xs text-slate-400">{fmtDate(dept.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {instrCount > 0 && (
                        <button
                          onClick={() => toggleExpand(dept.id)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                          {isExpanded ? 'Gizle' : 'Eğitmenler'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (isAddingHere) {
                            setAddInstructorDeptId(null);
                            setAddInstructorId('');
                            setAddInstructorError(null);
                          } else {
                            setAddInstructorDeptId(dept.id);
                            setAddInstructorId('');
                            setAddInstructorError(null);
                          }
                        }}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        {isAddingHere ? 'İptal' : '+ Eğitmen Ekle'}
                      </button>
                    </div>
                  </div>

                  {/* Add Instructor inline form */}
                  {isAddingHere && (
                    <div className="border-t border-slate-100 bg-emerald-50/40 px-4 py-3 space-y-2">
                      {addInstructorError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                          {addInstructorError}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={addInstructorId}
                          onChange={(e) => setAddInstructorId(e.target.value)}
                          className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          <option value="">— Eğitmen seçin —</option>
                          {instructors
                            .filter(
                              (inst) =>
                                !dept.DepartmentInstructor?.some(
                                  (di) => di.Instructor.id === inst.id
                                ) && inst.id !== dept.headInstructorId
                            )
                            .map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {displayName(inst)}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAddInstructor(dept.id)}
                          disabled={addingInstructor}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                        >
                          {addingInstructor ? 'Ekleniyor…' : 'Ekle'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Instructor List */}
                  {isExpanded && instrCount > 0 && (
                    <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        Eğitmenler
                      </p>
                      <div className="space-y-1.5">
                        {dept.DepartmentInstructor?.map(({ Instructor: inst }) => (
                          <div
                            key={inst.id}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(inst.name ?? inst.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-700 leading-tight truncate">
                                {displayName(inst)}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{inst.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
