import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: string; roles?: string[] };
    const activeRole = user?.role ?? user?.roles?.[0];
    const roleUpper = String(activeRole ?? "").toUpperCase();
    const rolesUpper = roles.map(r => String(r).toUpperCase());
    if (roleUpper === 'ADMIN') return true;
    if (!roleUpper || !rolesUpper.includes(roleUpper)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
