"use client";

import { useState } from "react";

type Props = {
  courseId: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

export function BuyButton({ courseId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API}/payments/checkout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error("Ödeme başlatılamadı");
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError("Yönlendirme linki alınamadı");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBuy}
        disabled={busy}
        className="px-4 py-2 rounded-lg border bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {busy ? "Yönlendiriliyor..." : "Satın al"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
