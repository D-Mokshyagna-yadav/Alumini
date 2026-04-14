/**
 * ─────────────────────────────────────────────────────────────────
 * DATABASE INDEXING STRATEGY
 * ─────────────────────────────────────────────────────────────────
 *
 * This file documents all indexes created for query performance.
 * Run this script ONCE: npx ts-node src/scripts/createIndexes.ts
 *
 * Index creation is automatic on schema definition, but this centralizes
 * documentation and allows manual optimization/recreation if needed.
 */

import User from '../models/User';
import Post from '../models/Post';
import Event from '../models/Event';
import Job from '../models/Job';
import Connection from '../models/Connection';
import Notification from '../models/Notification';
import GalleryAlbum from '../models/GalleryAlbum';
import SavedCollection from '../models/SavedCollection';
import NewsItem from '../models/NewsItem';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import logger from '../config/logger';

/**
 * Common index patterns:
 * - { field: 1 } = ascending order
 * - { field: -1 } = descending order (for date queries, use -1)
 * - { sparse: true } = skip documents without the field
 * - { unique: true } = enforce uniqueness
 * - { expireAfterSeconds: N } = TTL index (auto-delete)
 */

export const createAllIndexes = async () => {
    try {
        logger.info('🔄 Creating database indexes...');

        // ─── USER INDEXES ────────────────────────────────────────
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ status: 1, name: 1 });
        await User.collection.createIndex({ status: 1, graduationYear: 1, name: 1 });
        await User.collection.createIndex({ status: 1, isMentor: 1, name: 1 });
        await User.collection.createIndex({ role: 1, status: 1, createdAt: -1 });
        await User.collection.createIndex({ department: 1, status: 1 });
        await User.collection.createIndex({ skills: 1, status: 1 });
        await User.collection.createIndex({ createdAt: -1 });
        logger.info('✅ User indexes created');

        // ─── POST INDEXES ────────────────────────────────────────
        await Post.collection.createIndex({ author: 1, createdAt: -1 });
        await Post.collection.createIndex({ visibility: 1, status: 1, createdAt: -1 });
        await Post.collection.createIndex({ 'likes.userId': 1 });
        await Post.collection.createIndex({ createdAt: -1 });
        await Post.collection.createIndex({ status: 1, createdAt: -1 });
        logger.info('✅ Post indexes created');

        // ─── EVENT INDEXES ───────────────────────────────────────
        await Event.collection.createIndex({ status: 1, date: 1 });
        await Event.collection.createIndex({ status: 1, isCompleted: 1, date: 1 });
        await Event.collection.createIndex({ date: 1 });
        await Event.collection.createIndex({ organizer: 1, date: -1 });
        await Event.collection.createIndex({ status: 1, date: -1 });
        await Event.collection.createIndex({ eventType: 1, date: 1 });
        logger.info('✅ Event indexes created');

        // ─── JOB INDEXES ─────────────────────────────────────────
        await Job.collection.createIndex({ status: 1, postedAt: -1 });
        await Job.collection.createIndex({ company: 1, status: 1 });
        await Job.collection.createIndex({ 'requirements.skills': 1 });
        await Job.collection.createIndex({ industry: 1, status: 1 });
        await Job.collection.createIndex({ 'salary.min': 1, 'salary.max': 1 });
        await Job.collection.createIndex({ deadline: 1 });
        await Job.collection.createIndex({ location: 1, status: 1 });
        logger.info('✅ Job indexes created');

        // ─── CONNECTION INDEXES ──────────────────────────────────
        await Connection.collection.createIndex({ requester: 1, recipient: 1 }, { unique: true });
        await Connection.collection.createIndex({ status: 1, createdAt: -1 });
        await Connection.collection.createIndex({ requester: 1, status: 1 });
        await Connection.collection.createIndex({ recipient: 1, status: 1 });
        logger.info('✅ Connection indexes created');

        // ─── NOTIFICATION INDEXES ───────────────────────────────
        await Notification.collection.createIndex({ recipient: 1, createdAt: -1 });
        await Notification.collection.createIndex({ recipient: 1, read: 1, createdAt: -1 });
        await Notification.collection.createIndex({ recipient: 1, type: 1, createdAt: -1 });
        await Notification.collection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 2592000 }); // 30 days
        logger.info('✅ Notification indexes created');

        // ─── GALLERY INDEXES ─────────────────────────────────────
        await GalleryAlbum.collection.createIndex({ owner: 1, createdAt: -1 });
        await GalleryAlbum.collection.createIndex({ 'media.uploadedAt': -1 });
        await GalleryAlbum.collection.createIndex({ visibility: 1 });
        logger.info('✅ Gallery indexes created');

        // ─── SAVED COLLECTION INDEXES ────────────────────────────
        await SavedCollection.collection.createIndex({ user: 1, name: 1 }, { unique: true });
        await SavedCollection.collection.createIndex({ user: 1, createdAt: -1 });
        await SavedCollection.collection.createIndex({ 'items.resourceId': 1 });
        logger.info('✅ SavedCollection indexes created');

        // ─── NEWS ITEM INDEXES ───────────────────────────────────
        // Text search index is handled by the model schema (news_text_search_idx)
        // to avoid conflicts. See src/models/NewsItem.ts for text index definition.
        await NewsItem.collection.createIndex({ draft: 1, priority: -1, publishedAt: -1, createdAt: -1 });
        await NewsItem.collection.createIndex({ publishedAt: -1 });
        logger.info('✅ NewsItem indexes created');

        // ─── MESSAGE INDEXES ─────────────────────────────────────
        await Message.collection.createIndex({ conversationId: 1, createdAt: -1 });
        await Message.collection.createIndex({ sender: 1, createdAt: -1 });
        await Message.collection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 7776000 }); // 90 days
        logger.info('✅ Message indexes created');

        // ─── CONVERSATION INDEXES ───────────────────────────────
        await Conversation.collection.createIndex({ participants: 1, updatedAt: -1 });
        await Conversation.collection.createIndex({ isRequest: 1, updatedAt: -1 });
        await Conversation.collection.createIndex({ updatedAt: -1 });
        logger.info('✅ Conversation indexes created');

        logger.info('✅ All database indexes created successfully!');
    } catch (err) {
        logger.error('❌ Error creating indexes:', err);
        throw err;
    }
};

/**
 * Analyze index usage — run after significant data changes
 */
export const analyzeIndexes = async () => {
    try {
        logger.info('📊 Analyzing index usage...');
        const collections = [User, Post, Event, Job, Connection, Notification];
        
        for (const Collection of collections) {
            const count = await Collection.countDocuments();
            logger.info(`${Collection.collection.name}: ${count} documents`);
        }
    } catch (err) {
        logger.error('Error analyzing indexes:', err);
    }
};

/**
 * Drop and recreate all indexes (use after production issues)
 */
export const rebuildAllIndexes = async () => {
    try {
        logger.info('🔨 Rebuilding all indexes...');
        const collections = [User, Post, Event, Job, Connection, Notification, GalleryAlbum, SavedCollection, NewsItem, Message, Conversation];
        
        for (const Collection of collections) {
            await Collection.collection.dropIndexes();
        }
        
        await createAllIndexes();
        logger.info('✅ All indexes rebuilt');
    } catch (err) {
        logger.error('Error rebuilding indexes:', err);
        throw err;
    }
};
