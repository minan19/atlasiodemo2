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
exports.EntitlementGuard = exports.RequireModules = exports.CommercialModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../prisma/prisma.service");
const entitlement_service_1 = require("./entitlement.service");
var CommercialModule;
(function (CommercialModule) {
    CommercialModule["LIVE_CLASSES"] = "LIVE_CLASSES";
    CommercialModule["WHITEBOARD_ADVANCED"] = "WHITEBOARD_ADVANCED";
    CommercialModule["AI_GHOST_MENTOR"] = "AI_GHOST_MENTOR";
    CommercialModule["ADAPTIVE_EXAMS"] = "ADAPTIVE_EXAMS";
    CommercialModule["CUSTOM_REPORTS"] = "CUSTOM_REPORTS";
    CommercialModule["LTI_INTEGRATION"] = "LTI_INTEGRATION";
})(CommercialModule || (exports.CommercialModule = CommercialModule = {}));
const RequireModules = (...modules) => (0, common_1.SetMetadata)('required_modules', modules);
exports.RequireModules = RequireModules;
let EntitlementGuard = class EntitlementGuard {
    constructor(reflector, prisma, entitlement) {
        this.reflector = reflector;
        this.prisma = prisma;
        this.entitlement = entitlement;
    }
    async canActivate(context) {
        const requiredModules = this.reflector.getAllAndOverride('required_modules', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredModules || requiredModules.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const tenantId = request.tenantId || user?.tenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Kurum bilgisi (Tenant) bulunamadı.');
        }
        if (tenantId === 'public') {
            return true;
        }
        const tenantModules = await this.entitlement.getTenantModules(tenantId);
        const hasAccess = requiredModules.every((mod) => tenantModules[mod] === true);
        if (!hasAccess) {
            throw new common_1.ForbiddenException(`Ticari Paketinizde bu modül eksik: ${requiredModules.join(', ')}. Lütfen paketinizi yükseltin (Add-on Satın Alın).`);
        }
        return true;
    }
};
exports.EntitlementGuard = EntitlementGuard;
exports.EntitlementGuard = EntitlementGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector, prisma_service_1.PrismaService, entitlement_service_1.EntitlementService])
], EntitlementGuard);
//# sourceMappingURL=entitlement.guard.js.map