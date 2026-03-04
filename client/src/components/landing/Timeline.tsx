import { motion } from 'framer-motion';

const events = [
    { year: '2002', title: 'College Established', description: 'DVR & Dr. HS MIC College of Technology was founded with a vision for excellence.' },
    { year: '2012', title: 'Decade of Growth', description: 'Expanded programs and infrastructure to support a growing student body.' },
    { year: '2018', title: 'NAAC Accreditation', description: 'Received accreditation recognizing our commitment to quality education.' },
    { year: '2022', title: '20 Years of Excellence', description: 'Celebrated two decades of shaping engineering leaders.' },
    { year: '2026', title: 'Future Ready', description: 'Continuing to innovate and lead in technical education.' },
];

const Timeline = ({ data }: { data?: any }) => {
    return (
        <section className="py-20 sm:py-28 bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--text-primary)] mb-4">Our Heritage</h2>
                    <div className="w-16 h-1 bg-[var(--accent)] mx-auto rounded-full"></div>
                </div>

                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-px h-full bg-[var(--border-color)] hidden md:block"></div>

                    <div className="space-y-12">
                        {events.map((event, index) => (
                            <motion.div
                                key={event.year}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.08 }}
                                className={`flex flex-col md:flex-row items-center justify-between ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
                            >
                                <div className="w-full md:w-5/12"></div>

                                <div className="z-10 bg-[var(--accent)] text-[var(--bg-primary)] font-bold w-10 h-10 flex items-center justify-center rounded-full border-4 border-[var(--bg-secondary)] shadow-sm mb-4 md:mb-0 text-sm">
                                    {index + 1}
                                </div>

                                <div className="relative w-full md:w-5/12 bg-[var(--card-bg)] backdrop-blur-xl p-6 rounded-xl shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all duration-200">
                                    <div className="absolute top-3 right-4 text-3xl font-heading font-bold text-[var(--accent)] opacity-25">{event.year}</div>
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{event.title}</h3>
                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{event.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Timeline;
