import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import resolveMediaUrl from '../../lib/media';
import CachedImage from '../../components/CachedImage';
import DOMPurify from 'dompurify';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import ImageTool from '@editorjs/image';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Button } from '../../components/ui/Button';

// using central `api` instance

interface NewsItem {
    _id: string;
    title: string;
    link?: string;
    readers?: number;
    time?: string;
    image?: string;
    publishedAt?: string;
    priority?: number;
    createdAt: string;
    body?: string;
}

const NewsAdmin = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [readers, setReaders] = useState('');
    const [body, setBody] = useState('');
    const [publishedAt, setPublishedAt] = useState('');
    const [priority, setPriority] = useState('0');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            const res = await api.get('/public/news');
            setItems(res.data.news || []);
        } catch (err) {
            console.error(err);
            toast.show('Failed to load news', 'error');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle(''); setLink(''); setReaders(''); setPublishedAt(''); setPriority('0'); setImageFile(null); setEditingId(null);
        setBody('');
        setDraft(false);
    };

    const editorRef = useRef<EditorJS | null>(null);
    const holderRef = useRef<HTMLDivElement | null>(null);
    // helper to upload a file to server for news images (admin only). Field name 'image'.
    const uploadFileToServer = async (file: File) => {
        try {
            const form = new FormData();
            form.append('image', file);
            const res = await api.post('/upload/news-image', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data.relative || res.data.url;
        } catch (err) {
            console.error('Upload failed', err);
            throw err;
        }
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!title.trim()) return toast.show('Title is required', 'error');
        setSubmitting(true);
        try {
            let imageRel: string | undefined;
            if (imageFile) {
                imageRel = await uploadFileToServer(imageFile);
            }

            // get editor content if EditorJS is initialized
            let content = body;
            try {
                if (editorRef.current) {
                    const saved = await editorRef.current.save();
                    content = JSON.stringify(saved);
                }
            } catch (e) {
                console.error('Failed to get editor content', e);
            }

            const payload: any = { title: title.trim(), link: link.trim() || undefined, publishedAt: publishedAt || undefined, priority: parseInt(priority) || 0, body: content || undefined, draft: Boolean(draft) };
            if (imageRel) payload.image = imageRel;

            if (editingId) {
                const res = await api.put(`/public/news/${editingId}`, payload);
                setItems(prev => prev.map(i => i._id === editingId ? res.data.item : i));
                toast.show('News updated', 'success');
                // notify other parts of the app
                try { window.dispatchEvent(new CustomEvent('news:updated', { detail: res.data.item })); } catch (e) { }
            } else {
                const res = await api.post('/public/news', payload);
                setItems(prev => [res.data.item, ...prev]);
                toast.show('News created', 'success');
                try { window.dispatchEvent(new CustomEvent('news:updated', { detail: res.data.item })); } catch (e) { }
            }

            resetForm();
        } catch (err) {
            console.error(err);
            toast.show('Failed to save news', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (item: NewsItem) => {
        setEditingId(item._id);
        setTitle(item.title || '');
        setLink(item.link || '');
        setReaders(item.readers?.toString() || '');
        setPublishedAt(item.publishedAt ? item.publishedAt.slice(0,16) : '');
        setBody(item.body || '');
        setPriority((item.priority || 0).toString());
        setDraft((item as any).draft || false);
        // initialize editor data later via effect
    };

    // initialize Editor.js instance – robust against React StrictMode double-mount
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            // Destroy previous instance first
            if (editorRef.current) {
                try {
                    await editorRef.current.isReady;
                    editorRef.current.destroy();
                } catch { /* ignore */ }
                editorRef.current = null;
            }

            if (cancelled || !holderRef.current) return;
            // Clear leftover DOM from previous EditorJS instance
            holderRef.current.innerHTML = '';

            try {
                const editor = new EditorJS({
                    holder: holderRef.current,
                    placeholder: 'Write your article here...',
                    autofocus: false,
                    data: body && body.trim().startsWith('{') ? JSON.parse(body) : undefined,
                    tools: {
                        header: Header,
                        list: List,
                        image: {
                            class: ImageTool,
                            config: {
                                uploader: {
                                    async uploadByFile(file: File) {
                                        const url = await uploadFileToServer(file);
                                        return { success: 1, file: { url } };
                                    }
                                }
                            }
                        }
                    }
                });

                await editor.isReady;
                if (cancelled) {
                    editor.destroy();
                    return;
                }
                editorRef.current = editor;
            } catch (e) {
                console.error('EditorJS init failed', e);
            }
        };

        // Small delay to ensure DOM is painted before EditorJS attaches
        const timer = setTimeout(init, 50);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // re-init when editingId or body changes
    }, [editingId, body]);

    const handleDelete = async (id: string) => {
        if (deleting) return;
        const ok = await confirm({ title: 'Delete News', message: 'Delete this news item?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        setDeleting(true);
        try {
            await api.delete(`/public/news/${id}`);
            setItems(prev => prev.filter(i => i._id !== id));
            toast.show('Deleted', 'success');
            try { window.dispatchEvent(new CustomEvent('news:updated', { detail: { _id: id, deleted: true } })); } catch (e) { }
        } catch (err) {
            console.error(err);
            toast.show('Delete failed', 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Admin — Manage News</h1>

                <div className="bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] rounded-2xl mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Title</label>
                            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter headline" className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link (optional)</label>
                            <input value={link} onChange={e => setLink(e.target.value)} placeholder="Optional external URL" className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                        </div>

                        {editingId ? (
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Readers (auto)</label>
                                <input value={readers} readOnly placeholder="Readers (auto)" className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] w-full" />
                            </div>
                        ) : null}

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Publish date</label>
                            <input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                            <input value={priority} onChange={e => setPriority(e.target.value)} placeholder="Higher numbers show first" className="p-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Image (optional)</label>
                            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} />
                            {imageFile && (
                                <img src={URL.createObjectURL(imageFile)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                            )}
                        </div>
                    </div>
                                <div className="mt-3">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Body</label>
                                        <div ref={holderRef} className="w-full border border-[var(--border-color)] rounded-xl p-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] min-h-64" style={{ minHeight: 300 }} />
                                    </div>
                                    <div className="flex items-center gap-4 mt-3">
                                        <label className="inline-flex items-center gap-2">
                                            <input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} />
                                            <span className="text-sm">Save as draft</span>
                                        </label>
                                        <Button onClick={() => setShowPreview(true)} variant="secondary">Preview</Button>
                                    </div>
                                <div className="flex gap-2 mt-3">
                                    <Button onClick={handleSubmit} className="bg-[var(--accent)] text-[var(--bg-primary)]">{editingId ? 'Update' : 'Create'}</Button>
                                    <Button variant="secondary" onClick={resetForm}>Reset</Button>
                                </div>

                                {showPreview && (
                                    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-6 z-50">
                                        <div className="bg-[var(--bg-secondary)] w-full max-w-3xl shadow-sm p-6 overflow-auto max-h-[90vh]">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-semibold">Preview — {title || 'Untitled'}</h3>
                                                <div className="flex gap-2">
                                                    <Button variant="secondary" onClick={() => setShowPreview(false)}>Close</Button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)] mb-2">{publishedAt ? new Date(publishedAt).toLocaleString() : 'Not published yet'} {draft ? ' • Draft' : ''}</div>
                                            {imageFile && (
                                                <div className="mb-3">
                                                    <img src={URL.createObjectURL(imageFile)} alt="preview" className="w-full object-cover" />
                                                </div>
                                            )}
                                            <div className="prose">
                                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body || '') }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                </div>

                <div className="bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] rounded-2xl">
                    <h2 className="font-semibold text-[var(--text-primary)] mb-3">Existing News</h2>
                    {loading ? (
                        <div className="space-y-3 py-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-[var(--border-color)] rounded-xl">
                                    <div className="w-16 h-12 rounded bg-[var(--bg-tertiary)] overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-secondary)]/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3.5 w-40 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                        <div className="h-2.5 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    </div>
                                    <div className="h-8 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        items.length === 0 ? <div className="text-[var(--text-muted)]">No news yet.</div> : (
                            <div className="space-y-3">
                                {items.map(item => (
                                    <div key={item._id} className="flex items-center justify-between p-3 border border-[var(--border-color)] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            {item.image ? <CachedImage src={item.image} alt="" className="w-16 h-12 object-cover" wrapperClassName="w-16 h-12" compact /> : <div className="w-16 h-12 bg-[var(--bg-tertiary)]" />}
                                            <div>
                                                <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
                                                <div className="text-xs text-[var(--text-muted)]">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : new Date(item.createdAt).toLocaleString()} • Priority: {item.priority || 0}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" onClick={() => handleEdit(item)}>Edit</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(item._id)}>Delete</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsAdmin;
