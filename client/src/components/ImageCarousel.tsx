import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
    type: 'image' | 'video';
    url: string;
}

interface ImageCarouselProps {
    media: MediaItem[];
    normalizeMediaUrl: (url: string) => string;
}

export default function ImageCarousel({ media, normalizeMediaUrl }: ImageCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchDelta, setTouchDelta] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const total = media.length;

    const goTo = useCallback((idx: number) => {
        setCurrent(Math.max(0, Math.min(idx, total - 1)));
    }, [total]);

    const prev = () => goTo(current - 1);
    const next = () => goTo(current + 1);

    // Touch/swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        setTouchDelta(e.touches[0].clientX - touchStart);
    };

    const handleTouchEnd = () => {
        if (touchStart === null) return;
        if (Math.abs(touchDelta) > 50) {
            if (touchDelta < 0 && current < total - 1) next();
            else if (touchDelta > 0 && current > 0) prev();
        }
        setTouchStart(null);
        setTouchDelta(0);
        setIsDragging(false);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        const el = containerRef.current;
        el?.addEventListener('keydown', handleKey);
        return () => el?.removeEventListener('keydown', handleKey);
    });

    // Single item — no carousel needed
    if (total <= 1) {
        const m = media[0];
        return m.type === 'image' ? (
            <img src={normalizeMediaUrl(m.url)} alt="" className="w-full max-h-[480px] object-cover bg-[var(--bg-tertiary)]" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
            <video src={normalizeMediaUrl(m.url)} controls className="w-full max-h-[480px]" onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden bg-black select-none"
            tabIndex={0}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Slide track */}
            <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                    transform: `translateX(calc(-${current * 100}% + ${isDragging ? touchDelta : 0}px))`,
                    transition: isDragging ? 'none' : undefined,
                }}
            >
                {media.map((m, idx) => (
                    <div key={idx} className="w-full flex-shrink-0">
                        {m.type === 'image' ? (
                            <img
                                src={normalizeMediaUrl(m.url)}
                                alt=""
                                className="w-full max-h-[480px] object-cover bg-[var(--bg-tertiary)]"
                                loading="lazy"
                                draggable={false}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <video
                                src={normalizeMediaUrl(m.url)}
                                controls
                                className="w-full max-h-[480px]"
                                onError={e => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Left arrow */}
            {current > 0 && (
                <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                    style={{ opacity: 0.7 }}
                    aria-label="Previous"
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            {/* Right arrow */}
            {current < total - 1 && (
                <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                    style={{ opacity: 0.7 }}
                    aria-label="Next"
                >
                    <ChevronRight size={20} />
                </button>
            )}

            {/* Counter badge (top-right like Instagram) */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                {current + 1}/{total}
            </div>

            {/* Dots indicator (bottom center like Instagram) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {media.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => goTo(idx)}
                        className={`rounded-full transition-all duration-200 ${
                            idx === current
                                ? 'w-2 h-2 bg-white'
                                : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/70'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
