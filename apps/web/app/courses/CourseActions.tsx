'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EnrollButton } from './EnrollButton';
import { BuyButton } from './BuyButton';
import { api } from '../api/client';

type Props = {
  courseId: string;
};

type EnrollmentItem = {
  courseId: string;
  completedAt: string | null;
  refundedAt: string | null;
};

type EnrollState = 'loading' | 'not-logged-in' | 'enrolled' | 'completed' | 'refunded' | 'not-enrolled';

export function CourseActions({ courseId }: Props) {
  const [state, setState] = useState<EnrollState>('loading');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { setState('not-logged-in'); return; }

    api<EnrollmentItem[]>('/me/enrollments')
      .then((enrollments) => {
        const found = enrollments.find((e) => e.courseId === courseId);
        if (!found) { setState('not-enrolled'); return; }
        if (found.refundedAt) { setState('refunded'); return; }
        if (found.completedAt) { setState('completed'); return; }
        setState('enrolled');
      })
      .catch(() => setState('not-enrolled'));
  }, [courseId]);

  // Yükleniyor — placeholder genişliğini koruyalım
  if (state === 'loading') {
    return (
      <div className="flex gap-3 flex-wrap">
        <div className="h-9 w-24 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-9 w-20 rounded-lg bg-slate-100 animate-pulse" />
        <div className="h-9 w-20 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-wrap items-center">
      {/* Kayıt durumuna göre buton */}
      {state === 'enrolled' && (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "rgba(200,169,106,0.1)", border: "1px solid rgba(200,169,106,0.3)", color: "#C8A96A" }}>
          ✓ Kayıtlısınız
        </span>
      )}
      {state === 'completed' && (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold">
          🎓 Tamamlandı
        </span>
      )}
      {state === 'refunded' && (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-sm">
          İade edildi
        </span>
      )}
      {(state === 'not-enrolled' || state === 'not-logged-in') && (
        <>
          <EnrollButton courseId={courseId} />
          <BuyButton courseId={courseId} />
        </>
      )}
      {state === 'not-logged-in' && (
        <Link
          href={`/login?redirect=/courses/${courseId}`}
          className="text-xs text-slate-500 hover:underline"
        >
          Giriş yaparak kayıt ol
        </Link>
      )}

      {/* Kayıtlarım linki — zaten kayıtlıysa */}
      {(state === 'enrolled' || state === 'completed') && (
        <Link href="/my-courses" className="text-xs hover:underline font-medium" style={{ color: "#C8A96A" }}>
          Kayıtlarıma git →
        </Link>
      )}

      {/* Her zaman geri linki */}
      <Link href="/courses" className="btn-link text-sm">
        Kurslara dön
      </Link>
    </div>
  );
}
