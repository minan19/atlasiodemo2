"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from '../../_i18n/use-i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyResult = {
  valid: boolean;
  status: string;
  holder: string;
  course: string;
  issuedAt: string;
  expiresAt?: string | null;
};

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 20px",
        borderRadius: 9999,
        background: "color-mix(in srgb, var(--panel) 70%, transparent)",
        border: "1px solid color-mix(in srgb, var(--line) 80%, transparent)",
        backdropFilter: "blur(8px)",
        gap: 2,
        minWidth: 100,
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

// ─── How it works step card ───────────────────────────────────────────────────

function StepCard({
  number,
  icon,
  title,
  description,
  delay,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div
      className="glass"
      style={{
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        alignItems: "flex-start",
        animation: `fadeSlideUp var(--t-slow) ${delay} both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background accent */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Number badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          color: "#fff",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      {/* Icon */}
      <div style={{ fontSize: 32, lineHeight: 1 }}>{icon}</div>
      {/* Text */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.55,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function Spinner({ dark = false }: { dark?: boolean }) {
  const track = dark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.35)";
  const arc   = dark ? "rgba(0,0,0,0.75)" : "#fff";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ animation: "spin 0.75s linear infinite", flexShrink: 0 }}
    >
      <circle cx="9" cy="9" r="7" stroke={track} strokeWidth="2" />
      <path
        d="M9 2a7 7 0 0 1 7 7"
        stroke={arc}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function VerifyContent() {
  const t = useI18n();
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string>(searchParams.get("key") ?? "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  async function doVerify(verifyKey: string): Promise<void> {
    if (!verifyKey.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
      const res = await fetch(
        `${base}/certifications/verify?key=${encodeURIComponent(verifyKey.trim())}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { message?: string })?.message ??
            "Sertifika bulunamadı veya geçersiz anahtar."
        );
        return;
      }
      const data = (await res.json()) as VerifyResult;
      setResult(data);
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey) {
      setKey(urlKey);
      doVerify(urlKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCopyLink(): void {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/certificates/verify?key=${encodeURIComponent(key.trim())}`
        : `/certificates/verify?key=${encodeURIComponent(key.trim())}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  const verifyKey = result && key.trim() ? key.trim() : "";
  const pdfHref = verifyKey
    ? `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100"}/certifications/verify-pdf?key=${encodeURIComponent(verifyKey)}`
    : "#";

  return (
    <main className="space-y-8">
      {/* ── Hero header ── */}
      <header
        className="glass hero rounded-2xl animate-fade-slide-up"
        style={{ padding: "40px 40px 36px" }}
      >
        <div className="hero-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Badge */}
          <div
            className="pill w-fit"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent-2) 14%, transparent))",
              border:
                "1px solid color-mix(in srgb, var(--accent) 35%, var(--line))",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.02em",
            }}
          >
            {t.tr("🔐 Güvenli Sorgu")}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(26px, 5vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              margin: 0,
              background:
                "linear-gradient(135deg, var(--ink) 0%, var(--accent) 50%, var(--accent-2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t.certificates.verifyTitle}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              maxWidth: 520,
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            {t.certificates.verifyDesc}
          </p>

          {/* Stat chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
            <StatChip label="Verilen Sertifika" value="2.4K+" />
            <StatChip label={t.tr("Doğrulama Oranı")} value="99.8%" />
            <StatChip label={t.tr("Ortalama Süre")} value="<1s" />
          </div>
        </div>
      </header>

      {/* ── Search form ── */}
      <section
        className="glass rounded-2xl animate-fade-slide-up stagger-1"
        style={{ padding: "32px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Label */}
          <label
            htmlFor="verify-key-input"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            {t.tr("Sertifika Anahtarı veya QR Kodu")}
          </label>

          {/* Input wrapper */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            {/* Prefix icon */}
            <span
              style={{
                position: "absolute",
                left: 16,
                fontSize: 18,
                lineHeight: 1,
                pointerEvents: "none",
                zIndex: 1,
                filter: "grayscale(0.2)",
              }}
            >
              🔍
            </span>
            <input
              id="verify-key-input"
              className="rounded-xl"
              style={{
                flex: 1,
                padding: "14px 18px 14px 50px",
                fontSize: 14,
                border: "1.5px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink)",
                outline: "none",
                transition:
                  "border-color var(--t-fast), box-shadow var(--t-fast)",
                borderRadius: 12,
                width: "100%",
              }}
              placeholder={t.certificates.verifyPh}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doVerify(key)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#34d399";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(52,211,153,0.15)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--line)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={() => doVerify(key)}
            disabled={loading || !key.trim()}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              borderRadius: 12,
              background: loading
                ? "var(--panel)"
                : "linear-gradient(135deg, #10b981, #06b6d4)",
              border: loading ? "1.5px solid var(--line)" : "none",
              color: loading ? "var(--ink-2)" : "#fff",
              opacity: !key.trim() ? 0.55 : 1,
              cursor: !key.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Spinner dark />
                {t.common.loading}
              </span>
            ) : (
              t.certificates.verifySubmit
            )}
          </button>
        </div>
      </section>

      {/* ── Valid result ── */}
      {result && result.valid && (
        <section
          className="glass animate-scale-in"
          style={{
            borderRadius: 20,
            padding: 0,
            overflow: "hidden",
            border: "1.5px solid rgba(52,211,153,0.4)",
            boxShadow:
              "0 0 24px 2px rgba(52,211,153,0.15), var(--shadow-lg)",
          }}
        >
          {/* Top status row */}
          <div
            style={{
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderBottom: "1px solid rgba(52,211,153,0.18)",
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))",
            }}
          >
            <span style={{ fontSize: 32 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 14px",
                  borderRadius: 9999,
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {/* Pulsing dot */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                    animation: "statusPulse 2s ease-in-out infinite",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#10b981",
                    letterSpacing: "0.01em",
                  }}
                >
                  {t.tr("Geçerli Sertifika")}
                </span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                {t.tr("Bu sertifika ATLASIO sistemi tarafından doğrulandı.")}
              </p>
            </div>
          </div>

          {/* Certificate card interior */}
          <div style={{ padding: "28px" }}>
            {/* Gradient banner */}
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                background:
                  "linear-gradient(135deg, #059669 0%, #0891b2 100%)",
                padding: "28px 24px",
                marginBottom: 24,
                position: "relative",
              }}
            >
              {/* Decorative circles */}
              <div
                style={{
                  position: "absolute",
                  top: -30,
                  right: -30,
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: 20,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 48, lineHeight: 1 }}>🎖️</span>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {result.holder}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.82)",
                    fontWeight: 500,
                    maxWidth: 360,
                    lineHeight: 1.5,
                  }}
                >
                  {result.course}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                {
                  label: "Veriliş Tarihi",
                  value: new Date(result.issuedAt).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                },
                {
                  label: "Geçerlilik",
                  value: result.expiresAt
                    ? new Date(result.expiresAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Süresiz",
                },
                {
                  label: "Durum",
                  value: result.status === "active" ? "Aktif" : result.status,
                },
                {
                  label: "Sertifika ID",
                  value:
                    key.trim().length > 20
                      ? `${key.trim().slice(0, 18)}…`
                      : key.trim(),
                },
              ].map((item) => (
                <div
                  key={t.tr(item.label)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "var(--line-2)",
                    border: "1px solid var(--line)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}
                  >
                    {t.tr(item.label)}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink)",
                      letterSpacing: "-0.01em",
                      wordBreak: "break-all",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn-link"
                onClick={handleCopyLink}
                style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
              >
                {copied ? "✅ Kopyalandı!" : "🔗 Bağlantıyı Kopyala"}
              </button>
              <a
                href={pdfHref}
                target="_blank"
                rel="noreferrer"
                className="btn-link"
                style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
              >
                {t.tr("⬇️ PDF İndir")}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Invalid result ── */}
      {result && !result.valid && (
        <section
          className="animate-scale-in"
          style={{
            borderRadius: 16,
            padding: "28px",
            border: "1.5px solid rgba(245,158,11,0.45)",
            background:
              "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(251,191,36,0.04))",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#92400e",
                  marginBottom: 4,
                  letterSpacing: "-0.02em",
                }}
              >
                Sertifika Durumu: {result.status}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
                Bu sertifika geçerli değil veya süresi dolmuş olabilir. Lütfen
                anahtar kodunu kontrol edin.
              </p>
            </div>
          </div>
          <button
            className="btn-link"
            style={{ alignSelf: "flex-start" }}
            onClick={() => {
              setResult(null);
              setKey("");
            }}
          >
            ← Yeni Sorgu
          </button>
        </section>
      )}

      {/* ── Error state ── */}
      {error && (
        <section
          className="glass animate-scale-in"
          style={{
            borderRadius: 16,
            padding: "28px",
            border: "1.5px solid rgba(239,68,68,0.35)",
            background:
              "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(244,63,94,0.04))",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 28, flexShrink: 0 }}>❌</span>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#9f1239",
                marginBottom: 4,
                letterSpacing: "-0.02em",
              }}
            >
              {t.tr("Doğrulama Başarısız")}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
              {error}
            </p>
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {t.tr("Nasıl Çalışır?")}
          </h2>
          <div
            className="pill pill-sm pill-dark"
            style={{ fontSize: 11 }}
          >
            {t.tr("3 adım")}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <StepCard
            number="1"
            icon="🔑"
            title={t.tr("Anahtarı Girin")}
            description={t.tr("Sertifika üzerindeki QR kodu tarayın veya doğrulama anahtarını alana yapıştırın.")}
            delay="0ms"
          />
          <StepCard
            number="2"
            icon="⚡"
            title={t.tr("Sistem Doğrular")}
            description={t.tr("ATLASIO güvenli veritabanında anahtar gerçek zamanlı olarak sorgulanır.")}
            delay="60ms"
          />
          <StepCard
            number="3"
            icon="✅"
            title={t.tr("Sonuç Anında")}
            description={t.tr("Saniyeden kısa sürede sertifikanın geçerlilik durumu ve detayları görüntülenir.")}
            delay="120ms"
          />
        </div>
      </section>
    </main>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function CertificateVerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
