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
exports.VolunteerContentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let VolunteerContentService = class VolunteerContentService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, instructorId) {
        const now = new Date();
        const data = {
            id: (0, crypto_1.randomUUID)(),
            title: dto.title,
            description: dto.description,
            contentType: dto.contentType,
            resourceUrl: dto.resourceUrl,
            Course: dto.courseId ? { connect: { id: dto.courseId } } : undefined,
            isPublic: dto.isPublic ?? true,
            updatedAt: now,
            User_VolunteerContent_instructorIdToUser: { connect: { id: instructorId } },
        };
        const record = await this.prisma.volunteerContent.create({ data });
        await this.audit.log({
            actorId: instructorId,
            action: 'volunteerContent.create',
            entity: 'VolunteerContent',
            entityId: record.id,
            meta: { title: record.title },
        });
        return record;
    }
    async listForInstructor(instructorId) {
        return this.prisma.volunteerContent.findMany({
            where: { instructorId },
            include: { VolunteerContentFeedback: true, Course: true, User_VolunteerContent_approvedByIdToUser: true },
            orderBy: { submittedAt: 'desc' },
        });
    }
    async listForAdmin(filter) {
        return this.prisma.volunteerContent.findMany({
            where: { status: filter?.status },
            include: { User_VolunteerContent_instructorIdToUser: true, Course: true, VolunteerContentFeedback: true, User_VolunteerContent_approvedByIdToUser: true },
            orderBy: { submittedAt: 'desc' },
        });
    }
    async setStatus(id, dto, actorId) {
        const content = await this.prisma.volunteerContent.findUnique({ where: { id } });
        if (!content)
            throw new common_1.NotFoundException('Gönüllü içerik bulunamadı');
        const update = await this.prisma.volunteerContent.update({
            where: { id },
            data: {
                status: dto.status,
                notes: dto.notes,
                reviewedAt: new Date(),
                User_VolunteerContent_approvedByIdToUser: { connect: { id: actorId } },
            },
        });
        await this.audit.log({
            actorId,
            action: 'volunteerContent.status',
            entity: 'VolunteerContent',
            entityId: update.id,
            meta: { status: dto.status, notes: dto.notes },
        });
        return update;
    }
    async addFeedback(contentId, dto, userId) {
        const content = await this.prisma.volunteerContent.findUnique({ where: { id: contentId } });
        if (!content)
            throw new common_1.NotFoundException('Gönüllü içerik bulunamadı');
        if (content.status !== client_1.VolunteerContentStatus.APPROVED) {
            throw new common_1.ForbiddenException('Sadece onaylı gönüllü içeriklere geri bildirim verilebilir');
        }
        const feedback = await this.prisma.volunteerContentFeedback.upsert({
            where: {
                contentId_userId: { contentId, userId },
            },
            update: {
                rating: dto.rating,
                comment: dto.comment,
            },
            create: {
                VolunteerContent: { connect: { id: contentId } },
                User: { connect: { id: userId } },
                rating: dto.rating,
                comment: dto.comment,
            },
        });
        await this.audit.log({
            actorId: userId,
            action: 'volunteerContent.feedback',
            entity: 'VolunteerContentFeedback',
            entityId: feedback.id,
            meta: { rating: feedback.rating },
        });
        return feedback;
    }
    async computeValueScore(instructorId) {
        const [approvedCount, feedbackStats] = await Promise.all([
            this.prisma.volunteerContent.count({
                where: { instructorId, status: client_1.VolunteerContentStatus.APPROVED },
            }),
            this.prisma.volunteerContentFeedback.aggregate({
                _count: true,
                _avg: { rating: true },
                where: { VolunteerContent: { instructorId, status: client_1.VolunteerContentStatus.APPROVED } },
            }),
        ]);
        const feedbackCount = typeof feedbackStats._count === 'number' ? feedbackStats._count : feedbackStats._count?._all ?? 0;
        const averageRating = feedbackStats._avg.rating ?? 0;
        const score = new client_1.Prisma.Decimal(approvedCount)
            .mul(10)
            .plus(new client_1.Prisma.Decimal(averageRating).mul(feedbackCount).mul(2))
            .plus(feedbackCount * 2);
        return {
            approvedCount,
            feedbackCount,
            averageRating: new client_1.Prisma.Decimal(averageRating),
            score,
        };
    }
    async recordValueScore(instructorId, actorId) {
        const summary = await this.computeValueScore(instructorId);
        const record = await this.prisma.instructorValueScore.create({
            data: {
                instructorId,
                approvedContents: summary.approvedCount,
                feedbackCount: summary.feedbackCount,
                averageRating: summary.averageRating,
                score: summary.score,
                ...(actorId ? { recordedById: actorId } : {}),
            },
        });
        await this.audit.log({
            actorId,
            action: 'instructorValueScore.record',
            entity: 'InstructorValueScore',
            entityId: record.id,
            meta: { approvedCount: summary.approvedCount, feedbackCount: summary.feedbackCount },
        });
        return { summary, record };
    }
    async getLatestValueScore(instructorId) {
        const summary = await this.computeValueScore(instructorId);
        const record = await this.prisma.instructorValueScore.findFirst({
            where: { instructorId },
            orderBy: { computedAt: 'desc' },
        });
        return { summary, record };
    }
    async getInstructorScores(instructorId, limit = 7) {
        return this.prisma.instructorValueScore.findMany({
            where: { instructorId },
            orderBy: { computedAt: 'desc' },
            take: limit,
        });
    }
};
exports.VolunteerContentService = VolunteerContentService;
exports.VolunteerContentService = VolunteerContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], VolunteerContentService);
//# sourceMappingURL=volunteer-content.service.js.map