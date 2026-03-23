import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

/**
 * Development-only bypass. Set AUTH_BYPASS=true to skip JWT and inject an admin user.
 * Default: uses normal JWT guard.
 */
@Injectable()
export class BypassAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isBypass()) {
      const req = context.switchToHttp().getRequest();
      req.user = { id: 'bypass-admin', role: 'ADMIN', roles: ['ADMIN'] };
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (this.isBypass()) {
      const req = context.switchToHttp().getRequest();
      return req.user;
    }
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }

  private isBypass() {
    return (
      this.config.get('AUTH_BYPASS') === 'true' ||
      process.env.AUTH_BYPASS === 'true'
    );
  }
}
