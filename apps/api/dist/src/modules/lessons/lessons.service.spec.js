"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lessons_service_1 = require("./lessons.service");
describe('LessonsService', () => {
    let service;
    beforeEach(() => {
        const prisma = {
            course: { findUnique: jest.fn() },
            lesson: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
        };
        service = new lessons_service_1.LessonsService(prisma);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
//# sourceMappingURL=lessons.service.spec.js.map