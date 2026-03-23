import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhostAskDto, GhostPreloadFaqDto } from './dto';
import { RagEngine } from './rag';
import { TtsService } from './tts';
import { VectorSearchService } from './vector';
import { VectorRepository } from './vector.repository';
import { EmbeddingService } from './embeddings';
import { randomUUID } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

type GhostAnswer = {
  text: string;
  sources: { snippet: string; ref: string }[];
  audioUrl?: string;
  videoUrl?: string;
  latencyMs: number;
  policyFlags?: string[];
  requestId: string;
};

@Injectable()
export class GhostMentorService {
  private readonly rag: RagEngine;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tts: TtsService,
    private readonly vector: VectorSearchService,
    private readonly vectorRepo: VectorRepository,
    private readonly embedder: EmbeddingService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.rag = new RagEngine(this.prisma, this.vector);
  }

  /**
   * Simple deterministic hash: lowercase the query, strip spaces, take first 32 chars.
   * Cheap and collision-tolerant for FAQ key granularity.
   */
  private simpleHash(query: string): string {
    return query.toLowerCase().replace(/\s+/g, '').slice(0, 32);
  }

  /**
   * Gerçek RAG + LLM + TTS pipeline simülasyonu.
   * - Exam mode'da çözüm yerine sadece ipucu (hint) döner.
   * - Vektör araması ile videonun ilgili time-stamp'inden semantik olarak en yakın metinleri bulup LLM'e besler.
   */
  async ask(userId: string, dto: GhostAskDto): Promise<GhostAnswer> {
    const start = Date.now();
    const requestId = randomUUID();

    // 0. FAQ önbelleğini kontrol et - RAG'dan önce
    const faqKey = `ghost:faq:${dto.courseId}:${this.simpleHash(dto.query)}`;
    const cached = await this.redis.get(faqKey);
    if (cached) {
      const cachedAnswer = JSON.parse(cached) as GhostAnswer;
      return {
        ...cachedAnswer,
        latencyMs: Date.now() - start,
        requestId,
      };
    }

    // 1. Embedding oluştur
    const embedding = await this.embedder.embed(dto.query);

    // 2. Vector DB (pgvector) üzerinde search yap ve context'i topla
    const rag = await this.rag.answer(dto.courseId, dto.lessonId, dto.timestamp, dto.query, embedding ?? undefined);

    // 3. LLM Prompt'u (Burada OpenAI veya Anthropic'e çağrı yapılır, simüle ediyoruz)
    let answer = "";
    if (dto.examMode) {
      answer = `Sınav modundasınız. Çözümü veremem ancak ilgili konuyu "${rag.sources.map(s => s.ref).join(', ')}" dakikalarında bulabilirsiniz.`;
    } else {
       answer = `Bu konu hakkında şu kaynaklardan yola çıkarak yanıtlıyorum: ${rag.text}`;
    }

    // 4. Metni Ses'e Çevir (TTS - Eğitmenin klonlanmış ses profili)
    let audioUrl: string | undefined = undefined;
    if (process.env.TTS_VOICE_ID && process.env.OPENAI_API_KEY) {
      const tts = await this.tts.synthesize(answer, process.env.TTS_VOICE_ID);
      audioUrl = tts.audioUrl;
    }

    return {
      text: answer,
      sources: rag.sources,
      audioUrl,
      latencyMs: Date.now() - start,
      policyFlags: dto.examMode ? ['exam_mode_hint_only'] : [],
      requestId,
    };
  }

  async preloadFaq(userId: string, dto: GhostPreloadFaqDto) {
    let cached = 0;
    let skipped = 0;
    const ttl = 60 * 60 * 24; // 24 saat

    for (const faq of dto.faqs) {
      const hash = this.simpleHash(faq.q);
      // GhostPreloadFaqDto has lessonId; use it as the scope identifier for the cache key
      const key = `ghost:faq:${dto.lessonId}:${hash}`;

      // Zaten önbellekte varsa atla
      const existing = await this.redis.get(key);
      if (existing) {
        skipped += 1;
        continue;
      }

      let answerText: string;
      if (faq.a) {
        // Cevap doğrudan verilmişse RAG çalıştırmaya gerek yok
        answerText = faq.a;
      } else {
        // RAG + embedding pipeline üzerinden cevabı üret
        const embedding = await this.embedder.embed(faq.q);
        const rag = await this.rag.answer(dto.lessonId, dto.lessonId, 0, faq.q, embedding ?? undefined);
        answerText = `Bu konu hakkında şu kaynaklardan yola çıkarak yanıtlıyorum: ${rag.text}`;
      }

      const payload: Omit<GhostAnswer, 'latencyMs' | 'requestId'> = {
        text: answerText,
        sources: [],
        policyFlags: [],
      };

      await this.redis.set(key, JSON.stringify(payload), 'EX', ttl);
      cached += 1;
    }

    return { ok: true, cached, skipped };
  }
}
