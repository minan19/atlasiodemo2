"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lessons_controller_1 = require("./lessons.controller");
describe('LessonsController', () => {
    let controller;
    beforeEach(() => {
        const service = {
            create: jest.fn(),
            listByCourse: jest.fn(),
            get: jest.fn(),
        };
        controller = new lessons_controller_1.LessonsController(service);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=lessons.controller.spec.js.map