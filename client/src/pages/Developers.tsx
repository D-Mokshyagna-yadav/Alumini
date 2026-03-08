import { motion } from 'framer-motion';
import { Github, Linkedin, Twitter, Mail, Code2, Sparkles } from 'lucide-react';

const developers = [
    {
        name: 'N.Neela Naga Sai',
        avatar: null,
        initials: 'N',
        bio: 'Passionate about building impactful web applications and crafting seamless user experiences.',
        socials: {
            github: 'https://github.com/',
            linkedin: 'https://linkedin.com/in/',
            twitter: 'https://twitter.com/',
            email: 'mailto:contact@example.com',
        },
    },
    {
        name: 'Mokshyagna Yadav',
        avatar: null,
        initials: 'M',
        bio: 'Driven by curiosity and a love for clean code, turning ideas into reality one commit at a time.',
        socials: {
            github: 'https://github.com/',
            linkedin: 'https://linkedin.com/in/',
            twitter: 'https://twitter.com/',
            email: 'mailto:contact@example.com',
        },
    },
    {
        name: 'GitHub Copilot',
        avatar: null,
        initials: 'AI',
        bio: 'AI pair-programmer powered by Claude Opus 4.6 — helped architect, code, and polish every corner of this platform.',
        socials: {
            github: 'https://github.com/features/copilot',
            linkedin: 'https://linkedin.com/company/github',
            twitter: 'https://twitter.com/GitHubCopilot',
            email: 'mailto:copilot@github.com',
        },
    },
];

const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: 0.15 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
};

const Developers = () => {
    return (
        <div className="min-h-screen bg-transparent py-16 sm:py-24 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[var(--accent)]/8 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--accent)]/8 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-semibold rounded-full mb-4">
                        <Code2 size={16} />
                        Meet the Team
                    </span>
                    <div className="w-24 h-1.5 bg-[var(--accent)] mx-auto rounded-full mb-6" />
                    <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                        The people (and AI) behind the MIC College of Technology Alumni platform.
                    </p>
                </motion.div>

                {/* Developer Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {developers.map((dev, index) => (
                        <motion.div
                            key={dev.name}
                            custom={index}
                            initial="hidden"
                            animate="visible"
                            variants={cardVariants}
                            whileHover={{ y: -6, transition: { duration: 0.25 } }}
                            className="group bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl shadow-sm hover:shadow-xl transition-all p-5 sm:p-8 flex flex-col items-center text-center"
                        >
                            {/* Avatar */}
                            <div className="relative mb-6">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/60 p-[3px] group-hover:scale-105 transition-transform duration-300">
                                    <div className="w-full h-full rounded-full bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                                        {dev.avatar ? (
                                            <img src={dev.avatar} alt={dev.name} className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <span className="text-3xl font-bold text-[var(--accent)]">
                                                {dev.initials}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {dev.name === 'GitHub Copilot' && (
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-lg">
                                        <Sparkles size={16} className="text-[var(--bg-primary)]" />
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{dev.name}</h3>

                            {/* Bio */}
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 min-h-[3rem]">
                                {dev.bio}
                            </p>

                            {/* Social Links */}
                            <div className="flex items-center gap-3 mt-auto">
                                <a
                                    href={dev.socials.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-all"
                                    title="GitHub"
                                >
                                    <Github size={18} />
                                </a>
                                <a
                                    href={dev.socials.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-all"
                                    title="LinkedIn"
                                >
                                    <Linkedin size={18} />
                                </a>
                                <a
                                    href={dev.socials.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-all"
                                    title="Twitter"
                                >
                                    <Twitter size={18} />
                                </a>
                                <a
                                    href={dev.socials.email}
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-all"
                                    title="Email"
                                >
                                    <Mail size={18} />
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer note */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center mt-16"
                >
                    <p className="text-sm text-[var(--text-muted)]">
                        Made with dedication for MIC College of Technology Alumni Network
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Developers;
