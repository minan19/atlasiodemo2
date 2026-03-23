import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the tenantId from the authenticated request.
 * Priority: req.user.tenantId > x-tenant-id header > 'public'
 *
 * Usage: @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return (
      req.user?.tenantId ??
      req.headers?.['x-tenant-id'] ??
      'public'
    );
  },
);
