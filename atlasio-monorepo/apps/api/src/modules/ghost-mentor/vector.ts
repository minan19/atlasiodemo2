import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VectorRepository } from './vector.repository';
import { VectorChunksRepository } from './vector-chunks.repository';

// Basit pgvector kullanım noktası: Lesson.content'ten embedding üretildiği varsayılır.
// Gerçek embedding üretimi ayrı bir worker’da yapılmalı; burada sadece en yakın chunk’ı çeken örnek var.
@Injectable()
export class VectorSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: VectorRepository,
    private readonly chunksRepo: VectorChunksRepository,
  ) {}

  async similarLessonChunk(lessonId: string, queryEmbedding?: number[]) {
    // Gerçek vector search için repo'ya delege; şu an fallback lesson content
    const chunk = await this.chunksRepo.searchByLesson(lessonId, queryEmbedding, 1).then((arr) => arr[0]);
    return {
      text: chunk?.text ?? '',
      ref: chunk?.ref ?? `lesson:${lessonId}`,
    };
  }

  toEmbeddingPlaceholder(): number[] {
    // Gerçek embedding yerine sabit bir vektör (stub)
    return new Array(10).fill(0);
  }
}
