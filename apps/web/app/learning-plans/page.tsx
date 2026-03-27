'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

/* ─── Types ─── */

type Course = { id: string; title: string };
type Assignee = { id: string; name: string };

type LearningPlan = {
  id: string;
  name: string;
  description?: string;
  courses: Course[];
  assignees: Assignee[];
  createdAt: string;
};

/* ─── Demo fallback ─── */

const DEMO_PLANS: LearningPlan[] = [
  {
    id: '1',
    name: 'Frontend Geliştirici Yolu',
    description: 'React, TypeScript ve modern web teknolojileri',
    courses: [
      { id: 'c1', title: 'React Temelleri' },
      { id: 'c2', title: 'TypeScript İleri' },
      { id: 'c3', title: 'Next.js Masterclass' },
    ],
    assignees: [
      { id: 'u1', name: 'Ahmet Yılmaz' },
      { id: 'u2', name: 'Zeynep Kaya' },
    ],
    createdAt: '2026-01-10',
  },
  {
    id: '2',
    name: 'Veri Bilimi Sertifika Programı',
    description: 'Python, ML ve derin öğrenme müfredatı',
    courses: [
      { id: 'c4', title: 'Python Temelleri' },
      { id: 'c5', title: 'Makine Öğrenmesi' },
    ],
    assignees: [{ id: 'u3', name: 'Mehmet Demir' }],
    createdAt: '2026-02-01',
  },
  {
    id: '3',
    name: 'DevOps & Cloud Yolu',
    description: 'Docker, Kubernetes ve AWS ile bulut mühendisliği',
    courses: [
      { id: 'c6', title: 'Docker Temelleri' },
      { id: 'c7', title: 'AWS Cloud Practitioner' },
      { id: 'c8', title: 'Kubernetes İleri' },
    ],
    assignees: [
      { id: 'u4', name: 'Ayşe Çelik' },
      { id: 'u5', name: 'Can Arslan' },
      { id: 'u6', name: 'Elif Şahin' },
      { id: 'u7', name: 'Burak Yıldız' },
    ],
    createdAt: '2026-02-15',
  },
];

/* ─── Helpers ─── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Page ─── */

export default function LearningPlansPage() {
  const [token, setToken] = useState('');
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* Create plan form */
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /* Per-card "add course" state keyed by plan id */
  const [courseInputs, setCourseInputs] = useState<Record<string, string>>({});
  const [addingCourse, setAddingCourse] = useState<string | null>(null);

  /* Per-card "assign user" state keyed by plan id */
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [assigningUser, setAssigningUser] = useState<string | null>(null);

  /* Removed course ids (visual only) keyed by plan id */
  const [removedCourses, setRemovedCourses] = useState<Record<string, Set<string>>>({});

  /* Read token once */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('accessToken') ?? '');
    }
  }, []);

  const authHeaders = useMemo<Record<string, string>>(
    () => (token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>)),
    [token]
  );

  /* ── Load plans ── */
  const loadPlans = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/learning-plans`, { headers: authHeaders });
      if (!res.ok) throw new Error('Planlar yüklenemedi.');
      const data = (await res.json()) as LearningPlan[];
      if (data.length === 0) {
        setIsDemo(true);
        setPlans(DEMO_PLANS);
      } else {
        setIsDemo(false);
        setPlans(data);
      }
    } catch {
      setIsDemo(true);
      setPlans(DEMO_PLANS);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Create plan ── */
  const handleCreate = async () => {
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError('Plan adı zorunludur.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/learning-plans`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Plan oluşturulamadı.');
      const created = (await res.json()) as LearningPlan;
      setPlans((prev) => [{ ...created, courses: [], assignees: [] }, ...prev]);
      setIsDemo(false);
      setShowCreateForm(false);
      setNewName('');
      setNewDesc('');
      setSuccessMsg('Yeni öğrenme planı başarıyla oluşturuldu.');
    } catch (err: unknown) {
      setCreateError((err as Error)?.message ?? 'Oluşturma başarısız.');
    } finally {
      setCreating(false);
    }
  };

  /* ── Add course ── */
  const handleAddCourse = async (planId: string) => {
    const courseId = (courseInputs[planId] ?? '').trim();
    if (!courseId) return;
    setAddingCourse(planId);
    try {
      const res = await fetch(`${API_BASE}/learning-plans/${planId}/courses`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error('Kurs eklenemedi.');
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, courses: [...p.courses, { id: courseId, title: courseId }] }
            : p
        )
      );
      setCourseInputs((prev) => ({ ...prev, [planId]: '' }));
      setSuccessMsg('Kurs plana eklendi.');
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message ?? 'Kurs ekleme başarısız.');
    } finally {
      setAddingCourse(null);
    }
  };

  /* ── Assign user ── */
  const handleAssignUser = async (planId: string) => {
    const userId = (userInputs[planId] ?? '').trim();
    if (!userId) return;
    setAssigningUser(planId);
    try {
      const res = await fetch(`${API_BASE}/learning-plans/${planId}/assign`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Öğrenci atanamadı.');
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, assignees: [...p.assignees, { id: userId, name: userId }] }
            : p
        )
      );
      setUserInputs((prev) => ({ ...prev, [planId]: '' }));
      setSuccessMsg('Öğrenci plana atandı.');
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message ?? 'Atama başarısız.');
    } finally {
      setAssigningUser(null);
    }
  };

  /* ── Remove course (visual only) ── */
  const removeCourse = (planId: string, courseId: string) => {
    setRemovedCourses((prev) => {
      const set = new Set(prev[planId] ?? []);
      set.add(courseId);
      return { ...prev, [planId]: set };
    });
  };

  /* ── Stats ── */
  const totalAssignees = plans.reduce((acc, p) => acc + p.assignees.length, 0);
  const avgCourses =
    plans.length > 0
      ? (plans.reduce((acc, p) => acc + p.courses.length, 0) / plans.length).toFixed(1)
      : '0';

  const STATS = [
    {
      label: 'Toplam Plan',
      value: plans.length,
      icon: '📚',
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200',
      val: 'text-slate-700',
    },
    {
      label: 'Toplam Atanan Öğrenci',
      value: totalAssignees,
      icon: '👥',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',
      val: 'text-blue-700',
    },
    {
      label: 'Ortalama Kurs / Plan',
      value: avgCourses,
      icon: '📖',
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200',
      val: 'text-emerald-700',
    },
  ];

  return (
    <main className="space-y-6">
      {/* ── Hero ── */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Yönetim</div>
          <h1 className="text-3xl font-semibold">📚 Öğrenme Planları</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Öğrencilere kişiselleştirilmiş öğrenme yolları oluşturun.
          </p>
        </div>
      </header>

      {/* ── Stats strip ── */}
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
            <p className={`metric text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between gap-4">
          <span>✓ {successMsg}</span>
          <button className="text-xs underline" onClick={() => setSuccessMsg(null)}>
            Kapat
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-4">
          <span>✗ {errorMsg}</span>
          <button className="text-xs underline" onClick={() => setErrorMsg(null)}>
            Kapat
          </button>
        </div>
      )}

      {/* ── Create form toggle ── */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-blue-500 inline-block" />
            Planlar
            <span className="pill pill-sm">{plans.length}</span>
          </h2>
          <div className="flex gap-2">
            <button
              className="text-sm text-slate-500 underline"
              onClick={loadPlans}
              disabled={busy}
            >
              {busy ? 'Yükleniyor…' : 'Yenile'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm((v) => !v);
                setCreateError(null);
              }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            >
              {showCreateForm ? 'Formu Kapat' : '+ Yeni Plan Oluştur'}
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            ⚠ Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.
          </div>
        )}

        {/* ── Inline create form ── */}
        {showCreateForm && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4 animate-fade-slide-up">
            <h3 className="text-sm font-bold text-emerald-800">Yeni Plan Oluştur</h3>

            {createError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {createError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Plan Adı *</label>
              <input
                type="text"
                placeholder="ör. Frontend Geliştirici Yolu"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Açıklama</label>
              <textarea
                rows={2}
                placeholder="Plan hakkında kısa bir açıklama…"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {creating ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName('');
                  setNewDesc('');
                  setCreateError(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Plan cards grid ── */}
      {busy && plans.length === 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="skeleton rounded-2xl border border-slate-100 p-5 space-y-3">
              <div className="animate-pulse h-5 w-48 bg-slate-200 rounded" />
              <div className="animate-pulse h-3 w-64 bg-slate-100 rounded" />
              <div className="animate-pulse h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="font-semibold text-slate-700 text-lg">Henüz öğrenme planı yok</p>
          <p className="text-sm text-slate-400 mt-1">
            "Yeni Plan Oluştur" butonunu kullanarak ilk planı oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => {
            const visibleCourses = plan.courses.filter(
              (c) => !removedCourses[plan.id]?.has(c.id)
            );
            const MAX_ASSIGNEES = 3;
            const visibleAssignees = plan.assignees.slice(0, MAX_ASSIGNEES);
            const extraAssignees = plan.assignees.length - MAX_ASSIGNEES;

            return (
              <div
                key={plan.id}
                className="glass rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-emerald-300 transition-all animate-fade-slide-up"
              >
                {/* Plan header */}
                <div className="space-y-1">
                  <p className="text-lg font-bold text-slate-800 leading-snug">{plan.name}</p>
                  {plan.description && (
                    <p className="text-sm text-slate-400">{plan.description}</p>
                  )}
                </div>

                {/* Kurslar */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Kurslar
                  </p>
                  {visibleCourses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleCourses.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
                        >
                          {c.title}
                          <button
                            onClick={() => removeCourse(plan.id, c.id)}
                            aria-label={`${c.title} kursunu kaldır`}
                            className="ml-0.5 text-blue-400 hover:text-blue-700 transition leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Henüz kurs eklenmemiş.</p>
                  )}

                  {/* Kurs Ekle mini-form */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Kurs ID girin…"
                      value={courseInputs[plan.id] ?? ''}
                      onChange={(e) =>
                        setCourseInputs((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCourse(plan.id);
                      }}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button
                      onClick={() => handleAddCourse(plan.id)}
                      disabled={addingCourse === plan.id}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition disabled:opacity-60 shrink-0"
                    >
                      {addingCourse === plan.id ? '…' : 'Kurs Ekle'}
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Atananlar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Atananlar
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {plan.assignees.length}
                    </span>
                  </div>

                  {plan.assignees.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visibleAssignees.map((a) => (
                        <span
                          key={a.id}
                          className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                        >
                          {a.name}
                        </span>
                      ))}
                      {extraAssignees > 0 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          +{extraAssignees} daha
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Henüz öğrenci atanmamış.</p>
                  )}

                  {/* Ogrenci Ata mini-form */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Kullanıcı ID girin…"
                      value={userInputs[plan.id] ?? ''}
                      onChange={(e) =>
                        setUserInputs((prev) => ({ ...prev, [plan.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAssignUser(plan.id);
                      }}
                      className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                    <button
                      onClick={() => handleAssignUser(plan.id)}
                      disabled={assigningUser === plan.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-60 shrink-0"
                    >
                      {assigningUser === plan.id ? '…' : 'Öğrenci Ata'}
                    </button>
                  </div>
                </div>

                {/* Created date */}
                <p className="text-right text-xs text-slate-400">{fmtDate(plan.createdAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
