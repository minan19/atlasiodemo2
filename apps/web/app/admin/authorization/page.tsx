"use client";
import React, { useState } from "react";
import { useI18n } from '../../_i18n/use-i18n';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Role = "admin" | "instructor" | "student" | "moderator" | "viewer";
type AuthTab = "users" | "roles" | "sessions" | "2fa" | "api-keys" | "audit" | "ip";

interface UserAuth {
  id: string; name: string; email: string; role: Role;
  status: "active" | "suspended" | "locked";
  lastLogin: string; twoFa: boolean; sessions: number;
  avatar: string;
}

interface Session {
  id: string; userId: string; userName: string; device: string;
  ip: string; location: string; startedAt: string; lastActive: string;
  current: boolean;
}

interface ApiKey {
  id: string; name: string; prefix: string; createdAt: string;
  lastUsed: string; permissions: string[]; active: boolean;
}

interface AuditLog {
  id: string; action: string; user: string; target: string;
  ip: string; timestamp: string; severity: "info" | "warning" | "critical";
}

/* ─── Demo Data ──────────────────────────────────────────────────────────── */
const DEMO_USERS: UserAuth[] = [
  { id: "u1", name: "Ahmet Yılmaz", email: "ahmet@atlasio.com", role: "admin", status: "active", lastLogin: "2026-03-29 08:42", twoFa: true, sessions: 2, avatar: "AY" },
  { id: "u2", name: "Fatma Kaya", email: "fatma@atlasio.com", role: "instructor", status: "active", lastLogin: "2026-03-29 07:15", twoFa: true, sessions: 1, avatar: "FK" },
  { id: "u3", name: "Mehmet Demir", email: "mehmet@atlasio.com", role: "student", status: "active", lastLogin: "2026-03-28 19:30", twoFa: false, sessions: 1, avatar: "MD" },
  { id: "u4", name: "Zeynep Arslan", email: "zeynep@atlasio.com", role: "moderator", status: "suspended", lastLogin: "2026-03-20 11:00", twoFa: false, sessions: 0, avatar: "ZA" },
  { id: "u5", name: "Can Öztürk", email: "can@atlasio.com", role: "student", status: "locked", lastLogin: "2026-03-15 14:22", twoFa: false, sessions: 0, avatar: "CÖ" },
  { id: "u6", name: "Selin Çelik", email: "selin@atlasio.com", role: "instructor", status: "active", lastLogin: "2026-03-29 09:00", twoFa: true, sessions: 3, avatar: "SÇ" },
];

const DEMO_SESSIONS: Session[] = [
  { id: "s1", userId: "u1", userName: "Ahmet Yılmaz", device: "Chrome / macOS", ip: "192.168.1.10", location: "İstanbul, TR", startedAt: "2026-03-29 08:42", lastActive: "2026-03-29 09:15", current: true },
  { id: "s2", userId: "u1", userName: "Ahmet Yılmaz", device: "Safari / iPhone", ip: "78.162.45.33", location: "İstanbul, TR", startedAt: "2026-03-29 07:00", lastActive: "2026-03-29 08:30", current: false },
  { id: "s3", userId: "u2", userName: "Fatma Kaya", device: "Firefox / Windows", ip: "88.230.12.67", location: "Ankara, TR", startedAt: "2026-03-29 07:15", lastActive: "2026-03-29 09:10", current: false },
  { id: "s4", userId: "u6", userName: "Selin Çelik", device: "Chrome / Windows", ip: "5.26.187.44", location: "İzmir, TR", startedAt: "2026-03-29 09:00", lastActive: "2026-03-29 09:18", current: false },
  { id: "s5", userId: "u6", userName: "Selin Çelik", device: "Android Chrome", ip: "5.26.187.45", location: "İzmir, TR", startedAt: "2026-03-28 20:00", lastActive: "2026-03-29 06:30", current: false },
  { id: "s6", userId: "u6", userName: "Selin Çelik", device: "Edge / Windows", ip: "212.175.88.20", location: "İzmir, TR", startedAt: "2026-03-28 18:00", lastActive: "2026-03-29 08:00", current: false },
];

const DEMO_API_KEYS: ApiKey[] = [
  { id: "k1", name: "LMS Entegrasyonu", prefix: "atl_lms_", createdAt: "2026-01-15", lastUsed: "2026-03-29", permissions: ["courses:read", "users:read"], active: true },
  { id: "k2", name: "Mobil Uygulama", prefix: "atl_mob_", createdAt: "2026-02-01", lastUsed: "2026-03-28", permissions: ["courses:read", "enrollments:write", "progress:write"], active: true },
  { id: "k3", name: "Raporlama Servisi", prefix: "atl_rep_", createdAt: "2026-02-20", lastUsed: "2026-03-25", permissions: ["reports:read", "analytics:read"], active: true },
  { id: "k4", name: "Eski Entegrasyon", prefix: "atl_old_", createdAt: "2025-08-10", lastUsed: "2026-01-10", permissions: ["courses:read"], active: false },
];

const DEMO_AUDIT: AuditLog[] = [
  { id: "a1", action: "Kullanıcı giriş yaptı", user: "Ahmet Yılmaz", target: "—", ip: "192.168.1.10", timestamp: "2026-03-29 08:42", severity: "info" },
  { id: "a2", action: "Kullanıcı rolü değiştirildi", user: "Ahmet Yılmaz", target: "Zeynep Arslan → moderator", ip: "192.168.1.10", timestamp: "2026-03-29 08:45", severity: "warning" },
  { id: "a3", action: "Hesap askıya alındı", user: "Ahmet Yılmaz", target: "Zeynep Arslan", ip: "192.168.1.10", timestamp: "2026-03-29 08:46", severity: "critical" },
  { id: "a4", action: "API anahtarı oluşturuldu", user: "Ahmet Yılmaz", target: "Raporlama Servisi", ip: "192.168.1.10", timestamp: "2026-03-28 14:00", severity: "warning" },
  { id: "a5", action: "Başarısız giriş denemesi", user: "bilinmeyen", target: "can@atlasio.com", ip: "185.220.101.4", timestamp: "2026-03-28 03:22", severity: "critical" },
  { id: "a6", action: "Şifre sıfırlama talebi", user: "Mehmet Demir", target: "—", ip: "88.230.44.12", timestamp: "2026-03-27 17:10", severity: "info" },
  { id: "a7", action: "2FA devre dışı bırakıldı", user: "Selin Çelik", target: "—", ip: "5.26.187.44", timestamp: "2026-03-27 10:05", severity: "warning" },
  { id: "a8", action: "IP kısıtlaması eklendi", user: "Ahmet Yılmaz", target: "185.220.101.0/24", ip: "192.168.1.10", timestamp: "2026-03-28 04:00", severity: "warning" },
];

/* ─── Role Config ─────────────────────────────────────────────────────────── */
const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; permissions: string[] }> = {
  admin: { label: "Admin", color: "#c084fc", bg: "#c084fc18",
    permissions: ["Tüm izinler", "Kullanıcı yönetimi", "Sistem ayarları", "API anahtarları", "Raporlar"] },
  instructor: { label: "Eğitmen", color: "#60a5fa", bg: "#60a5fa18",
    permissions: ["Kurs oluşturma", "Öğrenci görüntüleme", "Canlı ders", "İçerik yükleme"] },
  moderator: { label: "Moderatör", color: "#34d399", bg: "#34d39918",
    permissions: ["İçerik onaylama", "Yorum moderasyonu", "Gönüllü içerik"] },
  student: { label: "Öğrenci", color: "#94a3b8", bg: "#94a3b818",
    permissions: ["Kurslara erişim", "İlerleme takibi", "Sertifika görüntüleme"] },
  viewer: { label: "İzleyici", color: "#64748b", bg: "#64748b18",
    permissions: ["Salt okunur erişim"] },
};

const IP_RULES = [
  { id: "i1", range: "192.168.0.0/16", label: "Şirket İç Ağı", type: "allow", added: "2025-10-01" },
  { id: "i2", range: "10.0.0.0/8", label: "VPN Aralığı", type: "allow", added: "2025-11-15" },
  { id: "i3", range: "185.220.101.0/24", label: "Şüpheli Aktivite", type: "block", added: "2026-03-28" },
  { id: "i4", range: "91.109.4.0/24", label: "Tor Çıkış Düğümü", type: "block", added: "2026-02-10" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function sv(ch: React.ReactNode) {
  return <svg viewBox="0 0 20 20" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ch}</svg>;
}

const ICONS = {
  users: sv(<><circle cx="8" cy="7" r="3"/><path d="M2 18a6 6 0 0112 0"/><circle cx="15" cy="8" r="2.5"/><path d="M17 18a4 4 0 00-4-4"/></>),
  roles: sv(<><path d="M10 2l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z"/></>),
  sessions: sv(<><rect x="2" y="3" width="16" height="12" rx="2"/><path d="M8 19h4M10 15v4"/></>),
  twofa: sv(<><circle cx="10" cy="10" r="8"/><path d="M10 6v4l3 3"/></>),
  api: sv(<><path d="M7 2v4M13 2v4M5 10h10a2 2 0 010 4H5a2 2 0 010-4z"/><path d="M10 14v4"/></>),
  audit: sv(<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>),
  ip: sv(<><circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/></>),
  check: sv(<path d="M4 10l4 4 8-8"/>),
  x: sv(<><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></>),
  plus: sv(<><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></>),
  trash: sv(<><polyline points="3,6 5,6 17,6"/><path d="M6 6v12a2 2 0 002 2h4a2 2 0 002-2V6M8 6V4h4v2"/></>),
  refresh: sv(<><polyline points="1,4 1,10 7,10"/><path d="M3.5 15A9 9 0 1012 3c-2.7 0-5.1 1.1-6.9 2.9L1 10"/></>),
  lock: sv(<><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0v3"/><circle cx="10" cy="14" r="1.5" fill="currentColor" stroke="none"/></>),
  unlock: sv(<><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M7 9V6a3 3 0 016 0"/></>),
  key: sv(<><circle cx="7.5" cy="8.5" r="4"/><path d="M10.5 11.5l7 7M14 15l2 2"/></>),
  copy: sv(<><rect x="9" y="9" width="9" height="9" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>),
};

const TAB_ITEMS: { id: AuthTab; label: string; icon: React.ReactNode }[] = [
  { id: "users",    label: "Kullanıcı Yetkileri", icon: ICONS.users },
  { id: "roles",    label: "Rol Yönetimi",        icon: ICONS.roles },
  { id: "sessions", label: "Oturumlar",            icon: ICONS.sessions },
  { id: "2fa",      label: "2FA Yönetimi",         icon: ICONS.twofa },
  { id: "api-keys", label: "API Anahtarları",       icon: ICONS.api },
  { id: "audit",    label: "Denetim Günlüğü",      icon: ICONS.audit },
  { id: "ip",       label: "IP Kısıtlamaları",     icon: ICONS.ip },
];

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const t = useI18n();
  return (
    <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{t.tr(label)}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{t.tr(sub)}</div>
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: "active" | "suspended" | "locked" }) {
  const t = useI18n();
  const map = {
    active: { label: "Aktif", color: "#34d399", bg: "#34d39918" },
    suspended: { label: "Askıya Alındı", color: "#f59e0b", bg: "#f59e0b18" },
    locked: { label: "Kilitli", color: "#f87171", bg: "#f8717118" },
  };
  const m = map[status];
  return <span style={{ fontSize: 11, fontWeight: 600, color: m.color, background: m.bg, borderRadius: 6, padding: "2px 8px" }}>{t.tr(m.label)}</span>;
}

/* ─── Role Badge ─────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: Role }) {
  const t = useI18n();
  const r = ROLE_CONFIG[role];
  return <span style={{ fontSize: 11, fontWeight: 600, color: r.color, background: r.bg, borderRadius: 6, padding: "2px 8px" }}>{t.tr(r.label)}</span>;
}

/* ─── Severity Badge ─────────────────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
  const t = useI18n();
  const map = {
    info: { label: "Bilgi", color: "#60a5fa", bg: "#60a5fa18" },
    warning: { label: "Uyarı", color: "#f59e0b", bg: "#f59e0b18" },
    critical: { label: "Kritik", color: "#f87171", bg: "#f8717118" },
  };
  const m = map[severity];
  return <span style={{ fontSize: 11, fontWeight: 600, color: m.color, background: m.bg, borderRadius: 6, padding: "2px 8px" }}>{t.tr(m.label)}</span>;
}

/* ─── Reset Password Modal ────────────────────────────────────────────────── */
function ResetPasswordModal({ user, onClose }: { user: UserAuth; onClose: () => void }) {
  const t = useI18n();
  const [sent, setSent] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#161b2e", border: "1px solid #ffffff12", borderRadius: 14, padding: 28, width: 380, maxWidth: "90vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>{t.tr("Şifre Sıfırlama")}</div>
        {sent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#34d39914", border: "1px solid #34d39930", borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
              <span style={{ color: "#34d399" }}>{ICONS.check}</span>
              <span style={{ fontSize: 13, color: "#34d399" }}>{t.tr("Sıfırlama bağlantısı")} <b>{user.email}</b> {t.tr("adresine gönderildi.")}</span>
            </div>
            <button onClick={onClose} style={{ width: "100%", background: "#3b82f620", border: "1px solid #3b82f640", borderRadius: 8, color: "#60a5fa", fontSize: 13, fontWeight: 600, padding: "9px 0", cursor: "pointer" }}>{t.tr("Kapat")}</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}><b style={{ color: "#e2e8f0" }}>{user.name}</b> {t.tr("kullanıcısına")} ({user.email}) {t.tr("şifre sıfırlama e-postası gönderilsin mi?")}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff14", borderRadius: 8, color: "#94a3b8", fontSize: 13, padding: "9px 0", cursor: "pointer" }}>{t.tr("İptal")}</button>
              <button onClick={() => setSent(true)} style={{ flex: 2, background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 0", cursor: "pointer" }}>{t.tr("E-posta Gönder")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Generate API Key Modal ─────────────────────────────────────────────── */
function GenerateKeyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, perms: string[]) => void }) {
  const t = useI18n();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const ALL_PERMS = ["courses:read", "courses:write", "users:read", "users:write", "enrollments:read", "enrollments:write", "reports:read", "analytics:read", "progress:read", "progress:write"];
  const toggle = (p: string) => setPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#161b2e", border: "1px solid #ffffff12", borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>{t.tr("Yeni API Anahtarı")}</div>
        <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>{t.tr("Anahtar Adı")}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.tr("ör. Mobil Uygulama v2")}
          style={{ width: "100%", background: "#0a0f1e", border: "1px solid #ffffff14", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "8px 12px", marginBottom: 14, boxSizing: "border-box" }} />
        <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 8 }}>{t.tr("İzinler")}</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 }}>
          {ALL_PERMS.map(p => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: perms.includes(p) ? "#60a5fa" : "#64748b" }}>
              <input type="checkbox" checked={perms.includes(p)} onChange={() => toggle(p)} style={{ accentColor: "#3b82f6" }} />
              {p}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid #ffffff14", borderRadius: 8, color: "#94a3b8", fontSize: 13, padding: "9px 0", cursor: "pointer" }}>{t.tr("İptal")}</button>
          <button onClick={() => { if (name && perms.length) { onCreate(name, perms); onClose(); } }}
            style={{ flex: 2, background: name && perms.length ? "#3b82f6" : "#3b82f640", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 0", cursor: name && perms.length ? "pointer" : "not-allowed" }}>
            {t.tr("Oluştur")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AuthorizationPage() {
  const t = useI18n();
  const [tab, setTab] = useState<AuthTab>("users");
  const [users, setUsers] = useState(DEMO_USERS);
  const [sessions, setSessions] = useState(DEMO_SESSIONS);
  const [apiKeys, setApiKeys] = useState(DEMO_API_KEYS);
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<UserAuth | null>(null);
  const [showGenKey, setShowGenKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "info" | "warning" | "critical">("all");
  const [ipRules, setIpRules] = useState(IP_RULES);
  const [newIp, setNewIp] = useState({ range: "", label: "", type: "block" as "allow" | "block" });

  const toggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? {
      ...u, status: u.status === "active" ? "suspended" : "active"
    } : u));
  };

  const changeRole = (id: string, role: Role) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const terminateSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const addApiKey = (name: string, perms: string[]) => {
    const prefix = "atl_" + name.toLowerCase().replace(/\s+/g, "_").slice(0, 4) + "_";
    setApiKeys(prev => [{
      id: "k" + Date.now(), name, prefix, createdAt: "2026-03-29",
      lastUsed: "—", permissions: perms, active: true
    }, ...prev]);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAudit = auditFilter === "all" ? DEMO_AUDIT : DEMO_AUDIT.filter(a => a.severity === auditFilter);

  const activeUsers = users.filter(u => u.status === "active").length;
  const mfaUsers = users.filter(u => u.twoFa).length;
  const activeSessions = sessions.length;
  const activeKeys = apiKeys.filter(k => k.active).length;

  /* ── shared table cell style ── */
  const td: React.CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #ffffff06", fontSize: 13, color: "#cbd5e1", verticalAlign: "middle" };
  const th: React.CSSProperties = { padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #ffffff0d", textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #ffffff0d", padding: "20px 28px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{t.tr("Yetkilendirme Merkezi")}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{t.tr("Kullanıcı rolleri, erişim hakları ve güvenlik yönetimi")}</div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {TAB_ITEMS.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: "8px 8px 0 0", background: tab === item.id ? "#161b2e" : "transparent", border: "none", borderTop: tab === item.id ? "2px solid #3b82f6" : "2px solid transparent", color: tab === item.id ? "#60a5fa" : "#64748b", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {item.icon}{t.tr(item.label)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <StatCard label="Aktif Kullanıcı" value={activeUsers} sub={`${users.length} ${t.tr("toplam")}`} color="#34d399" />
          <StatCard label="2FA Aktif" value={mfaUsers} sub={`${Math.round(mfaUsers / users.length * 100)}% ${t.tr("kapsama")}`} color="#60a5fa" />
          <StatCard label="Açık Oturum" value={activeSessions} sub={t.tr("tüm kullanıcılar")} color="#f59e0b" />
          <StatCard label="API Anahtarı" value={activeKeys} sub={`${apiKeys.length} ${t.tr("toplam")}`} color="#c084fc" />
        </div>

        {/* ──────── USERS TAB ──────── */}
        {tab === "users" && (
          <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffffff0d" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{t.tr("Kullanıcı Yetki Yönetimi")}</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.tr("Ara...")}
                style={{ background: "#0a0f1e", border: "1px solid #ffffff14", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "7px 14px", width: 220 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Kullanıcı", "Rol", "Durum", "Son Giriş", "2FA", "Oturumlar", "İşlemler"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#ffffff04")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#3b82f620", border: "1px solid #3b82f640", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#60a5fa", flexShrink: 0 }}>{u.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{t.tr(u.name)}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={td}>
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value as Role)}
                          style={{ background: ROLE_CONFIG[u.role].bg, border: `1px solid ${ROLE_CONFIG[u.role].color}40`, borderRadius: 6, color: ROLE_CONFIG[u.role].color, fontSize: 12, fontWeight: 600, padding: "3px 8px", cursor: "pointer" }}>
                          {(Object.keys(ROLE_CONFIG) as Role[]).map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
                        </select>
                      </td>
                      <td style={td}><StatusBadge status={u.status} /></td>
                      <td style={{ ...td, color: "#64748b", fontSize: 12 }}>{u.lastLogin}</td>
                      <td style={td}>
                        <span style={{ fontSize: 12, color: u.twoFa ? "#34d399" : "#f87171" }}>{u.twoFa ? t.tr("✓ Aktif") : t.tr("✗ Pasif")}</span>
                      </td>
                      <td style={td}>
                        <span style={{ background: "#60a5fa18", color: "#60a5fa", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{u.sessions}</span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setResetTarget(u)} title={t.tr("Şifre Sıfırla")}
                            style={{ background: "#3b82f618", border: "1px solid #3b82f630", borderRadius: 6, color: "#60a5fa", padding: "5px 8px", cursor: "pointer", fontSize: 11 }}>
                            {t.tr("Şifre Sıfırla")}
                          </button>
                          <button onClick={() => toggleStatus(u.id)}
                            style={{ background: u.status === "active" ? "#f59e0b18" : "#34d39918", border: `1px solid ${u.status === "active" ? "#f59e0b30" : "#34d39930"}`, borderRadius: 6, color: u.status === "active" ? "#f59e0b" : "#34d399", padding: "5px 8px", cursor: "pointer", fontSize: 11 }}>
                            {u.status === "active" ? t.tr("Askıya Al") : t.tr("Aktifleştir")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── ROLES TAB ──────── */}
        {tab === "roles" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
              <div key={role} style={{ background: "#161b2e", border: `1px solid ${cfg.color}20`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                      {ICONS.roles}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{t.tr(cfg.label)}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{users.filter(u => u.role === role).length} {t.tr("kullanıcı")}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cfg.permissions.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#94a3b8" }}>
                      <span style={{ color: cfg.color, flexShrink: 0 }}>{ICONS.check}</span>{p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────── SESSIONS TAB ──────── */}
        {tab === "sessions" && (
          <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffffff0d" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{t.tr("Aktif Oturumlar")}</div>
              <button onClick={() => setSessions(sessions.filter(s => s.current))}
                style={{ background: "#f8717118", border: "1px solid #f8717130", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 600, padding: "7px 16px", cursor: "pointer" }}>
                {t.tr("Tüm Oturumları Sonlandır")}
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Kullanıcı", "Cihaz", "IP / Konum", "Başlangıç", "Son Aktif", "İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}
                </tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0" }}>{s.userName}</div>
                        {s.current && <span style={{ fontSize: 10, color: "#34d399", background: "#34d39914", borderRadius: 4, padding: "1px 6px", marginTop: 2, display: "inline-block" }}>{t.tr("Bu oturum")}</span>}
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>{s.device}</td>
                      <td style={{ ...td, fontSize: 12 }}>
                        <div style={{ color: "#94a3b8" }}>{s.ip}</div>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{s.location}</div>
                      </td>
                      <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{s.startedAt}</td>
                      <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{s.lastActive}</td>
                      <td style={td}>
                        {!s.current && (
                          <button onClick={() => terminateSession(s.id)}
                            style={{ background: "#f8717118", border: "1px solid #f8717130", borderRadius: 6, color: "#f87171", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>
                            {t.tr("Sonlandır")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── 2FA TAB ──────── */}
        {tab === "2fa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <StatCard label="2FA Kullanan" value={mfaUsers} sub={`${users.length} ${t.tr("kullanıcıdan")}`} color="#34d399" />
              <StatCard label="2FA Kullanmayan" value={users.length - mfaUsers} sub={t.tr("güvenlik riski")} color="#f87171" />
              <StatCard label="Kapsam" value={`${Math.round(mfaUsers / users.length * 100)}%`} sub={t.tr("hedef: %100")} color="#60a5fa" />
            </div>
            <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #ffffff0d", fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{t.tr("Kullanıcı 2FA Durumu")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Kullanıcı", "Rol", "2FA Durumu", "Son Giriş", "İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{t.tr(u.name)}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{u.email}</div>
                      </td>
                      <td style={td}><RoleBadge role={u.role} /></td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 32, height: 18, borderRadius: 9, background: u.twoFa ? "#34d399" : "#374151", position: "relative", cursor: "pointer", flexShrink: 0 }}
                            onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, twoFa: !x.twoFa } : x))}>
                            <div style={{ position: "absolute", top: 2, left: u.twoFa ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                          </div>
                          <span style={{ fontSize: 12, color: u.twoFa ? "#34d399" : "#f87171" }}>{u.twoFa ? t.tr("Aktif") : t.tr("Pasif")}</span>
                        </div>
                      </td>
                      <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{u.lastLogin}</td>
                      <td style={td}>
                        {!u.twoFa && (
                          <button onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, twoFa: true } : x))}
                            style={{ background: "#34d39918", border: "1px solid #34d39930", borderRadius: 6, color: "#34d399", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>
                            {t.tr("Zorunlu Kıl")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── API KEYS TAB ──────── */}
        {tab === "api-keys" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowGenKey(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" }}>
                {ICONS.plus} {t.tr("Yeni API Anahtarı")}
              </button>
            </div>
            {apiKeys.map(k => (
              <div key={k.id} style={{ background: "#161b2e", border: `1px solid ${k.active ? "#ffffff0d" : "#f8717118"}`, borderRadius: 12, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: k.active ? "#3b82f618" : "#f8717118", display: "flex", alignItems: "center", justifyContent: "center", color: k.active ? "#60a5fa" : "#f87171" }}>{ICONS.key}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{t.tr(k.name)}</div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{k.prefix}••••••••••••••••</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: k.active ? "#34d399" : "#f87171", background: k.active ? "#34d39914" : "#f8717114", borderRadius: 6, padding: "2px 8px" }}>{k.active ? t.tr("Aktif") : t.tr("Pasif")}</span>
                    <button onClick={() => { navigator.clipboard?.writeText(k.prefix + "DEMO_KEY"); setCopiedKey(k.id); setTimeout(() => setCopiedKey(null), 2000); }}
                      style={{ background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 6, color: copiedKey === k.id ? "#34d399" : "#94a3b8", padding: "5px 8px", cursor: "pointer" }}>
                      {copiedKey === k.id ? ICONS.check : ICONS.copy}
                    </button>
                    <button onClick={() => setApiKeys(prev => prev.map(x => x.id === k.id ? { ...x, active: !x.active } : x))}
                      style={{ background: k.active ? "#f59e0b18" : "#34d39918", border: `1px solid ${k.active ? "#f59e0b30" : "#34d39930"}`, borderRadius: 6, color: k.active ? "#f59e0b" : "#34d399", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>
                      {k.active ? t.tr("Devre Dışı") : t.tr("Aktifleştir")}
                    </button>
                    <button onClick={() => setApiKeys(prev => prev.filter(x => x.id !== k.id))}
                      style={{ background: "#f8717118", border: "1px solid #f8717130", borderRadius: 6, color: "#f87171", padding: "5px 8px", cursor: "pointer" }}>
                      {ICONS.trash}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {k.permissions.map(p => <span key={p} style={{ fontSize: 11, color: "#94a3b8", background: "#ffffff08", borderRadius: 5, padding: "2px 8px", fontFamily: "monospace" }}>{p}</span>)}
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#64748b" }}>
                  <span>{t.tr("Oluşturuldu:")} <b style={{ color: "#94a3b8" }}>{k.createdAt}</b></span>
                  <span>{t.tr("Son kullanım:")} <b style={{ color: "#94a3b8" }}>{k.lastUsed}</b></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────── AUDIT TAB ──────── */}
        {tab === "audit" && (
          <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #ffffff0d" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{t.tr("Denetim Günlüğü")}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["all", "info", "warning", "critical"] as const).map(f => (
                  <button key={f} onClick={() => setAuditFilter(f)}
                    style={{ background: auditFilter === f ? "#3b82f620" : "transparent", border: `1px solid ${auditFilter === f ? "#3b82f640" : "#ffffff0d"}`, borderRadius: 7, color: auditFilter === f ? "#60a5fa" : "#64748b", fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>
                    {f === "all" ? t.tr("Tümü") : f === "info" ? t.tr("Bilgi") : f === "warning" ? t.tr("Uyarı") : t.tr("Kritik")}
                  </button>
                ))}
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Zaman", "Eylem", "Kullanıcı", "Hedef", "IP", "Önem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
              <tbody>
                {filteredAudit.map(a => (
                  <tr key={a.id}>
                    <td style={{ ...td, fontSize: 11, color: "#64748b", whiteSpace: "nowrap" }}>{a.timestamp}</td>
                    <td style={{ ...td, fontSize: 13 }}>{a.action}</td>
                    <td style={{ ...td, fontSize: 12, color: "#94a3b8" }}>{a.user}</td>
                    <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{a.target}</td>
                    <td style={{ ...td, fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{a.ip}</td>
                    <td style={td}><SeverityBadge severity={a.severity} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ──────── IP TAB ──────── */}
        {tab === "ip" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Add rule form */}
            <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 14 }}>{t.tr("Yeni IP Kuralı")}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input value={newIp.range} onChange={e => setNewIp(p => ({ ...p, range: e.target.value }))} placeholder={t.tr("IP / CIDR (ör. 192.168.1.0/24)")}
                  style={{ flex: 2, minWidth: 200, background: "#0a0f1e", border: "1px solid #ffffff14", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "8px 12px", fontFamily: "monospace" }} />
                <input value={newIp.label} onChange={e => setNewIp(p => ({ ...p, label: e.target.value }))} placeholder={t.tr("Açıklama")}
                  style={{ flex: 2, minWidth: 160, background: "#0a0f1e", border: "1px solid #ffffff14", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "8px 12px" }} />
                <select value={newIp.type} onChange={e => setNewIp(p => ({ ...p, type: e.target.value as "allow" | "block" }))}
                  style={{ background: newIp.type === "allow" ? "#34d39918" : "#f8717118", border: `1px solid ${newIp.type === "allow" ? "#34d39930" : "#f8717130"}`, borderRadius: 8, color: newIp.type === "allow" ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}>
                  <option value="allow">{t.tr("İzin Ver")}</option>
                  <option value="block">{t.tr("Engelle")}</option>
                </select>
                <button onClick={() => { if (newIp.range && newIp.label) { setIpRules(p => [{ id: "i" + Date.now(), ...newIp, added: "2026-03-29" }, ...p]); setNewIp({ range: "", label: "", type: "block" }); } }}
                  style={{ background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 18px", cursor: "pointer" }}>
                  {t.tr("Ekle")}
                </button>
              </div>
            </div>
            {/* IP rules list */}
            <div style={{ background: "#161b2e", border: "1px solid #ffffff0d", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Tür", "IP / CIDR", "Açıklama", "Eklenme Tarihi", "İşlem"].map(h => <th key={h} style={th}>{t.tr(h)}</th>)}</tr></thead>
                <tbody>
                  {ipRules.map(r => (
                    <tr key={r.id}>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.type === "allow" ? "#34d399" : "#f87171", background: r.type === "allow" ? "#34d39914" : "#f8717114", borderRadius: 6, padding: "2px 8px" }}>
                          {r.type === "allow" ? t.tr("İzin") : t.tr("Engel")}
                        </span>
                      </td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 13 }}>{r.range}</td>
                      <td style={{ ...td, fontSize: 13 }}>{t.tr(r.label)}</td>
                      <td style={{ ...td, fontSize: 12, color: "#64748b" }}>{r.added}</td>
                      <td style={td}>
                        <button onClick={() => setIpRules(prev => prev.filter(x => x.id !== r.id))}
                          style={{ background: "#f8717118", border: "1px solid #f8717130", borderRadius: 6, color: "#f87171", padding: "5px 8px", cursor: "pointer" }}>
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
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
      {showGenKey && <GenerateKeyModal onClose={() => setShowGenKey(false)} onCreate={addApiKey} />}
    </div>
  );
}
