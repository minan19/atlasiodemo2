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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningPlansController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const dto_1 = require("./dto");
const learning_plans_service_1 = require("./learning-plans.service");
let LearningPlansController = class LearningPlansController {
    constructor(plans) {
        this.plans = plans;
    }
    create(dto, req) {
        return this.plans.create(dto, req.user.id ?? req.user.userId);
    }
    list() {
        return this.plans.list();
    }
    addCourse(id, dto, req) {
        return this.plans.addCourse(id, dto, req.user.id ?? req.user.userId);
    }
    assign(id, dto, req) {
        return this.plans.assign(id, dto.userId, req.user.id ?? req.user.userId);
    }
};
exports.LearningPlansController = LearningPlansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateLearningPlanDto, Object]),
    __metadata("design:returntype", void 0)
], LearningPlansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LearningPlansController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/courses'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AddCourseToLearningPlanDto, Object]),
    __metadata("design:returntype", void 0)
], LearningPlansController.prototype, "addCourse", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AssignLearningPlanDto, Object]),
    __metadata("design:returntype", void 0)
], LearningPlansController.prototype, "assign", null);
exports.LearningPlansController = LearningPlansController = __decorate([
    (0, swagger_1.ApiTags)('learning-plans'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Controller)('learning-plans'),
    __metadata("design:paramtypes", [learning_plans_service_1.LearningPlansService])
], LearningPlansController);
//# sourceMappingURL=learning-plans.controller.js.map