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
   * Gerçek RAG + LLM + TTS pipeline simülasyonu.
   * - Exam mode'da çözüm yerine sadece ipucu (hint) döner.
   * - Vektör araması ile videonun ilgili time-stamp'inden semantik olarak en yakın metinleri bulup LLM'e besler.
   */
  async ask(userId: string, dto: GhostAskDto): Promise<GhostAnswer> {
    const start = Date.now();
    const requestId = randomUUID();
    
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
    // FAQ cache taslağı (şimdilik no-op)
    return { ok: true, cached: dto.faqs.length };
  }
}
