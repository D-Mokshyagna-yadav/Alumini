import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import User, { UserStatus } from '../models/User';
import { storeFileInGridFS, deleteGridFSFile, cleanupTempFile } from '../config/gridfs';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────

const sanitizeUsername = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '_');

/** Middleware: reject unauthenticated / unverified users */
const requireAuth = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') {
        return res.status(403).json({ message: 'Account not approved. Uploads are blocked until verification.' });
    }
    next();
};

// ── Multer – write to OS temp directory ────────────────────

const TEMP_DIR = path.join(os.tmpdir(), 'alumni-uploads');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const tempStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_DIR),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    },
});

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

// Multer instances – all use temp storage now
const postUpload = multer({ storage: tempStorage, fileFilter: mediaFilter, limits: { fileSize: 200 * 1024 * 1024 } });
const profileUpload = multer({ storage: tempStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const eventUpload = multer({ storage: tempStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const newsUpload = multer({ storage: tempStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const jobUpload = multer({ storage: tempStorage, fileFilter: imageFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// ── Shared: compress image & store in GridFS ──────────────

/**
 * Optionally compress an image (>10 MB → lossless webp) then store in GridFS.
 * Returns the public relative URL, e.g. `/uploads/username/profile/123-456.jpg`
 */
const processImageAndStore = async (
    file: Express.Multer.File,
    username: string,
    folder: string,
): Promise<string> => {
    let filePath = file.path;
    let filename = file.filename;
    let contentType = file.mimetype;

    // Compress large images
    if (file.size > 10 * 1024 * 1024) {
        try {
            const compressedPath = filePath + '.webp';
            await sharp(filePath).webp({ lossless: true }).toFile(compressedPath);
            cleanupTempFile(filePath);
            filePath = compressedPath;
            filename = path.basename(compressedPath);
            contentType = 'image/webp';
        } catch (err) {
            console.error('Image compression failed:', err);
        }
    }

    const gridName = `${username}/${folder}/${filename}`;
    await storeFileInGridFS(filePath, gridName, contentType);
    cleanupTempFile(filePath);
    return `/uploads/${gridName}`;
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

        // Delete old avatar from GridFS
        if (user.avatar) {
            const oldGrid = user.avatar.replace(/^\/uploads\//, '');
            deleteGridFSFile(oldGrid).catch(e => console.error('Failed to delete old avatar from GridFS:', e));
        }

        const avatarRel = await processImageAndStore(file, username, 'profile');
        user.avatar = avatarRel;
        await user.save();

        console.log('Updated avatar for', user._id, avatarRel);
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

        // Delete old cover from GridFS
        if ((user as any).coverImage) {
            const oldGrid = ((user as any).coverImage as string).replace(/^\/uploads\//, '');
            deleteGridFSFile(oldGrid).catch(e => console.error('Failed to delete old cover from GridFS:', e));
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
            let filePath = file.path;
            let filename = file.filename;
            let contentType = file.mimetype;
            const relPath = (fn: string) => `/uploads/${username}/posts/${fn}`;

            if (file.mimetype.startsWith('image/')) {
                // Compress large images
                if (file.size > 10 * 1024 * 1024) {
                    try {
                        const compressedPath = filePath + '.webp';
                        await sharp(filePath).webp({ lossless: true }).toFile(compressedPath);
                        cleanupTempFile(filePath);
                        filePath = compressedPath;
                        filename = path.basename(compressedPath);
                        contentType = 'image/webp';
                    } catch (err) {
                        console.error('Image compression failed:', err);
                    }
                }
                const gridName = `${username}/posts/${filename}`;
                await storeFileInGridFS(filePath, gridName, contentType);
                cleanupTempFile(filePath);
                mediaUrls.push({ type: 'image', url: relPath(filename) });

            } else if (file.mimetype.startsWith('video/')) {
                // Trim to 90 s if longer
                try {
                    const info: any = await new Promise((resolve, reject) =>
                        ffmpeg.ffprobe(filePath, (err: any, meta: any) => (err ? reject(err) : resolve(meta))),
                    );
                    const duration = info.format.duration || 0;
                    if (duration > 90) {
                        const trimmedPath = filePath + '.mp4';
                        await new Promise<void>((resolve, reject) => {
                            ffmpeg(filePath)
                                .setStartTime(0)
                                .setDuration(90)
                                .outputOptions(['-c:v libx264', '-preset veryfast', '-crf 23'])
                                .save(trimmedPath)
                                .on('end', () => resolve())
                                .on('error', (e: any) => reject(e));
                        });
                        cleanupTempFile(filePath);
                        filePath = trimmedPath;
                        filename = path.basename(trimmedPath);
                        contentType = 'video/mp4';
                    }
                } catch (err) {
                    console.error('Video processing failed:', err);
                }
                const gridName = `${username}/posts/${filename}`;
                await storeFileInGridFS(filePath, gridName, contentType);
                cleanupTempFile(filePath);
                mediaUrls.push({ type: 'video', url: relPath(filename) });

            } else if (file.mimetype.startsWith('audio/')) {
                const gridName = `${username}/posts/${filename}`;
                await storeFileInGridFS(filePath, gridName, contentType);
                cleanupTempFile(filePath);
                mediaUrls.push({ type: 'audio', url: relPath(filename) });

            } else {
                const gridName = `${username}/posts/${filename}`;
                await storeFileInGridFS(filePath, gridName, contentType);
                cleanupTempFile(filePath);
                mediaUrls.push({ type: 'file', url: relPath(filename) });
            }
        }

        console.log('Uploaded media:', mediaUrls.map(m => m.url));
        res.json({ media: mediaUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

export { router as uploadRouter };
