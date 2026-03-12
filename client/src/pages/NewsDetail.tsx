import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import CachedImage from '../components/CachedImage';
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="h-7 w-3/4 rounded bg-[var(--bg-tertiary)] animate-pulse mb-3" />
            <div className="h-3 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse mb-4" />
            <div className="relative w-full h-64 sm:h-96 rounded-lg bg-[var(--bg-tertiary)] overflow-hidden mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-secondary)]/40 to-transparent animate-[shimmer_1.5s_infinite]" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-3 rounded bg-[var(--bg-tertiary)] animate-pulse ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
                ))}
            </div>
        </div>
    );
    if (!item) return <div className="p-6">News not found</div>;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <h1 className="text-2xl font-semibold mb-3">{item.title}</h1>
            <p className="text-xs text-[var(--text-muted)] mb-4">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : new Date(item.createdAt).toLocaleString()}</p>
            {item.image && (
                <CachedImage src={item.image} alt="" className="w-full max-h-96 object-cover" wrapperClassName="w-full rounded-lg mb-4" priority />
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
                                    if (b.type === 'image') {
                                        const imgUrl = resolveMediaUrl(b.data.file?.url || b.data.url);
                                        return `<figure><img src="${imgUrl}" alt="${b.data.caption||''}" /><figcaption>${b.data.caption||''}</figcaption></figure>`;
                                    }
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
