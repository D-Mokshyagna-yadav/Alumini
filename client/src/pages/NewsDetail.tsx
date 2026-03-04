import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import DOMPurify from 'dompurify';
// using central `api` instance

const NewsDetail = () => {
    const { id } = useParams();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch();
    }, [id]);

    const fetch = async () => {
        try {
            const res = await api.get(`/public/news/${id}`);
            setItem(res.data.item);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
            </div>
            <p className="text-[var(--text-muted)] text-sm">Loading article...</p>
        </div>
    );
    if (!item) return <div className="p-6">News not found</div>;

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-3">{item.title}</h1>
            <p className="text-xs text-[var(--text-muted)] mb-4">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}</p>
            {item.image && (
                <img src={item.image} alt="" className="w-full max-h-96 object-cover mb-4" />
            )}
            <div className="prose prose-sm text-[var(--text-primary)]">
                {item.body ? (
                    // if body is Editor.js JSON, convert to HTML
                    (() => {
                        try {
                            const parsed = JSON.parse(item.body);
                            if (parsed && Array.isArray(parsed.blocks)) {
                                const html = parsed.blocks.map((b: any) => {
                                    if (b.type === 'header') return `<h${b.data.level||2}>${b.data.text}</h${b.data.level||2}>`;
                                    if (b.type === 'paragraph') return `<p>${b.data.text}</p>`;
                                    if (b.type === 'list') {
                                        const tag = b.data.style === 'ordered' ? 'ol' : 'ul';
                                        const items = (b.data.items || []).map((it: string) => `<li>${it}</li>`).join('');
                                        return `<${tag}>${items}</${tag}>`;
                                    }
                                    if (b.type === 'image') return `<figure><img src="${b.data.file?.url || b.data.url}" alt="${b.data.caption||''}" /><figcaption>${b.data.caption||''}</figcaption></figure>`;
                                    return '';
                                }).join('');
                                return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
                            }
                        } catch (e) {
                            // not JSON
                        }
                        return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.body) }} />;
                    })()
                ) : (
                    <p>{item.time || ''}</p>
                )}
                <p className="text-sm text-[var(--text-muted)] mt-4">Readers: {item.readers || 0}</p>
            </div>
        </div>
    );
};

export default NewsDetail;
