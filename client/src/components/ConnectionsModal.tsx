import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariant } from './animation/motionVariants';
import { useNavigate } from 'react-router-dom';
import { X, Users, Lock, Search } from 'lucide-react';
import api from '../lib/api';
import Avatar from './ui/Avatar';

interface ConnectionUser {
    _id: string;
    name: string;
    avatar?: string;
    headline?: string;
    isMutual?: boolean;
}

interface ConnectionsModalProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    defaultTab?: 'all' | 'mutual';
}

export default function ConnectionsModal({ open, onClose, userId, userName, defaultTab = 'all' }: ConnectionsModalProps) {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<ConnectionUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [restricted, setRestricted] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'mutual'>(defaultTab);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        api.get(`/connections/user/${userId}`)
            .then(res => {
                if (cancelled) return;
                setConnections(res.data.connections || []);
                setRestricted(res.data.restricted || false);
            })
            .catch(() => {
                if (cancelled) return;
                setConnections([]);
                setRestricted(false);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [open, userId]);

    const mutualCount = connections.filter(c => c.isMutual).length;

    const tabFiltered = useMemo(() => {
        if (activeTab === 'mutual') return connections.filter(c => c.isMutual);
        return connections;
    }, [connections, activeTab]);

    const filtered = useMemo(() => {
        if (!search.trim()) return tabFiltered;
        const q = search.toLowerCase();
        return tabFiltered.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.headline && c.headline.toLowerCase().includes(q))
        );
    }, [tabFiltered, search]);

    // Sort: mutuals first (only relevant on "all" tab)
    const sorted = useMemo(() => {
        if (activeTab === 'mutual') return filtered;
        return [...filtered].sort((a, b) => {
            if (a.isMutual && !b.isMutual) return -1;
            if (!a.isMutual && b.isMutual) return 1;
            return 0;
        });
    }, [filtered, activeTab]);

    const handleClose = () => {
        setSearch('');
        onClose();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose}>
                    <motion.div
                        className="bg-[var(--bg-secondary)] w-full max-w-md max-h-[70vh] flex flex-col rounded-xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                        variants={modalVariant}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--border-color)]/30 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-[var(--accent)]" />
                            <h3 className="font-semibold text-[var(--text-primary)]">{userName}&apos;s Connections</h3>
                        </div>
                        <button onClick={handleClose} className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                            <X size={20} className="text-[var(--text-muted)]" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                {!loading && !restricted && (
                    <div className="flex border-b border-[var(--border-color)]/30 shrink-0">
                        <button
                            onClick={() => { setActiveTab('all'); setSearch(''); }}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                                activeTab === 'all'
                                    ? 'text-[var(--accent)]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                            All ({connections.length})
                            {activeTab === 'all' && (
                                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--accent)] rounded-full" />
                            )}
                        </button>
                        {mutualCount > 0 && (
                            <button
                                onClick={() => { setActiveTab('mutual'); setSearch(''); }}
                                className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                                    activeTab === 'mutual'
                                        ? 'text-[var(--accent)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                Mutual ({mutualCount})
                                {activeTab === 'mutual' && (
                                    <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[var(--accent)] rounded-full" />
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Search */}
                {!loading && !restricted && tabFiltered.length > 0 && (
                    <div className="px-4 pt-3 shrink-0">
                        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
                            <Search size={16} className="text-[var(--text-muted)] shrink-0" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={activeTab === 'mutual' ? 'Search mutual connections...' : 'Search connections...'}
                                className="bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-full"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="shrink-0">
                                    <X size={14} className="text-[var(--text-muted)]" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : restricted ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Lock size={32} className="text-[var(--text-muted)] mb-3" />
                            <p className="text-[var(--text-secondary)] font-medium">Connections list is private</p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">This user has restricted who can see their connections.</p>
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            {search ? (
                                <>
                                    <Search size={32} className="text-[var(--text-muted)] mb-3" />
                                    <p className="text-[var(--text-secondary)]">No results for &quot;{search}&quot;</p>
                                </>
                            ) : activeTab === 'mutual' ? (
                                <>
                                    <Users size={32} className="text-[var(--text-muted)] mb-3" />
                                    <p className="text-[var(--text-secondary)]">No mutual connections</p>
                                </>
                            ) : (
                                <>
                                    <Users size={32} className="text-[var(--text-muted)] mb-3" />
                                    <p className="text-[var(--text-secondary)]">No connections yet</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {sorted.map(conn => (
                                <button
                                    key={conn._id}
                                    onClick={() => {
                                        handleClose();
                                        navigate(`/profile/${conn._id}`);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-tertiary)] shrink-0 flex items-center justify-center">
                                        <Avatar src={conn.avatar} alt={conn.name} iconSize={20} imgClassName="w-full h-full object-cover" iconClassName="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{conn.name}</p>
                                            {conn.isMutual && activeTab === 'all' && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent)]/15 text-[var(--accent)] rounded-full shrink-0 font-medium">Mutual</span>
                                            )}
                                        </div>
                                        {conn.headline && (
                                            <p className="text-xs text-[var(--text-muted)] truncate">{conn.headline}</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
