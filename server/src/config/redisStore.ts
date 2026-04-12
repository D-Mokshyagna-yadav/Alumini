import { createClient, RedisClientType } from 'redis';
import logger from './logger';

/**
 * Redis-backed CacheStore for distributed caching
 * Drop-in replacement for MemoryStore. Enable by setting REDIS_URL env var.
 */

export interface RedisCacheStore {
    get<T = any>(key: string): Promise<T | undefined>;
    set<T = any>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string | string[]): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    flush(): Promise<void>;
    stats(): Promise<{ hits: number; misses: number; keys: number }>;
}

let redisClient: RedisClientType | null = null;
let redisStats = { hits: 0, misses: 0 };

export const createRedisStore = async (redisUrl: string): Promise<RedisCacheStore> => {
    // Initialize Redis client once
    if (!redisClient) {
        try {
            redisClient = createClient({ url: redisUrl });
            redisClient.on('error', (err: Error) => logger.error('Redis error:', err));
            redisClient.on('connect', () => logger.info('✅ Redis connected'));
            redisClient.on('reconnecting', () => logger.info('🔄 Redis reconnecting...'));
            
            await redisClient.connect();
        } catch (err: unknown) {
            logger.error('Failed to connect to Redis, falling back to memory store:', err instanceof Error ? err.message : String(err));
            return null as any;
        }
    }

    return {
        async get<T = any>(key: string): Promise<T | undefined> {
            try {
                const value = await redisClient!.get(key);
                if (value) {
                    redisStats.hits++;
                    return JSON.parse(value) as T;
                }
                redisStats.misses++;
                return undefined;
            } catch (err) {
                logger.error(`Redis GET error for ${key}:`, err);
                redisStats.misses++;
                return undefined;
            }
        },

        async set<T = any>(key: string, value: T, ttl = 30): Promise<void> {
            try {
                await redisClient!.setEx(key, ttl, JSON.stringify(value));
            } catch (err) {
                logger.error(`Redis SET error for ${key}:`, err);
            }
        },

        async del(key: string | string[]): Promise<void> {
            try {
                const keys = Array.isArray(key) ? key : [key];
                if (keys.length > 0) {
                    await redisClient!.del(keys);
                }
            } catch (err) {
                logger.error('Redis DEL error:', err);
            }
        },

        async keys(pattern = '*'): Promise<string[]> {
            try {
                return await redisClient!.keys(pattern);
            } catch (err) {
                logger.error('Redis KEYS error:', err);
                return [];
            }
        },

        async flush(): Promise<void> {
            try {
                await redisClient!.flushDb();
            } catch (err) {
                logger.error('Redis FLUSHDB error:', err);
            }
        },

        async stats(): Promise<{ hits: number; misses: number; keys: number }> {
            try {
                const keys = await redisClient!.dbSize();
                return {
                    hits: redisStats.hits,
                    misses: redisStats.misses,
                    keys,
                };
            } catch (err) {
                logger.error('Redis STATS error:', err);
                return { hits: 0, misses: 0, keys: 0 };
            }
        },
    };
};

export const closeRedisConnection = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('✅ Redis connection closed');
        } catch (err) {
            logger.error('Error closing Redis:', err);
        }
    }
};
