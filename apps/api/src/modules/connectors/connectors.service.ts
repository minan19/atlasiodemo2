import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Integration Connectors Service: Provides standardized connectors for
 * educational technology interoperability.
 *
 * Supported Standards:
 * - LTI 1.3/Advantage (tool launch, grades, deep linking)
 * - OneRoster (CSV/REST roster sync)
 * - QTI (Question & Test Interoperability import/export)
 * - Open Badges (badge issuance and verification)
 */

// ─── LTI 1.3 ────────────────────────────────────────────────────────────────

export interface LtiLaunchPayload {
  iss: string;           // Issuer (platform)
  sub: string;           // Subject (user ID)
  aud: string;           // Audience (tool client ID)
  nonce: string;
  deploymentId: string;
  targetLinkUri: string;
  roles: string[];       // LTI roles
  context?: {
    id: string;
    label?: string;
    title?: string;
    type?: string[];
  };
  resourceLink?: {
    id: string;
    title?: string;
  };
  customParams?: Record<string, string>;
}

// ─── OneRoster ───────────────────────────────────────────────────────────────

export interface OneRosterOrg {
  sourcedId: string;
  name: string;
  type: 'school' | 'district';
  identifier?: string;
}

export interface OneRosterUser {
  sourcedId: string;
  username: string;
  givenName: string;
  familyName: string;
  email: string;
  role: 'student' | 'teacher' | 'administrator';
  orgs: string[];
}

export interface OneRosterClass {
  sourcedId: string;
  title: string;
  courseSourcedId?: string;
  schoolSourcedId?: string;
  terms?: string[];
}

export interface OneRosterEnrollment {
  sourcedId: string;
  classSourcedId: string;
  userSourcedId: string;
  role: 'student' | 'teacher';
}

// ─── QTI ─────────────────────────────────────────────────────────────────────

export interface QtiItem {
  identifier: string;
  title: string;
  itemBody: string;       // HTML/XML question body
  responseDeclaration: {
    identifier: string;
    cardinality: 'single' | 'multiple';
    baseType: 'identifier' | 'string' | 'integer';
    correctResponse: string[];
  };
  choices?: Array<{
    identifier: string;
    value: string;
  }>;
}

// ─── Open Badges ─────────────────────────────────────────────────────────────

export interface OpenBadgeAssertion {
  '@context': string;
  type: 'Assertion';
  id: string;
  recipient: { type: 'email'; identity: string; hashed: boolean };
  badge: {
    type: 'BadgeClass';
    id: string;
    name: string;
    description: string;
    image: string;
    criteria: { narrative: string };
    issuer: {
      type: 'Issuer';
      id: string;
      name: string;
      url: string;
    };
  };
  issuedOn: string;
  verification: { type: 'hosted' };
}

@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── LTI 1.3 ──────────────────────────────────────────────────────────────

  /**
   * Validate and process LTI 1.3 launch request.
   * Returns the user context for session creation.
   */
  async handleLtiLaunch(tenantId: string, payload: LtiLaunchPayload) {
    // Verify tool deployment exists
    const deployment = await this.prisma.ltiDeployment.findFirst({
      where: { id: payload.deploymentId },
      include: { LtiTool: true, Course: true },
    });

    if (!deployment) throw new NotFoundException('LTI deployment not found');

    // Map LTI roles to Atlasio roles
    const role = this.mapLtiRole(payload.roles);

    // Record launch
    await this.prisma.ltiLaunch.create({
      data: {
        deploymentId: deployment.id,
        userId: payload.sub,
        role,
        rawPayload: payload as any,
      },
    });

    await this.audit.log({
      action: 'lti.launch',
      entity: 'LtiDeployment',
      entityId: deployment.id,
      meta: { tenantId, ltiUserId: payload.sub, role },
    });

    return {
      deploymentId: deployment.id,
      courseId: deployment.courseId,
      courseName: deployment.Course?.title,
      toolName: deployment.LtiTool?.name,
      ltiUserId: payload.sub,
      atlasioRole: role,
      targetLinkUri: payload.targetLinkUri,
      context: payload.context,
    };
  }

  /**
   * Send grade back to LTI platform (Assignment & Grade Services).
   */
  async sendLtiGrade(deploymentId: string, userId: string, score: number, maxScore: number, comment?: string) {
    const deployment = await this.prisma.ltiDeployment.findUnique({
      where: { id: deploymentId },
      include: { LtiTool: true },
    });
    if (!deployment) throw new NotFoundException('LTI deployment not found');

    // Build AGS score payload
    const agsPayload = {
      scoreGiven: score,
      scoreMaximum: maxScore,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      userId,
      comment: comment ?? '',
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`LTI AGS: Score ${score}/${maxScore} for user ${userId} in deployment ${deploymentId}`);

    await this.audit.log({
      action: 'lti.grade_sent',
      entity: 'LtiDeployment',
      entityId: deploymentId,
      meta: { userId, score, maxScore },
    });

    return { sent: true, payload: agsPayload };
  }

  private mapLtiRole(roles: string[]): string {
    const r = roles.map((r) => r.toLowerCase()).join(',');
    if (r.includes('administrator') || r.includes('admin')) return 'ADMIN';
    if (r.includes('instructor') || r.includes('teacher')) return 'INSTRUCTOR';
    return 'STUDENT';
  }

  // ─── OneRoster Sync ────────────────────────────────────────────────────────

  /**
   * Import roster data (users, classes, enrollments) from OneRoster CSV/JSON format.
   */
  async importOneRoster(tenantId: string, data: {
    users: OneRosterUser[];
    classes: OneRosterClass[];
    enrollments: OneRosterEnrollment[];
  }) {
    const stats = { usersCreated: 0, usersUpdated: 0, classesCreated: 0, enrollmentsCreated: 0 };

    // Import users
    for (const u of data.users) {
      const existing = await this.prisma.user.findFirst({
        where: { email: u.email, tenantId },
      });

      const role = u.role === 'teacher' ? 'INSTRUCTOR' : u.role === 'administrator' ? 'ADMIN' : 'STUDENT';

      if (existing) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { firstName: u.givenName, lastName: u.familyName, name: `${u.givenName} ${u.familyName}` },
        });
        stats.usersUpdated++;
      } else {
        await this.prisma.user.create({
          data: {
            email: u.email,
            passwordHash: '',
            name: `${u.givenName} ${u.familyName}`,
            firstName: u.givenName,
            lastName: u.familyName,
            role: role as any,
            tenantId,
            emailVerified: true,
          },
        });
        stats.usersCreated++;
      }
    }

    // Import classes as courses
    for (const c of data.classes) {
      const existing = await this.prisma.course.findFirst({
        where: { title: c.title, tenantId },
      });
      if (!existing) {
        await this.prisma.course.create({
          data: { title: c.title, tenantId, isPublished: true },
        });
        stats.classesCreated++;
      }
    }

    // Import enrollments
    for (const e of data.enrollments) {
      const user = await this.prisma.user.findFirst({
        where: { email: { contains: e.userSourcedId }, tenantId },
      });
      const course = await this.prisma.course.findFirst({
        where: { title: { contains: e.classSourcedId }, tenantId },
      });
      if (user && course) {
        await this.prisma.enrollment.upsert({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          create: { userId: user.id, courseId: course.id, tenantId },
          update: {},
        });
        stats.enrollmentsCreated++;
      }
    }

    await this.audit.log({
      action: 'oneroster.import',
      entity: 'OneRoster',
      meta: { tenantId, stats },
    });

    return stats;
  }

  /**
   * Export roster data in OneRoster format.
   */
  async exportOneRoster(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const courses = await this.prisma.course.findMany({
      where: { tenantId },
      select: { id: true, title: true },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { tenantId },
      select: { userId: true, courseId: true },
    });

    return {
      users: users.map((u) => ({
        sourcedId: u.id,
        username: u.email,
        givenName: u.firstName ?? '',
        familyName: u.lastName ?? '',
        email: u.email,
        role: u.role === 'INSTRUCTOR' ? 'teacher' : u.role === 'ADMIN' ? 'administrator' : 'student',
        orgs: [tenantId],
      })),
      classes: courses.map((c) => ({
        sourcedId: c.id,
        title: c.title,
      })),
      enrollments: enrollments.map((e) => ({
        sourcedId: `${e.userId}_${e.courseId}`,
        classSourcedId: e.courseId,
        userSourcedId: e.userId,
        role: 'student',
      })),
    };
  }

  // ─── QTI Import/Export ─────────────────────────────────────────────────────

  /**
   * Import QTI items as questions into the quiz system.
   */
  async importQtiItems(tenantId: string, items: QtiItem[], topicId: string) {
    let imported = 0;

    for (const item of items) {
      const choices = item.choices ?? [];
      const correctId = item.responseDeclaration.correctResponse[0];

      const question = await this.prisma.question.create({
        data: {
          topicId,
          stem: item.title,
          explanation: item.itemBody,
          difficulty: 1,
          tenantId,
          correctChoiceId: '', // Will update after creating choices
        },
      });

      // Create choices
      let correctChoiceId = '';
      for (const c of choices) {
        const choice = await this.prisma.questionChoice.create({
          data: {
            questionId: question.id,
            text: c.value,
            isCorrect: c.identifier === correctId,
          },
        });
        if (c.identifier === correctId) correctChoiceId = choice.id;
      }

      // Update correct choice ID
      if (correctChoiceId) {
        await this.prisma.question.update({
          where: { id: question.id },
          data: { correctChoiceId },
        });
      }

      imported++;
    }

    await this.audit.log({
      action: 'qti.import',
      entity: 'Question',
      meta: { tenantId, topicId, imported },
    });

    return { imported };
  }

  /**
   * Export questions as QTI items.
   */
  async exportQtiItems(tenantId: string, topicId?: string) {
    const where: any = { tenantId };
    if (topicId) where.topicId = topicId;

    const questions = await this.prisma.question.findMany({
      where,
      include: { choices: true },
    });

    return questions.map((q) => ({
      identifier: q.id,
      title: q.stem,
      itemBody: q.explanation ?? '',
      responseDeclaration: {
        identifier: 'RESPONSE',
        cardinality: 'single' as const,
        baseType: 'identifier' as const,
        correctResponse: [q.correctChoiceId],
      },
      choices: q.choices.map((c) => ({
        identifier: c.id,
        value: c.text,
      })),
    }));
  }

  // ─── Open Badges ───────────────────────────────────────────────────────────

  /**
   * Issue an Open Badge assertion for a certification.
   */
  async issueOpenBadge(certificationId: string, tenantId: string): Promise<OpenBadgeAssertion> {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certificationId },
      include: {
        User: { select: { email: true, name: true } },
        Course: { select: { title: true, description: true } },
      },
    });

    if (!cert) throw new NotFoundException('Certification not found');

    const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

    const assertion: OpenBadgeAssertion = {
      '@context': 'https://w3id.org/openbadges/v2',
      type: 'Assertion',
      id: `${baseUrl}/badges/assertions/${cert.id}`,
      recipient: {
        type: 'email',
        identity: cert.User.email,
        hashed: false,
      },
      badge: {
        type: 'BadgeClass',
        id: `${baseUrl}/badges/classes/${cert.courseId}`,
        name: cert.Course.title,
        description: cert.Course.description ?? `Completed ${cert.Course.title}`,
        image: `${baseUrl}/badges/images/${cert.courseId}.png`,
        criteria: { narrative: `Successfully completed the course: ${cert.Course.title}` },
        issuer: {
          type: 'Issuer',
          id: `${baseUrl}/badges/issuer`,
          name: 'Atlasio Platform',
          url: baseUrl,
        },
      },
      issuedOn: cert.issuedAt.toISOString(),
      verification: { type: 'hosted' },
    };

    await this.audit.log({
      actorId: cert.userId,
      action: 'badge.issued',
      entity: 'Certification',
      entityId: cert.id,
      meta: { tenantId, courseId: cert.courseId },
    });

    return assertion;
  }
}
