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
exports.PeerReviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PeerReviewService = class PeerReviewService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async submitReview(submissionId, reviewerId, score, feedback) {
        const submission = await this.prisma.assignmentSubmission.findUnique({
            where: { id: submissionId }
        });
        if (!submission)
            throw new common_1.ForbiddenException("Ödev bulunamadı");
        if (submission.userId === reviewerId) {
            throw new common_1.ForbiddenException("Kendi ödevinizi değerlendiremezsiniz.");
        }
        const review = await this.prisma.peerReview.create({
            data: {
                submissionId,
                reviewerId,
                score,
                feedback
            }
        });
        const reviews = await this.prisma.peerReview.findMany({
            where: { submissionId }
        });
        if (reviews.length >= 3) {
            const avgScore = reviews.reduce((sum, rev) => sum + rev.score, 0) / reviews.length;
            await this.prisma.assignmentSubmission.update({
                where: { id: submissionId },
                data: { grade: avgScore }
            });
        }
        return review;
    }
};
exports.PeerReviewService = PeerReviewService;
exports.PeerReviewService = PeerReviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PeerReviewService);
//# sourceMappingURL=peer-review.service.js.map