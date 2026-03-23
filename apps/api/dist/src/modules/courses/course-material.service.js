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
exports.CourseMaterialService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CourseMaterialService = class CourseMaterialService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMaterials(courseId) {
        return this.prisma.courseMaterial.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getPastExams(courseId) {
        return this.prisma.courseMaterial.findMany({
            where: { courseId, type: 'PAST_EXAM' },
            orderBy: { createdAt: 'desc' }
        });
    }
    async addMaterial(dto, instructorId) {
        const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
        if (!course || course.instructorId !== instructorId) {
            throw new common_1.ForbiddenException('Bu kursa materyal ekleme yetkiniz yok.');
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
};
exports.CourseMaterialService = CourseMaterialService;
exports.CourseMaterialService = CourseMaterialService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CourseMaterialService);
//# sourceMappingURL=course-material.service.js.map