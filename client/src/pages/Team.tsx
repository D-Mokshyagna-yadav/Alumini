import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Code, Heart } from 'lucide-react';
import TeamMemberCard from '../components/TeamMemberCard';

interface TeamMember {
    id: string;
    name: string;
    title: string;
    bio?: string;
    avatar?: string;
    department?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
}

const Team = () => {
    const [teamMembers] = useState<TeamMember[]>([
        {
            id: '1',
            name: 'D. MOKSHYAGNA YADAV',
            title: 'Team Lead',
            department: 'Development',
            bio: 'Team lead with experience in software development.',
            email: 'mokshyagna@alumni.com',
            linkedin: 'https://www.linkedin.com/in/mokshyagnayadav',
            github: 'https://github.com/Sensui-moksha',
        },
        {
            id: '2',
            name: 'NEIL NAGA SAI',
            title: 'Senior Developer',
            department: 'Development',
            bio: 'Full-stack developer with experience in web technologies.',
            email: 'neil@alumni.com',
            linkedin: 'https://www.linkedin.com/in/nagasainanduri',
            github: 'https://github.com/Amevrynx',
        },
        {
            id: '3',
            name: 'CHIRUMAMILLA AVINASH',
            title: 'Developer',
            department: 'Development',
            bio: 'Developer focused on building quality solutions.',
            email: 'avinash@alumni.com',
            linkedin: 'https://www.linkedin.com/in/ch-avinash-7726aa1b3/',
            github: 'https://github.com/Avinash657333',
        },
    ]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Hero Section */}
            <div className="relative overflow-hidden pt-24 pb-12 sm:pt-32 sm:pb-16">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-6"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-4">
                            <Users size={18} className="text-[var(--accent)]" />
                            <span className="text-sm font-semibold text-[var(--accent)]">Our Team</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-4">
                            Meet Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-blue-500">Team</span>
                        </h1>
                        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Our team of developers and leaders.
                        </p>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mt-8 flex justify-center gap-8 flex-wrap"
                    >
                        <div className="text-center">
                            <p className="text-3xl font-bold text-[var(--accent)]">{teamMembers.length}</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Team Members</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-[var(--accent)]">100%</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Dedicated</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-[var(--accent)]">∞</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Potential</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Team Grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamMembers.map((member, idx) => (
                        <TeamMemberCard
                            key={member.id}
                            {...member}
                            index={idx}
                        />
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="relative overflow-hidden py-16 sm:py-20 border-t border-[var(--border-color)]/30">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-80 h-80 bg-[var(--accent)]/5 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
                            Join Our Team
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)] mb-6 max-w-2xl mx-auto">
                            Interested in joining us? Get in touch.
                        </p>
                        <button className="px-8 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--accent)]/30 transition-all">
                            View Opportunities
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Team;
