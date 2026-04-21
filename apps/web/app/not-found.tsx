"use client";

import Link from 'next/link';
import { useI18n } from './_i18n/use-i18n';

export default function NotFound() {
  const { tr } = useI18n();
  return (
    <div className="grid place-items-center min-h-[60vh] px-4">
      <div style={{ background:"var(--card,#fff)", borderRadius:24, padding:36, border:"1px solid var(--line,#e2e8f0)", boxShadow:"0 8px 40px rgba(11,31,58,0.08)", maxWidth:440, width:"100%", textAlign:"center" }}>
        {/* Gold accent */}
        <div style={{ width:60, height:4, background:"#C8A96A", borderRadius:2, margin:"0 auto 24px" }} />
        {/* 404 in navy */}
        <div style={{ fontSize:80, fontWeight:800, color:"#0B1F3A", fontFamily:"var(--font-serif,Georgia)", lineHeight:1, marginBottom:16, letterSpacing:"-0.03em" }}>
          404
        </div>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"var(--ink,#0f172a)", margin:"0 0 8px" }}>{tr("Sayfa bulunamadı")}</h1>
          <p style={{ fontSize:14, color:"var(--ink-2,#64748b)", margin:0 }}>
            {tr("Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.")}
          </p>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", padding:"10px 22px", borderRadius:10, background:"#0B1F3A", color:"#FAFAF8", fontSize:13, fontWeight:700, textDecoration:"none", boxShadow:"0 4px 14px rgba(11,31,58,0.2)" }}>
            {tr("Ana sayfa")}
          </Link>
          <Link href="/courses" style={{ display:"inline-flex", alignItems:"center", padding:"10px 22px", borderRadius:10, background:"transparent", border:"1.5px solid rgba(200,169,106,0.4)", color:"#C8A96A", fontSize:13, fontWeight:600, textDecoration:"none" }}>
            {tr("Kurslara göz at")}
          </Link>
        </div>
      </div>
    </div>
  );
}
