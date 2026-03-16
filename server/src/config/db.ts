import mongoose from 'mongoose';
import logger from './logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const conn = await mongoose.connect(
                process.env.MONGO_URI || 'mongodb://localhost:27017/alumni_association',
                {
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 45000,
                    connectTimeoutMS: 30000,
                    maxPoolSize: 10,
                    retryWrites: true,
                    retryReads: true,
                }
            );

            logger.startup(`MongoDB Connected: ${conn.connection.host}`);

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected. Attempting to reconnect...');
            });
            mongoose.connection.on('reconnected', () => {
                logger.startup('MongoDB reconnected successfully.');
            });
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err.message);
            });

            return;
        } catch (error) {
            const msg = (error as Error).message;
            if (attempt < MAX_RETRIES) {
                logger.warn(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${msg}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            } else {
                logger.error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${msg}`);
                process.exit(1);
            }
        }
    }
};

export default connectDB;
