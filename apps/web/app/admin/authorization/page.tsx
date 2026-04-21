"use client";
import React, { useState, useMemo } from "react";
import { useI18n } from '../../_i18n/use-i18n';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
type Role = "admin" | "head-instructor" | "instructor" | "student" | "guardian";
type PermLevel = "full" | "limited" | "none";
type AuthTab = "matrix" | "users" | "roles" | "sessions" | "2fa" | "api-keys" | "audit" | "ip";

interface UserAuth {
  id: string; name: string; email: string; role: Role;
  status: "active" | "suspended" | "locked";
  lastLogin: string; twoFa: boolean; sessions: number;
  avatar: string;
}
interface Session {
  id: string; userId: string; userName: string; device: string;
  ip: string; location: string; startedAt: string; lastActive: string; current: boolean;
}
interface ApiKey {
  id: string; name: string; prefix: string; createdAt: string;
  lastUsed: string; permissions: string[]; active: boolean;
}
interface AuditLog {
  id: string; action: string; user: string; target: string;
  ip: string; timestamp: string; severity: "info" | "warning" | "critical";
}

/* ─────────────────────────────────────────────────────────────────────────────
   Role Config
───────────────────────────────────────────────────────────────────────────── */
const ROLE_CONFIG: Record<Role, {
  label: string; labelEn: string; desc: string;
  color: string; bg: string; border: string; icon: string;
}> = {
  admin: {
    label: "Yönetici", labelEn: "Admin",
    desc: "Platform üzerinde tam yetkiye sahip süper kullanıcı. Sistem ayarları, tüm kullanıcı işlemleri ve güvenlik yönetimi.",
    color: "#c084fc", bg: "#c084fc12", border: "#c084fc30", icon: "🛡️",
  },
  "head-instructor": {
    label: "Başeğitmen", labelEn: "Head Instructor",
    desc: "Eğitmenleri yönetir, müfredat oluşturur ve onaylar, kurumun pedagojik kalitesinden sorumludur.",
    color: "#f59e0b", bg: "#f59e0b12", border: "#f59e0b30", icon: "🎓",
  },
  instructor: {
    label: "Eğitmen", labelEn: "Instructor",
    desc: "Kendi kurslarını ve öğrencilerini yönetir, canlı ders açar, içerik yükler.",
    color: "#60a5fa", bg: "#60a5fa12", border: "#60a5fa30", icon: "📚",
  },
  student: {
    label: "Öğrenci", labelEn: "Student",
    desc: "Kurslara katılır, ilerleme kaydeder, sınav girer ve sertifika alır.",
    color: "#34d399", bg: "#34d39912", border: "#34d39930", icon: "✏️",
  },
  guardian: {
    label: "Veli", labelEn: "Guardian",
    desc: "Bağlı öğrencilerin ilerlemesini ve raporlarını görüntüler, eğitmen ile iletişime geçer.",
    color: "#94a3b8", bg: "#94a3b812", border: "#94a3b830", icon: "👨‍👩‍👧",
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Permission Matrix Data
   Rows = permission categories + items
   Cols = roles
───────────────────────────────────────────────────────────────────────────── */
interface PermGroup {
  category: string;
  icon: string;
  items: {
    key: string;
    label: string;
    levels: Record<Role, PermLevel>;
  }[];
}

const PERM_MATRIX: PermGroup[] = [
  {
    category: "Kurs Yönetimi", icon: "📖",
    items: [
      { key: "course_create",   label: "Kurs Oluşturma",          levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "course_edit",     label: "Kurs Düzenleme",           levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "course_delete",   label: "Kurs Silme",               levels: { admin: "full", "head-instructor": "full", instructor: "none",    student: "none", guardian: "none" } },
      { key: "course_publish",  label: "Kurs Yayınlama/Onaylama",  levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "course_enroll",   label: "Öğrenci Kaydetme",         levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "course_view",     label: "Kurs İçeriğine Erişim",    levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "full",    guardian: "limited" } },
    ],
  },
  {
    category: "Canlı Ders", icon: "🎥",
    items: [
      { key: "live_create",  label: "Ders Oluşturma",            levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none", guardian: "none" } },
      { key: "live_host",    label: "Ders Yönetimi (Host)",      levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none", guardian: "none" } },
      { key: "live_join",    label: "Derse Katılma",             levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "full",    guardian: "limited" } },
      { key: "live_record",  label: "Ders Kaydı",                levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "live_smart",   label: "Akıllı Sınıf Araçları",     levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "limited", guardian: "none" } },
      { key: "live_whiteboard", label: "Ortak Tahta Kullanımı",  levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "limited", guardian: "none" } },
    ],
  },
  {
    category: "Sınav & Ödev", icon: "📝",
    items: [
      { key: "exam_create",  label: "Sınav/Ödev Oluşturma",     levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none",    guardian: "none" } },
      { key: "exam_take",    label: "Sınava Girme",              levels: { admin: "none", "head-instructor": "none", instructor: "none",   student: "full",    guardian: "none" } },
      { key: "exam_grade",   label: "Notlandırma",               levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none",    guardian: "none" } },
      { key: "exam_results", label: "Sonuçları Görüntüleme",     levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "limited", guardian: "limited" } },
      { key: "exam_adaptive",label: "Uyarlamalı Sınav",         levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "full",    guardian: "none" } },
    ],
  },
  {
    category: "Sertifika", icon: "🏆",
    items: [
      { key: "cert_issue",   label: "Sertifika Düzenleme",       levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none",    guardian: "none" } },
      { key: "cert_view",    label: "Sertifika Görüntüleme",     levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "full",    guardian: "limited" } },
      { key: "cert_revoke",  label: "Sertifika İptal",           levels: { admin: "full", "head-instructor": "full", instructor: "none",    student: "none",    guardian: "none" } },
      { key: "cert_renew",   label: "Yenileme Talebi",           levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "full",    guardian: "none" } },
    ],
  },
  {
    category: "Analitik & Raporlar", icon: "📊",
    items: [
      { key: "analytics_platform", label: "Platform Analitiği",  levels: { admin: "full",    "head-instructor": "full",    instructor: "none",    student: "none",    guardian: "none" } },
      { key: "analytics_course",   label: "Kurs Analitiği",      levels: { admin: "full",    "head-instructor": "full",    instructor: "full",    student: "none",    guardian: "none" } },
      { key: "analytics_student",  label: "Öğrenci Analitiği",   levels: { admin: "full",    "head-instructor": "full",    instructor: "limited", student: "limited", guardian: "limited" } },
      { key: "analytics_export",   label: "Rapor Dışa Aktarma",  levels: { admin: "full",    "head-instructor": "full",    instructor: "limited", student: "none",    guardian: "none" } },
      { key: "analytics_ai",       label: "AI Öngörü Raporları", levels: { admin: "full",    "head-instructor": "full",    instructor: "limited", student: "none",    guardian: "none" } },
    ],
  },
  {
    category: "Kullanıcı Yönetimi", icon: "👥",
    items: [
      { key: "user_invite",   label: "Kullanıcı Davet Etme",     levels: { admin: "full", "head-instructor": "full",    instructor: "none",    student: "none",    guardian: "none" } },
      { key: "user_roles",    label: "Rol Atama",                 levels: { admin: "full", "head-instructor": "limited", instructor: "none",    student: "none",    guardian: "none" } },
      { key: "user_suspend",  label: "Hesap Askıya Alma",         levels: { admin: "full", "head-instructor": "limited", instructor: "none",    student: "none",    guardian: "none" } },
      { key: "user_view",     label: "Kullanıcı Profil Görme",   levels: { admin: "full", "head-instructor": "full",    instructor: "limited", student: "none",    guardian: "limited" } },
      { key: "guardian_link", label: "Veli-Öğrenci Bağlama",     levels: { admin: "full", "head-instructor": "full",    instructor: "none",    student: "none",    guardian: "none" } },
    ],
  },
  {
    category: "İçerik Kütüphanesi", icon: "📁",
    items: [
      { key: "content_upload",  label: "Dosya Yükleme",           levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none", guardian: "none" } },
      { key: "content_delete",  label: "İçerik Silme",            levels: { admin: "full", "head-instructor": "full", instructor: "limited", student: "none", guardian: "none" } },
      { key: "content_library", label: "Paylaşılan Kütüphane",    levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "limited", guardian: "none" } },
      { key: "content_ai",      label: "AI İçerik Üretimi",       levels: { admin: "full", "head-instructor": "full", instructor: "full",    student: "none", guardian: "none" } },
    ],
  },
  {
    category: "Sistem Ayarları", icon: "⚙️",
    items: [
      { key: "sys_config",   label: "Platform Konfigürasyonu",   levels: { admin: "full", "head-instructor": "none", instructor: "none",    student: "none", guardian: "none" } },
      { key: "sys_security", label: "Güvenlik Yönetimi",         levels: { admin: "full", "head-instructor": "none", instructor: "none",    student: "none", guardian: "none" } },
      { key: "sys_integr",   label: "Entegrasyon / SSO / LTI",   levels: { admin: "full", "head-instructor": "none", instructor: "none",    student: "none", guardian: "none" } },
      { key: "sys_ai",       label: "AI Güvenlik & Ajanlar",     levels: { admin: "full", "head-instructor": "none", instructor: "none",    student: "none", guardian: "none" } },
      { key: "sys_billing",  label: "Ödeme & Abonelik",          levels: { admin: "full", "head-instructor": "none", instructor: "none",    student: "none", guardian: "none" } },
      { key: "sys_audit",    label: "Denetim Günlüğü",           levels: { admin: "full", "head-instructor": "limited", instructor: "none", student: "none", guardian: "none" } },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Demo Data
───────────────────────────────────────────────────────────────────────────── */
const DEMO_USERS: UserAuth[] = [
  { id: "u1", name: "Ahmet Yılmaz",   email: "ahmet@atlasio.com",   role: "admin",            status: "active",    lastLogin: "2026-04-21 08:42", twoFa: true,  sessions: 2, avatar: "AY" },
  { id: "u2", name: "Fatma Kaya",     email: "fatma@atlasio.com",   role: "head-instructor",  status: "active",    lastLogin: "2026-04-21 07:15", twoFa: true,  sessions: 1, avatar: "FK" },
  { id: "u3", name: "Murat Şahin",    email: "murat@atlasio.com",   role: "head-instructor",  status: "active",    lastLogin: "2026-04-20 18:40", twoFa: true,  sessions: 1, avatar: "MŞ" },
  { id: "u4", name: "Zeynep Arslan",  email: "zeynep@atlasio.com",  role: "instructor",        status: "active",    lastLogin: "2026-04-21 09:00", twoFa: true,  sessions: 2, avatar: "ZA" },
  { id: "u5", name: "Selin Çelik",    email: "selin@atlasio.com",   role: "instructor",        status: "active",    lastLogin: "2026-04-21 09:00", twoFa: false, sessions: 1, avatar: "SÇ" },
  { id: "u6", name: "Emre Doğan",     email: "emre@atlasio.com",    role: "instructor",        status: "suspended", lastLogin: "2026-04-10 11:00", twoFa: false, sessions: 0, avatar: "ED" },
  { id: "u7", name: "Mehmet Demir",   email: "mehmet@atlasio.com",  role: "student",           status: "active",    lastLogin: "2026-04-21 08:00", twoFa: false, sessions: 1, avatar: "MD" },
  { id: "u8", name: "Elif Yıldız",    email: "elif@atlasio.com",    role: "student",           status: "active",    lastLogin: "2026-04-20 19:30", twoFa: false, sessions: 1, avatar: "EY" },
  { id: "u9", name: "Can Öztürk",     email: "can@atlasio.com",     role: "student",           status: "locked",    lastLogin: "2026-04-15 14:22", twoFa: false, sessions: 0, avatar: "CÖ" },
  { id: "u10",name: "Hüseyin Polat",  email: "huseyin@atlasio.com", role: "guardian",          status: "active",    lastLogin: "2026-04-19 20:10", twoFa: false, sessions: 1, avatar: "HP" },
  { id: "u11",name: "Ayşe Kır",       email: "ayse@atlasio.com",    role: "guardian",          status: "active",    lastLogin: "2026-04-18 17:45", twoFa: false, sessions: 1, avatar: "AK" },
];

const DEMO_SESSIONS = [
  { id: "s1", userId: "u1", userName: "Ahmet Yılmaz",  device: "Chrome / macOS",    ip: "192.168.1.10", location: "İstanbul, TR", startedAt: "2026-04-21 08:42", lastActive: "2026-04-21 09:15", current: true },
  { id: "s2", userId: "u2", userName: "Fatma Kaya",    device: "Safari / iPhone",   ip: "78.162.45.33", location: "İstanbul, TR", startedAt: "2026-04-21 07:00", lastActive: "2026-04-21 09:00", current: false },
  { id: "s3", userId: "u4", userName: "Zeynep Arslan", device: "Firefox / Windows", ip: "88.230.12.67", location: "Ankara, TR",   startedAt: "2026-04-21 09:00", lastActive: "2026-04-21 09:10", current: false },
  { id: "s4", userId: "u5", userName: "Selin Çelik",   device: "Chrome / Windows",  ip: "5.26.187.44",  location: "İzmir, TR",    startedAt: "2026-04-21 08:00", lastActive: "2026-04-21 09:05", current: false },
  { id: "s5", userId: "u7", userName: "Mehmet Demir",  device: "Android Chrome",    ip: "5.26.187.45",  location: "İzmir, TR",    startedAt: "2026-04-21 07:50", lastActive: "2026-04-21 08:30", current: false },
];

const DEMO_API_KEYS = [
  { id: "k1", name: "LMS Entegrasyonu",   prefix: "atl_lms_", createdAt: "2026-01-15", lastUsed: "2026-04-21", permissions: ["courses:read", "users:read"],         active: true },
  { id: "k2", name: "Mobil Uygulama",     prefix: "atl_mob_", createdAt: "2026-02-01", lastUsed: "2026-04-20", permissions: ["courses:read", "progress:write"],      active: true },
  { id: "k3", name: "Raporlama Servisi",  prefix: "atl_rep_", createdAt: "2026-02-20", lastUsed: "2026-04-18", permissions: ["reports:read", "analytics:read"],      active: true },
  { id: "k4", name: "Eski Entegrasyon",   prefix: "atl_old_", createdAt: "2025-08-10", lastUsed: "2026-01-10", permissions: ["courses:read"],                         active: false },
];

const DEMO_AUDIT = [
  { id: "a1", action: "Kullanıcı giriş yaptı",            user: "Ahmet Yılmaz",  target: "—",                         ip: "192.168.1.10",   timestamp: "2026-04-21 08:42", severity: "info" as const },
  { id: "a2", action: "Rol değiştirildi: instructor → head-instructor", user: "Ahmet Yılmaz", target: "Fatma Kaya", ip: "192.168.1.10", timestamp: "2026-04-21 08:45", severity: "warning" as const },
  { id: "a3", action: "Hesap askıya alındı",              user: "Ahmet Yılmaz",  target: "Emre Doğan",                ip: "192.168.1.10",   timestamp: "2026-04-21 08:50", severity: "critical" as const },
  { id: "a4", action: "API anahtarı oluşturuldu",         user: "Ahmet Yılmaz",  target: "Raporlama Servisi",         ip: "192.168.1.10",   timestamp: "2026-04-20 14:00", severity: "warning" as const },
  { id: "a5", action: "Başarısız giriş denemesi (5x)",    user: "bilinmeyen",    target: "can@atlasio.com",           ip: "185.220.101.4",  timestamp: "2026-04-20 03:22", severity: "critical" as const },
  { id: "a6", action: "2FA devre dışı bırakıldı",         user: "Selin Çelik",   target: "—",                         ip: "5.26.187.44",    timestamp: "2026-04-19 10:05", severity: "warning" as const },
  { id: "a7", action: "Veli-öğrenci bağlantısı oluşturuldu", user: "Ahmet Yılmaz", target: "Hüseyin Polat → Mehmet Demir", ip: "192.168.1.10", timestamp: "2026-04-18 11:20", severity: "info" as const },
];

const IP_RULES_DEFAULT = [
  { id: "i1", range: "192.168.0.0/16",    label: "Şirket İç Ağı",        type: "allow" as const, added: "2025-10-01" },
  { id: "i2", range: "10.0.0.0/8",        label: "VPN Aralığı",           type: "allow" as const, added: "2025-11-15" },
  { id: "i3", range: "185.220.101.0/24",  label: "Şüpheli Aktivite",      type: "block" as const, added: "2026-04-20" },
  { id: "i4", range: "91.109.4.0/24",     label: "Tor Çıkış Düğümü",     type: "block" as const, added: "2026-02-10" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   SVG helper
───────────────────────────────────────────────────────────────────────────── */
function sv(ch: React.ReactNode) {
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ch}</svg>
  );
}
const ICONS = {
  matrix:  sv(<><path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z"/></>),
  users:   sv(<><circle cx="8" cy="7" r="3"/><path d="M2 18a6 6 0 0112 0"/><circle cx="15" cy="8" r="2.5"/><path d="M17 18a4 4 0 00-4-4"/></>),
  roles:   sv(<><path d="M10 2l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z"/></>),
  sessions:sv(<><rect x="2" y="3" width="16" height="12" rx="2"/><path d="M8 19h4M10 15v4"/></>),
  twofa:   sv(<><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></>),
  api:     sv(<><path d="M7 2v4M13 2v4M5 10h10a2 2 0 010 4H5a2 2 0 010-4z"/><path d="M10 14v4"/></>),
  audit:   sv(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
  ip:      sv(<><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/></>),
  check:   sv(<path d="M4 10l4 4 8-8"/>),
  x:       sv(<><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></>),
  dash:    sv(<line x1="4" y1="10" x2="16" y2="10"/>),
  plus:    sv(<><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></>),
  trash:   sv(<><polyline points="3,6 5,6 17,6"/><path d="M6 6v12a2 2 0 002 2h4a2 2 0 002-2V6M8 6V4h4v2"/></>),
  key:     sv(<><circle cx="7.5" cy="8.5" r="4"/><path d="M10.5 11.5l7 7M14 15l2 2"/></>),
  copy:    sv(<><rect x="9" y="9" width="9" height="9" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>),
};

const PERM_LEVEL_CONFIG: Record<PermLevel, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  full:    { color: "#34d399", bg: "#34d39918", icon: ICONS.check, label: "Tam" },
  limited: { color: "#f59e0b", bg: "#f59e0b18", icon: ICONS.dash,  label: "Sınırlı" },
  none:    { color: "#475569", bg: "#47556918", icon: ICONS.x,     label: "Yok" },
};

const TABS: { id: AuthTab; label: string; icon: React.ReactNode }[] = [
  { id: "matrix",   label: "İzin Matrisi",       icon: ICONS.matrix },
  { id: "users",    label: "Kullanıcı Yetkileri", icon: ICONS.users },
  { id: "roles",    label: "Rol Tanımları",       icon: ICONS.roles },
  { id: "sessions", label: "Oturumlar",           icon: ICONS.sessions },
  { id: "2fa",      label: "2FA Yönetimi",        icon: ICONS.twofa },
  { id: "api-keys", label: "API Anahtarları",     icon: ICONS.api },
  { id: "audit",    label: "Denetim Günlüğü",     icon: ICONS.audit },
  { id: "ip",       label: "IP Kısıtlamaları",    icon: ICONS.ip },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Small shared components
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: UserAuth["status"] }) {
  const t = useI18n();
  const m = { active: { l: "Aktif", c: "#34d399", b: "#34d39918" }, suspended: { l: "Askıya Alındı", c: "#f59e0b", b: "#f59e0b18" }, locked: { l: "Kilitli", c: "#f87171", b: "#f8717118" } }[status];
  return <span style={{ fontSize: 11, fontWeight: 600, color: m.c, background: m.b, borderRadius: 6, padding: "2px 8px" }}>{t.tr(m.l)}</span>;
}

function SeverityBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
  const t = useI18n();
  const m = { info: { l: "Bilgi", c: "#60a5fa", b: "#60a5fa18" }, warning: { l: "Uyarı", c: "#f59e0b", b: "#f59e0b18" }, critical: { l: "Kritik", c: "#f87171", b: "#f8717118" } }[severity];
  return <span style={{ fontSize: 11, fontWeight: 600, color: m.c, background: m.b, borderRadius: 6, padding: "2px 8px" }}>{t.tr(m.l)}</span>;
}

function PermCell({ level }: { level: PermLevel }) {
  const cfg = PERM_LEVEL_CONFIG[level];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: cfg.color, background: cfg.bg, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Generate API Key Modal
───────────────────────────────────────────────────────────────────────────── */
function GenerateKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (n: string, p: string[]) => void }) {
  const t = useI18n();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const ALL = ["courses:read","courses:write","users:read","users:write","enrollments:read","enrollments:write","reports:read","analytics:read","progress:read","progress:write"];
  const toggle = (p: string) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const valid = !!name && perms.length > 0;
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000088", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#161b2e", border:"1px solid #ffffff14", borderRadius:14, padding:28, width:420, maxWidth:"90vw" }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:16 }}>{t.tr("Yeni API Anahtarı")}</div>
        <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:6 }}>{t.tr("Anahtar Adı")}</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="ör. Mobil Uygulama v2"
          style={{ width:"100%", background:"#0a0f1e", border:"1px solid #ffffff14", borderRadius:8, color:"#e2e8f0", fontSize:13, padding:"8px 12px", marginBottom:14, boxSizing:"border-box" }} />
        <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:8 }}>{t.tr("İzinler")}</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:20 }}>
          {ALL.map(p => (
            <label key={p} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:12, color:perms.includes(p)?"#60a5fa":"#64748b" }}>
              <input type="checkbox" checked={perms.includes(p)} onChange={()=>toggle(p)} style={{ accentColor:"#3b82f6" }} />{p}
            </label>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"transparent", border:"1px solid #ffffff14", borderRadius:8, color:"#94a3b8", fontSize:13, padding:"9px 0", cursor:"pointer" }}>{t.tr("İptal")}</button>
          <button onClick={()=>{ if(valid){ onCreate(name,perms); onClose(); } }}
            style={{ flex:2, background:valid?"#3b82f6":"#3b82f640", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, padding:"9px 0", cursor:valid?"pointer":"not-allowed" }}>
            {t.tr("Oluştur")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
export default function AuthorizationPage() {
  const t = useI18n();
  const [tab, setTab] = useState<AuthTab>("matrix");
  const [users, setUsers] = useState(DEMO_USERS);
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  const [apiKeys, setApiKeys] = useState(DEMO_API_KEYS);
  const [ipRules, setIpRules] = useState(IP_RULES_DEFAULT);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [showGenKey, setShowGenKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "info" | "warning" | "critical">("all");
  const [newIp, setNewIp] = useState({ range:"", label:"", type:"block" as "allow"|"block" });
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [highlightRole, setHighlightRole] = useState<Role | null>(null);

  /* derived */
  const filteredUsers = useMemo(() => users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  }), [users, search, roleFilter]);

  const filteredAudit = useMemo(() =>
    auditFilter === "all" ? DEMO_AUDIT : DEMO_AUDIT.filter(a => a.severity === auditFilter),
    [auditFilter]);

  /* stats */
  const roleCounts = useMemo(() => {
    const c: Partial<Record<Role, number>> = {};
    users.forEach(u => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);

  const mfaCount = users.filter(u => u.twoFa).length;
  const activeCount = users.filter(u => u.status === "active").length;
  const activeKeyCount = apiKeys.filter(k => k.active).length;

  /* handlers */
  const changeRole = (id: string, role: Role) => setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  const toggleStatus = (id: string) => setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u));
  const addApiKey = (name: string, perms: string[]) => {
    const prefix = "atl_" + name.toLowerCase().replace(/\s+/g, "_").slice(0, 4) + "_";
    setApiKeys(prev => [{ id: "k" + Date.now(), name, prefix, createdAt: "2026-04-21", lastUsed: "—", permissions: perms, active: true }, ...prev]);
  };

  /* shared cell styles */
  const td: React.CSSProperties = { padding:"10px 12px", borderBottom:"1px solid #ffffff06", fontSize:13, color:"#cbd5e1", verticalAlign:"middle" };
  const th: React.CSSProperties = { padding:"8px 12px", fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid #ffffff0d", textAlign:"left" };

  /* ── MATRIX TAB helper ── */
  const roleOrder: Role[] = ["admin", "head-instructor", "instructor", "student", "guardian"];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", color:"#e2e8f0", fontFamily:"Inter, sans-serif" }}>

      {/* ─── Page Header ─── */}
      <div style={{ borderBottom:"1px solid #ffffff0d", padding:"20px 28px 0" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"#c084fc18", border:"1px solid #c084fc30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🔐</div>
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:"#e2e8f0" }}>{t.tr("Yetkilendirme Merkezi")}</div>
              <div style={{ fontSize:13, color:"#64748b" }}>{t.tr("Rol bazlı erişim kontrolü, izin matrisi ve güvenlik yönetimi")}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:2, overflowX:"auto", marginTop:16 }}>
            {TABS.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 16px", borderRadius:"8px 8px 0 0",
                  background:tab===item.id?"#161b2e":"transparent", border:"none",
                  borderTop:tab===item.id?"2px solid #c084fc":"2px solid transparent",
                  color:tab===item.id?"#c084fc":"#64748b",
                  fontSize:12.5, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {item.icon} {t.tr(item.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 28px" }}>

        {/* ─── Global Stats Row ─── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:24 }}>
          {roleOrder.map(role => {
            const cfg = ROLE_CONFIG[role];
            const cnt = roleCounts[role] ?? 0;
            return (
              <div key={role} style={{ background:"#161b2e", border:`1px solid ${cfg.border}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s" }}
                onClick={() => setHighlightRole(h => h === role ? null : role)}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>{cfg.icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:cfg.color }}>{t.tr(cfg.label)}</span>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:cfg.color }}>{cnt}</div>
                <div style={{ fontSize:11, color:"#475569" }}>{t.tr("kullanıcı")}</div>
              </div>
            );
          })}
        </div>

        {/* ──────────────────────────────────────────────────────────────────────
            MATRIX TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "matrix" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Legend */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:"#64748b", marginRight:4 }}>Açıklama:</span>
              {(["full","limited","none"] as PermLevel[]).map(lvl => {
                const cfg = PERM_LEVEL_CONFIG[lvl];
                return (
                  <span key={lvl} style={{ display:"inline-flex", alignItems:"center", gap:4, color:cfg.color, background:cfg.bg, borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:600 }}>
                    {cfg.icon} {t.tr(cfg.label)}
                  </span>
                );
              })}
              <span style={{ fontSize:12, color:"#475569", marginLeft:"auto" }}>
                {t.tr("Bir role tıklayarak öne çıkarın")}
              </span>
            </div>

            {/* Role column headers */}
            <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
              {/* Header row */}
              <div style={{ display:"grid", gridTemplateColumns:"240px repeat(5,1fr)", borderBottom:"1px solid #ffffff0d" }}>
                <div style={{ padding:"12px 16px", fontSize:11, fontWeight:600, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {t.tr("İzin / Özellik")}
                </div>
                {roleOrder.map(role => {
                  const cfg = ROLE_CONFIG[role];
                  const isHL = highlightRole === role;
                  return (
                    <div key={role} onClick={() => setHighlightRole(h => h === role ? null : role)}
                      style={{ padding:"12px 8px", textAlign:"center", cursor:"pointer", background:isHL ? `${cfg.bg}` : "transparent",
                        borderLeft:"1px solid #ffffff08", transition:"background 0.15s" }}>
                      <div style={{ fontSize:18, marginBottom:2 }}>{cfg.icon}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{t.tr(cfg.label)}</div>
                      <div style={{ fontSize:10, color:"#475569" }}>{roleCounts[role] ?? 0} kişi</div>
                    </div>
                  );
                })}
              </div>

              {/* Permission groups */}
              {PERM_MATRIX.map(group => {
                const isOpen = expandedGroup === group.category || expandedGroup === null;
                return (
                  <div key={group.category}>
                    {/* Group header */}
                    <div onClick={() => setExpandedGroup(prev => prev === group.category ? null : group.category)}
                      style={{ display:"grid", gridTemplateColumns:"240px repeat(5,1fr)", background:"#0f1626", borderTop:"1px solid #ffffff0d",
                        cursor:"pointer", userSelect:"none" }}>
                      <div style={{ padding:"10px 16px", display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color:"#94a3b8" }}>
                        <span>{group.icon}</span>
                        <span>{t.tr(group.category)}</span>
                        <span style={{ marginLeft:"auto", fontSize:10, color:"#475569" }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                      {roleOrder.map(role => {
                        const cfg = ROLE_CONFIG[role];
                        const isHL = highlightRole === role;
                        // compute summary: count full/limited
                        const fullCount = group.items.filter(i => i.levels[role] === "full").length;
                        const limCount  = group.items.filter(i => i.levels[role] === "limited").length;
                        const pct = Math.round(((fullCount + limCount * 0.5) / group.items.length) * 100);
                        return (
                          <div key={role} style={{ padding:"10px 8px", textAlign:"center", borderLeft:"1px solid #ffffff08",
                            background: isHL ? `${cfg.bg}88` : "transparent" }}>
                            <div style={{ fontSize:11, color: pct >= 80 ? "#34d399" : pct >= 40 ? "#f59e0b" : "#475569", fontWeight:600 }}>
                              {fullCount > 0 || limCount > 0 ? `${pct}%` : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Permission rows */}
                    {(expandedGroup === null || expandedGroup === group.category) && group.items.map((item, idx) => (
                      <div key={item.key} style={{ display:"grid", gridTemplateColumns:"240px repeat(5,1fr)",
                        background: idx % 2 === 0 ? "transparent" : "#ffffff03",
                        borderTop:"1px solid #ffffff04" }}>
                        <div style={{ padding:"9px 16px 9px 28px", fontSize:12.5, color:"#94a3b8" }}>{t.tr(item.label)}</div>
                        {roleOrder.map(role => {
                          const cfg = ROLE_CONFIG[role];
                          const isHL = highlightRole === role;
                          return (
                            <div key={role} style={{ padding:"7px 8px", borderLeft:"1px solid #ffffff06",
                              background: isHL ? `${cfg.bg}55` : "transparent" }}>
                              <PermCell level={item.levels[role]} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            USERS TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", borderBottom:"1px solid #ffffff0d" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0", marginRight:"auto" }}>{t.tr("Kullanıcı Yetki Yönetimi")}</div>
              {/* Role filter pills */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setRoleFilter("all")}
                  style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:6, border:"1px solid", cursor:"pointer",
                    color: roleFilter==="all" ? "#fff" : "#64748b",
                    background: roleFilter==="all" ? "#3b82f6" : "transparent",
                    borderColor: roleFilter==="all" ? "#3b82f6" : "#ffffff14" }}>
                  {t.tr("Tümü")} ({users.length})
                </button>
                {roleOrder.map(role => {
                  const cfg = ROLE_CONFIG[role];
                  const active = roleFilter === role;
                  return (
                    <button key={role} onClick={() => setRoleFilter(role)}
                      style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:6, border:"1px solid", cursor:"pointer",
                        color: active ? cfg.color : "#64748b",
                        background: active ? cfg.bg : "transparent",
                        borderColor: active ? cfg.border : "#ffffff14" }}>
                      {cfg.icon} {t.tr(cfg.label)} ({roleCounts[role] ?? 0})
                    </button>
                  );
                })}
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.tr("İsim veya e-posta ara...")}
                style={{ background:"#0a0f1e", border:"1px solid #ffffff14", borderRadius:8, color:"#e2e8f0", fontSize:13, padding:"7px 14px", width:220 }} />
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Kullanıcı","Rol","Durum","Son Giriş","2FA","Oturum","İşlemler"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const cfg = ROLE_CONFIG[u.role];
                    return (
                      <tr key={u.id} onMouseEnter={e=>(e.currentTarget.style.background="#ffffff04")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")} style={{ transition:"background 0.12s" }}>
                        <td style={td}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", background:`${cfg.bg}`, border:`1.5px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:cfg.color, flexShrink:0 }}>{u.avatar}</div>
                            <div>
                              <div style={{ fontWeight:600, color:"#e2e8f0", fontSize:13 }}>{u.name}</div>
                              <div style={{ fontSize:11, color:"#475569" }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <select value={u.role} onChange={e => changeRole(u.id, e.target.value as Role)}
                            style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:6, color:cfg.color, fontSize:12, fontWeight:600, padding:"4px 8px", cursor:"pointer" }}>
                            {roleOrder.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
                          </select>
                        </td>
                        <td style={td}><StatusBadge status={u.status} /></td>
                        <td style={{ ...td, color:"#64748b", fontSize:12 }}>{u.lastLogin}</td>
                        <td style={td}>
                          <span style={{ fontSize:12, color: u.twoFa ? "#34d399" : "#f87171" }}>{u.twoFa ? "✓ Aktif" : "✗ Pasif"}</span>
                        </td>
                        <td style={td}>
                          <span style={{ background:"#60a5fa18", color:"#60a5fa", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:600 }}>{u.sessions}</span>
                        </td>
                        <td style={td}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={() => toggleStatus(u.id)}
                              style={{ background: u.status==="active" ? "#f59e0b18" : "#34d39918", border:`1px solid ${u.status==="active"?"#f59e0b30":"#34d39930"}`, borderRadius:6, color: u.status==="active"?"#f59e0b":"#34d399", padding:"5px 8px", cursor:"pointer", fontSize:11 }}>
                              {u.status === "active" ? t.tr("Askıya Al") : t.tr("Aktifleştir")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, textAlign:"center", color:"#475569", padding:"32px" }}>{t.tr("Sonuç bulunamadı")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            ROLES TAB — detailed role cards
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "roles" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:16 }}>
            {roleOrder.map(role => {
              const cfg = ROLE_CONFIG[role];
              const cnt = roleCounts[role] ?? 0;
              // summarise permissions
              const allItems = PERM_MATRIX.flatMap(g => g.items);
              const fullPerms = allItems.filter(i => i.levels[role] === "full");
              const limitedPerms = allItems.filter(i => i.levels[role] === "limited");
              return (
                <div key={role} style={{ background:"#161b2e", border:`1.5px solid ${cfg.border}`, borderRadius:14, padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:cfg.bg, border:`1.5px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{cfg.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ fontSize:15, fontWeight:700, color:cfg.color }}>{t.tr(cfg.label)}</div>
                        <span style={{ fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg, borderRadius:6, padding:"2px 8px" }}>{cnt} {t.tr("kişi")}</span>
                      </div>
                      <div style={{ fontSize:11, color:"#64748b", marginTop:3, lineHeight:1.5 }}>{cfg.desc}</div>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {PERM_MATRIX.map(group => {
                      const full = group.items.filter(i => i.levels[role] === "full").length;
                      const lim  = group.items.filter(i => i.levels[role] === "limited").length;
                      const none = group.items.filter(i => i.levels[role] === "none").length;
                      const total = group.items.length;
                      return (
                        <div key={group.category}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                            <span style={{ fontSize:11, color:"#64748b" }}>{group.icon} {t.tr(group.category)}</span>
                            <span style={{ fontSize:10, color:"#475569" }}>{full}/{total}</span>
                          </div>
                          <div style={{ height:5, background:"#ffffff08", borderRadius:3, overflow:"hidden", display:"flex" }}>
                            <div style={{ width:`${(full/total)*100}%`, background:cfg.color, opacity:1 }} />
                            <div style={{ width:`${(lim/total)*100}%`, background:cfg.color, opacity:0.4 }} />
                            <div style={{ width:`${(none/total)*100}%`, background:"transparent" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Perm summary */}
                  <div style={{ borderTop:"1px solid #ffffff08", paddingTop:12 }}>
                    <div style={{ fontSize:11, color:"#475569", marginBottom:6 }}>{t.tr("Tam erişim")}: {fullPerms.length} • {t.tr("Sınırlı")}: {limitedPerms.length}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {fullPerms.slice(0,6).map(p => (
                        <span key={p.key} style={{ fontSize:10, color:cfg.color, background:cfg.bg, borderRadius:4, padding:"1px 6px" }}>{t.tr(p.label)}</span>
                      ))}
                      {fullPerms.length > 6 && <span style={{ fontSize:10, color:"#475569" }}>+{fullPerms.length - 6} {t.tr("daha")}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            SESSIONS TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "sessions" && (
          <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #ffffff0d" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{t.tr("Aktif Oturumlar")} <span style={{ fontSize:12, color:"#64748b" }}>({sessions.length})</span></div>
              <button onClick={() => setSessions(s => s.filter(x => x.current))}
                style={{ background:"#f8717118", border:"1px solid #f8717130", borderRadius:8, color:"#f87171", fontSize:12, fontWeight:600, padding:"7px 16px", cursor:"pointer" }}>
                {t.tr("Tüm Oturumları Sonlandır")}
              </button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Kullanıcı","Rol","Cihaz","IP / Konum","Başlangıç","Son Aktif","İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
                <tbody>
                  {sessions.map(s => {
                    const u = users.find(x => x.id === s.userId);
                    const cfg = u ? ROLE_CONFIG[u.role] : ROLE_CONFIG.student;
                    return (
                      <tr key={s.id}>
                        <td style={td}>
                          <div style={{ fontWeight:600, fontSize:13, color:"#e2e8f0" }}>{s.userName}</div>
                          {s.current && <span style={{ fontSize:10, color:"#34d399", background:"#34d39914", borderRadius:4, padding:"1px 6px", marginTop:2, display:"inline-block" }}>{t.tr("Bu oturum")}</span>}
                        </td>
                        <td style={td}><span style={{ fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg, borderRadius:6, padding:"2px 8px" }}>{t.tr(cfg.label)}</span></td>
                        <td style={{ ...td, fontSize:12 }}>{s.device}</td>
                        <td style={{ ...td, fontSize:12 }}>
                          <div style={{ color:"#94a3b8" }}>{s.ip}</div>
                          <div style={{ color:"#64748b", fontSize:11 }}>{s.location}</div>
                        </td>
                        <td style={{ ...td, fontSize:12, color:"#64748b" }}>{s.startedAt}</td>
                        <td style={{ ...td, fontSize:12, color:"#64748b" }}>{s.lastActive}</td>
                        <td style={td}>
                          {!s.current && (
                            <button onClick={() => setSessions(p => p.filter(x => x.id !== s.id))}
                              style={{ background:"#f8717118", border:"1px solid #f8717130", borderRadius:6, color:"#f87171", padding:"5px 10px", cursor:"pointer", fontSize:11 }}>
                              {t.tr("Sonlandır")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            2FA TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "2fa" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              {[
                { label:"2FA Aktif Kullanıcı",  value:mfaCount,             sub:`${users.length} kullanıcıdan`,          color:"#34d399" },
                { label:"2FA Pasif Kullanıcı",  value:users.length-mfaCount, sub:"güvenlik riski",                       color:"#f87171" },
                { label:"Kapsam Oranı",          value:`${Math.round(mfaCount/users.length*100)}%`, sub:"hedef: %100",   color:"#60a5fa" },
              ].map(s => (
                <div key={s.label} style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:10, padding:"16px 20px" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginTop:2 }}>{t.tr(s.label)}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{t.tr(s.sub)}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"14px 20px", borderBottom:"1px solid #ffffff0d", fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{t.tr("Kullanıcı 2FA Durumu")}</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Kullanıcı","Rol","2FA Durumu","Son Giriş","İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
                <tbody>
                  {users.map(u => {
                    const cfg = ROLE_CONFIG[u.role];
                    return (
                      <tr key={u.id}>
                        <td style={td}>
                          <div style={{ fontWeight:600 }}>{u.name}</div>
                          <div style={{ fontSize:11, color:"#64748b" }}>{u.email}</div>
                        </td>
                        <td style={td}><span style={{ fontSize:11, fontWeight:600, color:cfg.color, background:cfg.bg, borderRadius:6, padding:"2px 8px" }}>{t.tr(cfg.label)}</span></td>
                        <td style={td}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:34, height:19, borderRadius:10, background:u.twoFa?"#34d399":"#374151", position:"relative", cursor:"pointer", flexShrink:0 }}
                              onClick={() => setUsers(p => p.map(x => x.id===u.id ? {...x, twoFa:!x.twoFa} : x))}>
                              <div style={{ position:"absolute", top:2.5, left:u.twoFa?15:2.5, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
                            </div>
                            <span style={{ fontSize:12, color:u.twoFa?"#34d399":"#f87171" }}>{u.twoFa ? t.tr("Aktif") : t.tr("Pasif")}</span>
                          </div>
                        </td>
                        <td style={{ ...td, fontSize:12, color:"#64748b" }}>{u.lastLogin}</td>
                        <td style={td}>
                          {!u.twoFa && (
                            <button onClick={() => setUsers(p => p.map(x => x.id===u.id ? {...x, twoFa:true} : x))}
                              style={{ background:"#34d39918", border:"1px solid #34d39930", borderRadius:6, color:"#34d399", padding:"5px 10px", cursor:"pointer", fontSize:11 }}>
                              {t.tr("Zorunlu Kıl")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            API KEYS TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "api-keys" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:13, color:"#64748b" }}>{t.tr("Aktif")}: {activeKeyCount} / {apiKeys.length}</div>
              <button onClick={() => setShowGenKey(true)}
                style={{ display:"flex", alignItems:"center", gap:8, background:"#3b82f6", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, padding:"9px 18px", cursor:"pointer" }}>
                {ICONS.plus} {t.tr("Yeni API Anahtarı")}
              </button>
            </div>
            {apiKeys.map(k => (
              <div key={k.id} style={{ background:"#161b2e", border:`1px solid ${k.active?"#ffffff0d":"#f8717118"}`, borderRadius:12, padding:"18px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:k.active?"#3b82f618":"#f8717118", display:"flex", alignItems:"center", justifyContent:"center", color:k.active?"#60a5fa":"#f87171" }}>{ICONS.key}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{k.name}</div>
                      <div style={{ fontSize:12, color:"#64748b", fontFamily:"monospace" }}>{k.prefix}••••••••••••••••</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:600, color:k.active?"#34d399":"#f87171", background:k.active?"#34d39914":"#f8717114", borderRadius:6, padding:"2px 8px" }}>
                      {k.active ? t.tr("Aktif") : t.tr("Pasif")}
                    </span>
                    <button onClick={() => { navigator.clipboard?.writeText(k.prefix+"DEMO_KEY"); setCopiedKey(k.id); setTimeout(()=>setCopiedKey(null),2000); }}
                      style={{ background:"#ffffff08", border:"1px solid #ffffff12", borderRadius:6, color:copiedKey===k.id?"#34d399":"#94a3b8", padding:"5px 8px", cursor:"pointer" }}>
                      {copiedKey===k.id ? ICONS.check : ICONS.copy}
                    </button>
                    <button onClick={() => setApiKeys(p => p.map(x => x.id===k.id ? {...x, active:!x.active} : x))}
                      style={{ background:k.active?"#f59e0b18":"#34d39918", border:`1px solid ${k.active?"#f59e0b30":"#34d39930"}`, borderRadius:6, color:k.active?"#f59e0b":"#34d399", padding:"5px 10px", cursor:"pointer", fontSize:11 }}>
                      {k.active ? t.tr("Devre Dışı") : t.tr("Aktifleştir")}
                    </button>
                    <button onClick={() => setApiKeys(p => p.filter(x => x.id!==k.id))}
                      style={{ background:"#f8717118", border:"1px solid #f8717130", borderRadius:6, color:"#f87171", padding:"5px 8px", cursor:"pointer" }}>
                      {ICONS.trash}
                    </button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                  {k.permissions.map(p => <span key={p} style={{ fontSize:11, color:"#94a3b8", background:"#ffffff08", borderRadius:5, padding:"2px 8px", fontFamily:"monospace" }}>{p}</span>)}
                </div>
                <div style={{ display:"flex", gap:20, fontSize:11, color:"#64748b" }}>
                  <span>{t.tr("Oluşturuldu")}: <b style={{ color:"#94a3b8" }}>{k.createdAt}</b></span>
                  <span>{t.tr("Son kullanım")}: <b style={{ color:"#94a3b8" }}>{k.lastUsed}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            AUDIT TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "audit" && (
          <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #ffffff0d" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0" }}>{t.tr("Denetim Günlüğü")}</div>
              <div style={{ display:"flex", gap:6 }}>
                {(["all","info","warning","critical"] as const).map(f => (
                  <button key={f} onClick={() => setAuditFilter(f)}
                    style={{ background:auditFilter===f?"#3b82f620":"transparent", border:`1px solid ${auditFilter===f?"#3b82f640":"#ffffff0d"}`, borderRadius:7, color:auditFilter===f?"#60a5fa":"#64748b", fontSize:12, padding:"5px 12px", cursor:"pointer" }}>
                    {f==="all" ? t.tr("Tümü") : f==="info" ? t.tr("Bilgi") : f==="warning" ? t.tr("Uyarı") : t.tr("Kritik")}
                  </button>
                ))}
              </div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Zaman","Eylem","Kullanıcı","Hedef","IP","Önem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
              <tbody>
                {filteredAudit.map(a => (
                  <tr key={a.id}>
                    <td style={{ ...td, fontSize:11, color:"#64748b", whiteSpace:"nowrap" }}>{a.timestamp}</td>
                    <td style={{ ...td, fontSize:13 }}>{a.action}</td>
                    <td style={{ ...td, fontSize:12, color:"#94a3b8" }}>{a.user}</td>
                    <td style={{ ...td, fontSize:12, color:"#64748b" }}>{a.target}</td>
                    <td style={{ ...td, fontSize:11, color:"#475569", fontFamily:"monospace" }}>{a.ip}</td>
                    <td style={td}><SeverityBadge severity={a.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────────────
            IP TAB
        ────────────────────────────────────────────────────────────────────── */}
        {tab === "ip" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, padding:20 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", marginBottom:14 }}>{t.tr("Yeni IP Kuralı")}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <input value={newIp.range} onChange={e => setNewIp(p=>({...p,range:e.target.value}))} placeholder="IP / CIDR (ör. 192.168.1.0/24)"
                  style={{ flex:2, minWidth:200, background:"#0a0f1e", border:"1px solid #ffffff14", borderRadius:8, color:"#e2e8f0", fontSize:13, padding:"8px 12px", fontFamily:"monospace" }} />
                <input value={newIp.label} onChange={e => setNewIp(p=>({...p,label:e.target.value}))} placeholder={t.tr("Açıklama")}
                  style={{ flex:2, minWidth:160, background:"#0a0f1e", border:"1px solid #ffffff14", borderRadius:8, color:"#e2e8f0", fontSize:13, padding:"8px 12px" }} />
                <select value={newIp.type} onChange={e => setNewIp(p=>({...p,type:e.target.value as "allow"|"block"}))}
                  style={{ background:newIp.type==="allow"?"#34d39918":"#f8717118", border:`1px solid ${newIp.type==="allow"?"#34d39930":"#f8717130"}`, borderRadius:8, color:newIp.type==="allow"?"#34d399":"#f87171", fontSize:13, fontWeight:600, padding:"8px 14px", cursor:"pointer" }}>
                  <option value="allow">{t.tr("İzin Ver")}</option>
                  <option value="block">{t.tr("Engelle")}</option>
                </select>
                <button onClick={() => { if(newIp.range && newIp.label){ setIpRules(p=>[{id:"i"+Date.now(),...newIp,added:"2026-04-21"},...p]); setNewIp({range:"",label:"",type:"block"}); }}}
                  style={{ background:"#3b82f6", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, padding:"8px 18px", cursor:"pointer" }}>
                  {t.tr("Ekle")}
                </button>
              </div>
            </div>
            <div style={{ background:"#161b2e", border:"1px solid #ffffff0d", borderRadius:12, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>{["Tür","IP / CIDR","Açıklama","Eklenme","İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
                <tbody>
                  {ipRules.map(r => (
                    <tr key={r.id}>
                      <td style={td}>
                        <span style={{ fontSize:11, fontWeight:700, color:r.type==="allow"?"#34d399":"#f87171", background:r.type==="allow"?"#34d39914":"#f8717114", borderRadius:6, padding:"2px 8px" }}>
                          {r.type==="allow" ? t.tr("İzin") : t.tr("Engel")}
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily:"monospace", fontSize:13 }}>{r.range}</td>
                      <td style={{ ...td, fontSize:13 }}>{r.label}</td>
                      <td style={{ ...td, fontSize:12, color:"#64748b" }}>{r.added}</td>
                      <td style={td}>
                        <button onClick={() => setIpRules(p => p.filter(x => x.id!==r.id))}
                          style={{ background:"#f8717118", border:"1px solid #f8717130", borderRadius:6, color:"#f87171", padding:"5px 8px", cursor:"pointer" }}>
                          {ICONS.trash}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGenKey && <GenerateKeyModal onClose={() => setShowGenKey(false)} onCreate={addApiKey} />}
    </div>
  );
}
