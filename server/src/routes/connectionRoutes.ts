import express from 'express';
import Connection, { ConnectionStatus } from '../models/Connection';
import User, { UserStatus } from '../models/User';
import Post from '../models/Post';
import Notification from '../models/Notification';

const router = express.Router();

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') return res.status(403).json({ message: 'Account not approved.' });
    next();
};

// GET /api/connections/stats/:userId - Get stats for a user (connections count, posts count)
router.get('/stats/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const connectionsCount = await Connection.countDocuments({
            $or: [{ requester: userId }, { recipient: userId }],
            status: ConnectionStatus.ACCEPTED
        });
        
        const postsCount = await Post.countDocuments({ author: userId });
        
        res.json({ connections: connectionsCount, posts: postsCount });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/connections/my-connections - Get all accepted connections
router.get('/my-connections', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const connections = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: ConnectionStatus.ACCEPTED
        }).populate('requester recipient', 'name avatar headline isMentor');

        // Map to just the OTHER user
        const friends = connections.map(conn => {
            const isRequester = conn.requester._id.toString() === userId;
            return isRequester ? conn.recipient : conn.requester;
        });

        res.json(friends);
    } catch (error) {
        console.error('Error fetching connections:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/connections/status/:userId - Get status with a specific user
router.get('/status/:otherId', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { otherId } = req.params;

        const connection = await Connection.findOne({
            $or: [
                { requester: userId, recipient: otherId },
                { requester: otherId, recipient: userId }
            ]
        });

        if (!connection) {
            return res.json({ status: 'none' });
        }

        // Return status based on who sent it
        // If I sent it and it's pending -> 'pending_sent'
        // If they sent it and it's pending -> 'pending_received'
        // If accepted -> 'accepted'

        if (connection.status === ConnectionStatus.ACCEPTED) {
            return res.json({ status: 'accepted' });
        }

        if (connection.status === ConnectionStatus.PENDING) {
            if (connection.requester.toString() === userId) {
                return res.json({ status: 'pending_sent' });
            } else {
                return res.json({ status: 'pending_received', requestId: connection._id });
            }
        }

        res.json({ status: 'none' });
    } catch (error) {
        console.error('Error fetching connection status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/connections/request/:userId - Send request
router.post('/request/:recipientId', requireAuth, async (req, res) => {
    try {
        const requesterId = req.session?.userId as string | undefined;
        const { recipientId } = req.params;

        if (requesterId === recipientId) {
            return res.status(400).json({ message: 'Cannot connect with yourself' });
        }

        const existing = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });

        if (existing) {
            return res.status(400).json({ message: 'Connection already exists or pending' });
        }

        const newConnection = await Connection.create({
            requester: requesterId,
            recipient: recipientId,
            status: ConnectionStatus.PENDING
        });

        // Create notification for the recipient
        try {
            const requester = await User.findById(requesterId);
            await Notification.create({
                recipient: recipientId,
                actor: requesterId,
                type: 'connection_request',
                message: `${requester?.name || 'Someone'} sent you a connection request`,
                data: { connectionId: newConnection._id }
            });
            const io = (req as any).io;
            if (io) {
                io.to(recipientId).emit('notification', {
                    message: `${requester?.name || 'Someone'} sent you a connection request`,
                    type: 'connection_request'
                });
            }
        } catch (e) { console.error('Notification error', e); }

        res.json({ message: 'Request sent', status: 'pending_sent' });
    } catch (error) {
        console.error('Error sending request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/connections/accept/:requestId
router.put('/accept/:requestId', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { requestId } = req.params;

        const connection = await Connection.findById(requestId);
        if (!connection) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (connection.recipient.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        connection.status = ConnectionStatus.ACCEPTED;
        await connection.save();

        // Notify the requester that their connection was accepted
        try {
            const io = (req as any).io;
            const requesterId = connection.requester.toString();
            const recipientId = connection.recipient.toString();
            const acceptor = await User.findById(userId);
            await Notification.create({
                recipient: requesterId,
                actor: recipientId,
                type: 'connection_accepted',
                message: `${acceptor?.name || 'Someone'} accepted your connection request`,
                data: { connectionId: connection._id }
            });
            if (io) {
                io.to(requesterId).emit('notification', {
                    message: `${acceptor?.name || 'Someone'} accepted your connection request`,
                    type: 'connection_accepted'
                });
                io.to(requesterId).emit('connection:accepted', { otherId: recipientId });
                io.to(recipientId).emit('connection:accepted', { otherId: requesterId });
            }
        } catch (e) { console.warn('Socket/notification emit failed', e); }

        res.json({ message: 'Connection accepted', status: 'accepted' });
    } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/connections/remove/:otherId - remove an existing connection (accepted or pending)
router.delete('/remove/:otherId', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const { otherId } = req.params;

        const connection = await Connection.findOne({
            $or: [
                { requester: userId, recipient: otherId },
                { requester: otherId, recipient: userId }
            ]
        });

        if (!connection) {
            return res.status(404).json({ message: 'Connection not found' });
        }

        const requesterId = connection.requester.toString();
        const recipientId = connection.recipient.toString();
        // Use model delete to avoid issues with document remove() availability
        await Connection.deleteOne({ _id: connection._id });

        // Emit socket event to both users to refresh state
        try {
            const io = (req as any).io;
            if (io) {
                io.to(requesterId).emit('connection:removed', { otherId: recipientId });
                io.to(recipientId).emit('connection:removed', { otherId: requesterId });
            }
        } catch (e) { console.warn('Socket emit failed', e); }

        res.json({ message: 'Connection removed' });
    } catch (error) {
        console.error('Error removing connection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as connectionRouter };
