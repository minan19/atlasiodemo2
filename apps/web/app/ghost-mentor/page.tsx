'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../_i18n/use-i18n';

/* ─────────────────────────────────────────────────────────────
   Constants & Types
───────────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4100';

type MessageRole = 'user' | 'ai';

interface Source {
  label: string;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: string[];
  isLoading?: boolean;
}

const FAQ_CHIPS = [
  'Bu konuyu açıkla',
  'Örnek ver',
  'Sınav sorusu yaz',
  'Özet çıkar',
  'Ne öğrendim?',
];

/* ─────────────────────────────────────────────────────────────
   Auth helper
───────────────────────────────────────────────────────────── */

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/* ─────────────────────────────────────────────────────────────
   Demo fallback — contextual Turkish responses
───────────────────────────────────────────────────────────── */

function demoAnswer(question: string): { answer: string; sources: string[]; confidence: number } {
  const q = question.toLowerCase();

  if (q.includes('örnek') || q.includes('example')) {
    return {
      answer:
        'Tabii ki! İşte somut bir örnek:\n\n**Değişken tanımlama (Python):**\n```python\nisim = "Ahmet"\nyaş = 25\nprint(f"Merhaba, ben {isim}. {yaş} yaşındayım.")\n```\n\nBu örnekte `isim` ve `yaş` adında iki değişken oluşturduk. F-string sözdizimi ile değerleri ekrana yazdırdık. Herhangi bir konuyu daha ayrıntılı açıklamamı ister misin?',
      sources: ['Python Temelleri — Bölüm 3', 'Değişkenler ve Veri Tipleri'],
      confidence: 0.91,
    };
  }

  if (q.includes('sınav') || q.includes('soru') || q.includes('test')) {
    return {
      answer:
        'İşte hazırladığım sınav soruları:\n\n**1. Soru:** Nesne yönelimli programlamada "kalıtım" kavramını kısaca açıklayınız.\n\n**2. Soru:** Aşağıdaki kod bloğunun çıktısı nedir?\n```python\nx = [1, 2, 3]\ny = x\ny.append(4)\nprint(x)\n```\n\n**3. Soru:** REST API ile GraphQL arasındaki temel farklar nelerdir?\n\nBaşarılar! Herhangi bir soruyu açıklamamı ister misin?',
      sources: ['Kurs Sınav Havuzu', 'Geçmiş Sınav Soruları — 2025'],
      confidence: 0.87,
    };
  }

  if (q.includes('özet') || q.includes('summary') || q.includes('özetle')) {
    return {
      answer:
        '**Kurs Özeti**\n\nBu hafta öğrendiğiniz temel konular:\n\n• **Veri Yapıları** — Liste, sözlük ve küme kullanımı\n• **Fonksiyonlar** — Parametreler, return değerleri ve lambda ifadeleri\n• **Hata Yönetimi** — try/except blokları ve özel istisnalar\n• **Modüller** — import kullanımı ve standart kütüphane\n\nToplam ilerleme: **%68** tamamlandı. Bir sonraki konu: *Nesne Yönelimli Programlama*',
      sources: ['Haftalık İlerleme Raporu', 'Kurs Müfredatı'],
      confidence: 0.84,
    };
  }

  if (q.includes('ne öğrendim') || q.includes('öğrendim') || q.includes('ilerleme')) {
    return {
      answer:
        '**Öğrenme Geçmişin**\n\nTebrikler! Şimdiye kadar çok şey başardın:\n\n✅ Python Temelleri (100%)\n✅ Veri Yapıları ve Algoritmalar (78%)\n✅ Web Geliştirme Giriş (55%)\n🔄 Nesne Yönelimli Programlama (devam ediyor)\n\n**Toplam:** 42 ders tamamlandı · 28 saat çalışıldı · 3 sertifika kazanıldı\n\nSonraki hedefin: *OOP modülünü bitirmek*. Devam et, harika gidiyorsun! 🚀',
      sources: ['Öğrenme Analitiği', 'Kurs Tamamlama Veritabanı'],
      confidence: 0.89,
    };
  }

  if (
    q.includes('açıkla') ||
    q.includes('nedir') ||
    q.includes('nasıl') ||
    q.includes('explain')
  ) {
    return {
      answer:
        'Harika bir soru! İzin ver detaylıca açıklayayım:\n\nBu kavram, bilgisayar biliminin temel taşlarından biridir. Üç ana başlık altında inceleyebiliriz:\n\n**1. Tanım:** Temel prensip, verileri organize bir şekilde depolamak ve erişmektir.\n\n**2. Nasıl Çalışır:** Sistem, gelen istekleri sırayla işler ve sonuçları önbelleğe alır. Bu sayede performans önemli ölçüde artar.\n\n**3. Kullanım Alanları:**\n- Web uygulamaları\n- Mobil geliştirme\n- Veri analizi\n\nDaha spesifik bir konuyu sormak ister misin?',
      sources: ['Ders Notları — Modül 4', 'Akademik Referanslar'],
      confidence: 0.76,
    };
  }

  // Generic fallback
  return {
    answer:
      `"${question}" sorusunu aldım. İşte sana yardımcı olabilecek bilgiler:\n\nBu konu, öğrenme yolculuğunun önemli bir parçası. Birkaç temel noktayı açıklayayım:\n\n**Ana Kavramlar:**\n• Temel prensipleri kavramak her şeyden önce gelir\n• Pratik yaparak öğrenmek çok daha etkilidir\n• Sorularını sormaktan çekinme — bu asistan 7/24 burada!\n\nDaha spesifik bir soru sormak veya konu hakkında örnek istemek için FAQ butonlarını kullanabilirsin.`,
    sources: ['Genel Bilgi Tabanı'],
    confidence: 0.62,
  };
}

/* ─────────────────────────────────────────────────────────────
   Confidence pill helper
───────────────────────────────────────────────────────────── */

function ConfidencePill({ confidence, tr }: { confidence: number; tr: (s: string) => string }) {
  if (confidence > 0.8) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 9px',
          borderRadius: 'var(--r-full)',
          background: 'rgba(16,169,123,0.12)',
          color: 'var(--accent)',
          border: '1px solid rgba(16,169,123,0.25)',
          letterSpacing: '0.01em',
        }}
      >
        ✓ {tr("Yüksek Güven")}
      </span>
    );
  }
  if (confidence > 0.5) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 9px',
          borderRadius: 'var(--r-full)',
          background: 'rgba(245,158,11,0.1)',
          color: '#d97706',
          border: '1px solid rgba(245,158,11,0.25)',
          letterSpacing: '0.01em',
        }}
      >
        ~ {tr("Orta Güven")}
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 9px',
        borderRadius: 'var(--r-full)',
        background: 'rgba(239,68,68,0.1)',
        color: '#dc2626',
        border: '1px solid rgba(239,68,68,0.2)',
        letterSpacing: '0.01em',
      }}
    >
      ! {tr("Düşük Güven")}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Loading dots indicator
───────────────────────────────────────────────────────────── */

function LoadingDots() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 2px',
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'inline-block',
            animation: `ghostDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.7,
          }}
        />
      ))}
      <style>{`
        @keyframes ghostDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Message bubble component
───────────────────────────────────────────────────────────── */

function MessageBubble({ message, tr }: { message: Message; tr: (s: string) => string }) {
  const isUser = message.role === 'user';

  const timeStr = message.timestamp.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 10,
        alignItems: 'flex-end',
        animation: 'fadeSlideUp 260ms both',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--r-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
            : 'linear-gradient(135deg, rgba(16,169,123,0.18), rgba(45,125,246,0.15))',
          border: isUser
            ? '1.5px solid rgba(99,102,241,0.4)'
            : '1.5px solid rgba(16,169,123,0.3)',
          boxShadow: isUser
            ? '0 2px 8px rgba(99,102,241,0.25)'
            : '0 2px 8px rgba(16,169,123,0.18)',
          userSelect: 'none',
        }}
      >
        {isUser ? '👤' : '👻'}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: 'min(520px, 75%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            padding: message.isLoading ? '12px 16px' : '13px 16px',
            borderRadius: isUser
              ? 'var(--r-lg) var(--r-md) var(--r-sm) var(--r-lg)'
              : 'var(--r-md) var(--r-lg) var(--r-lg) var(--r-sm)',
            background: isUser
              ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
              : 'var(--glass-bg)',
            border: isUser ? 'none' : 'var(--glass-border)',
            backdropFilter: isUser ? 'none' : 'var(--glass-blur)',
            color: isUser ? '#fff' : 'var(--ink)',
            fontSize: 14,
            lineHeight: 1.65,
            boxShadow: isUser
              ? '0 4px 16px rgba(99,102,241,0.3)'
              : 'var(--shadow-md)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.isLoading ? <LoadingDots /> : message.content}
        </div>

        {/* AI message footer: confidence + sources */}
        {!isUser && !message.isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              paddingLeft: 4,
            }}
          >
            {/* Confidence */}
            {message.confidence !== undefined && (
              <ConfidencePill confidence={message.confidence} tr={tr} />
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {message.sources.map((src, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      background: 'var(--line-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--r-full)',
                      padding: '2px 8px',
                      transition: 'color var(--t-fast)',
                    }}
                  >
                    📎 {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span
          style={{
            fontSize: 10,
            color: 'var(--muted)',
            paddingInline: 4,
            opacity: 0.75,
          }}
        >
          {timeStr}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Welcome state
───────────────────────────────────────────────────────────── */

function WelcomeState({ tr }: { tr: (s: string) => string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        flex: 1,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      {/* Ghost illustration */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: 'absolute',
            inset: -20,
            borderRadius: 'var(--r-full)',
            background:
              'radial-gradient(circle, rgba(16,169,123,0.15) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 'var(--r-xl)',
            background:
              'linear-gradient(135deg, rgba(16,169,123,0.12), rgba(45,125,246,0.1))',
            border: '1.5px solid rgba(16,169,123,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            boxShadow: '0 8px 32px rgba(16,169,123,0.12)',
            backdropFilter: 'var(--glass-blur)',
            animation: 'ghostFloat 3s ease-in-out infinite',
          }}
        >
          👻
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          {tr("Merhaba! Ben Ghost Mentor")}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'var(--ink-2)',
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          {tr("Sorularını yaz, kurslarındaki konuları açıklayayım, örnek vereyim veya sınava hazırlanalım. Başlamak için aşağıya bir şeyler yaz!")}
        </p>
      </div>

      {/* Feature pills */}
      <div
        className="animate-fade-slide-up stagger-2"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}
      >
        {[
          { icon: '⚡', label: '7/24 Hazır' },
          { icon: '📎', label: 'Kaynak Gösterir' },
          { icon: '🎯', label: 'Kurs Odaklı' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 'var(--r-full)',
              background: 'var(--glass-bg)',
              border: 'var(--glass-border)',
              backdropFilter: 'var(--glass-blur)',
              color: 'var(--ink-2)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {tr(label)}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.97); }
          50% { opacity: 1; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────── */

export default function GhostMentorPage() {
  const t = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [courseId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [input]);

  /* Send message */
  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || isLoading) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date(),
      };

      const loadingMsg: Message = {
        id: `ai-loading-${Date.now()}`,
        role: 'ai',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setIsLoading(true);

      try {
        const res = await fetch(`${API_BASE}/ghost-mentor/ask`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ question, ...(courseId ? { courseId } : {}) }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: { answer: string; sources?: string[]; confidence?: number } =
          await res.json();

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: data.answer,
          timestamp: new Date(),
          confidence: data.confidence,
          sources: data.sources,
        };

        setMessages((prev) => prev.filter((m) => !m.isLoading).concat(aiMsg));
      } catch {
        // Demo fallback
        const demo = demoAnswer(question);
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: demo.answer,
          timestamp: new Date(),
          confidence: demo.confidence,
          sources: demo.sources,
        };
        setMessages((prev) => prev.filter((m) => !m.isLoading).concat(aiMsg));
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, isLoading, courseId],
  );

  /* Keyboard handler */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* FAQ chip click */
  const handleChip = (chip: string) => {
    setInput(chip);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="page-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        height: 'calc(100vh - 48px)',
        minHeight: 600,
      }}
    >
      {/* Background layers */}
      <div className="bg-canvas" />
      <div className="bg-grid" />

      {/* ── Hero ── */}
      <div
        className="animate-fade-slide-up"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '20px 0 16px',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--r-lg)',
            background:
              'linear-gradient(135deg, rgba(16,169,123,0.14), rgba(45,125,246,0.12))',
            border: '1.5px solid rgba(16,169,123,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            boxShadow: 'var(--glow)',
            flexShrink: 0,
          }}
        >
          👻
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(120deg, var(--accent), var(--accent-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Ghost Mentor
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--ink-2)',
              marginTop: 2,
            }}
          >
            {t.tr("Yapay zeka destekli kişisel öğrenme asistanın")}
          </p>
        </div>

        {/* Status pill */}
        <div style={{ marginLeft: 'auto' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 13px',
              borderRadius: 'var(--r-full)',
              background: 'rgba(16,169,123,0.1)',
              color: 'var(--accent)',
              border: '1px solid rgba(16,169,123,0.2)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'inline-block',
                boxShadow: '0 0 6px var(--accent)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            {t.tr("Çevrimiçi")}
          </span>
        </div>
      </div>

      {/* ── Chat shell ── */}
      <div
        className="content-shell animate-fade-slide-up stagger-1"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 20px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 0,
            scrollBehavior: 'smooth',
          }}
        >
          {messages.length === 0 ? (
            <WelcomeState tr={t.tr} />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} tr={t.tr} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--line)',
            flexShrink: 0,
          }}
        />

        {/* ── Bottom panel ── */}
        <div
          style={{
            padding: '12px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            flexShrink: 0,
          }}
        >
          {/* FAQ chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 7,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                fontWeight: 500,
                flexShrink: 0,
                marginRight: 2,
              }}
            >
              {t.tr("Öneri:")}
            </span>
            {FAQ_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                disabled={isLoading}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '4px 11px',
                  borderRadius: 'var(--r-full)',
                  border: '1px solid var(--line)',
                  background: 'var(--panel)',
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                  transition: 'all var(--t-fast)',
                  whiteSpace: 'nowrap',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'var(--accent)';
                  el.style.color = 'var(--accent)';
                  el.style.background = 'var(--accent-soft)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'var(--line)';
                  el.style.color = 'var(--ink-2)';
                  el.style.background = 'var(--panel)';
                }}
              >
                {t.tr(chip)}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: 'var(--r-lg)',
                border: '1.5px solid var(--line)',
                background: 'var(--panel)',
                transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onFocusCapture={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'var(--accent)';
                el.style.boxShadow = '0 0 0 3px rgba(16,169,123,0.12)';
              }}
              onBlurCapture={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'var(--line)';
                el.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.ai.placeholder}
                disabled={isLoading}
                rows={1}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: 14,
                  color: 'var(--ink)',
                  lineHeight: 1.55,
                  fontFamily: 'inherit',
                  minHeight: 44,
                  maxHeight: 140,
                  overflowY: 'auto',
                  display: 'block',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              style={{
                height: 44,
                minWidth: 72,
                borderRadius: 'var(--r-lg)',
                border: 'none',
                background:
                  isLoading || !input.trim()
                    ? 'var(--line)'
                    : 'linear-gradient(135deg, var(--accent), #0d8f68)',
                color:
                  isLoading || !input.trim() ? 'var(--muted)' : '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor:
                  isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all var(--t-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingInline: 18,
                boxShadow:
                  isLoading || !input.trim()
                    ? 'none'
                    : '0 4px 14px rgba(16,169,123,0.3)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim()) {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    'translateY(-1px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    '0 6px 20px rgba(16,169,123,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  isLoading || !input.trim()
                    ? 'none'
                    : '0 4px 14px rgba(16,169,123,0.3)';
              }}
            >
              {isLoading ? (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid var(--line-accent)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  <span style={{ fontSize: 15 }}>↑</span> {t.tr("Sor")}
                </>
              )}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                @keyframes fadeSlideUp {
                  from { opacity: 0; transform: translateY(10px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </button>
          </div>

          {/* Helper text */}
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: 'var(--muted)',
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            {t.ai.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
