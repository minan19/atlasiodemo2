"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="grid place-items-center min-h-[60vh] px-4">
      <div className="glass p-10 rounded-3xl border border-rose-200 bg-white/90 shadow-2xl max-w-lg w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-200">
          <span className="text-4xl">⚠️</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ödeme İptal Edildi</h1>
          <p className="text-slate-500 mt-2 text-sm">
            İşlemi iptal ettin veya bir hata oluştu. Hesabından herhangi bir ücret alınmadı.
          </p>
        </div>

        <div className="grid gap-2 text-left">
          {[
            { icon: "🔄", text: "Tekrar denemek için kurs sayfasına dön" },
            { icon: "💳", text: "Farklı bir ödeme yöntemi kullanabilirsin" },
            { icon: "💬", text: "Sorun yaşıyorsan destek ekibiyle iletişime geç" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <span className="text-xl mt-0.5">{item.icon}</span>
              <p className="text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.back()}
            className="btn-link justify-center text-sm font-semibold border-slate-800 bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg"
          >
            ← Geri Dön
          </button>
          <Link
            href="/courses"
            className="btn-link justify-center text-sm font-medium border-slate-200 bg-white text-slate-700"
          >
            Kurslara Bak
          </Link>
        </div>

        <Link
          href="/portal"
          className="text-xs text-slate-400 hover:text-emerald-600 hover:underline transition-colors"
        >
          Destek merkezi →
        </Link>
      </div>
    </div>
  );
}
