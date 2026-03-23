import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async linkStudent(guardianId: string, studentEmail: string, tenantId: string) {
    // 1. Öğrenci var mı kontrolü
    const student = await this.prisma.user.findFirst({
      where: { email: studentEmail, tenantId, role: 'STUDENT' },
    });

    if (!student) {
      throw new ForbiddenException('Öğrenci bulunamadı veya yetkisiz.');
    }

    // 2. Veli - Öğrenci ilişkisini kur (ParentStudent model)
    return this.prisma.parentStudent.upsert({
      where: {
        parentId_studentId: { parentId: guardianId, studentId: student.id },
      },
      update: {},
      create: {
        parentId: guardianId,
        studentId: student.id,
        tenantId,
      },
    });
  }

  async getMyStudentsOverview(guardianId: string, tenantId: string) {
    // Veliye ait çocukların ilerleme durumunu gösteren endpoint
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId: guardianId, tenantId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            totalXp: true,
            league: true,
            Enrollment: {
              include: { Course: { select: { title: true } } },
            },
            ExamSession: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: { startedAt: true, trustScore: true, aiDecision: true },
            },
          },
        },
      },
    });

    return links.map(link => link.student);
  }
}
