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
var SecurityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const prisma_service_1 = require("../prisma/prisma.service");
const ops_webhook_service_1 = require("../ops/ops.webhook.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
let SecurityService = SecurityService_1 = class SecurityService {
    constructor(redis, prisma, opsWebhook, notifications) {
        this.redis = redis;
        this.prisma = prisma;
        this.opsWebhook = opsWebhook;
        this.notifications = notifications;
        this.logger = new common_1.Logger(SecurityService_1.name);
        this.ttlSeconds = Number(process.env.SECURITY_BLOCK_TTL || 900);
        this.rateWindowSeconds = Number(process.env.SECURITY_RATE_WINDOW || 60);
        this.rateThreshold = Number(process.env.SECURITY_RATE_THRESHOLD || 120);
        this.rateEventCooldown = Number(process.env.SECURITY_RATE_EVENT_COOLDOWN || 300);
        this.patternDetectEnabled = process.env.SECURITY_PATTERN_DETECT !== '0';
        this.patternCooldownSeconds = Number(process.env.SECURITY_PATTERN_COOLDOWN || 300);
        this.sqliPatterns = [
            /union\s+select/i,
            /or\s+1=1/i,
            /sleep\(\d+\)/i,
            /xp_cmdshell/i,
        ];
        this.xssPatterns = [
            /<script/i,
            /javascript:/i,
            /onerror=/i,
        ];
    }
    denyKey(ip) {
        return `deny:ip:${ip}`;
    }
    async tempBlock(ip, ttlSeconds) {
        await this.redis.set(this.denyKey(ip), '1', 'EX', ttlSeconds);
        this.logger.warn(`Temp block ${ip} for ${ttlSeconds}s`);
    }
    async tempUnblock(ip) {
        await this.redis.del(this.denyKey(ip));
        this.logger.log(`Temp unblock ${ip}`);
    }
    async markHoneypotHit(ip) {
        await this.tempBlock(ip, this.ttlSeconds);
        this.logger.warn(`Honeypot hit from ${ip} -> temp deny ${this.ttlSeconds}s`);
        await this.opsWebhook.notify('Security honeypot', `Honeypot hit from ${ip}`, { ip });
        await this.notifications.sendAdminAlert('Honeypot tetiklendi', `IP: ${ip}`, { ip });
        const event = await this.prisma.securityEvent.create({
            data: {
                source: 'honeypot',
                category: 'intrusion',
                eventType: 'honeypot_hit',
                severity: client_1.SecurityEventSeverity.HIGH,
                status: client_1.SecurityEventStatus.MITIGATED,
                actorIp: ip,
                description: `Honeypot tetiklendi, IP geçici olarak engellendi (${this.ttlSeconds}s)`,
                payload: { ip },
            },
        });
        await this.prisma.defenseAction.create({
            data: {
                eventId: event.id,
                actionType: client_1.DefenseActionType.BLOCK_IDENTITY,
                target: ip,
                params: { ttlSeconds: this.ttlSeconds },
                state: client_1.DefenseActionState.APPLIED,
                reason: 'Honeypot hit -> otomatik blok',
                createdBy: 'atlasio-autodefense',
                appliedAt: new Date(),
            },
        });
    }
    async isDenied(ip) {
        const v = await this.redis.get(this.denyKey(ip));
        return v === '1';
    }
    async observeRequest(ip, path) {
        if (!ip)
            return;
        const bucket = Math.floor(Date.now() / (this.rateWindowSeconds * 1000));
        const key = `sec:req:${ip}:${bucket}`;
        const count = await this.redis.incr(key);
        if (count === 1) {
            await this.redis.expire(key, this.rateWindowSeconds + 5);
        }
        if (count > this.rateThreshold) {
            const cooldownKey = `sec:event_sent:${ip}`;
            const alreadySent = await this.redis.set(cooldownKey, '1', 'EX', this.rateEventCooldown, 'NX');
            if (!alreadySent)
                return;
            this.logger.warn(`Rate threshold exceeded from ${ip} (${count}/${this.rateWindowSeconds}s)`);
            const event = await this.prisma.securityEvent.create({
                data: {
                    source: 'edge',
                    category: 'rate_limit',
                    eventType: 'rps_threshold',
                    severity: client_1.SecurityEventSeverity.MEDIUM,
                    status: client_1.SecurityEventStatus.OPEN,
                    actorIp: ip,
                    description: `IP ${ip} ${this.rateWindowSeconds}s içinde ${count} istek yaptı (eşik ${this.rateThreshold})`,
                    payload: { ip, path, count, windowSeconds: this.rateWindowSeconds, threshold: this.rateThreshold },
                },
            });
            await this.prisma.defenseAction.create({
                data: {
                    eventId: event.id,
                    actionType: client_1.DefenseActionType.RATE_LIMIT,
                    target: ip,
                    params: { windowSeconds: this.rateWindowSeconds, threshold: this.rateThreshold },
                    state: client_1.DefenseActionState.PROPOSED,
                    reason: 'RPS eşiği aşıldı',
                    createdBy: 'atlasio-autodefense',
                },
            });
        }
    }
    async detectPatterns(ip, url) {
        if (!this.patternDetectEnabled || !ip || !url)
            return;
        const lowered = decodeURIComponent(url).toLowerCase();
        const hitSql = this.sqliPatterns.some((r) => r.test(lowered));
        const hitXss = this.xssPatterns.some((r) => r.test(lowered));
        if (!hitSql && !hitXss)
            return;
        const sig = hitSql ? 'sqli' : 'xss';
        const coolKey = `sec:pat:${sig}:${ip}`;
        const sent = await this.redis.set(coolKey, '1', 'EX', this.patternCooldownSeconds, 'NX');
        if (!sent)
            return;
        const severity = hitSql ? client_1.SecurityEventSeverity.HIGH : client_1.SecurityEventSeverity.MEDIUM;
        const event = await this.prisma.securityEvent.create({
            data: {
                source: 'edge',
                category: 'pattern',
                eventType: `${sig}_pattern`,
                severity,
                status: client_1.SecurityEventStatus.OPEN,
                actorIp: ip,
                description: `Şüpheli ${sig.toUpperCase()} pattern tespit edildi`,
                payload: { ip, url },
            },
        });
        await this.prisma.defenseAction.create({
            data: {
                eventId: event.id,
                actionType: client_1.DefenseActionType.WAF_RULE,
                target: ip,
                params: { pattern: sig },
                state: client_1.DefenseActionState.PROPOSED,
                reason: `${sig.toUpperCase()} pattern tespiti`,
                createdBy: 'atlasio-autodefense',
            },
        });
    }
};
exports.SecurityService = SecurityService;
exports.SecurityService = SecurityService = SecurityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Function, prisma_service_1.PrismaService,
        ops_webhook_service_1.OpsWebhookService,
        notifications_service_1.NotificationsService])
], SecurityService);
//# sourceMappingURL=security.service.js.map