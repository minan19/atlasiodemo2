'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '../api/client';

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Yönetici',
  HEAD_INSTRUCTOR: 'Baş Eğitmen',
  INSTRUCTOR: 'Eğitmen',
  STUDENT: 'Öğrenci',
  GUARDIAN: 'Veli',
};

const ROLE_GRADIENT: Record<string, string> = {
  ADMIN: 'from-red-500 to-orange-500',
  HEAD_INSTRUCTOR: 'from-violet-600 to-blue-500',
  INSTRUCTOR: 'from-blue-500 to-violet-500',
  STUDENT: 'from-emerald-500 to-cyan-500',
  GUARDIAN: 'from-amber-500 to-yellow-400',
};

const ROLE_BADGE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-50 border-red-200 text-red-700',
  HEAD_INSTRUCTOR: 'bg-violet-50 border-violet-200 text-violet-700',
  INSTRUCTOR: 'bg-blue-50 border-blue-200 text-blue-700',
  STUDENT: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  GUARDIAN: 'bg-amber-50 border-amber-200 text-amber-700',
};

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100';

// Hardcoded gamification values
const BADGE_COUNT = 5;
const XP_CURRENT = 2847;
const XP_MAX = 3000;
const XP_LEVEL = 4;
const XP_PERCENT = Math.round((XP_CURRENT / XP_MAX) * 100);
const STREAK_DAYS = 12;

const QUICK_LINKS = [
  { label: 'Derslerim', href: '/my-courses', icon: '📚', desc: 'Kayıtlı kurslarına git' },
  { label: 'Sertifikalarım', href: '/certificates', icon: '🏆', desc: 'Kazanılan sertifikalar' },
  { label: 'AI Mentor', href: '/ai', icon: '🤖', desc: 'Yapay zeka ile çalış' },
  { label: 'Karne', href: '/report-cards', icon: '📊', desc: 'İlerleme raporun' },
];

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ad güncelleme
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Şifre değiştirme
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // E-posta yeniden gönder
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Enrollments for stats
  const { data: enrollments } = useSWR<{ id: string }[]>('/me/enrollments', api);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }

    api<UserProfile>('/auth/me')
      .then((data) => {
        setProfile(data);
        setName(data.name ?? '');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    setNameSaving(true);
    try {
      const updated = await api<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      setProfile(updated);
      setNameMsg({ ok: true, text: 'Ad başarıyla güncellendi.' });
    } catch (err: unknown) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : 'Güncelleme başarısız.' });
    } finally {
      setNameSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);

    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Yeni şifre en az 8 karakter olmalıdır.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Şifreler eşleşmiyor.' }); return; }

    setPwSaving(true);
    try {
      await api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwMsg({ ok: true, text: 'Şifreniz başarıyla güncellendi.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : 'Şifre güncellenemedi.' });
    } finally {
      setPwSaving(false);
    }
  }

  async function resendVerification() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setResendState('sending');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setResendState(res.ok ? 'sent' : 'error');
    } catch {
      setResendState('error');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto animate-fade-slide-up">
        <div className="skeleton glass rounded-2xl border border-slate-200 h-44" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton glass rounded-2xl border border-slate-200 h-24" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton glass rounded-2xl border border-slate-200 h-28" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const initials = getInitials(profile.name, profile.email);
  const avatarGradient = ROLE_GRADIENT[profile.role] ?? 'from-slate-400 to-slate-600';
  const roleBadgeColor = ROLE_BADGE_COLOR[profile.role] ?? 'bg-slate-50 border-slate-200 text-slate-700';
  const joinDate = new Date(profile.createdAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const courseCount = enrollments?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-slide-up">

      {/* ── Profile Header Card ── */}
      <div className="glass rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* gradient top strip */}
        <div className={`h-2 w-full bg-gradient-to-r ${avatarGradient}`} />
        <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div
            className={`shrink-0 w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white`}
          >
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {profile.name || profile.email}
              </h1>
              <span className={`pill text-[11px] font-semibold ${roleBadgeColor}`}>
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            </div>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <span>📅</span>
                <span>Katılım: {joinDate}</span>
              </span>
              {profile.emailVerified ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span>✓</span>
                  <span>E-posta doğrulandı</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span>⚠</span>
                  <span>E-posta doğrulanmadı</span>
                </span>
              )}
            </div>
            {!profile.emailVerified && (
              <div className="pt-1">
                {resendState === 'sent' ? (
                  <p className="text-xs text-emerald-700">✓ Doğrulama e-postası gönderildi.</p>
                ) : (
                  <button
                    onClick={resendVerification}
                    disabled={resendState === 'sending'}
                    className="text-xs text-emerald-600 hover:underline disabled:opacity-60 font-medium"
                  >
                    {resendState === 'sending' ? 'Gönderiliyor…' : 'Doğrulama e-postası yeniden gönder →'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* XP Level Bar */}
        <div className="px-6 pb-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Seviye {XP_LEVEL}</span>
            <span>{XP_CURRENT.toLocaleString('tr-TR')} / {XP_MAX.toLocaleString('tr-TR')} XP</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${avatarGradient} transition-all duration-700`}
              style={{ width: `${XP_PERCENT}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">Bir sonraki seviyeye {(XP_MAX - XP_CURRENT).toLocaleString('tr-TR')} XP kaldı</p>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Kayıtlı Kurs',
            value: courseCount,
            icon: '📚',
            color: 'text-emerald-700',
            bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
            border: 'border-emerald-200',
          },
          {
            label: 'Rozet',
            value: BADGE_COUNT,
            icon: '🏅',
            color: 'text-violet-700',
            bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
            border: 'border-violet-200',
          },
          {
            label: 'XP Puanı',
            value: XP_CURRENT.toLocaleString('tr-TR'),
            icon: '⚡',
            color: 'text-amber-700',
            bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
            border: 'border-amber-200',
          },
          {
            label: '🔥 Seri',
            value: `${STREAK_DAYS} gün`,
            icon: '',
            color: 'text-rose-700',
            bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
            border: 'border-rose-200',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex flex-col items-center gap-1 shadow-sm`}
          >
            {stat.icon && <span className="text-2xl">{stat.icon}</span>}
            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-slate-500 text-center leading-tight">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
          Hızlı Erişim
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="glass rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon}</span>
              <span className="text-sm font-semibold text-slate-800">{link.label}</span>
              <span className="text-[11px] text-slate-400 leading-tight">{link.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Hesap Ayarları ── */}
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
          Hesap Ayarları
        </h2>
        <div className="space-y-4">

          {/* Ad güncelleme */}
          <div className="glass p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <h3 className="font-semibold text-slate-900">Ad Soyad</h3>
            </div>
            <form onSubmit={saveName} className="grid gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={nameSaving}
                  className="btn-link text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md disabled:opacity-60"
                >
                  {nameSaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                {nameMsg && (
                  <span className={`text-xs ${nameMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {nameMsg.ok ? '✓ ' : '✗ '}{nameMsg.text}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Şifre değiştirme */}
          <div className="glass p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <h3 className="font-semibold text-slate-900">Şifre Değiştir</h3>
            </div>
            <form onSubmit={savePassword} className="grid gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Mevcut şifre</span>
                <input
                  required
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Yeni şifre</span>
                <input
                  required
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="En az 8 karakter"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Yeni şifre (tekrar)</span>
                <input
                  required
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm focus:outline-none bg-white ${
                    confirmPw && confirmPw !== newPw
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-slate-200 focus:border-emerald-400'
                  }`}
                />
                {confirmPw && confirmPw !== newPw && (
                  <span className="text-xs text-red-500">Şifreler eşleşmiyor</span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="btn-link text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md disabled:opacity-60"
                >
                  {pwSaving ? 'Güncelleniyor…' : 'Şifremi değiştir'}
                </button>
                {pwMsg && (
                  <span className={`text-xs ${pwMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {pwMsg.ok ? '✓ ' : '✗ '}{pwMsg.text}
                  </span>
                )}
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* ── Diğer İşlemler ── */}
      <div className="glass p-5 rounded-2xl border border-rose-100 bg-rose-50/60 space-y-3">
        <h2 className="font-semibold text-rose-800">Diğer işlemler</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }}
            className="btn-link border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            Çıkış yap
          </button>
          <Link href="/forgot-password" className="btn-link border-slate-200 text-slate-600">
            Şifremi unuttum
          </Link>
        </div>
      </div>

    </div>
  );
}
