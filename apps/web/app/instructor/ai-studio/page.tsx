"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") ?? localStorage.getItem("access_token");
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type StudioTab = "generate" | "expand" | "rewrite" | "bulk" | "presentation" | "mindmap";

interface MindMapNode { id: string; label: string; children: MindMapNode[]; }
interface PresentationSlide { title: string; bullets: string[]; speakerNote?: string; }

function MindMapTree({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-4 border-l border-slate-200 pl-3 mt-1" : ""}>
      <div className={`rounded-lg px-3 py-1.5 text-sm font-medium inline-block mb-1
        ${depth === 0 ? "bg-violet-600 text-white" : depth === 1 ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>
        {node.label}
      </div>
      {node.children.map((c) => (
        <MindMapTree key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function AIContentStudioPage() {
  const [tab, setTab] = useState<StudioTab>("generate");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate
  const [genTopic, setGenTopic] = useState("");
  const [genType, setGenType] = useState<"lesson" | "quiz" | "course_outline" | "summary">("lesson");
  const [genLang, setGenLang] = useState<"tr" | "en">("tr");
  const [genDiff, setGenDiff] = useState<1 | 2 | 3>(2);

  // Expand
  const [expText, setExpText] = useState("");
  const [expLen, setExpLen] = useState<"short" | "medium" | "long">("medium");

  // Rewrite
  const [rwText, setRwText] = useState("");
  const [rwTone, setRwTone] = useState<"formal" | "casual" | "academic" | "simple">("formal");

  // Bulk
  const [bulkTopics, setBulkTopics] = useState("");
  const [bulkType, setBulkType] = useState<"lesson" | "quiz" | "summary">("summary");

  // Presentation
  const [pTopic, setPTopic] = useState("");
  const [pSlides, setPSlides] = useState(8);
  const [pActiveSlide, setPActiveSlide] = useState(0);

  // Mind Map
  const [mmTopic, setMmTopic] = useState("");
  const [mmDepth, setMmDepth] = useState(2);

  async function run(endpoint: string, body: unknown) {
    setLoading(true); setResult(null); setError(null); setPActiveSlide(0);
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Hata ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "İstek başarısız");
    } finally { setLoading(false); }
  }

  const TABS: { id: StudioTab; label: string; icon: string }[] = [
    { id: "generate", label: "İçerik Üret", icon: "✦" },
    { id: "expand", label: "Genişlet", icon: "↔" },
    { id: "rewrite", label: "Yeniden Yaz", icon: "✏️" },
    { id: "bulk", label: "Toplu Üretim", icon: "⚡" },
    { id: "presentation", label: "Sunum", icon: "🎨" },
    { id: "mindmap", label: "Zihin Haritası", icon: "🗺" },
  ];

  const pResult = result as { title?: string; subtitle?: string; slides?: PresentationSlide[] } | null;
  const mmResult = result as { root?: MindMapNode } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass hero rounded-2xl border border-slate-200 p-6">
        <div className="hero-content">
          <div className="pill w-fit mb-2">
            <span className="text-violet-600">✦</span> AI İçerik Stüdyosu
          </div>
          <h1 className="text-2xl font-bold">Eğitmen AI Stüdyosu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ders, quiz, sunum, zihin haritası ve daha fazlasını AI ile saniyeler içinde oluşturun.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: tabs + form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="glass rounded-2xl border border-slate-200 p-1.5 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setResult(null); setError(null); }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all
                  ${tab === t.id ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div className="glass rounded-2xl border border-slate-200 p-5 space-y-4">

            {tab === "generate" && (
              <>
                <div>
                  <label className="label-sm">Konu</label>
                  <input className="input mt-1" placeholder="örn. Fotosentez" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-sm">İçerik Türü</label>
                    <select className="input mt-1" value={genType} onChange={(e) => setGenType(e.target.value as typeof genType)}>
                      <option value="lesson">Ders</option>
                      <option value="quiz">Quiz</option>
                      <option value="course_outline">Kurs Planı</option>
                      <option value="summary">Özet</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-sm">Zorluk</label>
                    <select className="input mt-1" value={genDiff} onChange={(e) => setGenDiff(Number(e.target.value) as 1 | 2 | 3)}>
                      <option value={1}>Başlangıç</option>
                      <option value={2}>Orta</option>
                      <option value={3}>İleri</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["tr", "en"] as const).map((l) => (
                    <button key={l} onClick={() => setGenLang(l)}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${genLang === l ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {l === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}
                    </button>
                  ))}
                </div>
                <button disabled={loading || !genTopic.trim()} onClick={() => run("/ai/content/generate", { topic: genTopic, type: genType, language: genLang, difficulty: genDiff })}
                  className="btn btn-primary w-full">{loading ? "Üretiyor…" : "✦ İçerik Oluştur"}</button>
              </>
            )}

            {tab === "expand" && (
              <>
                <div>
                  <label className="label-sm">Kısa Metin</label>
                  <textarea className="input mt-1 min-h-[120px] resize-y" placeholder="Genişletmek istediğiniz metni girin…" value={expText} onChange={(e) => setExpText(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  {(["short", "medium", "long"] as const).map((l) => (
                    <button key={l} onClick={() => setExpLen(l)}
                      className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all ${expLen === l ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {l === "short" ? "Kısa" : l === "medium" ? "Orta" : "Uzun"}
                    </button>
                  ))}
                </div>
                <button disabled={loading || !expText.trim()} onClick={() => run("/ai/content/expand", { text: expText, targetLength: expLen, language: "tr" })}
                  className="btn btn-primary w-full">{loading ? "Genişletiyor…" : "↔ Genişlet"}</button>
              </>
            )}

            {tab === "rewrite" && (
              <>
                <div>
                  <label className="label-sm">Metin</label>
                  <textarea className="input mt-1 min-h-[120px] resize-y" placeholder="Yeniden yazmak istediğiniz metni girin…" value={rwText} onChange={(e) => setRwText(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["formal", "casual", "academic", "simple"] as const).map((t) => (
                    <button key={t} onClick={() => setRwTone(t)}
                      className={`rounded-xl py-2 text-xs font-semibold transition-all ${rwTone === t ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {t === "formal" ? "Resmi" : t === "casual" ? "Sade" : t === "academic" ? "Akademik" : "Basit"}
                    </button>
                  ))}
                </div>
                <button disabled={loading || !rwText.trim()} onClick={() => run("/ai/content/rewrite", { text: rwText, tone: rwTone, language: "tr" })}
                  className="btn btn-primary w-full">{loading ? "Yazıyor…" : "✏️ Yeniden Yaz"}</button>
              </>
            )}

            {tab === "bulk" && (
              <>
                <div>
                  <label className="label-sm">Konular (her satıra bir tane, max 10)</label>
                  <textarea className="input mt-1 min-h-[140px] font-mono text-xs resize-y"
                    placeholder={"Fotosentez\nHücre Bölünmesi\nMitoz ve Mayoz\nDNA Yapısı"}
                    value={bulkTopics} onChange={(e) => setBulkTopics(e.target.value)} />
                </div>
                <div>
                  <label className="label-sm">İçerik Türü</label>
                  <select className="input mt-1" value={bulkType} onChange={(e) => setBulkType(e.target.value as typeof bulkType)}>
                    <option value="summary">Özet</option>
                    <option value="lesson">Ders</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <button disabled={loading || !bulkTopics.trim()} onClick={() => run("/ai/content/bulk-generate", {
                  topics: bulkTopics.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 10),
                  type: bulkType, language: "tr", difficulty: 2,
                })} className="btn btn-primary w-full">{loading ? "Üretiyor…" : "⚡ Toplu Üret"}</button>
              </>
            )}

            {tab === "presentation" && (
              <>
                <div>
                  <label className="label-sm">Konu</label>
                  <input className="input mt-1" placeholder="örn. Makine Öğrenmesi" value={pTopic} onChange={(e) => setPTopic(e.target.value)} />
                </div>
                <div>
                  <label className="label-sm">Slayt Sayısı: {pSlides}</label>
                  <input type="range" min={3} max={16} value={pSlides} onChange={(e) => setPSlides(Number(e.target.value))} className="w-full mt-1" />
                </div>
                <button disabled={loading || !pTopic.trim()} onClick={() => run("/ai/presentation/generate", { topic: pTopic, slideCount: pSlides, language: "tr" })}
                  className="btn btn-primary w-full">{loading ? "Hazırlıyor…" : "🎨 Sunum Oluştur"}</button>
              </>
            )}

            {tab === "mindmap" && (
              <>
                <div>
                  <label className="label-sm">Konu</label>
                  <input className="input mt-1" placeholder="örn. Hücre Biyolojisi" value={mmTopic} onChange={(e) => setMmTopic(e.target.value)} />
                </div>
                <div>
                  <label className="label-sm">Derinlik: {mmDepth}</label>
                  <input type="range" min={1} max={4} value={mmDepth} onChange={(e) => setMmDepth(Number(e.target.value))} className="w-full mt-1" />
                </div>
                <button disabled={loading || !mmTopic.trim()} onClick={() => run("/ai/mind-map", { topic: mmTopic, depth: mmDepth, language: "tr" })}
                  className="btn btn-primary w-full">{loading ? "Oluşturuyor…" : "🗺 Harita Oluştur"}</button>
              </>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
          </div>
        </div>

        {/* Right: result */}
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl border border-slate-200 p-5 min-h-[500px]">
            {!result && !loading && (
              <div className="flex h-[460px] flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4">✦</div>
                <p className="text-slate-500 font-medium">Sol panelden bir araç seçin ve içerik oluşturun.</p>
                <p className="text-sm text-slate-400 mt-1">Ders, quiz, sunum, özet ve daha fazlası.</p>
              </div>
            )}

            {loading && (
              <div className="flex h-[460px] flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
                <p className="text-sm text-slate-500">AI içerik üretiyor…</p>
              </div>
            )}

            {/* Presentation result */}
            {result && tab === "presentation" && pResult?.slides && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 p-6 text-center text-white shadow-lg">
                  <div className="text-xl font-bold">{pResult.title}</div>
                  <div className="text-sm text-violet-200 mt-1">{pResult.subtitle}</div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {pResult.slides.map((_, i) => (
                    <button key={i} onClick={() => setPActiveSlide(i)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${pActiveSlide === i ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                {pResult.slides[pActiveSlide] && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h3 className="text-base font-bold text-slate-800 mb-3">{pResult.slides[pActiveSlide].title}</h3>
                    <ul className="space-y-2">
                      {pResult.slides[pActiveSlide].bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-violet-500 mt-0.5 font-bold">•</span>{b}
                        </li>
                      ))}
                    </ul>
                    {pResult.slides[pActiveSlide].speakerNote && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                        💬 {pResult.slides[pActiveSlide].speakerNote}
                      </div>
                    )}
                  </div>
                )}
                <div className="text-right">
                  <span className="text-xs text-slate-400">{pResult.slides.length} slayt</span>
                </div>
              </div>
            )}

            {/* Mind Map result */}
            {result && tab === "mindmap" && mmResult?.root && (
              <div className="overflow-x-auto">
                <h3 className="mb-4 text-sm font-semibold text-slate-600">Zihin Haritası</h3>
                <MindMapTree node={mmResult.root} />
              </div>
            )}

            {/* Bulk result */}
            {result && tab === "bulk" && (
              <div className="space-y-3 overflow-y-auto max-h-[500px]">
                {((result as { results?: { topic: string; content: unknown }[] })?.results ?? []).map((r, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{i + 1}</span>
                      <span className="text-sm font-semibold text-slate-800">{r.topic}</span>
                    </div>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                      {JSON.stringify(r.content, null, 2).slice(0, 400)}…
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Generic JSON result */}
            {result && !["presentation", "mindmap", "bulk"].includes(tab) && (
              <div className="space-y-4">
                {/* Lesson */}
                {(() => {
                  const r = result as Record<string, unknown>;
                  return (
                    <div className="space-y-4">
                      {!!r.title && <h2 className="text-lg font-bold text-slate-800">{String(r.title)}</h2>}
                      {!!r.expanded && <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{String(r.expanded)}</p>}
                      {!!r.rewritten && <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{String(r.rewritten)}</p>}
                      {!!r.summary && <p className="text-sm text-slate-700 leading-relaxed">{String(r.summary)}</p>}
                      {Array.isArray(r.objectives) && (
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Hedefler</h3>
                          <ul className="space-y-1">{r.objectives.map((o: unknown, i: number) => <li key={i} className="flex gap-2 text-sm"><span className="text-emerald-500">✓</span>{String(o)}</li>)}</ul>
                        </div>
                      )}
                      {Array.isArray(r.sections) && r.sections.map((s: { heading: string; content: string }, i: number) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <h3 className="text-sm font-bold text-slate-700 mb-1">{s.heading}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{s.content}</p>
                        </div>
                      ))}
                      {Array.isArray(r.questions) && r.questions.map((q: { stem: string; choices: string[]; correctIndex: number; explanation: string }, i: number) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-semibold text-slate-800 mb-2">{i + 1}. {q.stem}</p>
                          <div className="space-y-1 mb-2">{q.choices.map((c: string, ci: number) => (
                            <div key={ci} className={`rounded-lg px-3 py-1.5 text-sm ${ci === q.correctIndex ? "bg-emerald-100 text-emerald-800 font-semibold" : "bg-white text-slate-600"}`}>
                              {String.fromCharCode(65 + ci)}. {c}
                            </div>
                          ))}</div>
                          <p className="text-xs text-slate-500 italic">{q.explanation}</p>
                        </div>
                      ))}
                      {Array.isArray(r.keyPoints) && (
                        <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                          <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">Anahtar Noktalar</h3>
                          <ul className="space-y-1">{r.keyPoints.map((k: unknown, i: number) => <li key={i} className="flex gap-2 text-sm text-violet-800"><span>•</span>{String(k)}</li>)}</ul>
                        </div>
                      )}
                      {Array.isArray(r.keyTakeaways) && (
                        <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                          <ul className="space-y-1">{r.keyTakeaways.map((k: unknown, i: number) => <li key={i} className="flex gap-2 text-sm text-violet-800"><span>✓</span>{String(k)}</li>)}</ul>
                        </div>
                      )}
                      {Array.isArray(r.modules) && r.modules.map((m: { title: string; lessons: string[]; estimatedHours: number }, i: number) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-700">{m.title}</h3>
                            <span className="text-xs text-slate-500">{m.estimatedHours} saat</span>
                          </div>
                          <ul className="space-y-1">{m.lessons.map((l: string, li: number) => <li key={li} className="text-xs text-slate-600">• {l}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
