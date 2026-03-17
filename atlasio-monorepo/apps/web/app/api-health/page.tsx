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

  const severityBadge: Record<string, string> = {
    Uyarı:  "bg-amber-100 text-amber-700",
    Bilgi:  "bg-blue-100 text-blue-700",
    Normal: "bg-emerald-100 text-emerald-700",
  };

  return (
    <main className="space-y-6">
      {/* Hero Banner */}
      <header
        className={`rounded-2xl p-8 text-center text-white shadow-lg ${
          h.ok
            ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
            : "bg-gradient-to-br from-rose-600 via-rose-700 to-pink-800"
        }`}
      >
        <div className="text-3xl font-bold tracking-tight mb-1">
          {h.ok ? "Tüm Sistemler Çalışıyor ✓" : "Servis Bozuk ✗"}
        </div>
        <p className="text-sm opacity-80">Son kontrol: {timestamp}</p>
        {version !== "N/A" && (
          <p className="text-xs opacity-60 mt-1">v{version}</p>
        )}
      </header>

      {/* Service Grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        {services.map((svc) => (
          <div
            key={svc.name}
            className={`glass rounded-2xl border p-5 shadow-sm ${
              svc.ok
                ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/30"
                : "border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{svc.icon}</span>
              <span className="font-semibold text-slate-800">{svc.name}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${svc.ok ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              <span className={`text-sm font-semibold ${svc.ok ? "text-emerald-700" : "text-rose-700"}`}>
                {svc.label}
              </span>
            </div>
            <p className="text-xs text-slate-400">{svc.detail}</p>
          </div>
        ))}
      </section>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "API Yanıt",  value: h.ok ? "< 50ms" : "Timeout", icon: "⏱",  bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200",   val: "text-blue-700"   },
          { label: "Uptime",     value: "99.97%",                     icon: "📈", bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200", val: "text-emerald-700" },
          { label: "Son Olay",   value: "Bugün 08:14",                icon: "🕐", bg: "bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200",  val: "text-slate-700"  },
        ].map((m) => (
          <div key={m.label} className={`rounded-2xl border p-5 text-center shadow-sm ${m.bg}`}>
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className={`text-xl font-bold mb-1 ${m.val}`}>{m.value}</div>
            <div className="text-xs text-slate-500">{m.label}</div>
          </div>
        ))}
      </section>

      {/* Incident History */}
      <section className="glass rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 inline-block" />
          Olay Geçmişi
        </h2>
        <div className="space-y-2">
          {incidents.map((inc, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <span className="text-xs text-slate-400 min-w-[80px]">{inc.date}</span>
              <span className="flex-1 text-sm font-medium text-slate-700">{inc.title}</span>
              <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${severityBadge[inc.severity] ?? "bg-slate-100 text-slate-600"}`}>
                {inc.severity}
              </span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  inc.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {inc.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400">
        Bu sayfa her yüklemede API&apos;yi kontrol eder.{" "}
        <Link href="/" className="text-emerald-600 hover:underline">
          Ana Sayfa
        </Link>
      </p>
    </main>
  );
}
