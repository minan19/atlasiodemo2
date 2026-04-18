'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '../../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('accessToken') ?? '';
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

// ---------------------------------------------------------------------------
// Icon Component
// ---------------------------------------------------------------------------

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
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
    case 'graduation-cap':
      return (
        <svg {...props}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
        </svg>
      );
    case 'clipboard-list':
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'award':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...props}>
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 8V2" />
          <path d="M18 8H6a2 2 0 0 0-2 2v2a6 6 0 0 0 12 0v-2a2 2 0 0 0-2-2Z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'x':
      return (
        <svg {...props}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'loader':
      return (
        <svg {...props} style={{ ...props.style, animation: 'orbit-spin 0.8s linear infinite' }}>
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...props}>
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <polyline points="8 17 12 21 16 17" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
        </svg>
      );
    case 'send':
      return (
        <svg {...props}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'info':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ active }: { active: boolean }) {
  const t = useI18n();
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: active ? '#10b981' : 'var(--muted)',
          boxShadow: active ? '0 0 6px #10b98166' : 'none',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 99,
          padding: '2px 8px',
          background: active
            ? 'color-mix(in srgb, #10b981 12%, var(--panel))'
            : 'color-mix(in srgb, var(--muted) 12%, var(--panel))',
          color: active ? '#10b981' : 'var(--muted)',
          border: `1px solid ${active ? '#10b98133' : 'var(--line)'}`,
        }}
      >
        {active ? t.tr("Aktif") : t.tr("Pasif")}
      </span>
    </span>
  );
}

function Spinner() {
  return <Icon name="loader" size={14} />;
}

function Flash({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  const isSuccess = type === 'success';
  return (
    <div
      style={{
        marginTop: 10,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${isSuccess ? '#10b98133' : '#f4363633'}`,
        background: isSuccess
          ? 'color-mix(in srgb, #10b981 8%, var(--panel))'
          : 'color-mix(in srgb, #f43636 8%, var(--panel))',
        color: isSuccess ? '#059669' : '#e53e3e',
        padding: '8px 12px',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={isSuccess ? 'check' : 'x'} size={13} />
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          padding: 0,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--ink-2)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          borderRadius: 'var(--r-md)',
          border: '1.5px solid var(--line)',
          background: 'var(--bg)',
          padding: '8px 12px',
          fontSize: 13,
          color: 'var(--ink)',
          outline: 'none',
          transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.boxShadow = 'var(--glow-blue)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--line)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

function ActionButton({
  onClick,
  loading,
  children,
  variant = 'primary',
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      disabled={loading}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        borderRadius: 'var(--r-md)',
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background var(--t-fast), box-shadow var(--t-fast), opacity var(--t-fast)',
        border: isPrimary ? 'none' : '1.5px solid var(--line)',
        background: isPrimary ? 'var(--accent)' : 'var(--panel)',
        color: isPrimary ? '#fff' : 'var(--ink)',
        boxShadow: isPrimary ? 'var(--shadow-sm)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = isPrimary
            ? 'var(--accent-2)'
            : 'color-mix(in srgb, var(--accent) 6%, var(--panel))';
          e.currentTarget.style.boxShadow = isPrimary ? 'var(--shadow-md)' : 'var(--shadow-sm)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isPrimary ? 'var(--accent)' : 'var(--panel)';
        e.currentTarget.style.boxShadow = isPrimary ? 'var(--shadow-sm)' : 'none';
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function ConnectorCard({
  iconName,
  title,
  description,
  children,
  accentColor,
}: {
  iconName: string;
  title: string;
  description: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 'var(--r-xl)',
        background: 'var(--panel)',
        border: '1.5px solid var(--line)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition: 'box-shadow var(--t-fast)',
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 'var(--r-sm)',
                background: accentColor
                  ? `color-mix(in srgb, ${accentColor} 12%, var(--panel))`
                  : 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
                color: accentColor ?? 'var(--accent)',
                flexShrink: 0,
              }}
            >
              <Icon name={iconName} size={15} />
            </span>
            {title}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{description}</p>
        </div>
        <StatusDot active />
      </div>

      <div style={{ height: 1, background: 'var(--line)', flexShrink: 0 }} />

      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — LTI 1.3
// ---------------------------------------------------------------------------

function LtiCard() {
  const t = useI18n();
  const [launchDeploymentId, setLaunchDeploymentId] = useState('');
  const [launchUserId, setLaunchUserId] = useState('');
  const [launchCourseId, setLaunchCourseId] = useState('');
  const [launchLoading, setLaunchLoading] = useState(false);
  const [launchFlash, setLaunchFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [launchResult, setLaunchResult] = useState<string | null>(null);

  const [gradeDeploymentId, setGradeDeploymentId] = useState('');
  const [gradeUserId, setGradeUserId] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [gradeMaxScore, setGradeMaxScore] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeFlash, setGradeFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [gradeResult, setGradeResult] = useState<string | null>(null);

  const handleLaunch = async () => {
    setLaunchLoading(true);
    setLaunchFlash(null);
    setLaunchResult(null);
    try {
      const res = await fetch(`${API_BASE}/connectors/lti/launch`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deploymentId: launchDeploymentId,
          userId: launchUserId,
          courseId: launchCourseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? t.tr('Launch başarısız'));
      setLaunchResult(JSON.stringify(data, null, 2));
      setLaunchFlash({ type: 'success', msg: t.tr('LTI launch başarıyla tamamlandı.') });
    } catch (err: unknown) {
      setLaunchFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setLaunchLoading(false);
    }
  };

  const handleGrade = async () => {
    setGradeLoading(true);
    setGradeFlash(null);
    setGradeResult(null);
    try {
      const res = await fetch(`${API_BASE}/connectors/lti/grade`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          deploymentId: gradeDeploymentId,
          userId: gradeUserId,
          score: Number(gradeScore),
          maxScore: Number(gradeMaxScore),
          ...(gradeComment.trim() ? { comment: gradeComment.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? t.tr('Not gönderimi başarısız'));
      setGradeResult(JSON.stringify(data, null, 2));
      setGradeFlash({ type: 'success', msg: t.tr('Not başarıyla gönderildi.') });
    } catch (err: unknown) {
      setGradeFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setGradeLoading(false);
    }
  };

  return (
    <ConnectorCard
      iconName="graduation-cap"
      title={t.tr("LTI 1.3 Bağlantısı")}
      description={t.tr("Harici araç launch ve not gönderimi")}
      accentColor="#6366f1"
    >
      {/* Launch Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ink-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          Launch
        </p>
        <div className="connectors-grid-3">
          <InputField
            label="Deployment ID"
            placeholder="dep-001"
            value={launchDeploymentId}
            onChange={setLaunchDeploymentId}
          />
          <InputField
            label="User ID"
            placeholder="user-123"
            value={launchUserId}
            onChange={setLaunchUserId}
          />
          <InputField
            label="Course ID"
            placeholder="course-abc"
            value={launchCourseId}
            onChange={setLaunchCourseId}
          />
        </div>
        <div>
          <ActionButton onClick={handleLaunch} loading={launchLoading}>
            <Icon name="zap" size={13} />
            {t.tr("Launch Başlat")}
          </ActionButton>
        </div>
        {launchFlash && (
          <Flash type={launchFlash.type} message={launchFlash.msg} onClose={() => setLaunchFlash(null)} />
        )}
        {launchResult && (
          <pre
            style={{
              marginTop: 4,
              maxHeight: 160,
              overflowY: 'auto',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--line)',
              background: 'var(--bg)',
              padding: 12,
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            {launchResult}
          </pre>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--line)' }} />

      {/* Grade Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ink-2)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          {t.tr("Not Gönder")}
        </p>
        <div className="connectors-grid-2">
          <InputField
            label="Deployment ID"
            placeholder="dep-001"
            value={gradeDeploymentId}
            onChange={setGradeDeploymentId}
          />
          <InputField
            label="User ID"
            placeholder="user-123"
            value={gradeUserId}
            onChange={setGradeUserId}
          />
          <InputField
            label="Puan (0-100)"
            type="number"
            placeholder="85"
            value={gradeScore}
            onChange={setGradeScore}
          />
          <InputField
            label="Max Puan"
            type="number"
            placeholder="100"
            value={gradeMaxScore}
            onChange={setGradeMaxScore}
          />
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ink-2)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              {t.tr("Yorum (opsiyonel)")}
            </label>
            <input
              type="text"
              placeholder={t.tr("Opsiyonel yorum...")}
              value={gradeComment}
              onChange={(e) => setGradeComment(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 'var(--r-md)',
                border: '1.5px solid var(--line)',
                background: 'var(--bg)',
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = 'var(--glow-blue)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
        <div>
          <ActionButton onClick={handleGrade} loading={gradeLoading}>
            <Icon name="send" size={13} />
            {t.tr("Not Gönder")}
          </ActionButton>
        </div>
        {gradeFlash && (
          <Flash type={gradeFlash.type} message={gradeFlash.msg} onClose={() => setGradeFlash(null)} />
        )}
        {gradeResult && (
          <pre
            style={{
              marginTop: 4,
              maxHeight: 160,
              overflowY: 'auto',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--line)',
              background: 'var(--bg)',
              padding: 12,
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            {gradeResult}
          </pre>
        )}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Card 2 — OneRoster
// ---------------------------------------------------------------------------

function OneRosterCard() {
  const t = useI18n();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFlash, setExportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importFlash, setImportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleExport = async () => {
    setExportLoading(true);
    setExportFlash(null);
    try {
      const res = await fetch(`${API_BASE}/connectors/oneroster/export`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(t.tr('Dışa aktarma başarısız'));
      const data = await res.json();
      const count =
        (Array.isArray(data?.users) ? data.users.length : 0) +
        (Array.isArray(data?.courses) ? data.courses.length : 0) +
        (Array.isArray(data?.enrollments) ? data.enrollments.length : 0);
      setExportFlash({
        type: 'success',
        msg: `${t.tr('Dışa aktarma tamamlandı')} — ${t.tr('toplam')} ${count} ${t.tr('kayıt döndü.')
        }`,
      });
    } catch (err: unknown) {
      setExportFlash({ type: 'error', msg: (err as Error)?.message ?? t.tr('Bir hata oluştu.') });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    setImportLoading(true);
    setImportFlash(null);
    try {
      const demoPayload = {
        orgs: [{ sourcedId: 'org1', name: 'Atlas Academy', type: 'school' }],
        users: [],
        courses: [],
        enrollments: [],
      };
      const res = await fetch(`${API_BASE}/connectors/oneroster/import`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(demoPayload),
      });
      if (!res.ok) throw new Error(t.tr('İçe aktarma başarısız'));
      setImportFlash({ type: 'success', msg: t.tr('OneRoster içe aktarma başarıyla tamamlandı.') });
    } catch (err: unknown) {
      setImportFlash({ type: 'error', msg: (err as Error)?.message ?? t.tr('Bir hata oluştu.') });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <ConnectorCard
      iconName="clipboard-list"
      title={t.tr("OneRoster Senkronizasyonu")}
      description={t.tr("Kullanıcı ve kayıt verilerini içe/dışa aktar")}
      accentColor="#3b82f6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          {t.tr("IMS Global OneRoster 1.1 standardı ile kullanıcı, kurs ve kayıt verilerini senkronize edin.")}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <ActionButton onClick={handleExport} loading={exportLoading} variant="secondary">
            <Icon name="download" size={13} />
            {t.tr("Dışa Aktar")}
          </ActionButton>
          <ActionButton onClick={handleImport} loading={importLoading}>
            <Icon name="upload" size={13} />
            {t.tr("İçe Aktar (Demo)")}
          </ActionButton>
        </div>
        {exportFlash && (
          <Flash type={exportFlash.type} message={exportFlash.msg} onClose={() => setExportFlash(null)} />
        )}
        {importFlash && (
          <Flash type={importFlash.type} message={importFlash.msg} onClose={() => setImportFlash(null)} />
        )}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Card 3 — QTI
// ---------------------------------------------------------------------------

function QtiCard() {
  const t = useI18n();
  const [topicId, setTopicId] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFlash, setExportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importFlash, setImportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleExport = async () => {
    if (!topicId.trim()) {
      setExportFlash({ type: 'error', msg: t.tr('Lütfen bir Topic ID girin.') });
      return;
    }
    setExportLoading(true);
    setExportFlash(null);
    try {
      const res = await fetch(
        `${API_BASE}/connectors/qti/export?topicId=${encodeURIComponent(topicId.trim())}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error(t.tr('QTI dışa aktarma başarısız'));
      const data = await res.json();
      const count = Array.isArray(data?.items) ? data.items.length : Array.isArray(data) ? data.length : 0;
      setExportFlash({
        type: 'success',
        msg: `${t.tr('QTI dışa aktarma tamamlandı')} — ${count} ${t.tr('soru döndü.')}`,
      });
    } catch (err: unknown) {
      setExportFlash({ type: 'error', msg: (err as Error)?.message ?? t.tr('Bir hata oluştu.') });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    setImportLoading(true);
    setImportFlash(null);
    try {
      const demoPayload = {
        items: [
          {
            identifier: 'q1',
            type: 'multipleChoice',
            prompt: '2+2=?',
            options: ['3', '4', '5'],
            answer: '4',
          },
        ],
        topicId: 'demo-topic',
      };
      const res = await fetch(`${API_BASE}/connectors/qti/import`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(demoPayload),
      });
      if (!res.ok) throw new Error(t.tr('QTI içe aktarma başarısız'));
      setImportFlash({ type: 'success', msg: t.tr('QTI içe aktarma başarıyla tamamlandı (demo soru eklendi).') });
    } catch (err: unknown) {
      setImportFlash({ type: 'error', msg: (err as Error)?.message ?? t.tr('Bir hata oluştu.') });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <ConnectorCard
      iconName="file-text"
      title={t.tr("QTI İçe/Dışa Aktarma")}
      description={t.tr("Soru bankası senkronizasyonu")}
      accentColor="#8b5cf6"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InputField
          label="Topic ID"
          placeholder="ör. topic-mathematics-101"
          value={topicId}
          onChange={setTopicId}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <ActionButton onClick={handleExport} loading={exportLoading} variant="secondary">
            <Icon name="download" size={13} />
            {t.tr("QTI Dışa Aktar")}
          </ActionButton>
          <ActionButton onClick={handleImport} loading={importLoading}>
            <Icon name="upload" size={13} />
            {t.tr("QTI İçe Aktar (Demo)")}
          </ActionButton>
        </div>
        {exportFlash && (
          <Flash type={exportFlash.type} message={exportFlash.msg} onClose={() => setExportFlash(null)} />
        )}
        {importFlash && (
          <Flash type={importFlash.type} message={importFlash.msg} onClose={() => setImportFlash(null)} />
        )}
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Card 4 — Open Badges
// ---------------------------------------------------------------------------

function OpenBadgesCard() {
  const t = useI18n();
  const [certificationId, setCertificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleIssue = async () => {
    if (!certificationId.trim()) {
      setFlash({ type: 'error', msg: t.tr('Lütfen bir Certification ID girin.') });
      return;
    }
    setLoading(true);
    setFlash(null);
    setResult(null);
    try {
      const res = await fetch(
        `${API_BASE}/connectors/badges/issue/${encodeURIComponent(certificationId.trim())}`,
        {
          method: 'POST',
          headers: authHeaders(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? t.tr('Rozet yayınlama başarısız'));
      setResult(JSON.stringify(data, null, 2));
      setFlash({ type: 'success', msg: t.tr('Open Badge başarıyla yayınlandı.') });
    } catch (err: unknown) {
      setFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConnectorCard
      iconName="award"
      title="Open Badges"
      description={t.tr("IMS Global Open Badges 2.0 sertifika yayını")}
      accentColor="#f59e0b"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InputField
          label="Certification ID"
          placeholder="ör. cert-frontend-developer"
          value={certificationId}
          onChange={setCertificationId}
        />
        <div>
          <ActionButton onClick={handleIssue} loading={loading}>
            <Icon name="award" size={13} />
            {t.tr("Rozet Yayınla")}
          </ActionButton>
        </div>
        {flash && (
          <Flash type={flash.type} message={flash.msg} onClose={() => setFlash(null)} />
        )}
        {result && (
          <pre
            style={{
              marginTop: 4,
              maxHeight: 160,
              overflowY: 'auto',
              borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--line)',
              background: 'var(--bg)',
              padding: 12,
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            {result}
          </pre>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            borderRadius: 'var(--r-md)',
            border: '1.5px solid color-mix(in srgb, #f59e0b 25%, var(--line))',
            background: 'color-mix(in srgb, #f59e0b 8%, var(--panel))',
            padding: '10px 12px',
            fontSize: 12,
            color: '#b45309',
            lineHeight: 1.6,
          }}
        >
          <Icon name="info" size={13} />
          <span>
            {t.tr("Open Badges 2.0 standardı ile verilen rozetler, LinkedIn ve diğer platformlarda doğrulanabilir.")}
          </span>
        </div>
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

const METRICS = [
  { iconName: 'graduation-cap', label: 'LTI 1.3',     valueKey: 'Aktif', accentColor: '#6366f1' },
  { iconName: 'clipboard-list', label: 'OneRoster',    valueKey: 'Aktif', accentColor: '#3b82f6' },
  { iconName: 'file-text',      label: 'QTI',          valueKey: 'Aktif', accentColor: '#8b5cf6' },
  { iconName: 'award',          label: 'Open Badges',  valueKey: 'Aktif', accentColor: '#f59e0b' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminConnectorsPage() {
  const t = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <style>{`
          @keyframes orbit-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.9; }
          }
          .orbit-skel {
            border-radius: var(--r-xl);
            background: var(--line);
            animation: orbit-pulse 1.4s ease-in-out infinite;
          }
        `}</style>
        <div className="orbit-skel" style={{ height: 120 }} />
        <div className="connectors-grid-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="orbit-skel" style={{ height: 256 }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbit-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .connectors-grid-2 {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr;
        }
        .connectors-grid-3 {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        .connectors-metrics {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px) {
          .connectors-grid-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          .connectors-metrics {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 768px) {
          .connectors-grid-2 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .connector-metric-card:hover {
          box-shadow: var(--shadow-md) !important;
          transform: translateY(-1px);
        }
        .connector-metric-card {
          transition: box-shadow var(--t-fast), transform var(--t-fast);
        }
      `}</style>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Hero */}
        <header
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            animation: 'orbit-fade-up 0.4s ease both',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 99,
              border: '1.5px solid var(--line)',
              background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              width: 'fit-content',
            }}
          >
            <Icon name="plug" size={11} />
            {t.tr("Entegrasyon Merkezi")}
          </div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 'var(--r-md)',
                background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))',
                color: 'var(--accent)',
              }}
            >
              <Icon name="plug" size={18} />
            </span>
            {t.tr("Entegrasyon Bağlayıcıları")}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
            {t.tr("LTI, OneRoster, QTI ve Open Badges entegrasyonlarını yönetin.")}
          </p>
        </header>

        {/* Metrics */}
        <section className="connectors-metrics">
          {METRICS.map((m, i) => (
            <div
              key={t.tr(m.label)}
              className="connector-metric-card"
              style={{
                borderRadius: 'var(--r-xl)',
                background: `color-mix(in srgb, ${m.accentColor} 6%, var(--panel))`,
                border: `1.5px solid color-mix(in srgb, ${m.accentColor} 20%, var(--line))`,
                padding: 16,
                boxShadow: 'var(--shadow-sm)',
                animation: `orbit-fade-up 0.4s ${0.05 * (i + 1)}s ease both`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: 'var(--r-sm)',
                    background: `color-mix(in srgb, ${m.accentColor} 15%, var(--panel))`,
                    color: m.accentColor,
                  }}
                >
                  <Icon name={m.iconName} size={13} />
                </span>
                <span style={{ fontWeight: 600 }}>{t.tr(m.label)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: m.accentColor,
                    lineHeight: 1,
                  }}
                >
                  {t.tr(m.valueKey)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: '2px 8px',
                    background: `color-mix(in srgb, #10b981 12%, var(--panel))`,
                    color: '#059669',
                    border: '1px solid #10b98133',
                  }}
                >
                  Online
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Connector Cards — 2x2 grid */}
        <section className="connectors-grid-2">
          <LtiCard />
          <OneRosterCard />
          <QtiCard />
          <OpenBadgesCard />
        </section>
      </main>
    </>
  );
}
