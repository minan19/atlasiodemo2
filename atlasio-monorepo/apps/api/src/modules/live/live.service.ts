import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import {
  CreateLiveSessionDto,
  CreateLegacyLiveDto,
  UpdateLiveSessionDto,
  ParticipantStateDto,
  PresentationRequestDto,
  PresentationResponseDto,
  CommunicationDto,
  JoinLegacyDto,
} from './dto';

@Injectable()
export class LiveService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createSession(dto: CreateLiveSessionDto, instructorId: string) {
    const metadataValue = {
      ...(dto.metadata ?? {}),
      ...(dto.meetingUrl ? { meetingUrl: dto.meetingUrl } : {}),
    };
    const session = await this.prisma.liveSession.create({
      data: {
        courseId: dto.courseId,
        instructorId,
        topic: dto.topic,
        metadata: (Object.keys(metadataValue).length ? metadataValue : Prisma.JsonNull) as Prisma.InputJsonValue,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
    // auto-start whiteboard
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

  async createLegacySession(dto: CreateLegacyLiveDto) {
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

  async updateSession(sessionId: string, dto: UpdateLiveSessionDto, actorId?: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Live session not found');
    const metadataValue = dto.metadata === undefined ? (session.metadata as any) : (dto.metadata ?? Prisma.JsonNull);
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

  async joinSession(sessionId: string, userId: string, role: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { WhiteboardSession: true, Course: true },
    });
    if (!session) throw new NotFoundException('Live session not found');
    // access control: students must be enrolled
    if (role !== 'ADMIN' && role !== 'INSTRUCTOR') {
      const enrolled = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: session.courseId } },
        select: { id: true },
      });
      if (!enrolled) throw new BadRequestException('Bu canlı derse kayıtlı değilsiniz');
    }
    // ensure participant record
    await this.prisma.liveSessionParticipant.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, role: role as any },
      update: { role: role as any },
    });
    // ensure whiteboard exists
    const wb = await this.prisma.whiteboardSession.upsert({
      where: { liveSessionId: sessionId },
      create: { liveSessionId: sessionId },
      update: {},
    });
    const meetingUrl =
      (session.metadata as any)?.meetingUrl ??
      ((session as any).Course)?.meetingUrl ??
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

  async joinLegacy(sessionId: string, studentId: string) {
    const session = await this.prisma.liveSessionLegacy.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Legacy session not found');
    // Attendance'da composite unique yoktur; findFirst + create pattern kullanılır.
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: { sessionId, studentId },
    });
    if (existingAttendance) {
      await this.prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: { joinTime: new Date() },
      });
    } else {
      await this.prisma.attendance.create({
        data: { id: crypto.randomUUID(), sessionId, studentId },
      });
    }
    return { sessionId, classCode: session.classCode, targetLevel: session.targetLevel, status: session.status };
  }

  async addParticipant(sessionId: string, dto: ParticipantStateDto) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Live session not found');
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
        role: (dto.role as any) ?? 'STUDENT',
        micOn: dto.micOn ?? false,
        cameraOn: dto.cameraOn ?? false,
        screenShare: dto.screenShare ?? false,
      },
    });
  }

  async requestPresentation(dto: PresentationRequestDto, requesterId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('Live session not found');
    const existing = await this.prisma.presentationRequest.findFirst({
      where: { sessionId: dto.sessionId, requesterId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('Zaten bekleyen bir sunum isteğiniz var');
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

  async respondPresentation(dto: PresentationResponseDto, responderId: string) {
    const request = await this.prisma.presentationRequest.findUnique({ where: { id: dto.requestId } });
    if (!request) throw new NotFoundException('Presentation request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already handled');
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

  async sendMessage(dto: CommunicationDto, senderId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('Live session not found');
    const message = await this.prisma.communicationMessage.create({
      data: {
        sessionId: dto.sessionId,
        senderId,
        role: ((await this.prisma.user.findUnique({ where: { id: senderId } }))?.role ?? 'STUDENT') as any,
        type: dto.type ?? 'CHAT',
        content: dto.content,
        metadata: (dto.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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

  async listSessions(courseId?: string) {
    return this.prisma.liveSession.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { startedAt: 'desc' },
      include: { LiveSessionParticipant: true, CommunicationMessage: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
  }

  // ─── ZOOM BENZERİ BREAKOUT ROOMS MANTIĞI ─────────────────────────────────
  
  async createBreakoutRooms(sessionId: string, instructorId: string, count: number) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session || session.instructorId !== instructorId) {
      throw new BadRequestException('Bunu yapmaya yetkiniz yok.');
    }

    const createdRooms: any[] = [];
    for (let i = 1; i <= count; i++) {
        const room = await this.prisma.liveSessionBreakout.create({
            data: { liveSessionId: sessionId, name: `Room ${i}`, maxCapacity: 10 }
        });
        createdRooms.push(room);
    }
    return createdRooms;
  }

  async assignToBreakoutRoom(sessionId: string, participantId: string, breakoutRoomId: string) {
      return this.prisma.liveSessionParticipant.update({
          where: { sessionId_userId: { sessionId, userId: participantId } }, // Participant ID aslında User ID'dir.
          data: { breakoutRoomId }
      });
  }
}
