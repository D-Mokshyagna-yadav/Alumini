import { motion } from 'framer-motion';
import { Users, Award, BookOpen, Target, Heart, Globe, Building2, CheckCircle, GraduationCap } from 'lucide-react';

const About = () => {
    const values = [
        { icon: Users, title: 'Inclusivity', description: 'Fostering a diverse community where every voice matters.' },
        { icon: Award, title: 'Excellence', description: 'Pursuing the highest standards in education and research.' },
        { icon: Heart, title: 'Service', description: 'Dedicated to serving our region and the nation.' },
        { icon: Globe, title: 'Global Outlook', description: 'Preparing students for international challenges.' },
    ];

    const timeline = [
        { year: '2002', title: 'Inception', description: 'Established with B.Tech in ECE, CSE, and EEE under Devineni Ramana & Praneetha Memorial Trust.' },
        { year: '2004', title: 'Expansion', description: 'Introduced Mechanical Engineering, MCA, and MBA programs.' },
        { year: '2012', title: 'Advanced Studies', description: 'Launched M.Tech programs and diploma courses.' },
        { year: '2018', title: 'Autonomous Status', description: 'Granted Autonomous Status by UGC, enabling curriculum innovation.' },
        { year: '2024', title: 'NAAC A+ Grade', description: 'Achieved prestigious NAAC A+ accreditation with 3.4 CGPA.' },
    ];

    return (
        <div className="min-h-screen bg-transparent">
            {/* Hero Section */}
            <div className="bg-[var(--accent)] text-[var(--bg-primary)] py-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1541339907198-e021fc012e06?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-heading font-bold mb-6"
                    >
                        MIC College of Technology
                    </motion.h1>
                    <p className="text-xl md:text-2xl text-[var(--bg-primary)]/90 max-w-4xl mx-auto leading-relaxed">
                        Connecting the past, present, and future of DVR & Dr. HS MIC College of Technology.
                    </p>
                </div>
            </div>

            {/* Introduction - The Metamorphosis */}
            <section className="py-20 bg-[var(--bg-secondary)]">
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
                                DVR & Dr. HS MIC College of Technology was established in 2002 by the Devineni Ramana & Praneetha Memorial Trust.
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

            {/* Vision & Mission */}
            <section className="py-24 bg-[var(--bg-primary)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-heading font-bold text-[var(--text-primary)] mb-4">Our Purpose</h2>
                        <div className="w-24 h-1 bg-[var(--accent)] rounded-full mx-auto opacity-50" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Vision */}
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

                        {/* Mission */}
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

            {/* History Timeline */}
            <section className="py-24 bg-[var(--bg-secondary)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-[var(--text-primary)] text-center mb-16">
                        Milestones of Growth
                    </h2>
                    {/* Mobile: left-aligned timeline */}
                    <div className="md:hidden relative ml-4 space-y-10">
                        <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-[var(--accent)]/20" />
                        {timeline.map((item, index) => (
                            <div key={index} className="relative pl-8">
                                <div className="absolute top-1 left-[-5px] w-3 h-3 bg-[var(--accent)] rounded-full ring-4 ring-[var(--bg-secondary)]" />
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <div className="bg-[var(--bg-tertiary)]/60 backdrop-blur-xl p-6 border border-[var(--border-color)]/30 rounded-2xl hover:border-[var(--accent)]/40 transition-all hover:shadow-sm">
                                        <span className="text-2xl font-black text-[var(--accent)] block mb-2">{item.year}</span>
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                                        <p className="text-[var(--text-secondary)]">{item.description}</p>
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: centered timeline */}
                    <div className="hidden md:block relative">
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[var(--accent)]/20" />
                        <div className="space-y-14">
                            {timeline.map((item, index) => {
                                const isLeft = index % 2 === 0;
                                return (
                                    <div key={index} className="relative flex items-start">
                                        {/* Left side */}
                                        <div className="w-1/2 pr-10">
                                            {isLeft && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    viewport={{ once: true }}
                                                >
                                                    <div className="bg-[var(--bg-tertiary)]/60 backdrop-blur-xl p-6 border border-[var(--border-color)]/30 rounded-2xl hover:border-[var(--accent)]/40 transition-all hover:shadow-sm">
                                                        <span className="text-2xl font-black text-[var(--accent)] block mb-2">{item.year}</span>
                                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                                                        <p className="text-[var(--text-secondary)]">{item.description}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Center dot */}
                                        <div className="absolute left-1/2 -translate-x-1/2 top-2 w-3.5 h-3.5 bg-[var(--accent)] rounded-full ring-4 ring-[var(--bg-secondary)] z-10" />

                                        {/* Right side */}
                                        <div className="w-1/2 pl-10">
                                            {!isLeft && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 20 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    viewport={{ once: true }}
                                                >
                                                    <div className="bg-[var(--bg-tertiary)]/60 backdrop-blur-xl p-6 border border-[var(--border-color)]/30 rounded-2xl hover:border-[var(--accent)]/40 transition-all hover:shadow-sm">
                                                        <span className="text-2xl font-black text-[var(--accent)] block mb-2">{item.year}</span>
                                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{item.title}</h3>
                                                        <p className="text-[var(--text-secondary)]">{item.description}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 bg-[var(--bg-primary)]">
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

                    {/* Administration / Governing Body */}
                    <div id="leadership" className="w-full flex flex-col items-center py-8" style={{ maxWidth: '1600px', margin: '0 auto', paddingLeft: '48px', paddingRight: '48px' }}>
                        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--text-primary)] text-center mb-8">Administration</h2>
                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl shadow-sm border-none rounded-2xl overflow-hidden w-full grid grid-cols-2 divide-x divide-transparent">
                            <div className="p-10 flex flex-col justify-center">
                                <h3 className="text-2xl font-bold text-[var(--accent)] mb-8">Governing Body</h3>
                                <table className="w-full text-lg table-fixed" style={{ borderCollapse: 'separate' }}>
                                    <colgroup>
                                        <col style={{ width: '50%' }} />
                                        <col style={{ width: '50%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="text-left text-base uppercase tracking-wider text-[var(--text-secondary)] font-semibold pb-3 px-8">Name</th>
                                            <th className="text-right text-base uppercase tracking-wider text-[var(--text-secondary)] font-semibold pb-3 px-8">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Dr. M.V. Ramana Rao</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Chairman</td>
                                        </tr>
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Sri N. Srinivasa Rao</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Vice Chairman</td>
                                        </tr>
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Sri M. Srinivasa Rao</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Director (P&D)</td>
                                        </tr>
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Sri D. Panduranga Rao</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">CEO</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-1 p-10 flex flex-col justify-center">
                                <h3 className="text-2xl font-bold text-[var(--accent)] mb-8">Key Officials</h3>
                                <table className="w-full text-lg table-fixed" style={{ borderCollapse: 'separate' }}>
                                    <colgroup>
                                        <col style={{ width: '50%' }} />
                                        <col style={{ width: '50%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="text-left text-base uppercase tracking-wider text-[var(--text-secondary)] font-semibold pb-3 px-8">Name</th>
                                            <th className="text-right text-base uppercase tracking-wider text-[var(--text-secondary)] font-semibold pb-3 px-8">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Dr. T. Vamsee Kiran</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Principal</td>
                                        </tr>
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Dr. G. Rajesh</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Dean (Academics)</td>
                                        </tr>
                                        <tr className="rounded-lg">
                                            <td className="py-8 px-8 font-medium text-xl text-[var(--text-primary)] rounded-l-lg text-left">Dr. A. Guravaiah</td>
                                            <td className="py-8 px-8 text-sm text-[var(--text-secondary)] rounded-r-lg text-right whitespace-normal break-words">Dean (R&D)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
