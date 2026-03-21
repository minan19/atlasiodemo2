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
exports.InstructorPaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const instructor_payments_service_1 = require("./instructor-payments.service");
const dto_1 = require("./dto");
let InstructorPaymentsController = class InstructorPaymentsController {
    constructor(payments) {
        this.payments = payments;
    }
    summary(dto, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.payments.summarize(userId, dto);
    }
    history(dto, req) {
        const userId = req.user.id ?? req.user.userId;
        return this.payments.listPayments(userId, dto.limit ?? 10);
    }
    adminHistory(instructorId, dto) {
        return this.payments.listPayments(instructorId, dto.limit ?? 20);
    }
    adminSummary(instructorId, dto) {
        return this.payments.summarize(instructorId, dto);
    }
    generate(instructorId, dto, req) {
        const actorId = req.user.id ?? req.user.userId;
        return this.payments.generatePayout(instructorId, dto, actorId);
    }
    markPaid(paymentId, dto, req) {
        const actorId = req.user.id ?? req.user.userId;
        return this.payments.markPaid(paymentId, actorId, dto.notes);
    }
};
exports.InstructorPaymentsController = InstructorPaymentsController;
__decorate([
    (0, common_1.Get)('me/summary'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.InstructorPayoutRangeDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('me/history'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ListInstructorPaymentsDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('admin/:instructorId/history'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ListInstructorPaymentsDto]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "adminHistory", null);
__decorate([
    (0, common_1.Get)('admin/:instructorId/summary'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.InstructorPayoutRangeDto]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "adminSummary", null);
__decorate([
    (0, common_1.Post)('admin/:instructorId/generate'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('instructorId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.InstructorPayoutRangeDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "generate", null);
__decorate([
    (0, common_1.Patch)('admin/:paymentId/pay'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.MarkPayoutPaidDto, Object]),
    __metadata("design:returntype", void 0)
], InstructorPaymentsController.prototype, "markPaid", null);
exports.InstructorPaymentsController = InstructorPaymentsController = __decorate([
    (0, swagger_1.ApiTags)('instructor-payments'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('instructor-payments'),
    __metadata("design:paramtypes", [instructor_payments_service_1.InstructorPaymentsService])
], InstructorPaymentsController);
//# sourceMappingURL=instructor-payments.controller.js.map