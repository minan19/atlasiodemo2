import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    courseId: string,
    dto: {
      title: string;
      order?: number;
      content?: string;
      videoUrl?: string;
      isPreview?: boolean;
    },
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new BadRequestException('Course not found');

    return this.prisma.lessonContent.create({
      data: {
        courseId,
        title: dto.title,
        order: dto.order ?? 0,
        content: dto.content,
        videoUrl: dto.videoUrl,
        isPreview: dto.isPreview ?? false,
      },
    });
  }

  listByCourse(courseId: string) {
    return this.prisma.lessonContent.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  async get(courseId: string, lessonId: string) {
    const lesson = await this.prisma.lessonContent.findFirst({
      where: { id: lessonId, courseId },
    });
    if (!lesson) throw new BadRequestException('Lesson not found');
    return lesson;
  }

  /** Dersi tamamlandı olarak işaretle (upsert — idempotent) */
  async markComplete(userId: string, courseId: string, lessonId: string) {
    const lesson = await this.prisma.lessonContent.findFirst({
      where: { id: lessonId, courseId },
      select: { id: true },
    });
    if (!lesson) throw new BadRequestException('Ders bulunamadı');

    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { completedAt: new Date() },
      create: { userId, lessonId, courseId },
    });

    return this.courseProgress(userId, courseId);
  }

  /** Tek kurs ilerleme istatistiği: tamamlanan / toplam / yüzde */
  async courseProgress(userId: string, courseId: string) {
    const [total, done] = await Promise.all([
      this.prisma.lessonContent.count({ where: { courseId } }),
      this.prisma.lessonProgress.count({ where: { userId, courseId } }),
    ]);
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return { courseId, total, done, percentage };
  }

  /** Birden fazla kurs için toplu ilerleme (my-courses sayfası) */
  async allProgress(userId: string, courseIds: string[]) {
    if (courseIds.length === 0) return [];

    const [totals, dones] = await Promise.all([
      this.prisma.lessonContent.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _count: { id: true },
      }),
      this.prisma.lessonProgress.groupBy({
        by: ['courseId'],
        where: { userId, courseId: { in: courseIds } },
        _count: { id: true },
      }),
    ]);

    const doneMap = new Map(dones.map((d) => [d.courseId, d._count.id]));
    return totals.map(({ courseId, _count }) => {
      const total = _count.id;
      const done = doneMap.get(courseId) ?? 0;
      return { courseId, total, done, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }
}
