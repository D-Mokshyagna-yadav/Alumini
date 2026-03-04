import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import User, { UserStatus } from '../models/User';

const router = express.Router();

// Helper to sanitize username for folder name
const sanitizeUsername = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

// Middleware to check authenticated user
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') {
        return res.status(403).json({ message: 'Account not approved. Uploads are blocked until verification.' });
    }
    next();
};

// Dynamic storage configuration
const createStorage = (subFolder: string) => {
    return multer.diskStorage({
        destination: async (req, file, cb) => {
            try {
                const user = await User.findById(req.session!.userId);
                if (!user) {
                    return cb(new Error('User not found'), '');
                }

                const username = sanitizeUsername(user.name);
                            // Enforce requested structure: profile, posts, chats, events, news
                            const allowed = ['profile', 'posts', 'chats', 'events', 'news', 'jobs'];
                const folder = allowed.includes(subFolder) ? subFolder : 'posts';
                const uploadPath = path.join(__dirname, '../../uploads', username, folder);

                // Create directories if they don't exist
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }

                cb(null, uploadPath);
            } catch (error) {
                cb(error as Error, '');
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, uniqueSuffix + ext);
        }
    });
};

// File filter for images, videos and common document types
const mediaFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        // images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // videos
        'video/mp4', 'video/webm', 'video/quicktime',
        // audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/3gpp',
        // documents
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'application/zip'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, and common document types are allowed.'));
    }
};

// Image-only filter
const imageFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

// Upload configurations
const postUpload = multer({
    storage: createStorage('posts'),
    fileFilter: mediaFilter,
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit for videos
});

const profileUpload = multer({
    storage: createStorage('profile'),
    fileFilter: imageFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // allow up to 50MB, we'll compress if needed
});

const eventUpload = multer({
    storage: createStorage('events'),
    fileFilter: imageFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

const newsUpload = multer({
    storage: createStorage('news'),
    fileFilter: imageFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// job image upload - allow admins and alumni to attach an image to a job posting
const jobUpload = multer({
    storage: createStorage('jobs'),
    fileFilter: imageFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// POST /api/upload/job-image - upload an image for a job (alumni or admin)
router.post('/job-image', requireAuth, jobUpload.single('image'), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const username = sanitizeUsername(user.name);
        const origin = req.protocol + '://' + req.get('host');
        let fileUrl = `${origin}/uploads/${username}/jobs/${file.filename}`;
        const fileRel = `/uploads/${username}/jobs/${file.filename}`;

        // Compress if image large
        if (file.size > 10 * 1024 * 1024) {
            try {
                const absPath = file.path;
                const compressedPath = absPath + '.webp';
                await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                fs.unlinkSync(absPath);
                const newName = path.basename(compressedPath);
                fileUrl = `${origin}/uploads/${username}/jobs/${newName}`;
            } catch (err) {
                console.error('Job image compression failed', err);
            }
        }

        res.json({ url: fileUrl, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/post-media - Upload media for a post
router.post('/post-media', requireAuth, postUpload.array('media', 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const user = await User.findById(req.session!.userId);
        const username = sanitizeUsername(user!.name);

        // Use relative paths for storage - client will prepend the API origin
        const mediaUrls: Array<{ type: string; url: string }> = [];

        // Process files: compress images >10MB (lossless webp) and trim/encode videos >90s
        for (const file of files) {
            const absPath = file.path;
            const relativePath = (filename: string) => `/uploads/${username}/posts/${filename}`;
            
            if (file.mimetype.startsWith('image/')) {
                if (file.size > 10 * 1024 * 1024) {
                    try {
                        const compressedPath = absPath + '.webp';
                        await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                        fs.unlinkSync(absPath);
                        const newName = path.basename(compressedPath);
                        mediaUrls.push({ type: 'image', url: relativePath(newName) });
                    } catch (err) {
                        console.error('Image compression failed:', err);
                        mediaUrls.push({ type: 'image', url: relativePath(file.filename) });
                    }
                } else {
                    mediaUrls.push({ type: 'image', url: relativePath(file.filename) });
                }
            } else if (file.mimetype.startsWith('video/')) {
                // Check duration and trim if necessary
                try {
                    const info = await new Promise<any>((resolve, reject) => {
                        ffmpeg.ffprobe(absPath, (err: any, metadata: any) => {
                            if (err) return reject(err);
                            resolve(metadata);
                        });
                    });

                    const duration = info.format.duration || 0;
                    if (duration > 90) {
                        // Trim to 90s and re-encode with reasonable settings
                        const trimmedPath = absPath + '.mp4';
                        await new Promise<void>((resolve, reject) => {
                            ffmpeg(absPath)
                                .setStartTime(0)
                                .setDuration(90)
                                .outputOptions(['-c:v libx264', '-preset veryfast', '-crf 23'])
                                .save(trimmedPath)
                                .on('end', () => resolve())
                                .on('error', (e: any) => reject(e));
                        });
                        fs.unlinkSync(absPath);
                        const newName = path.basename(trimmedPath);
                        mediaUrls.push({ type: 'video', url: relativePath(newName) });
                    } else {
                        mediaUrls.push({ type: 'video', url: relativePath(file.filename) });
                    }
                } catch (err) {
                    console.error('Video processing failed:', err);
                    mediaUrls.push({ type: 'video', url: relativePath(file.filename) });
                }
            } else if (file.mimetype.startsWith('audio/')) {
                mediaUrls.push({ type: 'audio', url: relativePath(file.filename) });
            } else {
                mediaUrls.push({ type: 'file', url: relativePath(file.filename) });
            }
        }

        console.log('Uploaded media:', mediaUrls.map(m => m.url));

        res.json({ media: mediaUrls });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/profile-pic - Upload profile picture
router.post('/profile-pic', requireAuth, profileUpload.single('avatar'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const user = await User.findById(req.session!.userId);
        const username = sanitizeUsername(user!.name);
        const origin = req.protocol + '://' + req.get('host');
        let avatarUrl = `${origin}/uploads/${username}/profile/${file.filename}`;
        // store relative path in DB for stability
        let avatarRel = `/uploads/${username}/profile/${file.filename}`;

        // Delete old avatar file if exists
        if (user!.avatar) {
            try {
                const oldPath = path.join(__dirname, '../../', user!.avatar);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('Deleted old avatar:', oldPath);
                }
            } catch (err) {
                console.error('Failed to delete old avatar:', err);
            }
        }

        // If image exceeds 10MB, compress losslessly to webp
        if (file.size > 10 * 1024 * 1024) {
            try {
                const absPath = file.path;
                const compressedPath = absPath + '.webp';
                await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                fs.unlinkSync(absPath);
                const newName = path.basename(compressedPath);
                avatarUrl = `${origin}/uploads/${username}/profile/${newName}`;
                avatarRel = `/uploads/${username}/profile/${newName}`;
            } catch (err) {
                console.error('Profile image compression failed:', err);
            }
        }

        // Update user's avatar in database (store relative path)
        user!.avatar = avatarRel;
        await user!.save();

        console.log('Updated avatar for', user!._id, avatarRel);

        // Respond with full URL for immediate client use
        res.json({ avatar: avatarUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

export { router as uploadRouter };

// POST /api/upload/event-banner - upload a single event banner image
router.post('/event-banner', requireAuth, eventUpload.single('banner'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const user = await User.findById(req.session!.userId);
        const username = sanitizeUsername(user!.name);
        const origin = req.protocol + '://' + req.get('host');
        let fileUrl = `${origin}/uploads/${username}/events/${file.filename}`;
        const fileRel = `/uploads/${username}/events/${file.filename}`;

        // Compress if image large
        if (file.size > 10 * 1024 * 1024) {
            try {
                const absPath = file.path;
                const compressedPath = absPath + '.webp';
                await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                fs.unlinkSync(absPath);
                const newName = path.basename(compressedPath);
                fileUrl = `${origin}/uploads/${username}/events/${newName}`;
            } catch (err) {
                console.error('Event banner compression failed', err);
            }
        }

        res.json({ url: fileUrl, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// POST /api/upload/news-image - upload an inline news image (admin only)
router.post('/news-image', requireAuth, newsUpload.single('image'), async (req, res) => {
    try {
        // Only admins may upload inline news images
        const user = await User.findById(req.session!.userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });
        const username = sanitizeUsername(user.name);
        const origin = req.protocol + '://' + req.get('host');
        let fileUrl = `${origin}/uploads/${username}/news/${file.filename}`;
        const fileRel = `/uploads/${username}/news/${file.filename}`;

        // Compress if image large
        if (file.size > 10 * 1024 * 1024) {
            try {
                const absPath = file.path;
                const compressedPath = absPath + '.webp';
                await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                fs.unlinkSync(absPath);
                const newName = path.basename(compressedPath);
                fileUrl = `${origin}/uploads/${username}/news/${newName}`;
            } catch (err) {
                console.error('News image compression failed', err);
            }
        }

        res.json({ url: fileUrl, relative: fileRel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

    // POST /api/upload/cover-photo - upload a cover/background image for user profile
    router.post('/cover-photo', requireAuth, profileUpload.single('cover'), async (req, res) => {
        try {
            const file = req.file;
            if (!file) return res.status(400).json({ message: 'No file uploaded' });
            const user = await User.findById(req.session!.userId);
            const username = sanitizeUsername(user!.name);
            const origin = req.protocol + '://' + req.get('host');
            let fileUrl = `${origin}/uploads/${username}/profile/${file.filename}`;
            let fileRel = `/uploads/${username}/profile/${file.filename}`;

            // Delete old cover image if exists
            if ((user as any).coverImage) {
                try {
                    const oldPath = path.join(__dirname, '../../', (user as any).coverImage);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                        console.log('Deleted old cover image:', oldPath);
                    }
                } catch (err) {
                    console.error('Failed to delete old cover image:', err);
                }
            }

            // Compress if image large
            if (file.size > 10 * 1024 * 1024) {
                try {
                    const absPath = file.path;
                    const compressedPath = absPath + '.webp';
                    await sharp(absPath).webp({ lossless: true }).toFile(compressedPath);
                    fs.unlinkSync(absPath);
                    const newName = path.basename(compressedPath);
                    fileUrl = `${origin}/uploads/${username}/profile/${newName}`;
                    fileRel = `/uploads/${username}/profile/${newName}`;
                } catch (err) {
                    console.error('Cover image compression failed', err);
                }
            }

            // Update user's cover image in database (store relative path)
            if (user) {
                (user as any).coverImage = fileRel;
                await user.save();
            }

            res.json({ cover: fileUrl });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Upload failed' });
        }
    });
