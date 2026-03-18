import { RecommendationService } from './recommendation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const makeRedis = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
});

const makeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

const makePrisma = () => ({
  learningEvent: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn().mockResolvedValue(null),
  },
  recommendation: {
    create: jest.fn().mockResolvedValue({ id: 'rec-1' }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  user: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  course: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  enrollment: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

function buildService(redisOv: any = {}) {
  const prisma = makePrisma() as unknown as PrismaService;
  const audit = makeAudit() as unknown as AuditService;
  const redis = { ...makeRedis(), ...redisOv };
  return { service: new RecommendationService(prisma, audit, redis), prisma, redis };
}

// ─── Student Profile ─────────────────────────────────────────────────────────

describe('RecommendationService.computeStudentProfile', () => {
  it('boş event verisiyle yüksek risk skoru döner', async () => {
    const { service } = buildService();

    const profile = await service.computeStudentProfile('user-1', 'tenant-1');

    expect(profile.userId).toBe('user-1');
    expect(profile.totalEvents).toBe(0);
    expect(profile.riskScore).toBe(90); // Hiç event yok = yüksek risk
  });

  it('event verisiyle profil hesaplar', async () => {
    const { service, prisma } = buildService();
    (prisma.learningEvent.findMany as jest.Mock).mockResolvedValue([
      { eventType: 'CONTENT_VIEWED', payload: {}, createdAt: new Date() },
      { eventType: 'CONTENT_VIEWED', payload: {}, createdAt: new Date() },
      { eventType: 'QUIZ_ANSWERED', payload: { correct: true, topicId: 'math' }, createdAt: new Date() },
      { eventType: 'QUIZ_ANSWERED', payload: { correct: false, topicId: 'math' }, createdAt: new Date() },
      { eventType: 'LIVE_JOIN', payload: {}, createdAt: new Date() },
    ]);

    const profile = await service.computeStudentProfile('user-2', 'tenant-1');

    expect(profile.totalEvents).toBe(5);
    expect(profile.contentViewed).toBe(2);
    expect(profile.quizAnswered).toBe(2);
    expect(profile.quizCorrect).toBe(1);
    expect(profile.avgQuizScore).toBe(50);
    expect(profile.liveJoins).toBe(1);
  });

  it('Redis hatası olsa bile çalışır', async () => {
    const { service } = buildService({
      set: jest.fn().mockRejectedValue(new Error('Redis down')),
    });

    const profile = await service.computeStudentProfile('user-1', 'tenant-1');
    expect(profile).toBeDefined();
  });
});

// ─── Content Insights ────────────────────────────────────────────────────────

describe('RecommendationService.getContentInsights', () => {
  it('kurs yoksa boş liste döner', async () => {
    const { service } = buildService();
    const result = await service.getContentInsights('tenant-1');

    expect(result).toEqual([]);
  });
});

// ─── At-Risk Students ────────────────────────────────────────────────────────

describe('RecommendationService.getAtRiskStudents', () => {
  it('öğrenci yoksa boş liste döner', async () => {
    const { service } = buildService();
    const result = await service.getAtRiskStudents('tenant-1');

    expect(result).toEqual([]);
  });
});

// ─── User Recommendations ────────────────────────────────────────────────────

describe('RecommendationService.getUserRecommendations', () => {
  it('önerileri döner', async () => {
    const { service, prisma } = buildService();
    (prisma.recommendation.findMany as jest.Mock).mockResolvedValue([
      { id: 'rec-1', type: 'STUDENT_NEXT_STEP', reason: 'İyi performans' },
    ]);

    const result = await service.getUserRecommendations('user-1', 'tenant-1');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('STUDENT_NEXT_STEP');
  });
});
