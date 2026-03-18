import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseMaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async getMaterials(courseId: string) {
    return this.prisma.courseMaterial.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPastExams(courseId: string) {
    return this.prisma.courseMaterial.findMany({
      where: { courseId, type: 'PAST_EXAM' },
      orderBy: { createdAt: 'desc' }
    });
  }

  async addMaterial(dto: { courseId: string, title: string, description?: string, type: 'PDF' | 'AUDIOBOOK' | 'SLIDE' | 'PAST_EXAM', url: string }, instructorId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course || course.instructorId !== instructorId) {
      throw new ForbiddenException('Bu kursa materyal ekleme yetkiniz yok.');
    }

    return this.prisma.courseMaterial.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        url: dto.url
      }
    });
  }
}
