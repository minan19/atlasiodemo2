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
exports.LessonsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonsService = class LessonsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(courseId, dto) {
        const course = await this.prisma.course.findUnique({ where: { id: courseId } });
        if (!course)
            throw new common_1.BadRequestException('Course not found');
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
    listByCourse(courseId) {
        return this.prisma.lessonContent.findMany({
            where: { courseId },
            orderBy: { order: 'asc' },
        });
    }
    async get(courseId, lessonId) {
        const lesson = await this.prisma.lessonContent.findFirst({
            where: { id: lessonId, courseId },
        });
        if (!lesson)
            throw new common_1.BadRequestException('Lesson not found');
        return lesson;
    }
    async markComplete(userId, courseId, lessonId) {
        const lesson = await this.prisma.lessonContent.findFirst({
            where: { id: lessonId, courseId },
            select: { id: true },
        });
        if (!lesson)
            throw new common_1.BadRequestException('Ders bulunamadı');
        await this.prisma.lessonProgress.upsert({
            where: { userId_lessonId: { userId, lessonId } },
            update: { completedAt: new Date() },
            create: { userId, lessonId, courseId },
        });
        return this.courseProgress(userId, courseId);
    }
    async courseProgress(userId, courseId) {
        const [total, done] = await Promise.all([
            this.prisma.lessonContent.count({ where: { courseId } }),
            this.prisma.lessonProgress.count({ where: { userId, courseId } }),
        ]);
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
        return { courseId, total, done, percentage };
    }
    async allProgress(userId, courseIds) {
        if (courseIds.length === 0)
            return [];
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
};
exports.LessonsService = LessonsService;
exports.LessonsService = LessonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonsService);
//# sourceMappingURL=lessons.service.js.map