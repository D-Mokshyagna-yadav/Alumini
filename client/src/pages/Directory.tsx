import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search, MapPin, GraduationCap,
    UserPlus, User, Loader2, Clock, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';

interface Alumni {
    _id: string;
    name: string;
    headline?: string;
    currentLocation?: string;
    graduationYear: number;
    degree: string;
    department?: string;
    currentCompany?: string;
    avatar?: string;
}

const Directory = () => {
    const [alumni, setAlumni] = useState<Alumni[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [batchFilter, setBatchFilter] = useState<string>('all');
    const [deptFilter, setDeptFilter] = useState<string>('all');
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, { status: string; requestId?: string }>>({});

    useEffect(() => {
        fetchAlumni();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAlumni = async () => {
        try {
            const res = await api.get('/users/directory');
            setAlumni(res.data.users);
            res.data.users.forEach((user: Alumni) => {
                checkConnectionStatus(user._id);
            });
        } catch (error) {
            console.error('Failed to fetch alumni:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkConnectionStatus = async (userId: string) => {
        try {
            const res = await api.get(`/connections/status/${userId}`);
            setConnectionStatuses(prev => ({
                ...prev,
                [userId]: { status: res.data.status, requestId: res.data.requestId }
            }));
        } catch (error) {
            console.error(`Failed to check status for ${userId}`, error);
        }
    };

    const toast = useToast();
    const { user: currentUser, checkAuth } = useAuth();

    const handleConnect = async (id: string) => {
        try {
            await api.post(`/connections/request/${id}`);
            setConnectionStatuses(prev => ({ ...prev, [id]: { status: 'pending_sent' } }));
            toast.show('Connection request sent', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send request';
            toast.show(msg, 'error');
        }
    };

    const handleRespond = async (userId: string, requestId: string) => {
        try {
            await api.put(`/connections/accept/${requestId}`);
            setConnectionStatuses(prev => ({ ...prev, [userId]: { status: 'accepted' } }));
            try { await checkAuth(); } catch { /* ignore */ }
            toast.show('Connection accepted', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to accept request';
            toast.show(msg, 'error');
        }
    };

    const filteredAlumni = alumni.filter(person => {
        const matchesSearch = person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.currentCompany?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBatch = batchFilter === 'all' || person.graduationYear.toString() === batchFilter;
        const matchesDept = deptFilter === 'all' || person.department === deptFilter;
        return matchesSearch && matchesBatch && matchesDept;
    });

    const batches = [...new Set(alumni.map(a => a.graduationYear))].sort((a, b) => b - a);
    const departments = [...new Set(alumni.map(a => a.department).filter(Boolean))].sort();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
        );
    }

    const ConnectionButton = ({ person }: { person: Alumni }) => {
        // Don't show connection button for own profile
        if (person._id === currentUser?.id || person._id === (currentUser as { _id?: string })?._id) return null;
        const status = connectionStatuses[person._id]?.status;
        if (status === 'accepted') {
            return (
                <Link
                    to={`/profile/${person._id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--accent)]/8 text-[var(--accent)] font-medium text-xs rounded-lg hover:bg-[var(--accent)]/15 transition-colors"
                >
                    <User size={13} /> Connected
                </Link>
            );
        }
        if (status === 'pending_sent') {
            return (
                <button disabled className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[var(--border-color)]/40 text-[var(--text-muted)] font-medium text-xs rounded-lg cursor-not-allowed">
                    <Clock size={13} /> Pending
                </button>
            );
        }
        if (status === 'pending_received') {
            return (
                <button
                    onClick={() => handleRespond(person._id, connectionStatuses[person._id].requestId!)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-xs rounded-lg hover:opacity-90 transition-all"
                >
                    <UserPlus size={13} /> Accept
                </button>
            );
        }
        return (
            <button
                onClick={() => handleConnect(person._id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[var(--accent)]/30 text-[var(--accent)] font-medium text-xs rounded-lg hover:bg-[var(--accent)]/8 transition-colors"
            >
                <UserPlus size={13} /> Connect
            </button>
        );
    };

    return (
        <div className="max-w-[1128px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Search Bar */}
            <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-5 mb-5">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 rounded-xl px-4 py-2.5">
                        <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search by name, headline, or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-full !border-none !shadow-none !ring-0 !rounded-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={batchFilter}
                            onChange={(e) => setBatchFilter(e.target.value)}
                            className="px-3 py-2 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        >
                            <option value="all">All Batches</option>
                            {batches.map(batch => (
                                <option key={batch} value={batch.toString()}>{batch}</option>
                            ))}
                        </select>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="px-3 py-2 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/30 rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                        >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <Users size={14} className="text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-muted)]">
                        {filteredAlumni.length} alumni found
                        {batchFilter !== 'all' && ` · Batch ${batchFilter}`}
                        {deptFilter !== 'all' && ` · ${deptFilter}`}
                    </p>
                </div>
            </div>

            {/* Alumni Grid */}
            {filteredAlumni.length === 0 ? (
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-6 sm:p-12 text-center">
                    <User className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                    <p className="text-[var(--text-primary)] font-medium">No alumni found</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredAlumni.map((person, index) => (
                        <motion.div
                            key={person._id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.5) }}
                            className="group bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden hover:border-[var(--border-color)]/60 transition-all"
                        >
                            {/* Card Header */}
                            <div className="h-14 bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent" />

                            {/* Card Body */}
                            <div className="px-4 pb-4 -mt-7">
                                {/* Avatar */}
                                <Link to={`/profile/${person._id}`} className="inline-block mb-3">
                                    <div className="w-14 h-14 rounded-xl bg-[var(--accent)] border-2 border-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                                        <Avatar src={person.avatar} iconSize={24} />
                                    </div>
                                </Link>

                                {/* Info */}
                                <div className="min-w-0 mb-3">
                                    <h3 className="font-semibold text-[var(--text-primary)] truncate text-sm">
                                        <Link to={`/profile/${person._id}`} className="hover:underline">{person.name}</Link>
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                                        {person.headline || `${person.degree} · ${person.department || 'MIC College'}`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
                                        <span className="flex items-center gap-0.5">
                                            <GraduationCap size={10} /> {person.graduationYear}
                                        </span>
                                        {person.currentLocation && (
                                            <>
                                                <span>·</span>
                                                <span className="flex items-center gap-0.5 truncate">
                                                    <MapPin size={10} /> {person.currentLocation}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="flex gap-2">
                                    <Link
                                        to={`/profile/${person._id}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] font-medium text-xs rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <User size={13} /> Profile
                                    </Link>
                                    <ConnectionButton person={person} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Directory;
