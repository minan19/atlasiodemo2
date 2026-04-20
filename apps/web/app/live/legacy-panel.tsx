"use client";

import { useState } from "react";
import { createLegacySession, joinLegacySession, useLegacySessions } from "./legacy-hooks";
import { useRouter } from "next/navigation";
import { useI18n } from "../_i18n/use-i18n";

export function LegacyPanel({ userId }: { userId: string }) {
  const t = useI18n();
  const { sessions, refresh, isLoading } = useLegacySessions();
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("B2");
  const [joining, setJoining] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="glass rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{t.tr("Hızlı Oturum (Legacy)")}</div>
        <button
          className="btn-link"
          onClick={async () => {
            await createLegacySession({ instructorId: userId, language, targetLevel: level });
            await refresh();
          }}
        >
          + {t.tr("Oturum Aç")}
        </button>
      </div>
      <div className="flex gap-2 flex-wrap text-sm">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder={t.tr("Dil")}
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          placeholder={t.tr("Seviye")}
        />
      </div>
      <div className="space-y-2 text-sm">
        {isLoading && <div>{t.tr("Yükleniyor...")}</div>}
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <div className="font-semibold">{s.classCode}</div>
              <div className="text-xs text-slate-600">{s.language} · {s.targetLevel}</div>
            </div>
            <button
            className="btn-link"
            disabled={joining === s.id}
            onClick={async () => {
              setJoining(s.id);
              try {
                const res = await joinLegacySession({ sessionId: s.id, studentId: userId });
                router.push(`/live/${s.id}?classCode=${res.classCode}`);
              } finally {
                setJoining(null);
              }
            }}
          >
              {t.tr("Katıl")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
