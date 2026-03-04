import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import resolveMediaUrl from '../lib/media';
import Avatar from '../components/ui/Avatar';
import {
    Bell, User, ThumbsUp, MessageCircle, UserPlus,
    Briefcase, Calendar, Settings, Check, Trash2
} from 'lucide-react';
import api from '../lib/api';

interface Notification {
    id: number;
    type: 'like' | 'comment' | 'connection' | 'job' | 'event' | 'mention' | 'general';
    title: string;
    description: string;
    timestamp: string;
    isRead: boolean;
    actionUrl: string;
    avatar?: string;
}

/** Map a raw notification (from API or socket) into the UI shape */
const mapNotification = (n: any, isRealtime: boolean): Notification => {
    const t = n.type || '';

    // Determine UI category
    let uiType: Notification['type'] = 'general';
    if (t.includes('like') || t === 'post_like' || t === 'event_post_like') uiType = 'like';
    else if (t.includes('comment') || t === 'post_comment' || t === 'event_post_comment') uiType = 'comment';
    else if (t.includes('connection')) uiType = 'connection';
    else if (t.includes('job')) uiType = 'job';
    else if (t.includes('event') || t.includes('registration')) uiType = 'event';

    // Build action URL based on type
    let actionUrl = '/notifications';
    const d = n.data || {};
    if (uiType === 'job') {
        actionUrl = `/jobs/${d.job || n.jobId || ''}`;
    } else if (uiType === 'event') {
        actionUrl = `/events/${d.event || d.eventId || n.eventId || ''}`;
    } else if (uiType === 'like' || uiType === 'comment') {
        // Post likes/comments go to feed; event post likes/comments go to event
        if (t.startsWith('event_post')) {
            actionUrl = `/events/${d.eventId || d.event || ''}`;
        } else {
            actionUrl = '/feed';
        }
    } else if (uiType === 'connection') {
        actionUrl = '/directory';
    }

    return {
        id: n._id || Date.now() + Math.random(),
        type: uiType,
        title: n.message || n.title || 'Notification',
        description: d.comment || d.text || '',
        timestamp: isRealtime ? new Date().toLocaleString() : new Date(n.createdAt).toLocaleString(),
        isRead: isRealtime ? false : !!n.read,
        actionUrl,
        avatar: d.image || n.image || undefined,
    };
};

const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    // socket (reuse global on window to avoid duplicate connections)
    useEffect(() => {
        let mounted = true;
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
        const base = apiOrigin || '';
        const win: any = window;
        if (!win.__ALUMNI_SOCKET) {
            win.__ALUMNI_SOCKET = io(base || (location.origin), { withCredentials: true });
        }
        const socket: Socket = win.__ALUMNI_SOCKET;

        socket.on('notification', (n: any) => {
            if (!mounted) return;
            const mapped = mapNotification(n, true);
            setNotifications(prev => [mapped, ...prev]);
        });

        return () => { mounted = false; socket.off('notification'); };
    }, []);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/notifications');
                const data = res.data;
                if (!mounted) return;
                const mapped = (data.notifications || []).map((n: any) => mapNotification(n, false));
                setNotifications(mapped);
            } catch (err) {
                console.error('Failed to load notifications', err);
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false };
    }, []);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        // Persist to server (fire-and-forget)
        api.patch(`/notifications/${id}/read`).catch(() => {});
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        api.patch('/notifications/read-all').catch(() => {});
    };

    const deleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        api.delete(`/notifications/${id}`).catch(() => {});
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like': return <ThumbsUp size={20} className="text-[var(--accent)]" />;
            case 'comment': return <MessageCircle size={20} className="text-[var(--text-secondary)]" />;
            case 'connection': return <UserPlus size={20} className="text-[var(--text-secondary)]" />;
            case 'job': return <Briefcase size={20} className="text-[var(--accent)]" />;
            case 'event': return <Calendar size={20} className="text-[var(--text-secondary)]" />;
            default: return <Bell size={20} className="text-[var(--text-muted)]" />;
        }
    };

    return (
        <div className="max-w-[1128px] mx-auto px-4 py-6">
            <div className="max-w-[600px] mx-auto">
                {/* Header */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-[var(--text-primary)]">Notifications</h1>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-[var(--accent)] font-medium hover:underline"
                                >
                                    Mark all as read
                                </button>
                            )}
                            <button className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors">
                                <Settings size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${filter === 'all'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${filter === 'unread'
                                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                            <p className="text-[var(--text-secondary)]">No notifications to show</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification, index) => (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex gap-4 p-4 border-b border-[var(--border-color)]/30 last:border-b-0 hover:bg-[var(--bg-tertiary)]/50 transition-colors ${!notification.isRead ? 'bg-[var(--accent-light)]/30' : ''
                                    }`}
                            >
                                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {notification.avatar ? (
                                        <Avatar src={notification.avatar} iconSize={20} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {getIcon(notification.type)}
                                        </div>
                                    )}
                                </div>

                                <Link to={notification.actionUrl} className="flex-1 min-w-0" onClick={() => markAsRead(notification.id)}>
                                    <p className={`text-sm ${!notification.isRead ? 'font-semibold' : ''} text-[var(--text-primary)]`}>
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)] truncate">{notification.description}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{notification.timestamp}</p>
                                </Link>

                                <div className="flex items-start gap-1">
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="p-2 hover:bg-[var(--bg-secondary)] transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check size={16} className="text-[var(--text-muted)]" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        className="p-2 hover:bg-[var(--accent-light)] transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
