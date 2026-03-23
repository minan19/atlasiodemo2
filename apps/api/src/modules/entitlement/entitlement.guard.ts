import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementService } from './entitlement.service';

export enum CommercialModule {
  LIVE_CLASSES = 'LIVE_CLASSES',
  WHITEBOARD_ADVANCED = 'WHITEBOARD_ADVANCED',
  AI_GHOST_MENTOR = 'AI_GHOST_MENTOR',
  ADAPTIVE_EXAMS = 'ADAPTIVE_EXAMS',
  CUSTOM_REPORTS = 'CUSTOM_REPORTS',
  LTI_INTEGRATION = 'LTI_INTEGRATION',
}

export const RequireModules = (...modules: CommercialModule[]) => SetMetadata('required_modules', modules);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService, private entitlement: EntitlementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<CommercialModule[]>('required_modules', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules || requiredModules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by AuthGuard/TenantGuard
    const tenantId = request.tenantId || user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Kurum bilgisi (Tenant) bulunamadı.');
    }

    if (tenantId === 'public') {
        return true;
    }

    const tenantModules = await this.entitlement.getTenantModules(tenantId);

    // Tüm required module'lerin "true" olması gerekir.
    const hasAccess = requiredModules.every((mod) => tenantModules[mod] === true);

    if (!hasAccess) {
      throw new ForbiddenException(`Ticari Paketinizde bu modül eksik: ${requiredModules.join(', ')}. Lütfen paketinizi yükseltin (Add-on Satın Alın).`);
    }

    return true;
  }
}
