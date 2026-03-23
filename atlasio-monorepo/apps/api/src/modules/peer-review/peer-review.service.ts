import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PeerReviewService {
  constructor(private prisma: PrismaService) {}

  async submitReview(submissionId: string, reviewerId: string, score: number, feedback: string) {
    // Öğrenci kendi ödevini oylayamaz
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) throw new ForbiddenException("Ödev bulunamadı");
    if (submission.userId === reviewerId) {
       throw new ForbiddenException("Kendi ödevinizi değerlendiremezsiniz.");
    }

    const review = await this.prisma.peerReview.create({
       data: {
          submissionId,
          reviewerId,
          score,
          feedback
       }
    });

    // Ortalama puan hesaplanıp ödeve yazılabilir (Gerçek dünyada queue kullanılır)
    const reviews = await this.prisma.peerReview.findMany({
       where: { submissionId }
    });
    
    if (reviews.length >= 3) {
       // 3 akran değerlendirmesi gelince ortalama notu belirle
       const avgScore = reviews.reduce((sum, rev) => sum + rev.score, 0) / reviews.length;
       await this.prisma.assignmentSubmission.update({
          where: { id: submissionId },
          data: { grade: avgScore }
       });
    }

    return review;
  }
}
