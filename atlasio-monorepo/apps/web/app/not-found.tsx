import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid place-items-center min-h-[60vh] px-4">
      <div className="glass p-8 rounded-3xl border border-slate-200 bg-white/90 shadow-2xl max-w-md w-full text-center space-y-5">
        <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500">
          404
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Sayfa bulunamadı</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="btn-link text-sm font-semibold border-emerald-500 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md px-5 py-2"
          >
            Ana sayfa
          </Link>
          <Link
            href="/courses"
            className="btn-link text-sm font-medium border-slate-200 bg-white text-slate-700 shadow-sm px-5 py-2"
          >
            Kurslara göz at
          </Link>
        </div>
      </div>
    </div>
  );
}
