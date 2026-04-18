"use client";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useI18n } from '../../_i18n/use-i18n';

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

type Payment = {
  id: string;
  status: string;
  courseId?: string | null;
  planId?: string | null;
  amount: string;
  currency: string;
};

async function fetchPayment(id: string): Promise<Payment | null> {
  const res = await fetch(`${API}/payments/history`, { credentials: "include" });
  if (!res.ok) return null;
  const list = (await res.json()) as Payment[];
  return list.find((p) => p.id === id) ?? null;
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="grid place-items-center min-h-[60vh]">
        <div className="loading-dots"><span/><span/><span/></div>
      </div>
    }>
      <PaymentSuccessInner />
    </Suspense>
  );
}

function PaymentSuccessInner() {
  const t = useI18n();
  const params = useSearchParams();
  const pid = params.get("pid");
  const { data } = useSWR(pid ? `payment-${pid}` : null, () => fetchPayment(pid!));
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);

  useEffect(() => {
    const particles = Array.from({ length: 32 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#3b82f6','#ec4899'][Math.floor(Math.random() * 6)],
      delay: Math.random() * 1.2,
    }));
    setConfetti(particles);
    const timer = setTimeout(() => setConfetti([]), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid place-items-center min-h-[60vh] px-4 relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 pointer-events-none text-xl animate-float"
          style={{ left: `${p.x}%`, animationDelay: `${p.delay}s`, color: p.color, fontSize: '1.5rem' }}
        >
          ✦
        </div>
      ))}

      <div className="glass p-10 rounded-3xl border border-emerald-200 bg-white/90 shadow-2xl max-w-lg w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-200">
          <span className="text-4xl">🎉</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.payments.successTitle}</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {t.payments.successDesc}
          </p>
        </div>

        {data && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 space-y-2 text-left">
            <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">{t.tr("İşlem Özeti")}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("İşlem No")}</span>
              <span className="font-mono text-slate-800 text-xs">{data.id.slice(0, 12)}…</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("Tutar")}</span>
              <span className="font-semibold text-emerald-700">{data.amount} {data.currency}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("Durum")}</span>
              <span className="pill text-xs bg-emerald-50 border-emerald-200 text-emerald-700">✓ {data.status}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/my-courses"
            className="btn-link justify-center text-sm font-semibold"
            style={{ background: 'linear-gradient(to right, #10b981, #06b6d4)', color: '#fff', borderColor: '#10b981' }}
          >
            {t.tr("📚 Kurslarıma Git")}
          </Link>
          <Link
            href="/courses"
            className="btn-link justify-center text-sm font-medium border-slate-200 bg-white text-slate-700"
          >
            {t.tr("Diğer Kurslar")}
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          {t.tr("Fatura e-postanıza gönderildi. Sorularınız için")}{" "}
          <Link href="/portal" className="text-emerald-600 hover:underline">{t.tr("destek merkezi")}</Link>{t.tr("ne başvurun.")}
        </p>
      </div>
    </div>
  );
}
