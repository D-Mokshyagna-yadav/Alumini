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

// GET /api/connections/user/:userId - Get accepted connections for a specific user (with privacy check)
router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.session?.userId as string | undefined;
        const { userId } = req.params;
        const isOwnProfile = currentUserId === userId;

        // Check privacy settings
        const targetUser = await User.findById(userId).select('privacySettings');
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const visibility = targetUser.privacySettings?.connectionsVisibility || 'everyone';

        // Check if current user is admin
        const currentUser = await User.findById(currentUserId).select('role');
        const isAdmin = currentUser?.role === 'admin';

        if (!isOwnProfile && !isAdmin) {
            if (visibility === 'only_me') {
                return res.json({ connections: [], restricted: true });
            }
            if (visibility === 'connections') {
                // Check if current user is connected to target user
                const isConnected = await Connection.findOne({
                    $or: [
                        { requester: currentUserId, recipient: userId },
                        { requester: userId, recipient: currentUserId }
                    ],
                    status: ConnectionStatus.ACCEPTED
                });
                if (!isConnected) {
                    return res.json({ connections: [], restricted: true });
                }
            }
        }

        const connections = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: ConnectionStatus.ACCEPTED
        }).populate('requester recipient', 'name avatar headline');

        const friends = connections.map(conn => {
            const isRequester = conn.requester._id.toString() === userId;
            return isRequester ? conn.recipient : conn.requester;
        });

        // Calculate mutual connections for each friend (if viewing someone else's profile)
        let friendsWithMutuals = friends;
        if (currentUserId && currentUserId !== userId) {
            // Get current user's connections
            const myConnections = await Connection.find({
                $or: [{ requester: currentUserId }, { recipient: currentUserId }],
                status: ConnectionStatus.ACCEPTED
            });
            const myFriendIds = new Set(myConnections.map(c => {
                const isReq = c.requester.toString() === currentUserId;
                return isReq ? c.recipient.toString() : c.requester.toString();
            }));

            friendsWithMutuals = friends.map((f: any) => {
                const fObj = f.toObject ? f.toObject() : f;
                fObj.isMutual = myFriendIds.has(fObj._id.toString());
                return fObj;
            });
        }

        res.json({ connections: friendsWithMutuals, restricted: false });
    } catch (error) {
        console.error('Error fetching user connections:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/connections/mutual/:userId - Get mutual connections count with a specific user
router.get('/mutual/:userId', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.session?.userId as string | undefined;
        const { userId } = req.params;

        if (currentUserId === userId) {
            return res.json({ mutualCount: 0, mutuals: [] });
        }

        // Get both users' connections
        const [myConns, theirConns] = await Promise.all([
            Connection.find({
                $or: [{ requester: currentUserId }, { recipient: currentUserId }],
                status: ConnectionStatus.ACCEPTED
            }),
            Connection.find({
                $or: [{ requester: userId }, { recipient: userId }],
                status: ConnectionStatus.ACCEPTED
            })
        ]);

        const myFriendIds = new Set(myConns.map(c => {
            const isReq = c.requester.toString() === currentUserId;
            return isReq ? c.recipient.toString() : c.requester.toString();
        }));

        const theirFriendIds = theirConns.map(c => {
            const isReq = c.requester.toString() === userId;
            return isReq ? c.recipient.toString() : c.requester.toString();
        });

        const mutualIds = theirFriendIds.filter(id => myFriendIds.has(id));

        // Fetch mutual user details
        const mutuals = await User.find({ _id: { $in: mutualIds } }).select('name avatar headline').limit(5);

        res.json({ mutualCount: mutualIds.length, mutuals });
    } catch (error) {
        console.error('Error fetching mutual connections:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/connections/mutual-batch - Get mutual connections for multiple users at once
router.post('/mutual-batch', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.session?.userId as string | undefined;
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.json({ mutuals: {} });
        }

        // Limit to prevent abuse
        const limitedIds = userIds.slice(0, 50);

        // Get current user's connections once
        const myConns = await Connection.find({
            $or: [{ requester: currentUserId }, { recipient: currentUserId }],
            status: ConnectionStatus.ACCEPTED
        });
        const myFriendIds = new Set(myConns.map(c => {
            const isReq = c.requester.toString() === currentUserId;
            return isReq ? c.recipient.toString() : c.requester.toString();
        }));

        // Get all connections for the requested users in one query
        const allConns = await Connection.find({
            $or: [
                { requester: { $in: limitedIds } },
                { recipient: { $in: limitedIds } }
            ],
            status: ConnectionStatus.ACCEPTED
        });

        // Build per-user friend sets
        const userFriendsMap: Record<string, string[]> = {};
        for (const uid of limitedIds) {
            userFriendsMap[uid] = [];
        }
        for (const c of allConns) {
            const req = c.requester.toString();
            const rec = c.recipient.toString();
            if (userFriendsMap[req] !== undefined) userFriendsMap[req].push(rec);
            if (userFriendsMap[rec] !== undefined) userFriendsMap[rec].push(req);
        }

        // Calculate mutuals for each user
        const mutualIdsAll = new Set<string>();
        const result: Record<string, { mutualCount: number; mutualIds: string[] }> = {};
        for (const uid of limitedIds) {
            const theirFriends = userFriendsMap[uid] || [];
            const mIds = theirFriends.filter(id => myFriendIds.has(id));
            result[uid] = { mutualCount: mIds.length, mutualIds: mIds.slice(0, 4) };
            mIds.slice(0, 4).forEach(id => mutualIdsAll.add(id));
        }

        // Fetch user details for all mutual users at once
        const mutualUsers = await User.find({ _id: { $in: [...mutualIdsAll] } }).select('name avatar headline');
        const mutualUserMap: Record<string, any> = {};
        for (const u of mutualUsers) {
            mutualUserMap[u._id.toString()] = { _id: u._id, name: u.name, avatar: u.avatar, headline: u.headline };
        }

        // Build final response
        const mutuals: Record<string, { mutualCount: number; mutuals: any[] }> = {};
        for (const uid of limitedIds) {
            mutuals[uid] = {
                mutualCount: result[uid].mutualCount,
                mutuals: result[uid].mutualIds.map(id => mutualUserMap[id]).filter(Boolean)
            };
        }

        res.json({ mutuals });
    } catch (error) {
        console.error('Error fetching batch mutual connections:', error);
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

// GET /api/connections/pending-received - Get incoming pending requests
router.get('/pending-received', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const connections = await Connection.find({
            recipient: userId,
            status: ConnectionStatus.PENDING
        }).populate('requester', 'name avatar headline currentCompany graduationYear department');

        const requests = connections.map(conn => ({
            requestId: conn._id,
            user: conn.requester,
            createdAt: conn.createdAt
        }));

        res.json(requests);
    } catch (error) {
        console.error('Error fetching pending received:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/connections/pending-sent - Get outgoing pending requests
router.get('/pending-sent', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.userId as string | undefined;
        const connections = await Connection.find({
            requester: userId,
            status: ConnectionStatus.PENDING
        }).populate('recipient', 'name avatar headline currentCompany graduationYear department');

        const requests = connections.map(conn => ({
            requestId: conn._id,
            user: conn.recipient,
            createdAt: conn.createdAt
        }));

        res.json(requests);
    } catch (error) {
        console.error('Error fetching pending sent:', error);
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
