import express from 'express';
import Telemetry from '../models/Telemetry';
import User from '../models/User';

const router = express.Router();

// POST /api/telemetry/share
router.post('/share', async (req, res) => {
    try {
        const { resourceType, resourceId, action, channel, url } = req.body;
        const userId = (req as any).session?.userId || null;

        const entry = new Telemetry({
            type: 'share',
            resourceType: resourceType || null,
            resourceId: resourceId || null,
            action: action || 'unknown',
            channel: channel || null,
            url: url || null,
            user: userId || null,
            ip: req.ip
        });

        await entry.save();
        res.json({ message: 'Telemetry recorded' });
    } catch (err) {
        console.error('Telemetry error', err);
        res.status(500).json({ message: 'Telemetry recording failed' });
    }
});

// GET /api/telemetry/list - admin only, paginated
router.get('/list', async (req, res) => {
    try {
        const userId = (req as any).session?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

        const page = parseInt((req.query.page as string) || '1', 10);
        const limit = Math.min(200, parseInt((req.query.limit as string) || '50', 10));
        const q = (req.query.q as string) || '';

        const filter: any = {};
        if (q) {
            filter.$or = [
                { action: new RegExp(q, 'i') },
                { channel: new RegExp(q, 'i') },
                { resourceType: new RegExp(q, 'i') },
                { resourceId: new RegExp(q, 'i') },
                { url: new RegExp(q, 'i') }
            ];
        }

        const total = await Telemetry.countDocuments(filter);
        const items = await Telemetry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();

        res.json({ total, page, limit, items });
    } catch (err) {
        console.error('Telemetry list error', err);
        res.status(500).json({ message: 'Failed to list telemetry' });
    }
});

export { router as telemetryRouter };
