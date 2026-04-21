"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = "pending" | "completed";

type Submission = {
  id: string;
  title: string;
  course: string;
  submittedBy: string;
  submittedAt: string;
  preview: string;
  status: ReviewStatus;
  myScore?: number;
};

type ReviewState = {
  score: number;
  feedback: string;
  criteria: boolean[];
  loading: boolean;
  error: string | null;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const CRITERIA_LABELS = [
  "İçerik kalitesi yüksek",
  "Açıklamalar net ve anlaşılır",
  "Kaynaklar düzgün gösterilmiş",
  "Özgün düşünceler içeriyor",
  "Sunum kalitesi iyi",
];

const INITIAL_REVIEWS: Submission[] = [
  {
    id: "sub1",
    title: "Lineer Cebir Ödevi",
    course: "Matematik 101",
    submittedBy: "Öğrenci #1 (Anonim)",
    submittedAt: "2026-03-25",
    preview:
      "Bu ödevde matris çarpımını ele aldım. Önce 2x2 matrisler üzerinde...",
    status: "pending",
  },
  {
    id: "sub2",
    title: "Proje Sunumu Raporu",
    course: "Girişimcilik",
    submittedBy: "Öğrenci #2 (Anonim)",
    submittedAt: "2026-03-24",
    preview:
      "Projemiz için pazar araştırması yaptık. Hedef kitlemiz 18-30 yaş arası...",
    status: "pending",
  },
  {
    id: "sub3",
    title: "Vaka Analizi: Liderlik",
    course: "İş Hayatı",
    submittedBy: "Öğrenci #3 (Anonim)",
    submittedAt: "2026-03-23",
    preview:
      "Bu vakada Steve Jobs'un liderlik tarzını inceledik...",
    status: "completed",
    myScore: 85,
  },
];

function defaultReviewState(): ReviewState {
  return {
    score: 70,
    criteria: [false, false, false, false, false],
    feedback: "",
    loading: false,
    error: null,
  };
}

// ─── ReviewPanel ─────────────────────────────────────────────────────────────

function ReviewPanel({
  submission,
  onComplete,
}: {
  submission: Submission;
  onComplete: (id: string, score: number) => void;
}) {
  const t = useI18n();
  const [state, setState] = useState<ReviewState>(defaultReviewState);

  const criteriaBonus = state.criteria.filter(Boolean).length * 5;
  const effectiveScore = Math.min(100, state.score + criteriaBonus);
  const charCount = state.feedback.length;
  const canSubmit = charCount >= 50 && !state.loading;

  const toggleCriterion = (i: number) => {
    setState((prev) => {
      const updated = [...prev.criteria];
      updated[i] = !updated[i];
      return { ...prev, criteria: updated };
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/peer-review/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          submissionId: submission.id,
          score: effectiveScore,
          feedback: state.feedback,
        }),
      });

      if (!res.ok) throw new Error("API hatası");
      onComplete(submission.id, effectiveScore);
    } catch {
      // Demo fallback — mark locally as completed even if API is unavailable
      onComplete(submission.id, effectiveScore);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [canSubmit, submission.id, effectiveScore, state.feedback, onComplete]);

  return (
    <div
      className="animate-fade-slide-up mt-4 rounded-2xl border p-5 space-y-5"
      style={{
        background: "var(--accent-soft)",
        borderColor: "color-mix(in srgb, var(--accent) 30%, var(--line))",
      }}
    >
      {/* Score slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {t.tr("Temel Puan")}
          </span>
          <span
            className="text-lg font-extrabold tabular-nums"
            style={{ color: "var(--accent)" }}
          >
            {state.score}/100
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={state.score}
          onChange={(e) =>
            setState((prev) => ({ ...prev, score: Number(e.target.value) }))
          }
          className="w-full accent-amber-500 cursor-pointer"
          style={{ height: "6px" }}
        />
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {t.tr("Kriter bonusu dahil toplam")}:{" "}
          <span className="font-bold" style={{ color: "var(--accent)" }}>
            {effectiveScore}/100
          </span>
        </div>
      </div>

      {/* Criteria checkboxes */}
      <div className="space-y-2">
        <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {t.tr("Değerlendirme Kriterleri")}{" "}
          <span
            className="text-xs font-normal"
            style={{ color: "var(--muted)" }}
          >
            ({t.tr("her biri +5 puan")})
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRITERIA_LABELS.map((label, i) => (
            <label
              key={i}
              className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2 transition-all"
              style={{
                background: state.criteria[i]
                  ? "color-mix(in srgb, var(--accent) 12%, var(--panel))"
                  : "var(--panel)",
                border: state.criteria[i]
                  ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
                  : "1px solid var(--line)",
              }}
            >
              <input
                type="checkbox"
                checked={state.criteria[i]}
                onChange={() => toggleCriterion(i)}
                className="w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--ink)" }}
              >
                {t.tr(label)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Feedback textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            className="text-sm font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {t.tr("Değerlendirme Yorumu")}
          </label>
          <span
            className="text-xs tabular-nums"
            style={{ color: charCount < 50 ? "#ef4444" : "var(--accent)" }}
          >
            {charCount} / {t.tr("min 50 karakter")}
          </span>
        </div>
        <textarea
          value={state.feedback}
          onChange={(e) =>
            setState((prev) => ({ ...prev, feedback: e.target.value }))
          }
          placeholder={t.tr("Değerlendirme yorumunuz...")}
          rows={4}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        />
        {charCount < 50 && charCount > 0 && (
          <p className="text-xs" style={{ color: "#ef4444" }}>
            {t.tr("En az 50 karakter giriniz")} ({50 - charCount} {t.tr("karakter daha gerekli")}).
          </p>
        )}
      </div>

      {state.error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="btn-link w-full justify-center text-sm font-semibold"
        style={
          canSubmit
            ? {
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                border: "none",
              }
            : {}
        }
      >
        {state.loading ? (
          <>
            <span
              className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent"
              style={{ animation: "spin 0.7s linear infinite" }}
            />
            {t.tr("Gönderiliyor...")}
          </>
        ) : (
          <>{t.tr("Değerlendirmeyi Gönder")} — {effectiveScore} {t.tr("puan")}</>
        )}
      </button>
    </div>
  );
}

// ─── SubmissionCard ───────────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onComplete,
}: {
  submission: Submission;
  onComplete: (id: string, score: number) => void;
}) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const isCompleted = submission.status === "completed";

  return (
    <div
      className="glass p-5 space-y-3 animate-fade-slide-up"
      style={{ opacity: isCompleted ? 0.85 : 1 }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="pill pill-sm"
              style={{ fontSize: "11px" }}
            >
              {submission.course}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {submission.submittedAt}
            </span>
          </div>
          <h3
            className="text-base font-bold leading-tight truncate"
            style={{ color: "var(--ink)" }}
          >
            {submission.title}
          </h3>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {submission.submittedBy}
          </p>
        </div>

        {isCompleted ? (
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold flex-shrink-0"
            style={{
              background: "rgba(16,169,123,0.12)",
              border: "1px solid rgba(16,169,123,0.3)",
              color: "var(--accent)",
            }}
          >
            <span>✓ {t.tr("Değerlendirdiniz")}</span>
            <span
              className="ml-1 font-extrabold"
              style={{ color: "var(--ink)" }}
            >
              — {t.tr("Verdiğiniz puan")}: {submission.myScore}
            </span>
          </div>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-link flex-shrink-0 text-sm font-semibold"
            style={{
              background: open
                ? "var(--accent-soft)"
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: open ? "var(--accent)" : "#fff",
              border: open ? "1px solid color-mix(in srgb, var(--accent) 30%, var(--line))" : "none",
            }}
          >
            {open ? t.tr("Kapat") : t.tr("Değerlendir")}
          </button>
        )}
      </div>

      {/* Preview */}
      <p
        className="text-sm line-clamp-2 leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        {submission.preview}
      </p>

      {/* Inline review panel */}
      {!isCompleted && open && (
        <ReviewPanel submission={submission} onComplete={onComplete} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeerReviewPage() {
  const t = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_REVIEWS);

  const handleComplete = useCallback((id: string, score: number) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "completed", myScore: score } : s
      )
    );
  }, []);

  const completed = submissions.filter((s) => s.status === "completed");
  const totalXp = completed.reduce(
    (acc, s) => acc + Math.round((s.myScore ?? 0) * 0.5),
    0
  );
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((acc, s) => acc + (s.myScore ?? 0), 0) /
            completed.length
        )
      : 0;

  return (
    <div className="page-shell">
      {/* Background */}
      <div className="bg-canvas" aria-hidden />
      <div className="bg-grid" aria-hidden />

      {/* Header nav */}
      <header className="shell-header">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="back-btn">
              ← {t.common.back}
            </Link>
            <div className="sep">/</div>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {t.tr("Akran Değerlendirmesi")}
            </span>
          </div>
          <Link href="/leaderboard" className="pill pill-sm">
            🏠 {t.tr("Ana Sayfa")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="hero glass mt-4 px-8 py-10 animate-fade-slide-up"
        style={{ borderRadius: "var(--r-xl)" }}
      >
        <div className="hero-content space-y-3">
          <div
            className="pill pill-sm inline-flex"
            style={{
              background: "var(--accent-2-soft)",
              borderColor: "color-mix(in srgb, var(--accent-2) 30%, var(--line))",
              color: "var(--accent-2)",
            }}
          >
            {t.tr("👥 Akran Değerlendirmesi")}
          </div>
          <h1
            className="text-3xl font-extrabold"
            style={{ color: "var(--ink)" }}
          >
            {t.peerReview.title}
          </h1>
          <p
            className="text-base max-w-xl leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {t.peerReview.subtitle}
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-3 gap-3 animate-fade-slide-up stagger-1">
        <div className="metric text-center">
          <div className="label">{t.tr("Tamamlanan")}</div>
          <div
            className="value"
            style={{ color: "var(--accent)" }}
          >
            {completed.length}/{submissions.length}
          </div>
        </div>
        <div className="metric text-center">
          <div className="label">{t.tr("Kazanılan XP")}</div>
          <div
            className="value"
            style={{
              color: "var(--accent-2)",
              fontSize: "22px",
            }}
          >
            {totalXp} XP
          </div>
        </div>
        <div className="metric text-center">
          <div className="label">{t.tr("Ort. Verilen Puan")}</div>
          <div
            className="value"
            style={{ color: "var(--accent-3)", fontSize: "22px" }}
          >
            {completed.length > 0 ? `${avgScore}/100` : "—"}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="content-shell mt-4 animate-fade-slide-up stagger-2">
        <h2
          className="text-base font-bold mb-4"
          style={{ color: "var(--ink)" }}
        >
          {t.tr("Nasıl Çalışır?")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Ödeve Bak",
              desc: "Sana atanan öğrenci ödevini incele, içeriği dikkatlice oku.",
              icon: "📄",
              color: "var(--accent-2-soft)",
              accent: "var(--accent-2)",
            },
            {
              step: "2",
              title: "Değerlendir",
              desc: "Kriterlere göre puan ver ve yapıcı geri bildirim yaz.",
              icon: "✏️",
              color: "var(--accent-soft)",
              accent: "var(--accent)",
            },
            {
              step: "3",
              title: "Puan Kazan",
              desc: "Her tamamlanan değerlendirme için XP ve rozet kazan.",
              icon: "🏆",
              color: "rgba(245,158,11,0.1)",
              accent: "var(--accent-3)",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl p-4 space-y-2 border"
              style={{
                background: item.color,
                borderColor: `color-mix(in srgb, ${item.accent} 25%, var(--line))`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold flex-shrink-0"
                  style={{
                    background: item.accent,
                    color: "#fff",
                  }}
                >
                  {item.step}
                </span>
                <span className="text-lg">{item.icon}</span>
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  {t.tr(item.title)}
                </span>
              </div>
              <p
                className="text-xs leading-relaxed pl-10"
                style={{ color: "var(--ink-2)" }}
              >
                {t.tr(item.desc)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Submissions */}
      <section className="mt-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--ink)" }}
          >
            {t.tr("Bekleyen Değerlendirmeler")}
          </h2>
          <span
            className="pill pill-sm"
            style={{
              background:
                completed.length === submissions.length
                  ? "var(--accent-soft)"
                  : "var(--accent-2-soft)",
              color:
                completed.length === submissions.length
                  ? "var(--accent)"
                  : "var(--accent-2)",
            }}
          >
            {completed.length === submissions.length
              ? `✓ ${t.tr("Tümü tamamlandı")}`
              : `${submissions.length - completed.length} ${t.tr("bekliyor")}`}
          </span>
        </div>

        {submissions.map((sub, idx) => (
          <div
            key={sub.id}
            className={`stagger-${Math.min(idx + 1, 5) as 1 | 2 | 3 | 4 | 5}`}
          >
            <SubmissionCard submission={sub} onComplete={handleComplete} />
          </div>
        ))}
      </section>

      {/* Footer spacer */}
      <div className="h-12" />
    </div>
  );
}
