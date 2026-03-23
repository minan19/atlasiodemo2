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
exports.AntiFraudService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ops_webhook_service_1 = require("../ops/ops.webhook.service");
const notifications_service_1 = require("../notifications/notifications.service");
const FAIL_KEY = (ip) => `pfail:${ip}`;
const BLOCK_KEY = (ip) => `pblock:${ip}`;
let AntiFraudService = class AntiFraudService {
    constructor(redis, ops, notifications) {
        this.redis = redis;
        this.ops = ops;
        this.notifications = notifications;
        this.maxFails = Number(process.env.PAYMENT_FAIL_MAX ?? 5);
        this.blockTtl = Number(process.env.PAYMENT_BLOCK_TTL ?? 1800);
    }
    async assertNotBlocked(ip) {
        if (!ip)
            return;
        const blocked = await this.redis.exists(BLOCK_KEY(ip));
        if (blocked) {
            throw new common_1.ForbiddenException('Ödeme denemesi geçici olarak engellendi');
        }
    }
    async recordFailure(userId, ip) {
        if (!ip)
            return;
        const count = await this.redis.incr(FAIL_KEY(ip));
        if (count === 1)
            await this.redis.expire(FAIL_KEY(ip), 3600);
        if (count >= this.maxFails) {
            await this.redis.set(BLOCK_KEY(ip), '1', 'EX', this.blockTtl);
            await this.ops.notify('Payment fraud block', `IP ${ip} temporarily blocked`, { userId, ip, fails: count });
            await this.notifications.sendAdminAlert('Payment fraud block', `IP ${ip} engellendi`, { userId, ip, fails: count });
        }
    }
    async clearFailures(ip) {
        if (!ip)
            return;
        await this.redis.del(FAIL_KEY(ip));
    }
};
exports.AntiFraudService = AntiFraudService;
exports.AntiFraudService = AntiFraudService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Function, ops_webhook_service_1.OpsWebhookService,
        notifications_service_1.NotificationsService])
], AntiFraudService);
//# sourceMappingURL=anti-fraud.service.js.map