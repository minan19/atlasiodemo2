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
exports.InstructorInsightsCache = void 0;
const common_1 = require("@nestjs/common");
const redis_provider_1 = require("../../infra/redis/redis.provider");
const cache_keys_1 = require("./utils/cache-keys");
let InstructorInsightsCache = class InstructorInsightsCache {
    constructor(redis) {
        this.redis = redis;
    }
    async invalidateForStudentInClass(classId, studentId) {
        const keys = [];
        for (const w of cache_keys_1.WINDOWS) {
            keys.push((0, cache_keys_1.classInsightsKey)(classId, w));
            keys.push((0, cache_keys_1.studentInsightsKey)(classId, studentId, w));
        }
        if (keys.length) {
            await this.redis.del(...keys);
        }
    }
};
exports.InstructorInsightsCache = InstructorInsightsCache;
exports.InstructorInsightsCache = InstructorInsightsCache = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_provider_1.REDIS)),
    __metadata("design:paramtypes", [Function])
], InstructorInsightsCache);
//# sourceMappingURL=instructor-insights.cache.js.map