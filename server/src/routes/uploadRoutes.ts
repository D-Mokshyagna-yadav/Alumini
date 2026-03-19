import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import User, { UserStatus } from '../models/User';
import logger from '../config/logger';
import { storeBufferInGridFS, storeFileInGridFS, deleteGridFSFile, cleanupTempFile } from '../config/gridfs';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────

const sanitizeUsername = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '_');

const generateFilename = (originalname: string): string => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    return unique + path.extname(originalname);
};

// ── Multer – memory storage (no temp files) ────────────────

const memStorage = multer.memoryStorage();

// File-type filters
const mediaFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/3gpp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip',
    ];
    cb(null, allowed.includes(file.mimetype));
};

const imageFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    cb(null, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype));
};

// Multer instances – all use memory storage
const postUpload = multer({ storage: memStorage, fileFilter: mediaFilter, limits: { fileSize: 200 * 1024 * 1024 } });
const profileUpload = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const eventUpload = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const newsUpload = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const jobUpload = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Shared: compress image buffer & store in GridFS ───────

/**
 * Compress image to optimized WebP and store in GridFS directly from buffer.
 * All images are compressed for bandwidth savings — direct MongoDB storage.
 * Returns the public relative URL, e.g. `/api/uploads/username/profile/123-456.webp`
 */
const processImageAndStore = async (
    file: Express.Multer.File,
    username: string,
    folder: string,
): Promise<string> => {
    let buffer = file.buffer;
    let filename = generateFilename(file.originalname);
    let contentType = file.mimetype;

    // Convert to lossless WebP — zero quality loss, smaller than PNG
    try {
        const img = sharp(buffer);
        const meta = await img.metadata();
        // GIFs with animation → keep as-is to preserve animation
        if (contentType === 'image/gif' && meta.pages && meta.pages > 1) {
            // Store animated GIF as-is
        } else {
            buffer = await img.webp({ lossless: true, effort: 4 }).toBuffer();
            filename = filename.replace(/\.[^.]+$/, '.webp');
            contentType = 'image/webp';
        }
    } catch (err) {
        console.error('Image conversion failed, storing original:', err);
    }

    const gridName = `${username}/${folder}/${filename}`;
    await storeBufferInGridFS(buffer, gridName, contentType);
    return `/api/uploads/${gridName}`;
};

// ── Routes ─────────────────────────────────────────────────

// POST /api/upload/profile-pic
router.post('/profile-pic', requireAuth, profileUpload.single('avatar'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });
        const username = sanitizeUsername(user.name);

        // Delete old avatar from GridFS (support full URLs and relative paths)
        if (user.avatar) {
            try {
                const oldGrid = (user.avatar as string).replace(/^(?:https?:\/\/[^\/]+)?\/?(?:api\/)?uploads\//, '');
                await deleteGridFSFile(oldGrid);
            } catch (e) {
                console.error('Failed to delete old avatar from GridFS:', e);
            }
        }

        const avatarRel = await processImageAndStore(file, username, 'profile');
        user.avatar = avatarRel;
        await user.save();

        logger.log('Updated avatar for', user._id, avatarRel);
        res.json({ avatar: avatarRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/cover-photo
router.post('/cover-photo', requireAuth, profileUpload.single('cover'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });
        const username = sanitizeUsername(user.name);

        // Delete old cover from GridFS (support full URLs and relative paths)
        if ((user as any).coverImage) {
            try {
                const oldGrid = ((user as any).coverImage as string).replace(/^(?:https?:\/\/[^\/]+)?\/?(?:api\/)?uploads\//, '');
                await deleteGridFSFile(oldGrid);
            } catch (e) {
                console.error('Failed to delete old cover from GridFS:', e);
            }
        }

        const coverRel = await processImageAndStore(file, username, 'profile');
        (user as any).coverImage = coverRel;
        await user.save();

        res.json({ cover: coverRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/event-banner
router.post('/event-banner', requireAuth, eventUpload.single('banner'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });
        const username = sanitizeUsername(user.name);

        const fileRel = await processImageAndStore(file, username, 'events');
        res.json({ url: fileRel, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/news-image (admin only)
router.post('/news-image', requireAuth, newsUpload.single('image'), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const username = sanitizeUsername(user.name);

        const fileRel = await processImageAndStore(file, username, 'news');
        res.json({ url: fileRel, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/notable-alumni-image (admin only)
const alumniUpload = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
router.post('/notable-alumni-image', requireAuth, alumniUpload.single('image'), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const username = sanitizeUsername(user.name);

        const fileRel = await processImageAndStore(file, username, 'notable-alumni');
        res.json({ url: fileRel, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/job-image
router.post('/job-image', requireAuth, jobUpload.single('image'), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const username = sanitizeUsername(user.name);

        const fileRel = await processImageAndStore(file, username, 'jobs');
        res.json({ url: fileRel, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/post-media – images, videos, audio, docs (up to 10 files)
router.post('/post-media', requireAuth, postUpload.array('media', 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

        const user = await User.findById(req.session!.userId);
        const username = sanitizeUsername(user!.name);

        const mediaUrls: Array<{ type: string; url: string }> = [];

        for (const file of files) {
            let buffer = file.buffer;
            let filename = generateFilename(file.originalname);
            let contentType = file.mimetype;
            const relPath = (fn: string) => `/api/uploads/${username}/posts/${fn}`;

            if (file.mimetype.startsWith('image/')) {
                // Convert to lossless WebP — zero quality loss
                try {
                    const img = sharp(buffer);
                    const meta = await img.metadata();
                    if (!(contentType === 'image/gif' && meta.pages && meta.pages > 1)) {
                        buffer = await img.webp({ lossless: true, effort: 4 }).toBuffer();
                        filename = filename.replace(/\.[^.]+$/, '.webp');
                        contentType = 'image/webp';
                    }
                } catch (err) {
                    console.error('Image conversion failed, storing original:', err);
                }
                const gridName = `${username}/posts/${filename}`;
                await storeBufferInGridFS(buffer, gridName, contentType);
                mediaUrls.push({ type: 'image', url: relPath(filename) });

            } else if (file.mimetype.startsWith('video/')) {
                // Videos need temp file for ffmpeg processing
                const tmpDir = path.join(os.tmpdir(), 'alumni-video-tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const tmpPath = path.join(tmpDir, filename);
                fs.writeFileSync(tmpPath, buffer);

                let finalPath = tmpPath;
                let finalFilename = filename;
                try {
                    const info: any = await new Promise((resolve, reject) =>
                        ffmpeg.ffprobe(tmpPath, (err: any, meta: any) => (err ? reject(err) : resolve(meta))),
                    );
                    const duration = info.format.duration || 0;
                    if (duration > 90) {
                        const trimmedPath = tmpPath + '.mp4';
                        await new Promise<void>((resolve, reject) => {
                            ffmpeg(tmpPath)
                                .setStartTime(0)
                                .setDuration(90)
                                .outputOptions(['-c copy'])
                                .save(trimmedPath)
                                .on('end', () => resolve())
                                .on('error', (e: any) => reject(e));
                        });
                        cleanupTempFile(tmpPath);
                        finalPath = trimmedPath;
                        finalFilename = path.basename(trimmedPath);
                        contentType = 'video/mp4';
                    }
                } catch (err) {
                    console.error('Video processing failed:', err);
                }
                const gridName = `${username}/posts/${finalFilename}`;
                await storeFileInGridFS(finalPath, gridName, contentType);
                cleanupTempFile(finalPath);
                mediaUrls.push({ type: 'video', url: relPath(finalFilename) });

            } else if (file.mimetype.startsWith('audio/')) {
                const gridName = `${username}/posts/${filename}`;
                await storeBufferInGridFS(buffer, gridName, contentType);
                mediaUrls.push({ type: 'audio', url: relPath(filename) });

            } else {
                const gridName = `${username}/posts/${filename}`;
                await storeBufferInGridFS(buffer, gridName, contentType);
                mediaUrls.push({ type: 'file', url: relPath(filename) });
            }
        }

        logger.log('Uploaded media:', mediaUrls.map(m => m.url));
        res.json({ media: mediaUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

export { router as uploadRouter };
