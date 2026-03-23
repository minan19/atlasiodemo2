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
var AiQuestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiQuestionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let AiQuestionService = AiQuestionService_1 = class AiQuestionService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AiQuestionService_1.name);
    }
    async generateDrafts(input) {
        const topic = await this.prisma.topic.findUnique({ where: { id: input.topicId } });
        if (!topic)
            throw new Error('Topic not found');
        const drafts = [];
        for (let i = 0; i < input.count; i++) {
            const stem = `(${topic.name}) Otomatik soru ${i + 1}: ${this.placeholderPrompt(topic.name, input.difficulty)}`;
            const choices = [
                { id: (0, crypto_1.randomUUID)(), text: 'Seçenek A', isCorrect: false },
                { id: (0, crypto_1.randomUUID)(), text: 'Seçenek B', isCorrect: true },
                { id: (0, crypto_1.randomUUID)(), text: 'Seçenek C', isCorrect: false },
            ];
            const correctChoiceId = choices.find((c) => c.isCorrect).id;
            drafts.push({
                id: (0, crypto_1.randomUUID)(),
                topicId: topic.id,
                stem,
                explanation: 'AI taslak açıklama',
                difficulty: input.difficulty ?? 2,
                status: 'DRAFT',
                sourceType: 'AI',
                correctChoiceId,
                choices,
                createdBy: input.createdBy,
            });
        }
        await Promise.all(drafts.map(async (d) => {
            await this.prisma.question.create({
                data: {
                    id: d.id,
                    topicId: d.topicId,
                    stem: d.stem,
                    explanation: d.explanation,
                    difficulty: d.difficulty,
                    status: d.status,
                    sourceType: d.sourceType,
                    correctChoiceId: d.correctChoiceId,
                    createdBy: d.createdBy,
                    choices: { createMany: { data: d.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })) } },
                },
            });
        }));
        this.logger.log(`Generated ${drafts.length} AI draft questions for topic ${topic.name}`);
        return drafts.map((d) => ({ id: d.id, stem: d.stem, status: d.status }));
    }
    async listDrafts() {
        return this.prisma.question.findMany({
            where: { status: 'DRAFT' },
            include: { choices: true, Topic: true },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        });
    }
    async approve(id) {
        return this.prisma.question.update({ where: { id }, data: { status: 'APPROVED', updatedAt: new Date() } });
    }
    async reject(id) {
        await this.prisma.questionChoice.deleteMany({ where: { questionId: id } });
        return this.prisma.question.delete({ where: { id } });
    }
    placeholderPrompt(topic, difficulty) {
        const diff = difficulty === 3 ? 'ileri' : difficulty === 1 ? 'kolay' : 'orta';
        return `${diff} seviye kavramsal kontrol sorusu`;
    }
};
exports.AiQuestionService = AiQuestionService;
exports.AiQuestionService = AiQuestionService = AiQuestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AiQuestionService);
//# sourceMappingURL=ai-question.service.js.map