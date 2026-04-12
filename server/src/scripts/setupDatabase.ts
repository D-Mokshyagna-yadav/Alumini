#!/usr/bin/env npx ts-node
/**
 * Database initialization script
 * Run once: npm run setup:db
 * 
 * Creates all necessary indexes for optimal query performance
 */

import connectDB from '../config/db';
import { createAllIndexes, analyzeIndexes } from '../config/indexing';
import { initializeCache } from '../config/cache-enhanced';
import logger from '../config/logger';

const setup = async () => {
    try {
        logger.info('🚀 Starting database setup...');

        // Connect to MongoDB
        logger.info('📡 Connecting to database...');
        await connectDB();

        // Initialize cache
        logger.info('💾 Initializing cache system...');
        await initializeCache();

        // Create indexes
        logger.info('📑 Creating indexes...');
        await createAllIndexes();

        // Analyze indexes
        logger.info('📊 Analyzing indexes...');
        await analyzeIndexes();

        logger.info('✅ Database setup completed successfully!');
        logger.info('💡 Your system is now optimized for performance.');
        
        process.exit(0);
    } catch (err) {
        logger.error('❌ Setup failed:', err);
        process.exit(1);
    }
};

setup();
