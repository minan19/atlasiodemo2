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
            style={{ flex:1, borderRadius:10, border:"none", padding:"10px 16px", background:"#0B1F3A", color:"#FAFAF8", fontSize:13, fontWeight:600, cursor:"pointer" }}
          >
            Tekrar dene
          </button>
          <a
            href="/"
            style={{ flex:1, borderRadius:10, border:"1.5px solid rgba(200,169,106,0.35)", padding:"10px 16px", background:"transparent", color:"#C8A96A", fontSize:13, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}
          >
            Ana sayfaya dön
          </a>
        </div>
      </div>
    </div>
  );
}
