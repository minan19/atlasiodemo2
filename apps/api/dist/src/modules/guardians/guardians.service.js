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
exports.GuardiansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GuardiansService = class GuardiansService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async linkStudent(guardianId, studentEmail, tenantId) {
        const student = await this.prisma.user.findFirst({
            where: { email: studentEmail, tenantId, role: 'STUDENT' },
        });
        if (!student) {
            throw new common_1.ForbiddenException('Öğrenci bulunamadı veya yetkisiz.');
        }
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
    async getMyStudentsOverview(guardianId, tenantId) {
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
};
exports.GuardiansService = GuardiansService;
exports.GuardiansService = GuardiansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuardiansService);
//# sourceMappingURL=guardians.service.js.map