import express from 'express';
import Event, { EventStatus, EventState } from '../models/Event';
import User, { UserStatus } from '../models/User';
import Notification from '../models/Notification';
import { cacheMiddleware, TTL } from '../config/cache';

const router = express.Router();

// Auth middleware (reuse pattern)
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') return res.status(403).json({ message: 'Account not approved.' });
    next();
};

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

// POST /api/events - Create event (Admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { title, description, date, time, venue, bannerImage } = req.body;

        // Only admins can create events - auto-approved
        const event = new Event({ title, description, date, time, venue, bannerImage, createdBy: user._id, status: EventStatus.APPROVED });
        await event.save();

        // Broadcast new event
        try { const io = (req as any).io; if (io) io.emit('event_created', { eventId: event._id }); } catch (e) { /* ignore */ }

        return res.json({ message: 'Event created and published', event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/events - Public list of approved events
router.get('/', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const events = await Event.find({ status: EventStatus.APPROVED })
            .sort({ date: 1 })
            .populate('createdBy', 'name')
            .populate('attendees', 'name avatar');

        // If user is authenticated, mark isRegistered flag per event
        const userId = req.session?.userId ? String(req.session.userId) : null;

        const out = events.map(e => {
            const obj: any = e.toObject();
            obj.attendeesCount = e.attendeesCount || (e.attendees ? e.attendees.length : 0);
            obj.isCompleted = (e as any).isCompleted || false;
            obj.isRegistered = userId ? (e.attendees || []).some(a => String(a._id || a) === userId) : false;
            
            // Include attendees list with avatars (limit to first 3 for preview)
            obj.attendeesList = (e.attendees || []).slice(0, 3).map((a: any) => ({
                id: a._id || a,
                name: a.name || 'Unknown',
                avatar: a.avatar || null
            }));
            
            return obj;
        });

        res.json({ events: out });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/events/counts - return counts for All / Upcoming / Completed (approved events only)
router.get('/counts', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        const all = await Event.countDocuments({ status: EventStatus.APPROVED });
        const completed = await Event.countDocuments({ status: EventStatus.APPROVED, isCompleted: true });
        const upcoming = await Event.countDocuments({ status: EventStatus.APPROVED, isCompleted: { $ne: true }, date: { $gte: todayStr } });

        res.json({ counts: { all, upcoming, completed } });
    } catch (err) {
        console.error('Failed to compute event counts', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/events/my - return events created by current user (including statuses)
router.get('/my', requireAuth, cacheMiddleware(TTL.USER, true), async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const events = await Event.find({ createdBy: user._id }).sort({ date: -1 });
        res.json({ events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper: compute event state from date/time
function computeEventState(event: any): EventState {
    const now = new Date();
    const eventDate = new Date(event.date);
    // If time is specified, parse it (e.g. "10:00 AM" or "14:00")
    if (event.time) {
        const timeParts = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeParts) {
            let hours = parseInt(timeParts[1], 10);
            const minutes = parseInt(timeParts[2], 10);
            const ampm = timeParts[3];
            if (ampm) {
                if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            }
            eventDate.setHours(hours, minutes, 0, 0);
        }
    }
    // Consider event as "ongoing" for its duration (default ~3 hours if no end time)
    const eventEnd = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

    if (now < eventDate) return EventState.UPCOMING;
    if (now >= eventDate && now <= eventEnd) return EventState.ONGOING;
    return EventState.COMPLETED;
}

// GET /api/events/:id - Get single event (if approved or admin/creator)
router.get('/:id', requireAuth, cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('createdBy', '-passwordHash');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.status !== EventStatus.APPROVED) {
            const user = await User.findById(req.session!.userId);
            if (!user) return res.status(401).json({ message: 'Unauthorized' });
            if (user.role !== 'admin' && event.createdBy.toString() !== user._id.toString()) {
                return res.status(403).json({ message: 'Event not available' });
            }
        }

        // Auto-compute event state from date/time (unless admin has manually overridden to completed)
        const autoState = computeEventState(event);
        // If stored state is 'completed' (admin set it), keep it even if date says upcoming
        // Otherwise auto-update
        if (event.eventState !== EventState.COMPLETED || autoState === EventState.COMPLETED) {
            if (event.eventState !== autoState) {
                event.eventState = autoState;
                // Also sync isCompleted flag
                if (autoState === EventState.COMPLETED && !event.isCompleted) {
                    event.isCompleted = true;
                    event.completedAt = new Date();
                }
                await event.save();
            }
        }

        // Add flags for the client
        const userId = req.session?.userId ? String(req.session.userId) : null;
        const isRegistered = userId ? (event.attendees || []).some(a => String(a) === userId) : false;
        const isCreator = userId ? String(event.createdBy) === userId : false;
        const reqUser = req.session ? await User.findById(req.session.userId) : null;
        const isAdmin = reqUser?.role === 'admin';
        const canViewAttendees = isCreator || isAdmin;

        const out = event.toObject();
        (out as any).isRegistered = isRegistered;
        (out as any).isCreator = isCreator;
        (out as any).isAdmin = isAdmin;
        (out as any).canViewAttendees = !!canViewAttendees;
        (out as any).eventState = event.eventState || autoState;

        res.json({ event: out });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/events/:id/attendees - list attendees (public for approved events)
router.get('/:id/attendees', cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('attendees', 'name avatar graduationYear email');
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Only show attendees for approved events (or if user is creator/admin)
        const userId = req.session?.userId;
        const isCreator = userId && String(event.createdBy) === String(userId);
        const isAdmin = userId ? (await User.findById(userId))?.role === 'admin' : false;
        const canView = (event as any).status === EventStatus.APPROVED || isCreator || isAdmin;

        if (!canView) {
            return res.status(403).json({ message: 'Event not approved yet' });
        }

        const list = (event.attendees || []).map((a: any) => ({ 
            id: a._id, 
            name: a.name, 
            avatar: a.avatar, 
            graduationYear: a.graduationYear,
            email: a.email 
        }));
        res.json({ attendees: list });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/events/:id/register - register/unregister for event
router.post('/:id/register', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (event.status !== EventStatus.APPROVED) return res.status(403).json({ message: 'Cannot register for unapproved event' });

        const uid = user._id.toString();
        const already = event.attendees?.some(a => a.toString() === uid);

        if (already) {
            // Unregister
            event.attendees = (event.attendees || []).filter(a => a.toString() !== uid);
            event.attendeesCount = Math.max(0, (event.attendeesCount || 1) - 1);
            await event.save();

            // Broadcast event update (attendee count changed)
            try { const io = (req as any).io; if (io) io.emit('event_updated', { eventId: event._id }); } catch (e) { /* ignore */ }

            // Notify user of cancellation
            await Notification.create({ recipient: user._id, type: 'general', message: `You have cancelled registration for ${event.title}`, data: { event: event._id } });

            // return updated event with flags
            const out = event.toObject();
            (out as any).attendeesCount = event.attendeesCount || (event.attendees ? event.attendees.length : 0);
            (out as any).isRegistered = false;
            return res.json({ message: 'Unregistered', event: out });
        }

        // Register
        event.attendees = [...(event.attendees || []), user._id];
        event.attendeesCount = (event.attendeesCount || 0) + 1;
        await event.save();

        // Notify registrant
        await Notification.create({ recipient: user._id, type: 'registration_confirmed', message: `You are registered for ${event.title}`, data: { event: event._id } });

        // Notify event creator
        const creator = await User.findById(event.createdBy);
        if (creator) {
            await Notification.create({ recipient: creator._id, actor: user._id, type: 'new_registration', message: `${user.name} registered for your event: ${event.title}`, data: { event: event._id } });
            // emit socket notification if socket available
            try {
                const io = (req as any).io;
                if (io) io.to(String(creator._id)).emit('notification', { message: `${user.name} registered for ${event.title}`, eventId: event._id });
            } catch (e) { /* ignore */ }
        }

        // return updated event with flags
        const out = event.toObject();
        (out as any).attendeesCount = event.attendeesCount || (event.attendees ? event.attendees.length : 0);
        (out as any).isRegistered = true;
        res.json({ message: 'Registered', event: out });

        // Broadcast event update (attendee count changed)
        try { const io2 = (req as any).io; if (io2) io2.emit('event_updated', { eventId: event._id }); } catch (e) { /* ignore */ }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/events/:id/complete - mark event as completed (creator or admin)
router.post('/:id/complete', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (String(event.createdBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        if ((event as any).isCompleted) return res.status(400).json({ message: 'Event already completed' });

        (event as any).isCompleted = true;
        (event as any).completedAt = new Date();
        await event.save();

        // notify creator about completion
        try {
            await Notification.create({ recipient: event.createdBy, actor: user._id, type: 'event_completed', message: `Event "${event.title}" marked as completed`, data: { event: event._id } });
        } catch (e) { /* ignore */ }

        res.json({ message: 'Event marked completed', event });

        // Broadcast event update
        try { const io = (req as any).io; if (io) io.emit('event_updated', { eventId: event._id }); } catch (e) { /* ignore */ }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/events/:id - update an event (creator or admin)
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Only creator or admin can update
        if (String(event.createdBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        const { title, description, date, time, venue, bannerImage } = req.body;
        if (title) event.title = title;
        if (description) event.description = description;
        if (date) event.date = date;
        if (time) event.time = time;
        if (venue) event.venue = venue;
        if (bannerImage) event.bannerImage = bannerImage;

        // If event was rejected, resubmitting will set it to PENDING again
        if (event.status === EventStatus.REJECTED) {
            event.status = EventStatus.PENDING;
            event.rejectionReason = undefined as any;
            event.rejectedAt = undefined as any;
        }

        await event.save();

        // Broadcast event update
        try { const io = (req as any).io; if (io) io.emit('event_updated', { eventId: event._id }); } catch (e) { /* ignore */ }

        res.json({ message: 'Event updated', event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/events/:id/state - admin update event state
router.patch('/:id/state', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { eventState } = req.body;
        if (!eventState || !Object.values(EventState).includes(eventState)) {
            return res.status(400).json({ message: 'Invalid state. Must be upcoming, ongoing, or completed' });
        }

        event.eventState = eventState;
        if (eventState === EventState.COMPLETED) {
            event.isCompleted = true;
            event.completedAt = event.completedAt || new Date();
        } else {
            event.isCompleted = false;
            event.completedAt = undefined;
        }
        await event.save();

        // Broadcast event state update
        try { const io = (req as any).io; if (io) io.emit('event_updated', { eventId: event._id }); } catch (e) { /* ignore */ }

        res.json({ message: `Event state updated to ${eventState}`, event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/events/:id - delete an event (creator or admin)
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session!.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (String(event.createdBy) !== String(user._id) && user.role !== 'admin') {
            return res.status(403).json({ message: 'Not allowed' });
        }

        await Event.findByIdAndDelete(req.params.id);

        // Broadcast event deletion
        try { const io = (req as any).io; if (io) io.emit('event_deleted', { eventId: req.params.id }); } catch (e) { /* ignore */ }

        res.json({ message: 'Event deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export { router as eventRouter };
