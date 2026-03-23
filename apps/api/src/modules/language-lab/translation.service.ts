import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TranslationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Whisper veya Google Speech kullanılarak LiveSession (Canlı Ders) içerisindeki
   * İngilizce (veya X) seslerin anlık olarak metne ve Türkçe (veya Y) dile çevrilmesi (Simülasyon).
   *
   * Gelecekte gerçek bir LiveKit DataChannel veya Socket stream buraya bağlanabilir.
   */
  async processLiveTranscription(sessionId: string, userId: string, originalText: string, targetLanguage: string) {
     // Simülasyon: GPT / Google Translate çağrısı
     const translatedText = `[Translated to ${targetLanguage}]: ${originalText}`;

     // Bu veri WebSocket / Redis PubSub ile diğer öğrencilere (örneğin altyazı) aktarılır.
     // Şimdilik CommunicationMessage tablosunda "TRANSCRIPTION" türünde tutulabilir.
     const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId }});
     if (!session) throw new ForbiddenException("Oturum bulunamadı");

     const user = await this.prisma.user.findUnique({ where: { id: userId }});

     return this.prisma.communicationMessage.create({
        data: {
            sessionId,
            senderId: userId,
            role: user?.role ?? 'STUDENT',
            type: 'CHAT' as any, // Veya enum güncellenip TRANSCRIPTION yapılabilir.
            content: translatedText,
            metadata: { originalText, targetLanguage, isTranscription: true }
        }
     });
  }
}
