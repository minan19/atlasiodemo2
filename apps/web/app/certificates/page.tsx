"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { api } from "../api/client";
import { useI18n } from "../_i18n/use-i18n";
import { useRole } from "../_components/role-context";

type Certificate = {
  id: string;
  userId: string;
  courseId: string;
  verifyCode: string;
  issuedAt: string;
  expiresAt?: string | null;
  level?: string | null;
  status: string;
  Course?: { title: string } | null;
  User?: { name?: string | null; email: string } | null;
  isDemoMode?: boolean;
};

const DEMO_CERTS: Certificate[] = [
  {
    id: "demo-1",
    userId: "demo",
    courseId: "demo-1",
    verifyCode: "DEMO-ATL-2024-001",
    issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
    level: "GOLD",
    status: "active",
    Course: { title: "İleri Seviye React & Next.js Geliştirme" },
    User: { name: "Demo Kullanıcı", email: "demo@atlasio.dev" },
    isDemoMode: true,
  },
  {
    id: "demo-2",
    userId: "demo",
    courseId: "demo-2",
    verifyCode: "DEMO-ATL-2024-002",
    issuedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: null,
    level: "SILVER",
    status: "active",
    Course: { title: "TypeScript ile Tam Yığın Geliştirme" },
    User: { name: "Demo Kullanıcı", email: "demo@atlasio.dev" },
    isDemoMode: true,
  },
  {
    id: "demo-3",
    userId: "demo",
    courseId: "demo-3",
    verifyCode: "DEMO-ATL-2023-003",
    issuedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    level: "BRONZE",
    status: "expired",
    Course: { title: "Node.js API Tasarımı ve Mikro Servisler" },
    User: { name: "Demo Kullanıcı", email: "demo@atlasio.dev" },
    isDemoMode: true,
  },
];

// ─── Level helpers ──────────────────────────────────────────────────────────

type Level = "GOLD" | "SILVER" | "BRONZE" | string;

function getLevelGradient(level?: Level | null): string {
  switch (level?.toUpperCase()) {
    case "GOLD":
      return "linear-gradient(135deg, #b45309 0%, #d97706 25%, #fbbf24 50%, #f59e0b 75%, #92400e 100%)";
    case "SILVER":
      return "linear-gradient(135deg, #374151 0%, #6b7280 25%, #d1d5db 50%, #9ca3af 75%, #4b5563 100%)";
    case "BRONZE":
      return "linear-gradient(135deg, #7c2d12 0%, #c2410c 25%, #fb923c 50%, #ea580c 75%, #9a3412 100%)";
    default:
      return "linear-gradient(135deg, #1e3a5f 0%, #1e40af 25%, #3b82f6 50%, #2563eb 75%, #1e3a5f 100%)";
  }
}

function getLevelTextColor(level?: Level | null): string {
  switch (level?.toUpperCase()) {
    case "GOLD":   return "#fef3c7";
    case "SILVER": return "#f1f5f9";
    case "BRONZE": return "#fff7ed";
    default:       return "#eff6ff";
  }
}

function getLevelAccent(level?: Level | null): string {
  switch (level?.toUpperCase()) {
    case "GOLD":   return "rgba(251,191,36,0.5)";
    case "SILVER": return "rgba(209,213,219,0.5)";
    case "BRONZE": return "rgba(251,146,60,0.5)";
    default:       return "rgba(59,130,246,0.5)";
  }
}

function getLevelLabel(level?: Level | null): string {
  switch (level?.toUpperCase()) {
    case "GOLD":   return "Altın";
    case "SILVER": return "Gümüş";
    case "BRONZE": return "Bronz";
    default:       return "Standart";
  }
}
// getLevelLabel returns Turkish keys; wrap with t.tr() at render sites

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const t = useI18n();
  if (status === "active") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: "rgba(16,185,129,0.15)",
          border: "1px solid rgba(16,185,129,0.4)",
          color: "#10b981",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
            animation: "statusPulse 2s ease-in-out infinite",
          }}
        />
        {t.tr("Aktif")}
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: "rgba(100,116,139,0.12)",
          border: "1px solid rgba(100,116,139,0.3)",
          color: "#64748b",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#64748b",
          }}
        />
        {t.tr("Süresi Dolmuş")}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.35)",
        color: "#f59e0b",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#f59e0b",
        }}
      />
      {t.tr("Beklemede")}
    </span>
  );
}

// ─── Laurel wreath SVG ───────────────────────────────────────────────────────

function LaurelLeft({ color }: { color: string }) {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}>
      <path d="M22 55 C10 45, 4 30, 8 15 C12 5, 20 2, 22 2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="10" cy="18" rx="5" ry="8" transform="rotate(-30 10 18)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="7" cy="28" rx="5" ry="8" transform="rotate(-15 7 28)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="7" cy="38" rx="5" ry="8" transform="rotate(0 7 38)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="10" cy="47" rx="5" ry="8" transform="rotate(15 10 47)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="16" cy="53" rx="5" ry="7" transform="rotate(30 16 53)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
    </svg>
  );
}

function LaurelRight({ color }: { color: string }) {
  return (
    <svg width="44" height="60" viewBox="0 0 44 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7, transform: "scaleX(-1)" }}>
      <path d="M22 55 C10 45, 4 30, 8 15 C12 5, 20 2, 22 2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="10" cy="18" rx="5" ry="8" transform="rotate(-30 10 18)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="7" cy="28" rx="5" ry="8" transform="rotate(-15 7 28)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="7" cy="38" rx="5" ry="8" transform="rotate(0 7 38)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="10" cy="47" rx="5" ry="8" transform="rotate(15 10 47)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
      <ellipse cx="16" cy="53" rx="5" ry="7" transform="rotate(30 16 53)" fill={color} fillOpacity="0.35" stroke={color} strokeWidth="0.8"/>
    </svg>
  );
}

function SealIcon({ color }: { color: string }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="16" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1"/>
      <path d="M24 10 L26.4 18.2 L34.9 18.2 L28.3 23.3 L30.7 31.5 L24 26.4 L17.3 31.5 L19.7 23.3 L13.1 18.2 L21.6 18.2 Z" fill={color} fillOpacity="0.8"/>
      <circle cx="24" cy="38" r="3" fill={color} fillOpacity="0.6"/>
    </svg>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity: visible ? 1 : 0,
        transition: "all 250ms cubic-bezier(.2,.6,.3,1)",
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--ink)",
        color: "var(--panel)",
        padding: "10px 18px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "var(--shadow-xl)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {message}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function CertSkeleton() {
  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        height: 280,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="skeleton" style={{ height: 160, borderRadius: 0 }} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 16, width: "65%" }} />
        <div className="skeleton" style={{ height: 12, width: "40%" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Certificate card with flip ──────────────────────────────────────────────

function CertCard({ cert, onCopy }: { cert: Certificate; onCopy: (url: string) => void }) {
  const t = useI18n();
  const { language } = useRole();
  const [flipped, setFlipped] = useState(false);

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/certificates/verify?key=${cert.verifyCode}`
      : `/certificates/verify?key=${cert.verifyCode}`;

  const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(verifyUrl)}&title=${encodeURIComponent("ATLASIO Sertifikası")}&summary=${encodeURIComponent(`${cert.Course?.title ?? "Kurs"} sertifikasını aldım!`)}`;

  const gradient = getLevelGradient(cert.level);
  const textColor = getLevelTextColor(cert.level);
  const accentColor = getLevelAccent(cert.level);
  const isExpired = cert.status === "expired";

  return (
    <div
      style={{
        perspective: 1000,
        height: 300,
        cursor: "pointer",
        animation: "fadeSlideUp var(--t-slow) both",
      }}
      onClick={() => setFlipped((f) => !f)}
      title={t.tr("Çevirmek için tıkla")}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.65s cubic-bezier(.4,0,.2,1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRONT ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: isExpired
              ? "var(--shadow-md)"
              : "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
            filter: isExpired ? "saturate(0.35) brightness(0.85)" : undefined,
          }}
        >
          {/* Gradient background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: gradient,
            }}
          />

          {/* Decorative pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 18px, rgba(255,255,255,0.025) 18px, rgba(255,255,255,0.025) 19px)",
            }}
          />

          {/* Border frame */}
          <div
            style={{
              position: "absolute",
              inset: 8,
              border: `1.5px solid ${accentColor}`,
              borderRadius: 14,
              pointerEvents: "none",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "18px 20px 14px",
              color: textColor,
            }}
          >
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    opacity: 0.75,
                  }}
                >
                  ATLASIO &nbsp;·&nbsp; {t.tr("Sertifika")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    opacity: 0.85,
                    textTransform: "uppercase",
                  }}
                >
                  {t.tr(getLevelLabel(cert.level))} {t.tr("Seviye")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {cert.isDemoMode && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      padding: "2px 7px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      opacity: 0.9,
                    }}
                  >
                    Demo
                  </span>
                )}
                <StatusBadge status={cert.status} />
              </div>
            </div>

            {/* Laurel + seal row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                flex: 1,
                marginTop: 4,
              }}
            >
              <LaurelLeft color={textColor} />
              <div style={{ textAlign: "center" }}>
                <SealIcon color={textColor} />
              </div>
              <LaurelRight color={textColor} />
            </div>

            {/* Course title */}
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                marginTop: 2,
                marginBottom: 4,
                textShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {t.tr(cert.Course?.title ?? "Kurs")}
            </div>

            {/* Student name */}
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                opacity: 0.85,
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              {cert.User?.name ?? cert.User?.email ?? t.tr("Öğrenci")}
            </div>

            {/* Bottom row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: `1px solid ${accentColor}`,
                paddingTop: 8,
                gap: 8,
              }}
            >
              <div style={{ fontSize: 10, opacity: 0.75 }}>
                <span style={{ fontWeight: 600 }}>{t.tr("Veriliş")}: </span>
                {new Date(cert.issuedAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              {cert.expiresAt && (
                <div style={{ fontSize: 10, opacity: 0.75 }}>
                  <span style={{ fontWeight: 600 }}>{t.tr("Son")}: </span>
                  {new Date(cert.expiresAt).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}
              <div
                style={{
                  fontSize: 9,
                  opacity: 0.65,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {cert.verifyCode}
              </div>
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 20,
            overflow: "hidden",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-xl)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle gradient top strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: gradient,
            }}
          />

          <div
            style={{
              padding: "20px 20px 16px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {t.tr("Sertifika Doğrulama")}
              </span>
              <button
                onClick={() => setFlipped(false)}
                style={{
                  background: "var(--line-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "3px 10px",
                  fontSize: 11,
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                {t.tr("Geri çevir")}
              </button>
            </div>

            {/* QR placeholder */}
            <div
              style={{
                background: "var(--line-2)",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke="var(--ink)" strokeWidth="2"/>
                  <rect x="5" y="5" width="8" height="8" rx="1" fill="var(--ink)"/>
                  <rect x="24" y="2" width="14" height="14" rx="2" fill="none" stroke="var(--ink)" strokeWidth="2"/>
                  <rect x="27" y="5" width="8" height="8" rx="1" fill="var(--ink)"/>
                  <rect x="2" y="24" width="14" height="14" rx="2" fill="none" stroke="var(--ink)" strokeWidth="2"/>
                  <rect x="5" y="27" width="8" height="8" rx="1" fill="var(--ink)"/>
                  <rect x="24" y="24" width="4" height="4" fill="var(--ink)"/>
                  <rect x="30" y="24" width="4" height="4" fill="var(--ink)"/>
                  <rect x="24" y="30" width="4" height="4" fill="var(--ink)"/>
                  <rect x="30" y="30" width="4" height="4" fill="var(--ink)"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3, fontWeight: 500 }}>
                  {t.tr("Doğrulama Anahtarı")}
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink)",
                    wordBreak: "break-all",
                    background: "var(--panel)",
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                  }}
                >
                  {cert.verifyCode}
                </div>
              </div>
            </div>

            {/* Verify URL */}
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4, fontWeight: 500 }}>
                {t.tr("Doğrulama Linki")}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: "var(--ink-2)",
                  background: "var(--line-2)",
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  wordBreak: "break-all",
                  lineHeight: 1.5,
                }}
              >
                {verifyUrl}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
              <button
                className="btn-link"
                style={{ fontSize: 12, padding: "7px 12px", flex: 1, justifyContent: "center" }}
                onClick={() => onCopy(verifyUrl)}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 4V2.5A1.5 1.5 0 0 0 8.5 1h-6A1.5 1.5 0 0 0 1 2.5v6A1.5 1.5 0 0 0 2.5 10H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {t.tr("Link Kopyala")}
              </button>
              <a
                href={linkedInUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-link"
                style={{ fontSize: 12, padding: "7px 12px", flex: 1, justifyContent: "center" }}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4 5.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <circle cx="4" cy="3.5" r="0.8" fill="currentColor"/>
                  <path d="M7 10V7.5c0-1.1.9-2 2-2s2 .9 2 2V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                LinkedIn
              </a>
              {!cert.isDemoMode && (
                <a
                  // Forward the user's selected UI language so the PDF face is
                  // rendered in the same locale (tr|en|de|ar|ru|kk).
                  href={`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100"}/certifications/${cert.id}/pdf?lang=${encodeURIComponent(language || "tr")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-link"
                  style={{ fontSize: 12, padding: "7px 12px", flex: 1, justifyContent: "center" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M2 12h10M7 2v7m0 0-3-3m3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

function StatsBar({ certs, isDemo }: { certs: Certificate[]; isDemo: boolean }) {
  const t = useI18n();
  const total = certs.length;
  const active = certs.filter((c) => c.status === "active").length;
  const expired = certs.filter((c) => c.status === "expired").length;
  const pending = certs.filter((c) => c.status === "pending").length;

  const stats = [
    { label: t.tr("Toplam Sertifika"), value: total, color: "var(--accent-2)" },
    { label: t.tr("Aktif"), value: active, color: "#10b981" },
    { label: t.tr("Süresi Dolmuş"), value: expired, color: "var(--muted)" },
    { label: t.tr("Beklemede"), value: pending, color: "var(--accent-3)" },
  ];

  return (
    <div
      className="animate-fade-slide-up stagger-1"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="metric"
          style={{ position: "relative", overflow: "hidden" }}
        >
          {isDemo && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)",
              }}
            />
          )}
          <div className="label">{s.label}</div>
          <div className="value" style={{ color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const t = useI18n();
  return (
    <div
      className="animate-scale-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          border: "1.5px solid color-mix(in srgb, var(--accent) 30%, var(--line))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="8" width="28" height="22" rx="3" stroke="var(--accent)" strokeWidth="1.8"/>
          <path d="M11 16h14M11 20h10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="27" cy="27" r="6" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1.5"/>
          <path d="M24.5 27l1.5 1.5 3-3" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          {t.tr("Henüz sertifikan yok")}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.6,
            maxWidth: 320,
          }}
        >
          {t.tr("Bir kursu tamamladığında sertifikan burada belirecek. Çevrimiçi eğitim ile kariyerini ilerlet.")}
        </div>
      </div>
      <Link
        href="/courses"
        className="btn-link"
        style={{ marginTop: 8, paddingLeft: 20, paddingRight: 20 }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6 7.5h3M7.5 6l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {t.tr("Kurslara Göz At")}
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  const t = useI18n();
  const { data: apiCerts, error, isLoading } = useSWR<Certificate[]>(
    "/certifications/me",
    api,
    { revalidateOnFocus: false }
  );

  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const handleCopy = useCallback(
    (url: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast(t.tr("Doğrulama linki kopyalandı!")))
        .catch(() => showToast(t.tr("Kopyalama başarısız.")));
    },
    [showToast]
  );

  const isEmpty = !isLoading && !error && (!apiCerts || apiCerts.length === 0);
  const hasError = !!error;
  const isDemo = isEmpty || hasError;
  const certs: Certificate[] = isDemo ? DEMO_CERTS : (apiCerts ?? []);

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="glass hero rounded-2xl p-6 animate-fade-slide-up">
        <div className="hero-content">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="pill w-fit pill-sm">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3.5 5.5h5M3.5 7.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {t.certificates.title}
              </div>
              <h1
                style={{
                  fontSize: "clamp(22px, 4vw, 32px)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                {t.certificates.title}
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted)", maxWidth: 500, margin: 0, lineHeight: 1.6 }}>
                {t.certificates.subtitle}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/certificates/verify" className="btn-link" style={{ fontSize: 13 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t.tr("Doğrulama Ekranı")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Error notice (non-blocking) */}
      {hasError && (
        <div
          className="animate-fade-in"
          style={{
            borderRadius: 12,
            border: "1px solid rgba(245,158,11,0.35)",
            background: "rgba(245,158,11,0.08)",
            padding: "10px 16px",
            fontSize: 13,
            color: "var(--accent-3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7.5 4.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="7.5" cy="10" r="0.8" fill="currentColor"/>
          </svg>
          {t.tr("Sertifikalar yüklenemedi — demo veriler gösteriliyor.")} ({error?.message ?? t.tr("Bağlantı hatası")})
        </div>
      )}

      {/* Demo notice */}
      {isDemo && !hasError && (
        <div
          className="animate-fade-in"
          style={{
            borderRadius: 12,
            border: "1px dashed rgba(245,158,11,0.4)",
            background: "rgba(245,158,11,0.06)",
            padding: "10px 16px",
            fontSize: 12,
            color: "var(--accent-3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4L7 10 3.4 12l.7-4L1.2 5.2l4-.6z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          </svg>
          {t.tr("Henüz sertifikan yok — örnek görünüm için demo kartlar gösteriliyor.")}
        </div>
      )}

      {/* Stats */}
      {!isLoading && (
        <StatsBar certs={certs} isDemo={isDemo} />
      )}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric">
              <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 26, width: "40%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Cards section */}
      <section className="glass rounded-2xl p-6 animate-fade-slide-up stagger-2">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--ink)",
                letterSpacing: "-0.02em",
              }}
            >
              {isDemo ? t.tr("Örnek Sertifikalar") : t.tr("Sertifikalarım")}
            </div>
            {!isLoading && (
              <span className="pill pill-sm pill-dark">
                {certs.length} {t.tr("adet")}
              </span>
            )}
          </div>
          {!isDemo && certs.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {t.tr("Çevirmek için kartlara tıkla")}
            </div>
          )}
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <CertSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state (no demo fallback needed since we always show demo) */}
        {!isLoading && certs.length === 0 && <EmptyState />}

        {/* Certificate grid */}
        {!isLoading && certs.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {certs.map((cert) => (
              <CertCard key={cert.id} cert={cert} onCopy={handleCopy} />
            ))}
          </div>
        )}
      </section>

      <Toast message={toastMsg} visible={toastVisible} />
    </main>
  );
}
