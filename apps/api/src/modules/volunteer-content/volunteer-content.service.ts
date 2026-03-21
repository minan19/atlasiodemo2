import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { VolunteerContentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVolunteerContentDto,
  CreateVolunteerFeedbackDto,
  UpdateVolunteerContentStatusDto,
} from './dto';
import { randomUUID } from 'crypto';

@Injectable()
export class VolunteerContentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(dto: CreateVolunteerContentDto, instructorId: string) {
    const now = new Date();
    const data: Prisma.VolunteerContentCreateInput = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      contentType: dto.contentType,
      resourceUrl: dto.resourceUrl,
      Course: dto.courseId ? { connect: { id: dto.courseId } } : undefined,
      isPublic: dto.isPublic ?? true,
      updatedAt: now,
      User_VolunteerContent_instructorIdToUser: { connect: { id: instructorId } },
    };
    const record = await this.prisma.volunteerContent.create({ data });
    await this.audit.log({
      actorId: instructorId,
      action: 'volunteerContent.create',
      entity: 'VolunteerContent',
      entityId: record.id,
      meta: { title: record.title },
    });
    return record;
  }

  async listForInstructor(instructorId: string) {
    return this.prisma.volunteerContent.findMany({
      where: { instructorId },
      include: { VolunteerContentFeedback: true, Course: true, User_VolunteerContent_approvedByIdToUser: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async listForAdmin(filter?: { status?: VolunteerContentStatus }) {
    return this.prisma.volunteerContent.findMany({
      where: { status: filter?.status },
      include: { User_VolunteerContent_instructorIdToUser: true, Course: true, VolunteerContentFeedback: true, User_VolunteerContent_approvedByIdToUser: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async setStatus(id: string, dto: UpdateVolunteerContentStatusDto, actorId: string) {
    const content = await this.prisma.volunteerContent.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Gönüllü içerik bulunamadı');
    const update = await this.prisma.volunteerContent.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        reviewedAt: new Date(),
        User_VolunteerContent_approvedByIdToUser: { connect: { id: actorId } },
      },
    });
    await this.audit.log({
      actorId,
      action: 'volunteerContent.status',
      entity: 'VolunteerContent',
      entityId: update.id,
      meta: { status: dto.status, notes: dto.notes },
    });
    return update;
  }

  async addFeedback(contentId: string, dto: CreateVolunteerFeedbackDto, userId: string) {
    const content = await this.prisma.volunteerContent.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Gönüllü içerik bulunamadı');
    if (content.status !== VolunteerContentStatus.APPROVED) {
      throw new ForbiddenException('Sadece onaylı gönüllü içeriklere geri bildirim verilebilir');
    }
    const feedback = await this.prisma.volunteerContentFeedback.upsert({
      where: {
        contentId_userId: { contentId, userId },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        VolunteerContent: { connect: { id: contentId } },
        User: { connect: { id: userId } },
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: 'volunteerContent.feedback',
      entity: 'VolunteerContentFeedback',
      entityId: feedback.id,
      meta: { rating: feedback.rating },
    });
    return feedback;
  }

  private async computeValueScore(instructorId: string) {
    const [approvedCount, feedbackStats] = await Promise.all([
      this.prisma.volunteerContent.count({
        where: { instructorId, status: VolunteerContentStatus.APPROVED },
      }),
      this.prisma.volunteerContentFeedback.aggregate({
        _count: true,
        _avg: { rating: true },
        where: { VolunteerContent: { instructorId, status: VolunteerContentStatus.APPROVED } },
      }),
    ]);
    const feedbackCount = typeof feedbackStats._count === 'number' ? feedbackStats._count : (feedbackStats._count as any)?._all ?? 0;
    const averageRating = feedbackStats._avg.rating ?? 0;
    const score = new Prisma.Decimal(approvedCount)
      .mul(10)
      .plus(new Prisma.Decimal(averageRating).mul(feedbackCount as number).mul(2))
      .plus((feedbackCount as number) * 2);
    return {
      approvedCount,
      feedbackCount,
      averageRating: new Prisma.Decimal(averageRating),
      score,
    };
  }

  async recordValueScore(instructorId: string, actorId?: string) {
    const summary = await this.computeValueScore(instructorId);
    const record = await this.prisma.instructorValueScore.create({
      data: {
        instructorId,
        approvedContents: summary.approvedCount,
        feedbackCount: summary.feedbackCount,
        averageRating: summary.averageRating,
        score: summary.score,
        ...(actorId ? { recordedById: actorId } : {}),
      },
    });
    await this.audit.log({
      actorId,
      action: 'instructorValueScore.record',
      entity: 'InstructorValueScore',
      entityId: record.id,
      meta: { approvedCount: summary.approvedCount, feedbackCount: summary.feedbackCount },
    });
    return { summary, record };
  }

  async getLatestValueScore(instructorId: string) {
    const summary = await this.computeValueScore(instructorId);
    const record = await this.prisma.instructorValueScore.findFirst({
      where: { instructorId },
      orderBy: { computedAt: 'desc' },
    });
    return { summary, record };
  }

  async getInstructorScores(instructorId: string, limit = 7) {
    return this.prisma.instructorValueScore.findMany({
      where: { instructorId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }
}
