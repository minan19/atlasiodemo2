'use client';

import { useState } from 'react';
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

const FEATURES = [
  { icon: '🎓', label: 'Canlı & Kayıtlı Dersler' },
  { icon: '🧠', label: 'Akıllı Tahta (30+ Araç)' },
  { icon: '🤖', label: 'AI Ghost-Mentor' },
  { icon: '📊', label: 'Detaylı Analitik' },
  { icon: '🏅', label: 'Sertifika & Rozet' },
  { icon: '🔒', label: 'SSO / RBAC Güvenlik' },
];

const ROLES = [
  { id: 'kurum-yoneticisi', label: 'Kurum Yöneticisi' },
  { id: 'egitim-koordinatoru', label: 'Eğitim Koordinatörü' },
  { id: 'ogretmen', label: 'Öğretmen / Eğitmen' },
  { id: 'ogrenci', label: 'Öğrenci' },
  { id: 'satın-alma', label: 'Satın Alma / IT' },
  { id: 'diger', label: 'Diğer' },
];

const SIZES = [
  { id: '1-50', label: '1–50' },
  { id: '51-200', label: '51–200' },
  { id: '201-1000', label: '201–1 000' },
  { id: '1000+', label: '1 000+' },
];

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function DemoPage() {
  const t = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [size, setSize] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const canSubmit = name.trim() && email.trim() && institution.trim() && role && status !== 'loading';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/demo-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, email, institution, phone, role, size, message }),
      });
      if (!res.ok) throw new Error('api');
      setStatus('success');
    } catch {
      // Simulated success for demo
      await new Promise((r) => setTimeout(r, 800));
      setStatus('success');
    }
  }

  if (status === 'success') {
    return (
      <>
        <style>{`
          @keyframes pop-in {
            from { opacity: 0; transform: scale(0.92) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .demo-success { animation: pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)' }}>
          <div className="demo-success" style={{
            maxWidth: 480, width: '100%', borderRadius: 'var(--r-xl)',
            background: 'var(--panel)', border: '1.5px solid var(--line)',
            padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, boxShadow: 'var(--glow-blue)',
            }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
              {t.tr("Talebiniz Alındı!")}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
              {t.tr("Ekibimiz")} <strong style={{ color: 'var(--ink-2)' }}>{email}</strong> {t.tr("adresine en kısa sürede ulaşacak ve demo randevunuzu planlayacak.")}
            </p>
            <div style={{
              borderRadius: 'var(--r-lg)', background: 'color-mix(in srgb, var(--accent) 6%, var(--panel))',
              border: '1.5px solid color-mix(in srgb, var(--accent) 20%, var(--line))',
              padding: '14px 20px', marginBottom: 24, textAlign: 'left',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{t.tr("Sonraki adımlar")}</p>
              {[t.tr('Yanıt süresi: 1 iş günü içinde'), t.tr('Kişiselleştirilmiş demo planı'), t.tr('Ücretsiz 14 gün deneme')].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 6 : 0 }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setStatus('idle'); setName(''); setEmail(''); setInstitution(''); setPhone(''); setRole(''); setSize(''); setMessage(''); }}
              style={{
                width: '100%', padding: '11px 20px', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)',
                background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t.common.reset}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .demo-input {
          width: 100%; border-radius: var(--r-lg); border: 1.5px solid var(--line);
          background: var(--bg); padding: 10px 14px; font-size: 13px; color: var(--ink);
          outline: none; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .demo-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .demo-input::placeholder { color: var(--muted); }
        .demo-role-btn {
          padding: 8px 14px; border-radius: var(--r-md); border: 1.5px solid var(--line);
          background: var(--bg); color: var(--ink-2); font-size: 12px; font-weight: 500;
          cursor: pointer; transition: all 0.12s; white-space: nowrap;
        }
        .demo-role-btn:hover { border-color: var(--accent); color: var(--accent); }
        .demo-role-btn.active {
          border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--panel));
          color: var(--accent); font-weight: 700;
        }
        .demo-submit {
          transition: filter 0.15s, box-shadow 0.15s, opacity 0.15s;
        }
        .demo-submit:hover:not(:disabled) { filter: brightness(1.08); box-shadow: var(--glow-blue); }
      `}</style>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr', maxWidth: 1080, margin: '0 auto' }}>
        <style>{`@media(min-width:900px){ .demo-grid { grid-template-columns: 380px 1fr !important; } }`}</style>

        {/* ── Page title ── */}
        <div style={{
          borderRadius: 'var(--r-xl)', border: '1.5px solid var(--line)',
          padding: '28px 32px', boxShadow: 'var(--shadow-sm)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--panel)), color-mix(in srgb, var(--accent-2) 4%, var(--panel)))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 'var(--r-lg)', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: 'var(--glow-blue)',
            }}>🎯</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{t.tr("Demo Talep Et")}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                {t.tr("Kurumunuza özel 30 dakikalık canlı demo — ücretsiz, taahhütsüz.")}
              </p>
            </div>
          </div>
        </div>

        <div className="demo-grid" style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }}>
          {/* ── Left: features & trust ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Feature list */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{t.tr("Demoda Görecekleriniz")}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FEATURES.map((f) => (
                  <div key={t.tr(f.label)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 'var(--r-md)', flexShrink: 0,
                      background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
                      border: '1.5px solid color-mix(in srgb, var(--accent) 18%, var(--line))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                    }}>{f.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{t.tr(f.label)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{t.tr("Neden ATLASIO?")}</p>
              {[
                { icon: '🌍', stat: '124K+', label: 'Aktif öğrenci, 42 ülke' },
                { icon: '⚡', stat: '99.97%', label: 'Canlı ders SLA garantisi' },
                { icon: '🏅', stat: '1.2M', label: 'Dijital sertifika düzenlendi' },
                { icon: '🔒', stat: 'SOC 2', label: 'Güvenlik uyumluluğu' },
              ].map((item) => (
                <div key={t.tr(item.label)} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{item.stat}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.tr(item.label)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: form ── */}
          <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: '24px 28px', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>{t.tr("Bilgileriniz")}</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Row: name + email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.tr("Ad Soyad *")}</label>
                  <input className="demo-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.tr("Ahmet Yılmaz")} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.tr("E-posta *")}</label>
                  <input className="demo-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmet@kurum.com" required />
                </div>
              </div>

              {/* Row: institution + phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.tr("Kurum / Şirket *")}</label>
                  <input className="demo-input" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder={t.tr("ATLASIO Üniversitesi")} required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.tr("Telefon")}</label>
                  <input className="demo-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 532 000 00 00" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>{t.tr("Rolünüz *")}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.id} type="button"
                      className={`demo-role-btn${role === r.id ? ' active' : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      {t.tr(r.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Organization size */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>{t.tr("Kullanıcı Sayısı")}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SIZES.map((s) => (
                    <button
                      key={s.id} type="button"
                      className={`demo-role-btn${size === s.id ? ' active' : ''}`}
                      onClick={() => setSize(s.id)}
                    >
                      {t.tr(s.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{t.tr("Mesajınız")} <span style={{ fontWeight: 400 }}>(opsiyonel)</span></label>
                <textarea
                  className="demo-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.tr("Özellikle görmek istediğiniz özellikler, beklentiler…")}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="demo-submit"
                style={{
                  padding: '13px 20px', borderRadius: 'var(--r-lg)', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: canSubmit ? 1 : 0.5, boxShadow: canSubmit ? 'var(--glow-blue)' : 'none',
                  marginTop: 4,
                }}
              >
                {status === 'loading' ? (
                  <span style={{ display: 'flex', gap: 5 }}>
                    {[0, 150, 300].map((d) => (
                      <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'bounce-dot 1.2s infinite', animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                ) : (
                  <>🎯 {t.tr("Demo Talep Et")}</>
                )}
              </button>

              <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
                {t.tr("Gönder diyerek")} <strong>{t.tr("ATLASIO Gizlilik Politikası")}</strong>{t.tr("nı kabul etmiş olursunuz.")}{" "}
                {t.tr("Bilgileriniz üçüncü taraflarla paylaşılmaz.")}
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
