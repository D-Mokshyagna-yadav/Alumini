import express from 'express';
import User from '../models/User';
import { UserStatus } from '../models/User';
import Notification from '../models/Notification';

const router = express.Router();

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') return res.status(403).json({ message: 'Account not approved.' });
    next();
};

// GET /api/notifications - return user's notifications
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.session!.userId })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('actor', 'name avatar headline');
        res.json({ notifications });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/notifications/:id/read - mark single notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.session!.userId },
            { read: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ notification });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/notifications/read-all - mark all notifications as read
router.patch('/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.session!.userId, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/notifications/:id - delete a notification
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.session!.userId
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as notificationRouter };
