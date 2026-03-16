import { useEffect, useState } from 'react';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import { useConfirm } from '../context/ConfirmContext';
import { Edit3, Trash2, RotateCcw } from 'lucide-react';

// using central `api` instance

const MyEvents = () => {
    const confirm = useConfirm();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<string | null>(null);

    const [editing, setEditing] = useState<any | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const res = await api.get('/events/my');
                if (!mounted) return;
                setEvents(res.data.events || []);
            } catch (err) {
                console.error('Failed to load my events', err);
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => { mounted = false };
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const handleDelete = async (id: string) => {
        if (deleting) return;
        const ok = await confirm({ title: 'Delete Event', message: 'Delete this event? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        setDeleting(true);
        // optimistic remove
        const prev = events.slice();
        setEvents(prev.filter(e => e._id !== id));
        try {
            await api.delete(`/events/${id}`);
            setToast('Event deleted');
        } catch (err) {
            console.error(err);
            setEvents(prev);
            setToast('Failed to delete event');
        } finally {
            setDeleting(false);
        }
    };

    const openEdit = (ev: any) => {
        setEditing({ ...ev });
        setBannerPreview(ev.bannerImage ? resolveMediaUrl(ev.bannerImage) : null);
        setBannerFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitEdit = async () => {
        if (!editing) return;
        if (editSubmitting) return;
        setEditSubmitting(true);
        try {
            let bannerUrl = editing.bannerImage;
            if (bannerFile) {
                const form = new FormData();
                form.append('banner', bannerFile);
                const up = await api.post('/upload/event-banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                bannerUrl = up.data.relative || up.data.url;
            }

            const payload = {
                title: editing.title,
                description: editing.description,
                date: editing.date,
                time: editing.time,
                venue: editing.venue,
                bannerImage: bannerUrl,
            };

            // optimistic UI: update list immediately
            setEvents(prev => prev.map(e => e._id === editing._id ? { ...e, ...payload, status: 'PENDING' } : e));

            const res = await api.put(`/events/${editing._id}`, payload);
            setToast('Event updated and resubmitted');
            setEditing(null);
            setBannerFile(null);
            setBannerPreview(null);
            // reload server data for safety
            const fresh = await api.get('/events/my');
            setEvents(fresh.data.events || []);
        } catch (err) {
            console.error(err);
            setToast('Failed to update event');
        } finally {
            setEditSubmitting(false);
        }
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="h-7 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse mb-4" />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                        <div className="relative h-40 bg-[var(--bg-tertiary)] overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-secondary)]/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="h-5 w-2/3 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="flex gap-3">
                                <div className="h-3 w-20 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-semibold mb-4">My Events</h1>
            {toast && <div className="mb-4 p-3 bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm">{toast}</div>}

            {editing && (
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm p-4 mb-6">
                    <h2 className="font-semibold mb-2">Edit Event</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <input className="p-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                        <input type="date" className="p-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" value={editing.date?.slice(0,10)} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                        <input className="p-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" value={editing.time || ''} onChange={(e) => setEditing({ ...editing, time: e.target.value })} />
                        <input className="p-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" value={editing.venue || ''} onChange={(e) => setEditing({ ...editing, venue: e.target.value })} />
                        <textarea className="p-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; setBannerFile(f || null); setBannerPreview(f ? URL.createObjectURL(f) : null); }} />
                        {bannerPreview && <img src={bannerPreview} className="w-full h-40 object-contain bg-[var(--bg-tertiary)]" />}
                        <div className="flex gap-2 justify-end">
                            <button className="px-4 py-2" onClick={() => { setEditing(null); setBannerFile(null); setBannerPreview(null); }}>Cancel</button>
                            <button className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed" onClick={submitEdit} disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save & Resubmit'}</button>
                        </div>
                    </div>
                </div>
            )}

            {events.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">You have not created any events yet.</div>
            ) : (
                <div className="space-y-4">
                    {events.map((e: any) => (
                        <div key={e._id} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-[var(--text-primary)]">{e.title}</p>
                                    <p className="text-sm text-[var(--text-muted)]">{new Date(e.date).toLocaleDateString()}</p>
                                </div>
                                <div className="text-sm flex items-center gap-2">
                                    {e.status === 'PENDING' && <span className="px-3 py-1 bg-[var(--accent-light)] text-[var(--text-primary)]">Pending</span>}
                                    {e.status === 'APPROVED' && <span className="px-3 py-1 bg-[var(--accent-light)] text-[var(--text-primary)]">Approved</span>}
                                    {e.status === 'REJECTED' && <span className="px-3 py-1 bg-[var(--accent-light)] text-[var(--text-primary)]">Rejected</span>}
                                    <button title="Edit & Resubmit" onClick={() => openEdit(e)} className="p-2 hover:bg-[var(--bg-tertiary)]"><Edit3 size={16} /></button>
                                    <button title="Delete" onClick={() => handleDelete(e._id)} className="p-2 hover:bg-[var(--accent-light)]"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {e.rejectionReason && (
                                <div className="mt-2 text-sm text-[var(--text-muted)]">Reason: {e.rejectionReason}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyEvents;
