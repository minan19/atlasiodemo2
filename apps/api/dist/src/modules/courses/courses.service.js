"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
let CoursesService = class CoursesService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(data, actorId, tenantId = 'public') {
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
    async publish(courseId, isPublished, actorId, tenantId = 'public') {
        const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
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
    async getPublished(courseId, tenantId = 'public') {
        const course = await this.prisma.course.findFirst({
            where: { id: courseId, isPublished: true, tenantId },
            include: { Lesson: { orderBy: { order: 'asc' } } },
        });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        return course;
    }
    async listAll(tenantId = 'public') {
        return this.prisma.course.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: { Lesson: true },
        });
    }
    ensureInstructorAccess(course, actorId, actorRole) {
        if (actorRole === client_1.Role.INSTRUCTOR && course?.instructorId && actorId !== course.instructorId) {
            throw new common_1.NotFoundException('Bu kurs için yetkiniz yok');
        }
    }
    async addSchedule(courseId, dto, actorId, actorRole, tenantId = 'public') {
        const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        this.ensureInstructorAccess(course, actorId, actorRole);
        let liveSessionId = undefined;
        let meetingUrl = dto.meetingUrl;
        if (!meetingUrl) {
            const live = await this.prisma.liveSession.create({
                data: {
                    courseId,
                    instructorId: course.instructorId ?? actorId ?? '',
                    topic: dto.title,
                    status: 'SCHEDULED',
                    startedAt: new Date(dto.startAt),
                    metadata: dto.description ? { note: dto.description } : client_1.Prisma.JsonNull,
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
    async listSchedule(courseId, tenantId = 'public') {
        const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        return this.prisma.courseSchedule.findMany({
            where: { courseId },
            orderBy: { startAt: 'asc' },
        });
    }
    async scheduleIcs(courseId, tenantId = 'public') {
        const course = await this.prisma.course.findFirst({ where: { id: courseId, tenantId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
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
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], CoursesService);
function escapeIcs(text) {
    return text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}
function formatUtc(date) {
    return (0, date_fns_1.format)(date, "yyyyMMdd'T'HHmmss'Z'");
}
//# sourceMappingURL=courses.service.js.map