'use client';

import { useEffect, useState } from 'react';

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
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
      />
      <span className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
        {active ? 'Aktif' : 'Pasif'}
      </span>
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="inline-block h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
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
  const styles =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  const icon = type === 'success' ? '✓' : '✗';

  return (
    <div
      className={`mt-3 flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${styles}`}
    >
      <span>
        {icon} {message}
      </span>
      <button onClick={onClose} className="shrink-0 font-semibold hover:opacity-70">
        ✕
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
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
  const base =
    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60';
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

  return (
    <button disabled={loading} onClick={onClick} className={`${base} ${styles}`}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function ConnectorCard({
  icon,
  title,
  description,
  children,
  stagger,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
  stagger: 1 | 2 | 3 | 4;
}) {
  const staggerClass = `stagger-${stagger}`;
  return (
    <div
      className={`glass rounded-2xl border border-slate-200 p-5 space-y-4 animate-fade-slide-up ${staggerClass}`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <span>{icon}</span>
            {title}
          </h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <StatusDot active />
      </div>

      <div className="h-px bg-slate-100" />

      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card 1 — LTI 1.3
// ---------------------------------------------------------------------------

function LtiCard() {
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
      if (!res.ok) throw new Error(data?.message ?? 'Launch başarısız');
      setLaunchResult(JSON.stringify(data, null, 2));
      setLaunchFlash({ type: 'success', msg: 'LTI launch başarıyla tamamlandı.' });
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
      if (!res.ok) throw new Error(data?.message ?? 'Not gönderimi başarısız');
      setGradeResult(JSON.stringify(data, null, 2));
      setGradeFlash({ type: 'success', msg: 'Not başarıyla gönderildi.' });
    } catch (err: unknown) {
      setGradeFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setGradeLoading(false);
    }
  };

  return (
    <ConnectorCard
      icon="🎓"
      title="LTI 1.3 Bağlantısı"
      description="Harici araç launch ve not gönderimi"
      stagger={1}
    >
      {/* Launch Form */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Launch</p>
        <div className="grid gap-3 sm:grid-cols-3">
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
        <ActionButton onClick={handleLaunch} loading={launchLoading}>
          Launch Başlat
        </ActionButton>
        {launchFlash && (
          <Flash type={launchFlash.type} message={launchFlash.msg} onClose={() => setLaunchFlash(null)} />
        )}
        {launchResult && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700">
            {launchResult}
          </pre>
        )}
      </div>

      <div className="h-px bg-slate-100" />

      {/* Grade Form */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Not Gönder</p>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Yorum (opsiyonel)</label>
            <input
              type="text"
              placeholder="Opsiyonel yorum..."
              value={gradeComment}
              onChange={(e) => setGradeComment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
        <ActionButton onClick={handleGrade} loading={gradeLoading}>
          Not Gönder
        </ActionButton>
        {gradeFlash && (
          <Flash type={gradeFlash.type} message={gradeFlash.msg} onClose={() => setGradeFlash(null)} />
        )}
        {gradeResult && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700">
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
      if (!res.ok) throw new Error('Dışa aktarma başarısız');
      const data = await res.json();
      const count =
        (Array.isArray(data?.users) ? data.users.length : 0) +
        (Array.isArray(data?.courses) ? data.courses.length : 0) +
        (Array.isArray(data?.enrollments) ? data.enrollments.length : 0);
      setExportFlash({
        type: 'success',
        msg: `Dışa aktarma tamamlandı — toplam ${count} kayıt döndü.`,
      });
    } catch (err: unknown) {
      setExportFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
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
      if (!res.ok) throw new Error('İçe aktarma başarısız');
      setImportFlash({ type: 'success', msg: 'OneRoster içe aktarma başarıyla tamamlandı.' });
    } catch (err: unknown) {
      setImportFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <ConnectorCard
      icon="📋"
      title="OneRoster Senkronizasyonu"
      description="Kullanıcı ve kayıt verilerini içe/dışa aktar"
      stagger={2}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          IMS Global OneRoster 1.1 standardı ile kullanıcı, kurs ve kayıt verilerini senkronize edin.
        </p>
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={handleExport} loading={exportLoading} variant="secondary">
            Dışa Aktar
          </ActionButton>
          <ActionButton onClick={handleImport} loading={importLoading}>
            İçe Aktar (Demo)
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
  const [topicId, setTopicId] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFlash, setExportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importFlash, setImportFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleExport = async () => {
    if (!topicId.trim()) {
      setExportFlash({ type: 'error', msg: 'Lütfen bir Topic ID girin.' });
      return;
    }
    setExportLoading(true);
    setExportFlash(null);
    try {
      const res = await fetch(
        `${API_BASE}/connectors/qti/export?topicId=${encodeURIComponent(topicId.trim())}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('QTI dışa aktarma başarısız');
      const data = await res.json();
      const count = Array.isArray(data?.items) ? data.items.length : Array.isArray(data) ? data.length : 0;
      setExportFlash({
        type: 'success',
        msg: `QTI dışa aktarma tamamlandı — ${count} soru döndü.`,
      });
    } catch (err: unknown) {
      setExportFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
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
      if (!res.ok) throw new Error('QTI içe aktarma başarısız');
      setImportFlash({ type: 'success', msg: 'QTI içe aktarma başarıyla tamamlandı (demo soru eklendi).' });
    } catch (err: unknown) {
      setImportFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <ConnectorCard
      icon="📝"
      title="QTI İçe/Dışa Aktarma"
      description="Soru bankası senkronizasyonu"
      stagger={3}
    >
      <div className="space-y-3">
        <InputField
          label="Topic ID"
          placeholder="ör. topic-mathematics-101"
          value={topicId}
          onChange={setTopicId}
        />
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={handleExport} loading={exportLoading} variant="secondary">
            QTI Dışa Aktar
          </ActionButton>
          <ActionButton onClick={handleImport} loading={importLoading}>
            QTI İçe Aktar (Demo)
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
  const [certificationId, setCertificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleIssue = async () => {
    if (!certificationId.trim()) {
      setFlash({ type: 'error', msg: 'Lütfen bir Certification ID girin.' });
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
      if (!res.ok) throw new Error(data?.message ?? 'Rozet yayınlama başarısız');
      setResult(JSON.stringify(data, null, 2));
      setFlash({ type: 'success', msg: 'Open Badge başarıyla yayınlandı.' });
    } catch (err: unknown) {
      setFlash({ type: 'error', msg: (err as Error)?.message ?? 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConnectorCard
      icon="🏅"
      title="Open Badges"
      description="IMS Global Open Badges 2.0 sertifika yayını"
      stagger={4}
    >
      <div className="space-y-3">
        <InputField
          label="Certification ID"
          placeholder="ör. cert-frontend-developer"
          value={certificationId}
          onChange={setCertificationId}
        />
        <ActionButton onClick={handleIssue} loading={loading}>
          Rozet Yayınla
        </ActionButton>
        {flash && (
          <Flash type={flash.type} message={flash.msg} onClose={() => setFlash(null)} />
        )}
        {result && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-700">
            {result}
          </pre>
        )}
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
          Open Badges 2.0 standardı ile verilen rozetler, LinkedIn ve diğer platformlarda doğrulanabilir.
        </p>
      </div>
    </ConnectorCard>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminConnectorsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="space-y-6">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Hero */}
      <header className="glass rounded-2xl border border-slate-200 p-6 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Entegrasyon Merkezi</div>
          <h1 className="text-3xl font-semibold">🔌 Entegrasyon Bağlayıcıları</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            LTI, OneRoster, QTI ve Open Badges entegrasyonlarını yönetin.
          </p>
        </div>
      </header>

      {/* Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: '🎓', label: 'LTI 1.3', value: 'Aktif', color: 'text-indigo-700', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200', stagger: 'stagger-1' },
          { icon: '📋', label: 'OneRoster', value: 'Aktif', color: 'text-blue-700', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200', stagger: 'stagger-2' },
          { icon: '📝', label: 'QTI', value: 'Aktif', color: 'text-violet-700', bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200', stagger: 'stagger-3' },
          { icon: '🏅', label: 'Open Badges', value: 'Aktif', color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200', stagger: 'stagger-4' },
        ].map((m) => (
          <div
            key={m.label}
            className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up ${m.stagger} ${m.bg}`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </div>
            <p className={`metric text-2xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </section>

      {/* Connector Cards — 2x2 grid */}
      <section className="grid gap-6 lg:grid-cols-2">
        <LtiCard />
        <OneRosterCard />
        <QtiCard />
        <OpenBadgesCard />
      </section>
    </main>
  );
}
