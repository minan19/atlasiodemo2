import { Injectable, Logger } from '@nestjs/common';
import {
  DefenseActionState,
  DefenseActionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../security/security.service';
import { NginxService } from './nginx.service';

@Injectable()
export class DefenseOrchestrator {
  private readonly logger = new Logger(DefenseOrchestrator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
    private readonly nginx: NginxService,
  ) {}

  private securityBlockTtl() {
    return Number(process.env.SECURITY_BLOCK_TTL || 900);
  }

  async rollbackAction(id: string) {
    const action = await this.prisma.defenseAction.findUnique({ where: { id } });
    if (!action) throw new Error('DefenseAction not found');

    try {
      const unblockTypes: DefenseActionType[] = [
        DefenseActionType.BLOCK_IDENTITY,
        DefenseActionType.RATE_LIMIT,
        DefenseActionType.QUARANTINE,
        DefenseActionType.WAF_RULE,
      ];
      if (unblockTypes.includes(action.actionType) && action.target) {
        await this.security.tempUnblock(action.target);
        await this.nginx.removeDeny(action.target);
      }
      return this.prisma.defenseAction.update({
        where: { id },
        data: {
          state: DefenseActionState.ROLLED_BACK,
          rolledBackAt: new Date(),
          reason: action.reason ?? 'rolled back',
        },
      });
    } catch (err) {
      this.logger.error(`Rollback failed: ${err instanceof Error ? err.message : err}`);
      return this.prisma.defenseAction.update({
        where: { id },
        data: {
          state: DefenseActionState.FAILED,
          reason: err instanceof Error ? err.message : 'rollback failed',
        },
      });
    }
  }

  async applyAction(id: string) {
    const action = await this.prisma.defenseAction.findUnique({
      where: { id },
      include: { SecurityEvent: true },
    });
    if (!action) {
      throw new Error('DefenseAction not found');
    }

    try {
      switch (action.actionType) {
        case DefenseActionType.BLOCK_IDENTITY:
        case DefenseActionType.RATE_LIMIT: {
          const ttlRaw =
            (action.params as Prisma.JsonObject | null)?.ttlSeconds ??
            Number(process.env.SECURITY_BLOCK_TTL || 900);
          const ttlSeconds = Number(ttlRaw) || Number(process.env.SECURITY_BLOCK_TTL || 900);
          if (!action.target) throw new Error('target (ip) missing');
          await this.security.tempBlock(action.target, ttlSeconds);
          await this.nginx.addDeny(action.target);
          break;
        }
        case DefenseActionType.QUARANTINE: {
          // Karantina = uzun süreli blok (default 24 saat) + nginx deny
          if (action.target) {
            const ttl = Number(
              (action.params as Prisma.JsonObject | null)?.ttlSeconds ??
              process.env.QUARANTINE_TTL_SECONDS ??
              86400,
            );
            await this.security.tempBlock(action.target, ttl);
            await this.nginx.addDeny(action.target);
            this.logger.warn(`Quarantine applied: target=${action.target} ttl=${ttl}s`);
          }
          break;
        }
        case DefenseActionType.WAF_RULE: {
          if (action.target) {
            await this.security.tempBlock(action.target, this.securityBlockTtl());
            await this.nginx.addDeny(action.target);
          }
          break;
        }
        case DefenseActionType.RESTART_SERVICE: {
          // Servis yeniden başlatma talebi — audit log yaz, operatörü uyar
          await this.prisma.auditLog.create({
            data: {
              action: 'security:restart_service_requested',
              entity: 'DefenseAction',
              entityId: id,
              meta: { target: action.target, reason: action.reason },
            },
          });
          this.logger.warn(
            `RESTART_SERVICE requested for target=${action.target}. ` +
            'Automated restart not available — operator must restart manually. Audit log created.',
          );
          break;
        }
        case DefenseActionType.ALERT_ONLY:
        default: {
          // Alarm kaydı oluştur ve devam et
          await this.prisma.auditLog.create({
            data: {
              action: `security:alert_only:${action.actionType}`,
              entity: 'DefenseAction',
              entityId: id,
              meta: { target: action.target, reason: action.reason },
            },
          });
          this.logger.log(`ALERT_ONLY logged for ${action.actionType} id=${id}`);
          break;
        }
      }

      return this.prisma.defenseAction.update({
        where: { id },
        data: {
          state: DefenseActionState.APPLIED,
          appliedAt: new Date(),
          reason: action.reason ?? 'applied by orchestrator',
        },
      });
    } catch (err) {
      this.logger.error(`Apply action failed: ${err instanceof Error ? err.message : err}`);
      return this.prisma.defenseAction.update({
        where: { id },
        data: {
          state: DefenseActionState.FAILED,
          reason: err instanceof Error ? err.message : 'apply failed',
        },
      });
    }
  }
}
