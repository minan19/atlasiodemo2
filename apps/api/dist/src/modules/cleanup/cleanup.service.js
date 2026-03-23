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
var CleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let CleanupService = CleanupService_1 = class CleanupService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CleanupService_1.name);
    }
    async cleanExpiredPasswordResetTokens() {
        const result = await this.prisma.user.updateMany({
            where: {
                passwordResetToken: { not: null },
                passwordResetExpiry: { lt: new Date() },
            },
            data: {
                passwordResetToken: null,
                passwordResetExpiry: null,
            },
        });
        if (result.count > 0) {
            this.logger.log(`Temizlendi: ${result.count} adet süresi dolmuş şifre sıfırlama token'ı`);
        }
    }
    async cleanStalePendingVerifications() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await this.prisma.user.updateMany({
            where: {
                emailVerified: false,
                emailVerifyToken: { not: null },
                createdAt: { lt: cutoff },
            },
            data: { emailVerifyToken: null },
        });
        if (result.count > 0) {
            this.logger.log(`Temizlendi: ${result.count} adet süresi dolmuş e-posta doğrulama token'ı`);
        }
    }
    async runAll() {
        await this.cleanExpiredPasswordResetTokens();
        await this.cleanStalePendingVerifications();
        return { ok: true, ran: ['password-reset', 'email-verify'] };
    }
};
exports.CleanupService = CleanupService;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *', { name: 'cleanup-password-reset-tokens' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CleanupService.prototype, "cleanExpiredPasswordResetTokens", null);
__decorate([
    (0, schedule_1.Cron)('5 2 * * *', { name: 'cleanup-email-verify-tokens' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CleanupService.prototype, "cleanStalePendingVerifications", null);
exports.CleanupService = CleanupService = CleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupService);
//# sourceMappingURL=cleanup.service.js.map