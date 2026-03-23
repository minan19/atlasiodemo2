"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MathEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MathEngineService = class MathEngineService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async evaluateEquation(userId, tenantId, expression) {
        const result = `Solution for ${expression}`;
        await this.prisma.mathSimulationLog.create({
            data: {
                userId,
                tenantId,
                toolType: 'EQUATION',
                inputData: { expression },
                resultData: { result }
            }
        });
        return { result };
    }
    async calculateMatrix(userId, tenantId, matrixA, matrixB, operation) {
        const result = { matrix: "Simulated Result" };
        await this.prisma.mathSimulationLog.create({
            data: {
                userId,
                tenantId,
                toolType: 'MATRIX',
                inputData: { matrixA, matrixB, operation },
                resultData: result
            }
        });
        return result;
    }
};
exports.MathEngineService = MathEngineService;
exports.MathEngineService = MathEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MathEngineService);
//# sourceMappingURL=math-engine.service.js.map