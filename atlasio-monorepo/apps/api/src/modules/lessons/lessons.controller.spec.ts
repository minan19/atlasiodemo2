import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

describe('LessonsController', () => {
  let controller: LessonsController;

  beforeEach(() => {
    const service = {
      create: jest.fn(),
      listByCourse: jest.fn(),
      get: jest.fn(),
    } as unknown as LessonsService;
    controller = new LessonsController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
