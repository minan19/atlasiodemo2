import { Controller, Get, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SecurityService } from './security.service';

@ApiExcludeController()
@Controller('internal/backup-status')
export class HoneypotController {
  constructor(private readonly security: SecurityService) {}

  @Get()
  async trap(@Req() req: any) {
    await this.security.markHoneypotHit(req.ip ?? 'unknown');
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
