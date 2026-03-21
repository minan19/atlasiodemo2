"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enrollments_controller_1 = require("./enrollments.controller");
describe('EnrollmentsController', () => {
    let controller;
    beforeEach(() => {
        const service = {
            enroll: jest.fn(),
            myEnrollments: jest.fn(),
        };
        controller = new enrollments_controller_1.EnrollmentsController(service);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=enrollments.controller.spec.js.map