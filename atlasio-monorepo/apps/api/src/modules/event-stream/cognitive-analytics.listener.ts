import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LearningStreamEvent } from '../event-stream/event-stream.service';

@Injectable()
export class CognitiveAnalyticsListener {
  private readonly logger = new Logger(CognitiveAnalyticsListener.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Öğrenci sınav sorusunu cevapladığı an (Zero-latency) tetiklenir.
   */
  @OnEvent('ai.quiz.analyzed', { async: true })
  async handleQuizAnalyzed(event: LearningStreamEvent) {
    if (!event.userId) return;

    this.logger.log(`[Cognitive AI] Sınav analiz ediliyor... Kullanıcı: ${event.userId}, Obje: ${event.objectId}`);

    // Risk profilini değerlendir (Quiz Performansına göre)
    await this.evaluateStudentRisk(event.userId, event.tenantId);
  }

  /**
   * Öğrenci videoyu yarıda kestiğinde veya içeriğe girdiğinde (Zero-latency) tetiklenir.
   */
  @OnEvent('ai.student.risk.evaluated', { async: true })
  async handleStudentRisk(event: LearningStreamEvent) {
    if (!event.userId) return;

    this.logger.log(`[Cognitive AI] Dikkat dağınıklığı/Ayrılma analizi... Kullanıcı: ${event.userId}`);

    // Risk profilini değerlendir (Davranışsal verilere göre)
    await this.evaluateStudentRisk(event.userId, event.tenantId);
  }

  private async evaluateStudentRisk(userId: string, tenantId: string) {
    // Öğrencinin son davranışlarını (Enrollments -> Course) çekip genel bir risk profili atar.
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, tenantId },
      include: { Course: true }
    });

    if (enrollments.length === 0) return;

    // Basit Risk Değerlendirmesi:
    // Eğer öğrencinin `ConceptMastery` ortalaması %40'ın altındaysa RISK: HIGH olarak güncellenir.
    const masteries = await this.prisma.conceptMastery.findMany({
      where: { userId }
    });

    let avgMastery = 0.5; // Default safe
    if (masteries.length > 0) {
      avgMastery = masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length;
    }

    const riskLevel = avgMastery < 0.4 ? 'HIGH' : avgMastery < 0.7 ? 'MEDIUM' : 'LOW';
    const insightMessage = avgMastery < 0.4 
        ? "Yapay Zeka Uyarısı: Öğrencinin bilişsel hakimiyeti %40'ın altında. Düşme (Dropout) riski yüksek!"
        : "Öğrencinin gelişimi stabil.";

    // Her kurs için ayrı risk ataması (Basitleştirilmiş)
    for (const enr of enrollments) {
       await this.prisma.studentRiskProfile.upsert({
         where: { userId: userId }, // schema'da userId unique (tekil profil)
         create: {
            userId: userId,
            courseId: enr.courseId,
            riskLevel: riskLevel,
            aiInsights: { message: insightMessage, avgMastery },
            lastCalculated: new Date()
         },
         update: {
            courseId: enr.courseId,
            riskLevel: riskLevel,
            aiInsights: { message: insightMessage, avgMastery },
            lastCalculated: new Date()
         }
       });
    }
  }
}
