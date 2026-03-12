import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    Search, MapPin, GraduationCap,
    UserPlus, User, Loader2, Clock, Users, UserCheck, UserMinus, X, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/ui/Avatar';
import resolveMediaUrl from '../lib/media';
import CachedImage from '../components/CachedImage';
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
    coverImage?: string;
}

interface ConnectionPerson {
    _id: string;
    name: string;
    avatar?: string;
    headline?: string;
    currentCompany?: string;
    graduationYear?: number;
    department?: string;
}

interface PendingRequest {
    requestId: string;
    user: ConnectionPerson;
    createdAt: string;
}

const Directory = () => {
    const [alumni, setAlumni] = useState<Alumni[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [batchFilter, setBatchFilter] = useState<string>('all');
    const [deptFilter, setDeptFilter] = useState<string>('all');
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, { status: string; requestId?: string }>>({});
    const [actionInProgress, setActionInProgress] = useState<Set<string>>(new Set());

    // Network tabs
    const [mainTab, setMainTab] = useState<'explore' | 'network'>('explore');
    const [networkTab, setNetworkTab] = useState<'requests' | 'following' | 'connections'>('requests');
    const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
    const [pendingSent, setPendingSent] = useState<PendingRequest[]>([]);
    const [myConnections, setMyConnections] = useState<ConnectionPerson[]>([]);
    const [networkLoading, setNetworkLoading] = useState(false);
    const [mutualData, setMutualData] = useState<Record<string, { mutualCount: number; mutuals: { _id: string; name: string; avatar?: string; headline?: string }[] }>>({});
    const [mutualPopup, setMutualPopup] = useState<string | null>(null);
    const mutualPopupRef = useRef<HTMLDivElement>(null);

    // Close mutual popup on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (mutualPopupRef.current && !mutualPopupRef.current.contains(e.target as Node)) {
                setMutualPopup(null);
            }
        };
        if (mutualPopup) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [mutualPopup]);

    useEffect(() => {
        fetchAlumni();
        // Fetch pending requests count on mount so badge shows on Explore tab
        api.get('/connections/pending-received').then(res => setPendingReceived(res.data)).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAlumni = async () => {
        try {
            const res = await api.get('/users/directory');
            setAlumni(res.data.users);
            const users = res.data.users as Alumni[];
            if (users.length > 0) {
                const userIds = users.map(u => u._id);
                // Fetch connection statuses and mutual connections in batch
                const [statusRes, mutualRes] = await Promise.allSettled([
                    api.post('/connections/status-batch', { userIds }),
                    api.post('/connections/mutual-batch', { userIds }),
                ]);
                if (statusRes.status === 'fulfilled') {
                    setConnectionStatuses(statusRes.value.data.statuses || {});
                }
                if (mutualRes.status === 'fulfilled') {
                    setMutualData(mutualRes.value.data.mutuals || {});
                }
            }
        } catch (error) {
            console.error('Failed to fetch alumni:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchNetworkData = useCallback(async () => {
        setNetworkLoading(true);
        try {
            const [recvRes, sentRes, connRes] = await Promise.allSettled([
                api.get('/connections/pending-received'),
                api.get('/connections/pending-sent'),
                api.get('/connections/my-connections'),
            ]);
            if (recvRes.status === 'fulfilled') setPendingReceived(recvRes.value.data);
            if (sentRes.status === 'fulfilled') setPendingSent(sentRes.value.data);
            if (connRes.status === 'fulfilled') setMyConnections(connRes.value.data);
        } catch (error) {
            console.error('Failed to fetch network data:', error);
        } finally {
            setNetworkLoading(false);
        }
    }, []);

    useEffect(() => {
        if (mainTab === 'network') {
            fetchNetworkData();
        }
    }, [mainTab, fetchNetworkData]);

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
        if (actionInProgress.has(id)) return;
        setActionInProgress(prev => new Set(prev).add(id));
        try {
            await api.post(`/connections/request/${id}`);
            setConnectionStatuses(prev => ({ ...prev, [id]: { status: 'pending_sent' } }));
            toast.show('Connection request sent', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send request';
            toast.show(msg, 'error');
        } finally {
            setActionInProgress(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const handleRespond = async (userId: string, requestId: string) => {
        if (actionInProgress.has(userId)) return;
        setActionInProgress(prev => new Set(prev).add(userId));
        try {
            await api.put(`/connections/accept/${requestId}`);
            setConnectionStatuses(prev => ({ ...prev, [userId]: { status: 'accepted' } }));
            try { await checkAuth(); } catch { /* ignore */ }
            toast.show('Connection accepted', 'success');
            // Refresh network data if on network tab
            if (mainTab === 'network') fetchNetworkData();
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to accept request';
            toast.show(msg, 'error');
        } finally {
            setActionInProgress(prev => { const s = new Set(prev); s.delete(userId); return s; });
        }
    };

    const handleCancelRequest = async (userId: string) => {
        if (actionInProgress.has(userId)) return;
        setActionInProgress(prev => new Set(prev).add(userId));
        try {
            await api.delete(`/connections/remove/${userId}`);
            setPendingSent(prev => prev.filter(r => r.user._id !== userId));
            setConnectionStatuses(prev => ({ ...prev, [userId]: { status: 'none' } }));
            toast.show('Request withdrawn', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel request';
            toast.show(msg, 'error');
        } finally {
            setActionInProgress(prev => { const s = new Set(prev); s.delete(userId); return s; });
        }
    };

    const handleRemoveConnection = async (userId: string) => {
        if (actionInProgress.has(userId)) return;
        setActionInProgress(prev => new Set(prev).add(userId));
        try {
            await api.delete(`/connections/remove/${userId}`);
            setMyConnections(prev => prev.filter(c => c._id !== userId));
            setConnectionStatuses(prev => ({ ...prev, [userId]: { status: 'none' } }));
            toast.show('Connection removed', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to remove connection';
            toast.show(msg, 'error');
        } finally {
            setActionInProgress(prev => { const s = new Set(prev); s.delete(userId); return s; });
        }
    };

    const handleDeclineRequest = async (userId: string) => {
        if (actionInProgress.has(userId)) return;
        setActionInProgress(prev => new Set(prev).add(userId));
        try {
            await api.delete(`/connections/remove/${userId}`);
            setPendingReceived(prev => prev.filter(r => r.user._id !== userId));
            toast.show('Request declined', 'success');
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to decline request';
            toast.show(msg, 'error');
        } finally {
            setActionInProgress(prev => { const s = new Set(prev); s.delete(userId); return s; });
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
            <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {/* Tab switcher skeleton */}
                <div className="flex gap-1 mb-5 bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-1.5">
                    <div className="flex-1 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                    <div className="flex-1 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                </div>
                {/* Search bar skeleton */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 sm:p-5 mb-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="flex gap-2">
                            <div className="w-28 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="w-32 h-10 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
                        </div>
                    </div>
                    <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse mt-3" />
                </div>
                {/* Alumni cards grid skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                            <div className="h-20 bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="px-5 pb-5 -mt-8">
                                <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] border-[3px] border-[var(--bg-secondary)] animate-pulse mb-3" />
                                <div className="space-y-2 mb-4">
                                    <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-3 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-2.5 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="flex-1 h-9 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Main Tab Switcher */}
            <div className="flex gap-1 mb-5 bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-1.5">
                <button
                    onClick={() => setMainTab('explore')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
                        mainTab === 'explore'
                            ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                    <Search size={16} /> Explore
                </button>
                <button
                    onClick={() => setMainTab('network')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-xl transition-all ${
                        mainTab === 'network'
                            ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                >
                    <Users size={16} /> My Network
                    {pendingReceived.length > 0 && mainTab !== 'network' && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{pendingReceived.length}</span>
                    )}
                </button>
            </div>

            {mainTab === 'explore' && (
                <>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredAlumni.map((person, index) => (
                        <motion.div
                            key={person._id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.03, 0.5) }}
                            className="group bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl hover:border-[var(--border-color)]/60 transition-all"
                        >
                            {/* Card Header */}
                            <div className="h-20 bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent overflow-hidden rounded-t-2xl">
                                {person.coverImage && (
                                    <CachedImage src={person.coverImage} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" compact />
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="px-5 pb-5 -mt-8">
                                {/* Avatar */}
                                <Link to={`/profile/${person._id}`} className="inline-block mb-3">
                                    <div className="w-16 h-16 rounded-full bg-[var(--accent)] border-[3px] border-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                                        <Avatar src={person.avatar} iconSize={28} />
                                    </div>
                                </Link>

                                {/* Info */}
                                <div className="min-w-0 mb-4">
                                    <h3 className="font-semibold text-[var(--text-primary)] truncate text-base">
                                        <Link to={`/profile/${person._id}`} className="hover:underline">{person.name}</Link>
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">
                                        {person.headline || `${person.degree} · ${person.department || 'MIC College'}`}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-0.5">
                                            <GraduationCap size={12} /> {person.graduationYear}
                                        </span>
                                        {person.currentLocation && (
                                            <>
                                                <span>·</span>
                                                <span className="flex items-center gap-0.5 truncate">
                                                    <MapPin size={12} /> {person.currentLocation}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Mutual Connections */}
                                {mutualData[person._id]?.mutualCount > 0 && (
                                    <div className="relative mb-3">
                                        <button
                                            onClick={(e) => { e.preventDefault(); setMutualPopup(mutualPopup === person._id ? null : person._id); }}
                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                        >
                                            <div className="flex -space-x-2">
                                                {mutualData[person._id].mutuals.slice(0, 4).map(m => (
                                                    <div key={m._id} className="w-6 h-6 rounded-full overflow-hidden border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center">
                                                        <Avatar src={m.avatar} alt={m.name} iconSize={10} imgClassName="w-full h-full object-cover" iconClassName="text-[var(--text-muted)]" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-[var(--text-muted)]">
                                                {mutualData[person._id].mutualCount} mutual{mutualData[person._id].mutualCount !== 1 ? 's' : ''}
                                            </span>
                                        </button>
                                        {mutualPopup === person._id && (
                                            <div ref={mutualPopupRef} className="absolute left-0 bottom-full mb-1 z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)]/40 rounded-xl shadow-lg p-3 w-56">
                                                <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Mutual connections</p>
                                                <div className="space-y-2">
                                                    {mutualData[person._id].mutuals.map(m => (
                                                        <Link
                                                            key={m._id}
                                                            to={`/profile/${m._id}`}
                                                            onClick={() => setMutualPopup(null)}
                                                            className="flex items-center gap-2 hover:bg-[var(--bg-tertiary)] rounded-lg p-1.5 transition-colors"
                                                        >
                                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                                                                <Avatar src={m.avatar} alt={m.name} iconSize={12} imgClassName="w-full h-full object-cover" iconClassName="text-[var(--text-muted)]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{m.name}</p>
                                                                {m.headline && <p className="text-[10px] text-[var(--text-muted)] truncate">{m.headline}</p>}
                                                            </div>
                                                        </Link>
                                                    ))}
                                                    {mutualData[person._id].mutualCount > 4 && (
                                                        <p className="text-[10px] text-[var(--text-muted)] text-center pt-1">+{mutualData[person._id].mutualCount - 4} more</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action */}
                                <div className="flex gap-2">
                                    <Link
                                        to={`/profile/${person._id}`}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] font-medium text-sm rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <User size={14} /> Profile
                                    </Link>
                                    <ConnectionButton person={person} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
                </>
            )}

            {mainTab === 'network' && (
                <>
                    {/* Network Sub-tabs */}
                    <div className="flex gap-1 mb-5 bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-1.5">
                        {([
                            { key: 'requests' as const, label: 'Requests', icon: UserPlus, count: pendingReceived.length },
                            { key: 'following' as const, label: 'Sent Requests', icon: Send, count: pendingSent.length },
                            { key: 'connections' as const, label: 'Connections', icon: UserCheck, count: myConnections.length },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setNetworkTab(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-xl transition-all ${
                                    networkTab === tab.key
                                        ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                                <tab.icon size={15} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                    networkTab === tab.key
                                        ? 'bg-[var(--bg-primary)]/20'
                                        : 'bg-[var(--accent-light)] text-[var(--text-primary)]'
                                }`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {networkLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                        <div className="h-2.5 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    </div>
                                    <div className="w-20 h-8 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Requests Tab */}
                            {networkTab === 'requests' && (
                                <div className="space-y-3">
                                    {pendingReceived.length === 0 ? (
                                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-6 sm:p-12 text-center">
                                            <UserPlus className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                                            <p className="text-[var(--text-primary)] font-medium">No pending requests</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">When someone sends you a connection request, it will appear here</p>
                                        </div>
                                    ) : (
                                        pendingReceived.map((req, idx) => (
                                            <motion.div
                                                key={req.requestId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 flex items-center gap-4"
                                            >
                                                <Link to={`/profile/${req.user._id}`}>
                                                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        <Avatar src={req.user.avatar} iconSize={20} />
                                                    </div>
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link to={`/profile/${req.user._id}`} className="font-semibold text-sm text-[var(--text-primary)] hover:underline">{req.user.name}</Link>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate">{req.user.headline || req.user.currentCompany || ''}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleRespond(req.user._id, req.requestId)}
                                                        className="flex items-center gap-1.5 py-2 px-3 bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-xs rounded-lg hover:opacity-90 transition-all"
                                                    >
                                                        <UserPlus size={13} /> Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeclineRequest(req.user._id)}
                                                        className="flex items-center gap-1.5 py-2 px-3 border border-[var(--border-color)]/40 text-[var(--text-secondary)] font-medium text-xs rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                                    >
                                                        <X size={13} /> Decline
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Following / Sent Requests Tab */}
                            {networkTab === 'following' && (
                                <div className="space-y-3">
                                    {pendingSent.length === 0 ? (
                                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-6 sm:p-12 text-center">
                                            <Send className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                                            <p className="text-[var(--text-primary)] font-medium">No sent requests</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">Requests you've sent that are waiting for a response will appear here</p>
                                        </div>
                                    ) : (
                                        pendingSent.map((req, idx) => (
                                            <motion.div
                                                key={req.requestId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 flex items-center gap-4"
                                            >
                                                <Link to={`/profile/${req.user._id}`}>
                                                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        <Avatar src={req.user.avatar} iconSize={20} />
                                                    </div>
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link to={`/profile/${req.user._id}`} className="font-semibold text-sm text-[var(--text-primary)] hover:underline">{req.user.name}</Link>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate">{req.user.headline || req.user.currentCompany || ''}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Sent {new Date(req.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="flex items-center gap-1.5 py-2 px-3 bg-[var(--accent)]/8 text-[var(--accent)] font-medium text-xs rounded-lg">
                                                        <Clock size={13} /> Pending
                                                    </span>
                                                    <button
                                                        onClick={() => handleCancelRequest(req.user._id)}
                                                        className="flex items-center gap-1.5 py-2 px-3 border border-[var(--border-color)]/40 text-[var(--text-secondary)] font-medium text-xs rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                                    >
                                                        <UserMinus size={13} /> Withdraw
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Connections Tab */}
                            {networkTab === 'connections' && (
                                <div className="space-y-3">
                                    {myConnections.length === 0 ? (
                                        <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-6 sm:p-12 text-center">
                                            <Users className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                                            <p className="text-[var(--text-primary)] font-medium">No connections yet</p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">Start connecting with alumni from the Explore tab</p>
                                        </div>
                                    ) : (
                                        myConnections.map((person, idx) => (
                                            <motion.div
                                                key={person._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl p-4 flex items-center gap-4"
                                            >
                                                <Link to={`/profile/${person._id}`}>
                                                    <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        <Avatar src={person.avatar} iconSize={20} />
                                                    </div>
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link to={`/profile/${person._id}`} className="font-semibold text-sm text-[var(--text-primary)] hover:underline">{person.name}</Link>
                                                    <p className="text-xs text-[var(--text-secondary)] truncate">{person.headline || ''}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Link
                                                        to={`/profile/${person._id}`}
                                                        className="flex items-center gap-1.5 py-2 px-3 bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)] font-medium text-xs rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                                    >
                                                        <User size={13} /> Profile
                                                    </Link>
                                                    <button
                                                        onClick={() => handleRemoveConnection(person._id)}
                                                        className="flex items-center gap-1.5 py-2 px-3 border border-red-500/30 text-red-400 font-medium text-xs rounded-lg hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <UserMinus size={13} /> Remove
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Directory;
