import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LanguageLabService {
  constructor(private prisma: PrismaService) {}

  async analyzeSpeech(userId: string, tenantId: string, audioBase64: string, expectedText: string) {
    // Burada Whisper.cpp veya Google Speech API ile analiz yapılacak (Simüle ediyoruz)
    const score = Math.random() * 100;
    const feedback = {
       pronunciation: score > 80 ? 'Mükemmel' : 'Geliştirilmeli',
       grammar: 'Doğru kullanım'
    };

    await this.prisma.languageLabAttempt.create({
      data: {
        userId,
        tenantId,
        type: 'SPEAKING',
        score,
        transcription: 'Simulated transcription of user voice...',
        aiFeedback: feedback
      }
    });

    return { score, feedback };
  }

  async fetchSpeakingHistory(userId: string, tenantId: string) {
    return this.prisma.languageLabAttempt.findMany({
      where: { userId, tenantId, type: 'SPEAKING' },
      orderBy: { createdAt: 'desc' }
    });
  }
}
