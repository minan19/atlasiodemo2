"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisProvider = exports.REDIS = void 0;
const ioredis_1 = require("ioredis");
exports.REDIS = Symbol('REDIS');
exports.redisProvider = {
    provide: exports.REDIS,
    useFactory: () => {
        const url = process.env.REDIS_URL;
        if (url)
            return new ioredis_1.default(url);
        return new ioredis_1.default({
            host: process.env.REDIS_HOST ?? '127.0.0.1',
            port: Number(process.env.REDIS_PORT ?? 6379),
            password: process.env.REDIS_PASSWORD || undefined,
        });
    },
};
//# sourceMappingURL=redis.provider.js.map