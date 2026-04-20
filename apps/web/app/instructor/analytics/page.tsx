'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../../_i18n/use-i18n';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') ?? localStorage.getItem('access_token');
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : {};
}

interface AtRiskStudent {
  userId: string;
  name?: string;
  email?: string;
  riskScore: number;
  avgQuizScore: number;
  lastActivity: string | null;
  weaknesses: string[];
}

interface ContentInsight {
  courseId: string;
  title?: string;
  totalViews: number;
  dropoffRate: number;
  avgQuizScore: number;
  lowPerformanceTopics: string[];
  suggestedRevisions: string[];
}

const DEMO_AT_RISK: AtRiskStudent[] = [
  { userId: 'u1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', riskScore: 85, avgQuizScore: 42, lastActivity: '2026-03-18T10:00:00Z', weaknesses: ['Matematik', 'Problem Çözme'] },
  { userId: 'u2', name: 'Fatma Kaya', email: 'fatma@example.com', riskScore: 72, avgQuizScore: 51, lastActivity: '2026-03-20T14:30:00Z', weaknesses: ['Okuma Anlama'] },
  { userId: 'u3', name: 'Mehmet Demir', email: 'mehmet@example.com', riskScore: 68, avgQuizScore: 55, lastActivity: '2026-03-15T09:00:00Z', weaknesses: ['Temel Fizik', 'Kimya'] },
  { userId: 'u4', name: 'Zeynep Arslan', email: 'zeynep@example.com', riskScore: 61, avgQuizScore: 58, lastActivity: '2026-03-22T11:00:00Z', weaknesses: ['İngilizce'] },
];

const DEMO_INSIGHTS: ContentInsight[] = [
  { courseId: 'c1', title: 'Temel Matematik', totalViews: 342, dropoffRate: 38, avgQuizScore: 54, lowPerformanceTopics: ['Türevler', 'İntegraller'], suggestedRevisions: ['Daha fazla görsel örnek ekle', 'Adım adım çözüm videoları'] },
  { courseId: 'c2', title: 'Fizik 101', totalViews: 218, dropoffRate: 22, avgQuizScore: 67, lowPerformanceTopics: ['Elektromanyetizma'], suggestedRevisions: ['Animasyonlu simülasyonlar'] },
  { courseId: 'c3', title: 'İngilizce B2', totalViews: 510, dropoffRate: 15, avgQuizScore: 72, lowPerformanceTopics: [], suggestedRevisions: [] },
];

function RiskBadge({ score, tr }: { score: number; tr: (s: string) => string }) {
  if (score >= 75) return <span className="pill pill-xs bg-rose-50 border-rose-200 text-rose-700 font-bold">⚠ {tr("Yüksek Risk")}</span>;
  if (score >= 50) return <span className="pill pill-xs bg-amber-50 border-amber-200 text-amber-700 font-bold">{tr("Orta Risk")}</span>;
  return <span className="pill pill-xs bg-emerald-50 border-emerald-200 text-emerald-700">{tr("Düşük Risk")}</span>;
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-rose-500' : score >= 50 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function InstructorAnalyticsPage() {
  const t = useI18n();
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [insights, setInsights] = useState<ContentInsight[]>([]);
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [activeTab, setActiveTab] = useState<'risk' | 'content'>('risk');
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // At-risk students
    fetch(`${API}/recommendations/at-risk?threshold=50&limit=20`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAtRisk(data);
        else { setAtRisk(DEMO_AT_RISK); setDemoMode(true); }
      })
      .catch(() => { setAtRisk(DEMO_AT_RISK); setDemoMode(true); })
      .finally(() => setLoadingRisk(false));

    // Content insights
    fetch(`${API}/recommendations/content-insights`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setInsights(data);
        else setInsights(DEMO_INSIGHTS);
      })
      .catch(() => setInsights(DEMO_INSIGHTS))
      .finally(() => setLoadingInsights(false));
  }, []);

  const highRisk = atRisk.filter((s) => s.riskScore >= 75).length;
  const midRisk  = atRisk.filter((s) => s.riskScore >= 50 && s.riskScore < 75).length;
  const avgRisk  = atRisk.length ? Math.round(atRisk.reduce((a, s) => a + s.riskScore, 0) / atRisk.length) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass p-6 rounded-2xl hero">
        <div className="hero-content space-y-1">
          <div className="pill w-fit">{t.roles.instructor}</div>
          <h1 className="text-2xl font-bold">{t.instructor.analytics}</h1>
          <p className="text-sm text-slate-500">{t.tr("Risk skoru, içerik performansı ve yapay zeka önerileri")}</p>
        </div>
      </div>

      {demoMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {t.tr("Demo modu — gerçek veriler yüklenemedi.")}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Toplam İzlenen', value: atRisk.length, color: 'text-slate-700', bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200' },
          { label: 'Yüksek Risk', value: highRisk, color: 'text-rose-700', bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200' },
          { label: 'Orta Risk', value: midRisk, color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200' },
          { label: 'Ort. Risk Skoru', value: `${avgRisk}`, color: 'text-violet-700', bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200' },
        ].map((stat, i) => (
          <div key={t.tr(stat.label)} className={`rounded-xl border p-4 text-center shadow-sm animate-fade-slide-up stagger-${i + 1} ${stat.bg}`}>
            <div className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.tr(stat.label)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'risk', label: `⚠ Risk Takibi (${atRisk.length})` },
          { key: 'content', label: `📊 İçerik Performansı (${insights.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'risk' | 'content')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeTab === tab.key
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {t.tr(tab.label)}
          </button>
        ))}
      </div>

      {/* At-Risk Table */}
      {activeTab === 'risk' && (
        <div className="glass rounded-2xl overflow-hidden">
          {loadingRisk ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl skeleton" />
              ))}
            </div>
          ) : atRisk.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">{t.tr("Riskli öğrenci bulunamadı.")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{t.tr("Öğrenci")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{t.tr("Risk Skoru")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{t.tr("Quiz Ort.")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{t.tr("Son Aktivite")}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{t.tr("Zayıf Konular")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((s, idx) => (
                    <tr key={s.userId} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors animate-fade-slide-up stagger-${Math.min(idx + 1, 5)}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{s.name ?? '—'}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <RiskBar score={s.riskScore} />
                          </div>
                          <span className="font-bold text-slate-700">{s.riskScore}</span>
                          <RiskBadge score={s.riskScore} tr={t.tr} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${s.avgQuizScore < 50 ? 'text-rose-600' : s.avgQuizScore < 65 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          %{s.avgQuizScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.lastActivity
                          ? new Date(s.lastActivity).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(s.weaknesses ?? []).slice(0, 3).map((w) => (
                            <span key={w} className="pill pill-xs bg-rose-50 border-rose-100 text-rose-600">{w}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/recommendations/students/${s.userId}`}
                          className="text-xs font-semibold text-violet-600 hover:underline"
                        >
                          Detay →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Content Insights */}
      {activeTab === 'content' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {loadingInsights ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl skeleton" />)
          ) : insights.length === 0 ? (
            <div className="col-span-2 p-10 text-center glass rounded-2xl text-slate-500 text-sm">
              {t.tr("İçerik verisi bulunamadı.")}
            </div>
          ) : (
            insights.map((insight, idx) => (
              <div key={insight.courseId} className={`glass rounded-2xl p-5 space-y-3 animate-fade-slide-up stagger-${Math.min(idx + 1, 5)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{insight.title ?? `Kurs #${insight.courseId.slice(0, 8)}`}</h3>
                    <p className="text-xs text-slate-500">{insight.totalViews} görüntülenme</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-extrabold ${insight.dropoffRate > 30 ? 'text-rose-600' : insight.dropoffRate > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      %{insight.dropoffRate}
                    </div>
                    <div className="text-xs text-slate-400">{t.tr("terk oranı")}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{t.tr("Ort. quiz")}:</span>
                  <span className={`font-bold text-sm ${insight.avgQuizScore < 55 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    %{insight.avgQuizScore}
                  </span>
                </div>

                {(insight.lowPerformanceTopics ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">{t.tr("Düşük performanslı konular:")}</p>
                    <div className="flex flex-wrap gap-1">
                      {(insight.lowPerformanceTopics ?? []).map((topic) => (
                        <span key={topic} className="pill pill-xs bg-amber-50 border-amber-100 text-amber-700">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(insight.suggestedRevisions ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">{t.tr("✦ AI Öneriler:")}</p>
                    <ul className="space-y-1">
                      {(insight.suggestedRevisions ?? []).map((r) => (
                        <li key={r} className="text-xs text-slate-600 flex gap-1.5">
                          <span className="text-violet-400 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
