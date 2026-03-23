import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';

/**
 * TenantGuard: Her authenticated request'te tenantId'yi normalize eder
 * ve req.tenantId olarak set eder.
 *
 * Kaynak: JWT payload > x-tenant-id header > 'public'
 *
 * Admin kullanıcılar x-tenant-id header ile farklı tenant'a geçebilir.
 * Diğer roller sadece JWT'deki kendi tenant'larına erişebilir.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { tenantId?: string; role?: string } | undefined;
    const headerTenant = req.headers?.['x-tenant-id'] as string | undefined;

    // JWT'deki tenantId her zaman esas
    const jwtTenant = user?.tenantId ?? 'public';

    // Admin kullanıcılar header ile başka tenant'a geçebilir
    if (user?.role?.toUpperCase() === 'ADMIN' && headerTenant) {
      req.tenantId = headerTenant;
    } else {
      req.tenantId = jwtTenant;
    }

    return true;
  }
}
