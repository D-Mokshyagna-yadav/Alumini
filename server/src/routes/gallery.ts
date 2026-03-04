import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import GalleryAlbum from '../models/GalleryAlbum';
import User from '../models/User';

const router = express.Router();

const sanitizeFolderName = (name: string) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 50);
};

const createAlbumStorage = (albumSlug: string) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, '../../uploads/gallery', albumSlug);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
};

const defaultStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/gallery');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedVideoTypes = /mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const isImage = allowedImageTypes.test(ext);
    const isVideo = allowedVideoTypes.test(ext);
    
    if (isImage || isVideo) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed'));
    }
};

const upload = multer({ 
    storage: defaultStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter
});

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    (req as any).user = { id: req.session.userId };
    next();
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    (req as any).user = { id: req.session.userId };
    next();
};

router.get('/', async (req, res) => {
    try {
        const albums = await GalleryAlbum.find()
            .sort({ createdAt: -1 })
            .populate('createdBy', 'name avatar');
        
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
                createdAt: img.createdAt
            })),
            createdBy: album.createdBy,
            createdAt: album.createdAt
        }));
        
        res.json({ albums: formatted });
    } catch (error) {
        console.error('Error fetching gallery:', error);
        res.status(500).json({ message: 'Failed to fetch gallery' });
    }
});

router.post('/album', requireAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }
        
        const folderName = sanitizeFolderName(title) + '_' + Date.now();
        
        const albumDir = path.join(__dirname, '../../uploads/gallery', folderName);
        if (!fs.existsSync(albumDir)) {
            fs.mkdirSync(albumDir, { recursive: true });
        }
        
        const album = new GalleryAlbum({
            title,
            description,
            folderName,
            createdBy: (req as any).user.id,
            images: []
        });
        
        await album.save();
        
        res.status(201).json({ 
            album: {
                id: album._id,
                title: album.title,
                description: album.description,
                coverImage: album.coverImage,
                folderName: (album as any).folderName,
                images: [],
                createdAt: album.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).json({ message: 'Failed to create album' });
    }
});

router.post('/album/:albumId/images', requireAdmin, async (req, res) => {
    try {
        const { albumId } = req.params;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        const folderName = (album as any).folderName || sanitizeFolderName(album.title);
        
        const albumStorage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadDir = path.join(__dirname, '../../uploads/gallery', folderName);
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, uniqueSuffix + path.extname(file.originalname));
            }
        });
        
        const albumUpload = multer({ 
            storage: albumStorage,
            limits: { fileSize: 100 * 1024 * 1024 },
            fileFilter
        }).array('images', 20);
        
        albumUpload(req, res, async (err) => {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ message: err.message || 'Upload failed' });
            }
            
            const files = req.files as Express.Multer.File[];
            
            if (!files || files.length === 0) {
                return res.status(400).json({ message: 'No files provided' });
            }
            
            const newMedia = files.map(file => {
                const ext = path.extname(file.originalname).toLowerCase();
                const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
                const isVideo = videoExts.includes(ext);
                
                return {
                    url: `/uploads/gallery/${folderName}/${file.filename}`,
                    type: isVideo ? 'video' : 'image',
                    uploadedBy: (req as any).user.id,
                    likes: [],
                    createdAt: new Date()
                };
            });
            
            album.images.push(...newMedia as any);
            
            if (!album.coverImage && newMedia.length > 0) {
                const firstImage = newMedia.find(m => m.type === 'image');
                if (firstImage) {
                    album.coverImage = firstImage.url;
                }
            }
            
            if (!(album as any).folderName) {
                (album as any).folderName = folderName;
            }
            
            await album.save();
            
            const formattedMedia = newMedia.map((media, index) => ({
                id: album.images[album.images.length - newMedia.length + index]._id,
                url: media.url,
                type: media.type,
                caption: '',
                likes: 0,
                createdAt: media.createdAt
            }));
            
            res.json({ images: formattedMedia });
        });
    } catch (error) {
        console.error('Error uploading media:', error);
        res.status(500).json({ message: 'Failed to upload media' });
    }
});

router.put('/album/:albumId', requireAdmin, async (req, res) => {
    try {
        const { albumId } = req.params;
        const { title, description, coverImage } = req.body;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        if (title) album.title = title;
        if (description !== undefined) album.description = description;
        if (coverImage !== undefined) album.coverImage = coverImage;
        
        await album.save();
        
        res.json({ 
            album: {
                id: album._id,
                title: album.title,
                description: album.description,
                coverImage: album.coverImage
            }
        });
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ message: 'Failed to update album' });
    }
});

router.delete('/album/:albumId', requireAdmin, async (req, res) => {
    try {
        const { albumId } = req.params;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        const folderName = (album as any).folderName;
        if (folderName) {
            const folderPath = path.join(__dirname, '../../uploads/gallery', folderName);
            if (fs.existsSync(folderPath)) {
                fs.rmSync(folderPath, { recursive: true, force: true });
            }
        } else {
            for (const image of album.images) {
                const filePath = path.join(__dirname, '../../', image.url);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        
        await GalleryAlbum.findByIdAndDelete(albumId);
        
        res.json({ message: 'Album deleted' });
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ message: 'Failed to delete album' });
    }
});

router.delete('/album/:albumId/images/:imageId', requireAdmin, async (req, res) => {
    try {
        const { albumId, imageId } = req.params;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        const imageIndex = album.images.findIndex(img => img._id?.toString() === imageId);
        if (imageIndex === -1) {
            return res.status(404).json({ message: 'Media not found' });
        }
        
        const image = album.images[imageIndex];
        const filePath = path.join(__dirname, '../../', image.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        album.images.splice(imageIndex, 1);
        
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

router.post('/album/:albumId/images/:imageId/like', requireAuth, async (req, res) => {
    try {
        const { albumId, imageId } = req.params;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        const image = album.images.find(img => img._id?.toString() === imageId);
        if (!image) {
            return res.status(404).json({ message: 'Media not found' });
        }
        
        const userIdStr = (req as any).user.id.toString();
        const likeIndex = image.likes.findIndex(id => id.toString() === userIdStr);
        
        if (likeIndex > -1) {
            image.likes.splice(likeIndex, 1);
        } else {
            image.likes.push((req as any).user.id);
        }
        
        await album.save();
        
        res.json({ likes: image.likes.length, isLiked: likeIndex === -1 });
    } catch (error) {
        console.error('Error liking media:', error);
        res.status(500).json({ message: 'Failed to like media' });
    }
});

router.put('/album/:albumId/images/:imageId/caption', requireAdmin, async (req, res) => {
    try {
        const { albumId, imageId } = req.params;
        const { caption } = req.body;
        
        const album = await GalleryAlbum.findById(albumId);
        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }
        
        const image = album.images.find(img => img._id?.toString() === imageId);
        if (!image) {
            return res.status(404).json({ message: 'Media not found' });
        }
        
        image.caption = caption;
        await album.save();
        
        res.json({ message: 'Caption updated' });
    } catch (error) {
        console.error('Error updating caption:', error);
        res.status(500).json({ message: 'Failed to update caption' });
    }
});

export default router;