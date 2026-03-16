import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { uploadProgressStore } from './uploadProgress';

// When VITE_API_URL is set (e.g. "https://api.example.com/api"), axios calls
// that URL directly. When empty, requests go to the same origin at /api.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
});

// ─── Client-side GET cache ──────────────────────────────────
// Caches GET responses in memory so repeat fetches (e.g. navigating back
// to a page, re-mounting a component) are instant.  Mutations auto-invalidate.

interface CacheEntry {
    data: AxiosResponse;
    timestamp: number;
}

const _cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 15_000; // 15 s – fresh enough for most UI refetches
let uploadReqCounter = 0;

/** Build a deterministic cache key from method + url + params */
const cacheKey = (config: AxiosRequestConfig): string => {
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${config.method?.toUpperCase() || 'GET'}:${config.baseURL || ''}${config.url || ''}${params}`;
};

// ── Request interceptor: return cached data if available ──────
api.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();
    const isUpload = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isUpload && method !== 'get') {
        const uploadId = `up-${Date.now()}-${uploadReqCounter++}`;
        (config as any).__uploadId = uploadId;
        const existingProgress = config.onUploadProgress;
        uploadProgressStore.start(uploadId);
        config.onUploadProgress = (event) => {
            const total = event.total || 0;
            if (total > 0) {
                uploadProgressStore.update(uploadId, (event.loaded / total) * 100);
            }
            if (typeof existingProgress === 'function') {
                existingProgress(event);
            }
        };
    }

    if (config.method === 'get' || !config.method) {
        const key = cacheKey(config);
        const entry = _cache.get(key);
        if (entry && Date.now() - entry.timestamp < DEFAULT_TTL) {
            // Attach flag so response interceptor knows it's from cache
            (config as any).__fromCache = true;
            (config as any).__cachedResponse = entry.data;
            // Create an adapter that immediately resolves with cached data
            config.adapter = () => Promise.resolve(entry.data);
        }
    }
    return config;
});

// ── Response interceptor: store new GET responses in cache ────
api.interceptors.response.use(
    (response) => {
        const config = response.config;
        const uploadId = (config as any).__uploadId;
        if (uploadId) {
            uploadProgressStore.finish(uploadId);
        }
        if (
            (config.method === 'get' || !config.method) &&
            response.status >= 200 &&
            response.status < 300 &&
            !(config as any).__fromCache
        ) {
            const key = cacheKey(config);
            _cache.set(key, { data: response, timestamp: Date.now() });
        }

        // Auto-invalidate on successful mutations
        if (
            config.method &&
            config.method !== 'get' &&
            response.status >= 200 &&
            response.status < 300
        ) {
            invalidateCache(config.url || '');
        }

        return response;
    },
    (error) => {
        const uploadId = (error?.config as any)?.__uploadId;
        if (uploadId) {
            uploadProgressStore.fail(uploadId);
        }
        // Auto-redirect to login on 401 (session expired)
        if (error.response?.status === 401) {
            flushClientCache();
            const path = window.location.pathname;
            // Don't redirect if already on public/auth pages
            if (path !== '/login' && path !== '/register' && path !== '/' && !path.startsWith('/forgot')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

// ─── Invalidation mapping (mirrors server-side INVALIDATION_MAP) ──
const CLIENT_INVALIDATION_MAP: Record<string, string[]> = {
    '/posts':         ['/posts', '/public/feed'],
    '/events':        ['/events', '/event-posts'],
    '/event-posts':   ['/event-posts'],
    '/jobs':          ['/jobs'],
    '/connections':   ['/connections', '/users'],
    '/users':         ['/users'],
    '/notifications': ['/notifications'],
    '/chat':          ['/chat'],
    '/groups':        ['/groups'],
    '/gallery':       ['/gallery'],
    '/saved':         ['/saved'],
    '/public':        ['/public'],
    '/admin':         ['/admin', '/public', '/posts', '/events', '/jobs', '/users'],
    '/upload':        [],
    '/auth':          [],
};

/**
 * Invalidate client cache entries whose key contains any of the given prefixes.
 * Called automatically by the response interceptor on mutations, and can also
 * be called manually:
 *
 *   import { invalidateCache } from '@/lib/api';
 *   await api.post('/posts', data);
 *   invalidateCache('/posts');   // already done automatically, but explicit is fine too
 */
export const invalidateCache = (...prefixes: string[]) => {
    const toDelete: string[] = [];

    for (const prefix of prefixes) {
        // Find matching route group from the map
        for (const [route, targets] of Object.entries(CLIENT_INVALIDATION_MAP)) {
            if (prefix.startsWith(route)) {
                // Collect all prefixes to bust (the route itself + its cross-deps)
                const allPrefixes = [route, ...targets];
                for (const key of _cache.keys()) {
                    for (const p of allPrefixes) {
                        if (key.includes(p)) {
                            toDelete.push(key);
                            break;
                        }
                    }
                }
                break;
            }
        }

        // Also do a direct prefix match for anything not in the map
        for (const key of _cache.keys()) {
            if (key.includes(prefix) && !toDelete.includes(key)) {
                toDelete.push(key);
            }
        }
    }

    for (const key of toDelete) {
        _cache.delete(key);
    }
};

/** Flush the entire client cache (e.g. on logout) */
export const flushClientCache = () => {
    _cache.clear();
};

export default api;
