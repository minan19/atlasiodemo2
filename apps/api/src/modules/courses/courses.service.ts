import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, Prisma } from '@prisma/client';
import { CreateCourseScheduleDto } from './dto';
import { format } from 'date-fns';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(
    data: { title: string; description?: string; price?: number; instructorId?: string },
    actorId?: string,
    tenantId = 'public',
  ) {
    const course = await this.prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price ?? 0,
        instructorId: data.instructorId ?? actorId,
        tenantId,
      },
    });
    await this.audit.log({ actorId, action: 'course.create', entity: 'Course', entityId: course.id });
    return course;
  }

  async publish(courseId: string, isPublished: boolean, actorId?: string, tenantId = 'public') {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    const updated = await this.prisma.course.update({ where: { id: courseId }, data: { isPublished } });
    await this.audit.log({
      actorId,
      action: isPublished ? 'course.publish' : 'course.unpublish',
      entity: 'Course',
      entityId: courseId,
    });
    return updated;
  }


  async listPublished(tenantId = 'public') {
    return this.prisma.course.findMany({
      where: { isPublished: true, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { Lesson: true },
    });
  }

  async getPublished(courseId: string, tenantId = 'public') {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isPublished: true, tenantId },
      include: { Lesson: { orderBy: { order: 'asc' } } },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async listAll(tenantId = 'public') {
    return this.prisma.course.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { Lesson: true },
    });
  }

  private ensureInstructorAccess(
    course: { instructorId?: string | null } | null,
    actorId?: string,
    actorRole?: Role,
  ) {
    if (actorRole === Role.INSTRUCTOR && course?.instructorId && actorId !== course.instructorId) {
      throw new NotFoundException('Bu kurs için yetkiniz yok');
    }
  }

  async addSchedule(
    courseId: string,
    dto: CreateCourseScheduleDto,
    actorId?: string,
    actorRole?: Role,
    tenantId = 'public',
  ) {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    this.ensureInstructorAccess(course, actorId, actorRole);

    let liveSessionId: string | undefined = undefined;
    let meetingUrl = dto.meetingUrl;
    if (!meetingUrl) {
      const live = await this.prisma.liveSession.create({
        data: {
          courseId,
          instructorId: course.instructorId ?? actorId ?? '',
          topic: dto.title,
          status: 'SCHEDULED',
          startedAt: new Date(dto.startAt),
          metadata: dto.description ? { note: dto.description } : Prisma.JsonNull,
        },
      });
      liveSessionId = live.id;
      const webBase = process.env.WEB_BASE_URL ?? process.env.NEXT_PUBLIC_WEB_BASE ?? 'http://localhost:3000';
      meetingUrl = `${webBase}/live/${live.id}`;
      await this.prisma.whiteboardSession.upsert({
        where: { liveSessionId: live.id },
        create: { liveSessionId: live.id },
        update: {},
      });
    }

    const schedule = await this.prisma.courseSchedule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        timezone: dto.timezone,
        location: dto.location,
        meetingUrl,
        liveSessionId,
      },
    });
    await this.audit.log({
      actorId,
      action: 'course.schedule.create',
      entity: 'CourseSchedule',
      entityId: schedule.id,
      meta: { courseId },
    });
    return schedule;
  }


  async listSchedule(courseId: string, tenantId = 'public') {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseSchedule.findMany({
      where: { courseId },
      orderBy: { startAt: 'asc' },
    });
  }

  async scheduleIcs(courseId: string, tenantId = 'public') {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    const slots = await this.prisma.courseSchedule.findMany({
      where: { courseId },
      orderBy: { startAt: 'asc' },
    });
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Atlasio//Schedule//TR',
      ...slots.flatMap((s) => [
        'BEGIN:VEVENT',
        `UID:${s.id}@atlasio`,
        `SUMMARY:${escapeIcs(s.title)}`,
        s.description ? `DESCRIPTION:${escapeIcs(s.description)}` : 'DESCRIPTION:',
        `DTSTART:${formatUtc(s.startAt)}`,
        `DTEND:${formatUtc(s.endAt)}`,
        s.location ? `LOCATION:${escapeIcs(s.location)}` : undefined,
        s.meetingUrl ? `URL:${s.meetingUrl}` : undefined,
        'END:VEVENT',
      ]).filter(Boolean),
      'END:VCALENDAR',
    ];
    return lines.join('\r\n');
  }
}

function escapeIcs(text: string) {
  return text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function formatUtc(date: Date) {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}
