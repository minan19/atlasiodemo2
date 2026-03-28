"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") ?? "" : "";
}

function authHeaders(): Record<string, string> {
  const tok = getToken();
  return tok
    ? { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LtiDeployment = {
  id: string;
  courseId: string;
  instructors: string[];
  learners: string[];
  createdAt: string;
};

type LtiTool = {
  id: string;
  name: string;
  clientId: string;
  issuer: string;
  loginUrl: string;
  launchUrl: string;
  jwksUrl?: string | null;
  isActive?: boolean;
  LtiDeployment?: LtiDeployment[];
  createdAt?: string;
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_TOOLS: LtiTool[] = [
  {
    id: "lt1", name: "Khan Academy LTI",
    clientId: "khanacademy-001", issuer: "https://www.khanacademy.org",
    loginUrl: "https://www.khanacademy.org/lti/login",
    launchUrl: "https://www.khanacademy.org/lti/launch",
    jwksUrl: "https://www.khanacademy.org/lti/jwks",
    isActive: true,
    LtiDeployment: [
      { id: "dep1", courseId: "crs-001", instructors: ["ins-1"], learners: ["std-1","std-2"], createdAt: "2026-02-15T10:00:00Z" },
      { id: "dep2", courseId: "crs-003", instructors: ["ins-2"], learners: ["std-3"], createdAt: "2026-03-01T10:00:00Z" },
    ],
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "lt2", name: "Quizlet LTI",
    clientId: "quizlet-lti-atlasio", issuer: "https://quizlet.com",
    loginUrl: "https://quizlet.com/lti/oidc-login",
    launchUrl: "https://quizlet.com/lti/launch",
    jwksUrl: "https://quizlet.com/lti/jwks",
    isActive: true,
    LtiDeployment: [
      { id: "dep3", courseId: "crs-002", instructors: ["ins-1","ins-3"], learners: ["std-1"], createdAt: "2026-03-10T10:00:00Z" },
    ],
    createdAt: "2026-02-10T10:00:00Z",
  },
  {
    id: "lt3", name: "GeoGebra LTI",
    clientId: "geogebra-lti-v3", issuer: "https://www.geogebra.org",
    loginUrl: "https://www.geogebra.org/lti/login",
    launchUrl: "https://www.geogebra.org/lti/launch",
    jwksUrl: null,
    isActive: false,
    LtiDeployment: [],
    createdAt: "2026-03-05T10:00:00Z",
  },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s = size;
  const icons: Record<string, JSX.Element> = {
    plug: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" />
        <path d="M18 8H6a2 2 0 00-2 2v3a6 6 0 0012 0v-3a2 2 0 00-2-2z" />
      </svg>
    ),
    link: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
    plus: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    close: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    check: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    edit: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    key: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    globe: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    shield: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    chevronDown: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    warn: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    rocket: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
    copy: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
    ),
  };
  return icons[name] ?? <svg width={s} height={s} viewBox="0 0 24 24" />;
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `${size > 14 ? 2 : 1.5}px solid rgba(255,255,255,0.25)`,
      borderTopColor: "#fff", animation: "ltiSpin 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({
  tool, expanded, onToggle, onDeploy, onEdit,
}: {
  tool: LtiTool;
  expanded: boolean;
  onToggle: () => void;
  onDeploy: (toolId: string) => void;
  onEdit: (tool: LtiTool) => void;
}) {
  const deployCount = tool.LtiDeployment?.length ?? 0;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };

  return (
    <div
      style={{
        borderRadius: "var(--r-lg)", overflow: "hidden",
        border: `1.5px solid ${tool.isActive ? "color-mix(in srgb,var(--accent) 20%,var(--line))" : "var(--line)"}`,
        transition: "border-color var(--t-fast)",
      }}
      className="glass"
    >
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: "16px 18px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
          background: expanded ? "color-mix(in srgb,var(--accent) 4%,var(--panel))" : "var(--panel)",
          transition: "background var(--t-fast)",
        }}
      >
        {/* Status indicator */}
        <div style={{
          width: 42, height: 42, borderRadius: "var(--r-md)", flexShrink: 0,
          background: tool.isActive
            ? "linear-gradient(135deg,var(--accent-2),var(--accent))"
            : "linear-gradient(135deg,#374151,#6b7280)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: tool.isActive ? "0 4px 12px rgba(91,110,255,0.3)" : "none",
        }}>
          <Icon name="plug" size={19} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{tool.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
              padding: "2px 7px", borderRadius: "var(--r-full)",
              background: tool.isActive ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.12)",
              border: tool.isActive ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(107,114,128,0.3)",
              color: tool.isActive ? "#22c55e" : "#6b7280",
            }}>
              {tool.isActive ? "AKTİF" : "DEVRE DIŞI"}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", marginLeft: 4 }}>
              LTI 1.3
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
              <Icon name="globe" size={10} /> {tool.issuer}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)" }}>
              <Icon name="rocket" size={10} /> {deployCount} deployment
            </span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(tool.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(tool)}
            title="Düzenle"
            style={{
              width: 30, height: 30, borderRadius: "var(--r-sm)",
              border: "1px solid color-mix(in srgb,var(--accent) 25%,var(--line))",
              background: "var(--accent-soft)", color: "var(--accent)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="edit" size={13} />
          </button>
          <button
            onClick={() => onDeploy(tool.id)}
            title="Deployment Ekle"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: "var(--r-sm)",
              border: "1px solid color-mix(in srgb,var(--accent-3) 30%,var(--line))",
              background: "color-mix(in srgb,var(--accent-3) 8%,var(--panel))",
              color: "var(--accent-3)", cursor: "pointer", fontSize: 11, fontWeight: 600,
            }}
          >
            <Icon name="plus" size={11} /> Deploy
          </button>
          <div style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)", transition: "transform var(--t-fast)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}>
            <Icon name="chevronDown" size={14} />
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--line)", padding: "16px 18px",
          animation: "ltiFadeIn 0.25s both",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Config fields */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 10 }}>
              BAĞLANTI BİLGİLERİ
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Client ID", value: tool.clientId, icon: "key" },
                { label: "Login URL", value: tool.loginUrl, icon: "link" },
                { label: "Launch URL", value: tool.launchUrl, icon: "rocket" },
                ...(tool.jwksUrl ? [{ label: "JWKS URL", value: tool.jwksUrl, icon: "shield" }] : []),
              ].map((field) => (
                <div
                  key={field.label}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: "var(--r-md)",
                    background: "color-mix(in srgb,var(--line) 25%,var(--panel))",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ color: "var(--muted)" }}>
                    <Icon name={field.icon} size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", marginBottom: 1 }}>{field.label}</div>
                    <div style={{ fontSize: 12, color: "var(--ink)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {field.value}
                    </div>
                  </div>
                  <button
                    onClick={() => copy(field.value, field.label)}
                    style={{
                      width: 26, height: 26, borderRadius: "var(--r-sm)", flexShrink: 0,
                      border: "1px solid var(--line)", background: "var(--panel)",
                      cursor: "pointer", color: copied === field.label ? "#22c55e" : "var(--muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "color var(--t-fast)",
                    }}
                  >
                    <Icon name={copied === field.label ? "check" : "copy"} size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Deployments */}
          {tool.LtiDeployment && tool.LtiDeployment.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 10 }}>
                DEPLOYMENTS ({tool.LtiDeployment.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tool.LtiDeployment.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: "var(--r-md)",
                      background: "color-mix(in srgb,var(--accent-3) 5%,var(--panel))",
                      border: "1px solid color-mix(in srgb,var(--accent-3) 20%,var(--line))",
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--accent-3)", flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                        Kurs: <span style={{ fontFamily: "monospace", fontSize: 11 }}>{dep.courseId}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {dep.instructors.length} eğitmen · {dep.learners.length} öğrenci · {fmtDate(dep.createdAt)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      padding: "2px 8px", borderRadius: "var(--r-full)",
                      background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                      color: "#22c55e",
                    }}>AKTİF</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create/Edit Tool Modal ───────────────────────────────────────────────────

function ToolModal({
  existing, onClose, onSaved,
}: {
  existing?: LtiTool | null;
  onClose: () => void;
  onSaved: (tool: LtiTool) => void;
}) {
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    clientId: existing?.clientId ?? "",
    issuer: existing?.issuer ?? "",
    loginUrl: existing?.loginUrl ?? "",
    launchUrl: existing?.launchUrl ?? "",
    jwksUrl: existing?.jwksUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));
  const isEditing = !!existing;

  const handleSave = async () => {
    if (!form.name.trim() || !form.clientId.trim() || !form.issuer.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing ? `${API_BASE}/lti/tools/${existing!.id}` : `${API_BASE}/lti/tools`;
      const res = await fetch(url, {
        method, headers: authHeaders(),
        body: JSON.stringify({ ...form, jwksUrl: form.jwksUrl || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const tool: LtiTool = await res.json();
      onSaved(tool);
      onClose();
    } catch {
      // Demo
      onSaved({
        ...(existing ?? {}),
        id: existing?.id ?? `lt-${Date.now()}`,
        ...form,
        jwksUrl: form.jwksUrl || null,
        isActive: existing?.isActive ?? true,
        LtiDeployment: existing?.LtiDeployment ?? [],
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      } as LtiTool);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "name", label: "Araç Adı *", placeholder: "ör. Khan Academy LTI", icon: "plug" },
    { key: "clientId", label: "Client ID *", placeholder: "ör. khanacademy-001", icon: "key" },
    { key: "issuer", label: "Issuer (Platform URL) *", placeholder: "https://www.khanacademy.org", icon: "globe" },
    { key: "loginUrl", label: "OIDC Login URL *", placeholder: "https://…/lti/login", icon: "link" },
    { key: "launchUrl", label: "Launch URL *", placeholder: "https://…/lti/launch", icon: "rocket" },
    { key: "jwksUrl", label: "JWKS URL (opsiyonel)", placeholder: "https://…/lti/jwks", icon: "shield" },
  ] as const;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
          borderRadius: "var(--r-xl)", background: "var(--panel)",
          border: "1.5px solid var(--line)", boxShadow: "var(--shadow-lg)",
          padding: 28, animation: "ltiScaleIn 0.2s cubic-bezier(.2,.6,.3,1) both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "var(--r-md)",
              background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="plug" size={18} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>
              {isEditing ? "LTI Aracını Düzenle" : "Yeni LTI Aracı"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "1px solid var(--line)", background: "var(--panel)",
              cursor: "pointer", color: "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {fields.map(({ key, label, placeholder, icon }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
                {label}
              </label>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0 14px", height: 42,
                borderRadius: "var(--r-md)", border: "1.5px solid var(--line)",
                background: "color-mix(in srgb,var(--line) 20%,var(--panel))",
              }}>
                <div style={{ color: "var(--muted)", flexShrink: 0 }}><Icon name={icon} size={14} /></div>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{
                    flex: 1, border: "none", background: "transparent",
                    color: "var(--ink)", fontSize: 13, outline: "none",
                  }}
                />
              </div>
            </div>
          ))}

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: "var(--r-md)",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontSize: 13,
            }}>
              <Icon name="warn" size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: "11px", borderRadius: "var(--r-md)",
                border: "1.5px solid var(--line)", background: "var(--panel)",
                color: "var(--ink-2)", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.clientId.trim() || !form.issuer.trim()}
              style={{
                flex: 2, padding: "11px", borderRadius: "var(--r-md)",
                border: "none",
                background: saving || !form.name.trim() || !form.clientId.trim() || !form.issuer.trim()
                  ? "color-mix(in srgb,var(--accent) 40%,var(--line))"
                  : "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: form.name.trim() ? "var(--glow-blue)" : "none",
              }}
            >
              {saving ? <><Spinner size={16} /> Kaydediliyor…</> : <><Icon name="check" size={15} /> {isEditing ? "Güncelle" : "Oluştur"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LtiAdminPage() {
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState<LtiTool | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lti/tools`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const data: LtiTool[] = await res.json();
        setTools(data.length ? data : DEMO_TOOLS);
        setIsDemo(!data.length);
      } catch {
        setTools(DEMO_TOOLS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleSaved = (tool: LtiTool) => {
    setTools((prev) => {
      const idx = prev.findIndex((t) => t.id === tool.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = tool; return next; }
      return [tool, ...prev];
    });
    showToast(editingTool ? "Araç güncellendi!" : "LTI aracı oluşturuldu!");
    setEditingTool(null);
  };

  const handleDeploy = async (toolId: string) => {
    const courseId = prompt("Deployment için Kurs ID girin:");
    if (!courseId?.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/lti/deployments`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ toolId, courseId: courseId.trim(), instructors: [], learners: [] }),
      });
      if (!res.ok) throw new Error();
      const dep: LtiDeployment = await res.json();
      setTools((prev) => prev.map((t) =>
        t.id === toolId ? { ...t, LtiDeployment: [...(t.LtiDeployment ?? []), dep] } : t
      ));
      showToast("Deployment oluşturuldu!");
    } catch {
      // Demo
      const dep: LtiDeployment = {
        id: `dep-${Date.now()}`, courseId: courseId.trim(),
        instructors: [], learners: [], createdAt: new Date().toISOString(),
      };
      setTools((prev) => prev.map((t) =>
        t.id === toolId ? { ...t, LtiDeployment: [...(t.LtiDeployment ?? []), dep] } : t
      ));
      showToast("Deployment oluşturuldu (demo).");
    }
  };

  const activeCount = tools.filter((t) => t.isActive).length;
  const totalDeployments = tools.reduce((s, t) => s + (t.LtiDeployment?.length ?? 0), 0);

  return (
    <>
      <style>{`
        @keyframes ltiSpin { to { transform: rotate(360deg); } }
        @keyframes ltiScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes ltiFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ltiToast { 0%{opacity:0;transform:translateY(12px)} 12%{opacity:1;transform:translateY(0)} 88%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(12px)} }
      `}</style>

      <div className="bg-canvas" /><div className="bg-grid" />

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", borderRadius: "var(--r-lg)",
          background: toast.type === "success" ? "linear-gradient(135deg,#065f46,#059669)" : "linear-gradient(135deg,#7f1d1d,#dc2626)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          animation: "ltiToast 3.5s ease both",
        }}>
          <Icon name={toast.type === "success" ? "check" : "warn"} size={15} /> {toast.msg}
        </div>
      )}

      {(showModal || editingTool) && (
        <ToolModal
          existing={editingTool}
          onClose={() => { setShowModal(false); setEditingTool(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="page-shell" style={{ paddingBottom: 48 }}>

        {/* ── Hero ── */}
        <div
          className="glass"
          style={{
            borderRadius: "var(--r-xl)", marginBottom: 24, padding: "28px 28px 24px",
            background: "linear-gradient(135deg, color-mix(in srgb,var(--accent-2) 8%,var(--panel)) 0%, color-mix(in srgb,var(--accent) 5%,var(--panel)) 100%)",
            border: "1.5px solid color-mix(in srgb,var(--accent) 18%,var(--line))",
            boxShadow: "var(--glow-blue)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{
                width: 54, height: 54, borderRadius: "var(--r-lg)", flexShrink: 0,
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--glow-blue)",
              }}>
                <Icon name="plug" size={26} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: "-0.03em" }}>
                    LTI Entegrasyonları
                  </h1>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: "var(--r-full)",
                    background: "rgba(91,110,255,0.12)", border: "1px solid rgba(91,110,255,0.3)", color: "var(--accent-2)",
                  }}>LTI 1.3</span>
                  {isDemo && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                      padding: "2px 8px", borderRadius: "var(--r-full)",
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
                    }}>DEMO</span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
                  Learning Tools Interoperability araçlarını yönetin ve kurslara entegre edin
                </p>
              </div>
            </div>

            <button
              onClick={() => { setEditingTool(null); setShowModal(true); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: "var(--r-md)",
                border: "none", background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "var(--glow-blue)", whiteSpace: "nowrap",
              }}
            >
              <Icon name="plus" size={16} /> LTI Aracı Ekle
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "Toplam Araç", value: tools.length, icon: "plug", color: "var(--accent)" },
              { label: "Aktif", value: activeCount, icon: "check", color: "#22c55e" },
              { label: "Deployment", value: totalDeployments, icon: "rocket", color: "var(--accent-3)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--r-sm)",
                  background: "color-mix(in srgb,var(--line) 50%,var(--panel))",
                  display: "flex", alignItems: "center", justifyContent: "center", color: s.color,
                }}>
                  <Icon name={s.icon} size={15} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tools list ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map((n) => (
              <div key={n} style={{
                height: 76, borderRadius: "var(--r-lg)",
                background: "color-mix(in srgb,var(--line) 40%,var(--panel))",
                opacity: 0.5,
              }} />
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="glass" style={{
            borderRadius: "var(--r-xl)", padding: "56px 32px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 16, textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "var(--r-xl)",
              background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-blue)",
            }}>
              <Icon name="plug" size={34} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: "0 0 8px" }}>Henüz LTI aracı yok</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 360, lineHeight: 1.7 }}>
                Khan Academy, Quizlet veya GeoGebra gibi harici öğrenme araçlarını LTI 1.3 ile entegre edin.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 22px", borderRadius: "var(--r-md)",
                border: "none", background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "var(--glow-blue)",
              }}
            >
              <Icon name="plus" size={15} /> İlk Aracı Ekle
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tools.map((tool, i) => (
              <div key={tool.id} style={{ animation: `ltiFadeIn 0.3s ${i * 60}ms both` }}>
                <ToolCard
                  tool={tool}
                  expanded={expanded.has(tool.id)}
                  onToggle={() => toggleExpand(tool.id)}
                  onDeploy={handleDeploy}
                  onEdit={(t) => { setEditingTool(t); setShowModal(true); }}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
