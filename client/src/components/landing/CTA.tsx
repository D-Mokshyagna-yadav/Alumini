import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Users, Star, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTA = ({ data }: { data?: Record<string, string> }) => {
    const heading = data?.heading || 'Ready to Reconnect?';
    const sub = data?.sub || 'Join 25,000+ alumni in a network of opportunities and lifelong friendships.';

    return (
        <section className="relative overflow-hidden">
            <div>
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                >
                    {/* Glass Background — frosted blur */}
                    <div className="absolute inset-0 bg-[var(--bg-secondary)]/50 backdrop-blur-2xl" />

                    <div className="relative z-10 px-6 sm:px-12 lg:px-16 py-16 sm:py-24 text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--accent)]/10 backdrop-blur-xl border border-[var(--accent)]/15 rounded-full mb-8">
                            <Sparkles size={13} className="text-[var(--accent)]" />
                            <span className="text-xs font-medium text-[var(--accent)] tracking-wide">Join Our Growing Community</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 leading-tight">
                            {heading}
                        </h2>

                        <p className="text-sm sm:text-base text-[var(--text-muted)] mb-10 max-w-lg mx-auto leading-relaxed">
                            {sub}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap justify-center gap-5 sm:gap-8 mb-10">
                            {[
                                { icon: Users, value: '25K+', label: 'Alumni' },
                                { icon: Star, value: '4.9', label: 'Rating' },
                                { icon: Calendar, value: '100+', label: 'Events/Year' },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
                                        <stat.icon size={16} className="text-[var(--accent)]" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <Link to="/register">
                                <button className="group bg-[var(--accent)] text-[var(--bg-primary)] px-7 py-3 font-bold text-sm rounded-full shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 transition-all flex items-center gap-2">
                                    Join the Community
                                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </Link>
                            <Link to="/about">
                                <button className="px-7 py-3 font-semibold text-sm text-[var(--text-secondary)] border border-[var(--border-color)]/40 rounded-full hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all">
                                    Learn More
                                </button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CTA;