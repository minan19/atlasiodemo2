"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProctoringModule = void 0;
const common_1 = require("@nestjs/common");
const proctoring_service_1 = require("./proctoring.service");
const proctoring_controller_1 = require("./proctoring.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const ioredis_1 = require("@nestjs-modules/ioredis");
const alarm_service_1 = require("./alarm.service");
const proctoring_nosql_1 = require("./proctoring.nosql");
let ProctoringModule = class ProctoringModule {
};
exports.ProctoringModule = ProctoringModule;
exports.ProctoringModule = ProctoringModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            ioredis_1.RedisModule.forRoot({
                type: 'single',
                url: process.env.REDIS_URL ?? 'redis://localhost:6379',
            }),
        ],
        controllers: [proctoring_controller_1.ProctoringController],
        providers: [proctoring_service_1.ProctoringService, alarm_service_1.ProctoringAlarmService, proctoring_nosql_1.ProctoringNoSqlWriter],
    })
], ProctoringModule);
//# sourceMappingURL=proctoring.module.js.map