import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

/**
 * In-memory API response cache with prefix-based invalidation.
 *
 * TTL tiers:
 *   - STATIC  (5 min) : public content that rarely changes (branding, about, admin settings)
 *   - MEDIUM  (30 s)  : lists/feeds that update moderately (posts, events, jobs)
 *   - SHORT   (10 s)  : fast-changing data (notifications, chat, connections)
 *   - USER    (20 s)  : per-user data (profile, saved items, preferences)
 */
const cache = new NodeCache({
    stdTTL: 30,          // default 30 s
    checkperiod: 15,     // check for expired keys every 15 s
    useClones: false,    // store references for speed (never mutate cached values!)
    maxKeys: 5000,       // cap memory usage
});

// ─── TTL presets ──────────────────────────────────────────────
export const TTL = {
    STATIC: 300,   // 5 min  — branding, about, administration, notable-alumni
    MEDIUM: 30,    // 30 s   — feeds, lists
    SHORT: 10,     // 10 s   — notifications, chat list
    USER: 20,      // 20 s   — per-user stuff
} as const;

// ─── Cache key builder ───────────────────────────────────────
/**
 * Build a cache key from the request.
 * Pattern: "METHOD:fullPath?query" optionally prefixed with userId for
 * per-user caches.
 *
 *   GET /api/posts?page=2            → "GET:/api/posts?page=2"
 *   GET /api/saved/all  (user 123)   → "u:123:GET:/api/saved/all"
 */
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
 * Usage:
 *   router.get('/feed', cacheMiddleware(TTL.MEDIUM), handler);
 *   router.get('/me/saved', cacheMiddleware(TTL.USER, true), handler);
 */
export const cacheMiddleware = (ttl: number = TTL.MEDIUM, perUser = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET (and HEAD) requests
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const key = buildCacheKey(req, perUser);
        const cached = cache.get<{ body: any; statusCode: number }>(key);

        if (cached) {
            // Set a header so the client knows it was served from cache
            res.set('X-Cache', 'HIT');
            return res.status(cached.statusCode).json(cached.body);
        }

        // Monkey-patch res.json to intercept the response and store it
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            // Only cache 2xx responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, { body, statusCode: res.statusCode }, ttl);
            }
            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
};

// ─── Invalidation helpers ────────────────────────────────────

/**
 * Invalidate ALL cache keys whose key contains the given substring.
 *
 *   invalidatePrefix('/api/posts')  → clears feed, detail, user-posts, …
 *   invalidatePrefix('/api/public') → clears branding, about, news, …
 *
 * Call this from mutation handlers (POST / PUT / DELETE).
 */
export const invalidatePrefix = (...prefixes: string[]) => {
    const keys = cache.keys();
    for (const key of keys) {
        for (const prefix of prefixes) {
            if (key.includes(prefix)) {
                cache.del(key);
                break;
            }
        }
    }
};

/**
 * Invalidate cache entries for a specific user.
 *
 *   invalidateUser('abc123')  → clears all "u:abc123:..." keys
 */
export const invalidateUser = (userId: string) => {
    const prefix = `u:${userId}:`;
    const keys = cache.keys().filter(k => k.startsWith(prefix));
    if (keys.length > 0) cache.del(keys);
};

/**
 * Flush the entire cache. Use sparingly (e.g. admin settings change).
 */
export const flushAll = () => {
    cache.flushAll();
};

// ─── Route ↔ Invalidation mapping ───────────────────────────
/**
 * Defines which cache prefixes should be invalidated when a mutation
 * happens on a given route prefix. For example, mutating /api/admin/notable-alumni
 * should also bust /api/public (because the public landing page fetches
 * notable-alumni from /api/public/notable-alumni).
 */
const INVALIDATION_MAP: Record<string, string[]> = {
    '/api/posts':         ['/api/posts', '/api/public/feed'],
    '/api/events':        ['/api/events', '/api/event-posts'],
    '/api/event-posts':   ['/api/event-posts'],
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
    '/api/upload':        [],   // uploads don't have cached GETs to bust
};

/**
 * Auto-invalidation middleware. Mount this ONCE on the Express app
 * (before route registration). It intercepts successful mutation
 * responses (POST / PUT / DELETE / PATCH → 2xx) and busts the
 * relevant cache entries automatically so you don't need to call
 * invalidatePrefix() inside every single handler.
 *
 *   app.use(autoInvalidate());
 */
export const autoInvalidate = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Only intercept mutations
        if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
            return next();
        }

        // Hook into res.json / res.send to run invalidation after a successful response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const doInvalidation = () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const path = req.originalUrl || req.url;
                // Find which route prefix this mutation belongs to
                for (const [prefix, targets] of Object.entries(INVALIDATION_MAP)) {
                    if (path.startsWith(prefix)) {
                        // Always invalidate the prefix itself + any cross-dependencies
                        invalidatePrefix(prefix, ...targets);
                        // Also invalidate per-user caches for the current user
                        if ((req.session as any)?.userId) {
                            invalidateUser((req.session as any).userId);
                        }
                        break;
                    }
                }
            }
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
export const cacheStats = () => cache.getStats();

export default cache;
