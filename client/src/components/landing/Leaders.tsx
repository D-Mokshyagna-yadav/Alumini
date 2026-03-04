import { motion } from 'framer-motion';

const Leaders = ({ data }: { data?: any }) => {
    return (
        <section className="py-20 sm:py-28 bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--text-primary)] mb-4">Leadership Vision</h2>
                    <div className="w-16 h-1 bg-[var(--accent)] mx-auto rounded-full"></div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
                    {/* Chairman's Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-[var(--card-bg)] backdrop-blur-xl p-5 sm:p-8 rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow duration-200 relative"
                    >
                        <div className="absolute -top-4 left-6 w-10 h-10 bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] text-xl font-serif rounded-lg shadow-sm">&ldquo;</div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 mt-2">Dr. M.V. Ramana Rao</h3>
                        <p className="text-xs font-semibold text-[var(--accent)] mb-5 uppercase tracking-wider">Chairman</p>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                            "DVR & Dr. HS MIC College of Technology has emerged as a premier institution through relentless efforts in education. We welcome individuals to MIC to learn future technologies within a rich academic environment. Our vision has always been to provide holistic education that empowers students to succeed globally."
                        </p>
                    </motion.div>

                    {/* Principal's Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-[var(--card-bg)] backdrop-blur-xl p-5 sm:p-8 rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow duration-200 relative"
                    >
                        <div className="absolute -top-4 right-6 w-10 h-10 bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] text-xl font-serif rounded-lg shadow-sm">&ldquo;</div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 mt-2">Dr. T. Vamsee Kiran</h3>
                        <p className="text-xs font-semibold text-[var(--accent)] mb-5 uppercase tracking-wider">Principal</p>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                            "With over two decades of experience, we strive to bring the best out of every student. Our focus is not just on academic excellence but on shaping responsible citizens who can contribute meaningfully to society. We are committed to maintaining the highest standards in technical education."
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Leaders;
