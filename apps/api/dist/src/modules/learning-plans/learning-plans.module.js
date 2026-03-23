"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningPlansModule = void 0;
const common_1 = require("@nestjs/common");
const learning_plans_controller_1 = require("./learning-plans.controller");
const learning_plans_service_1 = require("./learning-plans.service");
const enrollments_module_1 = require("../enrollments/enrollments.module");
let LearningPlansModule = class LearningPlansModule {
};
exports.LearningPlansModule = LearningPlansModule;
exports.LearningPlansModule = LearningPlansModule = __decorate([
    (0, common_1.Module)({
        imports: [enrollments_module_1.EnrollmentsModule],
        controllers: [learning_plans_controller_1.LearningPlansController],
        providers: [learning_plans_service_1.LearningPlansService],
    })
], LearningPlansModule);
//# sourceMappingURL=learning-plans.module.js.map