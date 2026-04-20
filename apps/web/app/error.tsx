"use client";

import { useEffect } from "react";
import { useI18n } from './_i18n/use-i18n';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Hataları loglama servisi varsa buraya gönder
    console.error("[ATLASIO Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass rounded-2xl border border-rose-200 p-8 max-w-md w-full space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-xl font-semibold text-rose-700">Bir şeyler yanlış gitti</h2>
            <p className="text-sm text-slate-500 mt-0.5">Sayfa yüklenirken beklenmedik bir hata oluştu.</p>
          </div>
        </div>

        {error?.message && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-600 font-mono break-all">
            {error.message}
          </div>
        )}

        {error?.digest && (
          <div className="text-xs text-slate-400">Hata kodu: {error.digest}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={reset}
            className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
          >
            Tekrar dene
          </button>
          <a
            href="/"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition text-center"
          >
            Ana sayfaya dön
          </a>
        </div>
      </div>
    </div>
  );
}
