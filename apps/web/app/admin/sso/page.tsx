'use client';

import { useEffect, useMemo, useState } from 'react';

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

function TypeBadge({ type }: { type: 'SAML' | 'OIDC' }) {
  return type === 'SAML' ? (
    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
      SAML 2.0
    </span>
  ) : (
    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
      OIDC
    </span>
  );
}

export default function AdminSsoPage() {
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
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200',
      val: 'text-slate-700',
      icon: '🔗',
    },
    {
      label: 'SAML 2.0',
      value: samlCount,
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200',
      val: 'text-blue-700',
      icon: '🔑',
    },
    {
      label: 'OIDC',
      value: oidcCount,
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200',
      val: 'text-violet-700',
      icon: '🪪',
    },
    {
      label: 'Aktif',
      value: activeCount,
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200',
      val: 'text-emerald-700',
      icon: '✓',
    },
  ];

  return (
    <main className="space-y-6">
      {/* Hero */}
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Kimlik Yönetimi</div>
          <h1 className="text-3xl font-semibold">SSO Entegrasyonları</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            SAML 2.0 ve OIDC kimlik sağlayıcıları — kurumsal tek oturum açma bağlantılarını yapılandırın ve yönetin.
          </p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-4 shadow-sm animate-fade-slide-up stagger-${i + 1} ${s.bg}`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            <p className={`text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </section>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between gap-4">
          <span>✓ {successMsg}</span>
          <button className="btn-link text-xs" onClick={() => setSuccessMsg(null)}>Kapat</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-4">
          <span>✗ {error}</span>
          <button className="btn-link text-xs" onClick={() => setError(null)}>Kapat</button>
        </div>
      )}

      {/* Provider List */}
      <section className="glass rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-violet-500 inline-block" />
            Kayıtlı Sağlayıcılar
            <span className="pill pill-sm">{providers.length}</span>
          </h2>
          <div className="flex gap-2">
            <button className="btn-link text-sm" onClick={load} disabled={busy}>
              {busy ? 'Yükleniyor…' : 'Yenile'}
            </button>
            <button
              onClick={() => { setShowForm((v) => !v); setFormError(null); }}
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition"
            >
              {showForm ? 'Formu Kapat' : '+ Yeni SSO Sağlayıcı Ekle'}
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            ⚠ Demo verisi gösteriliyor. Gerçek kayıtlar için API bağlantısını kontrol edin.
          </div>
        )}

        {/* Inline Create Form */}
        {showForm && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 space-y-4">
            <h3 className="text-sm font-bold text-violet-800">Yeni SSO Sağlayıcı</h3>

            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Sağlayıcı Adı *</label>
                <input
                  type="text"
                  placeholder="ör. Şirket Azure AD"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Type Toggle */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Protokol *</label>
                <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {(['SAML', 'OIDC'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                        form.type === t
                          ? t === 'SAML'
                            ? 'bg-blue-600 text-white'
                            : 'bg-violet-600 text-white'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issuer */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Issuer URL *</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.issuer}
                  onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Conditional SAML fields */}
              {form.type === 'SAML' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Login URL *</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.loginUrl ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, loginUrl: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Sertifika (PEM)</label>
                    <textarea
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      value={form.certificate ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, certificate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                    />
                  </div>
                </>
              )}

              {/* Conditional OIDC fields */}
              {form.type === 'OIDC' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Client ID *</label>
                    <input
                      type="text"
                      placeholder="ör. 123456.apps.googleusercontent.com"
                      value={form.clientId ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">Client Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={form.clientSecret ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError(null); }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        {busy && providers.length === 0 ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-100 p-4 flex justify-between items-start gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-56 bg-slate-100 rounded" />
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                </div>
                <div className="h-8 w-16 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <div className="text-4xl mb-3">🔗</div>
            <p className="font-semibold text-slate-700">Henüz SSO sağlayıcı yok</p>
            <p className="text-sm text-slate-400 mt-1">Yukarıdaki butonu kullanarak ilk entegrasyonu ekleyin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-100 p-4 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={provider.type} />
                    {provider.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 leading-snug">{provider.name}</p>
                  <p className="text-xs text-slate-500 font-mono break-all">{provider.issuer}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    {provider.loginUrl && (
                      <span>Login URL: <span className="text-slate-500">{provider.loginUrl}</span></span>
                    )}
                    {provider.clientId && (
                      <span>Client ID: <span className="text-slate-500 font-mono">{provider.clientId}</span></span>
                    )}
                    <span>Oluşturuldu: {fmtDate(provider.createdAt)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(provider.id, provider.name)}
                  disabled={busy}
                  className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition disabled:opacity-60"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
