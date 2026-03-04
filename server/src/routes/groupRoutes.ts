import express from 'express';
import Group from '../models/Group';
import User, { UserStatus } from '../models/User';

const router = express.Router();

// Middleware to check authenticated user
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') return res.status(403).json({ message: 'Account not approved.' });
    next();
};

// GET /api/groups - Get user's groups
router.get('/', requireAuth, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.session!.userId })
            .populate('members', 'name avatar')
            .populate('admins', 'name avatar')
            .sort({ updatedAt: -1 });

        res.json({ groups });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/groups - Create a new group
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, memberIds } = req.body;
        const userId = req.session!.userId;

        // Include creator in members and admins
        const members = [...new Set([userId, ...(memberIds || [])])];

        const newGroup = new Group({
            name,
            description,
            members,
            admins: [userId],
            createdBy: userId
        });

        await newGroup.save();

        const populatedGroup = await Group.findById(newGroup._id)
            .populate('members', 'name avatar')
            .populate('admins', 'name avatar');

        // Emit socket event to all members
        const io = (req as any).io;
        if (io) {
            members.forEach((memberId: string) => {
                io.to(memberId).emit('group_created', populatedGroup);
            });
        }

        res.status(201).json({ group: populatedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/groups/:id - Get group details
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members', 'name avatar headline')
            .populate('admins', 'name avatar')
            .populate('createdBy', 'name avatar');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/groups/:id - Update group
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only admins can update
        if (!group.admins.some(admin => admin.toString() === req.session!.userId)) {
            return res.status(403).json({ message: 'Only admins can update group' });
        }

        const { name, description, avatar } = req.body;
        if (name) group.name = name;
        if (description) group.description = description;
        if (avatar) group.avatar = avatar;

        await group.save();
        res.json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/groups/:id/members - Add members to group
router.post('/:id/members', requireAuth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only admins can add members
        if (!group.admins.some(admin => admin.toString() === req.session!.userId)) {
            return res.status(403).json({ message: 'Only admins can add members' });
        }

        const { memberIds } = req.body;
        const newMembers = memberIds.filter((id: string) =>
            !group.members.some(m => m.toString() === id)
        );

        group.members.push(...newMembers);
        await group.save();

        const io = (req as any).io;
        if (io) {
            newMembers.forEach((memberId: string) => {
                io.to(memberId).emit('added_to_group', { groupId: group._id });
            });
        }

        res.json({ message: 'Members added', group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/groups/:id/members/:memberId - Remove member from group
router.delete('/:id/members/:memberId', requireAuth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const userId = req.session!.userId;
        const { memberId } = req.params;

        // User can remove themselves, or admins can remove anyone
        const isAdmin = group.admins.some(admin => admin.toString() === userId);
        if (memberId !== userId && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        group.members = group.members.filter(m => m.toString() !== memberId);
        group.admins = group.admins.filter(a => a.toString() !== memberId);

        await group.save();

        const io = (req as any).io;
        if (io) {
            io.to(memberId).emit('removed_from_group', { groupId: group._id });
        }

        res.json({ message: 'Member removed', group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/groups/:id - Delete group
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only creator can delete
        if (group.createdBy.toString() !== req.session!.userId) {
            return res.status(403).json({ message: 'Only creator can delete group' });
        }

        await Group.findByIdAndDelete(req.params.id);
        res.json({ message: 'Group deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as groupRouter };
