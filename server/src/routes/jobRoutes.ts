import express from 'express';
import User from '../models/User';
import { UserStatus } from '../models/User';
import Job from '../models/Job';
import Notification from '../models/Notification';
import { getSettings } from '../models/SiteSettings';

const router = express.Router();

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') return res.status(403).json({ message: 'Account not approved.' });
    next();
};

// GET /api/jobs/:id/applicants - list applicants (job poster or admin only)
router.get('/:id/applicants', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const job = await Job.findById(req.params.id).populate('applicantsList.user', 'name avatar graduationYear email');
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Only creator or admin can view applicants
        if (String(job.postedBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const list = (job.applicantsList || []).map((a: any) => ({
            userId: a.user?._id,
            name: a.user?.name || 'Unknown',
            appliedAt: a.appliedAt,
            user: {
                _id: a.user?._id,
                name: a.user?.name,
                avatar: a.user?.avatar,
                graduationYear: a.user?.graduationYear,
                email: a.user?.email
            }
        }));
        res.json({ applicants: list });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs - list jobs (only approved, plus own pending)
router.get('/', async (req, res) => {
    try {
        const userId = req.session?.userId;
        // Show approved jobs + user's own pending/rejected jobs
        const filter: any = userId
            ? { $or: [{ status: 'approved' }, { postedBy: userId }] }
            : { status: 'approved' };
        const jobs = await Job.find(filter).sort({ createdAt: -1 }).populate('postedBy', 'name graduationYear');
        
        // Map to API-friendly shape
        const payload = jobs.map(j => {
            const hasApplied = userId ? j.applicantsList.some(a => String(a.user) === String(userId)) : false;
            const isCreator = userId && j.postedBy ? String(j.postedBy._id) === String(userId) : false;
            return {
                id: j._id,
                title: j.title,
                company: j.company,
                location: j.location,
                type: j.type,
                mode: j.mode,
                salary: j.salary,
                description: j.description,
                requirements: j.requirements,
                image: j.image,
                postedBy: j.postedBy ? { id: String((j.postedBy as any)._id), name: (j.postedBy as any).name || 'Unknown', batch: (j.postedBy as any).graduationYear || null } : null,
                postedAt: (j as any).createdAt,
                applicants: j.applicants,
                isOpen: (j as any).isOpen !== false,
                status: (j as any).status || 'approved',
                isSaved: false,
                hasApplied,
                isCreator
            };
        });

        res.json({ jobs: payload });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs/preferences - get current user's job portal preferences
router.get('/preferences', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            jobProviderPreference: (user as any).jobProviderPreference || 'not_provider',
            jobSeekerPreference: (user as any).jobSeekerPreference || 'active'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/jobs/preferences - update current user's job portal preferences
router.post('/preferences', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { jobProviderPreference, jobSeekerPreference } = req.body;
        if (jobProviderPreference) (user as any).jobProviderPreference = jobProviderPreference;
        if (jobSeekerPreference) (user as any).jobSeekerPreference = jobSeekerPreference;

        await user.save();
        res.json({ message: 'Preferences saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs/:id - get single job details
router.get('/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('postedBy', 'name graduationYear email avatar');
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Increment view count
        (job as any).views = ((job as any).views || 0) + 1;
        await job.save();

        const userId = req.session?.userId;
        const isCreator = userId && String(job.postedBy._id) === String(userId);
        const isAdmin = req.session?.userId ? (await User.findById(req.session.userId))?.role === 'admin' : false;
        const canViewApplicants = isCreator || isAdmin;
        const hasApplied = userId ? job.applicantsList.some(a => String(a.user) === String(userId)) : false;

        const payload = {
            id: job._id,
            title: job.title,
            company: job.company,
            location: job.location,
            type: job.type,
            mode: job.mode,
            salary: job.salary,
            description: job.description,
            requirements: job.requirements,
            image: job.image,
            postedBy: job.postedBy ? { id: (job.postedBy as any)._id, name: (job.postedBy as any).name || 'Unknown', batch: (job.postedBy as any).graduationYear || null, email: (job.postedBy as any).email, avatar: (job.postedBy as any).avatar || null } : null,
            postedAt: (job as any).createdAt,
            deadline: (job as any).deadline,
            applicants: job.applicants,
            isOpen: (job as any).isOpen !== false,
            views: (job as any).views || 0,
            industry: (job as any).industry,
            workExperience: (job as any).workExperience,
            experienceRange: (job as any).experienceRange,
            companyDescription: (job as any).companyDescription,
            canViewApplicants,
            hasApplied,
            isCreator
        };

        res.json(payload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/jobs - create job (Alumni and Admin only, pending approval unless auto-approved)
router.post('/', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role !== 'alumni' && user.role !== 'admin') return res.status(403).json({ message: 'Only graduated alumni and admins can create job postings.' });

        const isAdmin = user.role === 'admin';
        const settings = await getSettings();
        const autoApprove = isAdmin || settings.autoApproveJobs;

        // Persist job to DB
        const { title, company, location, type, mode, salary, description, requirements, image, industry, workExperience, experienceRange, deadline, companyDescription } = req.body;

        if (!title || !company || !location || !description) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const job = new Job({
            title,
            company,
            location,
            type: type || 'Full-time',
            mode: mode || 'Remote',
            salary,
            description,
            requirements: Array.isArray(requirements) ? requirements : (requirements ? [requirements] : []),
            image,
            postedBy: user._id,
            applicants: 0,
            industry,
            workExperience,
            experienceRange,
            deadline,
            companyDescription,
            views: 0,
            status: autoApprove ? 'approved' : 'pending'
        });

        await job.save();

        // Notify the poster
        try {
            await Notification.create({
                recipient: user._id,
                type: autoApprove ? 'job_posted' : 'job_pending',
                message: autoApprove
                    ? `Your job posting "${title}" has been published successfully`
                    : `Your job posting "${title}" has been submitted for admin approval`,
                data: { job: job._id, title, company }
            });
        } catch (e) {
            console.error('Notification error', e);
        }

        res.status(201).json({
            message: autoApprove ? 'Job created and published' : 'Job submitted for admin approval',
            jobId: job._id
        });

        // Broadcast new job to all clients if auto-approved
        if (autoApprove) {
            try {
                const io = (req as any).io;
                if (io) io.emit('job_created', { jobId: job._id });
            } catch (e) { /* ignore */ }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/jobs/:id/interest - toggle interest in a job (apply/unapply)
router.post('/:id/interest', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Prevent poster from marking interest in their own job
        if (String(job.postedBy) === String(user._id)) {
            return res.status(400).json({ message: 'Cannot mark interest in your own job' });
        }

        // Check if already interested
        const alreadyIndex = (job.applicantsList || []).findIndex(a => String(a.user) === String(user._id));
        const hasApplied = alreadyIndex !== -1;

        if (hasApplied) {
            // UNAPPLY - Remove from applicantsList and decrement count
            job.applicantsList.splice(alreadyIndex, 1);
            job.applicants = Math.max(0, (job.applicants || 0) - 1);
            await job.save();

            // Create notification for the user confirming withdrawal
            try {
                await Notification.create({
                    recipient: user._id,
                    actor: user._id,
                    type: 'job_interest_withdrawn',
                    message: `You withdrew your application for "${job.title}"`,
                    data: { job: job._id, title: job.title, image: job.image }
                });

                const io = (req as any).io;
                if (io) io.to(String(user._id)).emit('notification', {
                    message: `You withdrew your application for "${job.title}"`,
                    jobId: job._id,
                    image: job.image || null,
                    title: job.title || null,
                    type: 'job_interest_withdrawn'
                });
            } catch (e) {
                console.error('Withdrawal notification error', e);
            }

            res.json({ message: 'Application withdrawn', applied: false });

            // Broadcast job update
            try { const io = (req as any).io; if (io) io.emit('job_updated', { jobId: job._id }); } catch (e) { /* ignore */ }
        } else {
            // APPLY - Do not allow interest on closed jobs
            if ((job as any).isOpen === false) return res.status(400).json({ message: 'Job registration is closed' });

            // Add to applicantsList and increment count
            job.applicantsList = job.applicantsList || [];
            job.applicantsList.push({ user: user._id, name: user.name, appliedAt: new Date() } as any);
            job.applicants = (job.applicants || 0) + 1;
            await job.save();

            // Create notification for the job poster
            try {
                const notificationData: any = { job: job._id, user: user._id };
                if (job.image) notificationData.image = job.image;
                if (job.title) notificationData.title = job.title;

                await Notification.create({
                    recipient: job.postedBy,
                    actor: user._id,
                    type: 'job_interest',
                    message: `${user.name} is interested in your job "${job.title}"`,
                    data: notificationData
                });

                // Emit socket notification if available (only to poster)
                const io = (req as any).io;
                if (io) io.to(String(job.postedBy)).emit('notification', {
                    message: `${user.name} is interested in your job "${job.title}"`,
                    jobId: job._id,
                    userId: user._id,
                    image: job.image || null,
                    title: job.title || null,
                    type: 'job_interest'
                });
            } catch (e) {
                console.error('Notification error', e);
            }

            // Also notify the applicant that their interest was recorded
            try {
                await Notification.create({
                    recipient: user._id,
                    actor: user._id,
                    type: 'job_interest_confirm',
                    message: `You showed interest in "${job.title}"`,
                    data: { job: job._id, title: job.title, image: job.image }
                });

                const io = (req as any).io;
                if (io) io.to(String(user._id)).emit('notification', {
                    message: `You showed interest in "${job.title}"`,
                    jobId: job._id,
                    image: job.image || null,
                    title: job.title || null,
                    type: 'job_interest_confirm'
                });
            } catch (e) {
                console.error('Applicant notification error', e);
            }

            res.json({ message: 'Marked interested', applied: true });

            // Broadcast job update
            try { const io = (req as any).io; if (io) io.emit('job_updated', { jobId: job._id }); } catch (e) { /* ignore */ }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/jobs/:id/applicants - list interested members (poster or admin only)
router.get('/:id/applicants', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const job = await Job.findById(req.params.id).populate('applicantsList.user', 'name email graduationYear');
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Only poster or admin can view full list
        if (String(job.postedBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const list = (job.applicantsList || []).map(a => ({ userId: a.user._id || a.user, name: (a as any).name || (a.user as any).name, appliedAt: a.appliedAt }));
        res.json({ applicants: list });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/jobs/:id/close - close job registration (poster or admin)
router.post('/:id/close', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        // Only poster or admin can close
        if (String(job.postedBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        if ((job as any).isOpen === false) return res.status(400).json({ message: 'Job already closed' });

        (job as any).isOpen = false;
        (job as any).closedAt = new Date();
        await job.save();

        // Notify poster (if admin closed, poster still receives notification)
        try {
            await Notification.create({
                recipient: job.postedBy,
                actor: user._id,
                type: 'job_closed',
                message: `Job "${job.title}" has been closed by ${user.name}`,
                data: { job: job._id }
            });

            const io = (req as any).io;
            if (io) io.to(String(job.postedBy)).emit('notification', { message: `Job "${job.title}" has been closed`, jobId: job._id, type: 'job_closed' });
        } catch (e) {
            console.error('Notification error', e);
        }

        res.json({ message: 'Job closed' });

        // Broadcast job update
        try { const io2 = (req as any).io; if (io2) io2.emit('job_updated', { jobId: job._id }); } catch (e) { /* ignore */ }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/jobs/:id - delete job (poster or admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        if (String(job.postedBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        await Job.findByIdAndDelete(req.params.id);

        // Broadcast job deletion
        try { const io = (req as any).io; if (io) io.emit('job_deleted', { jobId: req.params.id }); } catch (e) { /* ignore */ }

        res.json({ message: 'Job deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as jobRouter };
