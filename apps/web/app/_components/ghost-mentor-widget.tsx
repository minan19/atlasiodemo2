"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4100";

type Source = { snippet: string; ref: string };

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  latencyMs?: number;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken") ?? localStorage.getItem("access_token");
}

export default function GhostMentorWidget() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [courseId, setCourseId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // detect courseId from URL
  useEffect(() => {
    const match = window.location.pathname.match(/\/courses\/([^/]+)/);
    if (match) setCourseId(match[1]);
  }, []);

  async function ask() {
    const q = query.trim();
    if (!q || loading) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/ghost-mentor/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: q, courseId, examMode }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.text ?? "Yanıt alınamadı.",
          sources: data.sources ?? [],
          latencyMs: data.latencyMs,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Ghost-Mentor şu an yanıt veremiyor. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Ghost Mentor AI"
        className={`fixed bottom-5 right-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300
          ${open
            ? "bg-violet-700 scale-95"
            : "bg-gradient-to-br from-violet-600 to-indigo-700 hover:scale-110"
          }`}
      >
        <span className="text-2xl select-none">{open ? "✕" : "✦"}</span>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 animate-pulse" />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[9999] flex w-[360px] flex-col rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur"
          style={{ height: 480 }}>

          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-700/50 bg-slate-800/80 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg shadow">
              ✦
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-100">Ghost Mentor</div>
              <div className="text-[10px] text-slate-500">Yapay Zeka Öğretmeniniz</div>
            </div>
            {/* Exam mode toggle */}
            <button
              onClick={() => setExamMode((v) => !v)}
              title={examMode ? "Sınav modu açık — sadece ipucu" : "Normal mod"}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-all ${
                examMode
                  ? "bg-amber-600/30 text-amber-400 border border-amber-700/50"
                  : "bg-slate-700 text-slate-400 border border-slate-600"
              }`}
            >
              {examMode ? "📝 Sınav" : "💬 Normal"}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="mt-6 text-center">
                <div className="text-3xl mb-2">✦</div>
                <p className="text-sm font-medium text-slate-300">Merhaba! Size nasıl yardımcı olabilirim?</p>
                <p className="mt-1 text-xs text-slate-500">Kurs içeriği, ders soruları veya herhangi bir konu hakkında sorabilirsiniz.</p>
                <div className="mt-4 flex flex-col gap-1.5">
                  {["Bu konuyu açıklar mısın?", "Quiz için ipucu ver", "Özet çıkar"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                      className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                    ${m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50"
                    }`}
                  >
                    {m.text}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {m.sources.slice(0, 2).map((s, si) => (
                          <div key={si} className="flex items-center gap-1 text-[10px] text-violet-300/70">
                            <span>📌</span>
                            <span>{s.ref}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.latencyMs && (
                      <div className="mt-1 text-[9px] text-slate-600">{m.latencyMs}ms</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-700/50 bg-slate-800 px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-700/50 px-3 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ask()}
                placeholder={examMode ? "Sınav modunda ipucu iste…" : "Sorunuzu yazın…"}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-violet-500 focus:outline-none transition-colors"
              />
              <button
                onClick={ask}
                disabled={loading || !query.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-500 transition-all"
              >
                ↑
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="mt-1.5 w-full text-center text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Konuşmayı temizle
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
