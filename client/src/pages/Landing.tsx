import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Award, BookOpen, Target, Heart, Globe, Building2, CheckCircle, GraduationCap } from 'lucide-react';
import api from '../lib/api';
import Hero from '../components/landing/Hero';
import StatsBar from '../components/landing/StatsBar';
import NotableAlumni from '../components/landing/NotableAlumni';
import Timeline from '../components/landing/Timeline';
import Leaders from '../components/landing/Leaders';
import CTA from '../components/landing/CTA';

interface HomePayload {
    hero?: any;
    companies?: any[];
    stats?: any[];
    leaders?: any[];
    timeline?: any[];
    notable?: any[];
    cta?: any;
}

const values = [
    { icon: Users, title: 'Inclusivity', description: 'Fostering a diverse community where every voice matters.' },
    { icon: Award, title: 'Excellence', description: 'Pursuing the highest standards in education and research.' },
    { icon: Heart, title: 'Service', description: 'Dedicated to serving our region and the nation.' },
    { icon: Globe, title: 'Global Outlook', description: 'Preparing students for international challenges.' },
];

const Landing = () => {
    const [home, setHome] = useState<HomePayload | null>(null);
    const [governing, setGoverning] = useState<{ name: string; designation: string }[]>([]);
    const [officials, setOfficials] = useState<{ name: string; designation: string }[]>([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const [homeRes, adminRes] = await Promise.all([
                    api.get('/public/home'),
                    api.get('/public/administration').catch(() => ({ data: { governing: [], officials: [] } })),
                ]);
                if (!mounted) return;
                setHome(homeRes.data.home || null);
                setGoverning(adminRes.data.governing || []);
                setOfficials(adminRes.data.officials || []);
            } catch (err) {
                console.error('Failed to load home content', err);
            }
        };
        load();
        return () => { mounted = false };
    }, []);

    return (
        <div className="min-h-screen">
            <Hero data={{ ...home?.hero, companies: home?.companies }} />
            <StatsBar stats={home?.stats} />

            {/* Gradient divider */}
            <div className="gradient-divider" />

            {/* About — Legacy Introduction */}
            <section className="py-20 bg-[var(--bg-secondary)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--gradient-start)]/[0.04] via-transparent to-[var(--gradient-end)]/[0.03] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[var(--text-primary)] mb-6">
                                A Legacy of Excellence
                            </h2>
                            <div className="w-20 h-1.5 bg-[var(--accent)] rounded-full mb-8" />
                            <p className="text-lg text-[var(--text-secondary)] mb-6 leading-relaxed text-justify">
                                DVR &amp; Dr. HS MIC College of Technology was established in 2002 by the Devineni Ramana &amp; Praneetha Memorial Trust.
                                Located in Kanchikacherla, Andhra Pradesh, the institution has metamorphosed into a premier autonomous hub for technical education.
                            </p>
                            <p className="text-lg text-[var(--text-secondary)] leading-relaxed text-justify">
                                Our journey from a modest beginning with three branches to a multidisciplinary institution offering B.Tech, M.Tech, MBA, and MCA programs
                                is a testament to our unwavering commitment to quality. With Autonomous Status granted by UGC in 2018 and a recently awarded NAAC "A+" Grade,
                                we stand tall as a beacon of knowledge and innovation.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className="p-6 bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl">
                                <Award className="w-10 h-10 text-[var(--accent)] mb-4" />
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">NAAC A+</h3>
                                <p className="text-[var(--text-secondary)]">Accredited with 3.4 CGPA</p>
                            </div>
                            <div className="p-6 bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl">
                                <Building2 className="w-10 h-10 text-[var(--accent)] mb-4" />
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Autonomous</h3>
                                <p className="text-[var(--text-secondary)]">UGC Granted Status</p>
                            </div>
                            <div className="p-6 bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl">
                                <CheckCircle className="w-10 h-10 text-[var(--accent)] mb-4" />
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">JNTUK Recognized Institution</h3>
                                <p className="text-[var(--text-secondary)]">Award-Winning Academic Excellence</p>
                            </div>
                            <div className="p-6 bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl">
                                <GraduationCap className="w-10 h-10 text-[var(--accent)] mb-4" />
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">ISO 9001</h3>
                                <p className="text-[var(--text-secondary)]">Certified Institution</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            <div className="gradient-divider" />

            {/* Vision & Mission */}
            <section className="py-24 bg-[var(--bg-primary)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tl from-[var(--gradient-end)]/[0.03] via-transparent to-[var(--gradient-start)]/[0.02] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-heading font-bold text-[var(--text-primary)] mb-4">Our Purpose</h2>
                        <div className="w-24 h-1 bg-[var(--accent)] rounded-full mx-auto opacity-50" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-12">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl p-6 sm:p-10 shadow-sm border border-[var(--border-color)]/30 rounded-2xl"
                        >
                            <div className="w-16 h-16 bg-[var(--accent)]/10 flex items-center justify-center rounded-xl mb-8">
                                <Target className="w-8 h-8 text-[var(--accent)]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Our Vision</h3>
                            <p className="text-lg text-[var(--text-secondary)] leading-relaxed text-justify">
                                To foster excellence in engineering by providing high-quality technical education, instilling core values, and promoting research and technical services that align with global competence and societal needs. We aim to produce professionally skilled and intellectually capable individuals who can lead the future.
                            </p>
                        </motion.div>
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl p-6 sm:p-10 shadow-sm border border-[var(--border-color)]/30 rounded-2xl"
                        >
                            <div className="w-16 h-16 bg-[var(--accent)]/10 flex items-center justify-center rounded-xl mb-8">
                                <BookOpen className="w-8 h-8 text-[var(--accent)]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Our Mission</h3>
                            <ul className="space-y-4">
                                {[
                                    'Provide state-of-the-art infrastructure and instruction.',
                                    'Prepare students for the contemporary technological world.',
                                    'Offer socio-ethical exposure for holistic development.',
                                    'Maintain international standards in research and technical services.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 bg-[var(--accent)] rounded-full" />
                                        <span className="text-lg text-[var(--text-secondary)]">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            <Leaders data={home?.leaders} />
            <Timeline data={home?.timeline} />

            <div className="gradient-divider" />

            {/* Core Values */}
            <section className="py-20 bg-[var(--bg-primary)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/[0.03] via-transparent to-[var(--gradient-end)]/[0.02] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)] text-center mb-12">Our Core Values</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-20">
                        {values.map((value, index) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl p-6 shadow-sm text-center hover:shadow-md transition-all border border-[var(--border-color)]/30 rounded-2xl"
                            >
                                <div className="w-14 h-14 bg-[var(--bg-tertiary)]/60 flex items-center justify-center rounded-xl mx-auto mb-4">
                                    <value.icon className="w-7 h-7 text-[var(--accent)]" />
                                </div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{value.title}</h3>
                                <p className="text-[var(--text-secondary)] text-sm">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Administration */}
                    {(governing.length > 0 || officials.length > 0) && (
                    <div style={{ maxWidth: '1600px', margin: '0 auto', paddingLeft: '48px', paddingRight: '48px' }}>
                        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)] text-center mb-12">Administration</h2>
                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl shadow-sm border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)]">
                                {governing.length > 0 && (
                                <div className="p-8">
                                    <h3 className="text-xl font-bold text-[var(--accent)] mb-6">Governing Body</h3>
                                    <ul className="space-y-4">
                                        {governing.map((m, i) => (
                                            <li key={i} className={`flex items-center min-w-0${i < governing.length - 1 ? ' border-b border-[var(--border-color)] pb-2' : ''}`}>
                                                <span className="w-1/2 text-left font-medium text-[var(--text-primary)] truncate pr-6">{m.name}</span>
                                                <span className="w-1/2 text-right text-sm text-[var(--text-secondary)] whitespace-normal break-words leading-relaxed">{m.designation}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                )}
                                {officials.length > 0 && (
                                <div className="p-8">
                                    <h3 className="text-xl font-bold text-[var(--accent)] mb-6">Key Officials</h3>
                                    <ul className="space-y-4">
                                        {officials.map((m, i) => (
                                            <li key={i} className={`flex items-center min-w-0${i < officials.length - 1 ? ' border-b border-[var(--border-color)] pb-2' : ''}`}>
                                                <span className="w-1/2 text-left font-medium text-[var(--text-primary)] truncate pr-6">{m.name}</span>
                                                <span className="w-1/2 text-right text-sm text-[var(--text-secondary)] whitespace-normal break-words leading-relaxed">{m.designation}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </section>

            <NotableAlumni />
            <CTA data={home?.cta} />
        </div>
    );
};

export default Landing;
