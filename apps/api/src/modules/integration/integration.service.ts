import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async listConnectors(tenantId: string) {
    return this.prisma.integrationConnector.findMany({ where: { tenantId } });
  }

  async upsertConnector(tenantId: string, data: { name: string; provider: string; type: string; config: Record<string, any>; enabled?: boolean }) {
    return this.prisma.integrationConnector.upsert({
      where: { tenantId_name: { tenantId, name: data.name } },
      create: {
        tenantId,
        name: data.name,
        provider: data.provider,
        type: data.type,
        config: data.config,
        enabled: data.enabled ?? true,
      },
      update: {
        provider: data.provider,
        type: data.type,
        config: data.config,
        enabled: data.enabled ?? true,
      },
    });
  }
}
