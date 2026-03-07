import express from 'express';
import PublicContent from '../models/PublicContent';
import NewsItem from '../models/NewsItem';
import Post from '../models/Post';
import User from '../models/User';

const router = express.Router();

// Lightweight admin check (session + role)
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

// GET /api/public/branding
router.get('/branding', async (req, res) => {
    try {
        const doc = await PublicContent.findOne({ key: 'branding' });
        return res.json({ branding: doc ? doc.data : {} });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/home
router.get('/home', async (req, res) => {
    try {
        const doc = await PublicContent.findOne({ key: 'home' });
        return res.json({ home: doc ? doc.data : {} });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/about
router.get('/about', async (req, res) => {
    try {
        const doc = await PublicContent.findOne({ key: 'about' });
        return res.json({ about: doc ? doc.data : {} });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/public/content/:key - upsert content (Admin only)
router.put('/content/:key', requireAdmin, async (req, res) => {
    try {
        const key = req.params.key as any;
        const data = req.body.data || {};

        const updated = await PublicContent.findOneAndUpdate(
            { key },
            { data },
            { upsert: true, new: true }
        );

        return res.json({ message: 'Content updated', content: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/news - list news items
router.get('/news', async (req, res) => {
    try {
        // If requester is admin, return all items (including drafts). Otherwise exclude drafts.
        let query: any = {};
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId).lean();
            if (!user || user.role !== 'admin') {
                query.draft = { $ne: true };
            }
        } else {
            query.draft = { $ne: true };
        }

        const items = await NewsItem.find(query).sort({ priority: -1, publishedAt: -1, createdAt: -1 }).lean();
        return res.json({ news: items });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/news/:id - get single news item
router.get('/news/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // If the item is a draft, only admins should see it.
        const item = await NewsItem.findById(id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        let isAdmin = false;
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId).lean();
            if (user && user.role === 'admin') isAdmin = true;
        }

        if (item.draft && !isAdmin) return res.status(404).json({ message: 'Not found' });

        // Auto-increment readers for non-admin viewers
        if (!isAdmin) {
            const updated = await NewsItem.findByIdAndUpdate(id, { $inc: { readers: 1 } }, { new: true }).lean();
            return res.json({ item: updated });
        }

        return res.json({ item: item.toObject() });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/public/news - create news item (admin only)
router.post('/news', requireAdmin, async (req, res) => {
    try {
        const { title, link, readers, time, image, publishedAt, priority, body, draft } = req.body;
        if (!title || typeof title !== 'string') return res.status(400).json({ message: 'Title is required' });
        const payload: any = { title };
        if (link) payload.link = link;
        if (typeof readers !== 'undefined') payload.readers = Number(readers) || 0;
        if (time) payload.time = time;
        if (image) payload.image = image;
        if (body) payload.body = body;
        if (typeof draft !== 'undefined') payload.draft = Boolean(draft);
        if (publishedAt) payload.publishedAt = new Date(publishedAt);
        if (typeof priority !== 'undefined') payload.priority = Number(priority) || 0;
        const created = await NewsItem.create(payload);
        // Broadcast news update via socket.io
        try { const io = (req as any).io; if (io) io.emit('news_updated', { item: created }); } catch (e) { }
        return res.json({ message: 'News created', item: created });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/public/news/:id - update news item (admin only)
router.put('/news/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, link, readers, time, image, publishedAt, priority, body, draft } = req.body;
        const update: any = {};
        if (title) update.title = title;
        if (link) update.link = link;
        if (typeof readers !== 'undefined') update.readers = Number(readers) || 0;
        if (time) update.time = time;
        if (image) update.image = image;
        if (body) update.body = body;
        if (typeof draft !== 'undefined') update.draft = Boolean(draft);
        if (publishedAt) update.publishedAt = new Date(publishedAt);
        if (typeof priority !== 'undefined') update.priority = Number(priority) || 0;

        const updated = await NewsItem.findByIdAndUpdate(id, update, { new: true });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        // Broadcast news update via socket.io
        try { const io = (req as any).io; if (io) io.emit('news_updated', { item: updated }); } catch (e) { }
        return res.json({ message: 'Updated', item: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/public/news/:id - remove news (admin only)
router.delete('/news/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const removed = await NewsItem.findByIdAndDelete(id);
        if (!removed) return res.status(404).json({ message: 'Not found' });
        // Broadcast news deletion via socket.io
        try { const io = (req as any).io; if (io) io.emit('news_deleted', { newsId: id }); } catch (e) { }
        return res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/feed - Public feed (public posts only, no auth required)
router.get('/feed', async (req, res) => {
    try {
        const posts = await Post.find({ visibility: 'public', $or: [{ status: 'approved' }, { status: { $exists: false } }] })
            .populate('author', 'name headline avatar graduationYear degree')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(30);
        return res.json({ posts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export { router as publicRouter };

