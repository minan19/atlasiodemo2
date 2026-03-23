import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * VectorRepository: pgvector entegrasyonu için placeholder.
 * Gerçek ortamda: Prisma raw query ile <-> operatorü veya Milvus/Pinecone SDK kullanılır.
 */
@Injectable()
export class VectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchLessonChunk(lessonId: string) {
    // TODO: gerçek vector search. Şimdilik lesson.content döner.
    const lesson = await this.prisma.lessonContent.findUnique({ where: { id: lessonId } });
    return {
      text: lesson?.content ?? '',
      ref: `lesson:${lessonId}`,
    };
  }

  async saveEmbedding(lessonId: string, embedding: number[], meta?: Prisma.JsonValue) {
    // Placeholder: embedding kaydetme alanı yok; ileride rag_chunks tablosu eklenirse kullanılır.
    return { lessonId, embedding, meta };
  }
}
