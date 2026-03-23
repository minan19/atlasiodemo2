import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  beforeEach(() => {
    const prisma = {
      enrollment: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    service = new EnrollmentsService(prisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
