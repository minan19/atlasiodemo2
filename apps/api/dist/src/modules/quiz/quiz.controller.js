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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizController = void 0;
const common_1 = require("@nestjs/common");
const quiz_service_1 = require("./quiz.service");
const dto_1 = require("./dto");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_question_service_1 = require("./ai-question.service");
let QuizController = class QuizController {
    constructor(quiz, prisma, ai) {
        this.quiz = quiz;
        this.prisma = prisma;
        this.ai = ai;
    }
    async start(body) {
        const sessionId = (0, crypto_1.randomUUID)();
        const { question, masteryHint } = await this.quiz.pickQuestion({ ...body }, undefined);
        return { sessionId, question, masteryHint };
    }
    async next(body) {
        await this.quiz.recordAttempt(body.last, undefined);
        const { question, masteryHint } = await this.quiz.pickQuestion(body, undefined);
        return { question, masteryHint };
    }
    async list(topicId) {
        const questions = await this.prisma.question.findMany({
            where: { topicId: topicId || undefined },
            include: { choices: true },
            orderBy: { updatedAt: 'desc' },
            take: 50,
        });
        return questions;
    }
    async insights() {
        const perTopic = await this.prisma.quizAttempt.groupBy({
            by: ['tenantId', 'questionId'],
            _count: { _all: true },
            _avg: { durationMs: true },
            where: {},
        });
        const rows = await this.prisma.$queryRawUnsafe(`
      select q."topicId" as "topicId",
             count(*) as attempts,
             sum(case when qa.correct then 1 else 0 end)::float / nullif(count(*),0) * 100 as accuracy
      from "QuizAttempt" qa
      join "Question" q on qa."questionId" = q.id
      group by q."topicId"
      order by attempts desc
    `);
        return rows;
    }
    async generateAi(body) {
        const drafts = await this.ai.generateDrafts({
            topicId: body.topicId,
            count: body.count ?? 3,
            difficulty: body.difficulty ?? 2,
        });
        return drafts;
    }
    async listDrafts() {
        return this.ai.listDrafts();
    }
    async approveDraft(body) {
        return this.ai.approve(body.id);
    }
    async rejectDraft(body) {
        return this.ai.reject(body.id);
    }
};
exports.QuizController = QuizController;
__decorate([
    (0, common_1.Post)('adaptive/start'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.StartAdaptiveDto]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('adaptive/next'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.NextAdaptiveDto]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "next", null);
__decorate([
    (0, common_1.Get)('questions'),
    __param(0, (0, common_1.Query)('topicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('insights'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "insights", null);
__decorate([
    (0, common_1.Post)('ai/generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "generateAi", null);
__decorate([
    (0, common_1.Get)('ai/drafts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "listDrafts", null);
__decorate([
    (0, common_1.Post)('ai/approve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "approveDraft", null);
__decorate([
    (0, common_1.Post)('ai/reject'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "rejectDraft", null);
exports.QuizController = QuizController = __decorate([
    (0, common_1.Controller)('quiz'),
    __metadata("design:paramtypes", [quiz_service_1.QuizService,
        prisma_service_1.PrismaService,
        ai_question_service_1.AiQuestionService])
], QuizController);
//# sourceMappingURL=quiz.controller.js.map