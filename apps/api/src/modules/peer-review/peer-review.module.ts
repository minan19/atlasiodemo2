import { Module } from '@nestjs/common';
import { PeerReviewService } from './peer-review.service';
import { PeerReviewController } from './peer-review.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [PeerReviewService, PrismaService],
  controllers: [PeerReviewController],
})
export class PeerReviewModule {}
