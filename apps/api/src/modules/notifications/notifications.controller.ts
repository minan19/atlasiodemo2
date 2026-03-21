import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  // Alarm feed: sadece ADMIN / TECH görsün
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('alarms')
  async alarms(@Req() req: any) {
    const role = req.user?.role ?? req.user?.roles?.[0];
    if (!['ADMIN', 'TECH'].includes(role)) {
      return [];
    }
    return this.prisma.auditLog.findMany({
      where: { action: { contains: 'security' } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Bildirim zili sayacı — hafif endpoint, 30s polling (ADMIN/TECH)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('alarm-count')
  async alarmCount(@Req() req: any) {
    const role = req.user?.role ?? req.user?.roles?.[0];
    if (!['ADMIN', 'TECH'].includes(role)) {
      return { count: 0 };
    }
    const count = await this.prisma.auditLog.count({
      where: { action: { contains: 'security' } },
    });
    return { count };
  }

  // ─── Kullanıcı bildirimleri ─────────────────────────────────────────────

  /** GET /notifications/my — okunmamış + son 30 bildirim */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async myNotifications(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /** GET /notifications/my/unread-count — okunmamış sayısı */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('my/unread-count')
  async myUnreadCount(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    const count = await this.prisma.userNotification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  /** PATCH /notifications/:id/read — tek bildirimi okundu işaretle */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.prisma.userNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  /** POST /notifications/my/read-all — tümünü okundu işaretle */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Post('my/read-all')
  async markAllRead(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    await this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  /** POST /notifications/send — admin: kullanıcıya bildirim gönder */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @Post('send')
  async send(
    @Body() body: { userId: string; title: string; body: string; type?: string; link?: string },
    @Req() req: any,
  ) {
    const role = req.user?.role ?? req.user?.roles?.[0];
    if (!['ADMIN', 'TECH', 'HEAD_INSTRUCTOR', 'INSTRUCTOR'].includes(role)) {
      return { ok: false, reason: 'unauthorized' };
    }
    const notif = await this.prisma.userNotification.create({
      data: {
        userId: body.userId,
        title: body.title,
        body: body.body,
        type: body.type ?? 'info',
        link: body.link,
      },
    });
    return notif;
  }
}
