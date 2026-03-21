import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmartClassroomService {
  constructor(private prisma: PrismaService) {}

  async getStatus(liveSessionId: string) {
    return this.prisma.smartClassroom.upsert({
      where: { liveSessionId },
      update: {},
      create: { liveSessionId }
    });
  }

  async updateEnvironment(liveSessionId: string, instructorId: string, dto: { lighting?: number, climate?: number, mode?: string }) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: liveSessionId } });
    if (!session || session.instructorId !== instructorId) {
      throw new ForbiddenException('Akıllı Sınıf cihazlarını yönetme yetkiniz yok.');
    }

    // IoT donanımlarına (MQTT/HTTP) sinyal gönderme kodu simülasyonu burada tetiklenebilir
    return this.prisma.smartClassroom.update({
      where: { liveSessionId },
      data: {
        ...(dto.lighting !== undefined && { lighting: dto.lighting }),
        ...(dto.climate !== undefined && { climate: dto.climate }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
      }
    });
  }
}
