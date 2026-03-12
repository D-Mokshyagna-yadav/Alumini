// import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

import './Hero.css';

const Hero = ({ data }: { data?: any }) => {
    const heading = data?.heading;
    const subtitle = data?.subtitle;
    const badge = data?.badge;
    const companyList: string[] = Array.isArray(data?.companies) && data.companies.length > 0
        ? data.companies
        : ['Microsoft','Google','Amazon','TCS','Infosys','Wipro','Capgemini','Cognizant','Accenture','HCL Tech','Oracle','IBM'];

    return (
        <div className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-primary)] hero-bg">
            <div className="hero-overlay" />
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
            <div className="hero-content relative z-10 w-full pt-20 sm:pt-24 md:pt-28 pb-16 sm:pb-20">
                <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--border-color)] rounded-full mb-8 sm:mb-10 shadow-sm">
                        <Sparkles size={14} className="text-[var(--accent)]" />
                        <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                            {badge || '🎓 Celebrating Excellence Since 2002'}
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1
                        className="hero-title text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-tight mb-6 sm:mb-8"
                    >
                        <span className="block">{heading?.line1 || 'Where Alumni'}</span>
                        <span className="hero-connect text-gradient inline-block mt-1 sm:mt-2">{heading?.line2 || 'Connect & Thrive'}</span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="hero-subtitle text-base sm:text-lg md:text-xl mb-10 sm:mb-12 max-w-sm sm:max-w-xl md:max-w-2xl mx-auto leading-relaxed"
                    >
                        {subtitle || 'Join a thriving community. Build meaningful connections, discover career opportunities, and give back to your alma mater.'}
                    </p>

                    {/* CTA Buttons */}
                    <div
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
                    </div>
                </div>

                {/* Companies Marquee */}
                <div
                    className="w-full mt-20 sm:mt-24 pt-10 border-t border-[var(--accent)]/10"
                >
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-8 sm:mb-10 text-center">
                        Our Alumni Work At
                    </p>

                    <div className="industry-scroll industry-marquee">
                    {[...companyList, ...companyList].map((company, idx) => (
                        <span
                        key={company + idx}
                        className="mx-8 whitespace-nowrap hover:text-[var(--accent)] transition-colors duration-200 cursor-default"
                        >
                        {company}
                        </span>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hero;