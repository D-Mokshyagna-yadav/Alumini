import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Megaphone, Sparkles } from 'lucide-react';
import api from '../lib/api';
import CachedImage from '../components/CachedImage';

interface AnnouncementItem {
    _id: string;
    title: string;
    subtitle?: string;
    template?: 'celebration' | 'festival' | 'event' | 'regards' | 'general' | 'custom';
    message?: string;
    image?: string;
    link?: string;
    ctaLabel?: string;
    ctaLink?: string;
    publishedAt?: string;
    priority?: number;
    readers?: number;
    createdAt: string;
}

const templateMeta: Record<string, { label: string; badge: string; panel: string; icon: string }> = {
    celebration: { label: 'Celebration', badge: 'bg-fuchsia-500/10 text-fuchsia-600', panel: 'from-fuchsia-500/15 via-rose-500/10 to-transparent', icon: '✦' },
    festival: { label: 'Festival', badge: 'bg-amber-500/10 text-amber-600', panel: 'from-amber-500/15 via-orange-500/10 to-transparent', icon: '☀' },
    event: { label: 'Event', badge: 'bg-blue-500/10 text-blue-600', panel: 'from-blue-500/15 via-cyan-500/10 to-transparent', icon: '◌' },
    regards: { label: 'Regards', badge: 'bg-rose-500/10 text-rose-600', panel: 'from-rose-500/15 via-pink-500/10 to-transparent', icon: '❤' },
    general: { label: 'General', badge: 'bg-emerald-500/10 text-emerald-600', panel: 'from-emerald-500/15 via-teal-500/10 to-transparent', icon: '•' },
    custom: { label: 'Custom', badge: 'bg-[var(--accent)]/10 text-[var(--accent)]', panel: 'from-[var(--accent)]/15 via-[var(--accent-hover)]/10 to-transparent', icon: '✎' },
};

const Announcements = () => {
    const [items, setItems] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await api.get('/public/announcements');
                setItems(res.data.announcements || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-5">
                    <div className="h-3.5 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
                    <div className="h-8 w-72 rounded bg-[var(--bg-tertiary)] animate-pulse mb-2" />
                    <div className="h-4 w-full max-w-2xl rounded bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl overflow-hidden shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
                                <div className="w-full sm:w-36 h-44 sm:h-28 rounded-lg bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-4 w-24 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-5 w-3/4 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-3 w-40 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-3 w-full rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-3 w-5/6 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-6 mb-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold mb-3">
                            <Megaphone size={14} /> Official Updates
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">College Announcements</h1>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 max-w-2xl">
                            Festival wishes, event updates, and official messages presented in a clean, mobile-friendly format.
                        </p>
                    </div>
                    <Link to="/news" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-color)]/40 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-colors self-start sm:self-auto">
                        <CalendarDays size={16} /> News
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                {items.length === 0 ? (
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-10 text-center shadow-sm">
                        <Sparkles className="mx-auto mb-3 text-[var(--text-muted)]" size={28} />
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">No announcements yet</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Check back later for festival wishes, event reminders, and official messages.</p>
                    </div>
                ) : items.map(item => {
                    const meta = templateMeta[item.template || 'general'] || templateMeta.general;
                    return (
                        <article key={item._id} className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                            <div className="flex flex-col sm:flex-row gap-0">
                                {item.image ? (
                                    <CachedImage src={item.image} alt={item.title} className="w-full h-full object-cover block" wrapperClassName="w-full sm:w-40 h-44 sm:h-auto sm:min-h-[210px] flex-shrink-0 !bg-transparent" priority={false} />
                                ) : (
                                    <div className={`w-full sm:w-40 h-44 sm:min-h-[210px] flex-shrink-0 bg-gradient-to-br ${meta.panel}`}>
                                        <div className="h-full w-full flex items-end p-4">
                                            <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-primary)]/75 backdrop-blur-md px-3 py-2 text-[var(--text-primary)] shadow-sm">
                                                <span className="text-lg leading-none">{meta.icon}</span>
                                                <span className="text-xs font-semibold uppercase tracking-[0.16em]">{meta.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">{item.title}</h2>
                                    {item.subtitle && <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)] font-medium">{item.subtitle}</p>}
                                    {item.message && <p className="mt-3 text-sm sm:text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{item.message}</p>}
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        {item.ctaLink && item.ctaLabel ? (
                                            <a href={item.ctaLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:opacity-90 transition-all">
                                                {item.ctaLabel}
                                            </a>
                                        ) : null}
                                        {item.link ? (
                                            <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-[var(--border-color)]/40 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                                                Open link
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default Announcements;