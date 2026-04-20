'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ─── Types ────────────────────────────────────────────────────────────────────
type Course    = { id: string; title: string; duration?: string; level?: string };
type Assignee  = { id: string; name: string };
type Plan = {
  id: string; name: string; description?: string;
  courses: Course[]; assignees: Assignee[]; createdAt: string;
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_PLANS: Plan[] = [
  {
    id: '1', name: 'Frontend Geliştirici Yolu',
    description: 'React, TypeScript ve modern web teknolojileri',
    courses: [
      { id: 'c1', title: 'HTML & CSS Temelleri', duration: '8 saat', level: 'Başlangıç' },
      { id: 'c2', title: 'JavaScript ES6+', duration: '12 saat', level: 'Orta' },
      { id: 'c3', title: 'React Temelleri', duration: '15 saat', level: 'Orta' },
      { id: 'c4', title: 'TypeScript İleri', duration: '10 saat', level: 'İleri' },
      { id: 'c5', title: 'Next.js Masterclass', duration: '18 saat', level: 'İleri' },
    ],
    assignees: [
      { id: 'u1', name: 'Ahmet Yılmaz' },
      { id: 'u2', name: 'Zeynep Kaya' },
      { id: 'u3', name: 'Can Arslan' },
    ],
    createdAt: '2026-01-10',
  },
  {
    id: '2', name: 'Veri Bilimi Sertifika Programı',
    description: 'Python, makine öğrenmesi ve derin öğrenme müfredatı',
    courses: [
      { id: 'c6', title: 'Python Temelleri', duration: '10 saat', level: 'Başlangıç' },
      { id: 'c7', title: 'Veri Analizi (Pandas)', duration: '12 saat', level: 'Orta' },
      { id: 'c8', title: 'Makine Öğrenmesi', duration: '20 saat', level: 'İleri' },
      { id: 'c9', title: 'Derin Öğrenme', duration: '24 saat', level: 'İleri' },
    ],
    assignees: [
      { id: 'u4', name: 'Mehmet Demir' },
      { id: 'u5', name: 'Fatma Şahin' },
    ],
    createdAt: '2026-02-01',
  },
  {
    id: '3', name: 'DevOps & Cloud Mühendisliği',
    description: 'Docker, Kubernetes ve AWS ile bulut altyapısı',
    courses: [
      { id: 'ca', title: 'Linux Temelleri', duration: '8 saat', level: 'Başlangıç' },
      { id: 'cb', title: 'Docker & Konteynerler', duration: '10 saat', level: 'Orta' },
      { id: 'cc', title: 'Kubernetes İleri', duration: '16 saat', level: 'İleri' },
      { id: 'cd', title: 'AWS Cloud Practitioner', duration: '12 saat', level: 'Orta' },
    ],
    assignees: [
      { id: 'u6', name: 'Ayşe Çelik' },
      { id: 'u7', name: 'Burak Yıldız' },
      { id: 'u8', name: 'Elif Şahin' },
      { id: 'u9', name: 'Hasan Kılıç' },
    ],
    createdAt: '2026-02-15',
  },
];

const LEVEL_COLORS: Record<string, string> = {
  'Başlangıç': '#22c55e',
  'Orta': 'var(--accent)',
  'İleri': '#f59e0b',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function totalHours(courses: Course[]) {
  return courses.reduce((s, c) => {
    const h = parseInt(c.duration ?? '0');
    return s + (isNaN(h) ? 0 : h);
  }, 0);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LearningPlansPage() {
  const t = useI18n();
  const [token, setToken]   = useState('');
  const [plans, setPlans]   = useState<Plan[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [busy, setBusy]     = useState(false);

  // Builder state
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [newName, setNewName]           = useState('');
  const [newDesc, setNewDesc]           = useState('');
  const [creating, setCreating]         = useState(false);

  // Course add
  const [addTitle, setAddTitle]       = useState('');
  const [addDuration, setAddDuration] = useState('');
  const [addLevel, setAddLevel]       = useState('Orta');

  // Drag state
  const dragIdx  = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const [dragging, setDragging]   = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}) as Record<string, string>,
    [token],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('accessToken') ?? '');
  }, []);

  const loadPlans = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/learning-plans`, { headers: authHeaders });
      if (!res.ok) throw new Error();
      const data = await res.json() as Plan[];
      setIsDemo(data.length === 0);
      setPlans(data.length === 0 ? DEMO_PLANS : data);
    } catch {
      setIsDemo(true);
      setPlans(DEMO_PLANS);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { loadPlans(); }, [token]); // eslint-disable-line

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  // ── Create plan ──────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/learning-plans`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json() as Plan;
      setPlans((prev) => [{ ...created, courses: [], assignees: [] }, ...prev]);
    } catch {
      // demo: add locally
      const fake: Plan = { id: `p${Date.now()}`, name: newName.trim(), description: newDesc.trim() || undefined, courses: [], assignees: [], createdAt: new Date().toISOString() };
      setPlans((prev) => [fake, ...prev]);
    } finally {
      setNewName(''); setNewDesc(''); setShowCreate(false); setCreating(false);
    }
  }

  // ── Add course to active plan ─────────────────────────────────────────────
  function handleAddCourse() {
    if (!activePlanId || !addTitle.trim()) return;
    const newCourse: Course = { id: `c${Date.now()}`, title: addTitle.trim(), duration: addDuration || '—', level: addLevel };
    setPlans((prev) => prev.map((p) => p.id === activePlanId ? { ...p, courses: [...p.courses, newCourse] } : p));
    setAddTitle(''); setAddDuration('');
  }

  // ── Remove course ─────────────────────────────────────────────────────────
  function removeCourse(planId: string, courseId: string) {
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, courses: p.courses.filter((c) => c.id !== courseId) } : p));
  }

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  function onDragStart(idx: number) { dragIdx.current = idx; setDragging(idx); }
  function onDragEnter(idx: number) { dragOver.current = idx; setDropTarget(idx); }
  function onDragEnd() {
    if (dragIdx.current === null || dragOver.current === null || !activePlanId) { setDragging(null); setDropTarget(null); return; }
    const from = dragIdx.current, to = dragOver.current;
    if (from === to) { setDragging(null); setDropTarget(null); return; }
    setPlans((prev) => prev.map((p) => {
      if (p.id !== activePlanId) return p;
      const courses = [...p.courses];
      const [item] = courses.splice(from, 1);
      courses.splice(to, 0, item);
      return { ...p, courses };
    }));
    dragIdx.current = null; dragOver.current = null;
    setDragging(null); setDropTarget(null);
  }

  // ── Move up / down buttons ────────────────────────────────────────────────
  function moveStep(planId: string, idx: number, dir: -1 | 1) {
    setPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      const courses = [...p.courses];
      const target = idx + dir;
      if (target < 0 || target >= courses.length) return p;
      [courses[idx], courses[target]] = [courses[target], courses[idx]];
      return { ...p, courses };
    }));
  }

  const totalAssignees = plans.reduce((s, p) => s + p.assignees.length, 0);
  const avgCourses = plans.length ? (plans.reduce((s, p) => s + p.courses.length, 0) / plans.length).toFixed(1) : '0';

  return (
    <>
      <style>{`
        .lp-input {
          border-radius: var(--r-lg); border: 1.5px solid var(--line);
          background: var(--bg); padding: 9px 13px; font-size: 13px; color: var(--ink);
          outline: none; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%; box-sizing: border-box;
        }
        .lp-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .lp-input::placeholder { color: var(--muted); }

        .lp-plan-card {
          border-radius: var(--r-xl); background: var(--panel); border: 1.5px solid var(--line);
          padding: 18px 20px; cursor: pointer; transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
          box-shadow: var(--shadow-sm);
        }
        .lp-plan-card:hover { border-color: var(--accent); box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .lp-plan-card.active { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent), var(--shadow-md); }

        .lp-step {
          display: flex; align-items: flex-start; gap: 0; position: relative;
          transition: opacity 0.15s, transform 0.15s;
        }
        .lp-step.dragging-over .lp-step-body { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
        .lp-step-body {
          flex: 1; border-radius: var(--r-lg); border: 1.5px solid var(--line);
          background: var(--panel); padding: 13px 15px; transition: border-color 0.15s, box-shadow 0.15s;
          box-shadow: var(--shadow-sm);
        }
        .lp-step-body:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
        .lp-step-dragging { opacity: 0.4; }

        .lp-connector {
          width: 2px; background: linear-gradient(180deg, var(--accent), var(--accent-2));
          margin: 0 auto; opacity: 0.3; flex-shrink: 0;
        }

        .lp-drag-handle {
          cursor: grab; color: var(--muted); display: flex; align-items: center;
          padding: 0 6px; font-size: 16px; line-height: 1; user-select: none;
          opacity: 0.5; transition: opacity 0.12s;
        }
        .lp-drag-handle:hover { opacity: 1; }

        .lp-avatar {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: #fff; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--panel);
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Header ── */}
        <header style={{
          borderRadius: 'var(--r-xl)', border: '1.5px solid var(--line)',
          padding: '22px 28px', boxShadow: 'var(--shadow-sm)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 5%, var(--panel)), color-mix(in srgb, var(--accent-2) 4%, var(--panel)))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{t.admin.title}</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>📚 {t.learningPlans.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{t.learningPlans.subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => loadPlans()} disabled={busy} style={{ padding: '7px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {busy ? '…' : '↻ Yenile'}
              </button>
              <button onClick={() => setShowCreate((v) => !v)} style={{ padding: '7px 16px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--glow-blue)' }}>
                + {t.learningPlans.createPlan}
              </button>
            </div>
          </div>
        </header>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Toplam Plan', value: plans.length, icon: '📚', color: 'var(--ink)' },
            { label: 'Toplam Öğrenci', value: totalAssignees, icon: '👥', color: 'var(--accent)' },
            { label: 'Ort. Kurs / Plan', value: avgCourses, icon: '📖', color: '#22c55e' },
          ].map((s) => (
            <div key={t.tr(s.label)} style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '14px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 26 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.tr(s.label)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Demo notice ── */}
        {isDemo && (
          <div style={{ borderRadius: 'var(--r-lg)', background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.25)', padding: '10px 16px', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
            {t.tr("⚠ Demo verisi gösteriliyor. API bağlantısı kurulduğunda gerçek planlar yüklenir.")}
          </div>
        )}

        {/* ── Create plan form ── */}
        {showCreate && (
          <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid color-mix(in srgb, var(--accent) 30%, var(--line))', padding: '20px 24px', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{t.learningPlans.createPlan}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="lp-input" placeholder={t.tr("Plan adı *")} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
              <input className="lp-input" placeholder={t.tr("Açıklama (opsiyonel)")} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreate} disabled={!newName.trim() || creating} style={{ padding: '8px 20px', borderRadius: 'var(--r-lg)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed', opacity: newName.trim() ? 1 : 0.5 }}>
                  {creating ? '…' : 'Oluştur'}
                </button>
                <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }} style={{ padding: '8px 16px', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {t.tr("İptal")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MAIN: Plan list + Builder ══ */}
        <div style={{ display: 'grid', gridTemplateColumns: activePlanId ? '280px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* ── Plan list ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`lp-plan-card${activePlanId === plan.id ? ' active' : ''}`}
                onClick={() => setActivePlanId((id) => id === plan.id ? null : plan.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 3 }}>{t.tr(plan.name)}</div>
                    {plan.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{t.tr(plan.description)}</div>}
                  </div>
                  <div style={{ fontSize: 16, opacity: 0.4, flexShrink: 0 }}>{activePlanId === plan.id ? '▲' : '▼'}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {/* Course count */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))', border: '1px solid color-mix(in srgb, var(--accent) 25%, var(--line))', borderRadius: 99, padding: '2px 8px' }}>
                    {plan.courses.length} kurs
                  </span>
                  {/* Total hours */}
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                    ⏱ {totalHours(plan.courses)}sa
                  </span>
                  {/* Assignee avatars */}
                  <div style={{ display: 'flex', marginLeft: 'auto' }}>
                    {plan.assignees.slice(0, 3).map((a, i) => (
                      <div key={a.id} className="lp-avatar" style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }} title={t.tr(a.name)}>{initials(a.name)}</div>
                    ))}
                    {plan.assignees.length > 3 && (
                      <div className="lp-avatar" style={{ marginLeft: -8, background: 'var(--line)', color: 'var(--muted)' }}>+{plan.assignees.length - 3}</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>{fmtDate(plan.createdAt)}</div>
              </div>
            ))}

            {plans.length === 0 && !busy && (
              <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '2px dashed var(--line)', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t.learningPlans.noPlans}</p>
              </div>
            )}
          </div>

          {/* ── Path Builder ── */}
          {activePlan && (
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              {/* Builder header */}
              <div style={{ padding: '16px 20px', borderBottom: '1.5px solid var(--line)', background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--panel)), var(--panel))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{t.tr("Yol Haritası Düzenleyici")}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{t.tr(activePlan.name)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏱ Toplam {totalHours(activePlan.courses)} saat</span>
                    <button onClick={() => setActivePlanId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  {t.tr("🖱 Sürükle-bırak ile sırayı değiştir · Oklar ile taşı · × ile kaldır")}
                </div>
              </div>

              {/* Steps */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activePlan.courses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>➕</div>
                    {t.tr("Aşağıdan kurs ekleyerek yol haritasını oluşturun.")}
                  </div>
                ) : (
                  activePlan.courses.map((course, idx) => (
                    <div key={course.id}>
                      {/* Step row */}
                      <div
                        className={`lp-step${dragging === idx ? ' lp-step-dragging' : ''}${dropTarget === idx && dragging !== idx ? ' dragging-over' : ''}`}
                        draggable
                        onDragStart={() => onDragStart(idx)}
                        onDragEnter={() => onDragEnter(idx)}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {/* Step number + connector column */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: `linear-gradient(135deg, var(--accent), var(--accent-2))`,
                            color: '#fff', fontSize: 12, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(91,110,255,0.3)',
                          }}>
                            {idx + 1}
                          </div>
                        </div>

                        {/* Drag handle */}
                        <div className="lp-drag-handle" title={t.tr("Sürükle")}>⠿</div>

                        {/* Step body */}
                        <div className="lp-step-body">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{t.tr(course.title)}</div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                                {course.duration && course.duration !== '—' && (
                                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏱ {course.duration}</span>
                                )}
                                {course.level && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: `${LEVEL_COLORS[course.level] ?? 'var(--accent)'}18`, color: LEVEL_COLORS[course.level] ?? 'var(--accent)', border: `1px solid ${LEVEL_COLORS[course.level] ?? 'var(--accent)'}30` }}>
                                    {course.level}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Controls */}
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button onClick={() => moveStep(activePlan.id, idx, -1)} disabled={idx === 0} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--line)', background: 'var(--bg)', cursor: idx > 0 ? 'pointer' : 'not-allowed', fontSize: 12, color: idx > 0 ? 'var(--ink-2)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t.tr("Yukarı taşı")}>↑</button>
                              <button onClick={() => moveStep(activePlan.id, idx, 1)} disabled={idx === activePlan.courses.length - 1} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', border: '1.5px solid var(--line)', background: 'var(--bg)', cursor: idx < activePlan.courses.length - 1 ? 'pointer' : 'not-allowed', fontSize: 12, color: idx < activePlan.courses.length - 1 ? 'var(--ink-2)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t.tr("Aşağı taşı")}>↓</button>
                              <button onClick={() => removeCourse(activePlan.id, course.id)} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', border: '1.5px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)', cursor: 'pointer', fontSize: 13, color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t.tr("Kaldır")}>×</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Connector arrow between steps */}
                      {idx < activePlan.courses.length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '2px 0', marginLeft: 19 }}>
                          <div style={{ width: 2, height: 20, background: 'linear-gradient(180deg, var(--accent), var(--accent-2))', opacity: 0.25, borderRadius: 1 }} />
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* ── Add course form ── */}
                <div style={{ marginTop: 16, borderTop: '1.5px solid var(--line)', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{t.tr("Kurs Ekle")}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t.tr("Kurs Adı *")}</label>
                      <input className="lp-input" placeholder={t.tr("ör. React Temelleri")} value={addTitle} onChange={(e) => setAddTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t.learningPlans.duration}</label>
                      <input className="lp-input" placeholder="12 saat" value={addDuration} onChange={(e) => setAddDuration(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{t.tr("Seviye")}</label>
                      <select className="lp-input" value={addLevel} onChange={(e) => setAddLevel(e.target.value)} style={{ padding: '8px 10px' }}>
                        <option>{t.tr("Başlangıç")}</option><option>{t.tr("Orta")}</option><option>{t.tr("İleri")}</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAddCourse}
                    disabled={!addTitle.trim()}
                    style={{ marginTop: 10, padding: '9px 20px', borderRadius: 'var(--r-lg)', border: 'none', background: addTitle.trim() ? 'var(--accent)' : 'var(--line)', color: addTitle.trim() ? '#fff' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: addTitle.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', boxShadow: addTitle.trim() ? 'var(--glow-blue)' : 'none' }}
                  >
                    {t.tr("+ Adım Ekle")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
