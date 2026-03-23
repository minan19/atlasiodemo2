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
exports.SmartClassroomService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SmartClassroomService = class SmartClassroomService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStatus(liveSessionId) {
        return this.prisma.smartClassroom.upsert({
            where: { liveSessionId },
            update: {},
            create: { liveSessionId }
        });
    }
    async updateEnvironment(liveSessionId, instructorId, dto) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: liveSessionId } });
        if (!session || session.instructorId !== instructorId) {
            throw new common_1.ForbiddenException('Akıllı Sınıf cihazlarını yönetme yetkiniz yok.');
        }
        return this.prisma.smartClassroom.update({
            where: { liveSessionId },
            data: {
                ...(dto.lighting !== undefined && { lighting: dto.lighting }),
                ...(dto.climate !== undefined && { climate: dto.climate }),
                ...(dto.mode !== undefined && { mode: dto.mode }),
            }
        });
    }
};
exports.SmartClassroomService = SmartClassroomService;
exports.SmartClassroomService = SmartClassroomService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SmartClassroomService);
//# sourceMappingURL=smart-classroom.service.js.map