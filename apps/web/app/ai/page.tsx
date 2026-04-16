'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '../_i18n/use-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
};

type Suggestion = { icon: string; label: string; prompt: string };

const SUGGESTIONS: Suggestion[] = [
  { icon: 'book', label: 'Konu Özeti', prompt: 'Türev konusunu kısaca özetle ve önemli formülleri listele.' },
  { icon: 'help-circle', label: 'Soru Üret', prompt: 'Integral konusunda 3 adet orta zorlukta çalışma sorusu oluştur.' },
  { icon: 'map', label: 'Öğrenim Yolu', prompt: 'Python öğrenmek istiyorum, adım adım bir öğrenim yolu oluştur.' },
  { icon: 'search', label: 'Kavramı Açıkla', prompt: 'Osmoz nedir? Günlük hayattan örneklerle açıkla.' },
  { icon: 'file-text', label: 'Sınava Hazırlan', prompt: 'Kimya sınavına en verimli nasıl hazırlanırım?' },
  { icon: 'lightbulb', label: 'Fikir Ver', prompt: 'Bitki hücresini anlatan yaratıcı bir sınıf aktivitesi öner.' },
];

// Simulated AI responses based on keywords
function getAIResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('türev') || msg.includes('derivative')) {
    return `## Türev — Hızlı Özet

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
    return `## İntegral Soruları

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
    return `## Python Öğrenim Yolu

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
    return `## Osmoz Nedir?

**Tanım:** Yarı geçirgen bir zar boyunca, daha az konsantrasyonlu ortamdan daha fazla konsantrasyonlu ortama su moleküllerinin pasif difüzyonudur.

**Günlük Hayattan Örnekler:**
1. **Salamura salatalık:** Tuz çekerken sertleşir — osmoz ile su çekilir
2. **Bitki kökleri:** Yeraltı suyu alımı osmoz ile gerçekleşir
3. **Kuru meyve ıslatma:** Su çekerek şişer

**Turgor basıncı:** Bitki hücrelerinin sertliği bu basınçtan gelir.

Bitki ve hayvan hücresinin farklılıklarını da açıklayayım mı?`;
  }

  if (msg.includes('sınav') || msg.includes('hazırlan')) {
    return `## Verimli Sınav Hazırlığı

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
    `Bu konuyu birlikte inceleyelim! Sana özel bir öğrenme planı oluşturmam için şunu sormam gerek: Bu konuyu daha önce gördün mü, yoksa sıfırdan başlıyoruz mu?`,
    `Anladım! Şunu söyleyeyim: "${userMessage}" — bu konu gerçekten ilginç. Sana hem teorik temel hem pratik sorular hazırlayabilirim. Hangisinden başlayalım?`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// --- Icon component ---
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', flexShrink: 0 },
  };

  switch (name) {
    case 'book':
      return (
        <svg {...props}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'help-circle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'map':
      return (
        <svg {...props}>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'lightbulb':
      return (
        <svg {...props}>
          <line x1="9" y1="18" x2="15" y2="18" />
          <line x1="10" y1="22" x2="14" y2="22" />
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
      );
    case 'bot':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'send':
      return (
        <svg {...props}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case 'trash-2':
      return (
        <svg {...props}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...props}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'upload-cloud':
      return (
        <svg {...props}>
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      );
    case 'video':
      return (
        <svg {...props}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...props}>
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...props}>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      );
    case 'message-square':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'cpu':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export default function AiPage() {
  const t = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: `Merhaba! Ben **Ghost-Mentor**, ATLASIO'nun AI öğrenme asistanıyım.

Sana şunlarda yardımcı olabilirim:
- Konu özetleri ve açıklamalar
- Alıştırma soruları oluşturma
- Kişiselleştirilmiş öğrenim yolları
- Kavramları örneklerle açıklama
- Sınava hazırlık stratejileri

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

  // ── Content Processor state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'chat' | 'processor'>('chat');
  const [cpSource, setCpSource] = useState<'pdf' | 'video'>('pdf');
  const [cpFile, setCpFile] = useState<File | null>(null);
  const [cpUrl, setCpUrl] = useState('');
  const [cpType, setCpType] = useState<'multiple' | 'truefalse' | 'open'>('multiple');
  const [cpCount, setCpCount] = useState(5);
  const [cpDifficulty, setCpDifficulty] = useState<'kolay' | 'orta' | 'zor'>('orta');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpQuestions, setCpQuestions] = useState<{ q: string; opts?: string[]; answer?: string | number }[]>([]);
  const cpFileRef = useRef<HTMLInputElement>(null);

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

  async function generateQuestions() {
    if (cpSource === 'pdf' && !cpFile) return;
    if (cpSource === 'video' && !cpUrl.trim()) return;
    setCpLoading(true);
    setCpQuestions([]);
    await new Promise((r) => setTimeout(r, 1800 + Math.random() * 1000));
    const topic = cpSource === 'pdf' ? (cpFile?.name.replace(/\.[^.]+$/, '') ?? 'Konu') : 'Video İçeriği';
    const generated: { q: string; opts?: string[]; answer?: string | number }[] = [];
    for (let i = 0; i < cpCount; i++) {
      if (cpType === 'multiple') {
        generated.push({
          q: `${topic} ile ilgili ${cpDifficulty} zorluk seviyesinde soru ${i + 1}: Bu konuda hangi kavram doğrudur?`,
          opts: ['A) Birinci seçenek', 'B) İkinci seçenek', 'C) Üçüncü seçenek', 'D) Dördüncü seçenek'],
          answer: 1,
        });
      } else if (cpType === 'truefalse') {
        generated.push({
          q: `${topic} ile ilgili ifade ${i + 1}: Bu konudaki temel prensip doğru şekilde açıklanmıştır.`,
          opts: ['Doğru', 'Yanlış'],
          answer: i % 2 === 0 ? 0 : 1,
        });
      } else {
        generated.push({
          q: `${topic} hakkında ${cpDifficulty} düzey açık uçlu soru ${i + 1}: Bu kavramı kendi cümlelerinizle açıklayınız.`,
        });
      }
    }
    setCpQuestions(generated);
    setCpLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function formatContent(text: string) {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('## '))
          return (
            <h3
              key={i}
              style={{
                fontWeight: 700,
                color: 'var(--ink)',
                marginTop: 12,
                marginBottom: 4,
                fontSize: 13,
                letterSpacing: '-0.01em',
              }}
            >
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith('**') && line.endsWith('**'))
          return (
            <p key={i} style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>
              {line.slice(2, -2)}
            </p>
          );
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li
              key={i}
              style={{
                fontSize: 13,
                color: 'var(--ink-2)',
                marginLeft: 14,
                listStyleType: 'disc',
              }}
            >
              {renderInline(line.slice(2))}
            </li>
          );
        if (line.startsWith('> '))
          return (
            <blockquote
              key={i}
              style={{
                borderLeft: '2px solid var(--accent)',
                paddingLeft: 10,
                fontSize: 13,
                color: 'var(--accent)',
                fontStyle: 'italic',
                margin: '4px 0',
                opacity: 0.85,
              }}
            >
              {line.slice(2)}
            </blockquote>
          );
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />;
        return (
          <p key={i} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            {renderInline(line)}
          </p>
        );
      });
  }

  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`'))
        return (
          <code
            key={i}
            style={{
              background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
              color: 'var(--accent)',
              borderRadius: 'var(--r-sm)',
              padding: '1px 5px',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      if (part.startsWith('**') && part.endsWith('**'))
        return (
          <strong key={i} style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {part.slice(2, -2)}
          </strong>
        );
      return part;
    });
  }

  return (
    <>
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .ai-dot-1 { animation: bounce-dot 1.2s infinite; animation-delay: 0ms; }
        .ai-dot-2 { animation: bounce-dot 1.2s infinite; animation-delay: 150ms; }
        .ai-dot-3 { animation: bounce-dot 1.2s infinite; animation-delay: 300ms; }

        .ai-suggestion-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: var(--r-lg);
          border: 1.5px solid var(--line);
          background: var(--panel);
          padding: 6px 12px;
          font-size: 12px;
          color: var(--ink-2);
          cursor: pointer;
          transition: border-color var(--t-fast), background var(--t-fast), color var(--t-fast), box-shadow var(--t-fast);
          white-space: nowrap;
        }
        .ai-suggestion-btn:hover {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 6%, var(--panel));
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }

        .ai-send-btn {
          transition: background var(--t-fast), box-shadow var(--t-fast), opacity var(--t-fast);
        }
        .ai-send-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          box-shadow: var(--glow-blue);
        }

        .ai-clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          font-size: 11px;
          color: var(--muted);
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--r-sm);
          transition: color var(--t-fast), background var(--t-fast);
        }
        .ai-clear-btn:hover {
          color: var(--ink-2);
          background: color-mix(in srgb, var(--line) 40%, transparent);
        }

        .ai-textarea {
          flex: 1;
          resize: none;
          border-radius: var(--r-lg);
          border: 1.5px solid var(--line);
          background: var(--bg);
          padding: 10px 14px;
          font-size: 13px;
          color: var(--ink);
          outline: none;
          font-family: inherit;
          line-height: 1.5;
          transition: border-color var(--t-fast), box-shadow var(--t-fast);
        }
        .ai-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .ai-textarea::placeholder {
          color: var(--muted);
        }

        .ai-msg-bubble-assistant {
          background: var(--panel);
          border: 1.5px solid var(--line);
          box-shadow: var(--shadow-sm);
          border-radius: var(--r-xl);
          padding: 12px 16px;
          max-width: 75%;
        }
        .ai-msg-bubble-user {
          background: var(--accent);
          border: none;
          border-radius: var(--r-xl);
          padding: 10px 14px;
          max-width: 75%;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <header
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Status pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 99,
                  border: '1.5px solid var(--line)',
                  background: 'color-mix(in srgb, var(--accent) 8%, var(--panel))',
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent)',
                  width: 'fit-content',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 6px var(--accent)',
                    display: 'inline-block',
                  }}
                />
                Ghost-Mentor · {t.nav.aiMentor}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{t.ai.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {t.ai.subtitle}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Active badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: 'color-mix(in srgb, var(--accent) 10%, var(--panel))',
                  border: '1.5px solid var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                <Icon name="bot" size={11} />
                {t.ai.online}
              </span>
              {/* Model badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: 'color-mix(in srgb, var(--ink) 6%, var(--panel))',
                  border: '1.5px solid var(--line)',
                  color: 'var(--ink-2)',
                }}
              >
                GPT-4o
              </span>
            </div>
          </div>
        </header>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', gap: 4, borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 4, boxShadow: 'var(--shadow-sm)' }}>
          {([
            { id: 'chat', label: t.ai.tabs.chat, icon: 'message-square' },
            { id: 'processor', label: t.ai.tabs.content, icon: 'cpu' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
                boxShadow: activeTab === tab.id ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 30%, transparent)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon name={tab.icon} size={15} />
              {t.tr(tab.label)}
            </button>
          ))}
        </div>

        {/* ── Chat tab ── */}
        {activeTab === 'chat' && <div
          style={{
            borderRadius: 'var(--r-xl)',
            background: 'var(--panel)',
            border: '1.5px solid var(--line)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 310px)',
            minHeight: 480,
          }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    background:
                      msg.role === 'assistant'
                        ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)'
                        : 'linear-gradient(135deg, var(--accent-3) 0%, var(--accent-2) 100%)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {msg.role === 'assistant' ? (
                    <Icon name="bot" size={16} />
                  ) : (
                    <Icon name="user" size={16} />
                  )}
                </div>

                {/* Bubble */}
                {msg.role === 'assistant' ? (
                  <div className="ai-msg-bubble-assistant">
                    <div>{formatContent(msg.content)}</div>
                    <div style={{ fontSize: 10, marginTop: 6, color: 'var(--muted)' }}>
                      {msg.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ) : (
                  <div className="ai-msg-bubble-user">
                    <p style={{ fontSize: 13, color: '#fff', margin: 0 }}>{t.tr(msg.content)}</p>
                    <div style={{ fontSize: 10, marginTop: 6, color: 'rgba(255,255,255,0.65)' }}>
                      {msg.ts.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <Icon name="bot" size={16} />
                </div>
                <div
                  style={{
                    background: 'var(--panel)',
                    border: '1.5px solid var(--line)',
                    boxShadow: 'var(--shadow-sm)',
                    borderRadius: 'var(--r-xl)',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
                    <span
                      className="ai-dot-1"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block' }}
                    />
                    <span
                      className="ai-dot-2"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block' }}
                    />
                    <span
                      className="ai-dot-3"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', display: 'inline-block' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div style={{ padding: '0 16px 10px' }}>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {t.tr("Hızlı başlangıç")}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={t.tr(s.label)}
                    className="ai-suggestion-btn"
                    onClick={() => sendMessage(s.prompt)}
                  >
                    <Icon name={s.icon} size={13} />
                    <span>{t.tr(s.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div
            style={{
              borderTop: '1.5px solid var(--line)',
              padding: 12,
              background: 'color-mix(in srgb, var(--bg) 60%, var(--panel))',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.ai.placeholder}
                rows={2}
                className="ai-textarea"
              />
              <button
                className="ai-send-btn"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                aria-label={t.tr("Gönder")}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  opacity: !input.trim() || isTyping ? 0.4 : 1,
                }}
              >
                <Icon name="send" size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                padding: '0 2px',
              }}
            >
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                Ghost-Mentor v2.0 ·{' '}
                {isLive ? (
                  <span
                    style={{
                      color: 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="check-circle" size={11} />
                    {t.tr("Canlı API bağlı")}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>{t.tr("Simüle mod (giriş yapılırsa canlıya geçer)")}</span>
                )}
              </p>
              <button
                className="ai-clear-btn"
                onClick={() => {
                  setMessages([{
                    id: 0,
                    role: 'assistant',
                    content: 'Sohbet sıfırlandı. Yeni bir konuyla başlayalım!',
                    ts: new Date(),
                  }]);
                  setShowSuggestions(true);
                  setMsgId(1);
                }}
              >
                <Icon name="trash-2" size={12} />
                {t.ai.clearChat}
              </button>
            </div>
          </div>
        </div>}

        {/* ── Content Processor tab ── */}
        {activeTab === 'processor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Source selector */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t.tr("İçerik Kaynağı")}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([{ id: 'pdf', label: 'PDF / Belge', icon: 'file-text' }, { id: 'video', label: 'Video URL', icon: 'video' }] as const).map((s) => (
                  <button key={s.id} onClick={() => setCpSource(s.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: cpSource === s.id ? 700 : 500,
                    background: cpSource === s.id ? 'color-mix(in srgb, var(--accent) 12%, var(--panel))' : 'color-mix(in srgb, var(--bg) 50%, var(--panel))',
                    color: cpSource === s.id ? 'var(--accent)' : 'var(--ink-2)',
                    boxShadow: cpSource === s.id ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 35%, transparent)' : 'inset 0 0 0 1.5px var(--line)',
                    transition: 'all 0.15s',
                  }}>
                    <Icon name={s.icon} size={15} />
                    {t.tr(s.label)}
                  </button>
                ))}
              </div>

              {cpSource === 'pdf' ? (
                <div
                  onClick={() => cpFileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--line)', borderRadius: 'var(--r-lg)', padding: '28px 20px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer',
                    background: cpFile ? 'color-mix(in srgb, var(--accent) 5%, var(--panel))' : 'color-mix(in srgb, var(--bg) 50%, var(--panel))',
                    transition: 'all 0.15s',
                  }}
                >
                  <input ref={cpFileRef} type="file" accept=".pdf,.docx,.pptx,.txt" style={{ display: 'none' }} onChange={(e) => setCpFile(e.target.files?.[0] ?? null)} />
                  <Icon name="upload-cloud" size={28} />
                  {cpFile ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{t.tr(cpFile.name)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{(cpFile.size / 1024).toFixed(0)} KB · Dosya yüklendi</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{t.tr("PDF, DOCX, PPTX veya TXT yükle")}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.tr("Tıkla veya sürükle bırak · Maks 20 MB")}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>YouTube veya Video URL</label>
                  <input
                    type="url"
                    value={cpUrl}
                    onChange={(e) => setCpUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{
                      borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)', background: 'var(--bg)',
                      padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none',
                      fontFamily: 'inherit', transition: 'border-color 0.15s',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Generation settings */}
            <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{t.tr("Soru Ayarları")}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Question type */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{t.tr("Soru Türü")}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {([
                      { id: 'multiple', label: 'Çoktan Seçmeli' },
                      { id: 'truefalse', label: 'Doğru / Yanlış' },
                      { id: 'open', label: 'Açık Uçlu' },
                    ] as const).map((qtype) => (
                      <label key={qtype.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: cpType === qtype.id ? 'var(--accent)' : 'var(--ink-2)', fontWeight: cpType === qtype.id ? 600 : 400 }}>
                        <input type="radio" name="cpType" checked={cpType === qtype.id} onChange={() => setCpType(qtype.id)} style={{ accentColor: 'var(--accent)' }} />
                        {t.tr(qtype.label)}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Count */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{t.tr("Soru Sayısı")}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[5, 10, 15, 20].map((n) => (
                      <button key={n} onClick={() => setCpCount(n)} style={{
                        padding: '5px 12px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: cpCount === n ? 700 : 500,
                        background: cpCount === n ? 'color-mix(in srgb, var(--accent) 15%, var(--panel))' : 'var(--bg)',
                        color: cpCount === n ? 'var(--accent)' : 'var(--ink-2)',
                        boxShadow: `inset 0 0 0 1.5px ${cpCount === n ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--line)'}`,
                        transition: 'all 0.12s',
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
                {/* Difficulty */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Zorluk</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {([
                      { id: 'kolay', label: 'Kolay', color: '#22c55e' },
                      { id: 'orta', label: 'Orta', color: 'var(--accent)' },
                      { id: 'zor', label: 'Zor', color: '#f87171' },
                    ] as const).map((d) => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: cpDifficulty === d.id ? d.color : 'var(--ink-2)', fontWeight: cpDifficulty === d.id ? 600 : 400 }}>
                        <input type="radio" name="cpDiff" checked={cpDifficulty === d.id} onChange={() => setCpDifficulty(d.id)} style={{ accentColor: d.color }} />
                        {t.tr(d.label)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={generateQuestions}
                disabled={cpLoading || (cpSource === 'pdf' && !cpFile) || (cpSource === 'video' && !cpUrl.trim())}
                style={{
                  marginTop: 18, width: '100%', padding: '12px 20px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: (cpLoading || (cpSource === 'pdf' && !cpFile) || (cpSource === 'video' && !cpUrl.trim())) ? 0.5 : 1,
                  transition: 'opacity 0.15s, filter 0.15s',
                  boxShadow: 'var(--glow-blue)',
                }}
              >
                {cpLoading ? (
                  <>
                    <span className="ai-dot-1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    <span className="ai-dot-2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    <span className="ai-dot-3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    <span>{t.tr("İçerik işleniyor…")}</span>
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={16} />
                    {cpCount} Soru Üret
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {cpQuestions.length > 0 && (
              <div style={{ borderRadius: 'var(--r-xl)', background: 'var(--panel)', border: '1.5px solid var(--line)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{t.tr("Üretilen Sorular")}</p>
                    <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, margin: '3px 0 0' }}>{cpQuestions.length} soru hazır</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const text = cpQuestions.map((q, i) => {
                          let s = `${i + 1}. ${q.q}`;
                          if (q.opts) s += '\n' + q.opts.join('\n');
                          return s;
                        }).join('\n\n');
                        navigator.clipboard.writeText(text).catch(() => {});
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon name="copy" size={13} />
                      Kopyala
                    </button>
                    <button
                      onClick={() => {
                        const text = cpQuestions.map((q, i) => {
                          let s = `${i + 1}. ${q.q}`;
                          if (q.opts) s += '\n' + q.opts.join('\n');
                          return s;
                        }).join('\n\n');
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'sorular.txt'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--r-md)', border: 'none', background: 'color-mix(in srgb, var(--accent) 12%, var(--panel))', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 30%, transparent)' }}
                    >
                      <Icon name="download" size={13} />
                      {t.tr("İndir")}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cpQuestions.map((q, i) => (
                    <div key={i} style={{ borderRadius: 'var(--r-lg)', border: '1.5px solid var(--line)', background: 'color-mix(in srgb, var(--bg) 50%, var(--panel))', padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: q.opts ? 10 : 0 }}>
                        <span style={{ color: 'var(--accent)', marginRight: 6, fontWeight: 800 }}>{i + 1}.</span>
                        {q.q}
                      </div>
                      {q.opts && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                          {q.opts.map((opt, j) => (
                            <div key={j} style={{
                              fontSize: 12, padding: '5px 10px', borderRadius: 'var(--r-md)',
                              background: j === q.answer ? 'color-mix(in srgb, #22c55e 10%, var(--panel))' : 'transparent',
                              color: j === q.answer ? '#22c55e' : 'var(--ink-2)',
                              fontWeight: j === q.answer ? 600 : 400,
                              border: `1px solid ${j === q.answer ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
                            }}>
                              {opt}
                              {j === q.answer && <span style={{ marginLeft: 6, fontSize: 10 }}>{t.tr("✓ Doğru")}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
