"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import useSWR from "swr";
import { PanelShell } from "../_components/panel-shell";
import { api } from "../api/client";
import { useI18n } from "../_i18n/use-i18n";

const folders = [
  { name: "Hafta 1 - Giriş", count: 5 },
  { name: "Hafta 2 - Muhasebe Belgeleri", count: 7 },
  { name: "Quiz / Sınavlar", count: 3 },
  { name: "VOD Kayıtları", count: 6 },
];

const archive = [
  { title: "Muhasebe Bilgi Sistemi", date: "Hafta 2", pages: 8 },
  { title: "SAT Verbal - Quiz", date: "Hafta 3", pages: 5 },
  { title: "Business German", date: "Hafta 1", pages: 10 },
];

type LiveSession = {
  id: string;
  title: string;
  scheduledAt?: string | null;
  status: string;
};

type EarningsSummary = {
  payoutAmount?: string | number;
  courseRevenue?: string | number;
  periodEnd?: string;
};

type InstructorUser = {
  id: string;
  name?: string | null;
  email: string;
  role: string;
};

type UploadItem = { name: string; size: number; type: string; url: string };

type VolunteerContentItem = {
  id: string;
  title: string;
  contentType: string;
  status: string;
  suggestedAmount?: string | null;
};

const navSections = [
  {
    title: "Eğitmen",
    items: [
      { label: "Panel", href: "/instructor", icon: "🏠" },
      { label: "Canlı Oturumlar", href: "/live", icon: "📡" },
      { label: "Akıllı Sınıf", href: "/live/smart-classroom", icon: "🎓" },
      { label: "Akıllı Tahta", href: "/whiteboard", icon: "🧠" },
      { label: "Kurslar", href: "/courses", icon: "📚" },
      { label: "Seans Rezervasyonu", href: "/booking", icon: "📅" },
      { label: "Bildirimler", href: "/notifications", icon: "🔔" },
    ],
  },
  {
    title: "İçerik & Analiz",
    items: [
      { label: "Ders İçerikleri", href: "/instructor", icon: "🗂️" },
      { label: "Kayıtlar", href: "/report-cards", icon: "🎥" },
      { label: "Sınıf Analitikleri", href: "/instructor/insights", icon: "📊" },
      { label: "Öğrenme Analitiği", href: "/instructor/analytics", icon: "🎯" },
      { label: "AI Stüdyo", href: "/instructor/ai-studio", icon: "🤖" },
      { label: "Kazanç & Ödemeler", href: "/instructor/earnings", icon: "💰" },
      { label: "Akran Değerlendirmesi", href: "/peer-review", icon: "🤝" },
      { label: "Kurs Oluşturucu", href: "/instructor/course-builder", icon: "🏗️" },
      { label: "Sınav Sonuçları", href: "/exams/results", icon: "📋" },
    ],
  },
];

// ─── Icon component ────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 } as React.CSSProperties;
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: s,
  };

  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <path d="M9 21V12h6v9" />
        </svg>
      );
    case "broadcast":
      return (
        <svg {...props}>
          <path d="M5 12.5a7 7 0 0 1 14 0" />
          <path d="M8.5 15.5a4 4 0 0 1 7 0" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
        </svg>
      );
    case "board":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M7 8h10M7 11h6" />
        </svg>
      );
    case "books":
      return (
        <svg {...props}>
          <path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13" />
          <path d="M4 19h16" />
          <path d="M9 10h6M9 14h4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "folder":
      return (
        <svg {...props}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "video":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="14" height="12" rx="2" />
          <path d="M16 10l5-3v10l-5-3V10z" />
        </svg>
      );
    case "bar-chart":
      return (
        <svg {...props}>
          <path d="M3 20h18M5 20V10m4 10V4m4 16v-7m4 7v-4" />
        </svg>
      );
    case "target":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case "robot":
      return (
        <svg {...props}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M12 3v5M9 3h6" />
          <circle cx="9" cy="14" r="1.5" />
          <circle cx="15" cy="14" r="1.5" />
          <path d="M9 18h6" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...props}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M16 13h2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="7" r="4" />
          <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        </svg>
      );
    case "hammer":
      return (
        <svg {...props}>
          <path d="M15 4l5 5-10 10H5v-5L15 4z" />
          <path d="M12 7l5 5" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "grid":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "upload":
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      );
    case "download":
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      );
    case "printer":
      return (
        <svg {...props}>
          <path d="M6 9V2h12v7" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <circle cx="18" cy="13" r="0.8" fill="currentColor" />
        </svg>
      );
    case "report":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6M9 13h6M9 17h4" />
        </svg>
      );
    case "hand":
      return (
        <svg {...props}>
          <path d="M18 11V6a2 2 0 0 0-4 0v5" />
          <path d="M14 10V4a2 2 0 0 0-4 0v6" />
          <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
          <path d="M6 14v-1.5" />
          <path d="M18 11a2 2 0 0 1 2 2v2c0 3.31-2.69 6-6 6H9a6 6 0 0 1-6-6v-.5" />
        </svg>
      );
    case "ban":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M4.93 4.93l14.14 14.14" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case "camera":
      return (
        <svg {...props}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "note":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6M9 13h6M9 17h6" />
        </svg>
      );
    case "file":
      return (
        <svg {...props}>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z" />
          <path d="M13 2v7h7" />
        </svg>
      );
    case "film":
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <path d="M7 3v18M17 3v18M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5" />
        </svg>
      );
    case "star":
      return (
        <svg {...props}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...props}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "share":
      return (
        <svg {...props}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
        </svg>
      );
    case "trash":
      return (
        <svg {...props}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      );
    case "live":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M8 12a4 4 0 0 1 8 0" />
          <path d="M5 12a7 7 0 0 1 14 0" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...props}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function InstructorHubPage() {
  const t = useI18n();
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [activeFolder, setActiveFolder] = useState(folders[0]?.name ?? "Hafta 1 - Giriş");
  const [uploadNote, setUploadNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");

  // Gerçek API — canlı oturumlar
  const { data: liveSessions } = useSWR<LiveSession[]>("/live/sessions", api, { revalidateOnFocus: false });
  // Gerçek API — kazanç özeti (kendi instructor ID'si ile)
  const { data: meData } = useSWR<InstructorUser>("/auth/profile", api, { revalidateOnFocus: false });
  const { data: earningsSummary } = useSWR<EarningsSummary>(
    meData?.id ? `/instructor-payments/admin/${meData.id}/summary` : null,
    api,
    { revalidateOnFocus: false }
  );
  const { data: volunteerItems } = useSWR<VolunteerContentItem[]>(
    "/volunteer-contents/me",
    api,
    { revalidateOnFocus: false }
  );

  const approvalQueue = (volunteerItems ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    detail: v.contentType,
    amount: v.suggestedAmount ?? "0 ₺",
    status: v.status === "PENDING" ? "Onay bekliyor" : v.status === "APPROVED" ? "Onaylandı" : "Reddedildi",
  }));

  const todaySessions = (liveSessions ?? [])
    .filter((s) => s.status === "RUNNING" || s.status === "SCHEDULED")
    .slice(0, 5)
    .map((s) => ({
      time: s.scheduledAt ? new Date(s.scheduledAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—",
      title: s.title,
      room: `/live/${s.id}`,
    }));

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const res = await fetch("/api/uploads?category=materials");
      const data = (await res.json()) as UploadItem[];
      setFiles(data);
    } catch (err) {
      console.error("Load files failed", err);
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) return;
    try {
      setLoading(true);
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        await fetch("/api/uploads?category=materials", { method: "POST", body: form });
      }
      await loadFiles();
      setUploadNote(`${list.length} ${t.tr("dosya yüklendi.")}`);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function removeFile(name: string) {
    try {
      await fetch(`/api/uploads?category=materials&name=${encodeURIComponent(name)}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.name !== name));
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  const sendApprovalRequest = (kind: "Gönüllü Ek Süre" | "Bonus Ödül") => {
    if (!approvalNote.trim()) {
      setApprovalMessage(t.tr("Lütfen kısa bir açıklama ekleyin."));
      return;
    }
    setApprovalMessage(`${t.tr("Talebiniz iletildi")}: ${kind}. ${t.tr("Yönetici onayı sonrası kesinleşir.")}`);
    setApprovalNote("");
  };

  return (
    <PanelShell
      roleLabel={t.roles.instructor}
      userName={t.instructor.title}
      userSub={t.instructor.subtitle}
      navSections={navSections}
    >
      <style>{`
        .inst-page-wrap { display: flex; flex-direction: column; gap: 24px; }

        .inst-hero {
          background: color-mix(in srgb, var(--accent) 5%, var(--panel));
          border: 1.5px solid var(--line);
          border-radius: var(--r-xl);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }

        .inst-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          max-width: 480px;
        }
        @media (max-width: 640px) {
          .inst-metrics-grid { grid-template-columns: 1fr; }
        }

        .inst-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

        .inst-two-col {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 768px) {
          .inst-two-col { grid-template-columns: 1fr; }
        }

        .inst-panel-lg {
          display: grid;
          gap: 16px;
          grid-template-columns: 1.1fr 0.9fr;
        }
        @media (max-width: 1024px) {
          .inst-panel-lg { grid-template-columns: 1fr; }
        }

        .inst-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .inst-ctrl-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .inst-folders-layout {
          display: grid;
          gap: 16px;
          grid-template-columns: 240px 1fr;
        }
        @media (max-width: 768px) {
          .inst-folders-layout { grid-template-columns: 1fr; }
        }

        .inst-archive-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 768px) {
          .inst-archive-grid { grid-template-columns: 1fr; }
        }

        .inst-instructors-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 768px) {
          .inst-instructors-grid { grid-template-columns: 1fr; }
        }

        .inst-card {
          background: var(--panel);
          border: 1.5px solid var(--line);
          border-radius: var(--r-xl);
          padding: 16px;
          box-shadow: var(--shadow-sm);
        }

        .inst-inner-card {
          background: color-mix(in srgb, var(--accent) 4%, var(--panel));
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          padding: 12px;
        }

        .inst-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--line);
          border-radius: var(--r-sm);
          background: var(--panel);
          color: var(--ink);
          font-size: 12px;
          font-weight: 500;
          padding: 5px 12px;
          cursor: pointer;
          transition: border-color var(--t-fast), background var(--t-fast), transform var(--t-fast);
          text-decoration: none;
          white-space: nowrap;
        }
        .inst-btn:hover {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 8%, var(--panel));
          transform: translateY(-1px);
        }

        .inst-btn-danger {
          color: #e05252;
          border-color: color-mix(in srgb, #e05252 30%, var(--line));
        }
        .inst-btn-danger:hover {
          background: color-mix(in srgb, #e05252 8%, var(--panel));
          border-color: #e05252;
        }

        .inst-btn-success {
          color: #22c55e;
          border-color: color-mix(in srgb, #22c55e 30%, var(--line));
        }
        .inst-btn-success:hover {
          background: color-mix(in srgb, #22c55e 8%, var(--panel));
          border-color: #22c55e;
        }

        .inst-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          background: color-mix(in srgb, var(--accent) 10%, var(--panel));
          color: var(--accent);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--line));
        }

        .inst-pill-warning {
          background: color-mix(in srgb, #f59e0b 10%, var(--panel));
          color: #b45309;
          border-color: color-mix(in srgb, #f59e0b 30%, var(--line));
        }

        .inst-pill-neutral {
          background: color-mix(in srgb, var(--muted) 20%, var(--panel));
          color: var(--ink-2);
          border-color: var(--line);
        }

        .inst-session-row {
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          background: var(--panel);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: border-color var(--t-fast);
        }
        .inst-session-row:hover { border-color: var(--accent); }

        .inst-tool-card {
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          background: var(--panel);
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          text-decoration: none;
          color: var(--ink);
          transition: border-color var(--t-fast), transform var(--t-fast), box-shadow var(--t-fast);
        }
        .inst-tool-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .inst-tool-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--r-md);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--t-fast);
        }
        .inst-tool-card:hover .inst-tool-icon { transform: scale(1.1); }

        .inst-folder-btn {
          width: 100%;
          text-align: left;
          border: 1px solid var(--line);
          border-radius: var(--r-sm);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          background: var(--panel);
          color: var(--ink);
          font-size: 13px;
          transition: border-color var(--t-fast), background var(--t-fast);
        }
        .inst-folder-btn:hover {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 6%, var(--panel));
        }
        .inst-folder-btn.active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 10%, var(--panel));
          color: var(--accent);
        }

        .inst-file-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--line);
          gap: 8px;
        }
        .inst-file-row:last-child { border-bottom: none; }

        .inst-archive-card {
          background: var(--panel);
          border: 1.5px solid var(--line);
          border-radius: var(--r-xl);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: transform var(--t-fast), box-shadow var(--t-fast);
        }
        .inst-archive-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .inst-instructor-card {
          background: var(--panel);
          border: 1.5px solid var(--line);
          border-radius: var(--r-xl);
          padding: 16px;
          box-shadow: var(--shadow-sm);
          transition: border-color var(--t-fast);
        }
        .inst-instructor-card:hover {
          border-color: var(--accent-2);
        }

        .inst-skeleton {
          background: var(--line);
          border-radius: var(--r-sm);
          animation: inst-pulse 1.5s ease-in-out infinite;
        }
        @keyframes inst-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .inst-textarea {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: var(--r-sm);
          background: var(--panel);
          color: var(--ink);
          font-size: 13px;
          padding: 8px;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color var(--t-fast);
          outline: none;
          font-family: inherit;
        }
        .inst-textarea:focus { border-color: var(--accent); }

        .inst-drop-zone {
          border: 1.5px dashed var(--line);
          border-radius: var(--r-md);
          background: color-mix(in srgb, var(--muted) 5%, var(--panel));
          padding: 12px;
          font-size: 12px;
          color: var(--ink-2);
          text-align: center;
        }
      `}</style>

      <div className="inst-page-wrap">
        {/* ── HERO ───────────────────────────────────────────────── */}
        <header className="inst-hero">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="inst-pill">{t.roles.instructor}</div>
            <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.3, color: "var(--ink)", margin: 0 }}>
              {t.tr("Dersini yönet, içeriğini büyüt")}
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 540, margin: 0 }}>
              {t.tr("Canlı ders, akıllı tahta ve içerik yönetimi tek ekranda. Öğrenci iletişimi, kayıt ve raporlama burada.")}
            </p>
            <div className="inst-metrics-grid">
              <Metric label={t.tr("Bugünkü ders")} value="3" iconName="broadcast" />
              <Metric label={t.tr("Güncel memnuniyet")} value="4.8/5" iconName="star" />
              <Metric label={t.tr("İçerik kuyruğu")} value="7" iconName="pencil" />
            </div>
            <div className="inst-hero-actions">
              <Link className="inst-btn" href="/whiteboard">
                <Icon name="board" size={13} />
                {t.tr("Akıllı Tahtayı Aç")}
              </Link>
              <Link className="inst-btn" href="/live/abc">
                <Icon name="live" size={13} />
                {t.tr("Canlı Oda")}
              </Link>
              <Link className="inst-btn" href="/report-cards">
                <Icon name="video" size={13} />
                {t.tr("Kayıt & VOD")}
              </Link>
            </div>
          </div>
        </header>

        {/* ── TODAY + QUICK TOOLS ─────────────────────────────────── */}
        <section className="inst-two-col">
          {/* Today */}
          <div className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeading title={t.tr("Bugün")} badge={t.tr("Canlı program")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {todaySessions.map((s) => (
                <div key={s.time} className="inst-session-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 4,
                      height: 32,
                      borderRadius: 4,
                      background: "linear-gradient(180deg,#34d399,#22d3ee)",
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{t.tr(s.title)}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{s.time} · 45 dk</div>
                    </div>
                  </div>
                  <Link className="inst-btn inst-btn-success" href={s.room}>
                    <Icon name="live" size={11} />
                    {t.tr("Gir")}
                  </Link>
                </div>
              ))}
              {todaySessions.length === 0 && (
                <div style={{
                  border: "1.5px dashed var(--line)",
                  borderRadius: "var(--r-md)",
                  padding: 16,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <Icon name="calendar" size={22} />
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{t.tr("Bugün planlanmış ders yok")}</div>
                  <Link href="/live" style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    {t.tr("Canlı oturumları gör")} <Icon name="arrow-right" size={11} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick tools */}
          <div className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeading title={t.tr("Hızlı araçlar")} badge={t.tr("Tek tık")} />
            <div className="inst-tools-grid">
              {[
                { iconName: "board", label: "Akıllı Tahta", href: "/whiteboard", grad: "linear-gradient(135deg,#a78bfa,#9333ea)" },
                { iconName: "broadcast", label: "Canlı Yayın", href: "/live/abc", grad: "linear-gradient(135deg,#fb7185,#f97316)" },
                { iconName: "books", label: "Kurslar", href: "/courses", grad: "linear-gradient(135deg,#60a5fa,#22d3ee)" },
                { iconName: "video", label: "Kayıtlar", href: "/report-cards", grad: "linear-gradient(135deg,#34d399,#2dd4bf)" },
              ].map((tool) => (
                <Link key={t.tr(tool.label)} href={tool.href} className="inst-tool-card">
                  <div className="inst-tool-icon" style={{ background: tool.grad }}>
                    <span style={{ color: "#fff", display: "flex" }}>
                      <Icon name={tool.iconName} size={20} />
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{t.tr(tool.label)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLASS CONTROLS + EARNINGS ───────────────────────────── */}
        <section className="inst-panel-lg">
          {/* Virtual classroom controls */}
          <div className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeading title={t.tr("Sanal Sınıf Kontrolü")} badge="v2110" />
            <div className="inst-ctrl-grid">
              {[
                { iconName: "hand", label: "Söz Ver", variant: "" },
                { iconName: "ban", label: "İzni Reddet", variant: "danger" },
                { iconName: "monitor", label: "Ekran Gör", variant: "" },
                { iconName: "camera", label: "Kamera Aç", variant: "" },
                { iconName: "check", label: "Yoklama Al", variant: "success" },
                { iconName: "note", label: "Ders Notu", variant: "" },
              ].map((b) => (
                <button
                  key={t.tr(b.label)}
                  className={`inst-btn${b.variant === "danger" ? " inst-btn-danger" : b.variant === "success" ? " inst-btn-success" : ""}`}
                  style={{ justifyContent: "center" }}
                >
                  <Icon name={b.iconName} size={13} />
                  {t.tr(b.label)}
                </button>
              ))}
            </div>
            <div className="inst-inner-card" style={{ fontSize: 12, color: "var(--ink-2)" }}>
              {t.tr("Ders sırasında yetki ve iletişim kontrolleri burada. Tüm eylemler kayıt altına alınır.")}
            </div>
          </div>

          {/* Earnings */}
          <div className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionHeading title={t.tr("Kazanç & Cüzdan")} badge="Finans" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  label: "Bu dönem hakediş",
                  value: earningsSummary?.payoutAmount != null
                    ? `₺${Number(earningsSummary.payoutAmount).toLocaleString("tr-TR")}`
                    : "—",
                },
                {
                  label: "Toplam kurs geliri",
                  value: earningsSummary?.courseRevenue != null
                    ? `₺${Number(earningsSummary.courseRevenue).toLocaleString("tr-TR")}`
                    : "—",
                },
                {
                  label: "Dönem sonu",
                  value: earningsSummary?.periodEnd
                    ? new Date(earningsSummary.periodEnd).toLocaleDateString("tr-TR")
                    : "—",
                },
              ].map((w) => (
                <div key={t.tr(w.label)} style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--panel)",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{t.tr(w.label)}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{w.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }}>
                <Icon name="wallet" size={12} />
                {t.tr("Ödeme Talebi")}
              </button>
              <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }}>
                <Icon name="bar-chart" size={12} />
                {t.tr("Hareketler")}
              </button>
            </div>
            <div className="inst-inner-card" style={{ fontSize: 12, color: "var(--ink-2)" }}>
              {t.tr("Ödemeler yönetici onayıyla kesinleşir. Gönüllü uzatmalar ücretlendirilmez; bonus/hediye ödemeleri yönetici tarafından onaylanır.")}
            </div>

            {/* Approval queue */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{t.tr("Onay süreci")}</div>
              {approvalQueue.map((item) => (
                <div key={item.id} style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--panel)",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.tr(item.title)}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{item.detail}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-2)" }}>Kod: {item.id}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>{item.amount}</div>
                    <span className={`inst-pill ${item.status === "Onay bekliyor" ? "inst-pill-warning" : "inst-pill-neutral"}`}>
                      {t.tr(item.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Create request */}
            <div style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--panel)",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{t.tr("Talep oluştur")}</div>
              <textarea
                className="inst-textarea"
                rows={3}
                placeholder={t.tr("Örn: Ders sonunda öğrencinin talebiyle +15 dk ek süre. (Gönüllü / Bonus)")}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
              />
              {approvalMessage ? (
                <div style={{ fontSize: 12, color: "#22c55e" }}>{approvalMessage}</div>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => sendApprovalRequest("Gönüllü Ek Süre")}>
                  {t.tr("Gönüllü bildirim")}
                </button>
                <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => sendApprovalRequest("Bonus Ödül")}>
                  {t.tr("Bonus talebi")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTENT MANAGEMENT ──────────────────────────────────── */}
        <section className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <SectionHeading title={t.tr("Yönet • Ders İçerikleri")} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <label className="inst-btn" style={{ cursor: "pointer" }}>
                <Icon name="upload" size={13} />
                {t.tr("Yükle")}
                <input type="file" multiple style={{ display: "none" }} onChange={onUpload} />
              </label>
              <button className="inst-btn">
                <Icon name="download" size={13} />
                {t.tr("İndir")}
              </button>
              <button className="inst-btn">
                <Icon name="printer" size={13} />
                {t.tr("Yazdır")}
              </button>
              <button className="inst-btn">
                <Icon name="report" size={13} />
                {t.tr("Raporla")}
              </button>
            </div>
          </div>

          <div className="inst-folders-layout">
            {/* Folder list */}
            <div style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              background: "color-mix(in srgb, var(--muted) 4%, var(--panel))",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{t.tr("Klasörler")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {folders.map((f) => (
                  <button
                    key={t.tr(f.name)}
                    className={`inst-folder-btn${activeFolder === f.name ? " active" : ""}`}
                    onClick={() => setActiveFolder(f.name)}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="folder" size={14} />
                      {t.tr(f.name)}
                    </span>
                    <span className="inst-pill">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* File viewer */}
            <div style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              background: "color-mix(in srgb, var(--muted) 4%, var(--panel))",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.tr("Dosyalar")} • {t.tr(activeFolder)}</div>
                <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{t.tr("Sürükle-bırak ile yükleyebilirsin")}</span>
              </div>
              <div className="inst-drop-zone">
                {t.tr("Yüklemek için dosya bırak veya \"Yükle\"ye tıkla.")}
              </div>
              {uploadNote ? <div style={{ fontSize: 12, color: "#22c55e" }}>{uploadNote}</div> : null}
              {loading ? <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{t.tr("Yükleniyor...")}</div> : null}
              <div>
                {files.map((f) => (
                  <div key={t.tr(f.name)} className="inst-file-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "var(--ink-2)", display: "flex" }}>
                        <Icon name={f.type === "MP4" ? "film" : "file"} size={16} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{t.tr(f.name)}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{f.type} · {formatSize(f.size)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a className="inst-btn" href={f.url}>
                        <Icon name="download" size={11} />
                        {t.tr("İndir")}
                      </a>
                      <button className="inst-btn">
                        <Icon name="printer" size={11} />
                        {t.tr("Yazdır")}
                      </button>
                      <button className="inst-btn">
                        <Icon name="share" size={11} />
                        {t.tr("Paylaş")}
                      </button>
                      <button className="inst-btn inst-btn-danger" onClick={() => removeFile(f.name)}>
                        <Icon name="trash" size={11} />
                        {t.tr("Sil")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── WHITEBOARD ARCHIVE ──────────────────────────────────── */}
        <section className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeading title={t.tr("Tahta Arşivi")} badge={t.tr("Geçmiş dersler")} />
          <div className="inst-archive-grid">
            {archive.map((a) => (
              <div key={t.tr(a.title)} className="inst-archive-card">
                <div style={{ height: 4, background: "linear-gradient(90deg,var(--accent-2),var(--accent-3))" }} />
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{t.tr(a.title)}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{a.date} · {a.pages} sayfa</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }}>
                      <Icon name="board" size={11} />
                      {t.tr("Aç")}
                    </button>
                    <button className="inst-btn" style={{ flex: 1, justifyContent: "center" }}>
                      <Icon name="share" size={11} />
                      {t.tr("Paylaş")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FeaturedInstructors />
      </div>
    </PanelShell>
  );
}

// ─── Metric card ───────────────────────────────────────────────────────────────
function Metric({ label, value, iconName = "bar-chart" }: { label: string; value: string; iconName?: string }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1.5px solid var(--line)",
      borderRadius: "var(--r-xl)",
      padding: 12,
      boxShadow: "var(--shadow-sm)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <span style={{ color: "var(--accent)", display: "flex" }}>
        <Icon name={iconName} size={22} />
      </span>
      <div>
        <div style={{ fontSize: 11, color: "var(--ink-2)" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{
        fontSize: 14,
        fontWeight: 700,
        color: "var(--ink)",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{
          width: 4,
          height: 20,
          borderRadius: 4,
          background: "linear-gradient(180deg,var(--accent-2),var(--accent))",
          display: "inline-block",
          flexShrink: 0,
        }} />
        {title}
      </h2>
      {badge && (
        <span style={{
          borderRadius: 99,
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          background: "color-mix(in srgb, var(--accent) 10%, var(--panel))",
          color: "var(--accent)",
          border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--line))",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Format file size ──────────────────────────────────────────────────────────
function formatSize(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Featured instructors ──────────────────────────────────────────────────────
function FeaturedInstructors() {
  const t = useI18n();
  const { data: users, isLoading } = useSWR<InstructorUser[]>("/users", api, { revalidateOnFocus: false });
  const instructors = (users ?? []).filter((u) => u.role === "INSTRUCTOR").slice(0, 6);

  return (
    <section className="inst-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeading title={t.tr("Ekipte eğitmenler")} />
        <Link className="inst-btn" href="/instructor/insights">
          <Icon name="users" size={12} />
          {t.tr("Baş eğitmen görünümü")}
        </Link>
      </div>

      {isLoading && (
        <div className="inst-instructors-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--panel)",
              border: "1.5px solid var(--line)",
              borderRadius: "var(--r-xl)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div className="inst-skeleton" style={{ height: 14, width: "66%" }} />
              <div className="inst-skeleton" style={{ height: 11, width: "50%" }} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && instructors.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{t.tr("Kayıtlı eğitmen bulunamadı.")}</div>
      )}

      {!isLoading && instructors.length > 0 && (
        <div className="inst-instructors-grid">
          {instructors.map((f) => (
            <div key={f.id} className="inst-instructor-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,var(--accent-2),var(--accent-3))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {(f.name ?? f.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name ?? f.email}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.email}
                  </div>
                </div>
                <span style={{
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  background: "color-mix(in srgb, var(--accent) 10%, var(--panel))",
                  color: "var(--accent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--line))",
                  flexShrink: 0,
                }}>
                  {t.tr("Eğitmen")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link className="inst-btn" href="/whiteboard" style={{ flex: 1, justifyContent: "center" }}>
                  <Icon name="board" size={11} />
                  {t.tr("Tahta")}
                </Link>
                <Link className="inst-btn" href="/live" style={{ flex: 1, justifyContent: "center" }}>
                  <Icon name="live" size={11} />
                  {t.tr("Canlı")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
