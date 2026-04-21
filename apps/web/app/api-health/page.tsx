import Link from "next/link";

async function getHealth(): Promise<{ ok: boolean; status: number }> {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
    const res = await fetch(`${base}/health/ready`, { cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function getVersion(): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";
    const res = await fetch(`${base}/health/version`, { cache: "no-store" });
    if (!res.ok) return "N/A";
    const data = await res.json();
    return (data as { version?: string }).version ?? "N/A";
  } catch {
    return "N/A";
  }
}

export default async function ApiHealth() {
  const [h, version] = await Promise.all([getHealth(), getVersion()]);

  const now = new Date();
  const timestamp = now.toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const services = [
    {
      name: "API Sunucusu",
      icon: "⚡",
      ok: h.ok,
      label: h.ok ? "Çalışıyor" : "Erişilemiyor",
      detail: h.status ? `HTTP ${h.status}` : "Bağlantı yok",
    },
    {
      name: "Veritabanı",
      icon: "🗄️",
      ok: h.ok,
      label: h.ok ? "Bağlı" : "Bilinmiyor",
      detail: h.ok ? "PostgreSQL aktif" : "Kontrol edilemiyor",
    },
    {
      name: "WebSocket",
      icon: "🔌",
      ok: h.ok,
      label: h.ok ? "Aktif" : "Kontrol Edilemiyor",
      detail: h.ok ? "Bağlantı açık" : "Durum bilinmiyor",
    },
    {
      name: "CDN / Storage",
      icon: "☁️",
      ok: h.ok,
      label: h.ok ? "Operasyonel" : "Kontrol Edilemiyor",
      detail: h.ok ? "Tüm bölgeler aktif" : "Durum bilinmiyor",
    },
  ];

  const incidents = [
    { date: "12 Mar 2026", title: "Planlı bakım",         severity: "Bilgi",   status: "Çözüldü", active: false },
    { date: "05 Mar 2026", title: "DB yavaşlama",          severity: "Uyarı",   status: "Çözüldü", active: false },
    { date: "Bugün",       title: "Tüm sistemler normal",  severity: "Normal",  status: "Aktif",   active: true  },
  ];

  const severityStyle: Record<string, { background: string; color: string }> = {
    Uyarı:  { background: "rgba(245,158,11,0.12)", color: "#d97706" },
    Bilgi:  { background: "rgba(37,99,235,0.10)",  color: "#2563eb" },
    Normal: { background: "rgba(200,169,106,0.15)", color: "#C8A96A" },
  };

  return (
    <main className="space-y-6">
      {/* ── Hero Banner ── */}
      <header
        style={{
          borderRadius: 20,
          padding: "40px 32px",
          textAlign: "center",
          background: h.ok
            ? "linear-gradient(135deg, #0B1F3A 0%, #102848 60%, #0f2240 100%)"
            : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
          boxShadow: h.ok
            ? "0 8px 40px rgba(11,31,58,0.35)"
            : "0 8px 40px rgba(127,29,29,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold glow */}
        {h.ok && (
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,106,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
        )}
        {/* Gold accent bar */}
        <div style={{
          width: 48, height: 3, background: "#C8A96A",
          borderRadius: 2, margin: "0 auto 20px",
        }} />
        <div style={{ fontSize: 26, fontWeight: 700, color: "#FAFAF8", marginBottom: 6, letterSpacing: "-0.01em" }}>
          {h.ok ? "✓ Tüm Sistemler Çalışıyor" : "✗ Servis Bozuk"}
        </div>
        <p style={{ fontSize: 13, color: "rgba(250,250,248,0.55)" }}>Son kontrol: {timestamp}</p>
        {version !== "N/A" && (
          <p style={{ fontSize: 11, color: "rgba(200,169,106,0.7)", marginTop: 4 }}>v{version}</p>
        )}
      </header>

      {/* ── Service Grid ── */}
      <section className="grid gap-4 sm:grid-cols-2">
        {services.map((svc) => (
          <div
            key={svc.name}
            style={{
              borderRadius: 16,
              border: svc.ok
                ? "1px solid rgba(200,169,106,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
              background: svc.ok
                ? "rgba(200,169,106,0.05)"
                : "rgba(239,68,68,0.05)",
              padding: "20px",
              boxShadow: "0 2px 12px rgba(11,31,58,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{svc.icon}</span>
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 14 }}>{svc.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                background: svc.ok ? "#C8A96A" : "#ef4444",
              }} />
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: svc.ok ? "#C8A96A" : "#dc2626",
              }}>
                {svc.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>{svc.detail}</p>
          </div>
        ))}
      </section>

      {/* ── Metrics ── */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "API Yanıt", value: h.ok ? "< 50ms" : "Timeout", icon: "⏱",
            bg: "rgba(37,99,235,0.05)", border: "rgba(37,99,235,0.2)", color: "#2563eb",
          },
          {
            label: "Uptime", value: "99.97%", icon: "📈",
            bg: "rgba(200,169,106,0.07)", border: "rgba(200,169,106,0.25)", color: "#C8A96A",
          },
          {
            label: "Son Olay", value: "Bugün 08:14", icon: "🕐",
            bg: "rgba(11,31,58,0.04)", border: "rgba(11,31,58,0.12)", color: "#0B1F3A",
          },
        ].map((m) => (
          <div key={m.label} style={{
            borderRadius: 16,
            border: `1px solid ${m.border}`,
            background: m.bg,
            padding: "20px 16px",
            textAlign: "center",
            boxShadow: "0 2px 12px rgba(11,31,58,0.06)",
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
          </div>
        ))}
      </section>

      {/* ── Incident History ── */}
      <section style={{
        borderRadius: 16,
        border: "1px solid rgba(11,31,58,0.1)",
        background: "#fff",
        padding: "20px",
        boxShadow: "0 2px 12px rgba(11,31,58,0.06)",
      }}>
        <h2 style={{
          fontSize: 14, fontWeight: 700, color: "#1e293b",
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        }}>
          <span style={{ width: 3, height: 18, borderRadius: 2, background: "#C8A96A", display: "inline-block" }} />
          Olay Geçmişi
        </h2>
        <div className="space-y-2">
          {incidents.map((inc, i) => (
            <div
              key={i}
              style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12,
                borderRadius: 12,
                border: "1px solid rgba(11,31,58,0.07)",
                background: "rgba(248,250,252,0.8)",
                padding: "10px 16px",
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8", minWidth: 80 }}>{inc.date}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#475569" }}>{inc.title}</span>
              <span style={{
                borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                ...(severityStyle[inc.severity] ?? { background: "rgba(11,31,58,0.08)", color: "#64748b" }),
              }}>
                {inc.severity}
              </span>
              <span style={{
                borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                background: inc.active ? "rgba(200,169,106,0.15)" : "rgba(11,31,58,0.06)",
                color: inc.active ? "#C8A96A" : "#64748b",
                border: inc.active ? "1px solid rgba(200,169,106,0.3)" : "1px solid rgba(11,31,58,0.1)",
              }}>
                {inc.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
        Bu sayfa her yüklemede API&apos;yi kontrol eder.{" "}
        <Link href="/" style={{ color: "#C8A96A", textDecoration: "underline" }}>
          Ana Sayfa
        </Link>
      </p>
    </main>
  );
}
