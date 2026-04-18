'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';
const ACCESS_TOKEN_KEY = 'accessToken';

type SsoProvider = {
  id: string;
  name: string;
  type: 'SAML' | 'OIDC';
  issuer: string;
  loginUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
  isActive: boolean;
  createdAt: string;
};

type CreateBody = {
  name: string;
  type: 'SAML' | 'OIDC';
  issuer: string;
  loginUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecret?: string;
};

const DEMO_PROVIDERS: SsoProvider[] = [
  {
    id: 'p1',
    name: 'Kurumsal SAML (Azure AD)',
    type: 'SAML',
    issuer: 'https://sts.windows.net/tenant-id/',
    loginUrl: 'https://login.microsoftonline.com/tenant/saml2',
    isActive: true,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'p2',
    name: 'Google OIDC',
    type: 'OIDC',
    issuer: 'https://accounts.google.com',
    clientId: 'app.googleusercontent.com',
    isActive: true,
    createdAt: '2026-02-01T10:00:00Z',
  },
];

const EMPTY_FORM: CreateBody = {
  name: '',
  type: 'SAML',
  issuer: '',
  loginUrl: '',
  certificate: '',
  clientId: '',
  clientSecret: '',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ── Icon component ────────────────────────────────────────────── */
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const s: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', flexShrink: 0 },
  };

  switch (name) {
    case 'link':
      return (
        <svg {...s}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'key':
      return (
        <svg {...s}>
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      );
    case 'id-card':
      return (
        <svg {...s}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <circle cx="8" cy="12" r="2" />
          <path d="M14 9h4M14 13h3" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...s}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'check':
      return (
        <svg {...s}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'x':
      return (
        <svg {...s}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'x-circle':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case 'alert-triangle':
      return (
        <svg {...s}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...s}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...s}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...s}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...s}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return null;
  }
}

/* ── TypeBadge ─────────────────────────────────────────────────── */
function TypeBadge({ type }: { type: 'SAML' | 'OIDC' }) {
  const isSaml = type === 'SAML';
  return (
    <span
      style={{
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        background: isSaml
          ? 'color-mix(in srgb, var(--accent-2) 14%, var(--panel))'
          : 'color-mix(in srgb, var(--accent-3) 14%, var(--panel))',
        color: isSaml ? 'var(--accent-2)' : 'var(--accent-3)',
        border: `1px solid ${isSaml ? 'color-mix(in srgb, var(--accent-2) 30%, transparent)' : 'color-mix(in srgb, var(--accent-3) 30%, transparent)'}`,
        letterSpacing: '0.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {isSaml ? 'SAML 2.0' : 'OIDC'}
    </span>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function AdminSsoPage() {
  const t = useI18n();
  const [token, setToken] = useState('');
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateBody>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem(ACCESS_TOKEN_KEY) ?? '');
    }
  }, []);

  const headers = useMemo<Record<string, string> | undefined>(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sso/providers`, {
        headers: headers ?? {},
      });
      if (!res.ok) throw new Error('Sağlayıcılar yüklenemedi');
      const data = (await res.json()) as SsoProvider[];
      if (data.length === 0) {
        setIsDemo(true);
        setProviders(DEMO_PROVIDERS);
      } else {
        setIsDemo(false);
        setProviders(data);
      }
    } catch {
      setIsDemo(true);
      setProviders(DEMO_PROVIDERS);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token !== undefined) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" sağlayıcısını silmek istediğinizden emin misiniz?`)) return;
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/sso/providers/${id}`, {
        method: 'DELETE',
        headers: headers ?? {},
      });
      if (!res.ok) throw new Error('Silme işlemi başarısız');
      setProviders((prev) => prev.filter((p) => p.id !== id));
      setSuccessMsg('Sağlayıcı başarıyla silindi.');
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Silme başarısız');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError('Sağlayıcı adı zorunludur.'); return; }
    if (!form.issuer.trim()) { setFormError('Issuer URL zorunludur.'); return; }
    if (form.type === 'SAML' && !form.loginUrl?.trim()) { setFormError('Login URL SAML için zorunludur.'); return; }
    if (form.type === 'OIDC' && !form.clientId?.trim()) { setFormError('Client ID OIDC için zorunludur.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      const body: CreateBody = {
        name: form.name.trim(),
        type: form.type,
        issuer: form.issuer.trim(),
        ...(form.type === 'SAML'
          ? {
              loginUrl: form.loginUrl?.trim() || undefined,
              certificate: form.certificate?.trim() || undefined,
            }
          : {
              clientId: form.clientId?.trim() || undefined,
              clientSecret: form.clientSecret?.trim() || undefined,
            }),
      };

      const res = await fetch(`${API_BASE}/sso/providers`, {
        method: 'POST',
        headers: { ...(headers ?? {}), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Sağlayıcı oluşturulamadı');
      const created = (await res.json()) as SsoProvider;
      setProviders((prev) => [created, ...prev]);
      setIsDemo(false);
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setSuccessMsg('Yeni SSO sağlayıcı başarıyla eklendi.');
    } catch (err: unknown) {
      setFormError((err as Error)?.message ?? 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const samlCount = providers.filter((p) => p.type === 'SAML').length;
  const oidcCount = providers.filter((p) => p.type === 'OIDC').length;
  const activeCount = providers.filter((p) => p.isActive).length;

  const STATS = [
    {
      label: 'Toplam Sağlayıcı',
      value: providers.length,
      icon: 'link' as const,
      accent: 'var(--ink-2)',
    },
    {
      label: 'SAML 2.0',
      value: samlCount,
      icon: 'key' as const,
      accent: 'var(--accent-2)',
    },
    {
      label: 'OIDC',
      value: oidcCount,
      icon: 'id-card' as const,
      accent: 'var(--accent-3)',
    },
    {
      label: 'Aktif',
      value: activeCount,
      icon: 'check-circle' as const,
      accent: 'var(--accent)',
    },
  ];

  /* shared input style */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--r-md)',
    border: '1.5px solid var(--line)',
    background: 'var(--bg)',
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--t-fast)',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--ink-2)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 4,
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        .sso-stats-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 1024px) {
          .sso-stats-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .sso-form-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .sso-form-grid { grid-template-columns: 1fr 1fr; }
        }
        .sso-col-span-2 { grid-column: 1 / -1; }
        .sso-stat-card:hover {
          border-color: color-mix(in srgb, var(--accent) 40%, var(--line)) !important;
          box-shadow: var(--shadow-md) !important;
        }
        .sso-provider-row:hover {
          border-color: color-mix(in srgb, var(--accent) 30%, var(--line)) !important;
          box-shadow: var(--shadow-sm) !important;
        }
        .sso-delete-btn:hover:not(:disabled) {
          background: color-mix(in srgb, #ef4444 14%, var(--panel)) !important;
        }
        .sso-add-btn:hover {
          background: color-mix(in srgb, var(--accent) 14%, var(--panel)) !important;
        }
        .sso-cancel-btn:hover {
          background: color-mix(in srgb, var(--ink) 6%, var(--panel)) !important;
        }
        .sso-refresh-btn:hover:not(:disabled) {
          color: var(--accent) !important;
        }
        .sso-close-btn:hover { opacity: 0.7; }
        .sso-save-btn:hover:not(:disabled) {
          opacity: 0.88;
        }
        input.sso-input:focus, textarea.sso-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
        }
        @keyframes sso-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sso-animate { animation: sso-fade-up 0.35s ease both; }
        .sso-stagger-1 { animation-delay: 0.04s; }
        .sso-stagger-2 { animation-delay: 0.09s; }
        .sso-stagger-3 { animation-delay: 0.14s; }
        .sso-stagger-4 { animation-delay: 0.19s; }
        @keyframes sso-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .sso-skeleton { animation: sso-pulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header
        style={{
          borderRadius: 'var(--r-xl)',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          padding: '28px 28px 24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--r-md)',
            background: 'color-mix(in srgb, var(--accent) 12%, var(--panel))',
            border: '1.5px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            flexShrink: 0,
          }}
        >
          <Icon name="shield" size={22} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))',
              border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
              borderRadius: 99,
              padding: '2px 10px',
              display: 'inline-block',
              width: 'fit-content',
            }}
          >
            {t.tr("Kimlik Yönetimi")}
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
            {t.tr("SSO Entegrasyonları")}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
            {t.tr("SAML 2.0 ve OIDC kimlik sağlayıcıları — kurumsal tek oturum açma bağlantılarını yapılandırın ve yönetin.")}
          </p>
        </div>
      </header>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <section className="sso-stats-grid">
        {STATS.map((s, i) => (
          <div
            key={i}
            className={`sso-stat-card sso-animate sso-stagger-${i + 1}`}
            style={{
              borderRadius: 'var(--r-xl)',
              background: 'var(--panel)',
              border: '1.5px solid var(--line)',
              padding: 16,
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 'var(--r-sm)',
                  background: `color-mix(in srgb, ${s.accent} 12%, var(--panel))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.accent,
                  flexShrink: 0,
                }}
              >
                <Icon name={s.icon} size={15} />
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{t.tr(s.label)}</span>
            </div>
            <p style={{ fontSize: 30, fontWeight: 800, color: s.accent, margin: 0, lineHeight: 1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </section>

      {/* ── Notifications ────────────────────────────────────────── */}
      {successMsg && (
        <div
          style={{
            borderRadius: 'var(--r-md)',
            border: '1.5px solid color-mix(in srgb, var(--accent) 35%, var(--line))',
            background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
            padding: '10px 16px',
            fontSize: 13,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check-circle" size={15} />
            {successMsg}
          </span>
          <button
            className="sso-close-btn"
            onClick={() => setSuccessMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent)',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity var(--t-fast)',
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      {error && (
        <div
          style={{
            borderRadius: 'var(--r-md)',
            border: '1.5px solid color-mix(in srgb, #ef4444 35%, var(--line))',
            background: 'color-mix(in srgb, #ef4444 8%, var(--panel))',
            padding: '10px 16px',
            fontSize: 13,
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="x-circle" size={15} />
            {error}
          </span>
          <button
            className="sso-close-btn"
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity var(--t-fast)',
            }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* ── Provider List ─────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: 'var(--r-xl)',
          background: 'var(--panel)',
          border: '1.5px solid var(--line)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Accent bar */}
            <span
              style={{
                width: 4,
                height: 20,
                borderRadius: 4,
                background: 'linear-gradient(180deg, var(--accent-2), var(--accent))',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {t.tr("Kayıtlı Sağlayıcılar")}
            <span
              style={{
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
              }}
            >
              {providers.length}
            </span>
          </h2>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="sso-refresh-btn"
              onClick={load}
              disabled={busy}
              style={{
                background: 'none',
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                color: 'var(--ink-2)',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: 'var(--r-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color var(--t-fast)',
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Icon name="refresh" size={13} />
              {busy ? t.tr('Yükleniyor…') : t.tr('Yenile')}
            </button>

            <button
              className="sso-add-btn"
              onClick={() => { setShowForm((v) => !v); setFormError(null); }}
              style={{
                borderRadius: 'var(--r-md)',
                border: '1.5px solid color-mix(in srgb, var(--accent) 30%, var(--line))',
                background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
                padding: '7px 16px',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background var(--t-fast)',
              }}
            >
              {showForm ? (
                <><Icon name="x" size={13} /> {t.tr("Formu Kapat")}</>
              ) : (
                <><Icon name="plus" size={13} /> {t.tr("Yeni SSO Sağlayıcı Ekle")}</>
              )}
            </button>
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div
            style={{
              borderRadius: 'var(--r-md)',
              border: '1.5px solid color-mix(in srgb, #f59e0b 30%, var(--line))',
              background: 'color-mix(in srgb, #f59e0b 8%, var(--panel))',
              padding: '8px 14px',
              fontSize: 12,
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="alert-triangle" size={13} />
            {t.tr("Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.")}
          </div>
        )}

        {/* ── Inline Create Form ──────────────────────────────────── */}
        {showForm && (
          <div
            style={{
              borderRadius: 'var(--r-xl)',
              border: '1.5px solid color-mix(in srgb, var(--accent) 25%, var(--line))',
              background: 'color-mix(in srgb, var(--accent) 5%, var(--panel))',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              {t.tr("Yeni SSO Sağlayıcı")}
            </h3>

            {formError && (
              <div
                style={{
                  borderRadius: 'var(--r-md)',
                  border: '1.5px solid color-mix(in srgb, #ef4444 30%, var(--line))',
                  background: 'color-mix(in srgb, #ef4444 8%, var(--panel))',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Icon name="x-circle" size={13} />
                {formError}
              </div>
            )}

            <div className="sso-form-grid">
              {/* Name */}
              <div className="sso-col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{t.tr("Sağlayıcı Adı *")}</label>
                <input
                  className="sso-input"
                  type="text"
                  placeholder={t.tr("ör. Şirket Azure AD")}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Type Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{t.tr("Protokol *")}</label>
                <div
                  style={{
                    display: 'flex',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--line)',
                    overflow: 'hidden',
                    background: 'var(--bg)',
                  }}
                >
                  {(['SAML', 'OIDC'] as const).map((proto) => {
                    const active = form.type === proto;
                    return (
                      <button
                        key={proto}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: proto }))}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background var(--t-fast), color var(--t-fast)',
                          background: active
                            ? proto === 'SAML'
                              ? 'var(--accent-2)'
                              : 'var(--accent-3)'
                            : 'transparent',
                          color: active ? '#fff' : 'var(--muted)',
                        }}
                      >
                        {proto}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Issuer */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>{t.tr("Issuer URL *")}</label>
                <input
                  className="sso-input"
                  type="url"
                  placeholder="https://..."
                  value={form.issuer}
                  onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* Conditional SAML fields */}
              {form.type === 'SAML' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t.tr("Login URL *")}</label>
                    <input
                      className="sso-input"
                      type="url"
                      placeholder="https://..."
                      value={form.loginUrl ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, loginUrl: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div className="sso-col-span-2" style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t.tr("Sertifika (PEM)")}</label>
                    <textarea
                      className="sso-input"
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      value={form.certificate ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, certificate: e.target.value }))}
                      style={{
                        ...inputStyle,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Conditional OIDC fields */}
              {form.type === 'OIDC' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t.tr("Client ID *")}</label>
                    <input
                      className="sso-input"
                      type="text"
                      placeholder={t.tr("ör. 123456.apps.googleusercontent.com")}
                      value={form.clientId ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>{t.tr("Client Secret")}</label>
                    <input
                      className="sso-input"
                      type="password"
                      placeholder="••••••••"
                      value={form.clientSecret ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                className="sso-save-btn"
                onClick={handleSave}
                disabled={saving}
                style={{
                  borderRadius: 'var(--r-md)',
                  background: 'var(--accent)',
                  border: 'none',
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.65 : 1,
                  transition: 'opacity var(--t-fast)',
                }}
              >
                {saving ? t.tr('Kaydediliyor…') : t.tr('Kaydet')}
              </button>
              <button
                className="sso-cancel-btn"
                onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError(null); }}
                style={{
                  borderRadius: 'var(--r-md)',
                  border: '1.5px solid var(--line)',
                  background: 'var(--panel)',
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                  transition: 'background var(--t-fast)',
                }}
              >
                {t.tr("İptal")}
              </button>
            </div>
          </div>
        )}

        {/* ── Provider Cards ──────────────────────────────────────── */}
        {busy && providers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map((n) => (
              <div
                key={n}
                className="sso-skeleton"
                style={{
                  borderRadius: 'var(--r-xl)',
                  border: '1.5px solid var(--line)',
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ height: 14, width: 160, background: 'var(--line)', borderRadius: 4 }} />
                  <div style={{ height: 12, width: 220, background: 'color-mix(in srgb, var(--line) 60%, var(--panel))', borderRadius: 4 }} />
                  <div style={{ height: 12, width: 130, background: 'color-mix(in srgb, var(--line) 60%, var(--panel))', borderRadius: 4 }} />
                </div>
                <div style={{ height: 32, width: 60, background: 'var(--line)', borderRadius: 'var(--r-md)' }} />
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div
            style={{
              borderRadius: 'var(--r-xl)',
              border: '1.5px dashed var(--line)',
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--r-md)',
                background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              <Icon name="link" size={24} />
            </span>
            <p style={{ fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{t.tr("Henüz SSO sağlayıcı yok")}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {t.tr("Yukarıdaki butonu kullanarak ilk entegrasyonu ekleyin.")}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="sso-provider-row"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  borderRadius: 'var(--r-xl)',
                  border: '1.5px solid var(--line)',
                  padding: 16,
                  background: 'var(--panel)',
                  transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
                }}
              >
                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  {/* Badges row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                    <TypeBadge type={provider.type} />
                    {provider.isActive ? (
                      <span
                        style={{
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: 'color-mix(in srgb, var(--accent) 12%, var(--panel))',
                          color: 'var(--accent)',
                          border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Icon name="check" size={10} />
                        {t.tr("Aktif")}
                      </span>
                    ) : (
                      <span
                        style={{
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: 'color-mix(in srgb, var(--muted) 10%, var(--panel))',
                          color: 'var(--muted)',
                          border: '1px solid color-mix(in srgb, var(--muted) 20%, transparent)',
                        }}
                      >
                        {t.tr("Pasif")}
                      </span>
                    )}
                  </div>

                  <p style={{ fontWeight: 700, color: 'var(--ink)', margin: 0, fontSize: 14, lineHeight: 1.3 }}>
                    {t.tr(provider.name)}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-2)',
                      fontFamily: 'monospace',
                      margin: 0,
                      wordBreak: 'break-all',
                    }}
                  >
                    {provider.issuer}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      fontSize: 11,
                      color: 'var(--muted)',
                    }}
                  >
                    {provider.loginUrl && (
                      <span>
                        Login URL:{' '}
                        <span style={{ color: 'var(--ink-2)' }}>{provider.loginUrl}</span>
                      </span>
                    )}
                    {provider.clientId && (
                      <span>
                        Client ID:{' '}
                        <span style={{ color: 'var(--ink-2)', fontFamily: 'monospace' }}>
                          {provider.clientId}
                        </span>
                      </span>
                    )}
                    <span>{t.tr("Oluşturuldu")}: {fmtDate(provider.createdAt)}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  className="sso-delete-btn"
                  onClick={() => handleDelete(provider.id, provider.name)}
                  disabled={busy}
                  style={{
                    flexShrink: 0,
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid color-mix(in srgb, #ef4444 30%, var(--line))',
                    background: 'color-mix(in srgb, #ef4444 8%, var(--panel))',
                    padding: '7px 13px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ef4444',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'background var(--t-fast)',
                  }}
                >
                  <Icon name="trash" size={13} />
                  {t.tr("Sil")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
