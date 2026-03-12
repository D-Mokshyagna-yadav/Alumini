import { Request, Response, NextFunction } from 'express';

/**
 * ─── Redis-Ready Cache Layer ───────────────────────────────────
 *
 * Abstracted cache with a CacheStore interface. Ships with an
 * in-memory implementation (MemoryStore). When Redis is available,
 * swap to RedisStore by setting REDIS_URL in env — no other code changes needed.
 *
 * TTL tiers:
 *   STATIC  (5 min) — branding, about, admin settings, notable-alumni
 *   LONG    (2 min) — directory, gallery albums
 *   MEDIUM  (30 s)  — feeds, event lists, job lists
 *   SHORT   (10 s)  — notifications, chat list, connections
 *   USER    (20 s)  — per-user data (profile, saved items, preferences)
 */

// ─── TTL presets (seconds) ───────────────────────────────────
export const TTL = {
    STATIC: 300,   // 5 min
    LONG: 120,     // 2 min
    MEDIUM: 30,    // 30 s
    SHORT: 10,     // 10 s
    USER: 20,      // 20 s
} as const;

// ─── CacheStore interface (swap implementation for Redis) ────
export interface CacheStore {
    get<T = any>(key: string): T | undefined;
    set<T = any>(key: string, value: T, ttl?: number): void;
    del(key: string | string[]): void;
    keys(): string[];
    flush(): void;
    stats(): { hits: number; misses: number; keys: number };
}

// ─── In-Memory Implementation ────────────────────────────────
class MemoryStore implements CacheStore {
    private store = new Map<string, { value: any; expiresAt: number }>();
    private _hits = 0;
    private _misses = 0;
    private readonly maxKeys: number;
    private cleanupTimer: ReturnType<typeof setInterval>;

    constructor(maxKeys = 5000) {
        this.maxKeys = maxKeys;
        // Periodic cleanup of expired keys
        this.cleanupTimer = setInterval(() => this.evict(), 15_000);
        // Prevent the timer from keeping the process alive
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
        // Evict oldest entries if at capacity
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
        for (const k of keys) {
            this.store.delete(k);
        }
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
        return {
            hits: this._hits,
            misses: this._misses,
            keys: this.store.size,
        };
    }

    private evict(): void {
        const now = Date.now();
        for (const [k, v] of this.store) {
            if (now > v.expiresAt) this.store.delete(k);
        }
    }
}

// ─── Singleton store instance ────────────────────────────────
// To switch to Redis later, swap this line:
//
//   import { createRedisStore } from './redisStore';
//   const store: CacheStore = process.env.REDIS_URL
//       ? createRedisStore(process.env.REDIS_URL)
//       : new MemoryStore();
//
const store: CacheStore = new MemoryStore();

// ─── Cache key builder ───────────────────────────────────────
export const buildCacheKey = (req: Request, perUser = false): string => {
    const base = `GET:${req.originalUrl}`;
    if (perUser && (req.session as any)?.userId) {
        return `u:${(req.session as any).userId}:${base}`;
    }
    return base;
};

// ─── Middleware factory ──────────────────────────────────────
/**
 * Express middleware that caches successful JSON GET responses.
 *
 *   router.get('/feed', cacheMiddleware(TTL.MEDIUM), handler);
 *   router.get('/me/saved', cacheMiddleware(TTL.USER, true), handler);
 */
export const cacheMiddleware = (ttl: number = TTL.MEDIUM, perUser = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const key = buildCacheKey(req, perUser);
        const cached = store.get<{ body: any; statusCode: number }>(key);

        if (cached) {
            res.set('X-Cache', 'HIT');
            return res.status(cached.statusCode).json(cached.body);
        }

        // Intercept res.json to store the response
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    store.set(key, { body, statusCode: res.statusCode }, ttl);
                } catch { /* don't let cache failures break the response */ }
            }
            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
};

// ─── Invalidation helpers ────────────────────────────────────

/** Invalidate all keys containing any of the given substrings */
export const invalidatePrefix = (...prefixes: string[]) => {
    const allKeys = store.keys();
    const toDelete: string[] = [];
    for (const key of allKeys) {
        for (const prefix of prefixes) {
            if (key.includes(prefix)) {
                toDelete.push(key);
                break;
            }
        }
    }
    if (toDelete.length > 0) store.del(toDelete);
};

/** Invalidate all per-user cache keys */
export const invalidateUser = (userId: string) => {
    const prefix = `u:${userId}:`;
    const toDelete = store.keys().filter(k => k.startsWith(prefix));
    if (toDelete.length > 0) store.del(toDelete);
};

/** Flush everything */
export const flushAll = () => {
    store.flush();
};

// ─── Route ↔ Invalidation mapping ───────────────────────────
const INVALIDATION_MAP: Record<string, string[]> = {
    '/api/posts':         ['/api/posts', '/api/public/feed'],
    '/api/events':        ['/api/events', '/api/event-posts'],
    '/api/event-posts':   ['/api/event-posts', '/api/events'],
    '/api/jobs':          ['/api/jobs'],
    '/api/connections':   ['/api/connections', '/api/users'],
    '/api/users':         ['/api/users'],
    '/api/notifications': ['/api/notifications'],
    '/api/chat':          ['/api/chat'],
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
 * Auto-invalidation middleware. Mount once on the Express app before routes.
 * Intercepts successful mutations (POST/PUT/DELETE/PATCH → 2xx) and busts
 * relevant cache entries automatically.
 */
export const autoInvalidate = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const doInvalidation = () => {
            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const reqPath = req.originalUrl || req.url;
                    for (const [prefix, targets] of Object.entries(INVALIDATION_MAP)) {
                        if (reqPath.startsWith(prefix)) {
                            invalidatePrefix(prefix, ...targets);
                            if ((req.session as any)?.userId) {
                                invalidateUser((req.session as any).userId);
                            }
                            break;
                        }
                    }
                }
            } catch { /* never let invalidation break the response */ }
        };

        res.json = (body: any) => {
            doInvalidation();
            return originalJson(body);
        };

        res.send = (body: any) => {
            doInvalidation();
            return originalSend(body);
        };

        next();
    };
};

/** Expose stats for debugging */
export const cacheStats = () => store.stats();

/** Expose the store for direct access (e.g. in tests or admin endpoints) */
export { store };

export default store;
