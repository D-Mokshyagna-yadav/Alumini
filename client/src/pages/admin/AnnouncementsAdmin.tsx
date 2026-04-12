import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Upload, Edit2, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import CachedImage from '../../components/CachedImage';
import resolveMediaUrl from '../../lib/media';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

interface AnnouncementItem {
    _id: string;
    title: string;
    subtitle?: string;
    template?: 'celebration' | 'festival' | 'event' | 'regards' | 'general' | 'custom';
    message?: string;
    image?: string;
    link?: string;
    draft?: boolean;
    audienceMode?: 'all' | 'specific';
    recipientIds?: string[];
    createdAt: string;
}

type TemplateKey = 'celebration' | 'festival' | 'event' | 'regards' | 'general' | 'custom';

interface RecipientUser {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    headline?: string;
}

const templates: Record<TemplateKey, { title: string; subtitle: string; message: string }> = {
    celebration: {
        title: 'Celebrating a Special Moment',
        subtitle: 'Joyful greetings from MIC Alumni',
        message: 'Wishing everyone a memorable and joyful celebration. May this special moment bring happiness, togetherness, and lasting memories to the entire community.',
    },
    festival: {
        title: 'Happy Festival Wishes',
        subtitle: 'Warm wishes from MIC Alumni',
        message: 'Wishing every student, alumnus, and family a joyful and prosperous festive season. May this celebration bring happiness, success, and togetherness.',
    },
    event: {
        title: 'Upcoming College Event',
        subtitle: 'Join us for the latest campus event',
        message: 'We are pleased to invite our alumni and students to the upcoming event. Mark your calendars and be part of the celebration.',
    },
    regards: {
        title: 'Warm Regards',
        subtitle: 'A message from the college community',
        message: 'Sending our heartfelt regards and best wishes to all members of the MIC family. Thank you for being part of our journey.',
    },
    general: {
        title: 'Official Announcement',
        subtitle: 'Important update from the administration',
        message: 'Please read this official announcement carefully and share it with the relevant community members.',
    },
    custom: {
        title: '',
        subtitle: '',
        message: '',
    },
};

const AnnouncementAdmin = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [items, setItems] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [template, setTemplate] = useState<TemplateKey>('general');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [draft, setDraft] = useState(false);
    const [audienceMode, setAudienceMode] = useState<'all' | 'specific'>('all');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [recipientResults, setRecipientResults] = useState<RecipientUser[]>([]);
    const [selectedRecipients, setSelectedRecipients] = useState<RecipientUser[]>([]);
    const [recipientLoading, setRecipientLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState('');

    const selectedTemplate = useMemo(() => templates[template], [template]);

    const fetchItems = async () => {
        try {
            const res = await api.get('/public/announcements');
            setItems(res.data.announcements || []);
        } catch (err) {
            console.error(err);
            toast.show('Failed to load announcements', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const searchRecipients = async (query: string) => {
        setRecipientSearch(query);

        if (audienceMode !== 'specific') {
            setRecipientResults([]);
            return;
        }

        if (query.trim().length < 2) {
            setRecipientResults([]);
            return;
        }

        setRecipientLoading(true);
        try {
            const res = await api.get('/admin/all-users', {
                params: {
                    status: 'active',
                    q: query.trim(),
                    limit: 30,
                },
            });
            const selectedIds = new Set(selectedRecipients.map(u => u._id));
            const filtered = (res.data.users || [])
                .filter((user: RecipientUser) => !selectedIds.has(user._id))
                .slice(0, 8);
            setRecipientResults(filtered);
        } catch (err) {
            console.error(err);
            setRecipientResults([]);
        } finally {
            setRecipientLoading(false);
        }
    };

    const selectRecipient = (user: RecipientUser) => {
        setSelectedRecipients(prev => prev.some(item => item._id === user._id) ? prev : [...prev, user]);
        setRecipientResults([]);
        setRecipientSearch('');
    };

    const removeRecipient = (id: string) => {
        setSelectedRecipients(prev => prev.filter(user => user._id !== id));
    };

    const applyTemplate = (key: TemplateKey) => {
        setTemplate(key);
        const preset = templates[key];
        setTitle(preset.title);
        setSubtitle(preset.subtitle);
        setMessage(preset.message);
        if (key === 'custom') {
            setLink('');
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setTemplate('general');
        setTitle('');
        setSubtitle('');
        setMessage('');
        setLink('');
        setDraft(false);
        setAudienceMode('all');
        setRecipientSearch('');
        setRecipientResults([]);
        setSelectedRecipients([]);
        setImageFile(null);
        setImageUrl('');
    };

    const uploadImage = async (file: File) => {
        const form = new FormData();
        form.append('image', file);
        const res = await api.post('/upload/announcement-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res.data.relative || res.data.url;
    };

    const handleSubmit = async () => {
        if (!title.trim()) return toast.show('Title is required', 'error');
        if (submitting) return;
        setSubmitting(true);
        try {
            let image = imageUrl || undefined;
            if (imageFile) image = await uploadImage(imageFile);

            const payload: any = {
                title: title.trim(),
                subtitle: subtitle.trim() || undefined,
                template,
                message: message.trim() || undefined,
                link: link.trim() || undefined,
                draft,
                audienceMode,
                recipientIds: audienceMode === 'specific' ? selectedRecipients.map(user => user._id) : [],
            };
            if (image) payload.image = image;

            if (editingId) {
                const res = await api.put(`/public/announcements/${editingId}`, payload);
                setItems(prev => prev.map(item => item._id === editingId ? res.data.item : item));
                toast.show('Announcement updated', 'success');
            } else {
                const res = await api.post('/public/announcements', payload);
                setItems(prev => [res.data.item, ...prev]);
                toast.show('Announcement published', 'success');
            }

            resetForm();
        } catch (err) {
            console.error(err);
            toast.show('Failed to save announcement', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item: AnnouncementItem) => {
        setEditingId(item._id);
        setTemplate((item.template as TemplateKey) || 'custom');
        setTitle(item.title || '');
        setSubtitle(item.subtitle || '');
        setMessage(item.message || '');
        setLink(item.link || '');
        setDraft(Boolean(item.draft));
        setAudienceMode((item.audienceMode as 'all' | 'specific') || 'all');
        setImageUrl(item.image || '');
        setImageFile(null);

        const ids = item.recipientIds || [];
        if ((item.audienceMode === 'specific' || ids.length > 0) && ids.length > 0) {
            void (async () => {
                try {
                    const res = await api.get('/admin/all-users?status=active');
                    const users = (res.data.users || []) as RecipientUser[];
                    setSelectedRecipients(users.filter(u => ids.includes(u._id)));
                } catch (err) {
                    console.error(err);
                    setSelectedRecipients([]);
                }
            })();
        } else {
            setSelectedRecipients([]);
        }
    };

    const handleDelete = async (id: string) => {
        if (deleting) return;
        const ok = await confirm({ title: 'Delete Announcement', message: 'Delete this announcement?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        setDeleting(true);
        try {
            await api.delete(`/public/announcements/${id}`);
            setItems(prev => prev.filter(item => item._id !== id));
            toast.show('Announcement deleted', 'success');
        } catch (err) {
            console.error(err);
            toast.show('Delete failed', 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-6xl mx-auto px-4 space-y-6">
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold mb-3">
                            <Sparkles size={14} /> Announcements Admin
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">Create celebration, festival, event, and regards announcements</h1>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1 max-w-3xl">
                            Build polished announcements that match the site theme, use a preset for faster workflow, or choose custom for a fully branded post. Select a template to auto-apply it.
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Template Picker</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Choose a category-based starting point for the message, CTA, and visual style.</p>
                        </div>
                        <span className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">{template} mode</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        {(['celebration', 'festival', 'event', 'regards', 'general', 'custom'] as TemplateKey[]).map(key => (
                            <button
                                key={key}
                                onClick={() => applyTemplate(key)}
                                className={`px-3 py-3 rounded-xl border text-left transition-all ${template === key ? 'bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)] shadow-sm' : 'bg-[var(--bg-primary)]/60 text-[var(--text-primary)] border-[var(--border-color)]/40 hover:bg-[var(--bg-tertiary)]/70 hover:border-[var(--accent)]/30'}`}
                            >
                                <div className="text-sm font-medium capitalize">{key}</div>
                                <div className={`text-[11px] mt-0.5 ${template === key ? 'text-[var(--bg-primary)]/80' : 'text-[var(--text-muted)]'}`}>
                                    {key === 'celebration' && 'Birthdays and milestones'}
                                    {key === 'festival' && 'Wishes and celebrations'}
                                    {key === 'event' && 'Events and invitations'}
                                    {key === 'regards' && 'Greetings and notes'}
                                    {key === 'general' && 'Formal notices'}
                                    {key === 'custom' && 'Start from scratch'}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {([
                            ['celebration', 'Joyful theme with festive energy', 'from-fuchsia-500/15 via-rose-500/10 to-transparent'],
                            ['festival', 'Warm seasonal tone', 'from-amber-500/15 via-orange-500/10 to-transparent'],
                            ['event', 'Structured event communication', 'from-blue-500/15 via-cyan-500/10 to-transparent'],
                            ['regards', 'Respectful formal tone', 'from-rose-500/15 via-pink-500/10 to-transparent'],
                        ] as const).map(([key, label, gradient]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => applyTemplate(key)}
                                className={`text-left rounded-2xl border p-4 transition-all ${template === key ? 'border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/10' : 'border-[var(--border-color)]/40 hover:border-[var(--accent)]/25'}`}
                            >
                                <div className={`rounded-2xl p-4 bg-gradient-to-br ${gradient}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-[var(--text-primary)] capitalize">{key} template</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">{label}</div>
                                        </div>
                                        <div className="h-10 w-10 rounded-full bg-[var(--bg-primary)]/80 backdrop-blur flex items-center justify-center text-[var(--accent)]">
                                            <Sparkles size={18} />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-[var(--text-secondary)]">
                                        Designed to feel distinct while staying consistent with the portal’s professional visual language.
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-primary)] text-[var(--text-primary)]" placeholder="Announcement title" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Subtitle</label>
                            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-primary)] text-[var(--text-primary)]" placeholder="Short subtitle" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Message</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full p-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-primary)] text-[var(--text-primary)]" placeholder="Write the announcement text" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link</label>
                            <input value={link} onChange={e => setLink(e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-primary)] text-[var(--text-primary)]" placeholder="Optional external link" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Image / Poster</label>
                            <label className="group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-color)]/50 bg-[var(--bg-primary)]/70 px-4 py-5 text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--bg-tertiary)]/40">
                                <input type="file" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0] || null;
                                    setImageFile(file);
                                    if (file) setImageUrl(URL.createObjectURL(file));
                                }} className="hidden" />
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                                    <Upload size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-[var(--text-primary)]">Upload a poster or festival image</div>
                                    <div className="text-xs text-[var(--text-muted)]">PNG, JPG, WebP up to 50MB</div>
                                </div>
                            </label>
                            {(imageFile || imageUrl) && (
                                <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--border-color)]/30 bg-[var(--bg-primary)]">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]/20">
                                        <span className="text-xs font-medium text-[var(--text-muted)]">Image preview</span>
                                        <button
                                            type="button"
                                            onClick={() => { setImageFile(null); setImageUrl(''); }}
                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            <X size={12} /> Clear
                                        </button>
                                    </div>
                                    <CachedImage src={imageUrl || ''} alt="preview" className="w-full h-56 object-cover block" wrapperClassName="w-full h-56 !bg-transparent" compact />
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)]/30 bg-[var(--bg-primary)]/65 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Email recipients</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Choose whether this announcement goes to everyone or only selected people.</p>
                            </div>
                            <div className="inline-flex rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-secondary)]/80 p-1">
                                {(['all', 'specific'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => {
                                            setAudienceMode(mode);
                                            if (mode === 'all') {
                                                setRecipientSearch('');
                                                setRecipientResults([]);
                                            }
                                        }}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${audienceMode === mode ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    >
                                        {mode === 'all' ? 'Send to all' : 'Specific people'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {audienceMode === 'specific' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Search people</label>
                                    <input
                                        value={recipientSearch}
                                        onChange={e => searchRecipients(e.target.value)}
                                        placeholder="Search by name, email, or headline"
                                        className="w-full p-3 rounded-xl border border-[var(--border-color)]/40 bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                                    />
                                </div>

                                {recipientLoading ? (
                                    <div className="text-xs text-[var(--text-muted)]">Searching active users...</div>
                                ) : recipientResults.length > 0 ? (
                                    <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-color)]/30 bg-[var(--bg-secondary)]">
                                        {recipientResults.map(user => (
                                            <button
                                                key={user._id}
                                                type="button"
                                                onClick={() => selectRecipient(user)}
                                                className="w-full flex items-center gap-3 px-3 py-3 text-left border-b border-[var(--border-color)]/20 last:border-b-0 hover:bg-[var(--bg-tertiary)]/60 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--bg-tertiary)]">
                                                    {user.avatar ? <CachedImage src={resolveMediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover block" wrapperClassName="w-full h-full !bg-transparent" compact /> : null}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{user.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)] truncate">{user.email}{user.headline ? ` • ${user.headline}` : ''}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : recipientSearch.trim().length >= 2 ? (
                                    <div className="text-xs text-[var(--text-muted)]">No matching people found.</div>
                                ) : null}

                                {selectedRecipients.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-[var(--text-secondary)]">Selected people</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecipients.map(user => (
                                                <span key={user._id} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)]/40 bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
                                                    <span className="w-5 h-5 rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                                                        {user.avatar ? <CachedImage src={resolveMediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover block" wrapperClassName="w-full h-full !bg-transparent" compact /> : null}
                                                    </span>
                                                    <span className="max-w-[180px] truncate">{user.name}</span>
                                                    <button type="button" onClick={() => removeRecipient(user._id)} className="text-[var(--text-muted)] hover:text-[var(--error)]">
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} /> Save as draft
                    </label>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleSubmit} isLoading={submitting}>{editingId ? 'Update Announcement' : 'Publish Announcement'}</Button>
                        <Button variant="secondary" onClick={resetForm}>Reset</Button>
                        <span className="text-xs text-[var(--text-muted)] self-center">Template: {selectedTemplate.title || 'Custom'}</span>
                    </div>
                </div>

                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <h2 className="font-semibold text-[var(--text-primary)] mb-4">Existing Announcements</h2>
                    {loading ? (
                        <div className="text-[var(--text-muted)]">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="text-[var(--text-muted)]">No announcements yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {items.map(item => (
                                <div key={item._id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 border border-[var(--border-color)]/40 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex-shrink-0">
                                            {item.image ? <CachedImage src={resolveMediaUrl(item.image)} alt={item.title} className="w-full h-full object-cover block" wrapperClassName="w-full h-full !bg-transparent" compact /> : null}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</div>
                                            <div className="text-xs text-[var(--text-muted)] truncate">{item.subtitle || 'No subtitle'} • {item.template || 'general'}{item.draft ? ' • Draft' : ''}</div>
                                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                                                <span className="inline-flex items-center rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[var(--text-secondary)]">
                                                    {item.audienceMode === 'specific' ? `Specific people${item.recipientIds?.length ? ` · ${item.recipientIds.length}` : ''}` : 'All recipients'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}><Edit2 size={14} /> Edit</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item._id)}><Trash2 size={14} /> Delete</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnnouncementAdmin;