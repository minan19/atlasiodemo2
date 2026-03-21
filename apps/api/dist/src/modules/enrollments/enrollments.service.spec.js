"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enrollments_service_1 = require("./enrollments.service");
describe('EnrollmentsService', () => {
    let service;
    beforeEach(() => {
        const prisma = {
            enrollment: {
                upsert: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
            },
        };
        service = new enrollments_service_1.EnrollmentsService(prisma);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=enrollments.service.spec.js.map