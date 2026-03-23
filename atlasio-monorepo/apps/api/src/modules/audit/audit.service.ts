import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    actorId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    meta?: any;
    ip?: string;
    ua?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        id: randomUUID(),
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        meta: entry.meta ?? undefined,
        ip: entry.ip,
        ua: entry.ua,
      },
    });
  }
}
