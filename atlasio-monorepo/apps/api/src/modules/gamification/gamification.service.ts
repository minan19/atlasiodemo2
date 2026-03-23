import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * DUOLINGO STREAK MANTIĞI
   * Her gün ilk aksiyonda (quiz çözme vs) streak artar veya freeze kullanılarak korunur.
   */
  async updateDailyStreak(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      
      const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Ardışık gün, streak artır
        const newStreak = user.currentStreak + 1;
        const longest = Math.max(user.longestStreak, newStreak);
        await this.prisma.user.update({
          where: { id: userId },
          data: { currentStreak: newStreak, longestStreak: longest, lastActiveDate: now },
        });
      } else if (diffDays > 1) {
        // Seri bozuldu. Freeze var mı?
        let freezesUsed = 0;
        let streakBroken = false;

        for (let i = 1; i < diffDays; i++) {
            if (user.streakFreezes > freezesUsed) {
                freezesUsed++;
            } else {
                streakBroken = true;
                break;
            }
        }

        if (streakBroken) {
          // Freeze yetmedi, seri sıfırlandı
          await this.prisma.user.update({
            where: { id: userId },
            data: { currentStreak: 1, streakFreezes: Math.max(0, user.streakFreezes - freezesUsed), lastActiveDate: now },
          });
        } else {
          // Freeze kurtardı, seri devam ediyor
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
      // diffDays === 0 ise (Bugün zaten giriş yapmış) hiçbir şey yapma
    } else {
      // İlk defa giriyor
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentStreak: 1, longestStreak: 1, lastActiveDate: now },
      });
    }
  }

  /**
   * DUOLINGO HEARTS (CAN) MANTIĞI
   * Yanlış yapınca can azalır.
   */
  async decrementHeart(userId: string) {
     const user = await this.prisma.user.findUnique({ where: { id: userId } });
     if (!user) return;
     if (user.hearts <= 0) throw new BadRequestException("Canınız (Heart) bitti. Pratik (Heal Quiz) yaparak can kazanın.");

     await this.prisma.user.update({
        where: { id: userId },
        data: { hearts: { decrement: 1 } }
     });
  }

  async refillHearts(userId: string, amount: number = 1) {
     const user = await this.prisma.user.findUnique({ where: { id: userId } });
     if (!user) return;
     
     const newHearts = Math.min(5, user.hearts + amount);
     await this.prisma.user.update({
        where: { id: userId },
        data: { hearts: newHearts }
     });
  }

  /**
   * DUOLINGO MARKET (VIRTUAL STORE)
   */
  async buyStreakFreeze(userId: string) {
     const user = await this.prisma.user.findUnique({ where: { id: userId } });
     if (!user) return;
     
     const FREEZE_COST = 200; // Örnek bedel

     if (user.coins < FREEZE_COST) {
         throw new BadRequestException("Yeterli sanal paranız (Coins) bulunmamaktadır.");
     }

     if (user.streakFreezes >= 2) {
         throw new BadRequestException("Aynı anda en fazla 2 Streak Freeze (Seri Dondurucu) taşıyabilirsiniz.");
     }

     return this.prisma.user.update({
         where: { id: userId },
         data: { 
             coins: { decrement: FREEZE_COST },
             streakFreezes: { increment: 1 }
         }
     });
  }

  async addXp(userId: string, xpAmount: number) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          totalXp: { increment: xpAmount },
          coins: { increment: Math.floor(xpAmount / 2) } // Her kazanılan XP'nin yarısı kadar Coin (Sanal Para) kazansın
        },
      });

      await this.evaluateLeague(user);

      return user;
    } catch (e) {
      this.logger.error(`Error adding XP for user ${userId}: ${(e as Error).message}`);
    }
  }

  private async evaluateLeague(user: any) {
    const xp = user.totalXp;
    let newLeague = 'BRONZE';

    if (xp >= 10000) newLeague = 'MASTER';
    else if (xp >= 5000) newLeague = 'DIAMOND';
    else if (xp >= 2000) newLeague = 'GOLD';
    else if (xp >= 500) newLeague = 'SILVER';

    if (newLeague !== user.league) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { league: newLeague },
      });
      this.logger.log(`User ${user.id} promoted to ${newLeague}`);
      // İleride buraya bildirim servisi eklenebilir.
    }
  }

  async awardBadge(userId: string, badgeName: string) {
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
    } catch (error) {
      this.logger.error(`Error awarding badge: ${(error as Error).message}`);
    }
  }

  async getLeaderboard(tenantId: string) {
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
}
