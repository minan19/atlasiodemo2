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
exports.BypassAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
let BypassAuthGuard = class BypassAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(config) {
        super();
        this.config = config;
    }
    async canActivate(context) {
        if (this.isBypass()) {
            const req = context.switchToHttp().getRequest();
            req.user = { id: 'bypass-admin', role: 'ADMIN', roles: ['ADMIN'] };
            return true;
        }
        return (await super.canActivate(context));
    }
    handleRequest(err, user, info, context) {
        if (this.isBypass()) {
            const req = context.switchToHttp().getRequest();
            return req.user;
        }
        if (err || !user) {
            throw err || new common_1.UnauthorizedException(info?.message || 'Unauthorized');
        }
        return user;
    }
    isBypass() {
        return (this.config.get('AUTH_BYPASS') === 'true' ||
            process.env.AUTH_BYPASS === 'true');
    }
};
exports.BypassAuthGuard = BypassAuthGuard;
exports.BypassAuthGuard = BypassAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BypassAuthGuard);
//# sourceMappingURL=bypass.guard.js.map