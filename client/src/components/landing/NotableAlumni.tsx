import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import resolveMediaUrl from '../../lib/media';
import CachedImage from '../CachedImage';
import api from '../../lib/api';

const NotableAlumni = () => {
    const [list, setList] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let mounted = true;
        api.get('/public/notable-alumni')
            .then(res => { if (mounted) setList(res.data.alumni || []); })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    // Auto-scroll when more than 4 cards
    const shouldScroll = list.length > 4;

    useEffect(() => {
        if (!shouldScroll || !scrollRef.current) return;
        const el = scrollRef.current;
        let raf: number;
        let speed = 0.5; // px per frame

        const step = () => {
            el.scrollLeft += speed;
            // Loop back when reaching end
            if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
                el.scrollLeft = 0;
            }
            raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);

        const pause = () => cancelAnimationFrame(raf);
        const resume = () => { raf = requestAnimationFrame(step); };

        el.addEventListener('mouseenter', pause);
        el.addEventListener('mouseleave', resume);
        el.addEventListener('touchstart', pause);
        el.addEventListener('touchend', resume);

        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('mouseenter', pause);
            el.removeEventListener('mouseleave', resume);
            el.removeEventListener('touchstart', pause);
            el.removeEventListener('touchend', resume);
        };
    }, [shouldScroll, list]);

    if (list.length === 0) return null;

    const handleClick = (alum: any) => {
        if (alum.profileId) {
            navigate(`/profile/${alum.profileId}`);
        }
    };

    return (
        <section className="py-12 sm:py-20 lg:py-28 bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-8 sm:mb-12 lg:mb-16"
                >
                    <span className="inline-block px-3 sm:px-4 py-1 sm:py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] text-xs sm:text-sm font-semibold rounded-full mb-3 sm:mb-4">
                        Our Pride
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-3 sm:mb-4">Notable Alumni</h2>
                    <div className="w-12 sm:w-16 h-1 bg-[var(--accent)] mx-auto rounded-full"></div>
                    <p className="mt-4 sm:mt-6 text-xs sm:text-sm lg:text-base text-[var(--text-secondary)] max-w-2xl mx-auto px-2">
                        Our graduates have gone on to lead global corporations, drive scientific innovation, and shape national policy.
                    </p>
                </motion.div>

                {shouldScroll ? (
                    <div
                        ref={scrollRef}
                        className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
                        style={{ scrollBehavior: 'auto' }}
                    >
                        {list.map((alum: any, index: number) => (
                            <motion.div
                                key={alum._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                                onClick={() => handleClick(alum)}
                                className={`group flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px] bg-[var(--card-bg)] backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-[var(--border-color)] hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 ${alum.profileId ? 'cursor-pointer' : ''}`}
                            >
                                <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                                    <CachedImage
                                        src={alum.image}
                                        alt={alum.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        wrapperClassName="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-5">
                                        <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 line-clamp-1">{alum.name}</h3>
                                        <p className="text-white/75 text-xs sm:text-sm line-clamp-1">{alum.role}</p>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[var(--accent)]/10 rounded-full text-xs sm:text-sm font-semibold text-[var(--accent)]">
                                        Class of {alum.batch}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {list.map((alum: any, index: number) => (
                            <motion.div
                                key={alum._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                                onClick={() => handleClick(alum)}
                                className={`group bg-[var(--card-bg)] backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-[var(--border-color)] hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 ${alum.profileId ? 'cursor-pointer' : ''}`}
                            >
                                <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
                                    <CachedImage
                                        src={alum.image}
                                        alt={alum.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        wrapperClassName="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-5">
                                        <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 line-clamp-1">{alum.name}</h3>
                                        <p className="text-white/75 text-xs sm:text-sm line-clamp-1">{alum.role}</p>
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4 text-center">
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[var(--accent)]/10 rounded-full text-xs sm:text-sm font-semibold text-[var(--accent)]">
                                        Class of {alum.batch}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default NotableAlumni;
