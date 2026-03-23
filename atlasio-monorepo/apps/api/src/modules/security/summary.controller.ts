import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BypassAuthGuard } from '../auth/bypass.guard';

@Controller('security')
export class SecuritySummaryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary() {
    const [events24h, openActions] = await this.prisma.$transaction([
      this.prisma.securityEvent.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        orderBy: { severity: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.defenseAction.groupBy({
        by: ['state'],
        orderBy: { state: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const sevCounts = Object.fromEntries(
      events24h.map((e: any) => [e.severity, typeof e._count === 'object' && e._count?._all ? e._count._all : 0]),
    );
    const actionCounts = Object.fromEntries(
      openActions.map((a: any) => [a.state, typeof a._count === 'object' && a._count?._all ? a._count._all : 0]),
    );

    return {
      generatedAt: new Date().toISOString(),
      events24h: sevCounts,
      defenseActions: actionCounts,
    };
  }
}
