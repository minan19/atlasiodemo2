import { Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kurumun (Tenant) erişimi olan ticari modüllerin listesini döndürür.
   * Subscription, Base Plan Features ve Addons özelliklerini birleştirir.
   */
  async getTenantModules(tenantId: string): Promise<Record<string, boolean>> {
    if (tenantId === 'public') {
      return {
        LIVE_CLASSES: true,
        WHITEBOARD_ADVANCED: true,
        AI_GHOST_MENTOR: true,
        ADAPTIVE_EXAMS: true,
        CUSTOM_REPORTS: true,
        LTI_INTEGRATION: true,
      };
    }

    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: { PricePlan: true },
    });

    if (!sub || !sub.PricePlan?.features) {
      return {};
    }

    const baseFeatures = (sub.PricePlan.features as Record<string, boolean>) || {};
    const addonFeatures = (sub.addons as string[]) || [];

    // Addons modülleriyse, ilgili keyleri "true" yap.
    for (const addon of addonFeatures) {
       baseFeatures[addon] = true;
    }

    return baseFeatures;
  }

  /**
   * Yeni bir satış (Add-on) sonrası Tenant aboneliğine o modül yetkisini ekler.
   */
  async grantAddonModule(tenantId: string, moduleName: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: 'ACTIVE' },
    });

    if (!sub) return null;

    const currentAddons = (sub.addons as string[]) || [];
    if (!currentAddons.includes(moduleName)) {
      currentAddons.push(moduleName);
    }

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { addons: currentAddons as any },
    });
  }

  /**
   * Seat (Koltuk) tahsisatı yetkisini kontrol eder.
   */
  async checkSeatAvailability(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
       where: { tenantId, status: 'ACTIVE' },
    });

    if (!sub) return false;

    // Limitsiz koltuk için (Örn: seats = -1)
    if (sub.seats === -1) return true;

    return sub.usedSeats < sub.seats;
  }

  /**
   * Yeni öğrenci/eğitmen eklendiğinde kullanılan koltuk sayısını (Seat) artırır.
   */
  async allocateSeat(tenantId: string) {
     const sub = await this.prisma.subscription.findFirst({
       where: { tenantId, status: 'ACTIVE' },
     });

     if (!sub) return false;

     await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { usedSeats: { increment: 1 } }
     });

     return true;
  }
}

@Module({
  providers: [EntitlementService, PrismaService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
