import { useEffect, useState } from 'react';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

// using central `api` instance

const NewsList = () => {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { on: onSocket } = useSocket();

    const fetchNews = async () => {
        try {
            const res = await api.get('/public/news');
            setItems(res.data.news || []);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchNews();
        // Listen for DOM events (same-tab admin updates)
        const onNews = () => fetchNews();
        window.addEventListener('news:updated', onNews as EventListener);
        return () => window.removeEventListener('news:updated', onNews as EventListener);
    }, []);

    // Listen for socket.io events (cross-tab/cross-user real-time updates)
    useEffect(() => {
        const unsubs: (() => void)[] = [];
        unsubs.push(onSocket('news_updated', () => { fetchNews(); }));
        unsubs.push(onSocket('news_deleted', () => { fetchNews(); }));
        return () => unsubs.forEach(fn => fn());
    }, [onSocket]);

    const stripHtml = (htmlOrJson: string) => {
        if (!htmlOrJson) return '';
        // if Editor.js JSON
        try {
            const parsed = JSON.parse(htmlOrJson);
            if (parsed && Array.isArray(parsed.blocks)) {
                return parsed.blocks.map((b: any) => {
                    if (b.type === 'paragraph' || b.type === 'header') return b.data.text || '';
                    if (b.type === 'list') return (b.data.items || []).join(' ');
                    if (b.type === 'image') return b.data.caption || '';
                    return '';
                }).join(' ').trim();
            }
        } catch (e) {
            // not JSON, fall back to HTML strip
        }
        try {
            const div = document.createElement('div');
            div.innerHTML = htmlOrJson;
            return (div.textContent || div.innerText || '').trim();
        } catch (e) { return htmlOrJson; }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
            </div>
            <p className="text-[var(--text-muted)] text-sm">Loading news...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl font-semibold mb-4">MIC College of Technology — News</h1>
            <div className="space-y-4">
                {items.map(it => (
                    <div key={it._id} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm p-3 sm:p-4 border border-[var(--border-color)]/30 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            {it.image ? <img src={resolveMediaUrl(it.image)} alt="" className="w-full sm:w-28 h-40 sm:h-20 object-cover rounded-lg" /> : <div className="hidden sm:block w-28 h-20 bg-[var(--bg-tertiary)] rounded-lg" />}
                            <div className="min-w-0">
                                <Link to={`/news/${it._id}`} className="text-base sm:text-lg font-medium text-[var(--text-primary)] hover:underline line-clamp-2">{it.title}</Link>
                                <p className="text-xs text-[var(--text-muted)]">{it.publishedAt ? new Date(it.publishedAt).toLocaleString() : new Date(it.createdAt).toLocaleString()} • {it.readers || 0} readers</p>
                                <p className="mt-1 sm:mt-2 text-sm text-[var(--text-secondary)] line-clamp-3">{(stripHtml(it.body || it.time || '')).slice(0, 150)}{(stripHtml(it.body || it.time || '')).length > 150 ? '...' : ''}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NewsList;
