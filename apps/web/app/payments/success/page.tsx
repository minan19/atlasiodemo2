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

      <div style={{ background:"var(--card,#fff)", borderRadius:24, padding:40, border:"1px solid rgba(200,169,106,0.25)", boxShadow:"0 8px 40px rgba(11,31,58,0.10)", maxWidth:480, width:"100%", textAlign:"center" }}>
        {/* Gold accent bar */}
        <div style={{ width:60, height:4, background:"#C8A96A", borderRadius:2, margin:"0 auto 28px" }} />
        {/* Success Icon */}
        <div style={{ margin:"0 auto 20px", width:80, height:80, borderRadius:"50%", background:"#0B1F3A", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(11,31,58,0.25)" }}>
          <span style={{ fontSize:36 }}>🎉</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.payments.successTitle}</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {t.payments.successDesc}
          </p>
        </div>

        {data && (
          <div style={{ borderRadius:14, border:"1px solid rgba(200,169,106,0.25)", background:"rgba(200,169,106,0.06)", padding:16, textAlign:"left", display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ fontSize:11, color:"#C8A96A", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{t.tr("İşlem Özeti")}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("İşlem No")}</span>
              <span className="font-mono text-slate-800 text-xs">{data.id.slice(0, 12)}…</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("Tutar")}</span>
              <span style={{ fontWeight:700, color:"#C8A96A" }}>{data.amount} {data.currency}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{t.tr("Durum")}</span>
              <span style={{ fontSize:11, fontWeight:600, color:"#C8A96A", background:"rgba(200,169,106,0.12)", border:"1px solid rgba(200,169,106,0.3)", borderRadius:6, padding:"2px 8px" }}>✓ {data.status}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/my-courses" style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 16px", borderRadius:10, background:"#0B1F3A", color:"#FAFAF8", fontSize:13, fontWeight:700, textDecoration:"none", boxShadow:"0 4px 14px rgba(11,31,58,0.2)" }}>
            {t.tr("📚 Kurslarıma Git")}
          </Link>
          <Link href="/courses" style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 16px", borderRadius:10, border:"1.5px solid rgba(200,169,106,0.35)", color:"#C8A96A", fontSize:13, fontWeight:600, textDecoration:"none" }}>
            {t.tr("Diğer Kurslar")}
          </Link>
        </div>

        <p className="text-xs text-slate-400">
          {t.tr("Fatura e-postanıza gönderildi. Sorularınız için")}{" "}
          <Link href="/portal" style={{ color:"#C8A96A", textDecoration:"underline" }}>{t.tr("destek merkezi")}</Link>{t.tr("ne başvurun.")}
        </p>
      </div>
    </div>
  );
}
