"use client";

import useSWR from "swr";
import { api } from "../../api/client";
import { useState } from "react";
import { useI18n } from "../../_i18n/use-i18n";

type Draft = {
  id: string;
  stem: string;
  Topic?: { name: string };
  choices: { id: string; text: string; isCorrect: boolean }[];
  status: string;
};

const DEMO_DRAFTS: Draft[] = [
  {
    id: "demo-1",
    stem: "Bir üçgenin iç açılarının toplamı kaç derecedir?",
    Topic: { name: "Matematik" },
    choices: [
      { id: "d1c1", text: "90°", isCorrect: false },
      { id: "d1c2", text: "180°", isCorrect: true },
      { id: "d1c3", text: "270°", isCorrect: false },
      { id: "d1c4", text: "360°", isCorrect: false },
    ],
    status: "PENDING",
  },
  {
    id: "demo-2",
    stem: "Türkiye'nin başkenti hangi şehirdir?",
    Topic: { name: "Coğrafya" },
    choices: [
      { id: "d2c1", text: "İstanbul", isCorrect: false },
      { id: "d2c2", text: "İzmir", isCorrect: false },
      { id: "d2c3", text: "Ankara", isCorrect: true },
      { id: "d2c4", text: "Bursa", isCorrect: false },
    ],
    status: "PENDING",
  },
];

function StatusBadge({ status, tr }: { status: string; tr: (s: string) => string }) {
  if (status === "APPROVED")
    return <span className="pill text-xs bg-amber-100 text-amber-700 border border-amber-300">{tr("Onaylı")}</span>;
  if (status === "REJECTED")
    return <span className="pill text-xs bg-rose-100 text-rose-700 border border-rose-300">{tr("Reddedildi")}</span>;
  return <span className="pill text-xs bg-amber-100 text-amber-700 border border-amber-300">{tr("Bekliyor")}</span>;
}

export default function AiQueuePage() {
  const t = useI18n();
  const { data, mutate, error } = useSWR<Draft[]>("/quiz/ai/drafts", api, { refreshInterval: 5000 });
  const [busy, setBusy] = useState(false);

  async function action(path: string, id: string) {
    setBusy(true);
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100"}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await mutate();
    setBusy(false);
  }

  const isDemo = !data && !!error;
  const drafts: Draft[] = isDemo ? DEMO_DRAFTS : (data ?? []);

  const pendingCount = drafts.filter((d) => d.status === "PENDING").length;
  const approvedCount = drafts.filter((d) => d.status === "APPROVED").length;

  return (
    <main className="space-y-6">
      {/* Header */}
      <header className="glass p-6 rounded-2xl border border-slate-200">
        <div className="space-y-2">
          <span className="pill w-fit text-xs bg-violet-100 text-violet-700 border border-violet-300">{t.roles.instructor}</span>
          <h1 className="text-3xl font-bold tracking-tight">{t.instructor.aiQueue}</h1>
          <p className="text-sm text-slate-600">{t.tr("Yapay zeka ile üretilen soruları incele, onaylayın veya düzelt.")}</p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-violet-700">{drafts.length}</div>
          <div className="text-xs text-slate-500 mt-1">{t.tr("Toplam Taslak")}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          <div className="text-xs text-slate-500 mt-1">{t.tr("Bekleyen")}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-700">{approvedCount}</div>
          <div className="text-xs text-slate-500 mt-1">{t.tr("Onaylı")}</div>
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <span className="pill text-xs bg-amber-200 text-amber-800 border border-amber-400 font-bold">DEMO</span>
          {t.tr("API bağlantısı kurulamadı — örnek veriler gösteriliyor.")}
        </div>
      )}

      {/* Loading skeletons */}
      {!data && !error && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-slate-200" />
                <div className="h-5 w-16 rounded-full bg-slate-200" />
              </div>
              <div className="h-5 w-3/4 rounded bg-slate-200" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-9 rounded-lg bg-slate-200" />
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-lg bg-slate-200" />
                <div className="h-8 w-20 rounded-lg bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {data?.length === 0 && (
        <div className="glass rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🤖</span>
          <h2 className="text-lg font-semibold text-slate-700">{t.tr("Taslak kuyruk boş")}</h2>
          <p className="text-sm text-slate-500">{t.tr("AI yeni sorular ürettiğinde burada görünür.")}</p>
        </div>
      )}

      {/* Question Cards */}
      <section className="space-y-4">
        {drafts.map((d) => (
          <div key={d.id} className="glass rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-colors">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="pill text-xs bg-slate-100 text-slate-600 border border-slate-200">
                  {t.tr(d.Topic?.name ?? "Konu")}
                </span>
                <span className="pill text-xs bg-slate-50 text-slate-500 border border-slate-200">
                  {d.choices.length} {t.tr("seçenek")}
                </span>
              </div>
              <StatusBadge status={d.status} tr={t.tr} />
            </div>

            {/* Question Stem */}
            <p className="text-base font-semibold text-slate-800 leading-relaxed">{d.stem}</p>

            {/* Choices Grid */}
            <div className="grid gap-2 md:grid-cols-2">
              {d.choices.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    c.isCorrect
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {c.isCorrect ? (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: "#C8A96A" }}>✓</span>
                  ) : (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs">○</span>
                  )}
                  {t.tr(c.text)}
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
              <button
                className="btn-link text-amber-700 border-amber-300 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={busy}
                onClick={() => action("/quiz/ai/approve", d.id)}
              >
                {t.tr("Onayla")} ✅
              </button>
              <button
                className="btn-link text-rose-700 border-rose-300 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={busy}
                onClick={() => action("/quiz/ai/reject", d.id)}
              >
                {t.tr("Reddet")} ❌
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
