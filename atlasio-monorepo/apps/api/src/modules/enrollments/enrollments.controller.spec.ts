import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;

  beforeEach(() => {
    const service = {
      enroll: jest.fn(),
      myEnrollments: jest.fn(),
    } as unknown as EnrollmentsService;
    controller = new EnrollmentsController(service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
