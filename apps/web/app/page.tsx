"use client";

import Link from "next/link";
import { useI18n } from "./_i18n/use-i18n";

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
  { icon: "🎓", title: "Canlı & Arşivlenmiş Dersler", desc: "Anlık derse katıl veya dilediğin zaman tekrar izle." },
  { icon: "🧠", title: "AI Destekli Akıllı Tahta", desc: "30+ araç: kalem, şekil, lazer ve yapay zeka çizimi." },
  { icon: "🤖", title: "Yapay Zeka Öğrenme Asistanı", desc: "Kişiselleştirilmiş öneriler ve anlık konu özetleri." },
  { icon: "🏅", title: "Dijital Sertifikasyon Sistemi", desc: "QR doğrulama ve LinkedIn entegrasyonlu akıllı belgeler." },
  { icon: "📊", title: "Anlık Analitik & İçgörüler", desc: "Katılım takibi, gelişim analizi ve gerçek zamanlı dashboard." },
  { icon: "🔒", title: "Zero-Trust Güvenlik Mimarisi", desc: "SSO, RBAC ve uçtan uca şifrelenmiş kurumsal veri akışı." },
  { icon: "📱", title: "Kesintisiz Çoklu Platform", desc: "Masaüstü, tablet ve mobilde kusursuz deneyim." },
  { icon: "🌍", title: "Küresel Çok Dilli Altyapı", desc: "TR / EN / DE / AR arayüz ve içerik desteği." },
  { icon: "🛤️", title: "Kişiye Özgü Öğrenme Yolculukları", desc: "Adaptif içerik ve özelleştirilebilir eğitim planlarıyla her bireye özel deneyim." },
  { icon: "📁", title: "Birleşik İçerik Ekosistemi", desc: "Merkezi içerik yönetimi, akıllı arşivleme ve kurumsal içerik güvenliği." },
  { icon: "🔑", title: "Akıllı Rol & Yetki Yönetimi", desc: "Granüler erişim kontrolü ve çok katmanlı kurumsal yetkilendirme altyapısı." },
  { icon: "🎯", title: "Ürün & İş Ortağı Akademisi", desc: "Kurumsal ürün eğitimi ve partner sertifikasyon programları." },
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

export default function Home() {
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

const heroStats = [
  { value: "24K+",  label: "Aktif Öğrenci" },
  { value: "380+",  label: "Kurs" },
  { value: "6",     label: "Dil Desteği" },
  { value: "4.8/5", label: "AI Puanı" },
];

function HeroSection() {
  const { tr } = useI18n();
  return (
    <header className="hero-section">
      <div className="relative">
        {/* Top row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="hero-badge">
            <span style={{width:6,height:6,borderRadius:'50%',background:'#C8A96A',display:'inline-block'}} />
            {tr("Global Öğrenme Ağı")}
          </div>
          <div className="hero-live">
            <span className="relative flex" style={{width:10,height:10}}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{background:"#C8A96A",opacity:0.6}} />
              <span className="relative inline-flex rounded-full" style={{width:10,height:10,background:"#C8A96A"}} />
            </span>
            {tr("Şu an")} <strong className="hero-live">{tr("1.247 öğrenci")}</strong> {tr("aktif")}
          </div>
        </div>

        {/* Headline — Cormorant Garamond */}
        <div style={{maxWidth:700}}>
          <h1 className="hero-h1">{tr("Dünya Standartlarında")}</h1>
          <h1 className="hero-h1-gold">{tr("Uzaktan Eğitim")}</h1>
          <p className="hero-tagline">{tr("Bilgiyi Değere Dönüştüren Dijital Eğitim Platformu")}</p>
          <p className="hero-body">
            {tr("Eğitmen, öğrenci ve kurumlar için tek ekrandan canlı ders, akıllı tahta, AI mentor ve sertifika deneyimi.")}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 mt-9">
          <Link href="/register" className="hero-btn-primary">
            {tr("Ücretsiz Başla")} →
          </Link>
          <Link href="/demo" className="hero-btn-secondary">
            ▶ {tr("Demo İzle")}
          </Link>
          <Link href="/courses" className="btn-link" style={{alignSelf:'center'}}>
            {tr("Kurs Katalogu")}
          </Link>
        </div>

        {/* Stats row */}
        <div className="hero-stats">
          {heroStats.map((s) => (
            <div key={s.label}>
              <div className="hero-stat-val">{s.value}</div>
              <div className="hero-stat-label">{tr(s.label)}</div>
            </div>
          ))}
          <div style={{marginLeft:'auto',alignSelf:'center',fontSize:12,color:'var(--ink-2)'}}>
            🏛️ {tr("42 Üniversite")} &nbsp;·&nbsp; 🏢 {tr("180 Şirket")} &nbsp;·&nbsp; 🌍 {tr("64 Ülke")}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── StatsSection ─────────────────────────────────────────────────────────────

function StatsSection() {
  const { tr } = useI18n();
  return (
    <section className="rounded-3xl border p-8 md:p-12" style={{
      background:'var(--surface)',
      borderColor:'rgba(200,169,106,0.10)',
      boxShadow:'0 2px 24px rgba(11,31,58,0.05)'
    }}>
      <div className="text-center mb-10">
        <span className="hero-badge">{tr("Platform İstatistikleri")}</span>
        <h2 className="mt-4" style={{
          fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
          fontSize:'clamp(1.8rem,3vw,2.4rem)', fontWeight:600, color:'var(--ink)'
        }}>{tr("Rakamlarla Atlasio")}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1" style={{
            border:'1px solid rgba(200,169,106,0.12)',
            background:'var(--card)',
            boxShadow:'0 1px 12px rgba(11,31,58,0.04)'
          }}>
            <div style={{
              fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
              fontSize:'2.6rem', fontWeight:600, color:'#C8A96A', lineHeight:1
            }}>{s.value}</div>
            <div className="mt-2 text-sm font-semibold" style={{color:'var(--ink)',letterSpacing:'0.04em'}}>{tr(s.label)}</div>
            <div className="mt-1 text-xs font-medium" style={{color:'var(--ink-2)'}}>{tr(s.hint)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FeaturesSection ──────────────────────────────────────────────────────────

function FeaturesSection() {
  const { tr } = useI18n();
  return (
    <section className="space-y-8">
      <div className="text-center">
        <span className="hero-badge">{tr("Özellikler")}</span>
        <h2 className="mt-4" style={{
          fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
          fontSize:'clamp(1.8rem,3vw,2.4rem)', fontWeight:600, color:'var(--ink)'
        }}>{tr("Bir Platformda Her Şey")}</h2>
        <p className="mt-2 max-w-2xl mx-auto" style={{color:'var(--ink-2)',fontSize:15}}>
          {tr("Bireyden kuruma, öğrenciden eğitimciye — ihtiyaç duyduğunuz her çözüm tek çatı altında entegre ve hazır.")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{
            border:'1px solid rgba(200,169,106,0.10)',
            background:'var(--card)',
            boxShadow:'0 1px 8px rgba(11,31,58,0.04)'
          }}>
            <div className="text-3xl mb-3">{f.icon}</div>
            <div className="text-sm font-semibold" style={{color:'var(--ink)'}}>{tr(f.title)}</div>
            <div className="mt-1 text-xs leading-relaxed" style={{color:'var(--ink-2)'}}>{tr(f.desc)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── WhiteboardShowcase ───────────────────────────────────────────────────────

function WhiteboardShowcase() {
  const { tr } = useI18n();
  return (
    <section className="rounded-3xl p-8 md:p-12 overflow-hidden" style={{
      border:'1px solid rgba(200,169,106,0.10)',
      background:'var(--surface)',
      boxShadow:'0 2px 24px rgba(11,31,58,0.05)'
    }}>
      <div className="grid gap-10 md:grid-cols-2 items-center">
        {/* Left: feature list */}
        <div className="space-y-6">
          <div>
            <span className="hero-badge">{tr("Akıllı Tahta")}</span>
            <h2 className="mt-4" style={{
              fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
              fontSize:'clamp(1.8rem,3vw,2.4rem)', fontWeight:600, color:'var(--ink)', lineHeight:1.1
            }}>
              {tr("Sınıfı")}{" "}
              <span style={{color:'#C8A96A'}}>{tr("Dijitale Taşı")}</span>
            </h2>
            <p className="mt-2 leading-relaxed" style={{color:'var(--ink-2)',fontSize:15}}>
              {tr("Gerçek zamanlı işbirliği, AI destekli araçlar ve interaktif dersler için tasarlanmış profesyonel whiteboard.")}
            </p>
          </div>
          <ul className="space-y-3">
            {whiteboardFeatures.map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm" style={{color:'var(--ink)'}}>
                <span className="mt-0.5 flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{
                  width:20,height:20,borderRadius:'50%',
                  background:'rgba(200,169,106,0.12)',color:'#C8A96A',flexShrink:0
                }}>✓</span>
                {tr(feat)}
              </li>
            ))}
          </ul>
          <Link href="/whiteboard" className="hero-btn-primary w-fit">
            🧠 {tr("Tahtayı Şimdi Dene")}
          </Link>
        </div>

        {/* Right: mock whiteboard UI */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-inner overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full" style={{background:"#C8A96A"}} />
            <span className="ml-3 text-xs text-slate-400 font-medium">Atlasio Whiteboard</span>
          </div>
          {/* Tool sidebar */}
          <div className="flex">
            <div className="flex flex-col items-center gap-3 border-r border-slate-100 bg-slate-50 px-3 py-4">
              {["✏️", "⬜", "⭕", "➡️", "🔆", "📝", "🖼️", "🗑️"].map((tool) => (
                <button
                  key={tool}
                  className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-sm flex items-center justify-center shadow-sm hover:bg-amber-50 transition-colors"
                >
                  {tool}
                </button>
              ))}
            </div>
            {/* Canvas area */}
            <div className="flex-1 relative bg-white min-h-48 p-4">
              <div className="absolute top-6 left-10 w-24 h-16 border-2 border-blue-400 rounded opacity-70" />
              <div className="absolute top-10 left-40 w-16 h-16 border-2 rounded-full opacity-70" style={{borderColor:"#C8A96A"}} />
              <div className="absolute bottom-8 left-8 text-xs text-slate-400 font-medium border-b border-slate-300 w-32">
                y = mx + b
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-1">
                <div className="h-1.5 w-12 rounded-full bg-amber-300 opacity-80" />
                <div className="h-1.5 w-8 rounded-full bg-blue-300 opacity-80" />
                <div className="h-1.5 w-10 rounded-full opacity-80" style={{background:"rgba(200,169,106,0.7)"}} />
              </div>
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{background:"#C8A96A"}} />
                <span className="text-xs text-slate-500">{tr("3 katılımcı")}</span>
              </div>
            </div>
          </div>
          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
            <div className="flex gap-2">
              <span className="rounded px-2 py-0.5 bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">{tr("Sayfa 1/3")}</span>
              <span className="rounded px-2 py-0.5 text-xs shadow-sm" style={{background:"rgba(200,169,106,0.12)",border:"1px solid rgba(200,169,106,0.35)",color:"#C8A96A"}}>{tr("Anket Aktif")}</span>
            </div>
            <span className="text-xs text-slate-400">{tr("Canlı")} • 00:14:32</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── TestimonialsSection ──────────────────────────────────────────────────────

function TestimonialsSection() {
  const { tr } = useI18n();
  return (
    <section className="space-y-8">
      <div className="text-center">
        <span className="hero-badge">{tr("Yorumlar")}</span>
        <h2 className="mt-4" style={{
          fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
          fontSize:'clamp(1.8rem,3vw,2.4rem)', fontWeight:600, color:'var(--ink)'
        }}>{tr("Kullanıcılarımız Ne Diyor?")}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((item) => (
          <div key={item.name} className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{
            border:'1px solid rgba(200,169,106,0.10)',
            background:'var(--card)',
            boxShadow:'0 1px 8px rgba(11,31,58,0.04)'
          }}>
            <div style={{color:'#C8A96A',letterSpacing:'0.15em',fontSize:14}}>★★★★★</div>
            <p className="text-sm leading-relaxed flex-1" style={{color:'var(--ink-2)'}}>"{tr(item.quote)}"</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center text-sm font-bold flex-shrink-0" style={{
                width:38,height:38,borderRadius:10,
                background:'rgba(11,31,58,0.08)',color:'#0B1F3A',
                border:'1px solid rgba(200,169,106,0.20)'
              }}>{item.initials}</div>
              <div>
                <div className="text-sm font-semibold" style={{color:'var(--ink)'}}>{item.name}</div>
                <div className="text-xs" style={{color:'var(--ink-2)'}}>{tr(item.role)}</div>
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
  const { tr } = useI18n();
  return (
    <section className="space-y-8">
      <div className="text-center">
        <span className="hero-badge">{tr("Fiyatlandırma")}</span>
        <h2 className="mt-4" style={{
          fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
          fontSize:'clamp(1.8rem,3vw,2.4rem)', fontWeight:600, color:'var(--ink)'
        }}>{tr("Sade ve Şeffaf Fiyatlar")}</h2>
        <p className="mt-2" style={{color:'var(--ink-2)',fontSize:14}}>{tr("14 gün ücretsiz deneme. İstediğin zaman iptal et.")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {pricingTiers.map((tier) => (
          <div key={tier.name} className="rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200" style={
            tier.highlighted ? {
              border:'1.5px solid rgba(200,169,106,0.45)',
              background:'var(--card)',
              boxShadow:'0 8px 40px rgba(11,31,58,0.12)',
              transform:'scale(1.03)'
            } : {
              border:'1px solid rgba(200,169,106,0.10)',
              background:'var(--card)',
              boxShadow:'0 1px 8px rgba(11,31,58,0.04)'
            }
          }>
            {tier.highlighted && (
              <div className="text-center">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{
                  background:'#0B1F3A', color:'#C8A96A', letterSpacing:'0.05em'
                }}>{tr("En Popüler")}</span>
              </div>
            )}
            <div>
              <div className="text-base font-bold" style={{color:'var(--ink)'}}>{tr(tier.name)}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span style={{
                  fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
                  fontSize:'2.4rem', fontWeight:600,
                  color: tier.highlighted ? '#C8A96A' : 'var(--ink)'
                }}>{tier.price}</span>
                <span className="text-sm" style={{color:'var(--ink-2)'}}>{tr(tier.period)}</span>
              </div>
              <div className="mt-1 text-xs" style={{color:'var(--ink-2)'}}>{tr(tier.description)}</div>
            </div>
            <ul className="space-y-2 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{color:'var(--ink)'}}>
                  <span style={{color:'#C8A96A',fontWeight:700}}>✓</span>
                  {tr(f)}
                </li>
              ))}
              {tier.missing.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm line-through" style={{color:'var(--muted)'}}>
                  <span style={{color:'var(--muted)'}}>✗</span>
                  {tr(f)}
                </li>
              ))}
            </ul>
            <Link href={tier.href} className={tier.highlighted ? 'hero-btn-primary text-center' : 'hero-btn-secondary text-center'}>
              {tr(tier.cta)}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTASection ───────────────────────────────────────────────────────────────

function CTASection() {
  const { tr } = useI18n();
  return (
    <section className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center" style={{
      background:'#0B1F3A',
      boxShadow:'0 8px 48px rgba(11,31,58,0.25)'
    }}>
      {/* Subtle gold radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,169,106,0.10) 0, transparent 65%)'
      }} />
      {/* Thin gold top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{
        width:'40%', height:1,
        background:'linear-gradient(to right, transparent, #C8A96A, transparent)'
      }} />
      <div className="relative space-y-6">
        <h2 style={{
          fontFamily:'var(--font-serif,serif)', fontStyle:'italic',
          fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:600,
          color:'#FAFAF8', lineHeight:1.1
        }}>
          {tr("Öğrenmeye bugün başla")}
        </h2>
        <p style={{fontSize:16, color:'rgba(250,250,248,0.65)', maxWidth:440, margin:'0 auto'}}>
          {tr("14 gün ücretsiz deneme. Kredi kartı gerekmez. İstediğin zaman iptal et.")}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5" style={{
            background:'#C8A96A', color:'#0B1F3A',
            boxShadow:'0 4px 20px rgba(200,169,106,0.30)'
          }}>
            {tr("Hesap Oluştur")} →
          </Link>
          <Link href="/courses" className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5" style={{
            border:'1.5px solid rgba(200,169,106,0.35)',
            color:'rgba(250,250,248,0.80)',
            background:'rgba(255,255,255,0.04)'
          }}>
            {tr("Kurslara Göz At")}
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm" style={{color:'rgba(200,169,106,0.55)'}}>
          <span>✓ {tr("Kurulum gerekmez")}</span>
          <span>✓ {tr("Anında erişim")}</span>
          <span>✓ {tr("7/24 destek")}</span>
        </div>
      </div>
    </section>
  );
}
