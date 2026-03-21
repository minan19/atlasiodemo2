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
var GamificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GamificationService = GamificationService_1 = class GamificationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GamificationService_1.name);
    }
    async updateDailyStreak(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (user.lastActiveDate) {
            const lastActive = new Date(user.lastActiveDate);
            const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
            const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                const newStreak = user.currentStreak + 1;
                const longest = Math.max(user.longestStreak, newStreak);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { currentStreak: newStreak, longestStreak: longest, lastActiveDate: now },
                });
            }
            else if (diffDays > 1) {
                let freezesUsed = 0;
                let streakBroken = false;
                for (let i = 1; i < diffDays; i++) {
                    if (user.streakFreezes > freezesUsed) {
                        freezesUsed++;
                    }
                    else {
                        streakBroken = true;
                        break;
                    }
                }
                if (streakBroken) {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { currentStreak: 1, streakFreezes: Math.max(0, user.streakFreezes - freezesUsed), lastActiveDate: now },
                    });
                }
                else {
                    const newStreak = user.currentStreak + 1;
                    const longest = Math.max(user.longestStreak, newStreak);
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: {
                            currentStreak: newStreak,
                            longestStreak: longest,
                            streakFreezes: Math.max(0, user.streakFreezes - freezesUsed),
                            lastActiveDate: now
                        },
                    });
                }
            }
        }
        else {
            await this.prisma.user.update({
                where: { id: userId },
                data: { currentStreak: 1, longestStreak: 1, lastActiveDate: now },
            });
        }
    }
    async decrementHeart(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return;
        if (user.hearts <= 0)
            throw new common_1.BadRequestException("Canınız (Heart) bitti. Pratik (Heal Quiz) yaparak can kazanın.");
        await this.prisma.user.update({
            where: { id: userId },
            data: { hearts: { decrement: 1 } }
        });
    }
    async refillHearts(userId, amount = 1) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return;
        const newHearts = Math.min(5, user.hearts + amount);
        await this.prisma.user.update({
            where: { id: userId },
            data: { hearts: newHearts }
        });
    }
    async buyStreakFreeze(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return;
        const FREEZE_COST = 200;
        if (user.coins < FREEZE_COST) {
            throw new common_1.BadRequestException("Yeterli sanal paranız (Coins) bulunmamaktadır.");
        }
        if (user.streakFreezes >= 2) {
            throw new common_1.BadRequestException("Aynı anda en fazla 2 Streak Freeze (Seri Dondurucu) taşıyabilirsiniz.");
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                coins: { decrement: FREEZE_COST },
                streakFreezes: { increment: 1 }
            }
        });
    }
    async addXp(userId, xpAmount) {
        try {
            const user = await this.prisma.user.update({
                where: { id: userId },
                data: {
                    totalXp: { increment: xpAmount },
                    coins: { increment: Math.floor(xpAmount / 2) }
                },
            });
            await this.evaluateLeague(user);
            return user;
        }
        catch (e) {
            this.logger.error(`Error adding XP for user ${userId}: ${e.message}`);
        }
    }
    async evaluateLeague(user) {
        const xp = user.totalXp;
        let newLeague = 'BRONZE';
        if (xp >= 10000)
            newLeague = 'MASTER';
        else if (xp >= 5000)
            newLeague = 'DIAMOND';
        else if (xp >= 2000)
            newLeague = 'GOLD';
        else if (xp >= 500)
            newLeague = 'SILVER';
        if (newLeague !== user.league) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { league: newLeague },
            });
            this.logger.log(`User ${user.id} promoted to ${newLeague}`);
        }
    }
    async awardBadge(userId, badgeName) {
        const badge = await this.prisma.badge.findFirst({
            where: { name: badgeName, tenantId: 'public' },
        });
        if (!badge) {
            this.logger.warn(`Badge not found: ${badgeName}`);
            return;
        }
        try {
            await this.prisma.userBadge.upsert({
                where: { userId_badgeId: { userId, badgeId: badge.id } },
                create: { userId, badgeId: badge.id },
                update: {},
            });
            await this.addXp(userId, badge.points);
            return true;
        }
        catch (error) {
            this.logger.error(`Error awarding badge: ${error.message}`);
        }
    }
    async getLeaderboard(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId, role: 'STUDENT' },
            orderBy: { totalXp: 'desc' },
            take: 100,
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                league: true,
                totalXp: true,
            },
        });
    }
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = GamificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamificationService);
//# sourceMappingURL=gamification.service.js.map