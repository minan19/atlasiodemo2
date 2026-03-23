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
exports.MeActionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const instructor_insights_service_1 = require("./instructor-insights.service");
const update_action_dto_1 = require("./dto/update-action.dto");
let MeActionsController = class MeActionsController {
    constructor(insights) {
        this.insights = insights;
    }
    async listMyActions(req, query) {
        const userId = req.user?.id ?? req.user?.userId;
        return this.insights.listMyActions({
            userId,
            query,
        });
    }
    async updateMyAction(actionId, dto, req) {
        const userId = req.user?.id ?? req.user?.userId;
        return this.insights.updateMyAction({ actionId, dto, userId });
    }
};
exports.MeActionsController = MeActionsController;
__decorate([
    (0, common_1.Get)('actions'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeActionsController.prototype, "listMyActions", null);
__decorate([
    (0, common_1.Patch)('actions/:actionId'),
    __param(0, (0, common_1.Param)('actionId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_action_dto_1.UpdateInstructorActionDto, Object]),
    __metadata("design:returntype", Promise)
], MeActionsController.prototype, "updateMyAction", null);
exports.MeActionsController = MeActionsController = __decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, swagger_1.ApiTags)('me-actions'),
    (0, common_1.Controller)('me'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [instructor_insights_service_1.InstructorInsightsService])
], MeActionsController);
//# sourceMappingURL=me-actions.controller.js.map