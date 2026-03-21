"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CognitiveAnalyticsListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveAnalyticsListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
let CognitiveAnalyticsListener = CognitiveAnalyticsListener_1 = class CognitiveAnalyticsListener {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CognitiveAnalyticsListener_1.name);
    }
    async handleQuizAnalyzed(event) {
        if (!event.userId)
            return;
        this.logger.log(`[Cognitive AI] Sınav analiz ediliyor... Kullanıcı: ${event.userId}, Obje: ${event.objectId}`);
        await this.evaluateStudentRisk(event.userId, event.tenantId);
    }
    async handleStudentRisk(event) {
        if (!event.userId)
            return;
        this.logger.log(`[Cognitive AI] Dikkat dağınıklığı/Ayrılma analizi... Kullanıcı: ${event.userId}`);
        await this.evaluateStudentRisk(event.userId, event.tenantId);
    }
    async evaluateStudentRisk(userId, tenantId) {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { userId, tenantId },
            include: { Course: true }
        });
        if (enrollments.length === 0)
            return;
        const masteries = await this.prisma.conceptMastery.findMany({
            where: { userId }
        });
        let avgMastery = 0.5;
        if (masteries.length > 0) {
            avgMastery = masteries.reduce((sum, m) => sum + m.masteryLevel, 0) / masteries.length;
        }
        const riskLevel = avgMastery < 0.4 ? 'HIGH' : avgMastery < 0.7 ? 'MEDIUM' : 'LOW';
        const insightMessage = avgMastery < 0.4
            ? "Yapay Zeka Uyarısı: Öğrencinin bilişsel hakimiyeti %40'ın altında. Düşme (Dropout) riski yüksek!"
            : "Öğrencinin gelişimi stabil.";
        for (const enr of enrollments) {
            await this.prisma.studentRiskProfile.upsert({
                where: { userId: userId },
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
};
exports.CognitiveAnalyticsListener = CognitiveAnalyticsListener;
__decorate([
    (0, event_emitter_1.OnEvent)('ai.quiz.analyzed', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveAnalyticsListener.prototype, "handleQuizAnalyzed", null);
__decorate([
    (0, event_emitter_1.OnEvent)('ai.student.risk.evaluated', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CognitiveAnalyticsListener.prototype, "handleStudentRisk", null);
exports.CognitiveAnalyticsListener = CognitiveAnalyticsListener = CognitiveAnalyticsListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CognitiveAnalyticsListener);
//# sourceMappingURL=cognitive-analytics.listener.js.map