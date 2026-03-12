import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import CachedImage from '../components/CachedImage';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { 
    Calendar, MapPin, Eye, Share2, MoreVertical, 
    ThumbsUp, MessageCircle, Send, Facebook, Twitter, 
    Linkedin, Instagram, Users, Clock, User, ArrowLeft, UserPlus, UserMinus, Trash2, AlertTriangle, Pencil, X, Upload
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';

const EventDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const { on: onSocket } = useSocket();
    const { show: showToast } = useToast();
    const navigate = useNavigate();

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<any[]>([]);
    const [attendees, setAttendees] = useState<any[]>([]);
    const [newPost, setNewPost] = useState('');
    const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
    const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
    const [registrationLoading, setRegistrationLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [stateLoading, setStateLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', date: '', time: '', venue: '' });
    const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
    const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [postSubmitting, setPostSubmitting] = useState(false);
    const [commentSubmitting, setCommentSubmitting] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!id) return;
        loadEvent();
        loadPosts();
        loadAttendees();
    }, [id]);

    // ── Real-time socket listeners ────────────────────────────────────
    useEffect(() => {
        const unsubs: (() => void)[] = [];
        unsubs.push(onSocket('event_updated', (data: { eventId: string }) => {
            if (String(data.eventId) === String(id)) {
                loadEvent();
                loadAttendees();
            }
        }));
        unsubs.push(onSocket('event_deleted', (data: { eventId: string }) => {
            if (String(data.eventId) === String(id)) {
                showToast('This event has been deleted', 'info');
                navigate('/events');
            }
        }));
        return () => unsubs.forEach(fn => fn());
    }, [onSocket, id]);

    const loadEvent = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data.event);
        } catch (err) {
            console.error('Failed to load event', err);
            showToast('Failed to load event', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async () => {
        try {
            const res = await api.get(`/event-posts/${id}`);
            setPosts(res.data.posts || []);
        } catch (err) {
            console.error('Failed to load posts', err);
        }
    };

    const loadAttendees = async () => {
        try {
            const res = await api.get(`/events/${id}/attendees`);
            const raw = res.data.attendees || res.data.list || res.data.registered || [];
            const normalized = (Array.isArray(raw) ? raw : []).map((a: any) => {
                return {
                    id: a.id || a._id,
                    name: a.name || 'Unknown',
                    department: a.department || 'Alumni',
                    batch: a.graduationYear || a.batch || 'Class of 2020',
                    avatar: a.avatar || null,
                    role: a.role || 'Attendee'
                };
            }).filter(a => a.id);
            setAttendees(normalized);
        } catch (err) {
            console.error('Failed to load attendees', err);
        }
    };

    const handleRegister = async () => {
        setRegistrationLoading(true);
        try {
            await api.post(`/events/${id}/register`);
            loadEvent();
            loadAttendees();
            showToast(event?.isRegistered ? 'Unregistered successfully' : 'Registered successfully', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Registration failed', 'error');
        } finally {
            setRegistrationLoading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`/events/${id}`);
            showToast('Event deleted', 'success');
            navigate('/events');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete event', 'error');
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleStateChange = async (newState: string) => {
        setStateLoading(true);
        try {
            await api.patch(`/events/${id}/state`, { eventState: newState });
            loadEvent();
            showToast(`Event marked as ${newState}`, 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update state', 'error');
        } finally {
            setStateLoading(false);
        }
    };

    const openEditModal = () => {
        if (!event) return;
        setEditForm({
            title: event.title || '',
            description: event.description || '',
            date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
            time: event.time || '',
            venue: event.venue || event.location || '',
        });
        setEditBannerFile(null);
        setEditBannerPreview(null);
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        setEditLoading(true);
        try {
            let bannerUrl: string | undefined;
            if (editBannerFile) {
                const form = new FormData();
                form.append('banner', editBannerFile);
                const up = await api.post('/upload/event-banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                bannerUrl = up.data.relative || up.data.url;
            }
            const payload: any = {};
            if (editForm.title) payload.title = editForm.title;
            if (editForm.description) payload.description = editForm.description;
            if (editForm.date) payload.date = editForm.date;
            if (editForm.time) payload.time = editForm.time;
            if (editForm.venue) payload.venue = editForm.venue;
            if (bannerUrl) payload.bannerImage = bannerUrl;

            await api.put(`/events/${id}`, payload);
            showToast('Event updated successfully', 'success');
            setShowEditModal(false);
            loadEvent();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update event', 'error');
        } finally {
            setEditLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim()) return;
        if (postSubmitting) return;
        setPostSubmitting(true);
        try {
            const res = await api.post(`/event-posts/${id}`, { content: newPost });
            setPosts([res.data.post, ...posts]);
            setNewPost('');
            showToast('Post created', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to create post', 'error');
        } finally {
            setPostSubmitting(false);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            const res = await api.post(`/event-posts/${postId}/like`);
            setPosts(posts.map(p => p.id === postId ? { ...p, isLiked: res.data.isLiked, likes: res.data.likes } : p));
        } catch (err) {
            console.error('Like failed', err);
        }
    };

    const handleComment = async (postId: string) => {
        const content = newComment[postId];
        if (!content || !content.trim()) return;
        if (commentSubmitting === postId) return;
        setCommentSubmitting(postId);
        try {
            const res = await api.post(`/event-posts/${postId}/comment`, { content });
            setPosts(posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        comments: p.comments + 1,
                        commentsList: [...(p.commentsList || []), res.data.comment]
                    };
                }
                return p;
            }));
            setNewComment({ ...newComment, [postId]: '' });
            showToast('Comment added', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to add comment', 'error');
        } finally {
            setCommentSubmitting(null);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard', 'success');
    };

    const shareSocial = (platform: string) => {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(event?.title || 'Event');
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
                break;
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${title}%20${url}`;
                break;
        }

        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr: string, timeStr?: string) => {
        if (timeStr) return timeStr;
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const getTimeAgo = (date: string) => {
        const now = new Date();
        const posted = new Date(date);
        const diff = Math.floor((now.getTime() - posted.getTime()) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return posted.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent">
                {/* Hero image skeleton */}
                <div className="relative h-64 sm:h-80 bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-secondary)]/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                </div>
                <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10">
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="h-7 w-3/4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="flex gap-4">
                            <div className="h-3.5 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3.5 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3.5 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="space-y-2 pt-2">
                            <div className="h-3 w-full rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3 w-full rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-3 w-2/3 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <div className="h-10 w-32 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="h-10 w-28 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-[var(--text-secondary)] mb-4">Event not found</p>
                    <button onClick={() => navigate('/events')} className="px-4 py-2 bg-[var(--text-secondary)] text-[var(--bg-primary)]">
                        Back to Events
                    </button>
                </div>
            </div>
        );
    }

    const isRegistrationClosed = event.isCompleted || event.eventState === 'completed' || new Date(event.date) < new Date();

    const stateColors: Record<string, string> = {
        upcoming: 'bg-blue-500/15 text-blue-500',
        ongoing: 'bg-green-500/15 text-green-500',
        completed: 'bg-[var(--text-muted)]/15 text-[var(--text-muted)]'
    };
    const currentState = event.eventState || 'upcoming';

    return (
        <div className="min-h-screen bg-transparent">
            {/* Hero Banner */}
            <div className="relative w-full bg-black overflow-hidden flex justify-center">
                {event.bannerImage ? (
                    <CachedImage src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" wrapperClassName="w-full lg:w-[70%] h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px]" priority />
                ) : (
                    <div className="w-full h-64 md:h-80 lg:h-96 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] flex items-center justify-center">
                        <Calendar className="text-[var(--text-muted)]" size={64} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <button
                    onClick={() => navigate('/events')}
                    className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors rounded-full"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">{event.title}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full ${stateColors[currentState] || stateColors.upcoming}`}>
                                {currentState}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar size={15} /> {formatDate(event.date)}
                            </span>
                            {(event.time || event.date) && (
                                <span className="flex items-center gap-1.5">
                                    <Clock size={15} /> {formatTime(event.date, event.time)}
                                </span>
                            )}
                            {(event.venue || event.location) && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={15} /> {event.venue || event.location}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Eye size={15} /> {event.views || 0} views
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2">
                        {!isRegistrationClosed ? (
                            <button
                                onClick={handleRegister}
                                disabled={registrationLoading}
                                className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm transition-colors disabled:opacity-50 ${
                                    event.isRegistered
                                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-red-500/10 hover:text-red-500'
                                        : 'bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]'
                                }`}
                            >
                                {registrationLoading ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                ) : event.isRegistered ? (
                                    <UserMinus size={16} />
                                ) : (
                                    <UserPlus size={16} />
                                )}
                                {registrationLoading ? 'Please wait...' : event.isRegistered ? 'Unregister' : 'Register'}
                            </button>
                        ) : (
                            <span className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                                Registration Closed
                            </span>
                        )}
                        <span className="text-sm text-[var(--text-muted)]">
                            {event.attendeesCount || 0} attending
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Admin Controls */}
                        {isAdmin && (
                            <>
                                <button
                                    onClick={openEditModal}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                    title="Edit Event"
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                                <select
                                    value={currentState}
                                    onChange={(e) => handleStateChange(e.target.value)}
                                    disabled={stateLoading}
                                    className="text-xs px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="upcoming">Upcoming</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 transition-colors" title="Delete Event"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="w-px h-5 bg-[var(--border-color)]" />
                            </>
                        )}
                        <button onClick={() => shareSocial('facebook')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors" title="Share on Facebook">
                            <Facebook size={16} />
                        </button>
                        <button onClick={() => shareSocial('whatsapp')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors" title="Share on WhatsApp">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        </button>
                        <button onClick={() => shareSocial('twitter')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors" title="Share on X">
                            <Twitter size={16} />
                        </button>
                        <button onClick={() => shareSocial('linkedin')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors" title="Share on LinkedIn">
                            <Linkedin size={16} />
                        </button>
                        <button onClick={copyLink} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors" title="Copy link">
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
                {/* Description */}
                {event.description && (
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-6">
                        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">About this event</h3>
                        <div className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{event.description}</div>
                    </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(event.venue || event.location) && (
                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-5 flex items-start gap-3">
                            <MapPin size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Venue</p>
                                <p className="text-sm text-[var(--text-primary)]">{event.venue || event.location}</p>
                            </div>
                        </div>
                    )}
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-5 flex items-start gap-3">
                        <Calendar size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Date & Time</p>
                            <p className="text-sm text-[var(--text-primary)]">{formatDate(event.date)}</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatTime(event.date, event.time)}</p>
                        </div>
                    </div>
                    {event.type && (
                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-5 flex items-start gap-3">
                            <Users size={18} className="text-[var(--accent)] mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Event Type</p>
                                <p className="text-sm text-[var(--text-primary)] capitalize">{event.type}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Attendees */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">
                        <Users size={16} />
                        Attendees ({event.attendeesCount || 0})
                    </h3>
                    {attendees.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {attendees.map((attendee) => (
                                <Link
                                    key={attendee.id}
                                    to={`/profile/${attendee.id}`}
                                    className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)]/30 rounded-xl hover:border-[var(--accent)] transition-all group"
                                >
                                    <div className="w-10 h-10 overflow-hidden bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] shrink-0">
                                        <Avatar src={attendee.avatar} iconSize={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors">{attendee.name}</p>
                                        <p className="text-xs text-[var(--text-muted)] truncate">{attendee.department} &middot; {attendee.batch}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-[var(--text-muted)] py-6">No attendees yet. Be the first to register!</p>
                    )}
                </div>

                {/* Event Posts / Discussion */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">
                        <MessageCircle size={16} />
                        Discussion
                    </h3>

                    {/* Create Post */}
                    <div className="flex items-start gap-3 mb-6">
                        <div className="w-9 h-9 overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                            <Avatar src={user?.avatar} iconSize={16} iconClassName="text-[var(--text-muted)]" />
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder="Start a discussion..."
                                onKeyPress={(e) => e.key === 'Enter' && handleCreatePost()}
                                className="flex-1 px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                            <button
                                onClick={handleCreatePost}
                                disabled={!newPost.trim() || postSubmitting}
                                className="px-3 py-2 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Posts List */}
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div key={post.id} className="border-t border-[var(--border-color)] pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                                        <User size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{post.author.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {post.author.batch ? `Class of ${post.author.batch}` : 'Alumni'} &middot; {getTimeAgo(post.createdAt)}
                                                </p>
                                            </div>
                                            <button className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                                <MoreVertical size={14} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-[var(--text-primary)] mb-3">{post.content}</p>

                                        {post.likes > 0 && (
                                            <p className="text-xs text-[var(--text-muted)] mb-2">
                                                {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 py-1.5 border-t border-[var(--border-color)]">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                className={`flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${post.isLiked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                                            >
                                                <ThumbsUp size={14} /> Like
                                            </button>
                                            <button
                                                onClick={() => setShowComments({ ...showComments, [post.id]: !showComments[post.id] })}
                                                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <MessageCircle size={14} /> {post.comments} Comment{post.comments !== 1 ? 's' : ''}
                                            </button>
                                        </div>

                                        {showComments[post.id] && (
                                            <div className="mt-3 pl-3 border-l-2 border-[var(--border-color)] space-y-3">
                                                {post.commentsList?.map((comment: any, idx: number) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <div className="w-7 h-7 bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                                                            <User size={12} className="text-[var(--text-muted)]" />
                                                        </div>
                                                        <div className="bg-[var(--bg-primary)] p-2.5 flex-1">
                                                            <p className="text-xs font-medium text-[var(--text-primary)]">{comment.author.name}</p>
                                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={newComment[post.id] || ''}
                                                        onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                                                        placeholder="Write a comment..."
                                                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                                                        className="flex-1 px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                                                    />
                                                    <button
                                                        onClick={() => handleComment(post.id)}
                                                        className="p-1.5 bg-[var(--accent)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
                                                    >
                                                        <Send size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {posts.length === 0 && (
                            <p className="text-center text-sm text-[var(--text-muted)] py-8">
                                No posts yet. Be the first to start a discussion!
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Event Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[var(--bg-secondary)] w-full max-w-lg shadow-md overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <Pencil size={18} /> Edit Event
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Event Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Time</label>
                                    <input
                                        type="text"
                                        value={editForm.time}
                                        onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                                        className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] text-sm"
                                        placeholder="Ex: 10:00 AM"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Venue</label>
                                <input
                                    type="text"
                                    value={editForm.venue}
                                    onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                                    className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] text-sm"
                                    placeholder="Ex: Main Auditorium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full p-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] text-sm resize-none h-28"
                                    placeholder="Event description..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Banner Image</label>
                                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-[var(--border-color)] cursor-pointer hover:border-[var(--accent)] transition-colors text-sm text-[var(--text-muted)]">
                                    <Upload size={16} />
                                    {editBannerFile ? editBannerFile.name : 'Choose new banner (optional)'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) {
                                                setEditBannerFile(f);
                                                setEditBannerPreview(URL.createObjectURL(f));
                                            }
                                        }}
                                    />
                                </label>
                                {editBannerPreview && (
                                    <div className="mt-2 relative">
                                        <img src={editBannerPreview} alt="preview" className="w-full h-36 object-contain bg-[var(--bg-tertiary)]" />
                                        <button
                                            onClick={() => { setEditBannerFile(null); setEditBannerPreview(null); }}
                                            className="absolute top-1 right-1 p-1 bg-black/60 text-white hover:bg-black/80 rounded-full"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Admin Controls inside Edit */}
                            <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Admin Controls</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-secondary)]">Event State</span>
                                    <select
                                        value={currentState}
                                        onChange={(e) => handleStateChange(e.target.value)}
                                        disabled={stateLoading}
                                        className="text-sm px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="ongoing">Ongoing</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => { setShowEditModal(false); setShowDeleteConfirm(true); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={16} /> Delete Event
                                </button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2 flex-shrink-0">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-sm text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={editLoading || !editForm.title}
                                className="px-4 py-2 text-sm bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {editLoading && <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-[var(--bg-secondary)] w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-500">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Event</h3>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Are you sure you want to delete <strong>"{event.title}"</strong>? This action cannot be undone. All attendee data and event posts will be lost.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteLoading && <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDetail;

