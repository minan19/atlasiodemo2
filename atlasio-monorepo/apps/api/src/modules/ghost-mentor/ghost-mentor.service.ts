import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhostAskDto, GhostPreloadFaqDto } from './dto';
import { RagEngine } from './rag';
import { TtsService } from './tts';
import { VectorSearchService } from './vector';
import { VectorRepository } from './vector.repository';
import { EmbeddingService } from './embeddings';
import { randomUUID } from 'crypto';

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
  ) {
    this.rag = new RagEngine(this.prisma, this.vector);
  }

  /**
   * Stub implementation:
   * - Gerçek dünyada burada RAG + LLM + TTS pipeline çalışacak.
   * - Exam mode'da çözüm yerine ipucu/policyFlag döner.
   */
  async ask(userId: string, dto: GhostAskDto): Promise<GhostAnswer> {
    const start = Date.now();
    const requestId = randomUUID();
    // embedding + vector search (fallback'lı)
    const embedding = await this.embedder.embed(dto.query);
    const rag = await this.rag.answer(dto.courseId, dto.lessonId, dto.timestamp, dto.query, embedding ?? undefined);
    const answer = dto.examMode ? 'Exam mode: ipucu modunda yanıt.' : rag.text;
    const tts = await this.tts.synthesize(answer, process.env.TTS_VOICE_ID);
    return {
      text: answer,
      sources: rag.sources,
      audioUrl: tts.audioUrl,
      latencyMs: Date.now() - start,
      policyFlags: dto.examMode ? ['exam_mode_hint_only'] : [],
      requestId,
    };
  }

  async preloadFaq(userId: string, dto: GhostPreloadFaqDto) {
    // FAQ cache taslağı (şimdilik no-op)
    return { ok: true, cached: dto.faqs.length };
  }
}
