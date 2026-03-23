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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageLabService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LanguageLabService = class LanguageLabService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async analyzeSpeech(userId, tenantId, audioBase64, expectedText) {
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
    async fetchSpeakingHistory(userId, tenantId) {
        return this.prisma.languageLabAttempt.findMany({
            where: { userId, tenantId, type: 'SPEAKING' },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.LanguageLabService = LanguageLabService;
exports.LanguageLabService = LanguageLabService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LanguageLabService);
//# sourceMappingURL=language-lab.service.js.map