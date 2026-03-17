import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RagChunk = {
  id: string;
  lessonId: string;
  text: string;
  ref: string;
};

@Injectable()
export class VectorChunksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TODO: vector tablosu oluşturulunca burası raw query ile <-> operatorü kullanacak.
   * Şimdilik lesson.content'ten tek chunk döner.
   */
  async searchByLesson(lessonId: string, _embedding?: number[], limit = 3): Promise<RagChunk[]> {
    const lesson = await this.prisma.lessonContent.findUnique({ where: { id: lessonId } });
    if (!lesson) return [];
    const text = lesson.content ?? '';
    return [
      {
        id: lesson.id,
        lessonId,
        text,
        ref: `lesson:${lessonId}`,
      },
    ].slice(0, limit);
  }

  async savePlaceholder(lessonId: string, text: string, embedding: number[]) {
    // Placeholder; ileride rag_chunks tablosuna yazılacak.
    return { lessonId, text, embeddingLength: embedding.length };
  }
}
