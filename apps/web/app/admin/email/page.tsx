"use client";
import React, { useState } from "react";
import { useI18n } from '../../_i18n/use-i18n';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type TargetGroup = "all" | "students" | "instructors" | "admins" | "course" | "custom";
type SendStatus = "draft" | "scheduled" | "sent" | "failed";

interface EmailHistory {
  id: string; subject: string; target: string; sentAt: string;
  sent: number; opened: number; status: SendStatus;
}

interface EmailTemplate {
  id: string; name: string; subject: string; body: string; category: string;
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const DEMO_HISTORY: EmailHistory[] = [
  { id: "e1", subject: "ATLASIO'ya Hoş Geldiniz!", target: "Tüm Kullanıcılar", sentAt: "2026-03-28 09:15", sent: 1240, opened: 842, status: "sent" },
  { id: "e2", subject: "Yeni Dönem Kursları Başlıyor", target: "Öğrenciler", sentAt: "2026-03-25 14:00", sent: 980, opened: 631, status: "sent" },
  { id: "e3", subject: "Eğitmen Bilgilendirme Toplantısı", target: "Eğitmenler", sentAt: "2026-03-22 11:30", sent: 45, opened: 40, status: "sent" },
  { id: "e4", subject: "Platform Bakım Duyurusu", target: "Tüm Kullanıcılar", sentAt: "2026-04-01 02:00", sent: 0, opened: 0, status: "scheduled" },
  { id: "e5", subject: "Şifre Politikası Güncellemesi", target: "Tüm Kullanıcılar", sentAt: "2026-03-20 16:45", sent: 1180, opened: 540, status: "sent" },
];

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "t1", name: "Hoş Geldiniz", category: "Onboarding",
    subject: "ATLASIO'ya Hoş Geldiniz, {{ad}}!",
    body: `Merhaba {{ad}},

ATLASIO ailesine katıldığınız için çok mutluyuz! 🎉

{t.tr("ATLASIO, dünya standartlarında uzaktan eğitim deneyimi sunan kapsamlı bir öğrenme platformudur. Platformumuzda:")}

{t.tr("✅ Yüzlerce interaktif kurs ve öğrenme yolu")}
{t.tr("✅ Canlı ders ve akıllı sınıf deneyimi")}
{t.tr("✅ Kişiselleştirilmiş AI destekli öğrenme")}
{t.tr("✅ Gamification ve başarı rozetleri")}
✅ Sertifika ve diploma programları

bulabilirsiniz.

Hesabınız aktif edilmiştir. Hemen giriş yaparak öğrenme yolculuğunuza başlayabilirsiniz.

{t.tr("Herhangi bir sorunuz olursa destek ekibimiz her zaman yanınızda.")}

Başarılar dileriz,
ATLASIO Ekibi`,
  },
  {
    id: "t2", name: "Şifre Sıfırlama", category: "Güvenlik",
    subject: "Şifrenizi Sıfırlayın — ATLASIO",
    body: `Merhaba {{ad}},

Hesabınız için şifre sıfırlama talebinde bulunulmuştur.

Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:

🔗 {{sifre_sifirlama_linki}}

{t.tr("Bu bağlantı 24 saat geçerlidir.")}

{t.tr("Eğer bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın. Hesabınız güvende olmaya devam edecektir.")}

Güvenli günler,
ATLASIO Güvenlik Ekibi`,
  },
  {
    id: "t3", name: "Kursa Davet", category: "Eğitim",
    subject: "{{kurs_adi}} Kursuna Davet Edildiniz",
    body: `Merhaba {{ad}},

{{egitmen_adi}} sizi "{{kurs_adi}}" kursuna davet etti!

📚 Kurs Detayları:
• Ad: {{kurs_adi}}
• Süre: {{kurs_suresi}}
• Başlangıç: {{baslangic_tarihi}}
• Eğitmen: {{egitmen_adi}}

Kursa katılmak için:
🔗 {{kurs_linki}}

{t.tr("Bu harika öğrenme fırsatını kaçırmayın. Kurs sınırlı kontenjanla açılmaktadır.")}

İyi dersler,
ATLASIO Eğitim Ekibi`,
  },
  {
    id: "t4", name: "Canlı Ders Hatırlatıcı", category: "Bildirim",
    subject: "⏰ Canlı Dersiniz {{saat}} Başlıyor — {{kurs_adi}}",
    body: `Merhaba {{ad}},

Canlı dersiniz {{sure}} içinde başlıyor!

📅 Ders Bilgileri:
• Kurs: {{kurs_adi}}
• Tarih: {{ders_tarihi}}
• Saat: {{ders_saati}}
• Eğitmen: {{egitmen_adi}}

Derse katılmak için:
🔗 {{canli_ders_linki}}

{t.tr("Lütfen dersten 5 dakika önce bağlanmayı unutmayın. Mikrofon ve kameranızın çalıştığından emin olun.")}

Başarılı dersler,
ATLASIO`,
  },
  {
    id: "t5", name: "Sertifika Kazanıldı", category: "Başarı",
    subject: "🏆 Tebrikler! {{sertifika_adi}} Sertifikanızı Kazandınız",
    body: `Tebrikler {{ad}}!

"{{sertifika_adi}}" sertifikanızı başarıyla tamamladınız. Bu büyük bir başarı!

🏅 Sertifikanız:
• Ad: {{sertifika_adi}}
• Tarih: {{tamamlanma_tarihi}}
• Puan: {{puan}}/100
• Geçerlilik: {{gecerlilik_tarihi}}

Sertifikanızı indirmek ve LinkedIn profilinize eklemek için:
🔗 {{sertifika_linki}}

Bu başarıyı kutlamak istiyoruz. Öğrenme yolculuğunuzda çok ilerleme kaydettiniz!

Gurula,
ATLASIO Ekibi`,
  },
  {
    id: "t6", name: "Platform Güncelleme Duyurusu", category: "Sistem",
    subject: "🚀 ATLASIO Güncellendi — Yeni Özellikler",
    body: `Merhaba {{ad}},

ATLASIO platformunu geliştirmeye devam ediyoruz. Bu güncelleme ile birlikte pek çok yeni özellik sizlere sunuyoruz.

{t.tr("🆕 Bu Güncellemede:")}
{{guncelleme_listesi}}

📅 Güncelleme Tarihi: {{guncelleme_tarihi}}

Yeni özellikler hakkında detaylı bilgi almak için:
🔗 {{blog_linki}}

{t.tr("Sorularınız veya geri bildirimleriniz için destek@atlasio.io adresine yazabilirsiniz.")}

İyi öğrenmeler,
ATLASIO Ürün Ekibi`,
  },
  {
    id: "t7", name: "Güvenlik Uyarısı", category: "Güvenlik",
    subject: "⚠️ Hesabınızda Yeni Giriş Tespit Edildi",
    body: `Merhaba {{ad}},

Hesabınıza yeni bir cihazdan giriş yapıldığını tespit ettik.

📍 Giriş Detayları:
• Tarih: {{giris_tarihi}}
• Saat: {{giris_saati}}
• Konum: {{konum}}
• Cihaz: {{cihaz}}
• IP Adresi: {{ip_adresi}}

{t.tr("Bu giriş size aitse bu e-postayı dikkate almayın.")}

Bu girişi siz yapmadıysanız, hemen şifrenizi değiştirin:
🔗 {{sifre_degistir_linki}}

{t.tr("Hesabınızı güvende tutmak için güçlü bir şifre ve iki faktörlü doğrulama kullanmanızı öneririz.")}

ATLASIO Güvenlik Ekibi`,
  },
  {
    id: "t8", name: "Genel Duyuru", category: "Genel",
    subject: "📢 {{baslik}} — ATLASIO",
    body: `Merhaba {{ad}},

{{icerik}}

Daha fazla bilgi için:
🔗 {{link}}

Saygılarımızla,
ATLASIO Yönetim Ekibi`,
  },
];

const TARGET_GROUPS = [
  { id: "all" as TargetGroup, label: "Tüm Kullanıcılar", icon: "👥", count: "1.240 kişi" },
  { id: "students" as TargetGroup, label: "Öğrenciler", icon: "🎓", count: "1.180 kişi" },
  { id: "instructors" as TargetGroup, label: "Eğitmenler", icon: "👨‍🏫", count: "45 kişi" },
  { id: "admins" as TargetGroup, label: "Yöneticiler", icon: "🛡️", count: "8 kişi" },
  { id: "course" as TargetGroup, label: "Belirli Kurs", icon: "📚", count: "Kurs seç" },
  { id: "custom" as TargetGroup, label: "Özel Liste", icon: "✏️", count: "E-posta gir" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function StatusBadge({ status, tr }: { status: SendStatus; tr: (s: string) => string }) {
  const cfg = {
    sent: { label: tr("Gönderildi"), bg: "rgba(34,197,94,0.12)", color: "#4ade80", border: "rgba(34,197,94,0.25)" },
    scheduled: { label: tr("Planlandı"), bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.25)" },
    draft: { label: tr("Taslak"), bg: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "rgba(148,163,184,0.25)" },
    failed: { label: tr("Başarısız"), bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" },
  }[status];
  return (
    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AdminEmailPage() {
  const t = useI18n();
  const [tab, setTab] = useState<"compose" | "templates" | "history">("compose");
  const [target, setTarget] = useState<TargetGroup>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState("");
  const [customEmails, setCustomEmails] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState("all");

  const categories = ["all", ...Array.from(new Set(EMAIL_TEMPLATES.map(item => item.category)))];

  const loadTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setSelectedTemplate(tpl.id);
    setTab("compose");
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 1400));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setSubject(""); setBody("");
  };

  const c = {
    bg: "var(--panel)",
    border: "var(--line)",
    accent: "#5B6EFF",
    accentBg: "rgba(91,110,255,0.1)",
    text: "var(--ink)",
    muted: "var(--ink-2)",
    input: "var(--bg)",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: c.text, margin: "0 0 6px", letterSpacing: "-0.03em" }}>
            {t.tr("📧 E-Posta Yönetimi")}
          </h1>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
            {t.tr("Kullanıcılara toplu veya hedefli e-posta gönderin, şablonlar oluşturun, geçmişi izleyin.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["compose", "templates", "history"] as const).map(item => (
            <button key={item} onClick={() => setTab(item)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: tab === item ? c.accent : c.input,
              color: tab === item ? "#fff" : c.muted,
              boxShadow: tab === item ? "0 2px 12px rgba(91,110,255,0.3)" : "none",
              transition: "all 0.15s",
            }}>
              {{ compose: t.tr("✏️ Oluştur"), templates: t.tr("📋 Şablonlar"), history: t.tr("📊 Geçmiş") }[item]}
            </button>
          ))}
        </div>
      </div>

      {/* ── COMPOSE TAB ─────────────────────────────────────────────────── */}
      {tab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          {/* Left: composer */}
          <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.text }}>{t.tr("Yeni E-Posta")}</div>

            {/* Subject */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t.tr("Konu")}</label>
              <input
                value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="E-posta konusunu girin…"
                style={{ padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.input, color: c.text, fontSize: 14, outline: "none" }}
              />
            </div>

            {/* Body */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t.tr("İçerik")}</label>
              <div style={{ fontSize: 11, color: c.muted, marginTop: -2 }}>
                Değişkenler: <code style={{ background: "rgba(91,110,255,0.1)", padding: "1px 5px", borderRadius: 4, color: "#a5b4fc" }}>{"{{ad}}"}</code>&nbsp;
                <code style={{ background: "rgba(91,110,255,0.1)", padding: "1px 5px", borderRadius: 4, color: "#a5b4fc" }}>{"{{kurs_adi}}"}</code>&nbsp;
                <code style={{ background: "rgba(91,110,255,0.1)", padding: "1px 5px", borderRadius: 4, color: "#a5b4fc" }}>{"{{link}}"}</code>
              </div>
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder={t.tr("E-posta içeriğini buraya yazın…&#10;&#10;Merhaba {{ad}},&#10;&#10;...")}
                rows={14}
                style={{ padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.input, color: c.text, fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" }}
              />
            </div>

            {/* Schedule */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg)", borderRadius: 10, border: `1px solid ${c.border}` }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: c.text }}>
                <input type="radio" name="sendTime" checked={sendNow} onChange={() => setSendNow(true)} />
                {t.tr("Hemen Gönder")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: c.text }}>
                <input type="radio" name="sendTime" checked={!sendNow} onChange={() => setSendNow(false)} />
                {t.tr("Planla")}
              </label>
              {!sendNow && (
                <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 12, outline: "none" }} />
              )}
            </div>

            {/* Send button */}
            <button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()} style={{
              padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800,
              background: sent ? "rgba(34,197,94,0.2)" : (!subject.trim() || !body.trim()) ? "var(--line)" : `linear-gradient(135deg,${c.accent},#00B4D8)`,
              color: sent ? "#4ade80" : (!subject.trim() || !body.trim()) ? c.muted : "#fff",
              boxShadow: (subject.trim() && body.trim() && !sent) ? "0 4px 20px rgba(91,110,255,0.35)" : "none",
              transition: "all 0.2s",
            }}>
              {sending ? t.tr("⏳ Gönderiliyor…") : sent ? t.tr("✅ Gönderildi!") : sendNow ? t.tr("📤 Gönder") : t.tr("📅 Planla")}
            </button>
          </div>

          {/* Right: target selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.text, marginBottom: 14 }}>{t.tr("🎯 Hedef Kitle")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TARGET_GROUPS.map(g => (
                  <button key={g.id} onClick={() => setTarget(g.id)} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${target === g.id ? c.accent : c.border}`,
                    background: target === g.id ? c.accentBg : "transparent",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 18 }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: target === g.id ? "#a5b4fc" : c.text }}>{t.tr(g.label)}</div>
                      <div style={{ fontSize: 11, color: c.muted }}>{g.count}</div>
                    </div>
                    {target === g.id && <span style={{ color: c.accent, fontSize: 16 }}>✓</span>}
                  </button>
                ))}
              </div>

              {target === "course" && (
                <input value={courseId} onChange={e => setCourseId(e.target.value)}
                  placeholder={t.tr("Kurs ID veya adı…")}
                  style={{ marginTop: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              )}
              {target === "custom" && (
                <textarea value={customEmails} onChange={e => setCustomEmails(e.target.value)}
                  placeholder={t.tr("E-posta adresleri (virgülle ayırın)&#10;ali@ornek.com, ayse@ornek.com")}
                  rows={3}
                  style={{ marginTop: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 12, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              )}
            </div>

            {/* Quick template picker */}
            <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.text, marginBottom: 12 }}>{t.tr("⚡ Hızlı Şablon")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EMAIL_TEMPLATES.slice(0, 5).map(item => (
                  <button key={item.id} onClick={() => loadTemplate(item)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 9, border: `1px solid ${selectedTemplate === item.id ? c.accent : c.border}`,
                    background: selectedTemplate === item.id ? c.accentBg : "transparent",
                    cursor: "pointer", fontSize: 12, color: c.text, textAlign: "left",
                  }}>
                    <span style={{ fontWeight: 600 }}>{t.tr(item.name)}</span>
                    <span style={{ fontSize: 10, color: c.muted, background: "var(--line)", padding: "2px 6px", borderRadius: 4 }}>{t.tr(item.category)}</span>
                  </button>
                ))}
                <button onClick={() => setTab("templates")} style={{ padding: "8px 12px", borderRadius: 9, border: `1px dashed ${c.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: c.muted }}>
                  {t.tr("Tüm şablonları gör →")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPLATES TAB ─────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Category filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setTemplateCategory(cat)} style={{
                padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: templateCategory === cat ? c.accent : c.input,
                color: templateCategory === cat ? "#fff" : c.muted,
              }}>
                {cat === "all" ? t.tr("Tümü") : t.tr(cat)}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
            {EMAIL_TEMPLATES.filter(item => templateCategory === "all" || item.category === templateCategory).map(tpl => (
              <div key={tpl.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: c.text }}>{t.tr(tpl.name)}</div>
                    <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{t.tr(tpl.category)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${c.border}` }}>
                  {tpl.subject}
                </div>
                <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.6, maxHeight: 80, overflow: "hidden", position: "relative" }}>
                  {tpl.body.substring(0, 140)}…
                </div>
                <button onClick={() => loadTemplate(tpl)} style={{
                  padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: c.accentBg, color: "#a5b4fc", border: `1px solid rgba(91,110,255,0.25)`,
                }}>
                  {t.tr("Bu Şablonu Kullan")}
                </button>
              </div>
            ))}

            {/* Add new template */}
            <div style={{ background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 180, cursor: "pointer", opacity: 0.6 }}>
              <div style={{ fontSize: 32 }}>+</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.muted }}>{t.tr("Yeni Şablon Ekle")}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.text }}>{t.tr("Gönderim Geçmişi")}</div>
            <div style={{ fontSize: 12, color: c.muted }}>{DEMO_HISTORY.length} {t.tr("kayıt")}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  {[t.tr("Konu"), t.tr("Hedef Kitle"), t.tr("Tarih"), t.tr("Gönderilen"), t.tr("Açılma Oranı"), t.tr("Durum")].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_HISTORY.map((email, i) => (
                  <tr key={email.id} style={{ borderBottom: `1px solid ${c.border}`, background: i % 2 === 0 ? "transparent" : "var(--bg)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{email.subject}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: c.muted }}>{email.target}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: c.muted, fontFamily: "monospace" }}>{email.sentAt}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: c.text, fontWeight: 700 }}>
                      {email.sent > 0 ? email.sent.toLocaleString("tr-TR") : "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {email.sent > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.round(email.opened / email.sent * 100)}%`, background: "linear-gradient(90deg,#5B6EFF,#00B4D8)", borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{Math.round(email.opened / email.sent * 100)}%</span>
                        </div>
                      ) : <span style={{ fontSize: 12, color: c.muted }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={email.status} tr={t.tr} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
