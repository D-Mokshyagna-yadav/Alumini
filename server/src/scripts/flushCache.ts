#!/usr/bin/env npx ts-node
/**
 * Flush cache script
 * Run: npm run cache:flush
 *
 * WARNING: This clears ALL cached data. Use only when necessary.
 */

import { initializeCache, flushAll } from '../config/cache-enhanced';
import logger from '../config/logger';

const flush = async () => {
    try {
        logger.info('⚠️  Flushing cache...');
        
        await initializeCache();
        await flushAll();
        
        logger.info('✅ Cache flushed successfully');
        logger.info('💡 Users may experience slower response times as cache rebuilds');
        
        process.exit(0);
    } catch (err) {
        logger.error('❌ Failed to flush cache:', err);
        process.exit(1);
    }
};

flush();
