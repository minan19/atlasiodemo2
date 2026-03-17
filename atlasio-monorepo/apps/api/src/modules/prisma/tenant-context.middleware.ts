import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service';

/**
 * TenantContextMiddleware: Her request'te Postgres session parametresi
 * 'app.current_tenant' ayarlar → RLS politikaları bu değeri kullanır.
 *
 * tenantId kaynağı:
 *  1. req.tenantId (TenantGuard tarafından set edilir)
 *  2. req.user.tenantId (JWT'den)
 *  3. x-tenant-id header
 *  4. 'public' (fallback)
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request & { tenantId?: string }, _res: Response, next: NextFunction) {
    const tenantId =
      req.tenantId ??
      (req as any).user?.tenantId ??
      (req.headers['x-tenant-id'] as string) ??
      'public';

    // Set on request for downstream use
    req.tenantId = tenantId;

    // Set Postgres session parameter for RLS policies
    try {
      await this.prisma.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    } catch (err) {
      this.logger.warn(`RLS session config failed for tenant=${tenantId}: ${(err as Error).message}`);
    }

    next();
  }
}
