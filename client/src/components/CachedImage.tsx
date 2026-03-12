import { useState, useRef, useEffect, memo } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { ImageIcon } from 'lucide-react';
import resolveMediaUrl from '../lib/media';

/**
 * In-memory cache that tracks which image URLs have been successfully loaded
 * during this session. Once a URL is in the set, CachedImage skips the
 * skeleton and renders the image immediately with no flicker.
 */
const loadedCache = new Set<string>();

interface CachedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
    /** raw image path — automatically resolved through resolveMediaUrl */
    src: string;
    alt?: string;
    /** additional classes on the <img> itself */
    className?: string;
    /** classes on the outer wrapper div (controls sizing) */
    wrapperClassName?: string;
    /** show a compact skeleton (no icon/text) for thumbnails */
    compact?: boolean;
    /** eager load above-the-fold images */
    priority?: boolean;
    /** fallback element when image fails to load */
    fallback?: React.ReactNode;
}

/**
 * Universal cached image component with:
 * - In-memory load cache (instant re-render on revisit)
 * - Shimmer skeleton while loading
 * - Fade-in transition on first load
 * - Error fallback (customisable)
 * - Lazy loading by default
 * - resolveMediaUrl built-in
 */
const CachedImage = memo(function CachedImage({
    src,
    alt = '',
    className = '',
    wrapperClassName = '',
    compact = false,
    priority = false,
    fallback,
    ...imgProps
}: CachedImageProps) {
    const resolved = resolveMediaUrl(src);
    const alreadyCached = loadedCache.has(resolved);

    const [loaded, setLoaded] = useState(alreadyCached);
    const [errored, setErrored] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // If the browser already has the image cached (back/forward cache, etc.)
    useEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            loadedCache.add(resolved);
            setLoaded(true);
        }
    }, [resolved]);

    // Reset state when src changes
    useEffect(() => {
        const cached = loadedCache.has(resolved);
        setLoaded(cached);
        setErrored(false);
    }, [resolved]);

    if (errored) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className={`bg-[var(--bg-tertiary)] flex items-center justify-center ${wrapperClassName}`}>
                <ImageIcon size={compact ? 16 : 24} className="text-[var(--text-muted)]/30" />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-[var(--bg-tertiary)] ${wrapperClassName}`}>
            {/* Skeleton shimmer while loading */}
            {!loaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden z-[1]">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--bg-secondary)]/40 to-transparent animate-[shimmer_1.5s_infinite]"
                    />
                    {!compact && (
                        <ImageIcon size={24} className="text-[var(--text-muted)]/30 relative z-[2]" />
                    )}
                </div>
            )}

            <img
                ref={imgRef}
                src={resolved}
                alt={alt}
                className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority ? 'high' : 'low'}
                onLoad={() => {
                    loadedCache.add(resolved);
                    setLoaded(true);
                }}
                onError={() => setErrored(true)}
                {...imgProps}
            />
        </div>
    );
});

export default CachedImage;
