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
exports.PeerReviewController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const peer_review_service_1 = require("./peer-review.service");
let PeerReviewController = class PeerReviewController {
    constructor(service) {
        this.service = service;
    }
    submit(dto, req) {
        const reviewerId = req.user.id || req.user.userId;
        return this.service.submitReview(dto.submissionId, reviewerId, dto.score, dto.feedback);
    }
};
exports.PeerReviewController = PeerReviewController;
__decorate([
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PeerReviewController.prototype, "submit", null);
exports.PeerReviewController = PeerReviewController = __decorate([
    (0, common_1.Controller)('peer-review'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [peer_review_service_1.PeerReviewService])
], PeerReviewController);
//# sourceMappingURL=peer-review.controller.js.map