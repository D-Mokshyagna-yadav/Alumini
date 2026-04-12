/**
 * Cache and Performance Monitoring Endpoint
 * Provides insights into cache performance and allows manual invalidation
 */

import express, { Router } from 'express';
import { cacheStats, flushAll, invalidatePrefix } from '../config/cache-enhanced';
import logger from '../config/logger';

const router = Router();

/**
 * GET /api/admin/cache/stats
 * Returns current cache statistics (hit rate, entries, etc.)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await cacheStats();
        const hitRate = stats.hits + stats.misses > 0 
            ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
            : 'N/A';

        res.json({
            success: true,
            cache: {
                hits: stats.hits,
                misses: stats.misses,
                hitRate: `${hitRate}%`,
                totalEntries: stats.keys,
                storageType: process.env.REDIS_URL ? 'Redis' : 'Memory',
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error('Cache stats error:', err);
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});

/**
 * POST /api/admin/cache/invalidate
 * Manually invalidate cache by prefix(es)
 * Body: { prefixes: ['/api/users', '/api/posts'] }
 */
router.post('/invalidate', async (req, res) => {
    try {
        const { prefixes } = req.body;
        if (!Array.isArray(prefixes) || prefixes.length === 0) {
            return res.status(400).json({ error: 'prefixes must be a non-empty array' });
        }

        const sanitized = prefixes.filter(p => typeof p === 'string' && p.startsWith('/api/'));
        if (sanitized.length === 0) {
            return res.status(400).json({ error: 'No valid API prefixes provided' });
        }

        await invalidatePrefix(...sanitized);
        logger.info(`🗑️  Cache invalidated for: ${sanitized.join(', ')}`);

        res.json({
            success: true,
            message: `Invalidated cache for ${sanitized.length} prefix(es)`,
            prefixes: sanitized,
        });
    } catch (err) {
        logger.error('Cache invalidation error:', err);
        res.status(500).json({ error: 'Failed to invalidate cache' });
    }
});

/**
 * POST /api/admin/cache/flush
 * Clear ALL cache entirely (use cautiously)
 */
router.post('/flush', async (req, res) => {
    try {
        await flushAll();
        logger.warn('🗑️  ⚠️  ENTIRE CACHE FLUSHED');

        res.json({
            success: true,
            message: 'Cache cleared successfully',
            warning: 'All cached data has been removed',
        });
    } catch (err) {
        logger.error('Cache flush error:', err);
        res.status(500).json({ error: 'Failed to flush cache' });
    }
});

/**
 * GET /api/admin/cache/recommendations
 * Provides optimization recommendations based on current stats
 */
router.get('/recommendations', async (req, res) => {
    try {
        const stats = await cacheStats();
        const recommendations: string[] = [];

        const hitRate = stats.hits + stats.misses > 0 
            ? (stats.hits / (stats.hits + stats.misses))
            : 0;

        if (hitRate < 0.3) {
            recommendations.push('⚠️  Low cache hit rate (<30%). Consider increasing TTL values.');
        }
        if (stats.keys > 4000) {
            recommendations.push('⚠️  High cache entries (>4k). Consider shorter TTLs or Redis.');
        }
        if (!process.env.REDIS_URL && stats.keys > 1000) {
            recommendations.push('💾 Using memory store with >1k entries. Consider enabling Redis for scalability.');
        }
        if (stats.misses === 0 && stats.hits > 0) {
            recommendations.push('✅ Excellent hit rate! Cache is performing well.');
        }

        res.json({
            success: true,
            hitRate: `${(hitRate * 100).toFixed(2)}%`,
            totalRequests: stats.hits + stats.misses,
            recommendations,
        });
    } catch (err) {
        logger.error('Recommendations error:', err);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

export const cacheAdminRouter = router;
