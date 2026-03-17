import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLtiToolDto, CreateLtiDeploymentDto, LtiLaunchDto, UpdateLtiToolDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LtiService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listTools() {
    return this.prisma.ltiTool.findMany({ include: { LtiDeployment: true } });
  }

  async createTool(dto: CreateLtiToolDto, actorId?: string) {
    const tool = await this.prisma.ltiTool.create({ data: dto });
    await this.audit.log({
      actorId,
      action: 'lti.tool.create',
      entity: 'LtiTool',
      entityId: tool.id,
    });
    return tool;
  }

  async updateTool(toolId: string, dto: UpdateLtiToolDto, actorId?: string) {
    const existing = await this.prisma.ltiTool.findUnique({ where: { id: toolId } });
    if (!existing) throw new NotFoundException('LTI tool not found');
    const updated = await this.prisma.ltiTool.update({ where: { id: toolId }, data: dto });
    await this.audit.log({
      actorId,
      action: 'lti.tool.update',
      entity: 'LtiTool',
      entityId: toolId,
      meta: { changes: Object.keys(dto) },
    });
    return updated;
  }

  async createDeployment(dto: CreateLtiDeploymentDto, actorId?: string) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const deployment = await this.prisma.ltiDeployment.create({
      data: {
        LtiTool: { connect: { id: dto.toolId } },
        Course: { connect: { id: dto.courseId } },
        instructors: dto.instructors ?? [],
        learners: dto.learners ?? [],
      },
    });
    await this.audit.log({
      actorId,
      action: 'lti.deployment.create',
      entity: 'LtiDeployment',
      entityId: deployment.id,
    });
    return deployment;
  }

  async getDeploymentsForTool(toolId: string) {
    return this.prisma.ltiDeployment.findMany({
      where: { toolId },
      include: { LtiTool: true, LtiLaunch: true, Course: true },
    });
  }

  async processLaunch(dto: LtiLaunchDto) {
    const deployment = await this.prisma.ltiDeployment.findUnique({ where: { id: dto.deploymentId } });
    if (!deployment) throw new NotFoundException('Deployment not found');
    const launch = await this.prisma.ltiLaunch.create({
      data: {
        deploymentId: dto.deploymentId,
        userId: dto.userId,
        role: dto.role,
        rawPayload: (dto.rawPayload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
    if (deployment.status === 'ACTIVE') {
      await this.audit.log({
        action: 'lti.launch',
        entity: 'LtiLaunch',
        entityId: launch.id,
        meta: { role: dto.role, userId: dto.userId, deploymentId: dto.deploymentId },
      });
    }
    return { status: 'ok', launchId: launch.id };
  }

  async rotateKeys() {
    const rotations = await this.prisma.ltiDeployment.findMany({
      where: { status: 'ACTIVE', keyRotation: { lte: new Date() } },
      take: 10,
    });
    await Promise.all(
      rotations.map((deployment: any) =>
        this.prisma.ltiDeployment.update({
          where: { id: deployment.id },
          data: { keyRotation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        }),
      ),
    );
    return { rotated: rotations.length };
  }
}
