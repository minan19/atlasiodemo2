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
exports.ConnectorsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_1 = require("../auth/roles");
const roles_guard_1 = require("../auth/roles.guard");
const connectors_service_1 = require("./connectors.service");
let ConnectorsController = class ConnectorsController {
    constructor(connectors) {
        this.connectors = connectors;
    }
    ltiLaunch(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.handleLtiLaunch(tenantId, dto);
    }
    ltiGrade(dto) {
        return this.connectors.sendLtiGrade(dto.deploymentId, dto.userId, dto.score, dto.maxScore, dto.comment);
    }
    oneRosterImport(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.importOneRoster(tenantId, dto);
    }
    oneRosterExport(req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.exportOneRoster(tenantId);
    }
    qtiImport(dto, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.importQtiItems(tenantId, dto.items, dto.topicId);
    }
    qtiExport(req, topicId) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.exportQtiItems(tenantId, topicId);
    }
    issueBadge(certId, req) {
        const tenantId = req.tenantId ?? req.user?.tenantId ?? 'public';
        return this.connectors.issueOpenBadge(certId, tenantId);
    }
};
exports.ConnectorsController = ConnectorsController;
__decorate([
    (0, common_1.Post)('lti/launch'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR', 'STUDENT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "ltiLaunch", null);
__decorate([
    (0, common_1.Post)('lti/grade'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "ltiGrade", null);
__decorate([
    (0, common_1.Post)('oneroster/import'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "oneRosterImport", null);
__decorate([
    (0, common_1.Get)('oneroster/export'),
    (0, roles_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "oneRosterExport", null);
__decorate([
    (0, common_1.Post)('qti/import'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "qtiImport", null);
__decorate([
    (0, common_1.Get)('qti/export'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('topicId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "qtiExport", null);
__decorate([
    (0, common_1.Post)('badges/issue/:certificationId'),
    (0, roles_1.Roles)('ADMIN', 'INSTRUCTOR'),
    __param(0, (0, common_1.Param)('certificationId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectorsController.prototype, "issueBadge", null);
exports.ConnectorsController = ConnectorsController = __decorate([
    (0, swagger_1.ApiTags)('connectors'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, common_1.Controller)('connectors'),
    __metadata("design:paramtypes", [connectors_service_1.ConnectorsService])
], ConnectorsController);
//# sourceMappingURL=connectors.controller.js.map