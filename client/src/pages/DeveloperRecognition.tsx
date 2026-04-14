import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Code, GitFork, Heart, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import CachedImage from '../components/CachedImage';
import Avatar from '../components/ui/Avatar';

interface Developer {
    _id: string;
    name: string;
    headline?: string;
    currentCompany?: string;
    avatar?: string;
    skills?: Array<{ id: string; name: string; endorsements: number }>;
    bio?: string;
}

const DeveloperRecognition = () => {
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'trending' | 'top'>('trending');

    useEffect(() => {
        const fetchDevelopers = async () => {
            try {
                setLoading(true);
                // Fetch all users and filter those with development skills
                const res = await api.get('/user/directory?q=&limit=500');
                const allUsers = res.data.users || [];
                
                // Filter developers (users with tech skills or 'developer' in headline)
                const devUsers = allUsers.filter((user: Developer) => {
                    const headline = (user.headline || '').toLowerCase();
                    const hasTechSkills = user.skills && user.skills.length > 0;
                    const isDeveloper = headline.includes('developer') || 
                                       headline.includes('engineer') || 
                                       headline.includes('programmer') ||
                                       headline.includes('coder');
                    return isDeveloper || hasTechSkills;
                });

                setDevelopers(devUsers);
            } catch (err) {
                console.error('Error fetching developers:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDevelopers();
    }, []);

    const sortedDevelopers = () => {
        const sorted = [...developers];
        if (filter === 'top') {
            return sorted.sort((a, b) => {
                const aEndorsements = a.skills?.reduce((sum, s) => sum + s.endorsements, 0) || 0;
                const bEndorsements = b.skills?.reduce((sum, s) => sum + s.endorsements, 0) || 0;
                return bEndorsements - aEndorsements;
            });
        }
        return sorted;
    };

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
                            <Code size={18} className="text-[var(--accent)]" />
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

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex gap-3 justify-center flex-wrap">
                    {(['all', 'trending', 'top'] as const).map(f => (
                        <motion.button
                            key={f}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2.5 rounded-xl font-medium transition-all ${
                                filter === f
                                    ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent)]/30'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                            {f === 'all' && 'All Developers'}
                            {f === 'trending' && 'Trending'}
                            {f === 'top' && 'Top Rated'}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Developers Grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-96 bg-[var(--bg-secondary)] rounded-2xl animate-pulse"
                            />
                        ))}
                    </div>
                ) : sortedDevelopers().length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedDevelopers().map((dev, idx) => {
                            const skillsEndorsements = dev.skills?.reduce((sum, s) => sum + s.endorsements, 0) || 0;
                            const topSkills = dev.skills?.slice(0, 3) || [];

                            return (
                                <motion.div
                                    key={dev._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl p-6 hover:border-[var(--accent)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--accent)]/10"
                                >
                                    {/* Badge */}
                                    {idx < 3 && (
                                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg">
                                            <Trophy size={20} className="text-white" />
                                        </div>
                                    )}

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
                                    {dev.headline && (
                                        <p className="text-sm text-[var(--text-secondary)] text-center mt-1 line-clamp-2">
                                            {dev.headline}
                                        </p>
                                    )}

                                    {dev.currentCompany && (
                                        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                                            @ {dev.currentCompany}
                                        </p>
                                    )}

                                    {/* Bio */}
                                    {dev.bio && (
                                        <p className="text-xs text-[var(--text-secondary)] text-center mt-3 line-clamp-2">
                                            {dev.bio}
                                        </p>
                                    )}

                                    {/* Skills */}
                                    {topSkills.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30">
                                            <div className="space-y-2">
                                                {topSkills.map(skill => (
                                                    <div key={skill.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-[var(--text-secondary)]">{skill.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                                            <span className="text-[var(--text-muted)]">{skill.endorsements}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {skillsEndorsements > 0 && (
                                                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-[var(--accent)] font-medium">
                                                    <Heart size={14} className="fill-[var(--accent)]" />
                                                    {skillsEndorsements} Total Endorsements
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* View Profile Button */}
                                    <button className="w-full mt-4 py-2 px-4 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 group">
                                        <GitFork size={14} />
                                        View Profile
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Code size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                        <p className="text-[var(--text-secondary)]">No developers found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeveloperRecognition;
