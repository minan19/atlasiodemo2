import Link from "next/link";

// ─── Data Constants ────────────────────────────────────────────────────────────

const heroMetrics = [
  { label: "Aktif Öğrenci", value: "12.4K", hint: "+8% bu ay" },
  { label: "Tamamlanan Ders", value: "183K", hint: "Otomatik sertifika" },
  { label: "Canlı Oturum SLA", value: "99.97%", hint: "Global CDN + TURN" },
  { label: "AI Öneri Puanı", value: "4.8/5", hint: "Kişiselleştirilmiş yollar" },
];

const stats = [
  { value: "124K+", label: "Aktif Öğrenci", hint: "42 Ülkede" },
  { value: "310K", label: "Canlı Ders/ay", hint: "99.97% SLA" },
  { value: "1.2M", label: "Sertifika", hint: "QR Doğrulama" },
  { value: "4.8/5", label: "AI Puanı", hint: "Kişiselleştirilmiş" },
];

const features = [
  { icon: "🎓", title: "Canlı & Kayıtlı Dersler", desc: "Tek tıkla derse katıl veya dilediğin zaman tekrar izle." },
  { icon: "🧠", title: "Akıllı Tahta", desc: "30+ araç: kalem, şekil, lazer ve AI destekli çizim." },
  { icon: "🤖", title: "AI Ghost-Mentor", desc: "Kişiselleştirilmiş öneriler ve otomatik konu özetleri." },
  { icon: "🏅", title: "Sertifika & Rozet", desc: "QR doğrulama ve LinkedIn paylaşımı hazır belgeler." },
  { icon: "📊", title: "Detaylı Raporlar", desc: "Katılım takibi, gelişim özetleri ve anlık dashboardlar." },
  { icon: "🔒", title: "Kurumsal Güvenlik", desc: "SSO, RBAC ve uçtan uca şifrelenmiş veri akışı." },
  { icon: "📱", title: "Tüm Cihazlarda", desc: "Masaüstü, tablet ve mobilde kusursuz deneyim." },
  { icon: "🌍", title: "Çoklu Dil", desc: "TR / EN / DE / AR arayüz ve içerik desteği." },
];

const whiteboardFeatures = [
  "30+ araç (kalem, şekil, lazer, AI kalem)",
  "El kaldırma & soru kuyruğu",
  "Canlı anket & geri sayım",
  "PDF ve sunum yansıtma",
  "Odak modu (kenar paneller gizlenir)",
  "Hesap makinesi & formül tahtası",
];

const testimonials = [
  {
    quote: "Öğrencilerimin devam oranı %87'ye çıktı. Canlı tahta ve anketler sayesinde ders dinamizmi inanılmaz arttı.",
    name: "Ahmet Y.",
    role: "Matematik Öğretmeni, İstanbul",
    initials: "AY",
  },
  {
    quote: "Sertifika sistemi LinkedIn profilime muhteşem göründü. QR doğrulama işverenlerimi gerçekten etkiledi.",
    name: "Fatma K.",
    role: "Öğrenci, Ankara",
    initials: "FK",
  },
  {
    quote: "Kurumsal entegrasyon 1 haftada tamamlandı. SSO ve raporlama ihtiyaçlarımızı eksiksiz karşıladı.",
    name: "Mehmet A.",
    role: "Eğitim Müdürü",
    initials: "MA",
  },
];

const pricingTiers = [
  {
    name: "Ücretsiz",
    price: "₺0",
    period: "/ay",
    description: "Başlamak için mükemmel",
    features: ["2 kurs erişimi", "5 canlı ders/ay", "Temel raporlar", "Topluluk desteği"],
    missing: ["Sertifika yok", "Whiteboard yok", "AI Mentor yok"],
    cta: "Başla",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₺199",
    period: "/ay",
    description: "Bireysel öğrenci ve eğitmenler için",
    features: ["Sınırsız kurs", "Sınırsız canlı ders", "Akıllı Whiteboard", "AI Ghost-Mentor", "Sertifika & Rozet", "Detaylı raporlar", "Öncelikli destek"],
    missing: [],
    cta: "Pro'ya Geç",
    href: "/register?plan=pro",
    highlighted: true,
  },
  {
    name: "Kurumsal",
    price: "Özel",
    period: " fiyat",
    description: "Şirket ve üniversiteler için",
    features: ["Tüm Pro özellikleri", "SSO entegrasyonu", "Tam yönetici paneli", "API erişimi", "Özel domain", "7/24 tam destek", "SLA garantisi"],
    missing: [],
    cta: "Bize Ulaş",
    href: "/contact",
    highlighted: false,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  return (
    <main className="space-y-12">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <WhiteboardShowcase />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
    </main>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/60 p-6 md:p-12 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,125,246,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(247,172,57,0.18),transparent_32%),radial-gradient(circle_at_70%_70%,rgba(18,168,122,0.16),transparent_36%)] pointer-events-none" />
      <div className="relative space-y-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="pill w-fit">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Atlasio 2026 • Global Learning Grid
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            Şu an <strong className="text-emerald-700">1.247 öğrenci</strong> aktif
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight text-slate-900">
            Dünya Standartlarında
          </h1>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-500 to-blue-500">
              Uzaktan Eğitim Platformu
            </span>
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-2xl leading-relaxed">
            Eğitmen, öğrenci ve kurumlar için tek ekrandan canlı ders, akıllı tahta, AI mentor ve sertifika deneyimi.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Ücretsiz Başla
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 shadow hover:shadow-lg hover:scale-105 transition-all"
          >
            ▶ Canlı Demo İzle
          </Link>
          <Link
            href="/courses"
            className="btn-link"
          >
            Kurs Katalogu
          </Link>
        </div>

        {/* Metric cards */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {heroMetrics.map((m) => (
            <div key={m.label} className="metric">
              <div className="label">{m.label}</div>
              <div className="value">{m.value}</div>
              <div className="text-xs text-emerald-700">{m.hint}</div>
            </div>
          ))}
        </div>

        {/* Trusted by */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 border-t border-slate-100 pt-4">
          <span className="font-medium text-slate-600">Güvenen kurumlar:</span>
          <span>🏛️ 42 Üniversite</span>
          <span className="text-slate-300">·</span>
          <span>🏢 180 Şirket</span>
          <span className="text-slate-300">·</span>
          <span>🌍 64 Ülke</span>
        </div>
      </div>
    </header>
  );
}

// ─── StatsSection ─────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <section className="glass rounded-3xl border border-slate-200 p-8 md:p-12 shadow-2xl">
      <div className="text-center mb-8">
        <span className="pill">Platform İstatistikleri</span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Rakamlarla Atlasio</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-100 bg-white/80 p-6 text-center shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-500 to-blue-500">
              {s.value}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{s.label}</div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">{s.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FeaturesSection ──────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="pill">Özellikler</span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Bir Platformda Her Şey</h2>
        <p className="mt-2 text-slate-600 max-w-xl mx-auto">
          Öğrenmek ve öğretmek için ihtiyaç duyduğunuz her araç, tek çatı altında entegre ve hazır.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
          >
            <div className="text-4xl mb-3">{f.icon}</div>
            <div className="text-sm font-semibold text-slate-900">{f.title}</div>
            <div className="mt-1 text-xs text-slate-500 leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── WhiteboardShowcase ───────────────────────────────────────────────────────

function WhiteboardShowcase() {
  return (
    <section className="glass rounded-3xl border border-slate-200 p-8 md:p-12 shadow-2xl overflow-hidden">
      <div className="grid gap-10 md:grid-cols-2 items-center">
        {/* Left: feature list */}
        <div className="space-y-6">
          <div>
            <span className="pill">Akıllı Tahta</span>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Sınıfı{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-500 to-blue-500">
                Dijitale Taşı
              </span>
            </h2>
            <p className="mt-2 text-slate-600 leading-relaxed">
              Gerçek zamanlı işbirliği, AI destekli araçlar ve interaktif dersler için tasarlanmış profesyonel whiteboard.
            </p>
          </div>
          <ul className="space-y-3">
            {whiteboardFeatures.map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                {feat}
              </li>
            ))}
          </ul>
          <Link
            href="/whiteboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all w-fit"
          >
            🧠 Tahtayı Şimdi Dene
          </Link>
        </div>

        {/* Right: mock whiteboard UI */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-inner overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-slate-400 font-medium">Atlasio Whiteboard</span>
          </div>
          {/* Tool sidebar */}
          <div className="flex">
            <div className="flex flex-col items-center gap-3 border-r border-slate-100 bg-slate-50 px-3 py-4">
              {["✏️", "⬜", "⭕", "➡️", "🔆", "📝", "🖼️", "🗑️"].map((tool) => (
                <button
                  key={tool}
                  className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-sm flex items-center justify-center shadow-sm hover:bg-emerald-50 transition-colors"
                >
                  {tool}
                </button>
              ))}
            </div>
            {/* Canvas area */}
            <div className="flex-1 relative bg-white min-h-48 p-4">
              {/* Simulated drawings */}
              <div className="absolute top-6 left-10 w-24 h-16 border-2 border-blue-400 rounded opacity-70" />
              <div className="absolute top-10 left-40 w-16 h-16 border-2 border-emerald-400 rounded-full opacity-70" />
              <div className="absolute bottom-8 left-8 text-xs text-slate-400 font-medium border-b border-slate-300 w-32">
                y = mx + b
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-1">
                <div className="h-1.5 w-12 rounded-full bg-amber-300 opacity-80" />
                <div className="h-1.5 w-8 rounded-full bg-blue-300 opacity-80" />
                <div className="h-1.5 w-10 rounded-full bg-emerald-300 opacity-80" />
              </div>
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500">3 katılımcı</span>
              </div>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
            <div className="flex gap-2">
              <span className="rounded px-2 py-0.5 bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">Sayfa 1/3</span>
              <span className="rounded px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 shadow-sm">Anket Aktif</span>
            </div>
            <span className="text-xs text-slate-400">Canlı • 00:14:32</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── TestimonialsSection ──────────────────────────────────────────────────────

function TestimonialsSection() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="pill">Yorumlar</span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Kullanıcılarımız Ne Diyor?</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="glass rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col gap-4"
          >
            <div className="text-amber-400 text-lg tracking-widest">⭐⭐⭐⭐⭐</div>
            <p className="text-sm text-slate-700 leading-relaxed flex-1">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {t.initials}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── PricingSection ───────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <span className="pill">Fiyatlandırma</span>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Sade ve Şeffaf Fiyatlar</h2>
        <p className="mt-2 text-slate-600">14 gün ücretsiz deneme. İstediğin zaman iptal et.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {pricingTiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-3xl border p-6 flex flex-col gap-5 transition-all duration-200 ${
              tier.highlighted
                ? "border-emerald-400 bg-gradient-to-b from-emerald-50 to-blue-50 shadow-2xl scale-105"
                : "border-slate-200 glass shadow-sm hover:shadow-xl"
            }`}
          >
            {tier.highlighted && (
              <div className="text-center">
                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 px-3 py-1 text-xs font-bold text-white">
                  En Popüler
                </span>
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-slate-900">{tier.name}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">
                  {tier.price}
                </span>
                <span className="text-sm text-slate-500">{tier.period}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{tier.description}</div>
            </div>
            <ul className="space-y-2 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500 font-bold">✓</span>
                  {f}
                </li>
              ))}
              {tier.missing.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-400 line-through">
                  <span className="text-slate-300">✗</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              className={`text-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:scale-105 ${
                tier.highlighted
                  ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:shadow-xl"
                  : "border border-slate-200 bg-white/80 text-slate-700 hover:shadow-md"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTASection ───────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center shadow-2xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-400 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
      <div className="relative space-y-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
          Öğrenmeye bugün başla
        </h2>
        <p className="text-lg text-white/90 max-w-lg mx-auto">
          14 gün ücretsiz deneme. Kredi kartı gerekmez. İstediğin zaman iptal et.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
          >
            Hesap Oluştur
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/60 bg-white/10 backdrop-blur px-8 py-3.5 text-sm font-bold text-white hover:bg-white/20 hover:scale-105 transition-all"
          >
            Kurslara Göz At
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <span>✓ Kurulum gerekmez</span>
          <span>✓ Anında erişim</span>
          <span>✓ 7/24 destek</span>
        </div>
      </div>
    </section>
  );
}
