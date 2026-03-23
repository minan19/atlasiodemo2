"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const health_controller_1 = require("./health.controller");
describe('HealthController', () => {
    let controller;
    beforeEach(() => {
        const prisma = {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        };
        controller = new health_controller_1.HealthController(prisma);
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
//# sourceMappingURL=health.controller.spec.js.map