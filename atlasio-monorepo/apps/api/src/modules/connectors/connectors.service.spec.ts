import { NotFoundException } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

const makePrisma = (overrides: any = {}) => ({
  ltiDeployment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    ...overrides.ltiDeployment,
  },
  ltiLaunch: {
    create: jest.fn().mockResolvedValue({ id: 'launch-1' }),
    ...overrides.ltiLaunch,
  },
  user: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides.user,
  },
  course: {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    ...overrides.course,
  },
  enrollment: {
    upsert: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    ...overrides.enrollment,
  },
  question: {
    create: jest.fn().mockResolvedValue({ id: 'q-1' }),
    update: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    ...overrides.question,
  },
  questionChoice: {
    create: jest.fn().mockResolvedValue({ id: 'choice-1' }),
    ...overrides.questionChoice,
  },
  certification: {
    findUnique: jest.fn(),
    ...overrides.certification,
  },
});

function buildService(prismaOv: any = {}) {
  const prisma = makePrisma(prismaOv) as unknown as PrismaService;
  const audit = makeAudit() as unknown as AuditService;
  return { service: new ConnectorsService(prisma, audit), prisma, audit };
}

// ─── LTI Launch ──────────────────────────────────────────────────────────────

describe('ConnectorsService.handleLtiLaunch', () => {
  it('deployment bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ltiDeployment.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.handleLtiLaunch('tenant-1', {
      iss: 'https://lms.example.com',
      sub: 'user-ext-1',
      aud: 'client-123',
      nonce: 'abc',
      deploymentId: 'dep-1',
      targetLinkUri: 'https://atlasio.com/live/1',
      roles: ['Instructor'],
    })).rejects.toThrow(NotFoundException);
  });

  it('geçerli deployment ile launch işler', async () => {
    const { service, prisma } = buildService();
    (prisma.ltiDeployment.findFirst as jest.Mock).mockResolvedValue({
      id: 'dep-1',
      courseId: 'course-1',
      Course: { title: 'Math 101' },
      LtiTool: { name: 'ExternalTool' },
    });

    const result = await service.handleLtiLaunch('tenant-1', {
      iss: 'https://lms.example.com',
      sub: 'user-ext-1',
      aud: 'client-123',
      nonce: 'abc',
      deploymentId: 'dep-1',
      targetLinkUri: 'https://atlasio.com/live/1',
      roles: ['Instructor'],
    });

    expect(result.deploymentId).toBe('dep-1');
    expect(result.atlasioRole).toBe('INSTRUCTOR');
    expect(prisma.ltiLaunch.create).toHaveBeenCalledTimes(1);
  });
});

// ─── LTI Grade ───────────────────────────────────────────────────────────────

describe('ConnectorsService.sendLtiGrade', () => {
  it('deployment bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.ltiDeployment.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.sendLtiGrade('dep-1', 'user-1', 85, 100))
      .rejects.toThrow(NotFoundException);
  });

  it('başarılı grade gönderir', async () => {
    const { service, prisma } = buildService();
    (prisma.ltiDeployment.findUnique as jest.Mock).mockResolvedValue({
      id: 'dep-1',
      LtiTool: { name: 'Tool' },
    });

    const result = await service.sendLtiGrade('dep-1', 'user-1', 85, 100, 'Harika iş!');
    expect(result.sent).toBe(true);
    expect(result.payload.scoreGiven).toBe(85);
  });
});

// ─── OneRoster Export ────────────────────────────────────────────────────────

describe('ConnectorsService.exportOneRoster', () => {
  it('boş veri setinde boş roster döner', async () => {
    const { service } = buildService();
    const result = await service.exportOneRoster('tenant-1');

    expect(result.users).toEqual([]);
    expect(result.classes).toEqual([]);
    expect(result.enrollments).toEqual([]);
  });

  it('kullanıcı ve kursları OneRoster formatında döner', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', email: 'teacher@test.com', firstName: 'Ali', lastName: 'Yılmaz', role: 'INSTRUCTOR' },
      { id: 'u2', email: 'student@test.com', firstName: 'Ayşe', lastName: 'Kaya', role: 'STUDENT' },
    ]);
    (prisma.course.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', title: 'Matematik 101' },
    ]);

    const result = await service.exportOneRoster('tenant-1');

    expect(result.users).toHaveLength(2);
    expect(result.users[0].role).toBe('teacher');
    expect(result.users[1].role).toBe('student');
    expect(result.classes).toHaveLength(1);
  });
});

// ─── QTI Export ──────────────────────────────────────────────────────────────

describe('ConnectorsService.exportQtiItems', () => {
  it('soruları QTI formatında döner', async () => {
    const { service, prisma } = buildService();
    (prisma.question.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'q1', stem: '2+2=?', explanation: 'Temel toplama',
        correctChoiceId: 'ch-1',
        choices: [
          { id: 'ch-1', text: '4' },
          { id: 'ch-2', text: '5' },
        ],
      },
    ]);

    const result = await service.exportQtiItems('tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('q1');
    expect(result[0].title).toBe('2+2=?');
    expect(result[0].choices).toHaveLength(2);
  });
});

// ─── Open Badge ──────────────────────────────────────────────────────────────

describe('ConnectorsService.issueOpenBadge', () => {
  it('sertifika bulunamazsa NotFoundException fırlatır', async () => {
    const { service, prisma } = buildService();
    (prisma.certification.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.issueOpenBadge('cert-1', 'tenant-1'))
      .rejects.toThrow(NotFoundException);
  });

  it('geçerli Open Badge assertion döner', async () => {
    const { service, prisma } = buildService();
    (prisma.certification.findUnique as jest.Mock).mockResolvedValue({
      id: 'cert-1',
      userId: 'user-1',
      courseId: 'course-1',
      issuedAt: new Date(),
      User: { email: 'student@test.com', name: 'Test Student' },
      Course: { title: 'Advanced Math', description: 'İleri Matematik' },
    });

    const badge = await service.issueOpenBadge('cert-1', 'tenant-1');

    expect(badge['@context']).toContain('openbadges');
    expect(badge.type).toBe('Assertion');
    expect(badge.recipient.identity).toBe('student@test.com');
    expect(badge.badge.name).toBe('Advanced Math');
  });
});
