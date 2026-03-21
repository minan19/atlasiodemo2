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
exports.LiveService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let LiveService = class LiveService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async createSession(dto, instructorId) {
        const metadataValue = {
            ...(dto.metadata ?? {}),
            ...(dto.meetingUrl ? { meetingUrl: dto.meetingUrl } : {}),
        };
        const session = await this.prisma.liveSession.create({
            data: {
                courseId: dto.courseId,
                instructorId,
                topic: dto.topic,
                metadata: (Object.keys(metadataValue).length ? metadataValue : client_1.Prisma.JsonNull),
                status: 'RUNNING',
                startedAt: new Date(),
            },
        });
        await this.prisma.whiteboardSession.upsert({
            where: { liveSessionId: session.id },
            create: { liveSessionId: session.id },
            update: {},
        });
        await this.audit.log({
            action: 'live.session.start',
            entity: 'LiveSession',
            entityId: session.id,
            actorId: instructorId,
        });
        return session;
    }
    async createLegacySession(dto) {
        return this.prisma.liveSessionLegacy.create({
            data: {
                id: crypto.randomUUID(),
                instructorId: dto.instructorId,
                classCode: `CLS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                language: dto.language,
                targetLevel: dto.targetLevel,
            },
        });
    }
    async updateSession(sessionId, dto, actorId) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Live session not found');
        const metadataValue = dto.metadata === undefined ? session.metadata : (dto.metadata ?? client_1.Prisma.JsonNull);
        const updated = await this.prisma.liveSession.update({
            where: { id: sessionId },
            data: {
                ...dto,
                updatedAt: new Date(),
                endedAt: dto.status === 'ENDED' ? new Date() : session.endedAt,
                metadata: metadataValue,
            },
        });
        await this.audit.log({
            action: 'live.session.update',
            entity: 'LiveSession',
            entityId: sessionId,
            actorId,
            meta: { status: dto.status, isRecording: dto.isRecording },
        });
        return updated;
    }
    async joinSession(sessionId, userId, role) {
        const session = await this.prisma.liveSession.findUnique({
            where: { id: sessionId },
            include: { WhiteboardSession: true, Course: true },
        });
        if (!session)
            throw new common_1.NotFoundException('Live session not found');
        if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
            const enrolled = await this.prisma.enrollment.findUnique({
                where: { userId_courseId: { userId, courseId: session.courseId } },
                select: { id: true },
            });
            if (!enrolled)
                throw new common_1.BadRequestException('Bu canlı derse kayıtlı değilsiniz');
        }
        await this.prisma.liveSessionParticipant.upsert({
            where: { sessionId_userId: { sessionId, userId } },
            create: { sessionId, userId, role: role },
            update: { role: role },
        });
        const wb = await this.prisma.whiteboardSession.upsert({
            where: { liveSessionId: sessionId },
            create: { liveSessionId: sessionId },
            update: {},
        });
        const meetingUrl = session.metadata?.meetingUrl ??
            (session.Course)?.meetingUrl ??
            undefined;
        return {
            sessionId,
            role,
            whiteboardSessionId: wb.id,
            meetingUrl,
        };
    }
    async listLegacy() {
        return this.prisma.liveSessionLegacy.findMany({
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: {
                attendance: true,
            },
        });
    }
    async joinLegacy(sessionId, studentId) {
        const session = await this.prisma.liveSessionLegacy.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Legacy session not found');
        const existingAttendance = await this.prisma.attendance.findFirst({
            where: { sessionId, studentId },
        });
        if (existingAttendance) {
            await this.prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: { joinTime: new Date() },
            });
        }
        else {
            await this.prisma.attendance.create({
                data: { id: crypto.randomUUID(), sessionId, studentId },
            });
        }
        return { sessionId, classCode: session.classCode, targetLevel: session.targetLevel, status: session.status };
    }
    async addParticipant(sessionId, dto) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Live session not found');
        const existing = await this.prisma.liveSessionParticipant.findFirst({
            where: { sessionId, userId: dto.userId },
        });
        if (existing) {
            return this.prisma.liveSessionParticipant.update({
                where: { id: existing.id },
                data: { micOn: dto.micOn, cameraOn: dto.cameraOn, screenShare: dto.screenShare },
            });
        }
        return this.prisma.liveSessionParticipant.create({
            data: {
                sessionId,
                userId: dto.userId,
                role: dto.role ?? 'STUDENT',
                micOn: dto.micOn ?? false,
                cameraOn: dto.cameraOn ?? false,
                screenShare: dto.screenShare ?? false,
            },
        });
    }
    async requestPresentation(dto, requesterId) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: dto.sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Live session not found');
        const existing = await this.prisma.presentationRequest.findFirst({
            where: { sessionId: dto.sessionId, requesterId, status: 'PENDING' },
        });
        if (existing)
            throw new common_1.BadRequestException('Zaten bekleyen bir sunum isteğiniz var');
        const request = await this.prisma.presentationRequest.create({
            data: {
                sessionId: dto.sessionId,
                requesterId,
                notes: dto.notes,
            },
        });
        await this.audit.log({
            action: 'live.requestPresentation',
            entity: 'PresentationRequest',
            entityId: request.id,
            actorId: requesterId,
        });
        return request;
    }
    async respondPresentation(dto, responderId) {
        const request = await this.prisma.presentationRequest.findUnique({ where: { id: dto.requestId } });
        if (!request)
            throw new common_1.NotFoundException('Presentation request not found');
        if (request.status !== 'PENDING')
            throw new common_1.BadRequestException('Request already handled');
        const updated = await this.prisma.presentationRequest.update({
            where: { id: dto.requestId },
            data: {
                status: dto.approve ? 'APPROVED' : 'REJECTED',
                respondedAt: new Date(),
                notes: dto.notes,
            },
        });
        await this.audit.log({
            action: 'live.presentationResponse',
            entity: 'PresentationRequest',
            entityId: updated.id,
            actorId: responderId,
            meta: { approved: dto.approve },
        });
        return updated;
    }
    async sendMessage(dto, senderId) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: dto.sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Live session not found');
        const message = await this.prisma.communicationMessage.create({
            data: {
                sessionId: dto.sessionId,
                senderId,
                role: ((await this.prisma.user.findUnique({ where: { id: senderId } }))?.role ?? 'STUDENT'),
                type: dto.type ?? 'CHAT',
                content: dto.content,
                metadata: (dto.metadata ?? client_1.Prisma.JsonNull),
            },
        });
        await this.audit.log({
            action: 'live.message',
            entity: 'CommunicationMessage',
            entityId: message.id,
            actorId: senderId,
            meta: { type: message.type },
        });
        return message;
    }
    async listSessions(courseId) {
        return this.prisma.liveSession.findMany({
            where: courseId ? { courseId } : undefined,
            orderBy: { startedAt: 'desc' },
            include: { LiveSessionParticipant: true, CommunicationMessage: { take: 5, orderBy: { createdAt: 'desc' } } },
        });
    }
    async createBreakoutRooms(sessionId, instructorId, count) {
        const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
        if (!session || session.instructorId !== instructorId) {
            throw new common_1.BadRequestException('Bunu yapmaya yetkiniz yok.');
        }
        const createdRooms = [];
        for (let i = 1; i <= count; i++) {
            const room = await this.prisma.liveSessionBreakout.create({
                data: { liveSessionId: sessionId, name: `Room ${i}`, maxCapacity: 10 }
            });
            createdRooms.push(room);
        }
        return createdRooms;
    }
    async assignToBreakoutRoom(sessionId, participantId, breakoutRoomId) {
        return this.prisma.liveSessionParticipant.update({
            where: { sessionId_userId: { sessionId, userId: participantId } },
            data: { breakoutRoomId }
        });
    }
};
exports.LiveService = LiveService;
exports.LiveService = LiveService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], LiveService);
//# sourceMappingURL=live.service.js.map