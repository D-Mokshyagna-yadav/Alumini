import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// removed unused Link import
import api from '../lib/api';
import {
    Calendar, MapPin, Users, Clock, Video, ChevronRight,
    Plus, Search, X, List, CheckCircle, Globe
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import resolveMediaUrl from '../lib/media';
import Avatar from '../components/ui/Avatar';

interface Event {
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: 'in-person' | 'online' | 'hybrid';
    attendees: number;
    attendeesList?: Array<{ id: string; name: string; avatar?: string }>;
    image: string;
    organizer: string;
    isRegistered: boolean;
    status?: string;
    rejectionReason?: string;
}

const Events = () => {
    const [filter, setFilter] = useState<'all' | 'in-person' | 'online' | 'hybrid'>('all');
    const [tab, setTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
    const [searchQuery, setSearchQuery] = useState('');

    const [showEventModal, setShowEventModal] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEvent, setNewEvent] = useState<Partial<Event>>({
        title: '',
        date: '',
        time: '',
        location: '',
        type: 'in-person',
        description: '',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
    });
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    const filteredEvents = events.filter(event => {
        const matchesFilter = filter === 'all' || event.type === filter;
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());

        // Tab filter
        const isCompleted = (event as any).isCompleted;
        if (tab === 'upcoming' && isCompleted) return false;
        if (tab === 'completed' && !isCompleted) return false;

        return matchesFilter && matchesSearch;
    });

    const toast = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [counts, setCounts] = useState<{ all: number; upcoming: number; completed: number }>({ all: 0, upcoming: 0, completed: 0 });

    const handleCreateEvent = () => {
        (async () => {
            try {
                let bannerUrl = newEvent.image;
                if (bannerFile) {
                    const form = new FormData();
                    form.append('banner', bannerFile);
                    const up = await api.post('/upload/event-banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                    bannerUrl = up.data.relative || up.data.url;
                }

                const payload = {
                    title: newEvent.title,
                    description: newEvent.description,
                    date: newEvent.date,
                    time: newEvent.time,
                    venue: newEvent.location,
                    bannerImage: bannerUrl
                };

                const res = await api.post('/events', payload);
                if (res.status === 200 || res.status === 201) {
                    toast.show('Event created and published.', 'success');
                    // If server returned event, add a local pending copy so creator sees it
                    const created = res.data.event;
                    if (created) {
                        const mapped = {
                            id: created._id || Date.now(),
                            title: created.title,
                            description: created.description,
                            date: created.date,
                            time: created.time || 'TBD',
                            location: created.venue || 'TBD',
                            type: created.venue && String(created.venue).toLowerCase().includes('online') ? 'online' : 'in-person',
                            attendees: created.attendees || 0,
                            image: created.bannerImage || newEvent.image,
                            organizer: created.createdBy?.name || 'You',
                            isRegistered: false,
                            // attach status/rejection info if present
                            status: created.status,
                            rejectionReason: created.rejectionReason
                        } as any;
                        setEvents(prev => [mapped, ...prev]);
                    }
                    setShowEventModal(false);
                    setNewEvent({ title: '', date: '', time: '', location: '', type: 'in-person', description: '', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' });
                    setBannerFile(null);
                    setBannerPreview(null);
                }
            } catch (err: any) {
                if (err.response && err.response.status === 401) {
                    toast.show('Please login to create events', 'error');
                } else if (err.response && err.response.data && err.response.data.message) {
                    toast.show(err.response.data.message, 'error');
                } else {
                    console.error(err);
                    toast.show('Failed to create event', 'error');
                }
            }
        })();
    };

    const handleRegister = async (eventId: number) => {
        try {
            const res = await api.post(`/events/${eventId}/register`);
            if (res.status === 200) {
                const updated = res.data.event;
                if (updated) {
                    setEvents(prev => prev.map(ev => ev.id === (updated._id || updated.id) ? {
                        ...ev,
                        attendees: typeof updated.attendees === 'number' ? updated.attendees : (updated.attendeesCount || ev.attendees),
                        isRegistered: !!updated.isRegistered
                    } : ev));
                }
            }
        } catch (err: any) {
            if (err.response && err.response.status === 401) toast.show('Please login to register', 'error');
            else if (err.response && err.response.data && err.response.data.message) toast.show(err.response.data.message, 'error');
            else { console.error(err); toast.show('Failed to register', 'error'); }
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
            weekday: date.toLocaleString('default', { weekday: 'long' }),
        };
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/events');
                const apiEvents = res.data.events || [];
                if (!mounted) return;
                const mapped = apiEvents.map((e: any, idx: number) => ({
                    id: e._id || idx,
                    title: e.title,
                    description: e.description,
                    date: e.date,
                    time: e.time || 'TBD',
                    location: e.venue || 'TBD',
                    type: e.venue && String(e.venue).toLowerCase().includes('online') ? 'online' : 'in-person',
                    attendees: typeof e.attendees === 'number' ? e.attendees : (e.attendeesCount || (Array.isArray(e.attendees) ? e.attendees.length : 0)),
                    image: e.bannerImage || undefined,
                    organizer: e.createdBy?.name || 'Alumni',
                    isRegistered: !!e.isRegistered,
                    isCompleted: !!e.isCompleted,
                }));

                setEvents(mapped);
                // fetch counts from server to show in sidebar
                try {
                    const c = await api.get('/events/counts');
                    if (c.data && c.data.counts) setCounts(c.data.counts);
                } catch (e) { /* ignore */ }
            } catch (err) {
                console.error('Failed to load events', err);
            } finally {
                setLoading(false);
            }
        };

        load();
        return () => { mounted = false };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Loading events...</p>
            </div>
        );
    }

    const upcomingEvents: Event[] = events
        .filter((e) => {
            try { return new Date(e.date).getTime() >= new Date().setHours(0,0,0,0); } catch { return true; }
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // use server-provided counts when available, fallback to client compute
    const upcomingCount = counts.upcoming || events.filter((e) => { try { return !((e as any).isCompleted) && new Date(e.date).getTime() >= new Date().setHours(0,0,0,0); } catch { return !((e as any).isCompleted); } }).length;
    const completedCount = counts.completed || events.filter(e => !!(e as any).isCompleted).length;
    const allCount = counts.all || events.length;

    return (
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Mobile Tab Filters */}
            <div className="lg:hidden mb-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setTab('all')}
                        className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium transition-colors ${tab === 'all' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        All ({allCount})
                    </button>
                    <button onClick={() => setTab('upcoming')}
                        className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium transition-colors ${tab === 'upcoming' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        Upcoming ({upcomingCount})
                    </button>
                    <button onClick={() => setTab('completed')}
                        className={`flex-shrink-0 px-4 py-1.5 text-xs font-medium transition-colors ${tab === 'completed' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        Past ({completedCount})
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-2">
                    {(['all', 'in-person', 'online', 'hybrid'] as const).map((type) => (
                        <button key={type} onClick={() => setFilter(type)}
                            className={`flex-shrink-0 px-3 py-1 text-xs font-medium transition-colors border ${filter === type ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border-color)] text-[var(--text-secondary)]'}`}>
                            {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 sm:gap-6">
                {/* Left Sidebar - Tabs (Desktop only) */}
                <aside className="hidden lg:block">
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 sticky top-[68px]">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Event Categories</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setTab('all')}
                                className={`flex items-center gap-3 text-left w-full px-4 py-3 transition-colors ${tab === 'all' ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-l-4 border-[var(--accent)] pl-3' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                <List size={18} />
                                <span className="flex-1">All Events</span>
                                <span className="text-sm text-[var(--text-muted)]">({allCount})</span>
                            </button>
                            <button onClick={() => setTab('completed')}
                                className={`flex items-center gap-3 text-left w-full px-4 py-3 transition-colors ${tab === 'completed' ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-l-4 border-[var(--accent)] pl-3' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                <CheckCircle size={18} />
                                <span className="flex-1">Past / Completed</span>
                                <span className="text-sm text-[var(--text-muted)]">({completedCount})</span>
                            </button>
                            <button onClick={() => setTab('upcoming')}
                                className={`flex items-center gap-3 text-left w-full px-4 py-3 transition-colors ${tab === 'upcoming' ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-l-4 border-[var(--accent)] pl-3' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                <Clock size={18} />
                                <span className="flex-1">Upcoming</span>
                                <span className="text-sm text-[var(--text-muted)]">({upcomingCount})</span>
                            </button>
                        </div>

                        {/* Filters */}
                            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                            <h4 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">Filters</h4>
                            <div className="flex flex-col gap-2">
                                {(['all', 'in-person', 'online', 'hybrid'] as const).map((type) => (
                                    <button key={type} onClick={() => setFilter(type)} className={`flex items-center gap-3 text-left w-full px-4 py-2 transition-colors ${filter === type ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                                        {type === 'all' && <List size={16} />}
                                        {type === 'in-person' && <MapPin size={16} />}
                                        {type === 'online' && <Video size={16} />}
                                        {type === 'hybrid' && <Globe size={16} />}
                                        <span className="flex-1 text-sm">{type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
                {/* Main Content */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Header */}
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex-shrink-0">Events</h1>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowEventModal(true)}
                                    className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors flex-shrink-0"
                                >
                                    <Plus size={16} /> Create Event
                                </button>
                            )}
                        </div>
                        {/* Search bar — visible on all screen sizes */}
                        <div className="relative group">
                            <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border-none shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-within:shadow-[0_4px_32px_rgba(0,0,0,0.10),inset_0_0_0_1.5px_rgba(128,128,128,0.25)] transition-all duration-300 px-4 sm:px-5 py-3">
                                <Search size={18} className="text-[var(--text-muted)] flex-shrink-0 group-focus-within:text-[var(--accent)] transition-colors duration-300" />
                                <input
                                    type="text"
                                    placeholder="Search events by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent !border-none !outline-none !ring-0 !shadow-none !rounded-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 focus:border-none focus:shadow-none w-full"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-1 rounded-full hover:bg-[var(--bg-secondary)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 flex-shrink-0"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Mobile Create button below search */}
                        {isAdmin && (
                            <button
                                onClick={() => setShowEventModal(true)}
                                className="lg:hidden flex items-center justify-center gap-1.5 w-full mt-3 px-3 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
                            >
                                <Plus size={14} /> Create Event
                            </button>
                        )}
                    </div>

                    {/* Create Event Modal */}
                    <AnimatePresence>
                        {showEventModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-[var(--bg-secondary)] w-full max-w-lg shadow-lg overflow-hidden rounded-2xl"
                                >
                                    <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Create Event</h2>
                                        <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                            <X size={24} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Event Title</label>
                                            <input
                                                type="text"
                                                value={newEvent.title}
                                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)]"
                                                placeholder="Ex: Alumni Meetup 2026"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date</label>
                                                <input
                                                    type="date"
                                                    value={newEvent.date}
                                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                                    className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Time</label>
                                                <input
                                                    type="text"
                                                    value={newEvent.time}
                                                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                                    className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)]"
                                                    placeholder="Ex: 10:00 AM"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                                            <div className="flex gap-2 mb-2">
                                                {(['in-person', 'online', 'hybrid'] as const).map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setNewEvent({ ...newEvent, type })}
                                                        className={`px-3 py-1 text-xs font-medium border ${newEvent.type === type
                                                            ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]'
                                                            : 'bg-transparent text-[var(--text-muted)] border-[var(--border-color)]'
                                                            }`}
                                                    >
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={newEvent.location}
                                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                                className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)]"
                                                placeholder={newEvent.type === 'online' ? "Ex: Zoom Link" : "Ex: Main Auditorium"}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                                            <textarea
                                                value={newEvent.description}
                                                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                                className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] resize-none h-24"
                                                placeholder="What is this event about?"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Banner Image (optional)</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const f = e.target.files && e.target.files[0];
                                                    if (f) {
                                                        setBannerFile(f);
                                                        setBannerPreview(URL.createObjectURL(f));
                                                    } else {
                                                        setBannerFile(null);
                                                        setBannerPreview(null);
                                                    }
                                                }}
                                                className="w-full text-sm text-[var(--text-primary)]"
                                            />
                                            {bannerPreview && (
                                                <div className="mt-2">
                                                    <img src={bannerPreview} alt="preview" className="w-full h-40 object-contain bg-[var(--bg-tertiary)]" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                        <button
                                            onClick={() => setShowEventModal(false)}
                                            className="px-4 py-2 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateEvent}
                                            disabled={!newEvent.title || !newEvent.date}
                                            className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                                        >
                                            Create Event
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Events List */}
                    <div className="space-y-4">
                        {filteredEvents.map((event: Event, index: number) => {
                            const date = formatDate(event.date);
                            return (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => navigate(`/events/${event.id}`)}
                                    className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                                >
                                    <div className="flex flex-col sm:flex-row">
                                        {/* Image */}
                                        <div className="sm:w-[200px] h-[150px] sm:h-auto flex-shrink-0 bg-[var(--bg-tertiary)] overflow-hidden">
                                            <img
                                                src={resolveMediaUrl(event.image)}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-4">
                                            <div className="flex items-start gap-4">
                                                {/* Date Box */}
                                                <div className="hidden sm:flex flex-col items-center text-center min-w-[50px]">
                                                    <span className="text-xs font-bold text-[var(--accent)]">{date.month}</span>
                                                    <span className="text-2xl font-bold text-[var(--text-primary)]">{date.day}</span>
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium mb-2 ${event.type === 'online'
                                                                ? 'bg-[var(--accent-light)] text-[var(--text-primary)]'
                                                                : event.type === 'hybrid'
                                                                    ? 'bg-[var(--accent-light)] text-[var(--text-primary)]'
                                                                    : 'bg-[var(--accent-light)] text-[var(--accent)]'
                                                                }`}>
                                                                {event.type === 'online' && <Video size={12} />}
                                                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                                            </span>
                                                            <h3 className="font-semibold text-lg text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer">
                                                                {event.title}
                                                            </h3>
                                                                {event.status === 'PENDING' && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium mb-2 bg-[var(--accent-light)] text-[var(--text-primary)]">Pending Approval</span>
                                                                )}
                                                                {event.status === 'REJECTED' && (
                                                                    <div className="mb-2">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[var(--accent-light)] text-[var(--text-primary)]">Rejected</span>
                                                                        {event.rejectionReason && <span className="ml-2 text-xs text-[var(--text-muted)]">{event.rejectionReason}</span>}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                                                                    {event.description}
                                                                </p>
                                                        </div>
                                                    </div>

                                                    {/* Meta */}
                                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-secondary)]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={14} />
                                                            {event.time}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={14} />
                                                            {event.location}
                                                        </span>
                                                        {/* Attendees with avatars */}
                                                        <div className="flex items-center gap-2">
                                                            {event.attendeesList && event.attendeesList.length > 0 ? (
                                                                <>
                                                                    <div className="flex -space-x-2">
                                                                        {event.attendeesList.slice(0, 3).map((attendee, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className="w-6 h-6 bg-[var(--accent)] border-2 border-[var(--bg-primary)] flex items-center justify-center overflow-hidden"
                                                                            >
                                                                                <Avatar src={attendee.avatar} iconSize={12} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-sm text-[var(--text-secondary)]">
                                                                        {event.attendees} attendee{event.attendees !== 1 ? 's' : ''}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    <Users size={14} />
                                                                    {typeof event.attendees === 'number' ? event.attendees : 0} attending
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                        <div className="flex items-center gap-3 mt-4">
                                                        {event.isRegistered ? (
                                                            <button onClick={(e) => { e.stopPropagation(); handleRegister(event.id); }} className="px-4 py-2 bg-[var(--accent-light)] text-[var(--text-primary)] font-semibold text-sm">Unregister</button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRegister(event.id); }}
                                                                className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold text-sm hover:bg-[var(--accent-hover)] transition-colors"
                                                            >
                                                                Register
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`); }} className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-sm hover:bg-[var(--bg-tertiary)] transition-colors">
                                                            Learn More
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Sidebar */}
                <aside className="hidden lg:block space-y-4">
                    {/* Your Events */}
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 sticky top-[68px]">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Your Upcoming Events</h3>
                        <div className="space-y-3">
                            {upcomingEvents.filter((e: Event) => e.isRegistered).length > 0 ? (
                                upcomingEvents.filter((e: Event) => e.isRegistered).map((event: Event) => {
                                    const date = formatDate(event.date);
                                    return (
                                        <div key={event.id} className="flex gap-3 hover:bg-[var(--bg-tertiary)] -mx-2 px-2 py-2 cursor-pointer">
                                            <div className="w-12 h-12 bg-[var(--bg-tertiary)] flex flex-col items-center justify-center text-[var(--accent)]">
                                                <span className="text-xs font-bold">{date.month}</span>
                                                <span className="text-lg font-bold leading-none">{date.day}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{event.title}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{event.time}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-[var(--text-muted)]">No upcoming events. Browse and register!</p>
                            )}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    );
};

export default Events;
