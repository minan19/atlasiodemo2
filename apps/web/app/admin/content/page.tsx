"use client";
import React, { useState, useRef } from "react";
import { useI18n } from '../../_i18n/use-i18n';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ContentType = "video" | "pdf" | "presentation" | "quiz" | "document" | "scorm";
type ContentStatus = "active" | "draft" | "processing" | "archived";

interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  size: string;
  duration?: string;
  tags: string[];
  assignedCourses: string[];
  uploadedAt: string;
  uploadedBy: string;
  views: number;
  aiProcessed: boolean;
}

/* ─── Demo data ──────────────────────────────────────────────────────────── */
const DEMO_CONTENT: ContentItem[] = [
  { id: "c1", title: "React ile Modern Web Geliştirme", type: "video", status: "active", size: "1.2 GB", duration: "4s 32dk", tags: ["react","frontend","javascript"], assignedCourses: ["Web Geliştirme 101"], uploadedAt: "2026-03-28", uploadedBy: "Ayşe Kaya", views: 342, aiProcessed: true },
  { id: "c2", title: "Veri Yapıları ve Algoritmalar — Ders Notları", type: "pdf", status: "active", size: "8.4 MB", tags: ["algoritma","cs","temel"], assignedCourses: ["CS Temel","Yazılım Mühendisliği"], uploadedAt: "2026-03-25", uploadedBy: "Mehmet Demir", views: 189, aiProcessed: true },
  { id: "c3", title: "UX Tasarım İlkeleri Sunumu", type: "presentation", status: "active", size: "24 MB", tags: ["ux","tasarım","figma"], assignedCourses: ["UI/UX Bootcamp"], uploadedAt: "2026-03-22", uploadedBy: "Zeynep Arslan", views: 95, aiProcessed: false },
  { id: "c4", title: "Python Başlangıç Kılavuzu", type: "document", status: "draft", size: "2.1 MB", tags: ["python","başlangıç"], assignedCourses: [], uploadedAt: "2026-03-20", uploadedBy: "Ali Yılmaz", views: 0, aiProcessed: false },
  { id: "c5", title: "SQL Temelleri Sınavı", type: "quiz", status: "active", size: "—", tags: ["sql","veritabanı"], assignedCourses: ["Veritabanı Yönetimi"], uploadedAt: "2026-03-18", uploadedBy: "Fatma Şahin", views: 567, aiProcessed: true },
  { id: "c6", title: "Proje Yönetimi SCORM Paketi", type: "scorm", status: "processing", size: "340 MB", tags: ["pmp","proje"], assignedCourses: [], uploadedAt: "2026-03-29", uploadedBy: "Emre Kılıç", views: 0, aiProcessed: false },
  { id: "c7", title: "Docker ve Kubernetes İleri Seviye", type: "video", status: "active", size: "2.8 GB", duration: "6s 14dk", tags: ["devops","docker","k8s"], assignedCourses: ["DevOps Kursu"], uploadedAt: "2026-03-15", uploadedBy: "Ayşe Kaya", views: 214, aiProcessed: true },
  { id: "c8", title: "Siber Güvenlik Tehditleri 2026", type: "pdf", status: "active", size: "5.6 MB", tags: ["güvenlik","siber"], assignedCourses: ["Güvenlik 101"], uploadedAt: "2026-03-10", uploadedBy: "Mehmet Demir", views: 432, aiProcessed: true },
];

const TYPE_ICONS: Record<ContentType, string> = { video: "🎬", pdf: "📄", presentation: "📊", quiz: "🧩", document: "📝", scorm: "📦" };
const TYPE_LABELS: Record<ContentType, string> = { video: "Video", pdf: "PDF", presentation: "Sunum", quiz: "Sınav", document: "Doküman", scorm: "SCORM" };
const TYPE_COLORS: Record<ContentType, string> = {
  video: "#5B6EFF", pdf: "#ef4444", presentation: "#f59e0b",
  quiz: "#a855f7", document: "#22c55e", scorm: "#06b6d4",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}30` }}>{text}</span>;
}

function StatusDot({ status }: { status: ContentStatus }) {
  const cfg = { active: "#22c55e", draft: "#94a3b8", processing: "#f59e0b", archived: "#6b7280" }[status];
  const label = { active: "Aktif", draft: "Taslak", processing: "İşleniyor…", archived: "Arşiv" }[status];
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: cfg, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg, animation: status === "processing" ? "pulse 1.2s infinite" : "none" }} />
      {label}
    </span>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function ContentManagementPage() {
  const t = useI18n();
  const [items, setItems] = useState<ContentItem[]>(DEMO_CONTENT);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [view, setView] = useState<"grid" | "list">("list");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [aiProcessingId, setAiProcessingId] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const c = {
    bg: "var(--panel)", border: "var(--line)",
    accent: "#5B6EFF", accentBg: "rgba(91,110,255,0.08)",
    text: "var(--ink)", muted: "var(--ink-2)",
    input: "var(--bg)", card: "color-mix(in srgb, var(--accent) 2%, var(--panel))",
  };

  const filtered = items.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || item.type === typeFilter;
    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const simulateUpload = async () => {
    setUploading(true); setUploadProgress(0);
    for (let p = 0; p <= 100; p += 10) {
      await new Promise(r => setTimeout(r, 120));
      setUploadProgress(p);
    }
    const newItem: ContentItem = {
      id: `c${Date.now()}`, title: "Yeni İçerik — " + new Date().toLocaleDateString("tr-TR"),
      type: "pdf", status: "processing", size: "12.5 MB", tags: ["yeni"],
      assignedCourses: [], uploadedAt: new Date().toISOString().split("T")[0],
      uploadedBy: "Siz", views: 0, aiProcessed: false,
    };
    setItems(prev => [newItem, ...prev]);
    setUploading(false); setShowUploadZone(false);
  };

  const triggerAi = async (id: string) => {
    setAiProcessingId(id);
    await new Promise(r => setTimeout(r, 2200));
    setItems(prev => prev.map(item => item.id === id ? { ...item, aiProcessed: true } : item));
    setAiProcessingId(null);
  };

  const totalViews = items.reduce((a, b) => a + b.views, 0);
  const aiCount = items.filter(i => i.aiProcessed).length;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: c.text, margin: "0 0 6px", letterSpacing: "-0.03em" }}>{t.tr("📚 İçerik Kütüphanesi")}</h1>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>{t.tr("Tüm eğitim materyallerini merkezi olarak yönetin, AI ile işleyin ve kurslara atayın.")}</p>
        </div>
        <button onClick={() => setShowUploadZone(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer",
          background: `linear-gradient(135deg,${c.accent},#00B4D8)`,
          color: "#fff", fontSize: 14, fontWeight: 800,
          boxShadow: "0 4px 20px rgba(91,110,255,0.35)",
        }}>
          <span>+</span> İçerik Yükle
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
        {[
          { label: "Toplam İçerik", value: items.length, icon: "📁", color: c.accent },
          { label: "Toplam Görüntülenme", value: totalViews.toLocaleString("tr-TR"), icon: "👁", color: "#00B4D8" },
          { label: "AI İşlendi", value: `${aiCount}/${items.length}`, icon: "🤖", color: "#a855f7" },
          { label: "Aktif İçerik", value: items.filter(i => i.status === "active").length, icon: "✅", color: "#22c55e" },
          { label: "Taslak", value: items.filter(i => i.status === "draft").length, icon: "📝", color: "#f59e0b" },
        ].map(stat => (
          <div key={t.tr(stat.label)} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{t.tr(stat.label)}</div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      {showUploadZone && (
        <div style={{ background: c.bg, border: `1.5px dashed ${c.accent}`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 32 }}>⬆️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Yükleniyor… {uploadProgress}%</div>
              <div style={{ width: 280, height: 6, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${uploadProgress}%`, background: `linear-gradient(90deg,${c.accent},#00B4D8)`, borderRadius: 99, transition: "width 0.1s" }} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 48 }}>☁️</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: c.text }}>{t.tr("Dosyaları buraya sürükleyin")}</div>
              <div style={{ fontSize: 13, color: c.muted }}>{t.tr("veya bilgisayarınızdan seçin")}</div>
              <div style={{ fontSize: 11, color: c.muted }}>MP4, PDF, PPTX, DOCX, ZIP (SCORM) — Maks. 5 GB</div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={simulateUpload} style={{
                  padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg,${c.accent},#00B4D8)`, color: "#fff", fontWeight: 800, fontSize: 14,
                }}>{t.tr("Dosya Seç")}</button>
                <button onClick={() => setShowUploadZone(false)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 14 }}>{t.tr("İptal")}</button>
              </div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>
                {t.tr("💡 Yükleme sonrası AI otomatik özet ve soru oluşturabilir")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.tr("İçerik, etiket ara…")}
          style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.input, color: c.text, fontSize: 13, outline: "none" }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, cursor: "pointer" }}>
          <option value="all">{t.tr("Tüm Tipler")}</option>
          {(["video","pdf","presentation","quiz","document","scorm"] as ContentType[]).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, cursor: "pointer" }}>
          <option value="all">{t.tr("Tüm Durumlar")}</option>
          <option value="active">Aktif</option>
          <option value="draft">Taslak</option>
          <option value="processing">{t.tr("İşleniyor")}</option>
          <option value="archived">{t.tr("Arşiv")}</option>
        </select>
        <div style={{ display: "flex", border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}>
          {(["list","grid"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "9px 14px", border: "none", cursor: "pointer", background: view === v ? c.accentBg : "transparent", color: view === v ? "#a5b4fc" : c.muted, fontSize: 13 }}>
              {v === "list" ? "☰" : "⊞"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: c.accentBg, borderRadius: 10, border: `1px solid rgba(91,110,255,0.3)` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>{selectedIds.size} seçildi</span>
          <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(34,197,94,0.15)", color: "#4ade80", fontSize: 12, fontWeight: 700 }}>Aktif Et</button>
          <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>Kursa Ata</button>
          <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 12, fontWeight: 700 }}>{t.tr("Arşivle")}</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: c.muted, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Content list */}
      {view === "list" ? (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: c.card }}>
                <th style={{ width: 36, padding: "12px 16px" }}>
                  <input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())} />
                </th>
                {["İçerik", "Tür", "Boyut", "Durum", "Görüntüleme", "Kurslar", "AI", ""].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${c.border}`, background: selectedIds.has(item.id) ? "rgba(91,110,255,0.04)" : i % 2 ? c.card : "transparent", transition: "background 0.1s" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{TYPE_ICONS[item.type]}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{t.tr(item.title)}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                          {item.tags.map(tag => <Badge key={tag} text={tag} color="#6b7280" />)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <Badge text={TYPE_LABELS[item.type]} color={TYPE_COLORS[item.type]} />
                  </td>
                  <td style={{ padding: "14px 14px", fontSize: 12, color: c.muted }}>{item.size}</td>
                  <td style={{ padding: "14px 14px" }}><StatusDot status={item.status} /></td>
                  <td style={{ padding: "14px 14px", fontSize: 13, fontWeight: 700, color: c.text }}>{item.views.toLocaleString("tr-TR")}</td>
                  <td style={{ padding: "14px 14px", fontSize: 11, color: c.muted }}>
                    {item.assignedCourses.length > 0 ? item.assignedCourses.join(", ") : <span style={{ color: "var(--ink-2)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    {item.aiProcessed ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(168,85,247,0.25)" }}>{t.tr("🤖 AI Hazır")}</span>
                    ) : (
                      <button onClick={() => triggerAi(item.id)} disabled={aiProcessingId === item.id || item.status === "processing"} style={{
                        padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(91,110,255,0.3)", background: "rgba(91,110,255,0.08)", color: "#a5b4fc",
                        cursor: aiProcessingId === item.id ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700,
                      }}>
                        {aiProcessingId === item.id ? "⏳ İşleniyor…" : "AI İşle"}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: "14px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button title={t.tr("Önizle")} style={{ padding: "4px 8px", borderRadius: 7, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 12 }}>👁</button>
                      <button title={t.tr("Düzenle")} style={{ padding: "4px 8px", borderRadius: 7, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 12 }}>✏️</button>
                      <button title="Kursa Ata" style={{ padding: "4px 8px", borderRadius: 7, border: `1px solid ${c.border}`, background: "transparent", color: c.muted, cursor: "pointer", fontSize: 12 }}>📎</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: c.muted, fontSize: 14 }}>
              {t.tr("Arama kriterlerine uygun içerik bulunamadı.")}
            </div>
          )}
        </div>
      ) : (
        /* Grid view */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: c.bg, border: `1.5px solid ${selectedIds.has(item.id) ? c.accent : c.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }} onClick={() => toggleSelect(item.id)}>
              <div style={{ height: 100, background: `linear-gradient(135deg,${TYPE_COLORS[item.type]}22,${TYPE_COLORS[item.type]}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, position: "relative" }}>
                {TYPE_ICONS[item.type]}
                {item.aiProcessed && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.15)", padding: "2px 6px", borderRadius: 99 }}>🤖 AI</span>}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 6, lineHeight: 1.4 }}>{t.tr(item.title)}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge text={TYPE_LABELS[item.type]} color={TYPE_COLORS[item.type]} />
                  <StatusDot status={item.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: c.muted }}>
                  <span>👁 {item.views.toLocaleString("tr-TR")}</span>
                  <span>{item.uploadedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
