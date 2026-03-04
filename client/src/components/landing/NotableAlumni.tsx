import { motion } from 'framer-motion';

const alumni = [
    {
        id: 1,
        name: "Abhinav Praneeth S",
        role: "Software Developer",
        image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1000&auto=format&fit=crop",
        batch: "2011"
    },
    {
        id: 2,
        name: "Sridevi Kasturi",
        role: "Mechanical Engineer",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop",
        batch: "2012"
    },
    {
        id: 3,
        name: "Ramakrishna Telaprolu",
        role: "MBA Graduate",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1000&auto=format&fit=crop",
        batch: "2017"
    },
    {
        id: 4,
        name: "Prudhvi Nadh Vajhala",
        role: "Alumnus",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
        batch: "2014"
    }
];

const NotableAlumni = ({ data }: { data?: any[] }) => {
    const list = data && data.length ? data : alumni;

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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {list.map((alum: any, index: number) => (
                        <motion.div
                            key={alum.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.08, duration: 0.4 }}
                            className="group bg-[var(--card-bg)] backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm border border-[var(--border-color)] hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200"
                        >
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={alum.image}
                                    alt={alum.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            </div>
        </section>
    );
};

export default NotableAlumni;
