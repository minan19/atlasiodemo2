// Stub RAG + TTS pipeline. Replace with real implementations (pgvector/Milvus + LLM + TTS provider).
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { VectorSearchService } from './vector';

export type RagResult = {
  text: string;
  sources: { snippet: string; ref: string }[];
};

export class RagEngine {
  private readonly openai?: OpenAI;

  constructor(private readonly prisma: PrismaService, private readonly vectorSearch: VectorSearchService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  private async fallback(query: string, lessonId: string, timestamp: number): Promise<RagResult> {
    const snippet = `Konu özeti (${lessonId} @ ${timestamp}s)`;
    return {
      text: `Bu bir placeholder yanıt: ${query}`,
      sources: [{ snippet, ref: `lesson:${lessonId}@${timestamp}` }],
    };
  }

  async answer(courseId: string, lessonId: string, timestamp: number, query: string, queryEmbedding?: number[]): Promise<RagResult> {
    // Basit: vector search (chunk) -> context; yoksa lesson.content
    const chunk = await this.vectorSearch.similarLessonChunk(lessonId, queryEmbedding);
    const context = chunk.text;

    if (!this.openai) {
      return this.fallback(query, lessonId, timestamp);
    }

    const prompt = `Sen bir eğitmensin. Aşağıdaki bağlamı ve soruyu kullanarak kısa, kaynaklı cevap ver.
Bağlam:
${context}

Soru: ${query}`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content ?? query;
    const sources = [{ snippet: 'Context', ref: `lesson:${lessonId}@${timestamp}` }];
    return { text, sources };
  }
}
