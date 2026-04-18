"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../_i18n/use-i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CourseRecord = {
  courseTitle: string;
  instructor: string;
  startDate: string;
  completedAt: string | null;
  grade: string; // A / B / C / D / F
  score: number; // 0-100
  status: "COMPLETED" | "IN_PROGRESS" | "DROPPED";
};

type TranscriptData = {
  student: {
    name: string;
    id: string;
    enrolledAt: string;
  };
  courses: CourseRecord[];
  gpa: number;
  totalCredits: number;
  completedCredits: number;
};

// ---------------------------------------------------------------------------
// Demo data — 8 courses across 3 semesters
// ---------------------------------------------------------------------------

const DEMO: TranscriptData = {
  student: {
    name: "Mustafa İnan",
    id: "STU-2024-00142",
    enrolledAt: "2024-09-01",
  },
  gpa: 3.62,
  totalCredits: 24,
  completedCredits: 18,
  courses: [
    // Semester 1: Oct–Dec 2024
    {
      courseTitle: "Python ile Veri Bilimine Giriş",
      instructor: "Dr. Ayşe Kaya",
      startDate: "2024-10-05",
      completedAt: "2024-11-28",
      grade: "A",
      score: 95,
      status: "COMPLETED",
    },
    {
      courseTitle: "İstatistik Temelleri",
      instructor: "Prof. Mehmet Yılmaz",
      startDate: "2024-10-10",
      completedAt: "2024-12-15",
      grade: "B",
      score: 82,
      status: "COMPLETED",
    },
    {
      courseTitle: "SQL ve Veritabanı Yönetimi",
      instructor: "Selin Demir",
      startDate: "2024-11-01",
      completedAt: "2024-12-20",
      grade: "A",
      score: 91,
      status: "COMPLETED",
    },
    // Semester 2: Jan–Mar 2025
    {
      courseTitle: "Makine Öğrenmesi Temelleri",
      instructor: "Dr. Emre Çelik",
      startDate: "2025-01-08",
      completedAt: "2025-03-10",
      grade: "B",
      score: 78,
      status: "COMPLETED",
    },
    {
      courseTitle: "Derin Öğrenme ve Sinir Ağları",
      instructor: "Prof. Zeynep Arslan",
      startDate: "2025-01-15",
      completedAt: null,
      grade: "C",
      score: 61,
      status: "DROPPED",
    },
    {
      courseTitle: "Veri Görselleştirme",
      instructor: "Can Öztürk",
      startDate: "2025-02-03",
      completedAt: "2025-03-28",
      grade: "A",
      score: 97,
      status: "COMPLETED",
    },
    // Semester 3: Jan–Mar 2026
    {
      courseTitle: "Doğal Dil İşleme",
      instructor: "Dr. Hande Şahin",
      startDate: "2026-01-06",
      completedAt: null,
      grade: "B",
      score: 74,
      status: "IN_PROGRESS",
    },
    {
      courseTitle: "Büyük Veri Mühendisliği",
      instructor: "Berk Koçak",
      startDate: "2026-02-10",
      completedAt: null,
      grade: "A",
      score: 88,
      status: "IN_PROGRESS",
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function gradeToPoints(grade: string): number {
  const map: Record<string, number> = {
    A: 4.0,
    B: 3.0,
    C: 2.0,
    D: 1.0,
    F: 0.0,
  };
  return map[grade] ?? 0;
}

function gradeBadgeClass(grade: string): string {
  const map: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    B: "bg-blue-100 text-blue-700 border border-blue-200",
    C: "bg-amber-100 text-amber-700 border border-amber-200",
    D: "bg-orange-100 text-orange-700 border border-orange-200",
    F: "bg-red-100 text-red-700 border border-red-200",
  };
  return map[grade] ?? "bg-slate-100 text-slate-600";
}

function statusBadge(status: CourseRecord["status"]): {
  label: string;
  cls: string;
} {
  if (status === "COMPLETED")
    return {
      label: "Tamamlandı",
      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    };
  if (status === "IN_PROGRESS")
    return {
      label: "Devam Ediyor",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
    };
  return {
    label: "Bırakıldı",
    cls: "bg-red-100 text-red-700 border border-red-200",
  };
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.5) return "text-emerald-600";
  if (gpa >= 2.5) return "text-blue-600";
  if (gpa >= 1.5) return "text-amber-600";
  return "text-red-600";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Returns a semester label like "Ocak–Mart 2026" for a given date string. */
function semesterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const quarter = Math.floor(month / 3);
  const labels = [
    ["Ocak", "Mart"],
    ["Nisan", "Haziran"],
    ["Temmuz", "Eylül"],
    ["Ekim", "Aralık"],
  ];
  return `${labels[quarter][0]}–${labels[quarter][1]} ${year}`;
}

function groupBySemester(
  courses: CourseRecord[]
): { label: string; courses: CourseRecord[] }[] {
  const map = new Map<string, CourseRecord[]>();
  for (const c of courses) {
    const label = semesterLabel(c.startDate);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }
  // Sort semesters chronologically by parsing first course start date
  const sorted = Array.from(map.entries()).sort(([, a], [, b]) => {
    return (
      new Date(a[0].startDate).getTime() - new Date(b[0].startDate).getTime()
    );
  });
  return sorted.map(([label, courses]) => ({ label, courses }));
}

function semesterGpa(courses: CourseRecord[]): number {
  const completed = courses.filter((c) => c.status === "COMPLETED");
  if (completed.length === 0) return 0;
  const sum = completed.reduce((acc, c) => acc + gradeToPoints(c.grade), 0);
  return sum / completed.length;
}

// ---------------------------------------------------------------------------
// SVG GPA Gauge
// ---------------------------------------------------------------------------

function GpaGauge({ gpa }: { gpa: number }) {
  // Semicircle: center 100,100, radius 80
  // Angle: -180deg (left = 0.0) to 0deg (right = 4.0)
  const clampedGpa = Math.min(4.0, Math.max(0, gpa));
  const angleDeg = -180 + (clampedGpa / 4.0) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const r = 72;
  const cx = 100;
  const cy = 100;
  const needleX = cx + r * Math.cos(angleRad);
  const needleY = cy + r * Math.sin(angleRad);

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px] mx-auto print:max-w-[160px]">
      {/* Background arc zones */}
      {/* Red zone: 0–1.5 */}
      <path
        d="M 28 100 A 72 72 0 0 1 73 27"
        fill="none"
        stroke="#fecaca"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Amber zone: 1.5–2.5 */}
      <path
        d="M 73 27 A 72 72 0 0 1 100 28"
        fill="none"
        stroke="#fde68a"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Blue zone: 2.5–3.5 */}
      <path
        d="M 100 28 A 72 72 0 0 1 127 27"
        fill="none"
        stroke="#bfdbfe"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Green zone: 3.5–4.0 */}
      <path
        d="M 127 27 A 72 72 0 0 1 172 100"
        fill="none"
        stroke="#a7f3d0"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="#1e293b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="6" fill="#1e293b" />

      {/* Scale labels */}
      <text x="22" y="112" fontSize="10" fill="#94a3b8" textAnchor="middle">0.0</text>
      <text x="100" y="20" fontSize="10" fill="#94a3b8" textAnchor="middle">2.0</text>
      <text x="178" y="112" fontSize="10" fill="#94a3b8" textAnchor="middle">4.0</text>

      {/* GPA value */}
      <text
        x={cx}
        y={cy + 26}
        fontSize="18"
        fontWeight="700"
        fill={gpa >= 3.5 ? "#059669" : gpa >= 2.5 ? "#2563eb" : gpa >= 1.5 ? "#d97706" : "#dc2626"}
        textAnchor="middle"
      >
        {clampedGpa.toFixed(2)}
      </text>
      <text x={cx} y={cy + 40} fontSize="9" fill="#94a3b8" textAnchor="middle">
        GPA / 4.00
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Print CSS injected once
// ---------------------------------------------------------------------------

const PRINT_CSS = `
@media print {
  body { background: white !important; }
  .no-print { display: none !important; }
  .glass { background: white !important; box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
  .hero { background: white !important; }
  table { font-size: 11px; }
  .print-break-inside-avoid { break-inside: avoid; }
}
`;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReportCardsPage() {
  const t = useI18n();
  const [data, setData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inject print CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = PRINT_CSS;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Fetch transcript
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    fetch(`${API_BASE}/reports/my-transcript`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TranscriptData>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        // Fall back to demo data so the page is always useful
        setData(DEMO);
        setLoading(false);
        setError(t.tr("API bağlantısı kurulamadı — demo veriler gösteriliyor."));
      });
  }, []);

  const semesters = data ? groupBySemester(data.courses) : [];

  return (
    <main className="space-y-6">
      {/* ── Print style tag is injected via useEffect ── */}

      {/* ── Hero ── */}
      <header className="glass hero rounded-2xl border border-slate-200 p-6">
        <div className="hero-content space-y-2 animate-fade-slide-up stagger-1">
          <div className="pill w-fit no-print">{t.reportCards.title}</div>
          <h1 className="text-3xl font-semibold">
            📄 {t.reportCards.title}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            {t.reportCards.subtitle}
          </p>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 no-print">
          ⚠️ {error}
        </div>
      )}

      {/* ── Student info + GPA gauge ── */}
      <section className="grid md:grid-cols-2 gap-4 animate-fade-slide-up stagger-2 print-break-inside-avoid">
        {/* Student info card */}
        <div className="glass rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-400 inline-block" />
            {t.tr("Öğrenci Bilgileri")}
          </h2>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-4 rounded w-3/4" />
              ))}
            </div>
          ) : data ? (
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">{t.tr("Ad Soyad")}</dt>
                <dd className="font-semibold text-slate-800">{data.student.name}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">{t.tr("Öğrenci No")}</dt>
                <dd className="font-mono text-slate-700">{data.student.id}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">{t.tr("Kayıt Tarihi")}</dt>
                <dd className="text-slate-700">{formatDate(data.student.enrolledAt)}</dd>
              </div>
              <hr className="border-slate-100" />
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">{t.tr("Toplam Kredi")}</dt>
                <dd className="font-semibold text-slate-800">{data.totalCredits}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">{t.tr("Tamamlanan Kredi")}</dt>
                <dd className="font-semibold text-slate-800">{data.completedCredits}</dd>
              </div>
              <div className="flex justify-between items-baseline">
                <dt className="text-slate-500 text-sm">{t.tr("Genel Not Ortalaması")}</dt>
                <dd className={`text-2xl font-bold ${gpaColor(data.gpa)}`}>
                  {data.gpa.toFixed(2)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>

        {/* GPA Gauge */}
        <div className="glass rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center space-y-2">
          <h2 className="text-base font-bold text-slate-800 self-start flex items-center gap-2 w-full">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
            {t.tr("GPA Göstergesi")}
          </h2>
          {loading ? (
            <div className="skeleton h-36 w-48 rounded-xl animate-pulse" />
          ) : data ? (
            <>
              <GpaGauge gpa={data.gpa} />
              <div className="flex gap-3 flex-wrap justify-center text-xs mt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-200 inline-block" />
                  {"<"}1.5 {t.tr("Başarısız")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-200 inline-block" />
                  1.5–2.5 {t.tr("Orta")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-200 inline-block" />
                  {t.tr("2.5–3.5 İyi")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 inline-block" />
                  {">"}3.5 {t.tr("Mükemmel")}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* ── Semester sections ── */}
      {loading ? (
        <section className="glass rounded-2xl border border-slate-200 p-4 space-y-2 animate-fade-slide-up stagger-3">
          <div className="skeleton h-5 w-48 rounded animate-pulse mb-4" />
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        semesters.map(({ label, courses }, semIdx) => {
          const semGpa = semesterGpa(courses);
          const staggerClass = `stagger-${Math.min(semIdx + 3, 4)}`;
          return (
            <section
              key={label}
              className={`glass rounded-2xl border border-slate-200 overflow-hidden animate-fade-slide-up ${staggerClass} print-break-inside-avoid`}
            >
              {/* Semester header */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-blue-400 inline-block" />
                  <h2 className="text-sm font-bold text-slate-800">{label}</h2>
                  <span className="pill text-xs no-print">{courses.length} {t.tr("kurs")}</span>
                </div>
                {semGpa > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">{t.tr("Dönem GPA:")}</span>
                    <span className={`text-sm font-bold ${gpaColor(semGpa)}`}>
                      {semGpa.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Kurs Adı")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Eğitmen")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Başlangıç")}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Bitiş")}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Puan")}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Not")}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {t.tr("Durum")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.map((course, rowIdx) => {
                      const { label: statusLabel, cls: statusCls } =
                        statusBadge(course.status);
                      const isDropped = course.status === "DROPPED";
                      return (
                        <tr
                          key={rowIdx}
                          className={`transition-colors hover:bg-slate-50/60 ${isDropped ? "opacity-60" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`font-medium text-slate-800 ${isDropped ? "line-through text-slate-400" : ""}`}
                            >
                              {course.courseTitle}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {course.instructor}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                            {formatDate(course.startDate)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                            {formatDate(course.completedAt)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="metric text-slate-800">
                              {isDropped ? "—" : course.score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isDropped ? (
                              <span className="text-slate-400 text-xs">—</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${gradeBadgeClass(course.grade)}`}
                              >
                                {course.grade}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls}`}
                            >
                              {t.tr(statusLabel)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      {/* ── Credit progress bar ── */}
      {data && !loading && (
        <section className="glass rounded-2xl border border-slate-200 p-5 space-y-3 animate-fade-slide-up stagger-4 print-break-inside-avoid">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
              {t.tr("Kredi Durumu")}
            </h2>
            <span className="pill text-xs no-print">
              {data.completedCredits} / {data.totalCredits} {t.tr("kredi")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round((data.completedCredits / data.totalCredits) * 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              %{Math.round((data.completedCredits / data.totalCredits) * 100)}
            </span>
          </div>
          <div className="flex gap-6 text-sm text-slate-600">
            <span>
              {t.tr("Tamamlanan")}:{" "}
              <strong className="text-emerald-600">{data.completedCredits}</strong>
            </span>
            <span>
              {t.tr("Kalan")}:{" "}
              <strong className="text-blue-600">
                {data.totalCredits - data.completedCredits}
              </strong>
            </span>
            <span>
              {t.tr("Toplam")}: <strong className="text-slate-800">{data.totalCredits}</strong>
            </span>
          </div>
        </section>
      )}

      {/* ── PDF / Print button ── */}
      <div className="flex justify-end gap-3 no-print animate-fade-slide-up stagger-4">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t.reportCards.downloadPDF}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          {t.tr("Yazdır")}
        </button>
      </div>
    </main>
  );
}
