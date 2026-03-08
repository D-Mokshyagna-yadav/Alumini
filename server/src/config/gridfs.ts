import mongoose from 'mongoose';
import fs from 'fs';

let _bucket: InstanceType<typeof mongoose.mongo.GridFSBucket> | null = null;

/**
 * Get (or create) the GridFS bucket for storing uploaded files.
 * Bucket name: "uploads"  →  collections: uploads.files + uploads.chunks
 */
export const getGridFSBucket = (): InstanceType<typeof mongoose.mongo.GridFSBucket> => {
    if (!_bucket) {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database not connected – cannot create GridFS bucket');
        _bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    }
    return _bucket;
};

/**
 * Store a Buffer directly into GridFS (no temp file needed).
 * Uses direct write for speed — avoids Readable.from() overhead.
 * @param buffer      The file contents in memory
 * @param gridName    The "filename" stored in GridFS, e.g. "username/profile/123-456.jpg"
 * @param contentType MIME type
 * @returns The inserted GridFS ObjectId
 */
export const storeBufferInGridFS = (
    buffer: Buffer,
    gridName: string,
    contentType: string,
): Promise<mongoose.Types.ObjectId> => {
    return new Promise((resolve, reject) => {
        const bucket = getGridFSBucket();
        const uploadStream = bucket.openUploadStream(gridName, {
            contentType,
            metadata: { size: buffer.length, uploadedAt: new Date() },
        });

        uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
        uploadStream.on('error', reject);

        // Direct write + end is faster than piping a Readable stream
        uploadStream.end(buffer);
    });
};

/**
 * Store a local file into GridFS (used only for video processing that requires disk).
 * @param localPath   Absolute path to the file on disk (temp file)
 * @param gridName    The "filename" stored in GridFS, e.g. "username/profile/123-456.jpg"
 * @param contentType MIME type
 * @returns The inserted GridFS ObjectId
 */
export const storeFileInGridFS = (
    localPath: string,
    gridName: string,
    contentType: string,
): Promise<mongoose.Types.ObjectId> => {
    return new Promise((resolve, reject) => {
        const bucket = getGridFSBucket();
        const readStream = fs.createReadStream(localPath);
        const uploadStream = bucket.openUploadStream(gridName, { contentType });

        readStream.pipe(uploadStream);
        uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
        uploadStream.on('error', reject);
        readStream.on('error', reject);
    });
};

/**
 * Delete every GridFS file that matches the given filename.
 */
export const deleteGridFSFile = async (gridName: string): Promise<number> => {
    const bucket = getGridFSBucket();
    const files = await bucket.find({ filename: gridName }).toArray();
    for (const f of files) {
        await bucket.delete(f._id);
    }
    return files.length;
};

/**
 * Safely delete a temp file from disk – never throws.
 */
export const cleanupTempFile = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* ignore */ }
};
