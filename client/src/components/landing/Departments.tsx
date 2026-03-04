import { motion } from 'framer-motion';
import { Cpu, Code, Zap, Globe, HardDrive, Settings, PenTool, Database } from 'lucide-react';

const departments = [
    { name: 'Computer Science & Engineering', icon: Code, short: 'CSE' },
    { name: 'Artificial Intelligence & Data Science', icon: Database, short: 'AI & DS' },
    { name: 'Artificial Intelligence & Machine Learning', icon: Cpu, short: 'AI & ML' },
    { name: 'Electronics & Communication', icon: Zap, short: 'ECE' },
    { name: 'Electrical & Electronics', icon: HardDrive, short: 'EEE' },
    { name: 'Information Technology', icon: Globe, short: 'IT' },
    { name: 'Mechanical Engineering', icon: Settings, short: 'Mech' },
    { name: 'Civil Engineering', icon: PenTool, short: 'Civil' },
];

const Departments = ({ data }: { data?: any }) => {
    return (
        <section className="py-20 sm:py-28 bg-[var(--bg-primary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-heading font-bold text-[var(--text-primary)] mb-4">Academic Departments</h2>
                    <div className="w-16 h-1 bg-[var(--accent)] mx-auto rounded-full"></div>
                    <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Offering a diverse range of undergraduate and postgraduate programs designed to foster innovation and technical expertise.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {departments.map((dept, index) => (
                        <motion.div
                            key={dept.short}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.04, duration: 0.4 }}
                            className="bg-[var(--card-bg)] backdrop-blur-xl p-6 rounded-xl shadow-sm border border-[var(--border-color)] text-center group hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-200 cursor-default"
                        >
                            <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-[var(--accent)] transition-colors duration-200">
                                <dept.icon className="w-5 h-5 text-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-colors duration-200" />
                            </div>
                            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{dept.short}</h3>
                            <p className="text-xs text-[var(--text-secondary)] font-medium h-8 flex items-center justify-center">
                                {dept.name}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Departments;
