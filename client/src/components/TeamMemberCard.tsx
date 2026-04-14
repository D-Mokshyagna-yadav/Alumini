import { motion } from 'framer-motion';
import { Mail, ExternalLink } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import Avatar from './ui/Avatar';

interface TeamMemberCardProps {
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
    index?: number;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
    name,
    title,
    bio,
    avatar,
    department,
    email,
    linkedin,
    github,
    portfolio,
    index = 0,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-6 hover:border-[var(--accent)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent)]/10"
        >
            {/* Avatar */}
            <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-blue-500 p-1 shadow-lg">
                    <div className="w-full h-full rounded-full bg-[var(--bg-primary)] flex items-center justify-center overflow-hidden">
                        <Avatar src={avatar} iconSize={32} />
                    </div>
                </div>
            </div>

            {/* Name & Title */}
            <h3 className="text-lg font-bold text-[var(--text-primary)] text-center">{name}</h3>
            <p className="text-sm font-semibold text-[var(--accent)] text-center mt-1">
                {title}
            </p>

            {/* Department */}
            {department && (
                <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                    {department}
                </p>
            )}

            {/* Bio */}
            {bio && (
                <p className="text-sm text-[var(--text-secondary)] text-center mt-3 line-clamp-3">
                    {bio}
                </p>
            )}

            {/* Divider */}
            {(email || linkedin || github || portfolio) && (
                <div className="border-t border-[var(--border-color)]/30 my-4" />
            )}

            {/* Social Links */}
            {(email || linkedin || github || portfolio) && (
                <div className="flex items-center justify-center gap-3">
                    {email && (
                        <a
                            href={`mailto:${email}`}
                            title="Email"
                            className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                        >
                            <Mail size={16} />
                        </a>
                    )}
                    {linkedin && (
                        <a
                            href={linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="LinkedIn"
                            className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[#0A66C2]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#0A66C2] transition-all"
                        >
                            <FaLinkedin size={16} />
                        </a>
                    )}
                    {github && (
                        <a
                            href={github}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="GitHub"
                            className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--text-primary)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                        >
                            <FaGithub size={16} />
                        </a>
                    )}
                    {portfolio && (
                        <a
                            href={portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Portfolio"
                            className="w-9 h-9 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all"
                        >
                            <ExternalLink size={16} />
                        </a>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default TeamMemberCard;
