'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
};

type Suggestion = { icon: string; label: string; prompt: string };

const SUGGESTIONS: Suggestion[] = [
  { icon: '📚', label: 'Konu Özeti', prompt: 'Türev konusunu kısaca özetle ve önemli formülleri listele.' },
  { icon: '❓', label: 'Soru Üret', prompt: 'Integral konusunda 3 adet orta zorlukta çalışma sorusu oluştur.' },
  { icon: '🗺️', label: 'Öğrenim Yolu', prompt: 'Python öğrenmek istiyorum, adım adım bir öğrenim yolu oluştur.' },
  { icon: '🔍', label: 'Kavramı Açıkla', prompt: 'Osmoz nedir? Günlük hayattan örneklerle açıkla.' },
  { icon: '📝', label: 'Sınava Hazırlan', prompt: 'Kimya sınavına en verimli nasıl hazırlanırım?' },
  { icon: '💡', label: 'Fikir Ver', prompt: 'Bitki hücresini anlatan yaratıcı bir sınıf aktivitesi öner.' },
];

// Simulated AI responses based on keywords
function getAIResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('türev') || msg.includes('derivative')) {
    return `## Türev — Hızlı Özet 📐

**Temel Türev Formülleri:**
- \`xⁿ\` → \`n·xⁿ⁻¹\`
- \`eˣ\` → \`eˣ\`
- \`ln(x)\` → \`1/x\`
- \`sin(x)\` → \`cos(x)\`
- \`cos(x)\` → \`-sin(x)\`

**Zincir Kuralı:** f(g(x))' = f'(g(x)) · g'(x)

**Örnek:** f(x) = (3x² + 2)⁵
→ f'(x) = 5(3x² + 2)⁴ · 6x = 30x(3x² + 2)⁴

Başka hangi konuyu detaylandırayım?`;
  }

  if (msg.includes('integral') || msg.includes('soru üret')) {
    return `## İntegral Soruları 📝

**Soru 1 — Temel İntegral:**
∫(3x² - 2x + 5) dx = ?

> **Çözüm:** x³ - x² + 5x + C

**Soru 2 — Yerine Koyma:**
∫ x·e^(x²) dx = ?

> **İpucu:** u = x² dönüşümünü dene

**Soru 3 — Parçalı İntegral:**
∫ x·cos(x) dx = ?

> **İpucu:** u = x, dv = cos(x)dx al

Adım adım çözüm ister misin?`;
  }

  if (msg.includes('python')) {
    return `## Python Öğrenim Yolu 🗺️

**Aşama 1 — Temel (2-3 hafta)**
- Değişkenler, veri tipleri, operatörler
- Koşullar (if/elif/else) ve döngüler
- Fonksiyonlar ve modüller

**Aşama 2 — Orta (3-4 hafta)**
- Listeler, sözlükler, kümeler
- Dosya okuma/yazma
- Hata yönetimi (try/except)
- OOP — sınıflar ve nesneler

**Aşama 3 — İleri (4-6 hafta)**
- NumPy & Pandas (veri analizi)
- Flask veya FastAPI (web)
- Proje geliştirme

**Önerilen kaynaklar:** Python.org docs, CS50P (ücretsiz), Colab notebook

Ne kadar süren öğrenmek istiyorsun?`;
  }

  if (msg.includes('osmoz') || msg.includes('hücre')) {
    return `## Osmoz Nedir? 🔬

**Tanım:** Yarı geçirgen bir zar boyunca, daha az konsantrasyonlu ortamdan daha fazla konsantrasyonlu ortama su moleküllerinin pasif difüzyonudur.

**Günlük Hayattan Örnekler:**
1. 🥒 **Salamura salatalık:** Tuz çekerken sertleşir — osmoz ile su çekilir
2. 🌿 **Bitki kökleri:** Yeraltı suyu alımı osmoz ile gerçekleşir
3. 🧃 **Kuru meyve ıslatma:** Su çekerek şişer

**Turgor basıncı:** Bitki hücrelerinin sertliği bu basınçtan gelir.

Bitki ve hayvan hücresinin farklılıklarını da açıklayayım mı?`;
  }

  if (msg.includes('sınav') || msg.includes('hazırlan')) {
    return `## Verimli Sınav Hazırlığı 🎯

**Bilimsel Çalışma Teknikleri:**

**1. Spaced Repetition (Aralıklı Tekrar)**
- 1. gün → 1. gün akşamı → 3. gün → 7. gün → 21. gün

**2. Active Recall**
- Kitabı kapatıp hatırlamaya çalış
- Flashcard yöntemi

**3. Pomodoro Tekniği**
- 25 dk çalış → 5 dk mola → 4 turdan sonra 15-30 dk uzun mola

**4. Feynman Tekniği**
- Konuyu sanki birine anlatıyormuşsun gibi yaz

**Sınav öncesi gece:** Yeni konu çalışma, sadece tekrar + erken uyu!

Hangi ders için hazırlanıyorsun?`;
  }

  // Generic response
  const responses = [
    `Harika bir soru! Bunu detaylı ele alalım. "${userMessage}" konusunda sana en iyi şekilde yardımcı olmak için biraz daha bağlam verir misin? Hangi seviyede (başlangıç / orta / ileri) bilgi istiyorsun?`,
    `Bu konuyu birlikte inceleyelim! 🎓 Sana özel bir öğrenme planı oluşturmam için şunu sormam gerek: Bu konuyu daha önce gördün mü, yoksa sıfırdan başlıyoruz mu?`,
    `Anladım! Şunu söyleyeyim: "${userMessage}" — bu konu gerçekten ilginç. Sana hem teorik temel hem pratik sorular hazırlayabilirim. Hangisinden başlayalım?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: `Merhaba! Ben **Ghost-Mentor**, ATLASIO'nun AI öğrenme asistanıyım. 🎓

Sana şunlarda yardımcı olabilirim:
- 📚 Konu özetleri ve açıklamalar
- ❓ Alıştırma soruları oluşturma
- 🗺️ Kişiselleştirilmiş öğrenim yolları
- 💡 Kavramları örneklerle açıklama
- 📝 Sınava hazırlık stratejileri

Aşağıdaki önerilerden birini seç ya da doğrudan yaz!`,
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [msgId, setMsgId] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setShowSuggestions(false);

    const userMsg: Message = { id: msgId, role: 'user', content: content.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setMsgId((v) => v + 1);
    setInput('');
    setIsTyping(true);

    let aiContent: string;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) throw new Error('no-token');
      const res = await fetch(`${API_BASE}/ghost-mentor/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: content.trim(), courseId: 'general', lessonId: 'chat', timestamp: 0 }),
      });
      if (!res.ok) throw new Error('api-error');
      const data = await res.json() as { text?: string };
      if (data.text && data.text.trim()) {
        aiContent = data.text;
        setIsLive(true);
      } else {
        aiContent = getAIResponse(content);
      }
    } catch {
      // Fallback: simulated keyword-based responses
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
      aiContent = getAIResponse(content);
    }

    const aiMsg: Message = { id: msgId + 1, role: 'assistant', content: aiContent, ts: new Date() };
    setMessages((prev) => [...prev, aiMsg]);
    setMsgId((v) => v + 2);
    setIsTyping(false);
  }, [msgId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function formatContent(text: string) {
    // Simple markdown-like rendering
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-slate-900 mt-3 mb-1 text-sm">{line.slice(3)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-slate-800 text-sm">{line.slice(2, -2)}</p>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="text-sm text-slate-700 ml-3">{renderInline(line.slice(2))}</li>;
        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-emerald-400 pl-3 text-sm text-emerald-800 italic my-1">{line.slice(2)}</blockquote>;
        if (line.startsWith('**') || line.includes('`')) return <p key={i} className="text-sm text-slate-700">{renderInline(line)}</p>;
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm text-slate-700">{renderInline(line)}</p>;
      });
  }

  function renderInline(text: string): React.ReactNode {
    // Handle `code` and **bold**
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i} className="bg-slate-100 text-emerald-700 rounded px-1 font-mono text-[12px]">{part.slice(1, -1)}</code>;
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      return part;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="glass p-5 rounded-2xl border border-slate-200 hero">
        <div className="hero-content flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="pill w-fit">
              <span className="status-dot online" />
              Ghost-Mentor · AI Öğrenme Asistanı
            </div>
            <h1 className="text-2xl font-bold">AI Mentor</h1>
            <p className="text-sm text-slate-500">Kişiselleştirilmiş öğrenme desteği, anında hazır.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="pill pill-sm bg-emerald-50 border-emerald-200 text-emerald-700">🤖 Aktif</span>
            <span className="pill pill-sm">GPT-4o</span>
          </div>
        </div>
      </header>

      {/* Chat container */}
      <div className="glass rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: '480px' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-emerald-400 to-blue-500 text-white'
                  : 'bg-gradient-to-br from-violet-400 to-pink-500 text-white'
              }`}>
                {msg.role === 'assistant' ? '🤖' : 'S'}
              </div>
              {/* Bubble */}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'assistant'
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="space-y-0.5">{formatContent(msg.content)}</div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                <div className={`text-[10px] mt-1.5 ${msg.role === 'assistant' ? 'text-slate-400' : 'text-emerald-100'}`}>
                  {msg.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm bg-gradient-to-br from-emerald-400 to-blue-500 text-white">
                🤖
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="px-4 pb-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Hızlı başlangıç</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  onClick={() => sendMessage(s.prompt)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-slate-200 p-3 bg-white/80">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir soru sor veya konu gir… (Enter = Gönder, Shift+Enter = Yeni satır)"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none transition-colors"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
              aria-label="Gönder"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-slate-400">
              Ghost-Mentor v2.0 ·{' '}
              {isLive
                ? <span className="text-emerald-600">Canlı API bağlı ✓</span>
                : <span>Simüle mod (giriş yapılırsa canlıya geçer)</span>
              }
            </p>
            <button
              className="text-[10px] text-slate-400 hover:text-slate-600"
              onClick={() => {
                setMessages([{
                  id: 0, role: 'assistant',
                  content: 'Sohbet sıfırlandı. Yeni bir konuyla başlayalım! 🎓',
                  ts: new Date(),
                }]);
                setShowSuggestions(true);
                setMsgId(1);
              }}
            >
              🗑️ Sohbeti temizle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
