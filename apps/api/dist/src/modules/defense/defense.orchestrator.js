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
var DefenseOrchestrator_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseOrchestrator = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const security_service_1 = require("../security/security.service");
const nginx_service_1 = require("./nginx.service");
let DefenseOrchestrator = DefenseOrchestrator_1 = class DefenseOrchestrator {
    constructor(prisma, security, nginx) {
        this.prisma = prisma;
        this.security = security;
        this.nginx = nginx;
        this.logger = new common_1.Logger(DefenseOrchestrator_1.name);
    }
    securityBlockTtl() {
        return Number(process.env.SECURITY_BLOCK_TTL || 900);
    }
    async rollbackAction(id) {
        const action = await this.prisma.defenseAction.findUnique({ where: { id } });
        if (!action)
            throw new Error('DefenseAction not found');
        try {
            const unblockTypes = [
                client_1.DefenseActionType.BLOCK_IDENTITY,
                client_1.DefenseActionType.RATE_LIMIT,
                client_1.DefenseActionType.QUARANTINE,
                client_1.DefenseActionType.WAF_RULE,
            ];
            if (unblockTypes.includes(action.actionType) && action.target) {
                await this.security.tempUnblock(action.target);
                await this.nginx.removeDeny(action.target);
            }
            return this.prisma.defenseAction.update({
                where: { id },
                data: {
                    state: client_1.DefenseActionState.ROLLED_BACK,
                    rolledBackAt: new Date(),
                    reason: action.reason ?? 'rolled back',
                },
            });
        }
        catch (err) {
            this.logger.error(`Rollback failed: ${err instanceof Error ? err.message : err}`);
            return this.prisma.defenseAction.update({
                where: { id },
                data: {
                    state: client_1.DefenseActionState.FAILED,
                    reason: err instanceof Error ? err.message : 'rollback failed',
                },
            });
        }
    }
    async applyAction(id) {
        const action = await this.prisma.defenseAction.findUnique({
            where: { id },
            include: { SecurityEvent: true },
        });
        if (!action) {
            throw new Error('DefenseAction not found');
        }
        try {
            switch (action.actionType) {
                case client_1.DefenseActionType.BLOCK_IDENTITY:
                case client_1.DefenseActionType.RATE_LIMIT: {
                    const ttlRaw = action.params?.ttlSeconds ??
                        Number(process.env.SECURITY_BLOCK_TTL || 900);
                    const ttlSeconds = Number(ttlRaw) || Number(process.env.SECURITY_BLOCK_TTL || 900);
                    if (!action.target)
                        throw new Error('target (ip) missing');
                    await this.security.tempBlock(action.target, ttlSeconds);
                    await this.nginx.addDeny(action.target);
                    break;
                }
                case client_1.DefenseActionType.QUARANTINE: {
                    if (action.target) {
                        const ttl = Number(action.params?.ttlSeconds ??
                            process.env.QUARANTINE_TTL_SECONDS ??
                            86400);
                        await this.security.tempBlock(action.target, ttl);
                        await this.nginx.addDeny(action.target);
                        this.logger.warn(`Quarantine applied: target=${action.target} ttl=${ttl}s`);
                    }
                    break;
                }
                case client_1.DefenseActionType.WAF_RULE: {
                    if (action.target) {
                        await this.security.tempBlock(action.target, this.securityBlockTtl());
                        await this.nginx.addDeny(action.target);
                    }
                    break;
                }
                case client_1.DefenseActionType.RESTART_SERVICE: {
                    await this.prisma.auditLog.create({
                        data: {
                            action: 'security:restart_service_requested',
                            entity: 'DefenseAction',
                            entityId: id,
                            meta: { target: action.target, reason: action.reason },
                        },
                    });
                    this.logger.warn(`RESTART_SERVICE requested for target=${action.target}. ` +
                        'Automated restart not available — operator must restart manually. Audit log created.');
                    break;
                }
                case client_1.DefenseActionType.ALERT_ONLY:
                default: {
                    await this.prisma.auditLog.create({
                        data: {
                            action: `security:alert_only:${action.actionType}`,
                            entity: 'DefenseAction',
                            entityId: id,
                            meta: { target: action.target, reason: action.reason },
                        },
                    });
                    this.logger.log(`ALERT_ONLY logged for ${action.actionType} id=${id}`);
                    break;
                }
            }
            return this.prisma.defenseAction.update({
                where: { id },
                data: {
                    state: client_1.DefenseActionState.APPLIED,
                    appliedAt: new Date(),
                    reason: action.reason ?? 'applied by orchestrator',
                },
            });
        }
        catch (err) {
            this.logger.error(`Apply action failed: ${err instanceof Error ? err.message : err}`);
            return this.prisma.defenseAction.update({
                where: { id },
                data: {
                    state: client_1.DefenseActionState.FAILED,
                    reason: err instanceof Error ? err.message : 'apply failed',
                },
            });
        }
    }
};
exports.DefenseOrchestrator = DefenseOrchestrator;
exports.DefenseOrchestrator = DefenseOrchestrator = DefenseOrchestrator_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        security_service_1.SecurityService,
        nginx_service_1.NginxService])
], DefenseOrchestrator);
//# sourceMappingURL=defense.orchestrator.js.map