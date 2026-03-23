import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LessonsService', () => {
  let service: LessonsService;

  beforeEach(() => {
    const prisma = {
      course: { findUnique: jest.fn() },
      lesson: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    } as unknown as PrismaService;
    service = new LessonsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
