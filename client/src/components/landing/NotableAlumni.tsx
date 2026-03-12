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
        <section className="py-20 sm:py-28 bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-semibold rounded-full mb-4">
                        Our Pride
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Notable Alumni</h2>
                    <div className="w-16 h-1 bg-[var(--accent)] mx-auto rounded-full"></div>
                    <p className="mt-6 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Our graduates have gone on to lead global corporations, drive scientific innovation, and shape national policy.
                    </p>
                </motion.div>

                {shouldScroll ? (
                    <div
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
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
                                className={`group flex-shrink-0 w-[280px] bg-[var(--card-bg)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm border border-[var(--border-color)] hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 ${alum.profileId ? 'cursor-pointer' : ''}`}
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <CachedImage
                                        src={alum.image}
                                        alt={alum.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        wrapperClassName="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <h3 className="text-lg font-bold text-white mb-0.5">{alum.name}</h3>
                                        <p className="text-white/75 text-sm">{alum.role}</p>
                                    </div>
                                </div>
                                <div className="p-4 text-center">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 rounded-full text-sm font-semibold text-[var(--accent)]">
                                        Class of {alum.batch}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {list.map((alum: any, index: number) => (
                            <motion.div
                                key={alum._id || index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                                onClick={() => handleClick(alum)}
                                className={`group bg-[var(--card-bg)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm border border-[var(--border-color)] hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 ${alum.profileId ? 'cursor-pointer' : ''}`}
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <CachedImage
                                        src={alum.image}
                                        alt={alum.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        wrapperClassName="w-full h-full"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <h3 className="text-lg font-bold text-white mb-0.5">{alum.name}</h3>
                                        <p className="text-white/75 text-sm">{alum.role}</p>
                                    </div>
                                </div>
                                <div className="p-4 text-center">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 rounded-full text-sm font-semibold text-[var(--accent)]">
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
