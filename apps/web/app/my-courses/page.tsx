'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../api/client';
import { useTrackEvent } from '../_hooks/use-track-event';
import { useRole } from '../_components/role-context';
import { useI18n } from '../_i18n/use-i18n';

// ─── Types ────────────────────────────────────────────────────────────────────
type Course = { id: string; title: string; description?: string | null };
type Enrollment = { id: string; courseId: string; createdAt: string; completedAt: string | null; refundedAt: string | null; Course: Course };
type ProgressItem = { courseId: string; total: number; done: number; percentage: number };
type Note = { id: string; courseId: string; courseTitle: string; content: string; createdAt: Date; color: string };
type GradeEntry = { subject: string; mid: number; final: number; avg: number; grade: string; status: 'geçti' | 'kaldı' | 'devam' };

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_NOTES: Note[] = [
  { id: 'n1', courseId: 'c1', courseTitle: 'Veri Yapıları', content: 'Binary search tree: insert O(log n), worst case O(n). AVL ağacı her zaman dengeli.', createdAt: new Date(Date.now() - 3600000 * 2), color: '#5b6eff' },
  { id: 'n2', courseId: 'c2', courseTitle: 'Web Geliştirme', content: 'React hooks: useState, useEffect, useCallback. Custom hook yazımı — use prefix zorunlu.', createdAt: new Date(Date.now() - 86400000), color: '#00b4d8' },
  { id: 'n3', courseId: 'c1', courseTitle: 'Veri Yapıları', content: 'Hash table: açık adresleme vs zincirleme. Load factor < 0.7 tutulmalı.', createdAt: new Date(Date.now() - 86400000 * 2), color: '#9b59ff' },
  { id: 'n4', courseId: 'c3', courseTitle: 'Algoritmalar', content: 'Dinamik programlama: memoization vs tabulation. Fibonacci örneği ile karşılaştırma.', createdAt: new Date(Date.now() - 86400000 * 3), color: '#06d6a0' },
];

const DEMO_GRADES: GradeEntry[] = [
  { subject: 'Veri Yapıları',    mid: 78, final: 84, avg: 82, grade: 'BB', status: 'geçti' },
  { subject: 'Algoritmalar',     mid: 65, final: 71, avg: 69, grade: 'CB', status: 'geçti' },
  { subject: 'Web Geliştirme',   mid: 0,  final: 0,  avg: 0,  grade: '—',  status: 'devam' },
  { subject: 'Veritabanları',    mid: 88, final: 92, avg: 91, grade: 'AA', status: 'geçti' },
  { subject: 'İşletim Sistemleri', mid: 55, final: 48, avg: 50, grade: 'FF', status: 'kaldı' },
];

const NOTE_COLORS = ['#5b6eff', '#00b4d8', '#9b59ff', '#06d6a0', '#f59e0b', '#f87171'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gradeColor(status: GradeEntry['status']) {
  if (status === 'geçti') return '#22c55e';
  if (status === 'kaldı') return '#f87171';
  return 'var(--accent)';
}

function relTime(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}dk önce`;
  if (mins < 1440) return `${Math.round(mins / 60)}sa önce`;
  return `${Math.round(mins / 1440)}g önce`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyCoursesPage() {
  const router = useRouter();
  const track = useTrackEvent();
  const { role } = useRole();
  const t = useI18n();
  const isInstructor = role === 'instructor' || role === 'admin' || role === 'head-instructor';

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseTab, setCourseTab] = useState<'active' | 'completed' | 'all'>('active');
  const [mainTab, setMainTab] = useState<'courses' | 'notes' | 'grades'>('courses');

  // Notes state
  const [notes, setNotes] = useState<Note[]>(DEMO_NOTES);
  const [noteInput, setNoteInput] = useState('');
  const [noteCourse, setNoteCourse] = useState('');
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [noteSearch, setNoteSearch] = useState('');

  const loadProgress = useCallback(async (courseIds: string[]) => {
    if (courseIds.length === 0) return;
    try {
      const result = await api<ProgressItem[]>('/me/progress/bulk', { method: 'POST', body: JSON.stringify({ courseIds }) });
      setProgressMap(new Map(result.map((p) => [p.courseId, p])));
    } catch { /* ilerleme opsiyonel */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    api<Enrollment[]>('/me/enrollments')
      .then((data) => {
        setEnrollments(data);
        loadProgress(data.map((e) => e.courseId));
        track('CONTENT_VIEWED', { page: 'my-courses', enrollmentCount: data.length });
      })
      .catch((e) => {
        if (e?.message?.includes('401')) router.push('/login');
        else setError(e?.message ?? 'Kayıtlar yüklenemedi');
      })
      .finally(() => setLoading(false));
  }, [router, loadProgress, track]);

  const filtered = enrollments.filter((e) => {
    if (courseTab === 'active') return !e.completedAt && !e.refundedAt;
    if (courseTab === 'completed') return !!e.completedAt;
    return true;
  });

  const activeCount    = enrollments.filter((e) => !e.completedAt && !e.refundedAt).length;
  const completedCount = enrollments.filter((e) => !!e.completedAt).length;
  const avgProgress = (() => {
    const active = enrollments.filter((e) => !e.completedAt && !e.refundedAt);
    if (active.length === 0) return 0;
    const total = active.reduce((s, e) => s + (progressMap.get(e.courseId)?.percentage ?? 0), 0);
    return Math.round(total / active.length);
  })();

  const filteredNotes = notes.filter((n) =>
    !noteSearch || n.content.toLowerCase().includes(noteSearch.toLowerCase()) || n.courseTitle.toLowerCase().includes(noteSearch.toLowerCase())
  );

  const gpa = (() => {
    const gradePoints: Record<string, number> = { AA: 4, BA: 3.5, BB: 3, CB: 2.5, CC: 2, DC: 1.5, DD: 1, FF: 0 };
    const passed = DEMO_GRADES.filter((g) => g.status !== 'devam');
    if (!passed.length) return 0;
    return (passed.reduce((s, g) => s + (gradePoints[g.grade] ?? 0), 0) / passed.length).toFixed(2);
  })();

  return (
    <>
      <style>{`
        .mc-tab-btn { transition: all 0.15s; }
        .mc-tab-btn:hover { color: var(--accent); }
        .mc-course-card {
          border-radius: var(--r-xl); background: var(--panel); border: 1.5px solid var(--line);
          overflow: hidden; transition: box-shadow 0.18s, transform 0.18s;
          box-shadow: var(--shadow-sm);
        }
        .mc-course-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .mc-note-card {
          border-radius: var(--r-xl); background: var(--panel); border: 1.5px solid var(--line);
          padding: 14px 16px; transition: box-shadow 0.15s;
          box-shadow: var(--shadow-sm);
        }
        .mc-note-card:hover { box-shadow: var(--shadow-md); }
        .mc-input {
          width: 100%; border-radius: var(--r-lg); border: 1.5px solid var(--line);
          background: var(--bg); padding: 9px 13px; font-size: 13px; color: var(--ink);
          outline: none; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .mc-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .mc-input::placeholder { color: var(--muted); }
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
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                {isInstructor ? t.tr('Eğitmen Paneli') : t.tr('Öğrenci Paneli')}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
                {isInstructor ? t.tr('Kurslarım') : t.tr('Öğrenim Merkezim')}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                {t.tr('Kurslar, notlar ve karne tek ekranda')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isInstructor && (
                <Link href="/instructor" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))', border: '1.5px solid color-mix(in srgb, var(--accent) 25%, var(--line))', color: 'var(--accent)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                  {t.tr("🎓 Eğitmen Paneli")}
                </Link>
              )}
              <Link href="/my-courses/skill-profile" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: '1.5px solid var(--line)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                📊 {t.courses.skillProfile}
              </Link>
            </div>
          </div>
        </header>

        {/* ── Stat cards ── */}
        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: t.tr('Toplam Kayıt'),   value: enrollments.length, icon: '📚', color: 'var(--ink)' },
              { label: t.courses.myCoursesContinue, value: activeCount,    icon: '⚡', color: 'var(--accent)' },
              { label: t.courses.myCoursesCompleted, value: completedCount, icon: '✅', color: '#22c55e' },
              { label: t.tr('Ort. İlerleme'),  value: `${avgProgress}%`,  icon: '📈', color: '#9b59ff' },
            ].map((s) => (
              <div key={s.icon} style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '14px 18px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Main tab bar ── */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 4, boxShadow: 'var(--shadow-sm)' }}>
          {([
            { id: 'courses', label: 'Kurslarım',  icon: '📚' },
            { id: 'notes',   label: 'Notlarım',   icon: '📝' },
            { id: 'grades',  label: 'Karnem',     icon: '🎓' },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)} className="mc-tab-btn" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 16px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: mainTab === tab.id ? 700 : 500,
              background: mainTab === tab.id ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'transparent',
              color: mainTab === tab.id ? 'var(--accent)' : 'var(--muted)',
              boxShadow: mainTab === tab.id ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 30%, transparent)' : 'none',
            }}>
              <span>{tab.icon}</span> {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {/* ══ COURSES TAB ══ */}
        {mainTab === 'courses' && (
          <>
            {/* Sub-tab filter */}
            {!loading && !error && (
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { key: 'active',    label: `⚡ ${t.courses.myCoursesContinue} (${activeCount})` },
                  { key: 'completed', label: `✅ ${t.courses.myCoursesCompleted} (${completedCount})` },
                  { key: 'all',       label: `📚 ${t.courses.myCoursesAll} (${enrollments.length})` },
                ] as const).map((tab) => (
                  <button key={tab.key} onClick={() => setCourseTab(tab.key)} style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: courseTab === tab.key ? 700 : 500,
                    background: courseTab === tab.key ? 'var(--ink)' : 'var(--panel)',
                    color: courseTab === tab.key ? 'var(--bg)' : 'var(--muted)',
                    boxShadow: courseTab === tab.key ? 'var(--shadow-sm)' : 'inset 0 0 0 1.5px var(--line)',
                    transition: 'all 0.15s',
                  }}>
                    {t.tr(tab.label)}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div style={{ borderRadius: 'var(--r-lg)', border: '1.5px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', padding: '12px 16px', fontSize: 13, color: '#f87171' }}>{error}</div>
            )}

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 140, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', opacity: 0.5 }} />
                ))}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '40px 20px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
                <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
                  {courseTab === 'active' ? t.tr('Devam eden kayıt yok.') : courseTab === 'completed' ? t.tr('Henüz tamamlanan kurs yok.') : t.tr('Hiç kayıt bulunamadı.')}
                </p>
                <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 'var(--r-lg)', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  {t.tr("Kurslara göz at →")}
                </Link>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {filtered.map((enrollment) => {
                  const progress = progressMap.get(enrollment.courseId);
                  const pct = progress?.percentage ?? 0;
                  const isCompleted = !!enrollment.completedAt;
                  const isRefunded = !!enrollment.refundedAt;
                  return (
                    <article key={enrollment.id} className="mc-course-card">
                      {/* Banner */}
                      <div style={{ height: 72, background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, var(--panel)), color-mix(in srgb, var(--accent-2) 14%, var(--panel)))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 36, opacity: 0.22 }}>📖</span>
                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: isRefunded ? 'rgba(248,113,113,0.15)' : isCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(91,110,255,0.15)',
                            color: isRefunded ? '#f87171' : isCompleted ? '#22c55e' : 'var(--accent)',
                            border: `1px solid ${isRefunded ? 'rgba(248,113,113,0.3)' : isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(91,110,255,0.3)'}`,
                          }}>
                            {isRefunded ? t.tr('İade') : isCompleted ? t.tr('✓ Tamamlandı') : t.tr('Devam Ediyor')}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>
                          {t.tr(enrollment.Course.title)}
                        </h2>
                        {enrollment.Course.description && (
                          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {t.tr(enrollment.Course.description)}
                          </p>
                        )}

                        {/* Progress */}
                        {!isCompleted && !isRefunded && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                              <span>{t.tr("İlerleme")}</span>
                              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: 'var(--line)' }}>
                              <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', transition: 'width 0.4s' }} />
                            </div>
                            {progress && (
                              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{progress.done} / {progress.total} {t.tr('ders')}</p>
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {new Date(enrollment.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <Link href={`/courses/${enrollment.courseId}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}>
                            {t.tr('Kursa git →')}
                          </Link>
                        </div>
                      </div>

                      {isCompleted && (
                        <div style={{ padding: '8px 18px', fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.06)', borderTop: '1px solid rgba(34,197,94,0.15)' }}>
                          {t.tr('🎓 Tamamlandı:')} {new Date(enrollment.completedAt!).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ NOTES TAB ══ */}
        {mainTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Add note */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t.tr('Yeni Not')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="mc-input"
                  placeholder={t.tr("Kurs adı…")}
                  value={noteCourse}
                  onChange={(e) => setNoteCourse(e.target.value)}
                />
                <textarea
                  className="mc-input"
                  placeholder={t.tr("Not içeriği…")}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {NOTE_COLORS.map((c) => (
                      <button key={c} onClick={() => setNoteColor(c)} style={{
                        width: 20, height: 20, borderRadius: '50%', background: c, border: noteColor === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer',
                      }} />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (!noteInput.trim()) return;
                      setNotes((prev) => [{
                        id: `n${Date.now()}`, courseId: `c${Date.now()}`,
                        courseTitle: noteCourse.trim() || 'Genel',
                        content: noteInput.trim(), createdAt: new Date(), color: noteColor,
                      }, ...prev]);
                      setNoteInput(''); setNoteCourse('');
                    }}
                    disabled={!noteInput.trim()}
                    style={{
                      padding: '7px 18px', borderRadius: 'var(--r-lg)', border: 'none', cursor: noteInput.trim() ? 'pointer' : 'not-allowed',
                      background: noteInput.trim() ? 'var(--accent)' : 'var(--line)', color: noteInput.trim() ? '#fff' : 'var(--muted)',
                      fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    }}
                  >
                    {t.tr('+ Kaydet')}
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            <input
              className="mc-input"
              placeholder={t.tr('🔍 Notlarda ara…')}
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
            />

            {/* Note count */}
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {filteredNotes.length} {t.tr('not')}{noteSearch ? ` "${noteSearch}" ${t.tr('için')}` : ''}
            </div>

            {/* Note grid */}
            {filteredNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                {t.tr("Not bulunamadı.")}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filteredNotes.map((note) => (
                  <div key={note.id} className="mc-note-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: note.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: note.color }}>{note.courseTitle}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{relTime(note.createdAt)}</span>
                        <button
                          onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, lineHeight: 1, padding: '0 2px' }}
                        >×</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{t.tr(note.content)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ GRADES TAB ══ */}
        {mainTab === 'grades' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* GPA card */}
            <div style={{
              borderRadius: 'var(--r-xl)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--panel)), color-mix(in srgb, var(--accent-2) 8%, var(--panel)))',
              border: '1.5px solid color-mix(in srgb, var(--accent) 20%, var(--line))',
              display: 'flex', alignItems: 'center', gap: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{gpa}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>GPA (4.0)</div>
              </div>
              <div style={{ width: 1, height: 48, background: 'var(--line)' }} />
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Geçti', value: DEMO_GRADES.filter((g) => g.status === 'geçti').length, color: '#22c55e' },
                  { label: 'Kaldı', value: DEMO_GRADES.filter((g) => g.status === 'kaldı').length, color: '#f87171' },
                  { label: 'Devam', value: DEMO_GRADES.filter((g) => g.status === 'devam').length, color: 'var(--accent)' },
                ].map((s) => (
                  <div key={t.tr(s.label)} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.tr(s.label)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <Link href="/report-cards" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--r-lg)', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--glow-blue)' }}>
                  {t.tr('Tam Karne →')}
                </Link>
              </div>
            </div>

            {/* Grade table */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 90px', padding: '10px 18px', borderBottom: '1.5px solid var(--line)', background: 'var(--bg)' }}>
                {['Ders', 'Vize', 'Final', 'Ortalama', 'Harf', 'Durum'].map((h) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t.tr(h)}</div>
                ))}
              </div>
              {DEMO_GRADES.map((g, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 90px',
                  padding: '12px 18px', alignItems: 'center',
                  borderBottom: i < DEMO_GRADES.length - 1 ? '1px solid var(--line)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--bg) 40%, var(--panel))',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{g.subject}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{g.mid || '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{g.final || '—'}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{g.avg || '—'}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: gradeColor(g.status) }}>{g.grade}</div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                      background: g.status === 'geçti' ? 'rgba(34,197,94,0.1)' : g.status === 'kaldı' ? 'rgba(248,113,113,0.1)' : 'rgba(91,110,255,0.1)',
                      color: gradeColor(g.status),
                      border: `1px solid ${g.status === 'geçti' ? 'rgba(34,197,94,0.3)' : g.status === 'kaldı' ? 'rgba(248,113,113,0.3)' : 'rgba(91,110,255,0.3)'}`,
                    }}>
                      {g.status === 'geçti' ? t.tr('✓ Geçti') : g.status === 'kaldı' ? t.tr('✗ Kaldı') : t.tr('● Devam')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
