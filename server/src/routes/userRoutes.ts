import express from 'express';
import User, { UserStatus } from '../models/User';
import { deleteGridFSFile } from '../config/gridfs';
import { cacheMiddleware, TTL } from '../config/cache';

const router = express.Router();

// Middleware to check authenticated user
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') {
        return res.status(403).json({ message: 'Account not approved.' });
    }
    next();
};

// GET /api/users/directory - Get all verified/active users for directory
router.get('/directory', requireAuth, cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const { search, batch, mentorOnly } = req.query;
        const filter: any = { status: UserStatus.ACTIVE };

        if (batch && batch !== 'all') {
            filter.graduationYear = parseInt(batch as string);
        }

        let users = await User.find(filter)
            .select('name email headline currentLocation currentCompany graduationYear degree department avatar coverImage isMentor')
            .sort({ name: 1 });

        if (search) {
            const searchLower = (search as string).toLowerCase();
            users = users.filter(u =>
                u.name.toLowerCase().includes(searchLower) ||
                u.headline?.toLowerCase().includes(searchLower) ||
                u.currentCompany?.toLowerCase().includes(searchLower)
            );
        }

        if (mentorOnly === 'true') {
            users = users.filter(u => (u as any).isMentor);
        }

        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/search/all - Search all active users (for sharing, etc.)
router.get('/search/all', requireAuth, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const { q } = req.query;
        const currentUserId = req.session!.userId;
        
        const filter: any = { 
            status: UserStatus.ACTIVE,
            _id: { $ne: currentUserId }
        };

        let users = await User.find(filter)
            .select('name headline avatar')
            .sort({ name: 1 })
            .limit(50);

        if (q && typeof q === 'string' && q.trim()) {
            const searchLower = q.toLowerCase();
            users = users.filter(u =>
                u.name.toLowerCase().includes(searchLower) ||
                u.headline?.toLowerCase().includes(searchLower)
            );
        }

        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users/:id/view - Record a profile view
router.post('/:id/view', requireAuth, async (req, res) => {
    try {
        const viewerId = req.session!.userId;
        const profileId = req.params.id;

        // Don't count self-views
        if (viewerId === profileId) {
            return res.json({ message: 'Self view not counted' });
        }

        await User.findByIdAndUpdate(profileId, { $addToSet: { profileViewers: viewerId } });
        res.json({ message: 'View recorded' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/:id - Get single user profile
router.get('/:id', requireAuth, cacheMiddleware(TTL.USER), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-passwordHash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/me/saved - Get current user's saved posts
router.get('/me/saved', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId).populate({
            path: 'savedPosts',
            populate: { path: 'author', select: 'name avatar headline' }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ posts: (user as any).savedPosts || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mentor request feature removed

// PUT /api/users/profile - Update current user's profile
router.put('/profile', requireAuth, async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userId = req.session.userId;
        const updates = req.body;

        // Fields that can be updated
        const allowedUpdates = ['headline', 'currentLocation', 'currentCompany', 'bio', 'skills', 'isMentor', 'avatar', 'coverImage', 'phone', 'linkedinUrl', 'githubUrl', 'websiteUrl', 'twitterUrl', 'instagramUrl', 'youtubeUrl', 'experiences', 'education', 'jobProviderPreference', 'jobSeekerPreference', 'privacySettings', 'twoFactorEnabled'];
        const updateData: any = {};

        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                updateData[key] = updates[key];
            }
        }

        // If client is explicitly clearing avatar or coverImage (empty string),
        // remove the underlying file from GridFS before saving.
        const existingUser = await User.findById(userId);

        if (existingUser) {
            const extractGridName = (stored: string | undefined): string | null => {
                if (!stored) return null;
                let rel = stored;
                const idx = rel.indexOf('/uploads/');
                if (idx >= 0) rel = rel.substring(idx + '/uploads/'.length);
                rel = rel.replace(/^\/?(?:api\/)?uploads\//, '');
                return rel || null;
            };

            if (updates.avatar === '' && existingUser.avatar) {
                const gridName = extractGridName(existingUser.avatar as string);
                if (gridName) deleteGridFSFile(gridName).catch(e => console.warn('Failed to remove avatar from GridFS:', e));
            }

            if (updates.coverImage === '' && (existingUser as any).coverImage) {
                const gridName = extractGridName((existingUser as any).coverImage as string);
                if (gridName) deleteGridFSFile(gridName).catch(e => console.warn('Failed to remove cover from GridFS:', e));
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user, message: 'Profile updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users/settings/email - Update email
router.post('/settings/email', requireAuth, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const userId = req.session!.userId;

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Check if email is already in use
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        user.email = newEmail;
        await user.save();

        res.json({ message: 'Email updated successfully' });
    } catch (error) {
        console.error('Error updating email:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/users/settings/password - Change password
router.post('/settings/password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session!.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.passwordHash = hashedPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/users/settings/notifications - Get notification preferences
router.get('/settings/notifications', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const userId = req.session!.userId;
        const user = await User.findById(userId).select('notificationPreferences');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return default preferences if not set
        const defaultPreferences = {
            emailNotifications: true,
            pushNotifications: true,
            jobAlerts: true,
            eventReminders: true,
            messageNotifications: true,
            connectionRequests: true,
            postLikes: false,
            postComments: true,
            weeklyDigest: true,
        };

        res.json((user as any).notificationPreferences || defaultPreferences);
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/users/settings/notifications - Update notification preferences
router.patch('/settings/notifications', requireAuth, async (req, res) => {
    try {
        const userId = req.session!.userId;
        const preferences = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { notificationPreferences: preferences } },
            { new: true }
        ).select('notificationPreferences');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Notification preferences updated successfully' });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export { router as userRouter };

