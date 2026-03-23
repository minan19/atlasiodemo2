import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { instructorId: string; studentId: string; start: string; end: string; meetingLink?: string }) {
    return this.prisma.lessonBooking.create({
      data: {
        id: randomUUID(),
        instructorId: dto.instructorId,
        studentId: dto.studentId,
        scheduledStart: new Date(dto.start),
        scheduledEnd: new Date(dto.end),
        meetingLink: dto.meetingLink,
        status: 'scheduled',
      },
    });
  }

  async listForInstructor(id: string) {
    return this.prisma.lessonBooking.findMany({
      where: { instructorId: id },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async listForStudent(id: string) {
    return this.prisma.lessonBooking.findMany({
      where: { studentId: id },
      orderBy: { scheduledStart: 'asc' },
    });
  }

  async cancel(id: string) {
    return this.prisma.lessonBooking.update({ where: { id }, data: { status: 'canceled' } });
  }
}
