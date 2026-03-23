import { Module } from '@nestjs/common';
import { GhostMentorService } from './ghost-mentor.service';
import { GhostMentorController } from './ghost-mentor.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TtsService } from './tts';
import { VectorSearchService } from './vector';
import { VectorRepository } from './vector.repository';
import { VectorChunksRepository } from './vector-chunks.repository';
import { EmbeddingService } from './embeddings';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    PrismaModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),
  ],
  controllers: [GhostMentorController],
  providers: [GhostMentorService, TtsService, VectorSearchService, VectorRepository, VectorChunksRepository, EmbeddingService],
})
export class GhostMentorModule {}
