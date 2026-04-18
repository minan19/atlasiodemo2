"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

export default function PayDemoPage() {
  const [courseId, setCourseId] = useState("");
  const [planId, setPlanId] = useState("");
  const [seats, setSeats] = useState(1);
  const [installments, setInstallments] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setBusy(true);
    setError(null);
    setUrl(null);
    try {
      const res = await fetch(`${API}/payments/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: courseId || undefined, planId: planId || undefined, seats, installments }),
      });
      if (!res.ok) throw new Error("Checkout başarısız");
      const data = await res.json();
      setUrl(data.checkoutUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <header className="glass p-6 rounded-2xl border border-slate-200 hero">
        <div className="hero-content space-y-2">
          <div className="pill w-fit">Güvenli Ödeme</div>
          <h1 className="text-2xl font-semibold">Ödeme Demo</h1>
          <p className="text-sm text-slate-600">Stripe entegrasyonu ile hızlı ve güvenli checkout.</p>
        </div>
      </header>

      <div className="glass rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kurs ID</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-emerald-400 focus:outline-none"
            placeholder="Kurs ID (opsiyonel)"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Plan ID</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-emerald-400 focus:outline-none"
            placeholder="Plan ID (opsiyonel)"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Koltuk Sayısı</label>
            <input
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Taksit</label>
            <input
              type="number"
              min={1}
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={busy}
          className="btn-link w-full justify-center font-semibold disabled:opacity-60"
          style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', borderColor: '#10b981' }}
        >
          {busy ? "🔄 Yönlendiriliyor…" : "💳 Checkout'a Git"}
        </button>

        {url && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 space-y-1">
            <div className="text-xs text-emerald-700 font-semibold">Checkout URL hazır</div>
            <a href={url} target="_blank" rel="noreferrer" className="text-emerald-700 underline break-all text-xs">
              {url}
            </a>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        🔒 256-bit SSL şifreleme · PCI DSS uyumlu · Stripe güvencesi
      </p>
    </div>
  );
}
