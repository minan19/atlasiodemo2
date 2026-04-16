"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CertStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "PERMANENT";

type Certificate = {
  id: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  expiresAt?: string | null;
  status: string;
  verifyCode: string;
  User?: { name?: string; email: string };
  Course?: { title: string };
};

type FilterTab = "Tümü" | "30 Gün İçinde" | "Süresi Dolmuş" | "Aktif";

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_CERTS: Certificate[] = [
  {
    id: "c1",
    userId: "u1",
    courseId: "co1",
    issuedAt: "2025-03-01",
    expiresAt: "2026-03-15",
    status: "EXPIRED",
    verifyCode: "ATL-001",
    User: { name: "Ahmet Yılmaz", email: "ahmet@test.com" },
    Course: { title: "Temel Matematik" },
  },
  {
    id: "c2",
    userId: "u2",
    courseId: "co2",
    issuedAt: "2025-06-01",
    expiresAt: "2026-04-10",
    status: "ACTIVE",
    verifyCode: "ATL-002",
    User: { name: "Fatma Kaya", email: "fatma@test.com" },
    Course: { title: "İngilizce B2" },
  },
  {
    id: "c3",
    userId: "u3",
    courseId: "co3",
    issuedAt: "2025-09-01",
    expiresAt: "2026-04-20",
    status: "ACTIVE",
    verifyCode: "ATL-003",
    User: { name: "Mehmet Demir", email: "mehmet@test.com" },
    Course: { title: "Fizik 101" },
  },
  {
    id: "c4",
    userId: "u4",
    courseId: "co4",
    issuedAt: "2026-01-01",
    expiresAt: null,
    status: "ACTIVE",
    verifyCode: "ATL-004",
    User: { name: "Zeynep Arslan", email: "zeynep@test.com" },
    Course: { title: "Python Programlama" },
  },
  {
    id: "c5",
    userId: "u5",
    courseId: "co5",
    issuedAt: "2025-12-01",
    expiresAt: "2026-03-28",
    status: "ACTIVE",
    verifyCode: "ATL-005",
    User: { name: "Ali Çelik", email: "ali@test.com" },
    Course: { title: "Veri Analizi" },
  },
  {
    id: "c6",
    userId: "u6",
    courseId: "co6",
    issuedAt: "2024-03-01",
    expiresAt: "2025-03-01",
    status: "EXPIRED",
    verifyCode: "ATL-006",
    User: { name: "Selin Yıldız", email: "selin@test.com" },
    Course: { title: "Muhasebe Temelleri" },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-03-27");

function computeStatus(cert: Certificate): CertStatus {
  if (!cert.expiresAt) return "PERMANENT";

  const expires = new Date(cert.expiresAt);
  if (expires <= TODAY) return "EXPIRED";

  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  if (expires.getTime() - TODAY.getTime() <= msIn30Days) return "EXPIRING_SOON";

  return "ACTIVE";
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function daysUntilExpiry(expiresAt: string): number {
  const expires = new Date(expiresAt);
  return Math.ceil((expires.getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000));
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CertStatus,
  { label: string; bg: string; border: string; color: string; dot: string }
> = {
  ACTIVE: {
    label: "Aktif",
    bg: "rgba(16,169,123,0.10)",
    border: "rgba(16,169,123,0.35)",
    color: "#10a97b",
    dot: "#10a97b",
  },
  EXPIRING_SOON: {
    label: "30 gün içinde",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.35)",
    color: "#d97706",
    dot: "#f59e0b",
  },
  EXPIRED: {
    label: "Süresi doldu",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
    color: "#dc2626",
    dot: "#ef4444",
  },
  PERMANENT: {
    label: "Süresiz",
    bg: "rgba(100,116,139,0.10)",
    border: "rgba(100,116,139,0.25)",
    color: "#64748b",
    dot: "#94a3b8",
  },
};

function StatusBadge({ status }: { status: CertStatus }) {
  const t = useI18n();
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.dot }}
      />
      {t.tr(cfg.label)}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificateRenewalPage() {
  const t = useI18n();
  const [certs, setCerts] = useState<Certificate[]>(DEMO_CERTS);
  const [activeTab, setActiveTab] = useState<FilterTab>("Tümü");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Computed statuses
  const withStatus = useMemo(
    () => certs.map((c) => ({ ...c, computed: computeStatus(c) })),
    [certs]
  );

  // Stats
  const stats = useMemo(() => {
    const total = withStatus.length;
    const expiringSoon = withStatus.filter((c) => c.computed === "EXPIRING_SOON").length;
    const expired = withStatus.filter((c) => c.computed === "EXPIRED").length;
    const active = withStatus.filter((c) => c.computed === "ACTIVE").length;
    return { total, expiringSoon, expired, active };
  }, [withStatus]);

  // Filtered list
  const filtered = useMemo(() => {
    switch (activeTab) {
      case "30 Gün İçinde":
        return withStatus.filter((c) => c.computed === "EXPIRING_SOON");
      case "Süresi Dolmuş":
        return withStatus.filter((c) => c.computed === "EXPIRED");
      case "Aktif":
        return withStatus.filter(
          (c) => c.computed === "ACTIVE" || c.computed === "PERMANENT"
        );
      default:
        return withStatus;
    }
  }, [withStatus, activeTab]);

  // Mark single cert as expired
  const handleMarkExpired = async (id: string) => {
    setMarkingId(id);
    try {
      const token = getToken();
      await fetch(`${API_BASE}/certifications/mark-expired`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ certificationIds: [id] }),
      });
    } catch {
      // demo fallback
    } finally {
      setCerts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "EXPIRED" } : c))
      );
      setMarkingId(null);
    }
  };

  // Bulk mark expired
  const handleBulkUpdate = async () => {
    setBulkLoading(true);
    setBulkSuccess(false);
    const expiredIds = withStatus
      .filter((c) => c.computed === "EXPIRED")
      .map((c) => c.id);

    try {
      const token = getToken();
      await fetch(`${API_BASE}/certifications/mark-expired`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ certificationIds: expiredIds }),
      });
    } catch {
      // demo fallback — just flip locally
    } finally {
      setCerts((prev) =>
        prev.map((c) =>
          expiredIds.includes(c.id) ? { ...c, status: "EXPIRED" } : c
        )
      );
      setBulkLoading(false);
      setBulkSuccess(true);
      setTimeout(() => setBulkSuccess(false), 3000);
    }
  };

  const TABS: FilterTab[] = ["Tümü", "30 Gün İçinde", "Süresi Dolmuş", "Aktif"];

  return (
    <div className="page-shell">
      {/* Background */}
      <div className="bg-canvas" aria-hidden />
      <div className="bg-grid" aria-hidden />

      {/* Header nav */}
      <header className="shell-header">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="back-btn">
              ← {t.common.back}
            </Link>
            <div className="sep">/</div>
            <Link href="/certificates" className="back-btn">
              {t.tr("Sertifikalar")}
            </Link>
            <div className="sep">/</div>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {t.tr("Yenileme Takibi")}
            </span>
          </div>
          <span
            className="pill pill-sm"
            style={{
              background: "var(--accent-2-soft)",
              borderColor:
                "color-mix(in srgb, var(--accent-2) 30%, var(--line))",
              color: "var(--accent-2)",
            }}
          >
            {t.tr("🛡️ Yönetici Paneli")}
          </span>
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
              background: "rgba(239,68,68,0.08)",
              borderColor: "rgba(239,68,68,0.25)",
              color: "#dc2626",
            }}
          >
            {t.tr("📋 Sertifika Yönetimi")}
          </div>
          <h1
            className="text-3xl font-extrabold"
            style={{ color: "var(--ink)" }}
          >
            {t.certificates.title} — {t.certificates.renewBtn}
          </h1>
          <p
            className="text-base max-w-xl leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {t.certificates.subtitle}
          </p>
        </div>
      </section>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-slide-up stagger-1">
        {[
          {
            label: "Toplam",
            value: stats.total,
            color: "var(--accent-2)",
            icon: "📜",
          },
          {
            label: "30 Günde Dolacak",
            value: stats.expiringSoon,
            color: "#d97706",
            icon: "⚠️",
          },
          {
            label: "Süresi Dolmuş",
            value: stats.expired,
            color: "#dc2626",
            icon: "❌",
          },
          {
            label: "Aktif",
            value: stats.active,
            color: "var(--accent)",
            icon: "✅",
          },
        ].map((s) => (
          <div key={t.tr(s.label)} className="metric text-center">
            <div className="label flex items-center justify-center gap-1">
              <span>{s.icon}</span>
              {t.tr(s.label)}
            </div>
            <div className="value" style={{ color: s.color, fontSize: "28px" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Content shell */}
      <div className="content-shell mt-4 animate-fade-slide-up stagger-2 space-y-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Filter tabs */}
          <div
            className="flex gap-1 p-1 rounded-2xl flex-wrap"
            style={{
              background: "var(--line-2)",
              border: "1px solid var(--line)",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background:
                    activeTab === tab ? "var(--panel)" : "transparent",
                  color: activeTab === tab ? "var(--ink)" : "var(--muted)",
                  boxShadow:
                    activeTab === tab ? "var(--shadow-sm)" : "none",
                }}
              >
                {t.tr(tab)}
                {tab === "30 Gün İçinde" && stats.expiringSoon > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                    style={{ background: "#f59e0b", color: "#fff" }}
                  >
                    {stats.expiringSoon}
                  </span>
                )}
                {tab === "Süresi Dolmuş" && stats.expired > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}
                  >
                    {stats.expired}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk update */}
          <button
            onClick={handleBulkUpdate}
            disabled={bulkLoading || stats.expired === 0}
            className="btn-link text-sm font-semibold"
            style={
              bulkSuccess
                ? {
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--line))",
                  }
                : stats.expired > 0 && !bulkLoading
                ? {
                    background: "rgba(239,68,68,0.08)",
                    color: "#dc2626",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }
                : {}
            }
          >
            {bulkLoading ? (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
                {t.tr("Güncelleniyor...")}
              </>
            ) : bulkSuccess ? (
              `✓ ${t.tr("Güncellendi")}`
            ) : (
              `${t.tr("Toplu Güncelle")} (${stats.expired} ${t.tr("süresi dolmuş")})`
            )}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--line)" }}>
          <table className="w-full min-w-[700px] text-sm border-collapse">
            <thead>
              <tr
                style={{
                  background: "var(--line-2)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                {[
                  "Öğrenci",
                  "Kurs",
                  "Verilme Tarihi",
                  "Son Geçerlilik",
                  "Durum",
                  "İşlem",
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    {t.tr(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm"
                    style={{ color: "var(--muted)" }}
                  >
                    {t.tr("Bu filtrede kayıt bulunamadı.")}
                  </td>
                </tr>
              ) : (
                filtered.map((cert, idx) => {
                  const computedStatus = cert.computed;
                  const isExpiringSoon = computedStatus === "EXPIRING_SOON";
                  const isMarkingThis = markingId === cert.id;

                  return (
                    <tr
                      key={cert.id}
                      className="transition-colors"
                      style={{
                        background:
                          idx % 2 === 0 ? "var(--panel)" : "var(--line-2)",
                        borderBottom: "1px solid var(--line)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          "color-mix(in srgb, var(--accent-2-soft) 60%, var(--panel))";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          idx % 2 === 0 ? "var(--panel)" : "var(--line-2)";
                      }}
                    >
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div
                          className="font-semibold"
                          style={{ color: "var(--ink)" }}
                        >
                          {cert.User?.name ?? "—"}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {cert.User?.email}
                        </div>
                        <div
                          className="text-[10px] font-mono mt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {cert.verifyCode}
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-4 py-3">
                        <span
                          className="font-medium"
                          style={{ color: "var(--ink-2)" }}
                        >
                          {cert.Course?.title ?? "—"}
                        </span>
                      </td>

                      {/* Issued */}
                      <td
                        className="px-4 py-3 tabular-nums"
                        style={{ color: "var(--ink-2)" }}
                      >
                        {formatDate(cert.issuedAt)}
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        {cert.expiresAt ? (
                          <div>
                            <span
                              className="tabular-nums"
                              style={{
                                color:
                                  computedStatus === "EXPIRED"
                                    ? "#dc2626"
                                    : computedStatus === "EXPIRING_SOON"
                                    ? "#d97706"
                                    : "var(--ink-2)",
                                fontWeight:
                                  computedStatus !== "ACTIVE" ? 600 : 400,
                              }}
                            >
                              {formatDate(cert.expiresAt)}
                            </span>
                            {computedStatus === "EXPIRING_SOON" && (
                              <div
                                className="text-xs mt-0.5 font-semibold"
                                style={{ color: "#d97706" }}
                              >
                                {daysUntilExpiry(cert.expiresAt)} {t.tr("gün kaldı")}
                              </div>
                            )}
                            {computedStatus === "EXPIRED" && (
                              <div
                                className="text-xs mt-0.5 font-semibold"
                                style={{ color: "#dc2626" }}
                              >
                                {Math.abs(daysUntilExpiry(cert.expiresAt))} {t.tr("gün önce doldu")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span
                            className="text-xs font-medium"
                            style={{ color: "var(--muted)" }}
                          >
                            {t.tr("Süresiz")}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={computedStatus} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        {isExpiringSoon ? (
                          <button
                            onClick={() => handleMarkExpired(cert.id)}
                            disabled={isMarkingThis}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              border: "1px solid rgba(239,68,68,0.3)",
                              color: "#dc2626",
                              cursor: isMarkingThis ? "wait" : "pointer",
                              opacity: isMarkingThis ? 0.6 : 1,
                            }}
                          >
                            {isMarkingThis ? (
                              <>
                                <span
                                  className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent"
                                  style={{
                                    animation: "spin 0.7s linear infinite",
                                  }}
                                />
                                {t.tr("İşleniyor")}
                              </>
                            ) : (
                              <>{t.tr("✕ Süresi Doldu İşaretle")}</>
                            )}
                          </button>
                        ) : computedStatus === "EXPIRED" ? (
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            {t.tr("Süresi dolmuş")}
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div
          className="flex items-center justify-between flex-wrap gap-2 pt-1"
          style={{ color: "var(--muted)" }}
        >
          <span className="text-xs">
            {filtered.length} {t.tr("kayıt gösteriliyor")} ({t.tr("toplam")} {withStatus.length})
          </span>
          <span className="text-xs">
            {t.tr("Son güncelleme")}:{" "}
            {TODAY.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-12" />
    </div>
  );
}
