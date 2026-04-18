"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "../_i18n/use-i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamStatus = "upcoming" | "active" | "completed" | "missed";

type Exam = {
  id: string;
  title: string;
  courseTitle: string;
  status: ExamStatus;
  duration: number;
  questionCount: number;
  scheduledAt: string;
  endsAt?: string;
  score?: number;
  passed?: boolean;
  proctored: boolean;
  adaptive: boolean;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_EXAMS: Exam[] = [
  {
    id: "e1", title: "Python Temelleri Final Sınavı",
    courseTitle: "Python ile Programlamaya Giriş",
    status: "active", duration: 90, questionCount: 40,
    scheduledAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 80).toISOString(),
    proctored: true, adaptive: false,
  },
  {
    id: "e2", title: "Veri Yapıları Adaptif Değerlendirme",
    courseTitle: "Algoritmalar & Veri Yapıları",
    status: "upcoming", duration: 60, questionCount: 30,
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    proctored: false, adaptive: true,
  },
  {
    id: "e3", title: "Web Geliştirme Ara Sınav",
    courseTitle: "Full-Stack Web Geliştirme",
    status: "upcoming", duration: 75, questionCount: 35,
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    proctored: true, adaptive: false,
  },
  {
    id: "e4", title: "Makine Öğrenmesi Final",
    courseTitle: "ML & Derin Öğrenme",
    status: "completed", duration: 120, questionCount: 50,
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    score: 88, passed: true, proctored: true, adaptive: false,
  },
  {
    id: "e5", title: "SQL ve Veritabanı Quiz",
    courseTitle: "Veritabanı Yönetimi",
    status: "completed", duration: 45, questionCount: 20,
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    score: 54, passed: false, proctored: false, adaptive: false,
  },
  {
    id: "e6", title: "Linux Sistem Yönetimi Quiz",
    courseTitle: "DevOps & Cloud",
    status: "missed", duration: 60, questionCount: 25,
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    proctored: false, adaptive: false,
  },
];

const STATS = [
  { label: "Toplam Sınav", value: "6",  icon: "📋", accent: "#60a5fa" },
  { label: "Geçilen",      value: "2",  icon: "✅", accent: "#34d399" },
  { label: "Başarısız",    value: "1",  icon: "❌", accent: "#f87171" },
  { label: "Ort. Puan",    value: "71", icon: "📊", accent: "#a78bfa" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} gün sonra`;
  if (h > 0)  return `${h}s ${m}d sonra`;
  return `${m} dakika sonra`;
}
function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Süre doldu";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}s ${m}d kaldı` : `${m}dk kaldı`;
}

const STATUS_CFG = {
  active:    { label: "Aktif",      accent: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  upcoming:  { label: "Yaklaşıyor", accent: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.3)" },
  completed: { label: "Tamamlandı", accent: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.15)" },
  missed:    { label: "Kaçırıldı",  accent: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
};

type FilterTab = "all" | ExamStatus;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all",       label: "Tümü" },
  { id: "active",    label: "🟢 Aktif" },
  { id: "upcoming",  label: "📅 Yaklaşan" },
  { id: "completed", label: "✅ Tamamlanan" },
  { id: "missed",    label: "❌ Kaçırılan" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent: string }) {
  const t = useI18n();
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 14, padding: "16px 18px",
      display: "flex", alignItems: "center", gap: 14,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>{t.tr(label)}</div>
      </div>
    </div>
  );
}

function ExamCard({ exam }: { exam: Exam }) {
  const t = useI18n();
  const cfg = STATUS_CFG[exam.status];
  const until = exam.status === "upcoming" ? timeUntil(exam.scheduledAt) : null;
  const left  = exam.status === "active" && exam.endsAt ? timeLeft(exam.endsAt) : null;

  return (
    <div style={{
      background: "var(--card)", border: `1.5px solid ${cfg.border}`,
      borderRadius: 16, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 12,
      boxShadow: "var(--shadow-sm)", transition: "box-shadow 0.18s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: cfg.bg, color: cfg.accent, border: `1px solid ${cfg.border}`,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", background: cfg.accent, display: "inline-block",
                animation: exam.status === "active" ? "exam-pulse 1.5s infinite" : "none",
              }} />
              {t.tr(cfg.label)}
            </span>
            {exam.adaptive && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
                {t.tr("✨ Adaptif")}
              </span>
            )}
            {exam.proctored && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(251,191,36,0.12)", color: "#f59e0b", border: "1px solid rgba(251,191,36,0.25)" }}>
                {t.tr("🛡 Gözetimli")}
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{exam.title}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{exam.courseTitle}</div>
        </div>

        {/* Score badge */}
        {exam.status === "completed" && exam.score !== undefined && (
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: exam.passed ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
            border: `1px solid ${exam.passed ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: exam.passed ? "#34d399" : "#f87171", lineHeight: 1 }}>
              {exam.score}
            </div>
            <div style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>{t.tr("PUAN")}</div>
          </div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { icon: "⏱", text: `${exam.duration} ${t.tr("dk")}` },
          { icon: "❓", text: `${exam.questionCount} ${t.tr("soru")}` },
          { icon: "📅", text: formatDate(exam.scheduledAt) },
        ].map((m, i) => (
          <span key={i} style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            {m.icon} {m.text}
          </span>
        ))}
        {until && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", display: "flex", alignItems: "center", gap: 4 }}>
            🕐 {t.tr(until)}
          </span>
        )}
        {left && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
            ⏳ {t.tr(left)}
          </span>
        )}
      </div>

      {/* Action */}
      <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
        {exam.status === "active" && (
          <Link href={exam.adaptive ? "/exams/adaptive" : `/exams/${exam.id}`}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, textAlign: "center",
              background: "linear-gradient(135deg, #34d399, #10b981)", color: "#fff",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 16px rgba(52,211,153,0.3)",
            }}>
            {t.tr("🚀 Sınava Gir")}
          </Link>
        )}
        {exam.status === "upcoming" && (
          <button disabled style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
            color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "not-allowed",
          }}>
            {t.tr("📅 Henüz Başlamadı")}
          </button>
        )}
        {exam.status === "completed" && (
          <Link href="/exams/results"
            style={{
              padding: "9px 20px", borderRadius: 10,
              background: "var(--surface)", border: "1px solid var(--line)",
              color: "var(--ink-2)", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}>
            {t.tr("📊 Sonuçlar")}
          </Link>
        )}
        {exam.status === "missed" && (
          <span style={{ fontSize: 12, color: "#f87171", padding: "10px 0", fontWeight: 600, opacity: 0.7 }}>
            {t.tr("Bu sınav kaçırıldı")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const t = useI18n();
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = filter === "all"
    ? DEMO_EXAMS
    : DEMO_EXAMS.filter(e => e.status === filter);

  const activeCount = DEMO_EXAMS.filter(e => e.status === "active").length;

  return (
    <div>
      <style>{`@keyframes exam-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--accent)", textTransform: "uppercase" }}>
            📋 {t.exams.title}
          </span>
          {activeCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
              background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
              {activeCount} {t.tr("Aktif")}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", margin: "0 0 6px" }}>
          {t.exams.title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          {t.exams.subtitle}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
        {STATS.map(s => <StatCard key={t.tr(s.label)} {...s} />)}
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        <Link href="/exams/adaptive"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 12,
            background: "var(--accent-2-soft)", border: "1px solid var(--line-accent)",
            color: "var(--accent-2)", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
          {t.tr("✨ Adaptif Sınava Başla")}
        </Link>
        <Link href="/exams/results"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 12,
            background: "var(--surface)", border: "1px solid var(--line)",
            color: "var(--ink-2)", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
          {t.tr("📊 Tüm Sonuçlar")}
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(tab => {
          const count = tab.id === "all" ? DEMO_EXAMS.length : DEMO_EXAMS.filter(e => e.status === tab.id).length;
          const active = filter === tab.id;
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
              padding: "7px 14px", borderRadius: 99, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              background: active ? "var(--accent-soft)" : "var(--surface)",
              color: active ? "var(--accent)" : "var(--muted)",
              boxShadow: active
                ? "inset 0 0 0 1px rgba(0,180,216,0.35)"
                : "inset 0 0 0 1px var(--line)",
            }}>
              {t.tr(tab.label)} <span style={{ opacity: 0.6, fontSize: 10 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t.tr("Bu kategoride sınav yok")}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(exam => <ExamCard key={exam.id} exam={exam} />)}
        </div>
      )}
    </div>
  );
}
