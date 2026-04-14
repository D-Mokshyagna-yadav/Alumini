import { motion } from 'framer-motion';
import { ExternalLink, Sparkles } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Avatar from '../components/ui/Avatar';

interface Developer {
    _id: string;
    name: string;
    title: string;
    bio?: string;
    avatar?: string;
    portfolio?: string;
    github?: string;
    linkedin?: string;
}

const DeveloperRecognition = () => {
    const developers: Developer[] = [
        {
            _id: '1',
            name: 'D. MOKSHYAGNA YADAV',
            title: 'Team Lead',
            bio: 'Team lead with experience in software development.',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mokshyagna',
            portfolio: 'https://sensui-moksha.github.io/',
            github: 'https://github.com/D-Mokshyagna-yadav',
            linkedin: 'https://linkedin.com/in/mokshyagna',
        },
        {
            _id: '2',
            name: 'NEIL NAGA SAI',
            title: 'Senior Developer',
            bio: 'Full-stack developer with experience in web technologies.',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neil',
            portfolio: 'https://amevrynx.github.io/',
            github: 'https://github.com/Amevrynx',
            linkedin: 'https://linkedin.com/in/neil-naga-sai',
        },
        {
            _id: '3',
            name: 'CHIRUMAMILLA AVINASH',
            title: 'Developer',
            bio: 'Developer focused on building quality solutions.',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=avinash',
            portfolio: 'https://avinash.dev',
            github: 'https://github.com/avinash',
            linkedin: 'https://linkedin.com/in/avinash',
        },
    ];

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
                            <Sparkles size={18} className="text-[var(--accent)]" />
                            <span className="text-sm font-semibold text-[var(--accent)]">Developer Spotlight</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-4">
                            Celebrate Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-blue-500">Developers</span>
                        </h1>
                        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Recognizing the talented developers who are building amazing projects and contributing to our tech community
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Developers Grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {developers.map((dev, idx) => {
                        return (
                            <motion.div
                                key={dev._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-6 hover:border-[var(--accent)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent)]/10"
                            >
                                {/* Avatar */}
                                <div className="flex justify-center mb-4">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-blue-500 p-1 shadow-lg">
                                        <div className="w-full h-full rounded-full bg-[var(--bg-primary)] flex items-center justify-center overflow-hidden">
                                            <Avatar src={dev.avatar} iconSize={24} />
                                        </div>
                                    </div>
                                </div>

                                {/* Name & Title */}
                                <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">{dev.name}</h3>
                                <p className="text-sm font-semibold text-[var(--accent)] text-center mt-1">
                                    {dev.title}
                                </p>

                                {/* Bio */}
                                {dev.bio && (
                                    <p className="text-sm text-[var(--text-secondary)] text-center mt-3 line-clamp-2">
                                        {dev.bio}
                                    </p>
                                )}

                                {/* Divider */}
                                {(dev.portfolio || dev.github || dev.linkedin) && (
                                    <div className="border-t border-[var(--border-color)]/30 my-4" />
                                )}

                                {/* Social Links */}
                                {(dev.portfolio || dev.github || dev.linkedin) && (
                                    <div className="flex items-center justify-center gap-3">
                                        {dev.portfolio && (
                                            <a
                                                href={dev.portfolio}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Portfolio"
                                                className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                        {dev.github && (
                                            <a
                                                href={dev.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="GitHub"
                                                className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                                            >
                                                <FaGithub size={16} />
                                            </a>
                                        )}
                                        {dev.linkedin && (
                                            <a
                                                href={dev.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="LinkedIn"
                                                className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                                            >
                                                <FaLinkedin size={16} />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DeveloperRecognition;
