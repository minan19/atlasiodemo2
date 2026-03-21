"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartClassroomModule = void 0;
const common_1 = require("@nestjs/common");
const smart_classroom_service_1 = require("./smart-classroom.service");
const smart_classroom_controller_1 = require("./smart-classroom.controller");
const prisma_service_1 = require("../prisma/prisma.service");
let SmartClassroomModule = class SmartClassroomModule {
};
exports.SmartClassroomModule = SmartClassroomModule;
exports.SmartClassroomModule = SmartClassroomModule = __decorate([
    (0, common_1.Module)({
        providers: [smart_classroom_service_1.SmartClassroomService, prisma_service_1.PrismaService],
        controllers: [smart_classroom_controller_1.SmartClassroomController],
    })
], SmartClassroomModule);
//# sourceMappingURL=smart-classroom.module.js.map