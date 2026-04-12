import mongoose from 'mongoose';
import connectDB from '../config/db';
import logger from '../config/logger';

// Ensure all models are registered before syncing indexes.
import '../models/User';
import '../models/Post';
import '../models/NewsItem';
import '../models/Announcement';
import '../models/Event';
import '../models/EventPost';
import '../models/Job';
import '../models/Notification';
import '../models/Connection';
import '../models/Conversation';
import '../models/Message';
import '../models/Group';
import '../models/GalleryAlbum';
import '../models/PublicContent';
import '../models/SavedCollection';
import '../models/SiteSettings';
import '../models/Administration';
import '../models/NotableAlumni';
import '../models/OTP';
import '../models/Telemetry';

interface SyncIndexesOptions {
    continueOnError?: boolean;
    logPrefix?: string;
}

export async function syncAllIndexes(options: SyncIndexesOptions = {}) {
    const continueOnError = options.continueOnError ?? true;
    const logPrefix = options.logPrefix || '[index-sync]';

    const modelNames = mongoose.modelNames().sort();
    const failures: Array<{ model: string; error: string }> = [];

    logger.startup(`${logPrefix} syncing indexes for ${modelNames.length} models`);

    for (const modelName of modelNames) {
        const model = mongoose.model(modelName);
        try {
            const dropped = await model.syncIndexes();
            const droppedSummary = Array.isArray(dropped) && dropped.length > 0
                ? ` dropped: ${dropped.join(', ')}`
                : ' dropped: none';
            logger.startup(`${logPrefix} ${modelName} synced.${droppedSummary}`);
        } catch (error) {
            const message = (error as Error).message || String(error);
            failures.push({ model: modelName, error: message });
            logger.error(`${logPrefix} ${modelName} failed: ${message}`);
            if (!continueOnError) {
                throw error;
            }
        }
    }

    if (failures.length > 0) {
        logger.warn(`${logPrefix} completed with ${failures.length} model failures`);
    } else {
        logger.startup(`${logPrefix} completed successfully`);
    }

    return { totalModels: modelNames.length, failures };
}

if (require.main === module) {
    void (async () => {
        try {
            await connectDB();
            const result = await syncAllIndexes({ continueOnError: true, logPrefix: '[reindex]' });
            process.exit(result.failures.length > 0 ? 1 : 0);
        } catch (error) {
            logger.error('[reindex] fatal failure', error);
            process.exit(1);
        }
    })();
}
