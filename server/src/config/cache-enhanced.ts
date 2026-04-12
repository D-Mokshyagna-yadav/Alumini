import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import logger from './logger';

/**
 * ─── Enhanced Cache System with Redis Support ───────────────────────
 *
 * TTL tiers:
 *   STATIC  (5 min) — branding, about, admin settings, notable-alumni  
 *   LONG    (2 min) — directory, gallery albums
 *   MEDIUM  (30 s)  — feeds, event lists, job lists
 *   SHORT   (10 s)  — notifications, chat list, connections
 *   USER    (20 s)  — per-user data (profile, saved items, preferences)
 */

export const TTL = {
    STATIC: 300,   // 5 min
    LONG: 120,     // 2 min
    MEDIUM: 30,    // 30 s
    SHORT: 10,     // 10 s
    USER: 20,      // 20 s
} as const;

// ─── CacheStore inferface ────────────────────────────────────
export interface CacheStore {
    get<T = any>(key: string): T | undefined | Promise<T | undefined>;
    set<T = any>(key: string, value: T, ttl?: number): void | Promise<void>;
    del(key: string | string[]): void | Promise<void>;
    keys(): string[] | Promise<string[]>;
    flush(): void | Promise<void>;
    stats(): { hits: number; misses: number; keys: number } | Promise<{ hits: number; misses: number; keys: number }>;
}

// ─── In-Memory Implementation (Default) ────────────────────────────────
class MemoryStore implements CacheStore {
    private store = new Map<string, { value: any; expiresAt: number }>();
    private _hits = 0;
    private _misses = 0;
    private readonly maxKeys: number;
    private cleanupTimer: ReturnType<typeof setInterval>;

    constructor(maxKeys = 5000) {
        this.maxKeys = maxKeys;
        this.cleanupTimer = setInterval(() => this.evict(), 15_000);
        if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }

    get<T = any>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            this._misses++;
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            this._misses++;
            return undefined;
        }
        this._hits++;
        return entry.value as T;
    }

    set<T = any>(key: string, value: T, ttl = 30): void {
        if (this.store.size >= this.maxKeys) {
            const firstKey = this.store.keys().next().value;
            if (firstKey) this.store.delete(firstKey);
        }
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttl * 1000,
        });
    }

    del(key: string | string[]): void {
        const keys = Array.isArray(key) ? key : [key];
        for (const k of keys) this.store.delete(k);
    }

    keys(): string[] {
        const now = Date.now();
        const result: string[] = [];
        for (const [k, v] of this.store) {
            if (now <= v.expiresAt) result.push(k);
        }
        return result;
    }

    flush(): void {
        this.store.clear();
    }

    stats() {
        return { hits: this._hits, misses: this._misses, keys: this.store.size };
    }

    private evict(): void {
        const now = Date.now();
        for (const [k, v] of this.store) {
            if (now > v.expiresAt) this.store.delete(k);
        }
    }
}

// ─── Redis Adapter (Lazy-loaded) ────────────────────────────────────
class RedisStore implements CacheStore {
    private redisClient: any;
    private _hits = 0;
    private _misses = 0;

    constructor(redisClient: any) {
        this.redisClient = redisClient;
    }

    async get<T = any>(key: string): Promise<T | undefined> {
        try {
            const value = await this.redisClient.get(key);
            if (value) {
                this._hits++;
                return JSON.parse(value) as T;
            }
            this._misses++;
            return undefined;
        } catch (err) {
            logger.error(`Redis GET error for ${key}:`, err);
            this._misses++;
            return undefined;
        }
    }

    async set<T = any>(key: string, value: T, ttl = 30): Promise<void> {
        try {
            await this.redisClient.setEx(key, ttl, JSON.stringify(value));
        } catch (err) {
            logger.error(`Redis SET error for ${key}:`, err);
        }
    }

    async del(key: string | string[]): Promise<void> {
        try {
            const keys = Array.isArray(key) ? key : [key];
            if (keys.length > 0) await this.redisClient.del(keys);
        } catch (err) {
            logger.error('Redis DEL error:', err);
        }
    }

    async keys(pattern = '*'): Promise<string[]> {
        try {
            return await this.redisClient.keys(pattern);
        } catch (err) {
            logger.error('Redis KEYS error:', err);
            return [];
        }
    }

    async flush(): Promise<void> {
        try {
            await this.redisClient.flushDb();
        } catch (err) {
            logger.error('Redis FLUSHDB error:', err);
        }
    }

    async stats(): Promise<{ hits: number; misses: number; keys: number }> {
        try {
            const keys = await this.redisClient.dbSize();
            return { hits: this._hits, misses: this._misses, keys };
        } catch (err) {
            logger.error('Redis STATS error:', err);
            return { hits: 0, misses: 0, keys: 0 };
        }
    }
}

// ─── Store Initialization ────────────────────────────────────────────
let store: CacheStore = new MemoryStore();
let isRedis = false;

export const initializeCache = async () => {
    const redisUrl = process.env.REDIS_URL?.trim();

    if (redisUrl && !isRedis) {
        try {
            logger.info(`🔄 Connecting to Redis: ${redisUrl.replace(/:[^:@]*@/, ':***@')}`); // Hide password
            const { createClient } = await import('redis');
            const client = createClient({ url: redisUrl });
            
            // Connection timeout to prevent hanging
            const connectTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
            );
            
            await Promise.race([client.connect(), connectTimeout]);
            store = new RedisStore(client);
            isRedis = true;
            logger.info('✅ Cache: Redis connected and ready');
        } catch (err) {
            isRedis = false;
            logger.warn('⚠️  Redis connection failed, falling back to memory store');
            logger.warn(`   Reason: ${err instanceof Error ? err.message : String(err)}`);
            logger.info('✅ Cache: Using local memory store');
        }
    } else if (!redisUrl) {
        logger.info('ℹ️  REDIS_URL not set, using local memory store');
        logger.info('   To enable Redis, set: REDIS_URL=redis://localhost:6379');
    }
};

// ─── Cache key builder ───────────────────────────────────────────────
export const buildCacheKey = (req: Request, perUser = false): string => {
    const base = `GET:${req.originalUrl}`;
    if (perUser && (req.session as any)?.userId) {
        return `u:${(req.session as any).userId}:${base}`;
    }
    return base;
};

// ─── Cache Middleware ────────────────────────────────────────────────
export const cacheMiddleware = (ttl: number = TTL.MEDIUM, perUser = false) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const key = buildCacheKey(req, perUser);
        const cached = await Promise.resolve(store.get<{ body: any; statusCode: number; etag?: string }>(key));

        if (cached) {
            res.set('X-Cache', 'HIT');
            if (cached.etag) res.set('ETag', cached.etag);
            return res.status(cached.statusCode).json(cached.body);
        }

        // Generate ETag
        const getETag = (body: any) => {
            const hash = createHash('md5').update(JSON.stringify(body)).digest('hex');
            return `"${hash}"`;
        };

        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const etag = getETag(body);
                    store.set(key, { body, statusCode: res.statusCode, etag }, ttl);
                    res.set('ETag', etag);
                } catch { /* don't let cache failures break response */ }
            }
            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
};

// ─── Invalidation Helpers ────────────────────────────────────────────
export const invalidatePrefix = async (...prefixes: string[]) => {
    try {
        const allKeys = await Promise.resolve(store.keys());
        const toDelete: string[] = [];
        for (const key of allKeys) {
            for (const prefix of prefixes) {
                if (key.includes(prefix)) {
                    toDelete.push(key);
                    break;
                }
            }
        }
        if (toDelete.length > 0) {
            await Promise.resolve(store.del(toDelete));
        }
    } catch (err) {
        logger.error('Cache invalidation error:', err);
    }
};

export const invalidateUser = async (userId: string) => {
    try {
        const prefix = `u:${userId}:`;
        const allKeys = await Promise.resolve(store.keys());
        const toDelete = allKeys.filter(k => k.startsWith(prefix));
        if (toDelete.length > 0) {
            await Promise.resolve(store.del(toDelete));
        }
    } catch (err) {
        logger.error('User cache invalidation error:', err);
    }
};

export const flushAll = async () => {
    try {
        await Promise.resolve(store.flush());
        logger.info('🗑️  Cache flushed');
    } catch (err) {
        logger.error('Cache flush error:', err);
    }
};

// ─── Route Invalidation Mapping ──────────────────────────────────────
const INVALIDATION_MAP: Record<string, string[]> = {
    '/api/posts':         ['/api/posts', '/api/public/feed'],
    '/api/events':        ['/api/events', '/api/event-posts'],
    '/api/event-posts':   ['/api/event-posts', '/api/events'],
    '/api/jobs':          ['/api/jobs'],
    '/api/connections':   ['/api/connections', '/api/users', '/api/directory'],
    '/api/users':         ['/api/users', '/api/directory'],
    '/api/notifications': ['/api/notifications'],
    '/api/chat':          ['/api/chat', '/api/conversations'],
    '/api/groups':        ['/api/groups'],
    '/api/gallery':       ['/api/gallery'],
    '/api/saved':         ['/api/saved'],
    '/api/public':        ['/api/public'],
    '/api/admin':         ['/api/admin', '/api/public', '/api/posts', '/api/events', '/api/jobs', '/api/users'],
    '/api/telemetry':     ['/api/telemetry'],
    '/api/upload':        [],
    '/api/auth':          [],
};

/**
 * Auto-invalidation middleware — intercepts mutations and busts relevant caches
 */
export const autoInvalidate = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const doInvalidation = async () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const reqPath = req.originalUrl || req.url;
                    for (const [prefix, targets] of Object.entries(INVALIDATION_MAP)) {
                        if (reqPath.startsWith(prefix)) {
                            await invalidatePrefix(prefix, ...targets);
                            if ((req.session as any)?.userId) {
                                await invalidateUser((req.session as any).userId);
                            }
                            break;
                        }
                    }
                }
            } catch (err) {
                logger.error('Auto-invalidation error:', err);
            }
        };

        res.json = (body: any) => {
            doInvalidation().catch(err => logger.error('Async invalidation error:', err));
            return originalJson(body);
        };

        res.send = (body: any) => {
            doInvalidation().catch(err => logger.error('Async invalidation error:', err));
            return originalSend(body);
        };

        next();
    };
};

// ─── Cache Stats ────────────────────────────────────────────────────
export const cacheStats = async () => {
    return await Promise.resolve(store.stats());
};

export default store;
