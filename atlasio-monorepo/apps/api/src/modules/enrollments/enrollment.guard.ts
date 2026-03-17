import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsService } from './enrollments.service';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    private readonly enrollments: EnrollmentsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id ?? req.user?.userId;
    const role = req.user?.role;

    const courseId = req.params?.courseId;
    const lessonId = req.params?.lessonId;

    if (role === 'ADMIN') return true;

    // lessonId varsa preview kontrolü
    if (lessonId) {
      const lesson = await this.prisma.lessonContent.findUnique({ where: { id: lessonId } });
      if (lesson?.isPreview) return true;
    }

    const ok = await this.enrollments.isEnrolled(userId, courseId);
    if (!ok) throw new ForbiddenException('You are not enrolled in this course');
    return true;
  }
}
