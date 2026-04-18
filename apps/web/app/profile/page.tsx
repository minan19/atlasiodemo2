'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '../api/client';
import { useI18n } from '../_i18n/use-i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

type GamificationStats = {
  xp: number;
  streak: number;
  hearts: number;
  coins: number;
  streakFreezes: number;
  league: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'MASTER';
  badges?: UserBadge[];
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
};

type UserBadge = {
  id: string;
  awardedAt: string;
  badge: Badge;
};

type Certification = {
  id: string;
  courseName: string;
  issuedAt: string;
  verifyCode: string;
  userId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

const BADGE_COUNT = 5;
const XP_CURRENT = 2847;
const XP_MAX = 3000;
const XP_LEVEL = 4;
const XP_PERCENT = Math.round((XP_CURRENT / XP_MAX) * 100);
const STREAK_DAYS = 12;

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

const LEAGUE_STYLES: Record<string, { label: string; pill: string; badge: string }> = {
  BRONZE:  { label: 'Bronz',  pill: 'bg-amber-50 border-amber-300 text-amber-700',    badge: '🥉' },
  SILVER:  { label: 'Gümüş',  pill: 'bg-slate-50 border-slate-300 text-slate-700',    badge: '🥈' },
  GOLD:    { label: 'Altın',  pill: 'bg-yellow-50 border-yellow-300 text-yellow-700', badge: '🥇' },
  DIAMOND: { label: 'Elmas',  pill: 'bg-cyan-50 border-cyan-300 text-cyan-700',       badge: '💎' },
  MASTER:  { label: 'Usta',   pill: 'bg-violet-50 border-violet-300 text-violet-700', badge: '👑' },
};

const QUICK_LINKS = [
  { label: 'Derslerim',       href: '/my-courses',   icon: '📚', desc: 'Kayıtlı kurslarına git' },
  { label: 'Sertifikalarım',  href: '/certificates', icon: '🏆', desc: 'Kazanılan sertifikalar' },
  { label: 'AI Mentor',       href: '/ai',            icon: '🤖', desc: 'Yapay zeka ile çalış' },
  { label: 'Karne',           href: '/report-cards', icon: '📊', desc: 'İlerleme raporun' },
];

// Rarity display configs
const RARITY_CONFIG: Record<Badge['rarity'], {
  label: string;
  border: string;
  bg: string;
  text: string;
  glow: string;
  pillBg: string;
}> = {
  COMMON:    { label: 'Yaygın',    border: 'border-slate-300',  bg: 'bg-slate-800/60',    text: 'text-slate-300', glow: 'hover:shadow-slate-400/40',   pillBg: 'bg-slate-700 text-slate-300' },
  RARE:      { label: 'Nadir',     border: 'border-blue-400',   bg: 'bg-blue-900/50',     text: 'text-blue-300',  glow: 'hover:shadow-blue-500/50',    pillBg: 'bg-blue-800 text-blue-300'  },
  EPIC:      { label: 'Epik',      border: 'border-purple-400', bg: 'bg-purple-900/50',   text: 'text-purple-300',glow: 'hover:shadow-purple-500/50',  pillBg: 'bg-purple-800 text-purple-300' },
  LEGENDARY: { label: 'Efsanevi', border: 'border-yellow-400', bg: 'bg-yellow-900/40',   text: 'text-yellow-300',glow: 'hover:shadow-yellow-400/60',  pillBg: 'bg-gradient-to-r from-yellow-600 to-amber-500 text-white' },
};

// Demo badges fallback when API has none
const DEMO_BADGES: UserBadge[] = [
  { id: '1', awardedAt: '2025-01-15T10:00:00Z', badge: { id: 'b1', name: 'İlk Adım',       description: 'İlk dersini tamamladın',     icon: '🚀', rarity: 'COMMON'    } },
  { id: '2', awardedAt: '2025-02-03T14:00:00Z', badge: { id: 'b2', name: 'Seri Avcısı',    description: '7 gün kesintisiz çalıştın',  icon: '🔥', rarity: 'RARE'      } },
  { id: '3', awardedAt: '2025-02-20T09:00:00Z', badge: { id: 'b3', name: 'Yıldız Öğrenci', description: '5 kursu bitirdin',           icon: '⭐', rarity: 'EPIC'      } },
  { id: '4', awardedAt: '2025-03-01T18:00:00Z', badge: { id: 'b4', name: 'Efsane',         description: '100 gün seri',               icon: '👑', rarity: 'LEGENDARY' } },
  { id: '5', awardedAt: '2025-03-10T12:00:00Z', badge: { id: 'b5', name: 'Hızlı Öğrenen', description: 'Bir günde 3 ders bitirdin',  icon: '⚡', rarity: 'RARE'      } },
];

// Demo certifications fallback
const DEMO_CERTS: Certification[] = [
  { id: 'c1', courseName: 'Python ile Veri Bilimi', issuedAt: '2025-01-20T00:00:00Z', verifyCode: 'ATLS-2025-PY-001', userId: '' },
  { id: 'c2', courseName: 'Web Geliştirme Temelleri', issuedAt: '2025-02-14T00:00:00Z', verifyCode: 'ATLS-2025-WB-047', userId: '' },
  { id: 'c3', courseName: 'Yapay Zeka ve Makine Öğrenmesi', issuedAt: '2025-03-05T00:00:00Z', verifyCode: 'ATLS-2025-AI-123', userId: '' },
];

// Turkish month abbreviations for activity calendar
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_MONTHS_FULL = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TR_DAYS_SHORT = ['Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** Seeded pseudo-random for reproducible fake activity data */
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Generate 52 weeks × 7 days of fake activity counts (realistic: busier on weekdays) */
function generateActivityData(): number[][] {
  const weeks: number[][] = [];
  const today = new Date();
  // Start from 52 weeks ago, aligned to Monday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  const dayOfWeek = startDate.getDay(); // 0=Sun
  startDate.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7)); // align to Monday

  for (let w = 0; w < 52; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const seed = w * 7 + d;
      const r = seededRandom(seed);
      // Weekdays (d < 5) are busier
      const isWeekday = d < 5;
      const base = isWeekday ? 0.65 : 0.3;
      let count = 0;
      if (r > base) {
        // Activity day
        const intensity = seededRandom(seed + 100);
        if (intensity > 0.85) count = 6 + Math.floor(seededRandom(seed + 200) * 4);
        else if (intensity > 0.6)  count = 3 + Math.floor(seededRandom(seed + 300) * 3);
        else if (intensity > 0.35) count = 1 + Math.floor(seededRandom(seed + 400) * 2);
        else count = 1;
      }
      // Future days = 0
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + w * 7 + d);
      if (cellDate > today) count = 0;
      week.push(count);
    }
    weeks.push(week);
  }
  return weeks;
}

function activityColor(count: number): string {
  if (count === 0) return 'bg-slate-800';
  if (count <= 2)  return 'bg-indigo-900';
  if (count <= 5)  return 'bg-indigo-600';
  return 'bg-indigo-400';
}

/** Get the Date object for a cell (w=week index 0-51, d=day 0-6) */
function cellDate(startMonday: Date, w: number, d: number): Date {
  const date = new Date(startMonday);
  date.setDate(startMonday.getDate() + w * 7 + d);
  return date;
}

/** Generate last-30-days streak data */
function generateStreakData(streakDays: number): { date: Date; active: boolean }[] {
  const today = new Date();
  const result: { date: Date; active: boolean }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Active for the last `streakDays` days
    result.push({ date: d, active: i < streakDays });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BadgeCard({ ub }: { ub: UserBadge }) {
  const t = useI18n();
  const cfg = RARITY_CONFIG[ub.badge.rarity];
  const awardedDate = new Date(ub.awardedAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return (
    <div
      className={`
        relative flex flex-col items-center gap-2 rounded-2xl border p-4
        ${cfg.border} ${cfg.bg}
        transition-all duration-300 cursor-default
        hover:scale-105 hover:shadow-lg ${cfg.glow}
        group
      `}
    >
      {/* Rarity glow ring for LEGENDARY */}
      {ub.badge.rarity === 'LEGENDARY' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-amber-500/10 pointer-events-none" />
      )}
      <span className="text-3xl drop-shadow-md">{ub.badge.icon}</span>
      <p className={`text-sm font-bold text-center ${cfg.text}`}>{ub.badge.name}</p>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.pillBg}`}>
        {t.tr(RARITY_CONFIG[ub.badge.rarity].label)}
      </span>
      <p className="text-[10px] text-slate-400 text-center">{awardedDate}</p>
    </div>
  );
}

function ActivityCalendar({ weeks, startMonday }: { weeks: number[][]; startMonday: Date }) {
  const t = useI18n();
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Compute month label positions
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < 52; w++) {
    const d = cellDate(startMonday, w, 0);
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ label: TR_MONTHS[m], col: w });
      lastMonth = m;
    }
  }

  return (
    <div className="relative overflow-x-auto">
      {/* Month labels row */}
      <div className="flex mb-1" style={{ paddingLeft: '2rem' }}>
        {monthLabels.map(({ label, col }, i) => (
          <div
            key={i}
            className="text-[10px] text-slate-400 absolute"
            style={{ left: `calc(2rem + ${col} * 14px)` }}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="h-3" /> {/* spacer for month labels */}

      {/* Grid: day-of-week labels + cells */}
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {TR_DAYS_SHORT.map((day, i) => (
            <div key={i} className="text-[9px] text-slate-500 h-[10px] flex items-center w-6 leading-none">
              {i % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex gap-[2px]">
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-[2px]">
              {week.map((count, d) => {
                const date = cellDate(startMonday, w, d);
                const dayLabel = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                return (
                  <div
                    key={d}
                    className={`w-[10px] h-[10px] rounded-[2px] ${activityColor(count)} cursor-pointer transition-opacity hover:opacity-80`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ text: `${dayLabel}: ${count} aktivite`, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-[11px] bg-slate-900 text-white rounded-lg shadow-xl pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-slate-500">{t.tr("Az")}</span>
        {['bg-slate-800', 'bg-indigo-900', 'bg-indigo-600', 'bg-indigo-400'].map((cls) => (
          <div key={cls} className={`w-[10px] h-[10px] rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[10px] text-slate-500">{t.tr("Çok")}</span>
      </div>
    </div>
  );
}

function CertCard({ cert }: { cert: Certification }) {
  const t = useI18n();
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.courseName)}&organizationName=Atlasio&issueYear=${new Date(cert.issuedAt).getFullYear()}&certUrl=${encodeURIComponent(`https://atlasio.com/verify/${cert.verifyCode}`)}`;

  return (
    <div className="glass rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-indigo-300 hover:shadow-md transition-all group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg shadow">
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight">{cert.courseName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t.tr("Verildi")}: {issuedDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <span className="text-[10px] text-slate-500 shrink-0">{t.tr("Kod")}:</span>
        <code className="flex-1 text-xs font-mono text-indigo-700 font-semibold tracking-wider truncate">
          {cert.verifyCode}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(cert.verifyCode)}
          className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
          title={t.tr("Kodu kopyala")}
        >
          📋
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => alert(`"${cert.courseName}" sertifikası indiriliyor...`)}
          className="flex-1 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold py-2 hover:bg-indigo-100 transition-colors"
        >
          {t.tr("İndir")}
        </button>
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold py-2 hover:bg-blue-100 transition-colors text-center"
        >
          {t.tr("LinkedIn'de Paylaş")}
        </a>
      </div>
    </div>
  );
}

function StreakCalendar({ streakDays }: { streakDays: number }) {
  const data = generateStreakData(streakDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group into weeks (Mon-Sun rows)
  const weeks: { date: Date; active: boolean }[][] = [];
  let week: { date: Date; active: boolean }[] = [];

  // Pad the start so it begins on Monday
  const firstDay = data[0].date;
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 0=Mon
  for (let i = 0; i < firstDayOfWeek; i++) {
    week.push({ date: new Date(0), active: false });
  }
  for (const item of data) {
    week.push(item);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({ date: new Date(0), active: false });
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      {/* Day labels */}
      <div className="flex gap-1.5 mb-2 pl-0">
        {TR_DAYS_SHORT.map((d) => (
          <div key={d} className="w-8 text-center text-[10px] text-slate-500 font-medium">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1.5">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex gap-1.5">
            {wk.map((item, di) => {
              if (item.date.getTime() === 0) {
                return <div key={di} className="w-8 h-8" />;
              }
              const isToday = item.date.getTime() === today.getTime();
              const dayNum = item.date.getDate();
              return (
                <div
                  key={di}
                  title={item.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold
                    transition-all duration-200
                    ${item.active
                      ? isToday
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 shadow-md'
                        : 'bg-indigo-600 text-white shadow-sm'
                      : isToday
                        ? 'border-2 border-indigo-400 text-indigo-500 ring-1 ring-indigo-200'
                        : 'border border-slate-200 text-slate-400'
                    }
                  `}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const t = useI18n();

  const roleLabels: Record<string, string> = {
    ADMIN: t.roles.admin,
    HEAD_INSTRUCTOR: t.roles.headInstructor,
    INSTRUCTOR: t.roles.instructor,
    STUDENT: t.roles.student,
    GUARDIAN: t.roles.guardian,
  };

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

  // Live gamification stats (includes badges array)
  const [gamification, setGamification] = useState<GamificationStats | null>(null);

  // Certifications
  const [certs, setCerts] = useState<Certification[]>([]);

  // Share toast
  const [shareToast, setShareToast] = useState(false);

  // Activity calendar data (memoized, generated once)
  const [activityWeeks] = useState<number[][]>(() => generateActivityData());
  const [activityStartMonday] = useState<Date>(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
    const dow = startDate.getDay();
    startDate.setDate(startDate.getDate() - ((dow + 6) % 7));
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  });

  // Fetch gamification (badges included via badges field or separate)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    fetch(`${API_URL}/gamification/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GamificationStats | null) => { if (data) setGamification(data); })
      .catch(() => null);
  }, []);

  // Fetch certifications
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    fetch(`${API_URL}/certifications/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Certification[] | null) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setCerts(data);
        } else {
          setCerts(DEMO_CERTS);
        }
      })
      .catch(() => setCerts(DEMO_CERTS));
  }, []);

  // Auth + profile fetch
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

  const handleShareProfile = useCallback(() => {
    if (!profile) return;
    const url = `https://atlasio.com/u/${profile.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    }).catch(() => {
      // Fallback: show the URL
      alert(`Profil URL: ${url}`);
    });
  }, [profile]);

  // ───────────────────────────────────────────────────────────────────────────
  // Loading skeleton
  // ───────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto animate-fade-slide-up">
        <div className="skeleton glass rounded-2xl border border-slate-200 h-44" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton glass rounded-2xl border border-slate-200 h-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
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

  // Badges: prefer API data, fallback to demo
  const badges: UserBadge[] = (gamification?.badges && gamification.badges.length > 0)
    ? gamification.badges
    : DEMO_BADGES;

  const streakDays = gamification?.streak ?? STREAK_DAYS;

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-slide-up">

      {/* ── Share Toast ── */}
      {shareToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold shadow-2xl flex items-center gap-2 animate-fade-slide-up">
          <span>✓</span>
          {t.tr("Profil linki panoya kopyalandı!")}
        </div>
      )}

      {/* ── Profile Header Card ── */}
      <div className="glass rounded-2xl border border-slate-200 overflow-hidden shadow-sm stagger-1">
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
                {roleLabels[profile.role] ?? profile.role}
              </span>
            </div>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 pt-0.5">
              <span className="flex items-center gap-1">
                <span>📅</span>
                <span>{t.tr("Katılım")}: {joinDate}</span>
              </span>
              {profile.emailVerified ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span>✓</span>
                  <span>{t.tr("E-posta doğrulandı")}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span>⚠</span>
                  <span>{t.tr("E-posta doğrulanmadı")}</span>
                </span>
              )}
            </div>
            {!profile.emailVerified && (
              <div className="pt-1">
                {resendState === 'sent' ? (
                  <p className="text-xs text-emerald-700">{t.tr("✓ Doğrulama e-postası gönderildi.")}</p>
                ) : (
                  <button
                    onClick={resendVerification}
                    disabled={resendState === 'sending'}
                    className="text-xs text-emerald-600 hover:underline disabled:opacity-60 font-medium"
                  >
                    {resendState === 'sending' ? t.tr('Gönderiliyor…') : t.tr('Doğrulama e-postası yeniden gönder →')}
                  </button>
                )}
              </div>
            )}

            {/* Public profile share button */}
            <div className="pt-1">
              <button
                onClick={handleShareProfile}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <span>🔗</span>
                {t.tr("Profili Paylaş")}
              </button>
            </div>
          </div>
        </div>

        {/* XP Level Bar */}
        <div className="px-6 pb-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{t.tr("Seviye")} {XP_LEVEL}</span>
            <span>{XP_CURRENT.toLocaleString('tr-TR')} / {XP_MAX.toLocaleString('tr-TR')} XP</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${avatarGradient} transition-all duration-700`}
              style={{ width: `${XP_PERCENT}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">{t.tr("Bir sonraki seviyeye")} {(XP_MAX - XP_CURRENT).toLocaleString('tr-TR')} XP {t.tr("kaldı")}</p>
        </div>
      </div>

      {/* ── Gamification Stats ── */}
      {gamification && (() => {
        const league = LEAGUE_STYLES[gamification.league] ?? LEAGUE_STYLES.BRONZE;
        return (
          <div className="glass rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 stagger-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-yellow-300 inline-block" />
                {t.tr("Gamification İstatistikleri")}
              </h2>
              <span className={`pill text-xs font-semibold ${league.pill}`}>
                {league.badge} {t.tr(league.label)} Ligi
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="metric rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-amber-100/40 p-3 flex flex-col items-center gap-1">
                <span className="text-xl">⚡</span>
                <span className="text-lg font-bold text-amber-700">{gamification.xp.toLocaleString('tr-TR')}</span>
                <span className="text-[11px] text-slate-500 text-center">{t.tr("Toplam XP")}</span>
              </div>
              <div className="metric rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-rose-100/40 p-3 flex flex-col items-center gap-1">
                <span className="text-xl">🔥</span>
                <span className="text-lg font-bold text-rose-700">{gamification.streak} {t.tr("gün")}</span>
                <span className="text-[11px] text-slate-500 text-center">{t.tr("Günlük Seri")}</span>
              </div>
              <div className="metric rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-pink-100/40 p-3 flex flex-col items-center gap-1">
                <span className="text-xl">❤️</span>
                <span className="text-lg font-bold text-pink-700">{gamification.hearts}</span>
                <span className="text-[11px] text-slate-500 text-center">{t.tr("Can")}</span>
              </div>
              <div className="metric rounded-2xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-yellow-100/40 p-3 flex flex-col items-center gap-1">
                <span className="text-xl">💰</span>
                <span className="text-lg font-bold text-yellow-700">{gamification.coins.toLocaleString('tr-TR')}</span>
                <span className="text-[11px] text-slate-500 text-center">{t.tr("Jeton")}</span>
              </div>
              <div className="metric rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-cyan-100/40 p-3 flex flex-col items-center gap-1">
                <span className="text-xl">🧊</span>
                <span className="text-lg font-bold text-cyan-700">{gamification.streakFreezes}</span>
                <span className="text-[11px] text-slate-500 text-center">{t.tr("Seri Dondurma")}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-2">
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
            value: badges.length,
            icon: '🏅',
            color: 'text-violet-700',
            bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
            border: 'border-violet-200',
          },
          {
            label: 'XP Puanı',
            value: (gamification?.xp ?? XP_CURRENT).toLocaleString('tr-TR'),
            icon: '⚡',
            color: 'text-amber-700',
            bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
            border: 'border-amber-200',
          },
          {
            label: '🔥 Seri',
            value: `${streakDays} ${t.tr("gün")}`,
            icon: '',
            color: 'text-rose-700',
            bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
            border: 'border-rose-200',
          },
        ].map((stat) => (
          <div
            key={t.tr(stat.label)}
            className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex flex-col items-center gap-1 shadow-sm`}
          >
            {stat.icon && <span className="text-2xl">{stat.icon}</span>}
            <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-xs text-slate-500 text-center leading-tight">{t.tr(stat.label)}</span>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW SECTION 1: Skill Badges Grid                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="stagger-3">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-purple-400 inline-block" />
            {t.tr("Kazanılan Rozetler")}
          </h2>
          <span className="pill text-xs font-semibold bg-violet-50 border-violet-200 text-violet-700">
            {badges.length} {t.tr("rozet kazanıldı")}
          </span>
        </div>

        <div className="glass rounded-2xl border border-slate-200 p-5 shadow-sm bg-slate-900/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((ub) => (
              <BadgeCard key={ub.id} ub={ub} />
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW SECTION 2: Activity Calendar (GitHub-style)                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="stagger-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400 inline-block" />
          {t.tr("Aktivite Takvimi")}
        </h2>
        <div className="glass rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">{t.tr("Son 52 haftadaki öğrenme aktiviteleriniz")}</p>
            <span className="pill text-[10px] bg-indigo-50 border-indigo-200 text-indigo-700">
              {activityWeeks.flat().filter(c => c > 0).length} {t.tr("aktif gün")}
            </span>
          </div>
          <ActivityCalendar weeks={activityWeeks} startMonday={activityStartMonday} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW SECTION 3: Completed Certificates Showcase                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="stagger-4">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-yellow-400 inline-block" />
            {t.tr("Sertifikalarım")}
          </h2>
          <span className="pill text-xs font-semibold bg-amber-50 border-amber-200 text-amber-700">
            {certs.length} {t.tr("sertifika")}
          </span>
        </div>
        <div className="grid sm:grid-cols-1 gap-3">
          {certs.map((cert) => (
            <CertCard key={cert.id} cert={cert} />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NEW SECTION 4: Learning Streak Calendar (last 30 days)             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="stagger-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-rose-500 to-orange-400 inline-block" />
          {t.tr("Öğrenme Serisi")}
        </h2>
        <div className="glass rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{t.tr("Son 30 günlük aktivite görünümü")}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <span className="text-sm font-bold text-rose-600">{streakDays} {t.tr("gün seri")}</span>
            </div>
          </div>
          <StreakCalendar streakDays={streakDays} />

          {/* Streak legend */}
          <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-indigo-600" />
              <span className="text-[11px] text-slate-500">{t.tr("Aktif gün")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border border-slate-200" />
              <span className="text-[11px] text-slate-500">{t.tr("Pasif gün")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-indigo-600 ring-2 ring-indigo-400 ring-offset-1" />
              <span className="text-[11px] text-slate-500">{t.tr("Bugün")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400 inline-block" />
          {t.tr("Hızlı Erişim")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="glass rounded-2xl border border-slate-200 p-4 flex flex-col items-center gap-2 text-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon}</span>
              <span className="text-sm font-semibold text-slate-800">{t.tr(link.label)}</span>
              <span className="text-[11px] text-slate-400 leading-tight">{t.tr(link.desc)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Hesap Ayarları ── */}
      <div>
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 px-1 mb-3">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-blue-400 inline-block" />
          {t.tr("Hesap Ayarları")}
        </h2>
        <div className="space-y-4">

          {/* Ad güncelleme */}
          <div className="glass p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <h3 className="font-semibold text-slate-900">{t.tr("Ad Soyad")}</h3>
            </div>
            <form onSubmit={saveName} className="grid gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.tr("Adınız Soyadınız")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={nameSaving}
                  className="btn-link text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', borderColor: '#10b981' }}
                >
                  {nameSaving ? t.tr('Kaydediliyor…') : t.tr('Kaydet')}
                </button>
                {nameMsg && (
                  <span className={`text-xs ${nameMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {nameMsg.ok ? '✓ ' : '✗ '}{t.tr(nameMsg.text)}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Şifre değiştirme */}
          <div className="glass p-5 rounded-2xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <h3 className="font-semibold text-slate-900">{t.tr("Şifre Değiştir")}</h3>
            </div>
            <form onSubmit={savePassword} className="grid gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">{t.tr("Mevcut şifre")}</span>
                <input
                  required
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">{t.tr("Yeni şifre")}</span>
                <input
                  required
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder={t.tr("En az 8 karakter")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-400 focus:outline-none bg-white"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">{t.tr("Yeni şifre (tekrar)")}</span>
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
                  <span className="text-xs text-red-500">{t.tr("Şifreler eşleşmiyor")}</span>
                )}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="btn-link text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', borderColor: '#10b981' }}
                >
                  {pwSaving ? t.tr('Güncelleniyor…') : t.tr('Şifremi değiştir')}
                </button>
                {pwMsg && (
                  <span className={`text-xs ${pwMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {pwMsg.ok ? '✓ ' : '✗ '}{t.tr(pwMsg.text)}
                  </span>
                )}
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* ── Diğer İşlemler ── */}
      <div className="glass p-5 rounded-2xl border border-rose-100 bg-rose-50/60 space-y-3">
        <h2 className="font-semibold text-rose-800">{t.tr("Diğer işlemler")}</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            onClick={() => {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              document.cookie = 'atlasio_auth=; path=/; max-age=0';
              document.cookie = 'atlasio_role=; path=/; max-age=0';
              window.location.href = '/login';
            }}
            className="btn-link border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            {t.tr("Çıkış yap")}
          </button>
          <Link href="/forgot-password" className="btn-link border-slate-200 text-slate-600">
            {t.tr("Şifremi unuttum")}
          </Link>
        </div>
      </div>

    </div>
  );
}
