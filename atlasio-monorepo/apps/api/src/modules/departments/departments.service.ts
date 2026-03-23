import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDepartment(tenantId: string, name: string, headInstructorId: string) {
    // Admin veya sistemin oluşturabileceği bir metod
    return this.prisma.department.create({
      data: {
        tenantId,
        name,
        headInstructorId,
      },
    });
  }

  async getMyDepartments(headInstructorId: string, tenantId: string) {
    // Başeğitmenin kendi departmanlarını listeler
    return this.prisma.department.findMany({
      where: { headInstructorId, tenantId },
      include: {
        instructors: { select: { id: true, name: true, email: true } },
        classes: { select: { id: true, name: true } },
      },
    });
  }

  async addInstructorToDepartment(headInstructorId: string, departmentId: string, instructorId: string) {
    // 1. Departman bu başeğitmene mi ait kontrolü
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException('Departman bulunamadı.');
    if (dept.headInstructorId !== headInstructorId) {
      throw new ForbiddenException('Bu departmanı yönetme yetkiniz yok.');
    }

    // 2. Eğitmenin departmanını güncelle
    return this.prisma.user.update({
      where: { id: instructorId },
      data: { departmentId: dept.id },
      select: { id: true, name: true, email: true, departmentId: true },
    });
  }
}
