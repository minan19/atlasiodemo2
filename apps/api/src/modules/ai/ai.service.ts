import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LearningEventType, RecommendationType } from '@prisma/client';

export type ContentType = 'lesson' | 'quiz' | 'course_outline' | 'summary';
export type Language = 'tr' | 'en';
export type Difficulty = 1 | 2 | 3;

export interface GenerateContentDto {
  topic: string;
  type: ContentType;
  language?: Language;
  difficulty?: Difficulty;
}

// Magic Expand
export interface ExpandContentDto {
  text: string;
  targetLength?: 'short' | 'medium' | 'long';
  language?: Language;
}

// Magic Write (rewrite/improve)
export interface RewriteContentDto {
  text: string;
  tone?: 'formal' | 'casual' | 'academic' | 'simple';
  language?: Language;
}

// Bulk Generate
export interface BulkGenerateDto {
  topics: string[];
  type: ContentType;
  language?: Language;
  difficulty?: Difficulty;
}

// Magic Design — Presentation
export interface PresentationSlide {
  title: string;
  bullets: string[];
  speakerNote?: string;
}
export interface PresentationContent {
  title: string;
  subtitle: string;
  slides: PresentationSlide[];
}
export interface GeneratePresentationDto {
  topic: string;
  slideCount?: number;
  language?: Language;
  difficulty?: Difficulty;
}

// Mind Map
export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}
export interface MindMapContent {
  root: MindMapNode;
}
export interface GenerateMindMapDto {
  topic: string;
  depth?: number;
  language?: Language;
}

export interface LessonContent {
  title: string;
  objectives: string[];
  sections: { heading: string; content: string }[];
  keyPoints: string[];
}

export interface QuizContent {
  title: string;
  questions: { stem: string; choices: string[]; correctIndex: number; explanation: string }[];
}

export interface CourseOutlineContent {
  title: string;
  description: string;
  modules: { title: string; lessons: string[]; estimatedHours: number }[];
}

export interface SummaryContent {
  title: string;
  summary: string;
  keyTakeaways: string[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async recordLearningEvent(payload: { tenantId: string; userId?: string; eventType: LearningEventType; payload?: Record<string, any> }) {
    const event = await this.prisma.learningEvent.create({ data: payload });
    await this.audit.log({
      action: 'learningEvent.record',
      entity: 'LearningEvent',
      entityId: event.id,
      actorId: payload.userId,
      meta: { type: payload.eventType },
    });
    return event;
  }

  async proposeRecommendation(tenantId: string, userId: string, type: RecommendationType, payload: Record<string, any>, reason: string) {
    const recommendation = await this.prisma.recommendation.create({
      data: {
        tenantId,
        userId,
        type,
        payload,
        reason,
        score: 0,
        explainedBy: 'heuristic',
      },
    });
    await this.audit.log({
      action: 'recommendation.create',
      entity: 'Recommendation',
      entityId: recommendation.id,
      actorId: userId,
      meta: { reason },
    });
    return recommendation;
  }

  async getRecommendations(tenantId: string, filters: { userId?: string; courseId?: string }) {
    return this.prisma.recommendation.findMany({
      where: {
        tenantId,
        userId: filters.userId,
        payload: filters.courseId ? { path: ['courseId'], equals: filters.courseId } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logMetric(tenantId: string, name: string, resource: string, value: number, metadata?: Record<string, any>) {
    return this.prisma.aIMetric.create({
      data: {
        tenantId,
        name,
        resource,
        value,
        metadata,
      },
    });
  }

  async generateContent(
    dto: GenerateContentDto,
    actorId: string,
  ): Promise<LessonContent | QuizContent | CourseOutlineContent | SummaryContent> {
    const { topic, type, language = 'en', difficulty = 2 } = dto;
    const difficultyLabel = difficulty === 1 ? 'beginner' : difficulty === 3 ? 'advanced' : 'intermediate';

    let result: LessonContent | QuizContent | CourseOutlineContent | SummaryContent;

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      result = await this.callOpenAIForContent(topic, type, language, difficultyLabel, apiKey);
    } else {
      result = this.getMockContent(topic, type, language, difficultyLabel);
    }

    await this.audit.log({
      action: 'ai.content.generate',
      entity: 'AIContent',
      entityId: `${type}:${topic}`,
      actorId,
      meta: { type, language, difficulty },
    });

    return result;
  }

  private async callOpenAIForContent(
    topic: string,
    type: ContentType,
    language: Language,
    difficulty: string,
    apiKey: string,
  ): Promise<LessonContent | QuizContent | CourseOutlineContent | SummaryContent> {
    const langLabel = language === 'tr' ? 'Turkish' : 'English';
    const prompts: Record<ContentType, string> = {
      lesson: `Create a ${difficulty} level educational lesson about "${topic}" in ${langLabel}. Return JSON with: title (string), objectives (string[]), sections (array of {heading, content}), keyPoints (string[]).`,
      quiz: `Create a ${difficulty} level quiz about "${topic}" in ${langLabel} with 5 questions. Return JSON with: title (string), questions (array of {stem, choices: string[4], correctIndex: number, explanation}).`,
      course_outline: `Create a ${difficulty} level course outline about "${topic}" in ${langLabel}. Return JSON with: title, description, modules (array of {title, lessons: string[], estimatedHours: number}).`,
      summary: `Create a ${difficulty} level summary about "${topic}" in ${langLabel}. Return JSON with: title, summary, keyTakeaways (string[]).`,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert educational content creator. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompts[type] },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      this.logger.warn(`OpenAI API error ${response.status}, falling back to mock`);
      return this.getMockContent(topic, type, language, difficulty);
    }

    const data = await response.json() as any;
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.warn('Failed to parse OpenAI response, falling back to mock');
      return this.getMockContent(topic, type, language, difficulty);
    }
  }

  private getMockContent(
    topic: string,
    type: ContentType,
    language: Language,
    difficulty: string,
  ): LessonContent | QuizContent | CourseOutlineContent | SummaryContent {
    const isTr = language === 'tr';

    if (type === 'lesson') {
      return {
        title: isTr ? `${topic} Dersi` : `${topic} Lesson`,
        objectives: isTr
          ? [`${topic} temel kavramlarını anlayın`, `${topic} uygulamalarını keşfedin`, `${topic} konusunda problem çözün`]
          : [`Understand the fundamentals of ${topic}`, `Explore real-world applications of ${topic}`, `Solve problems related to ${topic}`],
        sections: [
          {
            heading: isTr ? 'Giriş' : 'Introduction',
            content: isTr
              ? `${topic}, modern eğitimde önemli bir rol oynamaktadır. Bu derste ${topic} konusunu ${difficulty} seviyesinde inceleyeceğiz.`
              : `${topic} plays an important role in modern education. In this lesson, we will explore ${topic} at a ${difficulty} level.`,
          },
          {
            heading: isTr ? 'Temel Kavramlar' : 'Core Concepts',
            content: isTr
              ? `${topic} konusunda temel kavramlar: tanım, kapsam ve uygulama alanları.`
              : `Core concepts of ${topic}: definition, scope, and areas of application.`,
          },
          {
            heading: isTr ? 'Uygulama' : 'Application',
            content: isTr
              ? `${topic} konusunun pratik uygulamaları incelenerek örnek problemler çözülecektir.`
              : `Practical applications of ${topic} will be examined through example problems.`,
          },
        ],
        keyPoints: isTr
          ? [`${topic} tanımı ve kapsamı`, `Temel ilkeler ve kurallar`, `Uygulama stratejileri`, `Sık yapılan hatalar ve kaçınma yolları`]
          : [`Definition and scope of ${topic}`, `Core principles and rules`, `Application strategies`, `Common pitfalls and how to avoid them`],
      } as LessonContent;
    }

    if (type === 'quiz') {
      return {
        title: isTr ? `${topic} Quizi` : `${topic} Quiz`,
        questions: [
          {
            stem: isTr ? `${topic} nedir?` : `What is ${topic}?`,
            choices: isTr
              ? [`Bir kavram`, `Bir yöntem`, `Bir araç`, `Hepsi`]
              : [`A concept`, `A method`, `A tool`, `All of the above`],
            correctIndex: 3,
            explanation: isTr ? `${topic} birçok boyutu kapsayan geniş bir kavramdır.` : `${topic} is a broad concept encompassing many dimensions.`,
          },
          {
            stem: isTr ? `${topic} hangi alanda kullanılır?` : `In which field is ${topic} commonly used?`,
            choices: isTr
              ? [`Eğitim`, `Teknoloji`, `Bilim`, `Tümünde`]
              : [`Education`, `Technology`, `Science`, `All fields`],
            correctIndex: 3,
            explanation: isTr ? `${topic} birçok farklı alanda yaygın olarak kullanılmaktadır.` : `${topic} is widely used across many different fields.`,
          },
          {
            stem: isTr ? `${topic} öğrenmenin en iyi yolu nedir?` : `What is the best way to learn ${topic}?`,
            choices: isTr
              ? [`Sadece okumak`, `Sadece izlemek`, `Pratik yapmak`, `Ezberlemek`]
              : [`Reading only`, `Watching only`, `Hands-on practice`, `Memorizing`],
            correctIndex: 2,
            explanation: isTr ? `Pratik uygulama, öğrenmeyi pekiştirmenin en etkili yoludur.` : `Hands-on practice is the most effective way to reinforce learning.`,
          },
        ],
      } as QuizContent;
    }

    if (type === 'course_outline') {
      return {
        title: isTr ? `${topic} Kursu` : `${topic} Course`,
        description: isTr
          ? `Bu kurs ${topic} konusunu ${difficulty} seviyesinde kapsamlı şekilde ele almaktadır.`
          : `This course comprehensively covers ${topic} at a ${difficulty} level.`,
        modules: [
          {
            title: isTr ? 'Temel Kavramlar' : 'Fundamentals',
            lessons: isTr
              ? [`${topic} Giriş`, `Temel Terminoloji`, `Tarihsel Gelişim`]
              : [`Introduction to ${topic}`, `Core Terminology`, `Historical Development`],
            estimatedHours: 3,
          },
          {
            title: isTr ? 'İleri Konular' : 'Advanced Topics',
            lessons: isTr
              ? [`İleri Teknikler`, `Vaka Çalışmaları`, `En İyi Uygulamalar`]
              : [`Advanced Techniques`, `Case Studies`, `Best Practices`],
            estimatedHours: 5,
          },
          {
            title: isTr ? 'Uygulama Projesi' : 'Applied Project',
            lessons: isTr
              ? [`Proje Planlaması`, `Uygulama`, `Sunum ve Değerlendirme`]
              : [`Project Planning`, `Implementation`, `Presentation & Review`],
            estimatedHours: 4,
          },
        ],
      } as CourseOutlineContent;
    }

    // summary
    return {
      title: isTr ? `${topic} Özeti` : `${topic} Summary`,
      summary: isTr
        ? `${topic}, ${difficulty} seviyesinde öğrenciler için tasarlanmış kapsamlı bir konudur. Temel ilkeler, uygulama yöntemleri ve pratik örnekler bu özette ele alınmaktadır.`
        : `${topic} is a comprehensive subject designed for ${difficulty}-level learners. Core principles, application methods, and practical examples are covered in this summary.`,
      keyTakeaways: isTr
        ? [`${topic} temel prensipleri anlaşıldı`, `Pratik uygulamalar keşfedildi`, `İleri çalışma için yol haritası oluşturuldu`]
        : [`Core principles of ${topic} understood`, `Practical applications explored`, `Roadmap for further study established`],
    } as SummaryContent;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Magic Expand — Kısa metni uzun ders içeriğine dönüştür
  // ──────────────────────────────────────────────────────────────────────────
  async expandContent(dto: ExpandContentDto, actorId?: string): Promise<{ expanded: string }> {
    const { text, targetLength = 'medium', language = 'tr' } = dto;
    const lengthMap = { short: '150', medium: '400', long: '800' };
    const apiKey = process.env.OPENAI_API_KEY;
    let expanded: string;

    if (apiKey) {
      const langLabel = language === 'tr' ? 'Türkçe' : 'English';
      const prompt = `Expand the following educational text into a detailed ${langLabel} explanation (approximately ${lengthMap[targetLength]} words). Keep an educational, clear tone:\n\n"${text}"`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1000 }),
      });
      const json = await res.json() as any;
      expanded = json.choices?.[0]?.message?.content ?? text;
    } else {
      const isTr = language === 'tr';
      expanded = isTr
        ? `${text}\n\nBu konu daha ayrıntılı incelendiğinde, temel kavramların derinlemesine anlaşılması büyük önem taşımaktadır. Öğrencilerin konuyu pratik uygulamalarla pekiştirmesi ve farklı perspektiflerden değerlendirmesi önerilir. İleri okuma kaynakları ve örnek problemler aracılığıyla konu daha da güçlendirilebilir.`
        : `${text}\n\nWhen explored in greater depth, this topic reveals layers of nuance that are essential for mastery. Students are encouraged to reinforce understanding through hands-on practice and to evaluate the subject from multiple perspectives. Further reading and worked examples can significantly strengthen comprehension.`;
    }

    if (actorId) {
      await this.audit.log({ action: 'ai.content.expand', entity: 'AIContent', entityId: 'expand', actorId, meta: { targetLength, language } });
    }
    return { expanded };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Magic Write — İçeriği yeniden yaz / tonu değiştir
  // ──────────────────────────────────────────────────────────────────────────
  async rewriteContent(dto: RewriteContentDto, actorId?: string): Promise<{ rewritten: string }> {
    const { text, tone = 'formal', language = 'tr' } = dto;
    const apiKey = process.env.OPENAI_API_KEY;
    let rewritten: string;

    if (apiKey) {
      const langLabel = language === 'tr' ? 'Türkçe' : 'English';
      const prompt = `Rewrite the following educational text in a ${tone} tone in ${langLabel}. Preserve the original meaning:\n\n"${text}"`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
      });
      const json = await res.json() as any;
      rewritten = json.choices?.[0]?.message?.content ?? text;
    } else {
      const toneMap: Record<string, string> = {
        formal: language === 'tr' ? 'Resmi bir dille ifade edilecek olursa: ' : 'To state this formally: ',
        casual: language === 'tr' ? 'Daha sade bir anlatımla: ' : 'In simpler terms: ',
        academic: language === 'tr' ? 'Akademik perspektiften değerlendirildiğinde: ' : 'From an academic perspective: ',
        simple: language === 'tr' ? 'Basitçe özetlemek gerekirse: ' : 'Simply put: ',
      };
      rewritten = (toneMap[tone] ?? '') + text;
    }

    if (actorId) {
      await this.audit.log({ action: 'ai.content.rewrite', entity: 'AIContent', entityId: 'rewrite', actorId, meta: { tone, language } });
    }
    return { rewritten };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Bulk Generate — Toplu içerik üretimi
  // ──────────────────────────────────────────────────────────────────────────
  async bulkGenerate(dto: BulkGenerateDto, actorId?: string): Promise<{ results: Array<{ topic: string; content: any }> }> {
    const { topics, type, language = 'tr', difficulty = 2 } = dto;
    const results = await Promise.all(
      topics.slice(0, 10).map(async (topic) => {
        const content = await this.generateContent({ topic, type, language, difficulty }, actorId ?? '');
        return { topic, content };
      }),
    );
    if (actorId) {
      await this.audit.log({ action: 'ai.content.bulk', entity: 'AIContent', entityId: 'bulk', actorId, meta: { count: topics.length, type, language } });
    }
    return { results };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Magic Design — Sunum (Presentation) üret
  // ──────────────────────────────────────────────────────────────────────────
  async generatePresentation(dto: GeneratePresentationDto, actorId?: string): Promise<PresentationContent> {
    const { topic, slideCount = 8, language = 'tr', difficulty = 2 } = dto;
    const apiKey = process.env.OPENAI_API_KEY;
    const difficultyLabel = difficulty === 1 ? 'beginner' : difficulty === 3 ? 'advanced' : 'intermediate';
    const langLabel = language === 'tr' ? 'Turkish' : 'English';

    if (apiKey) {
      const prompt = `Create a professional ${difficultyLabel} presentation about "${topic}" in ${langLabel} with ${slideCount} slides. Return JSON: { title, subtitle, slides: [{ title, bullets: string[], speakerNote }] }`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, response_format: { type: 'json_object' } }),
      });
      const json = await res.json() as any;
      try {
        const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
        if (actorId) await this.audit.log({ action: 'ai.presentation.generate', entity: 'AIContent', entityId: topic, actorId, meta: { slideCount, language } });
        return parsed as PresentationContent;
      } catch { /* fall through to mock */ }
    }

    const isTr = language === 'tr';
    const mockSlides: PresentationSlide[] = [
      { title: isTr ? 'Giriş' : 'Introduction', bullets: [isTr ? `${topic} nedir?` : `What is ${topic}?`, isTr ? 'Önem ve kapsam' : 'Importance & scope'], speakerNote: isTr ? 'Katılımcılara konuyu tanıtın.' : 'Introduce the topic to attendees.' },
      { title: isTr ? 'Temel Kavramlar' : 'Core Concepts', bullets: [isTr ? 'Tanım ve terminoloji' : 'Definition & terminology', isTr ? 'Temel ilkeler' : 'Core principles', isTr ? 'Tarihsel bağlam' : 'Historical context'], speakerNote: '' },
      { title: isTr ? 'Nasıl Çalışır?' : 'How It Works', bullets: [isTr ? 'Adım adım süreç' : 'Step-by-step process', isTr ? 'Temel mekanizmalar' : 'Key mechanisms'], speakerNote: '' },
      { title: isTr ? 'Uygulama Alanları' : 'Applications', bullets: [isTr ? 'Gerçek dünya örnekleri' : 'Real-world examples', isTr ? 'Sektör kullanımları' : 'Industry use-cases'], speakerNote: '' },
      { title: isTr ? 'Avantajlar ve Zorluklar' : 'Benefits & Challenges', bullets: [isTr ? 'Öne çıkan faydalar' : 'Key benefits', isTr ? 'Yaygın zorluklar' : 'Common challenges'], speakerNote: '' },
      { title: isTr ? 'En İyi Uygulamalar' : 'Best Practices', bullets: [isTr ? 'Uzman önerileri' : 'Expert recommendations', isTr ? 'Yaygın hatalar' : 'Common pitfalls to avoid'], speakerNote: '' },
      { title: isTr ? 'Örnek Vaka' : 'Case Study', bullets: [isTr ? 'Gerçek senaryo' : 'Real-world scenario', isTr ? 'Öğrenilen dersler' : 'Lessons learned'], speakerNote: '' },
      { title: isTr ? 'Özet ve Sonraki Adımlar' : 'Summary & Next Steps', bullets: [isTr ? 'Temel çıkarımlar' : 'Key takeaways', isTr ? 'Önerilen kaynaklar' : 'Recommended resources', isTr ? 'Soru & Cevap' : 'Q&A'], speakerNote: isTr ? 'Soruları cevaplayın.' : 'Open the floor for questions.' },
    ];

    if (actorId) await this.audit.log({ action: 'ai.presentation.generate', entity: 'AIContent', entityId: topic, actorId, meta: { slideCount, language, mock: true } });
    return {
      title: isTr ? `${topic} Sunumu` : `${topic} Presentation`,
      subtitle: isTr ? `${difficultyLabel} seviye — Atlasio AI` : `${difficultyLabel} level — Atlasio AI`,
      slides: mockSlides.slice(0, slideCount),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mind Map — Zihin haritası üret
  // ──────────────────────────────────────────────────────────────────────────
  async generateMindMap(dto: GenerateMindMapDto, actorId?: string): Promise<MindMapContent> {
    const { topic, depth = 2, language = 'tr' } = dto;
    const apiKey = process.env.OPENAI_API_KEY;
    const langLabel = language === 'tr' ? 'Turkish' : 'English';

    if (apiKey) {
      const prompt = `Create a mind map for "${topic}" in ${langLabel} with depth ${depth}. Return JSON: { root: { id, label, children: [{ id, label, children: [...] }] } }. Use short, clear labels.`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1200, response_format: { type: 'json_object' } }),
      });
      const json = await res.json() as any;
      try {
        const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
        if (actorId) await this.audit.log({ action: 'ai.mindmap.generate', entity: 'AIContent', entityId: topic, actorId, meta: { depth, language } });
        return parsed as MindMapContent;
      } catch { /* fall through to mock */ }
    }

    const isTr = language === 'tr';
    const branches = isTr
      ? ['Tanım', 'Tarihçe', 'Temel İlkeler', 'Uygulama', 'Örnekler', 'Kaynaklar']
      : ['Definition', 'History', 'Core Principles', 'Applications', 'Examples', 'Resources'];

    const mockRoot: MindMapNode = {
      id: 'root',
      label: topic,
      children: branches.map((b, i) => ({
        id: `b${i}`,
        label: b,
        children: depth >= 2
          ? [
              { id: `b${i}-1`, label: isTr ? `${b} detayı 1` : `${b} detail 1`, children: [] },
              { id: `b${i}-2`, label: isTr ? `${b} detayı 2` : `${b} detail 2`, children: [] },
            ]
          : [],
      })),
    };

    if (actorId) await this.audit.log({ action: 'ai.mindmap.generate', entity: 'AIContent', entityId: topic, actorId, meta: { depth, language, mock: true } });
    return { root: mockRoot };
  }
}
