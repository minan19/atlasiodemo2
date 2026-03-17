import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    controller = new HealthController(prisma);
  });

  it('returns liveness payload', () => {
    const result = controller.basic();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('atlasio-api');
  });

  it('returns readiness payload', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ready');
    expect(result.db).toBe('ok');
  });
});
