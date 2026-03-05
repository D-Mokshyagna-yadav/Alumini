import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import GalleryAlbum from '../models/GalleryAlbum';
import User from '../models/User';
import { storeFileInGridFS, deleteGridFSFile, cleanupTempFile, getGridFSBucket } from '../config/gridfs';

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────

const sanitizeFolderName = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 50);

// Temp storage for multer (files are moved to GridFS after upload)
const TEMP_DIR = path.join(os.tmpdir(), 'alumni-gallery');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const tempStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_DIR),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    },
});

const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    cb(null, allowedImageTypes.test(ext) || allowedVideoTypes.test(ext));
};

const upload = multer({ storage: tempStorage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter });

// ── Auth middleware ────────────────────────────────────────

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Unauthorized' });
    (req as any).user = { id: req.session.userId };
    next();
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    (req as any).user = { id: req.session.userId };
    next();
};

// ── Routes ─────────────────────────────────────────────────

// GET / – list all albums
router.get('/', async (_req, res) => {
    try {
        const albums = await GalleryAlbum.find().sort({ createdAt: -1 }).populate('createdBy', 'name avatar');
        const formatted = albums.map(album => ({
            id: album._id,
            title: album.title,
            description: album.description,
            coverImage: album.coverImage,
            folderName: (album as any).folderName,
            images: album.images.map(img => ({
                id: img._id,
                url: img.url,
                caption: img.caption,
                type: (img as any).type || 'image',
                likes: img.likes?.length || 0,
                createdAt: img.createdAt,
            })),
            createdBy: album.createdBy,
            createdAt: album.createdAt,
        }));
        res.json({ albums: formatted });
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ message: 'Failed to fetch gallery' });
    }
});

// POST /album – create a new album
router.post('/album', requireAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });

        const folderName = sanitizeFolderName(title) + '_' + Date.now();

        const album = new GalleryAlbum({
            title,
            description,
            folderName,
            createdBy: (req as any).user.id,
            images: [],
        });
        await album.save();

        res.status(201).json({
            album: {
                id: album._id,
                title: album.title,
                description: album.description,
                coverImage: album.coverImage,
                folderName,
                images: [],
                createdAt: album.createdAt,
            },
        });
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).json({ message: 'Failed to create album' });
    }
});

// POST /album/:albumId/images – upload images/videos to an album
router.post('/album/:albumId/images', requireAdmin, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const folderName = (album as any).folderName || sanitizeFolderName(album.title);

        // Use the shared temp-storage multer
        const albumUpload = multer({ storage: tempStorage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter }).array('images', 20);

        albumUpload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ message: err.message || 'Upload failed' });
            }

            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) return res.status(400).json({ message: 'No files provided' });

            const newMedia: any[] = [];

            for (const file of files) {
                const ext = path.extname(file.originalname).toLowerCase();
                const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext);
                const contentType = file.mimetype;
                const gridName = `gallery/${folderName}/${file.filename}`;

                // Store in GridFS
                await storeFileInGridFS(file.path, gridName, contentType);
                cleanupTempFile(file.path);

                newMedia.push({
                    url: `/uploads/gallery/${folderName}/${file.filename}`,
                    type: isVideo ? 'video' : 'image',
                    uploadedBy: (req as any).user.id,
                    likes: [],
                    createdAt: new Date(),
                });
            }

            album.images.push(...newMedia);

            if (!album.coverImage && newMedia.length > 0) {
                const firstImage = newMedia.find(m => m.type === 'image');
                if (firstImage) album.coverImage = firstImage.url;
            }
            if (!(album as any).folderName) (album as any).folderName = folderName;

            await album.save();

            const formattedMedia = newMedia.map((media, index) => ({
                id: album.images[album.images.length - newMedia.length + index]._id,
                url: media.url,
                type: media.type,
                caption: '',
                likes: 0,
                createdAt: media.createdAt,
            }));

            res.json({ images: formattedMedia });

            // Broadcast gallery update
            try { const io = (req as any).io; if (io) io.emit('gallery_updated', { albumId: album._id }); } catch (e) { /* ignore */ }
        });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ message: 'Failed to upload media' });
    }
});

// PUT /album/:albumId – update album metadata
router.put('/album/:albumId', requireAdmin, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const { title, description, coverImage } = req.body;
        if (title) album.title = title;
        if (description !== undefined) album.description = description;
        if (coverImage !== undefined) album.coverImage = coverImage;
        await album.save();

        res.json({ album: { id: album._id, title: album.title, description: album.description, coverImage: album.coverImage } });
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ message: 'Failed to update album' });
    }
});

// DELETE /album/:albumId – delete album and all its files from GridFS
router.delete('/album/:albumId', requireAdmin, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        // Delete every image/video from GridFS
        for (const image of album.images) {
            const gridName = image.url.replace(/^\/uploads\//, '');
            deleteGridFSFile(gridName).catch(e => console.error('GridFS delete error:', e));
        }

        await GalleryAlbum.findByIdAndDelete(req.params.albumId);

        // Broadcast gallery update
        try { const io = (req as any).io; if (io) io.emit('gallery_updated', { albumId: req.params.albumId, deleted: true }); } catch (e) { /* ignore */ }

        res.json({ message: 'Album deleted' });
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ message: 'Failed to delete album' });
    }
});

// DELETE /album/:albumId/images/:imageId – delete single media item
router.delete('/album/:albumId/images/:imageId', requireAdmin, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const idx = album.images.findIndex(img => img._id?.toString() === req.params.imageId);
        if (idx === -1) return res.status(404).json({ message: 'Media not found' });

        const image = album.images[idx];
        const gridName = image.url.replace(/^\/uploads\//, '');
        deleteGridFSFile(gridName).catch(e => console.error('GridFS delete error:', e));

        album.images.splice(idx, 1);

        if (album.coverImage === image.url) {
            const firstImage = album.images.find(img => (img as any).type !== 'video');
            album.coverImage = firstImage?.url || album.images[0]?.url || undefined;
        }
        await album.save();

        res.json({ message: 'Media deleted' });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ message: 'Failed to delete media' });
    }
});

// POST /album/:albumId/images/:imageId/like – toggle like
router.post('/album/:albumId/images/:imageId/like', requireAuth, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const image = album.images.find(img => img._id?.toString() === req.params.imageId);
        if (!image) return res.status(404).json({ message: 'Media not found' });

        const uid = (req as any).user.id.toString();
        const likeIdx = image.likes.findIndex(id => id.toString() === uid);
        if (likeIdx > -1) image.likes.splice(likeIdx, 1);
        else image.likes.push((req as any).user.id);

        await album.save();
        res.json({ likes: image.likes.length, isLiked: likeIdx === -1 });

        // Broadcast gallery like update
        try { const io = (req as any).io; if (io) io.emit('gallery_updated', { albumId: album._id, imageId: image._id }); } catch (e) { /* ignore */ }
    } catch (error) {
        console.error('Error liking media:', error);
        res.status(500).json({ message: 'Failed to like media' });
    }
});

// PUT /album/:albumId/images/:imageId/caption – update caption
router.put('/album/:albumId/images/:imageId/caption', requireAdmin, async (req, res) => {
    try {
        const album = await GalleryAlbum.findById(req.params.albumId);
        if (!album) return res.status(404).json({ message: 'Album not found' });

        const image = album.images.find(img => img._id?.toString() === req.params.imageId);
        if (!image) return res.status(404).json({ message: 'Media not found' });

        image.caption = req.body.caption;
        await album.save();
        res.json({ message: 'Caption updated' });
    } catch (error) {
        console.error('Error updating caption:', error);
        res.status(500).json({ message: 'Failed to update caption' });
    }
});

export default router;
