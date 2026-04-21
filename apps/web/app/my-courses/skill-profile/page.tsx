"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../_i18n/use-i18n";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") ?? localStorage.getItem("access_token");
}

interface TopicStat {
  topicId: string;
  attempts: number;
  accuracy: number; // 0-100
}

interface ConceptMastery {
  conceptId: string;
  masteryLevel: number; // 0-1
  consecutiveOk: number;
  nextReviewDate?: string;
}

interface AIRecommendation {
  type: string;
  payload: Record<string, unknown>;
  reason: string;
}

const MASTERY_COLORS = (m: number) =>
  m >= 0.8 ? "bg-amber-500" : m >= 0.5 ? "bg-amber-400" : "bg-rose-500";

const MASTERY_LABELS = (m: number) =>
  m >= 0.8 ? "Uzman" : m >= 0.5 ? "Gelişiyor" : "Zayıf";

export default function SkillProfilePage() {
  const t = useI18n();
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [masteries, setMasteries] = useState<ConceptMastery[]>([]);
  const [recs, setRecs] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/quiz/insights`, { headers: authHeaders() }).then((r) => r.json()).catch(() => []),
      fetch(`${API}/recommendations/me`, { headers: authHeaders() }).then((r) => r.json()).catch(() => []),
    ]).then(([insightsData, recsData]) => {
      setStats(Array.isArray(insightsData) ? insightsData : []);
      setRecs(Array.isArray(recsData) ? recsData : []);
    }).finally(() => setLoading(false));
  }, []);

  function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function generateAIInsights() {
    setAiLoading(true);
    try {
      const weakTopics = stats
        .filter((s) => s.accuracy < 60)
        .slice(0, 3)
        .map((s) => s.topicId)
        .join(", ");
      const res = await fetch(`${API}/ai/content/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          topic: weakTopics || "Genel Zayıf Alanlar",
          type: "summary",
          language: "tr",
          difficulty: 1,
        }),
      });
      const data = await res.json();
      setRecs((prev) => [
        {
          type: "AI_STUDY_GUIDE",
          payload: data,
          reason: "Zayıf konularınız için AI öğrenme rehberi",
        },
        ...prev,
      ]);
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  }

  // Mock data for demo
  const mockStats: TopicStat[] = stats.length ? stats : [
    { topicId: "Matematik", attempts: 24, accuracy: 42 },
    { topicId: "Fizik", attempts: 18, accuracy: 78 },
    { topicId: "Kimya", attempts: 12, accuracy: 55 },
    { topicId: "Biyoloji", attempts: 30, accuracy: 91 },
    { topicId: "Tarih", attempts: 8, accuracy: 33 },
    { topicId: "Coğrafya", attempts: 15, accuracy: 67 },
  ];

  const weakTopics = mockStats.filter((s) => s.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy);
  const strongTopics = mockStats.filter((s) => s.accuracy >= 75).sort((a, b) => b.accuracy - a.accuracy);
  const overallAccuracy = mockStats.length
    ? Math.round(mockStats.reduce((sum, s) => sum + s.accuracy, 0) / mockStats.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass hero rounded-2xl border border-slate-200 p-6">
        <div className="hero-content flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">
              <span className="status-dot online" />
              {t.courses.skillProfile}
            </div>
            <h1 className="text-2xl font-bold">{t.progress.title}</h1>
            <p className="text-sm text-slate-500">{t.progress.subtitle}</p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
              <div className={`text-3xl font-extrabold ${overallAccuracy >= 70 ? "text-amber-600" : overallAccuracy >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                {overallAccuracy}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.tr("Genel Doğruluk")}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
              <div className="text-3xl font-extrabold text-slate-800">
                {mockStats.reduce((s, stat) => s + stat.attempts, 0)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{t.tr("Toplam Soru")}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
              <div className="text-3xl font-extrabold text-rose-600">{weakTopics.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t.tr("Zayıf Konu")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Topic bars */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-800">{t.tr("Konu Bazlı Başarı")}</h2>
            <div className="space-y-3">
              {mockStats.map((s) => (
                <div key={s.topicId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.topicId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{s.attempts} {t.tr("soru")}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${MASTERY_COLORS(s.accuracy / 100)}`}>
                        %{s.accuracy}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${MASTERY_COLORS(s.accuracy / 100)}`}
                      style={{ width: `${s.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak areas focus */}
          {weakTopics.length > 0 && (
            <div className="glass rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-rose-800">{t.tr("⚠️ Çalışılması Gereken Konular")}</h2>
                <button
                  onClick={generateAIInsights}
                  disabled={aiLoading}
                  className="rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-all"
                >
                  {aiLoading ? t.common.loading : `✦ ${t.tr("AI Çalışma Planı")}`}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {weakTopics.map((s) => (
                  <div key={s.topicId} className="rounded-xl border border-rose-200 bg-white p-3">
                    <div className="text-sm font-semibold text-slate-800">{s.topicId}</div>
                    <div className="mt-1 text-2xl font-bold text-rose-600">%{s.accuracy}</div>
                    <div className="text-xs text-slate-500">{s.attempts} {t.tr("deneme")}</div>
                    <a
                      href={`/exams/adaptive?topic=${encodeURIComponent(s.topicId)}`}
                      className="mt-2 block rounded-lg bg-rose-50 px-2 py-1 text-center text-xs font-medium text-rose-700 hover:bg-rose-100 transition-all"
                    >
                      {t.adaptiveQuiz.startBtn} →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations sidebar */}
        <div className="space-y-4">
          {/* Strengths */}
          {strongTopics.length > 0 && (
            <div className="glass rounded-2xl p-5" style={{ border: "1px solid rgba(200,169,106,0.25)", background: "rgba(200,169,106,0.05)" }}>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: "#b8933a" }}>{t.tr("🏆 Güçlü Konular")}</h2>
              <div className="space-y-1.5">
                {strongTopics.map((s) => (
                  <div key={s.topicId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm" style={{ border: "1px solid rgba(200,169,106,0.15)" }}>
                    <span className="font-medium text-slate-700">{s.topicId}</span>
                    <span className="font-bold" style={{ color: "#C8A96A" }}>%{s.accuracy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          <div className="glass rounded-2xl border border-violet-200 bg-violet-50/20 p-5">
            <h2 className="mb-3 text-sm font-semibold text-violet-800">{t.tr("✦ AI Önerileri")}</h2>
            {recs.length === 0 ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-violet-100 bg-white p-3">
                  <div className="text-xs font-semibold text-violet-700 mb-1">{t.tr("📚 Çalışma Önerisi")}</div>
                  <p className="text-xs text-slate-600">{t.tr("Zayıf konulardan başlayarak her gün 15 dakika adaptif quiz yapın.")}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white p-3">
                  <div className="text-xs font-semibold text-violet-700 mb-1">🔁 Spaced Repetition</div>
                  <p className="text-xs text-slate-600">{t.tr("Yanlış cevapladığınız sorular tekrar karşınıza çıkacak.")}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-white p-3">
                  <div className="text-xs font-semibold text-violet-700 mb-1">🎯 Hedef</div>
                  <p className="text-xs text-slate-600">{t.tr("Her konuda %75+ başarıya ulaşın.")}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recs.slice(0, 4).map((r, i) => (
                  <div key={i} className="rounded-xl border border-violet-100 bg-white p-3">
                    <div className="text-xs font-semibold text-violet-700 mb-1">{r.type.replace(/_/g, " ")}</div>
                    <p className="text-xs text-slate-600">{r.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SRS Next review */}
          <div className="glass rounded-2xl border border-blue-200 bg-blue-50/20 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-800">{t.tr("🔁 Bugün Tekrar Edilecekler")}</h2>
            <div className="space-y-1.5">
              {weakTopics.slice(0, 3).map((topic) => (
                <div key={topic.topicId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-blue-100">
                  <span className="text-xs font-medium text-slate-700">{topic.topicId}</span>
                  <a href={`/exams/adaptive?topic=${encodeURIComponent(topic.topicId)}`}
                    className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">
                    {t.adaptiveQuiz.startBtn} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
