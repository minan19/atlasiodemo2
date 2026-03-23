import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LiveJoinGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.user?.userId;
    const role = req.user?.role ?? req.user?.roles?.[0];
    const sessionId = req.params?.id;
    if (!userId) throw new UnauthorizedException();
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      select: { courseId: true, instructorId: true },
    });
    if (!session) throw new ForbiddenException('Live session bulunamadı');
    if (role === 'ADMIN' || role === 'INSTRUCTOR' || session.instructorId === userId) return true;
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: session.courseId } },
      select: { id: true },
    });
    if (!enrolled) throw new ForbiddenException('Derse kayıtlı değilsiniz');
    return true;
  }
}
