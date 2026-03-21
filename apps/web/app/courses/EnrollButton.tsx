'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../api/client';

type Props = {
  courseId: string;
};

export function EnrollButton({ courseId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/courses/${courseId}/enroll`, { method: 'POST' });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
        ✓ Kayıt tamamlandı
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEnroll}
        disabled={busy}
        className="px-4 py-2 rounded-lg border bg-slate-900 text-white hover:bg-slate-700 text-sm font-semibold disabled:opacity-60 transition-colors"
      >
        {busy ? 'Kaydediliyor…' : 'Kayıt ol'}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
