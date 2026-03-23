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
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
let BookingService = class BookingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        return this.prisma.lessonBooking.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                instructorId: dto.instructorId,
                studentId: dto.studentId,
                scheduledStart: new Date(dto.start),
                scheduledEnd: new Date(dto.end),
                meetingLink: dto.meetingLink,
                status: 'scheduled',
            },
        });
    }
    async listForInstructor(id) {
        return this.prisma.lessonBooking.findMany({
            where: { instructorId: id },
            orderBy: { scheduledStart: 'asc' },
        });
    }
    async listForStudent(id) {
        return this.prisma.lessonBooking.findMany({
            where: { studentId: id },
            orderBy: { scheduledStart: 'asc' },
        });
    }
    async cancel(id) {
        return this.prisma.lessonBooking.update({ where: { id }, data: { status: 'canceled' } });
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingService);
//# sourceMappingURL=booking.service.js.map