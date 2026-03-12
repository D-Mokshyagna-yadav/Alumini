import express from 'express';
import User, { UserStatus } from '../models/User';
import Event, { EventStatus } from '../models/Event';
import Post from '../models/Post';
import Job from '../models/Job';
import Notification from '../models/Notification';
import SiteSettings, { getSettings } from '../models/SiteSettings';
import NotableAlumni from '../models/NotableAlumni';
import Administration from '../models/Administration';
import { cacheMiddleware, TTL } from '../config/cache';
import { sendApprovedEmail } from '../config/email';

const router = express.Router();

// Middleware to check Admin role
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    next();
};

// GET /api/admin/pending-users - Get all pending verification users
router.get('/pending-users', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: UserStatus.PENDING })
            .select('-passwordHash')
            .sort({ createdAt: -1 });

        res.json({ users: pendingUsers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/verify-user/:id - Approve a pending user
router.post('/verify-user/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = UserStatus.ACTIVE;
        user.isVerified = true;
        await user.save();

        // Send approval email to the user
        try {
            await sendApprovedEmail(user.email, user.name);
        } catch (e) { console.error('Approval email error:', e); }

        // Notify the user that their account has been verified
        try {
            await Notification.create({
                recipient: user._id,
                actor: req.session!.userId,
                type: 'account_verified',
                message: 'Your account has been verified! Welcome to the Alumni Network.',
                data: {}
            });
            const io = (req as any).io;
            if (io) {
                io.to(String(user._id)).emit('notification', {
                    message: 'Your account has been verified! Welcome to the Alumni Network.',
                    type: 'account_verified'
                });
            }
        } catch (e) { console.error('Notification error', e); }

        res.json({ message: 'User verified successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/reject-user/:id - Reject a pending user and delete their data
router.post('/reject-user/:id', requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ message: 'Rejection reason is required' });
        }

        const userName = user.name;
        const userEmail = user.email;

        await User.findByIdAndDelete(req.params.id);

        res.json({ 
            message: 'User rejected and removed from database', 
            rejectedUser: { name: userName, email: userEmail },
            reason: reason
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/all-users - Get all users with filters
router.get('/all-users', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const { status, role } = req.query;
        const filter: any = {};

        if (status) filter.status = status;
        if (role) filter.role = role;

        const users = await User.find(filter)
            .select('-passwordHash')
            .sort({ createdAt: -1 });

        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/analytics - Get basic analytics
router.get('/analytics', requireAdmin, cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ status: { $ne: UserStatus.REJECTED } });
        const pendingUsers = await User.countDocuments({ status: UserStatus.PENDING });
        const activeUsers = await User.countDocuments({ status: UserStatus.ACTIVE });
        const rejectedUsers = await User.countDocuments({ status: UserStatus.REJECTED });

        res.json({
            totalUsers,
            pendingUsers,
            activeUsers,
            rejectedUsers,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/pending-events - Get all pending events
router.get('/pending-events', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const events = await Event.find({ status: EventStatus.PENDING }).populate('createdBy', '-passwordHash').sort({ createdAt: -1 });
        res.json({ events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/approve-event/:id - Approve an event
router.post('/approve-event/:id', requireAdmin, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        event.status = EventStatus.APPROVED;
        // Clear any previous rejection metadata
        event.rejectionReason = undefined as any;
        event.rejectedAt = undefined as any;
        await event.save();
        // Notify creator
        try {
            const creator = await User.findById(event.createdBy);
            if (creator) {
                await Notification.create({ recipient: creator._id, type: 'event_approved', message: `Your event "${event.title}" was approved`, data: { event: event._id } });
                const io = (req as any).io;
                if (io) io.to(String(creator._id)).emit('notification', { message: `Your event \"${event.title}\" was approved`, eventId: event._id });
            }
        } catch (e) { /* ignore notification errors */ }

        // Broadcast to all clients so Events page refreshes
        try { const io = (req as any).io; if (io) io.emit('event_created', { eventId: event._id }); } catch (e) { /* ignore */ }

        res.json({ message: 'Event approved', event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/reject-event/:id - Reject an event
router.post('/reject-event/:id', requireAdmin, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        const { reason } = req.body;
        event.status = EventStatus.REJECTED;
        event.rejectionReason = reason || 'No reason provided';
        event.rejectedAt = new Date();
        await event.save();
        // Notify creator
        try {
            const creator = await User.findById(event.createdBy);
            if (creator) {
                await Notification.create({ recipient: creator._id, type: 'event_rejected', message: `Your event "${event.title}" was rejected: ${event.rejectionReason}`, data: { event: event._id } });
                const io = (req as any).io;
                if (io) io.to(String(creator._id)).emit('notification', { message: `Your event \"${event.title}\" was rejected`, eventId: event._id });
            }
        } catch (e) { /* ignore notification errors */ }

        res.json({ message: 'Event rejected', event });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/user/:id - Update any user field (including password/email)
router.put('/user/:id', requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const {
            name, email, password, role, status, graduationYear, degree, department,
            rollNumber, headline, industry, phone, currentLocation, currentCompany, designation, bio
        } = req.body;

        // Update fields if provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (status) user.status = status;
        if (graduationYear) user.graduationYear = graduationYear;
        if (degree) user.degree = degree;
        if (department) user.department = department;
        if (rollNumber) user.rollNumber = rollNumber;
        if (headline) user.headline = headline;
        if (industry) user.industry = industry;
        if (phone) user.phone = phone;
        if (currentLocation) user.currentLocation = currentLocation;
        if (currentCompany) user.currentCompany = currentCompany;
        if (designation) user.designation = designation;
        if (bio) user.bio = bio;

        // Hash new password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.passwordHash = await bcrypt.hash(password, salt);
        }

        await user.save();

        const updatedUser = await User.findById(req.params.id).select('-passwordHash');
        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/user/:id - Delete a user
router.delete('/user/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/create-user - Create a new user (admin only)
router.post('/create-user', requireAdmin, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const {
            name, email, password, role, status, graduationYear, degree, department,
            rollNumber, headline, industry, phone, currentLocation, currentCompany, designation, bio
        } = req.body;

        if (!name || !email || !password || !graduationYear || !degree || !rollNumber) {
            return res.status(400).json({ message: 'Name, email, password, graduation year, degree, and roll number are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { rollNumber }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or roll number already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({
            name,
            email,
            passwordHash,
            role: role || 'alumni',
            status: status || UserStatus.ACTIVE,
            graduationYear,
            degree,
            department,
            rollNumber,
            headline,
            industry,
            phone,
            currentLocation,
            currentCompany,
            designation,
            bio,
            isVerified: true
        });

        await user.save();

        const createdUser = await User.findById(user._id).select('-passwordHash');
        res.status(201).json({ message: 'User created successfully', user: createdUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/user/:id - Get a single user's full details
router.get('/user/:id', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= POST MANAGEMENT =========================

// GET /api/admin/all-posts - Get all posts
router.get('/all-posts', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'name avatar headline graduationYear degree')
            .populate('comments.author', 'name avatar')
            .sort({ createdAt: -1 });
        res.json({ posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/post/:id - Delete any post
router.delete('/post/:id', requireAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        await Post.findByIdAndDelete(req.params.id);
        // Notify post author
        try {
            await Notification.create({
                recipient: post.author,
                actor: req.session!.userId,
                type: 'post_removed',
                message: 'Your post was removed by an administrator.',
                data: {}
            });
            const io = (req as any).io;
            if (io) io.to(String(post.author)).emit('notification', { message: 'Your post was removed by an administrator.', type: 'post_removed' });
        } catch (e) { /* ignore */ }
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= JOB MANAGEMENT =========================

// GET /api/admin/all-jobs - Get all jobs
router.get('/all-jobs', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate('postedBy', 'name avatar graduationYear')
            .sort({ createdAt: -1 });
        res.json({ jobs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/job/:id - Delete any job
router.delete('/job/:id', requireAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        await Job.findByIdAndDelete(req.params.id);
        // Notify job poster
        try {
            await Notification.create({
                recipient: job.postedBy,
                actor: req.session!.userId,
                type: 'job_removed',
                message: `Your job posting "${job.title}" was removed by an administrator.`,
                data: { title: job.title }
            });
            const io = (req as any).io;
            if (io) io.to(String(job.postedBy)).emit('notification', { message: `Your job posting "${job.title}" was removed.`, type: 'job_removed' });
        } catch (e) { /* ignore */ }
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= EVENT MANAGEMENT =========================

// GET /api/admin/all-events - Get all events
router.get('/all-events', requireAdmin, cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const { status } = req.query;
        const filter: any = {};
        if (status) filter.status = status;
        const events = await Event.find(filter)
            .populate('createdBy', 'name avatar')
            .sort({ createdAt: -1 });
        res.json({ events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/event/:id - Delete any event
router.delete('/event/:id', requireAdmin, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        await Event.findByIdAndDelete(req.params.id);
        // Notify event creator
        try {
            await Notification.create({
                recipient: event.createdBy,
                actor: req.session!.userId,
                type: 'event_removed',
                message: `Your event "${event.title}" was removed by an administrator.`,
                data: { title: event.title }
            });
            const io = (req as any).io;
            if (io) io.to(String(event.createdBy)).emit('notification', { message: `Your event "${event.title}" was removed.`, type: 'event_removed' });
        } catch (e) { /* ignore */ }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= ENHANCED ANALYTICS =========================

// GET /api/admin/analytics-full - Get comprehensive analytics
router.get('/analytics-full', requireAdmin, cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const [totalUsers, pendingUsers, activeUsers, rejectedUsers, totalPosts, pendingPosts, totalJobs, pendingJobs, totalEvents, pendingEvents] = await Promise.all([
            User.countDocuments({ status: { $ne: UserStatus.REJECTED } }),
            User.countDocuments({ status: UserStatus.PENDING }),
            User.countDocuments({ status: UserStatus.ACTIVE }),
            User.countDocuments({ status: UserStatus.REJECTED }),
            Post.countDocuments(),
            Post.countDocuments({ status: 'pending' }),
            Job.countDocuments(),
            Job.countDocuments({ status: 'pending' }),
            Event.countDocuments(),
            Event.countDocuments({ status: EventStatus.PENDING }),
        ]);
        res.json({ totalUsers, pendingUsers, activeUsers, rejectedUsers, totalPosts, pendingPosts, totalJobs, pendingJobs, totalEvents, pendingEvents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= POST APPROVAL =========================

// POST /api/admin/approve-post/:id - Approve a pending post
router.post('/approve-post/:id', requireAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        (post as any).status = 'approved';
        await post.save();
        // Notify post author
        try {
            await Notification.create({
                recipient: post.author,
                actor: req.session!.userId,
                type: 'post_approved',
                message: 'Your post has been approved and is now published!',
                data: { post: post._id }
            });
            const io = (req as any).io;
            if (io) {
                io.to(String(post.author)).emit('notification', { message: 'Your post has been approved!', type: 'post_approved', postId: post._id });
                // Also emit to feed so it appears for everyone
                const populatedPost = await Post.findById(post._id)
                    .populate('author', 'name headline avatar graduationYear degree')
                    .populate('comments.author', 'name avatar');
                io.emit('new_post', populatedPost);
            }
        } catch (e) { /* ignore */ }
        res.json({ message: 'Post approved', post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/reject-post/:id - Reject a pending post
router.post('/reject-post/:id', requireAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const { reason } = req.body;
        (post as any).status = 'rejected';
        await post.save();
        // Notify post author
        try {
            await Notification.create({
                recipient: post.author,
                actor: req.session!.userId,
                type: 'post_rejected',
                message: `Your post was rejected${reason ? ': ' + reason : ''}`,
                data: { post: post._id }
            });
            const io = (req as any).io;
            if (io) io.to(String(post.author)).emit('notification', { message: 'Your post was rejected', type: 'post_rejected', postId: post._id });
        } catch (e) { /* ignore */ }
        res.json({ message: 'Post rejected', post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= JOB APPROVAL =========================

// POST /api/admin/approve-job/:id - Approve a pending job
router.post('/approve-job/:id', requireAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        (job as any).status = 'approved';
        await job.save();
        // Notify job poster
        try {
            await Notification.create({
                recipient: job.postedBy,
                actor: req.session!.userId,
                type: 'job_approved',
                message: `Your job posting "${job.title}" has been approved and is now published!`,
                data: { job: job._id, title: job.title }
            });
            const io = (req as any).io;
            if (io) io.to(String(job.postedBy)).emit('notification', { message: `Your job posting "${job.title}" has been approved!`, type: 'job_approved', jobId: job._id });
        } catch (e) { /* ignore */ }

        // Broadcast to all clients so Jobs page refreshes
        try { const io = (req as any).io; if (io) io.emit('job_created', { jobId: job._id }); } catch (e) { /* ignore */ }

        res.json({ message: 'Job approved', job });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/reject-job/:id - Reject a pending job
router.post('/reject-job/:id', requireAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        const { reason } = req.body;
        (job as any).status = 'rejected';
        await job.save();
        // Notify job poster
        try {
            await Notification.create({
                recipient: job.postedBy,
                actor: req.session!.userId,
                type: 'job_rejected',
                message: `Your job posting "${job.title}" was rejected${reason ? ': ' + reason : ''}`,
                data: { job: job._id, title: job.title }
            });
            const io = (req as any).io;
            if (io) io.to(String(job.postedBy)).emit('notification', { message: `Your job posting "${job.title}" was rejected`, type: 'job_rejected', jobId: job._id });
        } catch (e) { /* ignore */ }
        res.json({ message: 'Job rejected', job });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ========================= SITE SETTINGS =========================

// GET /api/admin/settings - Get site settings (auto-approval toggles etc.)
router.get('/settings', requireAdmin, cacheMiddleware(TTL.STATIC), async (_req, res) => {
    try {
        const settings = await getSettings();
        res.json({ settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/settings - Update site settings
router.put('/settings', requireAdmin, async (req, res) => {
    try {
        const { autoApproveUsers, autoApprovePosts, autoApproveJobs } = req.body;
        const settings = await getSettings();
        if (typeof autoApproveUsers === 'boolean') settings.autoApproveUsers = autoApproveUsers;
        if (typeof autoApprovePosts === 'boolean') settings.autoApprovePosts = autoApprovePosts;
        if (typeof autoApproveJobs === 'boolean') settings.autoApproveJobs = autoApproveJobs;
        await settings.save();
        res.json({ message: 'Settings updated', settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== NOTABLE ALUMNI CRUD ====================

// GET /api/admin/notable-alumni
router.get('/notable-alumni', requireAdmin, cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const alumni = await NotableAlumni.find().sort({ order: 1, createdAt: -1 });
        res.json({ alumni });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/notable-alumni
router.post('/notable-alumni', requireAdmin, async (req, res) => {
    try {
        const { name, role, batch, image, profileId, order } = req.body;
        if (!name || !role || !batch || !image) {
            return res.status(400).json({ message: 'Name, role, batch and image are required' });
        }
        const alumni = await NotableAlumni.create({ name, role, batch, image, profileId: profileId || null, order: order || 0 });
        res.json({ alumni });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/notable-alumni/:id
router.put('/notable-alumni/:id', requireAdmin, async (req, res) => {
    try {
        const { name, role, batch, image, profileId, order } = req.body;
        const update: any = {};
        if (name) update.name = name;
        if (role) update.role = role;
        if (batch) update.batch = batch;
        if (image) update.image = image;
        if (typeof profileId !== 'undefined') update.profileId = profileId || null;
        if (typeof order !== 'undefined') update.order = Number(order) || 0;
        const alumni = await NotableAlumni.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!alumni) return res.status(404).json({ message: 'Not found' });
        res.json({ alumni });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/notable-alumni/:id
router.delete('/notable-alumni/:id', requireAdmin, async (req, res) => {
    try {
        const alumni = await NotableAlumni.findByIdAndDelete(req.params.id);
        if (!alumni) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ADMINISTRATION CRUD ====================

// GET /api/admin/administration
router.get('/administration', requireAdmin, cacheMiddleware(TTL.STATIC), async (req, res) => {
    try {
        const members = await Administration.find().sort({ category: 1, order: 1, createdAt: 1 });
        res.json({ members });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/administration
router.post('/administration', requireAdmin, async (req, res) => {
    try {
        const { name, designation, category, order } = req.body;
        if (!name || !designation || !category) {
            return res.status(400).json({ message: 'Name, designation and category are required' });
        }
        const member = await Administration.create({ name, designation, category, order: order || 0 });
        res.json({ member });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/administration/:id
router.put('/administration/:id', requireAdmin, async (req, res) => {
    try {
        const { name, designation, category, order } = req.body;
        const update: any = {};
        if (name) update.name = name;
        if (designation) update.designation = designation;
        if (category) update.category = category;
        if (typeof order !== 'undefined') update.order = Number(order) || 0;
        const member = await Administration.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!member) return res.status(404).json({ message: 'Not found' });
        res.json({ member });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/admin/administration/:id
router.delete('/administration/:id', requireAdmin, async (req, res) => {
    try {
        const member = await Administration.findByIdAndDelete(req.params.id);
        if (!member) return res.status(404).json({ message: 'Not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/admin/administration/seed — seed default data if empty
router.post('/administration/seed', requireAdmin, async (req, res) => {
    try {
        const count = await Administration.countDocuments();
        if (count > 0) return res.json({ message: 'Already seeded', members: await Administration.find().sort({ category: 1, order: 1 }) });
        const defaults = [
            { name: 'Dr. M.V. Ramana Rao', designation: 'Chairman', category: 'governing', order: 0 },
            { name: 'Sri N. Srinivasa Rao', designation: 'Vice Chairman', category: 'governing', order: 1 },
            { name: 'Sri M. Srinivasa Rao', designation: 'Director (P&D)', category: 'governing', order: 2 },
            { name: 'Sri D. Panduranga Rao', designation: 'CEO', category: 'governing', order: 3 },
            { name: 'Dr. T. Vamsee Kiran', designation: 'Principal', category: 'officials', order: 0 },
            { name: 'Dr. G. Rajesh', designation: 'Dean (Academics)', category: 'officials', order: 1 },
            { name: 'Dr. A. Guravaiah', designation: 'Dean (R&D)', category: 'officials', order: 2 },
        ];
        const members = await Administration.insertMany(defaults);
        res.json({ message: 'Seeded successfully', members });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as adminRouter };
