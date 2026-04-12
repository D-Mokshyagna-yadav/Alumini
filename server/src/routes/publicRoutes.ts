import express from 'express';
import PublicContent from '../models/PublicContent';
import NewsItem from '../models/NewsItem';
import Announcement from '../models/Announcement';
import Post from '../models/Post';
import User from '../models/User';
import { cacheMiddleware, invalidatePrefix, TTL } from '../config/cache';
import { requireAdmin } from '../middleware/auth';
import { sendAnnouncementEmail } from '../config/email';

const router = express.Router();

type AnnouncementAudienceMode = 'all' | 'specific';

async function getAnnouncementRecipients(mode: AnnouncementAudienceMode, recipientIds: string[] = []) {
    try {
        const query: any = { status: 'active' };
        if (mode === 'specific') {
            query._id = { $in: recipientIds };
        }

        return User.find(query).select('name email').lean();
    } catch (error) {
        console.error('Failed to load announcement recipients', error);
        return [];
    }
}

async function dispatchAnnouncementEmails(announcement: any) {
    try {
        if (!announcement || announcement.draft) return;

        const mode: AnnouncementAudienceMode = announcement.audienceMode === 'specific' ? 'specific' : 'all';
        const recipients = await getAnnouncementRecipients(mode, announcement.recipientIds || []);
        if (recipients.length === 0) return;

        const jobs = recipients.map((recipient) =>
            sendAnnouncementEmail(String(recipient.email), String(recipient.name || 'member'), {
                title: announcement.title,
                subtitle: announcement.subtitle,
                template: announcement.template,
                message: announcement.message,
                image: announcement.image,
                link: announcement.link,
                ctaLabel: announcement.ctaLabel,
                ctaLink: announcement.ctaLink,
                publishedAt: announcement.publishedAt || announcement.createdAt,
            }).catch((error: any) => {
                console.error('Announcement email failed for recipient', recipient.email, error);
            })
        );

        await Promise.allSettled(jobs);
    } catch (error) {
        console.error('Announcement email dispatch failed', error);
    }
}

// GET /api/public/branding
router.get('/branding', cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const doc = await PublicContent.findOne({ key: 'branding' });
        return res.json({ branding: doc ? doc.data : {} });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/home
router.get('/home', cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const doc = await PublicContent.findOne({ key: 'home' });
        return res.json({ home: doc ? doc.data : {} });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/about
router.get('/about', cacheMiddleware(TTL.STATIC), async (req, res) => {
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

        invalidatePrefix('/api/public');
        return res.json({ message: 'Content updated', content: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/news - list news items
router.get('/news', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
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
router.get('/news/:id', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
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
        invalidatePrefix('/api/public/news');
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
        invalidatePrefix('/api/public/news');
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
        invalidatePrefix('/api/public/news');
        // Broadcast news deletion via socket.io
        try { const io = (req as any).io; if (io) io.emit('news_deleted', { newsId: id }); } catch (e) { }
        return res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/announcements - list announcements
router.get('/announcements', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        let query: any = {};
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId).lean();
            if (!user || user.role !== 'admin') {
                query.draft = { $ne: true };
            }
        } else {
            query.draft = { $ne: true };
        }

        const items = await Announcement.find(query).sort({ priority: -1, publishedAt: -1, createdAt: -1 }).lean();
        return res.json({ announcements: items });
    } catch (error) {
        console.error('Announcements list degraded:', error);
        return res.json({ announcements: [], degraded: true });
    }
});

// GET /api/public/announcements/:id - get single announcement
router.get('/announcements/:id', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const id = req.params.id;
        const item = await Announcement.findById(id);
        if (!item) return res.status(404).json({ message: 'Not found' });

        let isAdmin = false;
        if (req.session && req.session.userId) {
            const user = await User.findById(req.session.userId).lean();
            if (user && user.role === 'admin') isAdmin = true;
        }

        if (item.draft && !isAdmin) return res.status(404).json({ message: 'Not found' });

        if (!isAdmin) {
            const updated = await Announcement.findByIdAndUpdate(id, { $inc: { readers: 1 } }, { new: true }).lean();
            return res.json({ item: updated });
        }

        return res.json({ item: item.toObject() });
    } catch (error) {
        console.error('Announcement details failed:', error);
        return res.status(503).json({ message: 'Announcement service temporarily unavailable' });
    }
});

// POST /api/public/announcements - create announcement (admin only)
router.post('/announcements', requireAdmin, async (req, res) => {
    try {
        const { title, subtitle, template, message, image, link, ctaLabel, ctaLink, readers, publishedAt, priority, draft, audienceMode, recipientIds } = req.body;
        if (!title || typeof title !== 'string') return res.status(400).json({ message: 'Title is required' });

        const payload: any = { title };
        if (subtitle) payload.subtitle = subtitle;
        if (template) payload.template = template;
        if (message) payload.message = message;
        if (image) payload.image = image;
        if (link) payload.link = link;
        if (ctaLabel) payload.ctaLabel = ctaLabel;
        if (ctaLink) payload.ctaLink = ctaLink;
        payload.audienceMode = audienceMode === 'specific' ? 'specific' : 'all';
        payload.recipientIds = Array.isArray(recipientIds) ? recipientIds.filter(Boolean) : [];
        if (typeof readers !== 'undefined') payload.readers = Number(readers) || 0;
        if (publishedAt) payload.publishedAt = new Date(publishedAt);
        if (typeof priority !== 'undefined') payload.priority = Number(priority) || 0;
        if (typeof draft !== 'undefined') payload.draft = Boolean(draft);

        if (payload.audienceMode === 'specific' && payload.recipientIds.length === 0 && !payload.draft) {
            return res.status(400).json({ message: 'Select at least one recipient or switch to all users' });
        }

        const created = await Announcement.create(payload);
        invalidatePrefix('/api/public/announcements');
        try { const io = (req as any).io; if (io) io.emit('announcements_updated', { item: created }); } catch (e) { }

        // Fire-and-forget email delivery so the announcement workflow remains resilient.
        setImmediate(() => {
            void dispatchAnnouncementEmails(created).catch((error) => {
                console.error('Announcement email dispatch failed', error);
            });
        });

        return res.json({ message: 'Announcement created', item: created });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/public/announcements/:id - update announcement (admin only)
router.put('/announcements/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, subtitle, template, message, image, link, ctaLabel, ctaLink, readers, publishedAt, priority, draft, audienceMode, recipientIds } = req.body;
        const update: any = {};
        if (title) update.title = title;
        if (subtitle !== undefined) update.subtitle = subtitle;
        if (template) update.template = template;
        if (message !== undefined) update.message = message;
        if (image !== undefined) update.image = image;
        if (link !== undefined) update.link = link;
        if (ctaLabel !== undefined) update.ctaLabel = ctaLabel;
        if (ctaLink !== undefined) update.ctaLink = ctaLink;
        if (audienceMode) update.audienceMode = audienceMode === 'specific' ? 'specific' : 'all';
        if (Array.isArray(recipientIds)) update.recipientIds = recipientIds.filter(Boolean);
        if (typeof readers !== 'undefined') update.readers = Number(readers) || 0;
        if (publishedAt) update.publishedAt = new Date(publishedAt);
        if (typeof priority !== 'undefined') update.priority = Number(priority) || 0;
        if (typeof draft !== 'undefined') update.draft = Boolean(draft);

        const nextAudienceMode = update.audienceMode || 'all';
        const nextRecipientIds = Array.isArray(update.recipientIds) ? update.recipientIds : [];
        if (nextAudienceMode === 'specific' && nextRecipientIds.length === 0 && !update.draft) {
            return res.status(400).json({ message: 'Select at least one recipient or switch to all users' });
        }

        const updated = await Announcement.findByIdAndUpdate(id, update, { new: true });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        invalidatePrefix('/api/public/announcements');
        try { const io = (req as any).io; if (io) io.emit('announcements_updated', { item: updated }); } catch (e) { }

        setImmediate(() => {
            void dispatchAnnouncementEmails(updated).catch((error) => {
                console.error('Announcement email dispatch failed', error);
            });
        });

        return res.json({ message: 'Updated', item: updated });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/public/announcements/:id - remove announcement (admin only)
router.delete('/announcements/:id', requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const removed = await Announcement.findByIdAndDelete(id);
        if (!removed) return res.status(404).json({ message: 'Not found' });
        invalidatePrefix('/api/public/announcements');
        try { const io = (req as any).io; if (io) io.emit('announcements_deleted', { announcementId: id }); } catch (e) { }
        return res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/feed - Public feed (public posts only, no auth required)
router.get('/feed', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
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

// GET /api/public/notable-alumni
import NotableAlumni from '../models/NotableAlumni';
router.get('/notable-alumni', cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const alumni = await NotableAlumni.find().sort({ order: 1, createdAt: -1 });
        return res.json({ alumni });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/public/administration
import Administration from '../models/Administration';
router.get('/administration', cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const members = await Administration.find().sort({ category: 1, order: 1, createdAt: 1 });
        const governing = members.filter(m => m.category === 'governing');
        const officials = members.filter(m => m.category === 'officials');
        return res.json({ governing, officials });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/public/contact - submit contact form message
import { sendContactEmail } from '../config/email';
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email address' });
        }

        // Send email to admin
        await sendContactEmail({ name, email, subject, message });

        return res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact form error:', error);
        return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }
});

export { router as publicRouter };

