'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useI18n } from '../../_i18n/use-i18n';
import { findDemoCourseById, isDemoCourseId } from '../_demo-data';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

type Lesson = {
  id: string;
  title: string;
  order: number;
  isPreview: boolean;
};

type Course = {
  id: string;
  title: string;
  description?: string | null;
  lessons: Lesson[];
};

type Schedule = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  timezone?: string | null;
  meetingUrl?: string | null;
  location?: string | null;
};

function fmtDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
}

function fmtTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 16: dynamic route params are async; unwrap with React.use()
  const { id: courseId } = use(params);
  const t = useI18n();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [schedule, setSchedule] = useState<Schedule[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/courses/published/${courseId}`).then((res) =>
        res.ok ? (res.json() as Promise<Course>) : null
      ).catch(() => null),
      fetch(`${API_URL}/courses/${courseId}/schedule`).then((res) =>
        res.ok ? (res.json() as Promise<Schedule[]>) : []
      ).catch(() => [] as Schedule[]),
    ]).then(([c, s]) => {
      // Frontend demo fallback: catalog ships demo IDs (d1-d12) that may
      // not exist in the backend DB. When API returns null for a known
      // demo ID, render the shared demo data instead of the 404 view so
      // the catalog → detail flow works end-to-end without a DB seed.
      if (!c && isDemoCourseId(courseId)) {
        const demo = findDemoCourseById(courseId);
        if (demo) {
          setCourse({
            id: demo.id,
            title: demo.title,
            description: demo.description,
            lessons: demo.lessons,
          });
          setSchedule([]);
          return;
        }
      }
      setCourse(c);
      setSchedule(s ?? []);
    });
  }, [courseId]);

  // Still loading
  if (course === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-12 text-center shadow-xl max-w-md w-full">
          <span className="text-slate-400 text-sm">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-12 text-center shadow-xl max-w-md w-full">
          <span className="text-6xl">404</span>
          <h1 className="text-2xl font-bold text-slate-800">{t.courses.noCoursesFound}</h1>
          <p className="text-slate-500 leading-relaxed">
            {t.tr("Aradığınız kurs mevcut değil ya da kaldırılmış olabilir.")}
          </p>
          <Link href="/courses" className="btn-link mt-2">
            ← {t.common.back}
          </Link>
        </div>
      </div>
    );
  }

  const lessonCount = course.lessons.length;
  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 shadow-2xl">
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
        {/* Decorative circle */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl" />

        <div className="relative z-10 p-7 md:p-10">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-white/60 font-medium">
            <Link href="/courses" className="hover:text-white/90 transition-colors">{t.tr("Kurslar")}</Link>
            <span>/</span>
            <span className="text-white/90 truncate max-w-xs">{t.tr(course.title)}</span>
          </nav>

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-4">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
                  📚 {lessonCount} {t.courses.lessons}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
                  📅 {schedule.length} {t.tr("Oturum")}
                </span>
              </div>
              {/* Title */}
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
                {t.tr(course.title)}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Stat Chips */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center gap-2 px-5 py-3 shadow-sm">
          <span className="text-lg">📖</span>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.courses.lessons}</p>
            <p className="text-sm font-bold text-blue-700">{lessonCount}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center gap-2 px-5 py-3 shadow-sm">
          <span className="text-lg">🗓️</span>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.tr("Oturum Sayısı")}</p>
            <p className="text-sm font-bold text-amber-700">{schedule.length}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-violet-100/50 flex items-center gap-2 px-5 py-3 shadow-sm">
          <span className="text-lg">🎥</span>
          <div>
            <p className="text-xs text-slate-500 font-medium">Format</p>
            <p className="text-sm font-bold text-violet-700">{t.tr("Canlı + Kayıtlı")}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center gap-2 px-5 py-3 shadow-sm">
          <span className="text-lg">🏆</span>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t.courses.certificate}</p>
            <p className="text-sm font-bold text-amber-700">{t.tr("Dahil")}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <section className="glass rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-400 inline-block" />
            {t.courses.detailOverview}
          </h2>
          <p className="text-slate-600 leading-relaxed">{t.tr(course.description)}</p>
        </section>
      )}

      {/* Schedule Section */}
      {schedule.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-400 inline-block" />
              {t.courses.detailCurriculum}
            </h2>
            <Link
              href={`${API_URL}/courses/${course.id}/schedule/ics`}
              prefetch={false}
              className="btn-link text-sm"
            >
              📆 {t.tr("Takvime Ekle (.ics)")}
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {schedule.map((s) => (
              <article key={s.id} className="glass flex flex-col gap-3 rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-amber-200 hover:shadow-md transition-all">
                <h3 className="font-semibold text-slate-800 leading-snug">{t.tr(s.title)}</h3>
                {s.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {t.tr(s.description)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    📅 {fmtDate(s.startAt)}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{fmtTimeRange(s.startAt, s.endAt)}</span>
                  {s.timezone && (
                    <span className="pill bg-slate-100 text-slate-500 text-xs">{s.timezone}</span>
                  )}
                </div>
                {s.location && (
                  <p className="text-xs text-slate-400">📍 {s.location}</p>
                )}
                {s.meetingUrl && (
                  <Link
                    href={s.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90"
                    style={{ background: "#0B1F3A" }}
                  >
                    {t.tr("🎥 Canlı Katıl")}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Lessons Section */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
          {t.courses.lessons}
          <span className="ml-1 text-base font-normal text-slate-400">({lessonCount})</span>
        </h2>
        {lessonCount === 0 ? (
          <div className="glass rounded-2xl p-10 text-center space-y-3">
            <p className="text-slate-500 font-medium">{t.courses.noCoursesFound}</p>
            <Link href="/courses" className="btn-link inline-block">
              ← {t.common.back}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {sortedLessons.map((lesson, idx) => (
              <li
                key={lesson.id}
                className="glass flex items-center gap-4 rounded-xl px-5 py-4 shadow-sm transition-all border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-md"
              >
                {/* Order badge */}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow">
                  {idx + 1}
                </span>
                {/* Title + progress */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold text-slate-800 leading-snug truncate">
                    {t.tr(lesson.title)}
                  </p>
                  {/* Progress bar placeholder */}
                  <div className="h-1 w-full rounded-full bg-slate-100" />
                </div>
                {/* Access badge */}
                {lesson.isPreview ? (
                  <span className="pill shrink-0 bg-amber-50 text-amber-700 font-semibold">
                    {t.courses.preview}
                  </span>
                ) : (
                  <span className="pill shrink-0 bg-slate-100 text-slate-500">
                    {t.courses.enrolled}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
