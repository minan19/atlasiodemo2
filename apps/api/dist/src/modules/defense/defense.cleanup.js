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
var DefenseCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const ioredis_1 = require("@nestjs-modules/ioredis");
const nginx_service_1 = require("./nginx.service");
const fs = require("fs");
let DefenseCleanupService = DefenseCleanupService_1 = class DefenseCleanupService {
    constructor(redis, nginx) {
        this.redis = redis;
        this.nginx = nginx;
        this.logger = new common_1.Logger(DefenseCleanupService_1.name);
        this.denyPath = process.env.NGINX_DENY_PATH || '/etc/nginx/deny_autodefense.conf';
    }
    async syncDenyFile() {
        try {
            const denyIps = await this.readDenyIps();
            if (denyIps.length === 0)
                return;
            const alive = [];
            for (const ip of denyIps) {
                const stillBlocked = await this.redis.get(this.redisKey(ip));
                if (stillBlocked)
                    alive.push(ip);
                else {
                    await this.nginx.removeDeny(ip);
                }
            }
            if (alive.length !== denyIps.length) {
                this.logger.log(`Deny file sync: cleaned ${denyIps.length - alive.length} expired entries`);
            }
        }
        catch (err) {
            this.logger.error(`syncDenyFile failed: ${err instanceof Error ? err.message : err}`);
        }
    }
    redisKey(ip) {
        return `deny:ip:${ip}`;
    }
    async readDenyIps() {
        try {
            await fs.promises.access(this.denyPath);
            const content = await fs.promises.readFile(this.denyPath, 'utf8');
            return content
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.startsWith('deny '))
                .map((l) => l.replace(/^deny\s+/, '').replace(/;$/, '').trim())
                .filter(Boolean);
        }
        catch {
            return [];
        }
    }
};
exports.DefenseCleanupService = DefenseCleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DefenseCleanupService.prototype, "syncDenyFile", null);
exports.DefenseCleanupService = DefenseCleanupService = DefenseCleanupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [Function, nginx_service_1.NginxService])
], DefenseCleanupService);
//# sourceMappingURL=defense.cleanup.js.map