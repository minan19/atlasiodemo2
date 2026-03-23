import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

export const redisProvider = {
  provide: REDIS,
  useFactory: () => {
    const url = process.env.REDIS_URL;
    if (url) return new Redis(url);
    return new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  },
};
