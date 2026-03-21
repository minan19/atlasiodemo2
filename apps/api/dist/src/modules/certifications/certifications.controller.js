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
exports.CertificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const dto_1 = require("./dto");
const certifications_service_1 = require("./certifications.service");
let CertificationsController = class CertificationsController {
    constructor(certifications) {
        this.certifications = certifications;
    }
    my(req) {
        return this.certifications.listMine(req.user.id ?? req.user.userId);
    }
    issue(dto, req) {
        return this.certifications.issue(dto, req.user.id ?? req.user.userId);
    }
    verifyByKey(key) {
        return this.certifications.verify(key);
    }
    list() {
        return this.certifications.listAll();
    }
    markExpired() {
        return this.certifications.markExpiries();
    }
    async downloadPdf(id, lang = 'tr') {
        const stream = await this.certifications.generatePdf(id, lang);
        return new common_1.StreamableFile(stream, {
            disposition: `inline; filename=\"certificate-${id}.pdf\"`,
            type: 'application/pdf',
        });
    }
};
exports.CertificationsController = CertificationsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "my", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    (0, common_1.Post)('issue'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.IssueCertificationDto, Object]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "issue", null);
__decorate([
    (0, common_1.Get)('verify'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "verifyByKey", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "list", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_1.Roles)('ADMIN'),
    (0, common_1.Post)('mark-expired'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CertificationsController.prototype, "markExpired", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(':id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CertificationsController.prototype, "downloadPdf", null);
exports.CertificationsController = CertificationsController = __decorate([
    (0, swagger_1.ApiTags)('certifications'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('certifications'),
    __metadata("design:paramtypes", [certifications_service_1.CertificationsService])
], CertificationsController);
//# sourceMappingURL=certifications.controller.js.map