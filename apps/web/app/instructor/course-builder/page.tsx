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
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type LessonType = 'VIDEO' | 'QUIZ' | 'READING' | 'LIVE';

interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration: number;
  order: number;
  description?: string;
  videoUrl?: string;
  questionCount?: number;
  scheduledAt?: string;
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  thumbnail?: string;
  description?: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_COURSES: Course[] = [
  { id: 'demo-c1', title: 'Temel Matematik', status: 'PUBLISHED', thumbnail: '', description: 'Temel matematik kavramları ve problem çözme teknikleri.' },
  { id: 'demo-c2', title: 'İngilizce B2 Hazırlık', status: 'DRAFT', thumbnail: '', description: 'B2 seviyesi İngilizce hazırlık ve pratik konuşma.' },
];

const DEMO_STRUCTURE: Record<string, { modules: Module[] }> = {
  'demo-c1': {
    modules: [
      {
        id: 'dm1', title: 'Sayılar ve İşlemler', order: 1,
        lessons: [
          { id: 'dl1', title: 'Doğal Sayılar', type: 'VIDEO', duration: 18, order: 1, videoUrl: 'https://example.com/v1' },
          { id: 'dl2', title: 'Tam Sayı Quiz', type: 'QUIZ', duration: 10, order: 2, questionCount: 15 },
          { id: 'dl3', title: 'Kesirler ve Ondalıklar', type: 'READING', duration: 12, order: 3 },
        ],
      },
      {
        id: 'dm2', title: 'Cebir Temelleri', order: 2,
        lessons: [
          { id: 'dl4', title: 'Denklemler', type: 'VIDEO', duration: 25, order: 1, videoUrl: 'https://example.com/v2' },
          { id: 'dl5', title: 'Canlı Ders: Soru-Cevap', type: 'LIVE', duration: 60, order: 2, scheduledAt: '2026-04-10T15:00' },
          { id: 'dl6', title: 'Fonksiyonlar', type: 'VIDEO', duration: 22, order: 3 },
          { id: 'dl7', title: 'Cebir Quiz', type: 'QUIZ', duration: 15, order: 4, questionCount: 20 },
        ],
      },
      {
        id: 'dm3', title: 'Geometri', order: 3,
        lessons: [
          { id: 'dl8', title: 'Açılar ve Üçgenler', type: 'READING', duration: 14, order: 1 },
          { id: 'dl9', title: 'Alan Hesabı', type: 'VIDEO', duration: 20, order: 2, videoUrl: 'https://example.com/v3' },
        ],
      },
    ],
  },
  'demo-c2': {
    modules: [
      {
        id: 'dm4', title: 'Grammar: Advanced Tenses', order: 1,
        lessons: [
          { id: 'dl10', title: 'Past Perfect', type: 'VIDEO', duration: 16, order: 1, videoUrl: 'https://example.com/v4' },
          { id: 'dl11', title: 'Conditionals Quiz', type: 'QUIZ', duration: 12, order: 2, questionCount: 10 },
        ],
      },
      {
        id: 'dm5', title: 'Reading & Vocabulary', order: 2,
        lessons: [
          { id: 'dl12', title: 'Academic Vocabulary', type: 'READING', duration: 20, order: 1 },
          { id: 'dl13', title: 'Reading Strategies', type: 'VIDEO', duration: 18, order: 2 },
          { id: 'dl14', title: 'Kelime Quiz', type: 'QUIZ', duration: 10, order: 3, questionCount: 25 },
        ],
      },
      {
        id: 'dm6', title: 'Speaking Practice', order: 3,
        lessons: [
          { id: 'dl15', title: 'Canlı Konuşma Pratiği', type: 'LIVE', duration: 90, order: 1, scheduledAt: '2026-04-15T18:00' },
          { id: 'dl16', title: 'Pronunciation Guide', type: 'READING', duration: 8, order: 2 },
        ],
      },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LESSON_ICONS: Record<LessonType, string> = {
  VIDEO: '🎬',
  QUIZ: '❓',
  READING: '📖',
  LIVE: '🔴',
};

const LESSON_LABELS: Record<LessonType, string> = {
  VIDEO: 'Video',
  QUIZ: 'Quiz',
  READING: 'Okuma',
  LIVE: 'Canlı',
};

const LESSON_TYPES: LessonType[] = ['VIDEO', 'QUIZ', 'READING', 'LIVE'];

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: 'Yayında', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  DRAFT: { label: 'Taslak', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  ARCHIVED: { label: 'Arşiv', cls: 'bg-slate-50 border-slate-200 text-slate-600' },
};

function uid() {
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

function totalDuration(modules: Module[]): number {
  return modules.reduce((acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0), 0);
}

function totalLessons(modules: Module[]): number {
  return modules.reduce((acc, m) => acc + m.lessons.length, 0);
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LessonTypeButton({
  type,
  selected,
  onClick,
}: {
  type: LessonType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        selected
          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
      }`}
    >
      <span>{LESSON_ICONS[type]}</span>
      <span>{LESSON_LABELS[type]}</span>
    </button>
  );
}

function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="border border-slate-300 rounded-lg px-2 py-0.5 text-sm font-semibold text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white w-full max-w-xs"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      className={`cursor-text hover:bg-slate-100 rounded px-1 py-0.5 transition-colors ${className ?? ''}`}
      title="Düzenlemek için tıkla"
      onClick={() => { setDraft(value); setEditing(true); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { setDraft(value); setEditing(true); } }}
    >
      {value}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourseBuilderPage() {
  const t = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [selectedLesson, setSelectedLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);

  // Add module state
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [savingModule, setSavingModule] = useState(false);

  // Add lesson state: key = moduleId
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState<LessonType>('VIDEO');
  const [newLessonDuration, setNewLessonDuration] = useState(15);
  const [savingLesson, setSavingLesson] = useState(false);

  // Lesson detail panel state
  const [detailTitle, setDetailTitle] = useState('');
  const [detailType, setDetailType] = useState<LessonType>('VIDEO');
  const [detailDuration, setDetailDuration] = useState(15);
  const [detailDescription, setDetailDescription] = useState('');
  const [detailVideoUrl, setDetailVideoUrl] = useState('');
  const [detailQuestionCount, setDetailQuestionCount] = useState(10);
  const [detailScheduledAt, setDetailScheduledAt] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailSaved, setDetailSaved] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  // ── Load courses ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingCourses(true);
    fetch(`${API}/courses/my`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Course[]) => {
        let list: Course[];
        if (Array.isArray(data) && data.length > 0) {
          list = data;
        } else {
          setDemoMode(true);
          list = DEMO_COURSES;
        }
        setCourses(list);
        // Auto-select the first course so panels render immediately
        if (list.length > 0) {
          setSelectedCourseId(list[0].id);
          loadStructure(list[0].id);
        }
      })
      .catch(() => {
        setDemoMode(true);
        setCourses(DEMO_COURSES);
        setSelectedCourseId(DEMO_COURSES[0].id);
        loadStructure(DEMO_COURSES[0].id);
      })
      .finally(() => setLoadingCourses(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load structure on course select ────────────────────────────────────────
  const loadStructure = useCallback((courseId: string) => {
    setLoadingStructure(true);
    setModules([]);
    setSelectedLesson(null);

    if (demoMode || courseId.startsWith('demo-')) {
      setTimeout(() => {
        setModules(DEMO_STRUCTURE[courseId]?.modules ?? []);
        setLoadingStructure(false);
      }, 350);
      return;
    }

    fetch(`${API}/courses/${courseId}/structure`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { modules: Module[] }) => {
        setModules(data.modules ?? []);
      })
      .catch(() => {
        setModules(DEMO_STRUCTURE[courseId]?.modules ?? []);
      })
      .finally(() => setLoadingStructure(false));
  }, [demoMode]);

  function selectCourse(id: string) {
    setSelectedCourseId(id);
    setAddingModule(false);
    setAddingLessonFor(null);
    setSelectedLesson(null);
    loadStructure(id);
  }

  // ── Toggle module collapse ──────────────────────────────────────────────────
  function toggleCollapse(id: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Inline module title save ────────────────────────────────────────────────
  function saveModuleTitle(moduleId: string, title: string) {
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, title } : m));
    if (!selectedCourseId || demoMode || selectedCourseId.startsWith('demo-')) return;
    fetch(`${API}/courses/${selectedCourseId}/modules/${moduleId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    }).catch(() => {/* silent on demo */});
  }

  // ── Inline lesson title save ────────────────────────────────────────────────
  function saveLessonTitle(moduleId: string, lessonId: string, title: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l) => l.id === lessonId ? { ...l, title } : l) }
          : m
      )
    );
    // Update selected lesson if active
    if (selectedLesson?.lesson.id === lessonId) {
      setSelectedLesson((prev) => prev ? { ...prev, lesson: { ...prev.lesson, title } } : null);
      setDetailTitle(title);
    }
  }

  // ── Add module ──────────────────────────────────────────────────────────────
  async function handleAddModule() {
    if (!newModuleTitle.trim() || !selectedCourseId) return;
    setSavingModule(true);
    const title = newModuleTitle.trim();

    if (demoMode || selectedCourseId.startsWith('demo-')) {
      const newMod: Module = { id: uid(), title, order: modules.length + 1, lessons: [] };
      setModules((prev) => [...prev, newMod]);
      setNewModuleTitle('');
      setAddingModule(false);
      setSavingModule(false);
      return;
    }

    try {
      const r = await fetch(`${API}/courses/${selectedCourseId}/modules`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title }),
      });
      if (r.ok) {
        const created: Module = await r.json();
        setModules((prev) => [...prev, { ...created, lessons: created.lessons ?? [] }]);
      } else {
        const newMod: Module = { id: uid(), title, order: modules.length + 1, lessons: [] };
        setModules((prev) => [...prev, newMod]);
      }
    } catch {
      const newMod: Module = { id: uid(), title, order: modules.length + 1, lessons: [] };
      setModules((prev) => [...prev, newMod]);
    } finally {
      setNewModuleTitle('');
      setAddingModule(false);
      setSavingModule(false);
    }
  }

  // ── Delete module ───────────────────────────────────────────────────────────
  async function handleDeleteModule(moduleId: string, moduleTitle: string) {
    if (!window.confirm(`"${moduleTitle}" modülünü silmek istediğinizden emin misiniz? İçindeki tüm dersler de silinecektir.`)) return;
    if (selectedLesson?.moduleId === moduleId) setSelectedLesson(null);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    if (!selectedCourseId || demoMode || selectedCourseId.startsWith('demo-')) return;
    fetch(`${API}/courses/${selectedCourseId}/modules/${moduleId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).catch(() => {/* silent */});
  }

  // ── Add lesson ──────────────────────────────────────────────────────────────
  async function handleAddLesson(moduleId: string) {
    if (!newLessonTitle.trim() || !selectedCourseId) return;
    setSavingLesson(true);
    const title = newLessonTitle.trim();
    const type = newLessonType;
    const duration = newLessonDuration;

    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) { setSavingLesson(false); return; }

    if (demoMode || selectedCourseId.startsWith('demo-')) {
      const newLesson: Lesson = { id: uid(), title, type, duration, order: mod.lessons.length + 1 };
      setModules((prev) =>
        prev.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m)
      );
      setNewLessonTitle('');
      setNewLessonType('VIDEO');
      setNewLessonDuration(15);
      setAddingLessonFor(null);
      setSavingLesson(false);
      return;
    }

    try {
      const r = await fetch(`${API}/courses/${selectedCourseId}/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, type, duration }),
      });
      let newLesson: Lesson;
      if (r.ok) {
        newLesson = await r.json();
      } else {
        newLesson = { id: uid(), title, type, duration, order: mod.lessons.length + 1 };
      }
      setModules((prev) =>
        prev.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, { ...newLesson, order: m.lessons.length + 1 }] } : m)
      );
    } catch {
      const newLesson: Lesson = { id: uid(), title, type, duration, order: mod.lessons.length + 1 };
      setModules((prev) =>
        prev.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m)
      );
    } finally {
      setNewLessonTitle('');
      setNewLessonType('VIDEO');
      setNewLessonDuration(15);
      setAddingLessonFor(null);
      setSavingLesson(false);
    }
  }

  // ── Reorder lesson (↑↓) ─────────────────────────────────────────────────────
  function moveLesson(moduleId: string, lessonId: string, dir: 'up' | 'down') {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const idx = m.lessons.findIndex((l) => l.id === lessonId);
        if (idx < 0) return m;
        const next = [...m.lessons];
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= next.length) return m;
        [next[idx], next[target]] = [next[target], next[idx]];
        return { ...m, lessons: next.map((l, i) => ({ ...l, order: i + 1 })) };
      })
    );
  }

  // ── Open lesson detail panel ────────────────────────────────────────────────
  function openLesson(moduleId: string, lesson: Lesson) {
    setSelectedLesson({ moduleId, lesson });
    setDetailTitle(lesson.title);
    setDetailType(lesson.type);
    setDetailDuration(lesson.duration);
    setDetailDescription(lesson.description ?? '');
    setDetailVideoUrl(lesson.videoUrl ?? '');
    setDetailQuestionCount(lesson.questionCount ?? 10);
    setDetailScheduledAt(lesson.scheduledAt ?? '');
    setDetailSaved(false);
  }

  // ── Save lesson detail ──────────────────────────────────────────────────────
  async function handleSaveDetail() {
    if (!selectedLesson) return;
    setSavingDetail(true);
    const updated: Lesson = {
      ...selectedLesson.lesson,
      title: detailTitle,
      type: detailType,
      duration: detailDuration,
      description: detailDescription,
      videoUrl: detailVideoUrl,
      questionCount: detailQuestionCount,
      scheduledAt: detailScheduledAt,
    };
    setModules((prev) =>
      prev.map((m) =>
        m.id === selectedLesson.moduleId
          ? { ...m, lessons: m.lessons.map((l) => l.id === updated.id ? updated : l) }
          : m
      )
    );
    setSelectedLesson({ ...selectedLesson, lesson: updated });
    setSavingDetail(false);
    setDetailSaved(true);
    setTimeout(() => setDetailSaved(false), 2000);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="glass p-6 rounded-2xl hero animate-fade-slide-up">
        <div className="hero-content space-y-1">
          <div className="pill w-fit">{t.roles.instructor}</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">🏗️ {t.instructor.courseBuilder}</h1>
          <p className="text-sm text-slate-500">{t.tr("İçeriklerini yapılandır, sürükle-bırak ile düzenle")}</p>
        </div>
      </div>

      {demoMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {t.tr("Demo modu — API bağlantısı kurulamadı, örnek veriler gösteriliyor.")}
        </div>
      )}

      {/* ── Main 3-column grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 items-start">

        {/* ════ LEFT PANEL — Course Selector ════════════════════════════════ */}
        <aside className="glass rounded-2xl p-4 space-y-3 animate-fade-slide-up stagger-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t.tr("Kurslarım")}</h2>

          {loadingCourses ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl skeleton" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((c) => {
                const isActive = c.id === selectedCourseId;
                const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCourse(c.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isActive
                        ? 'border-violet-300 bg-violet-50 shadow-md ring-2 ring-violet-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center text-lg flex-shrink-0">
                        {c.thumbnail ? (
                          <img src={c.thumbnail} alt="" className="w-full h-full object-cover rounded-lg" />
                        ) : '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{t.tr(c.title)}</div>
                        <span className={`pill pill-xs border text-xs mt-0.5 ${status.cls}`}>{t.tr(status.label)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats for selected course */}
          {selectedCourse && !loadingStructure && modules.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2 mt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.tr("İstatistikler")}</p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { label: 'Modül sayısı', value: modules.length, icon: '📂' },
                  { label: 'Ders sayısı', value: totalLessons(modules), icon: '🎯' },
                  { label: 'Toplam süre', value: formatDuration(totalDuration(modules)), icon: '⏱' },
                ].map((s) => (
                  <div key={t.tr(s.label)} className="metric flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-500">{s.icon} {t.tr(s.label)}</span>
                    <span className="text-xs font-bold text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedCourseId && !loadingCourses && (
            <p className="text-xs text-slate-400 text-center pt-2">{t.tr("Düzenlemek için bir kurs seçin.")}</p>
          )}
        </aside>

        {/* ════ MIDDLE PANEL — Module/Lesson Tree ═══════════════════════════ */}
        <main className="space-y-3 animate-fade-slide-up stagger-2">
          {!selectedCourseId && (
            <div className="glass rounded-2xl p-10 text-center space-y-2">
              <div className="text-4xl">🏗️</div>
              <p className="text-slate-500 font-medium">{t.tr("Sol panelden bir kurs seçin")}</p>
              <p className="text-sm text-slate-400">{t.tr("Kurs yapısını buradan düzenleyebilirsiniz.")}</p>
            </div>
          )}

          {selectedCourseId && loadingStructure && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className={`h-28 rounded-2xl skeleton animate-fade-slide-up stagger-${i}`} />)}
            </div>
          )}

          {selectedCourseId && !loadingStructure && (
            <>
              {modules.length === 0 && (
                <div className="glass rounded-2xl p-8 text-center space-y-2">
                  <div className="text-3xl">📭</div>
                  <p className="text-slate-500 text-sm">{t.tr("Bu kursa henüz modül eklenmemiş.")}</p>
                </div>
              )}

              {modules.map((mod, mi) => {
                const collapsed = collapsedModules.has(mod.id);
                const isAddingLesson = addingLessonFor === mod.id;
                return (
                  <div
                    key={mod.id}
                    className={`glass rounded-2xl border border-slate-200 overflow-hidden animate-fade-slide-up stagger-${Math.min(mi + 1, 4)}`}
                  >
                    {/* Module header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                      {/* Drag handle (visual only) */}
                      <span className="text-slate-300 text-lg select-none cursor-grab" title={t.tr("Sürükle")}>⠿</span>

                      <button
                        type="button"
                        onClick={() => toggleCollapse(mod.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-mono w-5"
                        title={collapsed ? 'Genişlet' : 'Daralt'}
                      >
                        {collapsed ? '▶' : '▼'}
                      </button>

                      <div className="flex-1 min-w-0">
                        <InlineEdit
                          value={t.tr(mod.title)}
                          onSave={(v) => saveModuleTitle(mod.id, v)}
                          className="font-semibold text-sm text-slate-800"
                        />
                      </div>

                      <span className="pill pill-xs bg-violet-50 border-violet-200 text-violet-700 flex-shrink-0">
                        {mod.lessons.length} ders
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setAddingLessonFor(isAddingLesson ? null : mod.id);
                          setNewLessonTitle('');
                          setNewLessonType('VIDEO');
                          setNewLessonDuration(15);
                        }}
                        className="pill pill-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        + Ders Ekle
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteModule(mod.id, mod.title)}
                        className="text-rose-400 hover:text-rose-600 transition-colors text-xs flex-shrink-0"
                        title={t.tr("Modülü sil")}
                      >
                        🗑
                      </button>
                    </div>

                    {/* Lesson list */}
                    {!collapsed && (
                      <div className="divide-y divide-slate-100">
                        {mod.lessons.length === 0 && !isAddingLesson && (
                          <div className="px-6 py-4 text-sm text-slate-400 text-center">
                            {t.tr("Henüz ders yok. \"Ders Ekle\" ile başlayın.")}
                          </div>
                        )}

                        {mod.lessons.map((lesson, li) => {
                          const isSelected = selectedLesson?.lesson.id === lesson.id;
                          return (
                            <div
                              key={lesson.id}
                              className={`flex items-center gap-3 px-4 py-2.5 group transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-50 border-l-4 border-violet-400'
                                  : 'hover:bg-slate-50 border-l-4 border-transparent'
                              }`}
                              onClick={() => openLesson(mod.id, lesson)}
                            >
                              {/* Type icon */}
                              <span className="text-base w-6 text-center flex-shrink-0" title={LESSON_LABELS[lesson.type]}>
                                {LESSON_ICONS[lesson.type]}
                              </span>

                              {/* Title (inline edit) */}
                              <div
                                className="flex-1 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <InlineEdit
                                  value={t.tr(lesson.title)}
                                  onSave={(v) => saveLessonTitle(mod.id, lesson.id, v)}
                                  className="text-sm text-slate-700"
                                />
                              </div>

                              {/* Type badge */}
                              <span className="pill pill-xs bg-slate-50 border-slate-200 text-slate-500 flex-shrink-0 hidden sm:inline">
                                {LESSON_LABELS[lesson.type]}
                              </span>

                              {/* Duration chip */}
                              <span className="pill pill-xs bg-blue-50 border-blue-100 text-blue-600 flex-shrink-0">
                                {lesson.duration} dk
                              </span>

                              {/* Reorder buttons */}
                              <div
                                className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={li === 0}
                                  onClick={() => moveLesson(mod.id, lesson.id, 'up')}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                                  title={t.tr("Yukarı taşı")}
                                >↑</button>
                                <button
                                  type="button"
                                  disabled={li === mod.lessons.length - 1}
                                  onClick={() => moveLesson(mod.id, lesson.id, 'down')}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                                  title={t.tr("Aşağı taşı")}
                                >↓</button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add lesson form */}
                        {isAddingLesson && (
                          <div className="px-4 py-3 bg-emerald-50/60 border-t border-emerald-100 space-y-3">
                            <p className="text-xs font-semibold text-emerald-700">Yeni Ders</p>

                            <input
                              type="text"
                              placeholder={t.tr("Ders başlığı...")}
                              value={newLessonTitle}
                              onChange={(e) => setNewLessonTitle(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(mod.id); }}
                              autoFocus
                            />

                            <div className="flex flex-wrap gap-1.5">
                              {LESSON_TYPES.map((lt) => (
                                <LessonTypeButton
                                  key={lt}
                                  type={lt}
                                  selected={newLessonType === lt}
                                  onClick={() => setNewLessonType(lt)}
                                />
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-500">{t.tr("Süre:")}</label>
                              <input
                                type="number"
                                min={1}
                                max={300}
                                value={newLessonDuration}
                                onChange={(e) => setNewLessonDuration(Number(e.target.value))}
                                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-emerald-400"
                              />
                              <span className="text-xs text-slate-400">dakika</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddLesson(mod.id)}
                                disabled={savingLesson || !newLessonTitle.trim()}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                {savingLesson ? 'Kaydediliyor…' : 'Ekle'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingLessonFor(null)}
                                className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                              >
                                {t.tr("İptal")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Module */}
              {addingModule ? (
                <div className="glass rounded-2xl border border-dashed border-violet-300 p-4 space-y-3 animate-fade-slide-up">
                  <p className="text-sm font-semibold text-violet-700">{t.tr("Yeni Modül")}</p>
                  <input
                    type="text"
                    autoFocus
                    placeholder={t.tr("Modül başlığı...")}
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') setAddingModule(false); }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddModule}
                      disabled={savingModule || !newModuleTitle.trim()}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      {savingModule ? 'Oluşturuluyor…' : 'Modül Oluştur'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingModule(false); setNewModuleTitle(''); }}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      {t.tr("İptal")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingModule(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all"
                >
                  {t.tr("+ Yeni Modül Ekle")}
                </button>
              )}
            </>
          )}
        </main>

        {/* ════ RIGHT PANEL — Lesson Detail Editor ══════════════════════════ */}
        <aside className="animate-fade-slide-up stagger-3">
          {!selectedLesson ? (
            <div className="glass rounded-2xl p-6 text-center space-y-2 border border-dashed border-slate-200">
              <div className="text-3xl">✏️</div>
              <p className="text-sm font-medium text-slate-600">{t.tr("Ders Detayı")}</p>
              <p className="text-xs text-slate-400">{t.tr("Düzenlemek için bir ders satırına tıklayın.")}</p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-slate-200 overflow-hidden">
              {/* Panel header */}
              <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">{t.tr("Ders Detayı")}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.tr(selectedLesson.lesson.title)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLesson(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                  title="Kapat"
                >×</button>
              </div>

              <div className="p-4 space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t.tr("Başlık")}</label>
                  <input
                    type="text"
                    value={detailTitle}
                    onChange={(e) => setDetailTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                {/* Type selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">{t.tr("İçerik Türü")}</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LESSON_TYPES.map((lt) => (
                      <LessonTypeButton
                        key={lt}
                        type={lt}
                        selected={detailType === lt}
                        onClick={() => setDetailType(lt)}
                      />
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t.tr("Süre (dakika)")}</label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={detailDuration}
                    onChange={(e) => setDetailDuration(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t.tr("Açıklama")}</label>
                  <textarea
                    rows={3}
                    value={detailDescription}
                    onChange={(e) => setDetailDescription(e.target.value)}
                    placeholder={t.tr("Ders hakkında kısa açıklama...")}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
                  />
                </div>

                {/* VIDEO specific */}
                {detailType === 'VIDEO' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Video URL</label>
                    <input
                      type="url"
                      value={detailVideoUrl}
                      onChange={(e) => setDetailVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                )}

                {/* QUIZ specific */}
                {detailType === 'QUIZ' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">{t.tr("Soru Sayısı")}</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={detailQuestionCount}
                      onChange={(e) => setDetailQuestionCount(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                )}

                {/* LIVE specific */}
                {detailType === 'LIVE' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">{t.tr("Canlı Ders Tarihi")}</label>
                    <input
                      type="datetime-local"
                      value={detailScheduledAt}
                      onChange={(e) => setDetailScheduledAt(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                )}

                {/* Save button */}
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  disabled={savingDetail}
                  className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {savingDetail ? 'Kaydediliyor…' : detailSaved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>

                {detailSaved && (
                  <p className="text-center text-xs text-emerald-600 font-semibold animate-fade-slide-up">
                    {t.tr("Değişiklikler uygulandı.")}
                  </p>
                )}

                {/* Summary chips */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  <span className="pill pill-xs bg-slate-50 border-slate-200 text-slate-500">
                    {LESSON_ICONS[detailType]} {LESSON_LABELS[detailType]}
                  </span>
                  <span className="pill pill-xs bg-blue-50 border-blue-100 text-blue-600">
                    ⏱ {detailDuration} dk
                  </span>
                  {detailType === 'QUIZ' && (
                    <span className="pill pill-xs bg-amber-50 border-amber-100 text-amber-700">
                      ❓ {detailQuestionCount} soru
                    </span>
                  )}
                  {detailType === 'LIVE' && detailScheduledAt && (
                    <span className="pill pill-xs bg-rose-50 border-rose-100 text-rose-600">
                      🔴 {new Date(detailScheduledAt).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick stats for selected course */}
          {selectedCourseId && !loadingStructure && modules.length > 0 && (
            <div className="glass rounded-2xl p-4 mt-4 space-y-3 border border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.tr("Kurs Özeti")}</p>
              <div className="space-y-2">
                {[
                  { label: 'Modüller', value: modules.length, color: 'text-violet-700', bg: 'bg-violet-50' },
                  { label: 'Toplam Ders', value: totalLessons(modules), color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Video', value: modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === 'VIDEO').length, 0), color: 'text-slate-700', bg: 'bg-slate-50' },
                  { label: 'Quiz', value: modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === 'QUIZ').length, 0), color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Okuma', value: modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === 'READING').length, 0), color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Canlı', value: modules.reduce((a, m) => a + m.lessons.filter((l) => l.type === 'LIVE').length, 0), color: 'text-rose-700', bg: 'bg-rose-50' },
                ].map((s, i) => (
                  <div key={t.tr(s.label)} className={`metric flex items-center justify-between px-3 py-2 rounded-lg ${s.bg} animate-fade-slide-up stagger-${Math.min(i + 1, 4)}`}>
                    <span className="text-xs text-slate-600">{t.tr(s.label)}</span>
                    <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50">
                  <span className="text-xs text-slate-600">{t.tr("Toplam Süre")}</span>
                  <span className="text-sm font-bold text-indigo-700">{formatDuration(totalDuration(modules))}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
