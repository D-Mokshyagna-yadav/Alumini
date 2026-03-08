import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const Hero = ({ data }: { data?: any }) => {
    const heading = data?.heading;
    const subtitle = data?.subtitle;
    const badge = data?.badge;

    return (
        <div className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
            {/* Samsung-style beam drop + impact on load */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                <div className="beam-drop">
                    <div className="beam-tip" />
                    <div className="beam-particles" />
                </div>
                <div className="beam-impact">
                    <div className="beam-impact-flash" />
                    <div className="beam-ripple" />
                    <div className="beam-ripple" />
                    <div className="beam-ripple" />
                    <div className="beam-ripple" />
                    <div className="beam-streak" />
                </div>
            </div>

            {/* Samsung-style spotlight sweep (loops after drop) */}
            <div className="spotlight" />

            {/* Ambient gradient backdrop */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--gradient-start)]/[0.05] via-transparent to-[var(--gradient-end)]/[0.03]" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[var(--accent)]/[0.04] rounded-full blur-[180px] spotlight-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[var(--gradient-end)]/[0.03] rounded-full blur-[140px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full pt-20 sm:pt-24 md:pt-28 pb-16 sm:pb-20">
                <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16 text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-full mb-8 sm:mb-10 shadow-sm"
                    >
                        <Sparkles size={14} className="text-[var(--accent)]" />
                        <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                            {badge || '🎓 Celebrating Excellence Since 2002'}
                        </span>
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-tight mb-6 sm:mb-8"
                    >
                        <span className="text-[var(--text-primary)] block">{heading?.line1 || 'Where Alumni'}</span>
                        <span className="text-gradient inline-block mt-1 sm:mt-2">{heading?.line2 || 'Connect & Thrive'}</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] mb-10 sm:mb-12 max-w-sm sm:max-w-xl md:max-w-2xl mx-auto leading-relaxed"
                    >
                        {subtitle || 'Join a thriving community. Build meaningful connections, discover career opportunities, and give back to your alma mater.'}
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
                    >
                        <Link to="/register" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 bg-[var(--accent)] text-[var(--bg-primary)] text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 hover:bg-[var(--accent-hover)] transition-all duration-200">
                                Join the Network
                                <ArrowRight size={18} />
                            </button>
                        </Link>
                        <Link to="/directory" className="w-full sm:w-auto">
                            <button className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-[var(--text-primary)] bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-sm hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200">
                                Explore Alumni
                            </button>
                        </Link>
                    </motion.div>
                </div>

                {/* Companies Marquee */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full mt-20 sm:mt-24 pt-10 border-t border-[var(--accent)]/10 overflow-hidden"
                >
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-8 sm:mb-10 text-center">
                        Our Alumni Work At
                    </p>

                    <div className="relative flex overflow-hidden mask-gradient-x">
                        <motion.div
                            className="flex gap-10 sm:gap-14 md:gap-20 items-center whitespace-nowrap"
                            animate={{ x: [0, -1000] }}
                            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
                        >
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-10 sm:gap-14 md:gap-20 items-center">
                                    {['Microsoft', 'Google', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Capgemini', 'Cognizant', 'Accenture', 'HCL Tech', 'Oracle', 'IBM'].map((company) => (
                                        <span
                                            key={`${i}-${company}`}
                                            className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-muted)]/50 hover:text-[var(--accent)] transition-colors duration-200 cursor-default"
                                        >
                                            {company}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Hero;
