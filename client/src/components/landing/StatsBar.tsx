import { Users, BookOpen, Award, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const StatsBar = ({ stats }: { stats?: { id?: number; name: string; value: string; icon?: React.ComponentType<{ className?: string; size?: number }> }[] }) => {
    const items = stats && stats.length ? stats : [
        { id: 1, name: 'Alumni Worldwide', value: '25K+', icon: Users },
        { id: 2, name: 'Departments', value: '11+', icon: BookOpen },
        { id: 3, name: 'Years of Excellence', value: '20+', icon: Building2 },
        { id: 4, name: 'NAAC Grade', value: 'A+', icon: Award },
    ];

    return (
        <div className="w-full py-16 sm:py-20 bg-[var(--bg-secondary)] relative overflow-hidden">
            {/* Subtle blue gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--gradient-start)]/[0.04] via-transparent to-[var(--gradient-end)]/[0.03] pointer-events-none" />
            <div className="max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-16">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {items.map((stat: { id?: number; name: string; value: string; icon?: React.ComponentType<{ className?: string; size?: number }> }, index: number) => (
                        <motion.div
                            key={stat.id || stat.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.08, duration: 0.4 }}
                            className="flex flex-col items-center justify-center py-8 sm:py-10 bg-[var(--card-bg)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow duration-200 cursor-default"
                        >
                            <div className="p-3 mb-3 bg-[var(--accent)]/10 rounded-lg">
                                {stat.icon && <stat.icon size={24} className="text-[var(--accent)]" />}
                            </div>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">{stat.value}</p>
                            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-[0.15em]">{stat.name}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatsBar;
