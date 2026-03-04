import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bookmark, Plus, X, FolderPlus, Grid, List,
    Heart, MessageCircle, Globe, Users, Link2,
    MoreHorizontal, Trash2, Edit3, ChevronLeft
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import resolveMediaUrl from '../lib/media';
import Avatar from '../components/ui/Avatar';
import api from '../lib/api';

interface Post {
    _id: string;
    author: {
        _id: string;
        name: string;
        headline?: string;
        avatar?: string;
        graduationYear?: number;
        degree?: string;
    };
    content: string;
    media: { type: 'image' | 'video'; url: string }[];
    likes: string[];
    comments: any[];
    createdAt: string;
    visibility?: 'public' | 'connections';
}

interface Collection {
    _id: string;
    name: string;
    postCount: number;
    coverImage?: string;
    isDefault?: boolean;
    updatedAt: string;
}

const Saved = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();
    
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [allSavedPostIds, setAllSavedPostIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');

    const [showCollectionMenu, setShowCollectionMenu] = useState<string | null>(null);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [editCollectionName, setEditCollectionName] = useState('');
    const [showSaveToCollectionModal, setShowSaveToCollectionModal] = useState(false);
    const [postToSave, setPostToSave] = useState<Post | null>(null);

    useEffect(() => {
        fetchCollections();
        fetchAllSavedPosts();
    }, []);

    const fetchCollections = async () => {
        try {
            const res = await api.get('/saved/collections');
            setCollections(res.data);
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        }
    };

    const fetchAllSavedPosts = async () => {
        try {
            const res = await api.get('/saved/all');
            setPosts(res.data.posts || []);
            setAllSavedPostIds(res.data.savedPostIds || []);
        } catch (error) {
            console.error('Failed to fetch saved posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCollectionPosts = async (collectionId: string) => {
        try {
            setLoading(true);
            const res = await api.get(`/saved/collections/${collectionId}`);
            setPosts(res.data.posts || []);
        } catch (error) {
            console.error('Failed to fetch collection posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCollection = (collection: Collection | null) => {
        setSelectedCollection(collection);
        if (collection) {
            fetchCollectionPosts(collection._id);
        } else {
            fetchAllSavedPosts();
        }
    };

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        try {
            const res = await api.post('/saved/collections', { name: newCollectionName });
            setCollections([...collections, res.data]);
            setNewCollectionName('');
            setShowNewCollectionModal(false);
            toast.show('Collection created!', 'success');
        } catch (error: any) {
            toast.show(error.response?.data?.message || 'Failed to create collection', 'error');
        }
    };

    const handleDeleteCollection = async (collectionId: string) => {
        const ok = await confirm({ title: 'Delete Collection', message: 'Delete this collection? Posts will remain saved in "All Saved".', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/saved/collections/${collectionId}`);
            setCollections(collections.filter(c => c._id !== collectionId));
            if (selectedCollection?._id === collectionId) {
                setSelectedCollection(null);
                fetchAllSavedPosts();
            }
            toast.show('Collection deleted', 'success');
        } catch (error: any) {
            toast.show(error.response?.data?.message || 'Failed to delete collection', 'error');
        }
    };

    const handleRenameCollection = async () => {
        if (!editingCollection || !editCollectionName.trim()) return;
        try {
            await api.put(`/saved/collections/${editingCollection._id}`, { name: editCollectionName });
            setCollections(collections.map(c => c._id === editingCollection._id ? { ...c, name: editCollectionName } : c));
            setEditingCollection(null);
            setEditCollectionName('');
            toast.show('Collection renamed', 'success');
        } catch (error: any) {
            toast.show(error.response?.data?.message || 'Failed to rename collection', 'error');
        }
    };

    const handleUnsavePost = async (postId: string) => {
        try {
            if (selectedCollection) {
                await api.delete(`/saved/collections/${selectedCollection._id}/remove/${postId}`);
            } else {
                await api.delete(`/saved/unsave/${postId}`);
            }
            setPosts(posts.filter(p => p._id !== postId));
            setAllSavedPostIds(allSavedPostIds.filter(id => id !== postId));
            fetchCollections();
            toast.show('Post unsaved', 'success');
        } catch (error) {
            toast.show('Failed to unsave post', 'error');
        }
    };

    const handleAddToCollection = async (postId: string, collectionId: string) => {
        try {
            await api.post(`/saved/collections/${collectionId}/add/${postId}`);
            fetchCollections();
            setShowSaveToCollectionModal(false);
            setPostToSave(null);
            toast.show('Added to collection', 'success');
        } catch (error) {
            toast.show('Failed to add to collection', 'error');
        }
    };

    const handleCopyLink = (postId: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/feed?post=${postId}`);
        toast.show('Link copied!', 'success');
    };

    const normalizeMediaUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/uploads')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const parsed = new URL(url);
                return parsed.pathname;
            } catch {
                return url;
            }
        }
        if (url.startsWith('uploads/')) return `/${url}`;
        return `/uploads/${url}`;
    };

    const getTimeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return date.toLocaleDateString();
    };

    if (loading && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Loading saved posts...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                <aside className="lg:sticky lg:top-[76px] lg:h-fit">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden shadow-md shadow-black/5 rounded-2xl"
                    >
                        <div className="p-5 border-b border-[var(--border-color)]/50">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                                    <Bookmark size={20} className="text-[var(--accent)]" />
                                    Collections
                                </h2>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowNewCollectionModal(true)}
                                    className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <Plus size={18} className="text-[var(--accent)]" />
                                </motion.button>
                            </div>
                        </div>
                        
                        <div className="p-3">
                            <button
                                onClick={() => handleSelectCollection(null)}
                                className={`w-full flex items-center gap-3 p-3 transition-all ${!selectedCollection ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                            >
                                <div className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center">
                                    <Bookmark size={20} className="text-[var(--bg-primary)]" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-sm">All Saved</p>
                                    <p className="text-xs text-[var(--text-muted)]">{allSavedPostIds.length} posts</p>
                                </div>
                            </button>
                            
                            {collections.filter(c => !c.isDefault).map(collection => (
                                <div key={collection._id} className="relative">
                                    <button
                                        onClick={() => handleSelectCollection(collection)}
                                        className={`w-full flex items-center gap-3 p-3 transition-all mt-1 ${selectedCollection?._id === collection._id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
                                    >
                                        <div className="w-12 h-12 bg-[var(--bg-tertiary)] overflow-hidden">
                                            {collection.coverImage ? (
                                                <img src={normalizeMediaUrl(collection.coverImage)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FolderPlus size={20} className="text-[var(--text-muted)]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold text-sm truncate">{collection.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{collection.postCount} posts</p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowCollectionMenu(showCollectionMenu === collection._id ? null : collection._id); }}
                                            className="p-1.5 hover:bg-[var(--bg-tertiary)]"
                                        >
                                            <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                                        </button>
                                    </button>
                                    
                                    <AnimatePresence>
                                        {showCollectionMenu === collection._id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-3 top-14 z-20 bg-[var(--bg-secondary)] border border-[var(--border-color)]/50 shadow-md p-1 min-w-[120px]"
                                            >
                                                <button
                                                    onClick={() => { setEditingCollection(collection); setEditCollectionName(collection.name); setShowCollectionMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)]"
                                                >
                                                    <Edit3 size={14} /> Rename
                                                </button>
                                                <button
                                                    onClick={() => { handleDeleteCollection(collection._id); setShowCollectionMenu(null); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--accent)]/10"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                            
                            <button
                                onClick={() => setShowNewCollectionModal(true)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] mt-2 border border-dashed border-[var(--border-color)]"
                            >
                                <div className="w-12 h-12 border-2 border-dashed border-[var(--border-color)] flex items-center justify-center">
                                    <Plus size={20} />
                                </div>
                                <span className="text-sm font-medium">New Collection</span>
                            </button>
                        </div>
                    </motion.div>
                </aside>
                
                <main>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-5 mb-5 shadow-md shadow-black/5 rounded-2xl"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {selectedCollection && (
                                    <button onClick={() => handleSelectCollection(null)} className="p-2 hover:bg-[var(--bg-tertiary)]">
                                        <ChevronLeft size={20} className="text-[var(--text-muted)]" />
                                    </button>
                                )}
                                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                                    {selectedCollection ? selectedCollection.name : 'All Saved Posts'}
                                </h1>
                                <span className="text-sm text-[var(--text-muted)]">({posts.length} posts)</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2.5 transition-all ${viewMode === 'grid' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2.5 transition-all ${viewMode === 'list' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                    
                    {posts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 sm:p-12 text-center shadow-md"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent)]/10 flex items-center justify-center">
                                <Bookmark size={32} className="text-[var(--accent)]" />
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">No saved posts yet</h3>
                            <p className="text-[var(--text-muted)] mt-2">Save posts from your feed to view them here</p>
                            <Link to="/feed" className="inline-block mt-6 px-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold shadow-sm shadow-[var(--accent)]/25">
                                Go to Feed
                            </Link>
                        </motion.div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <AnimatePresence>
                                {posts.map((post, index) => (
                                    <motion.div
                                        key={post._id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative aspect-square bg-[var(--bg-tertiary)] overflow-hidden group cursor-pointer"
                                        onClick={() => navigate(`/feed?post=${post._id}`)}
                                    >
                                        {post.media && post.media.length > 0 ? (
                                            post.media[0].type === 'image' ? (
                                                <img src={normalizeMediaUrl(post.media[0].url)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <video src={normalizeMediaUrl(post.media[0].url)} className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <div className="w-full h-full p-4 flex items-center justify-center">
                                                <p className="text-sm text-[var(--text-muted)] line-clamp-6 text-center">{post.content}</p>
                                            </div>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                                            <div className="flex items-center gap-1.5 text-[var(--bg-primary)]">
                                                <Heart size={18} fill="white" />
                                                <span className="font-semibold text-sm">{post.likes.length}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[var(--bg-primary)]">
                                                <MessageCircle size={18} fill="white" />
                                                <span className="font-semibold text-sm">{post.comments.length}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleCopyLink(post._id)}
                                                className="p-2 bg-[var(--bg-secondary)]/90 backdrop-blur-sm hover:bg-[var(--bg-secondary)] rounded-lg"
                                            >
                                                <Link2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setPostToSave(post); setShowSaveToCollectionModal(true); }}
                                                className="p-2 bg-[var(--bg-secondary)]/90 backdrop-blur-sm hover:bg-[var(--bg-secondary)]"
                                            >
                                                <FolderPlus size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleUnsavePost(post._id)}
                                                className="p-2 bg-[var(--bg-secondary)]/90 backdrop-blur-sm hover:bg-[var(--accent)] hover:text-[var(--bg-primary)]"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {posts.map((post, index) => (
                                    <motion.article
                                        key={post._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden shadow-md shadow-black/5 rounded-xl"
                                    >
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex gap-3">
                                                    <Link to={`/profile/${post.author._id}`}>
                                                        <div className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                                                            <Avatar src={post.author.avatar} iconSize={20} />
                                                        </div>
                                                    </Link>
                                                    <div>
                                                        <Link to={`/profile/${post.author._id}`} className="font-bold text-[var(--text-primary)] hover:text-[var(--accent)]">
                                                            {post.author.name}
                                                        </Link>
                                                        <p className="text-xs text-[var(--text-muted)]">{post.author.headline}</p>
                                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
                                                            <span>{getTimeAgo(post.createdAt)}</span>
                                                            <span>•</span>
                                                            {post.visibility === 'connections' ? <Users size={12} /> : <Globe size={12} />}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleCopyLink(post._id)}
                                                        className="p-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded-lg"
                                                    >
                                                        <Link2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setPostToSave(post); setShowSaveToCollectionModal(true); }}
                                                        className="p-2 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                                                    >
                                                        <FolderPlus size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUnsavePost(post._id)}
                                                        className="p-2 hover:bg-[var(--accent)]/10 text-[var(--text-secondary)]"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <p className="text-[var(--text-primary)] whitespace-pre-wrap mb-4">{post.content}</p>
                                            
                                            {post.media && post.media.length > 0 && (
                                                <div className={`overflow-hidden ${post.media.length > 1 ? 'grid grid-cols-2 gap-1' : ''}`}>
                                                    {post.media.slice(0, 4).map((m, idx) => (
                                                        <div key={idx} className={post.media.length === 3 && idx === 0 ? 'col-span-2' : ''}>
                                                            {m.type === 'image' ? (
                                                                <img src={normalizeMediaUrl(m.url)} alt="" className="w-full max-h-[400px] object-cover" />
                                                            ) : (
                                                                <video src={normalizeMediaUrl(m.url)} controls className="w-full max-h-[400px]" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-color)]/50 text-sm text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1">
                                                    <Heart size={16} /> {post.likes.length}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle size={16} /> {post.comments.length}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.article>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>
            
            <AnimatePresence>
                {showNewCollectionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowNewCollectionModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden shadow-md"
                        >
                            <div className="p-5 border-b border-[var(--border-color)]/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">New Collection</h3>
                                <button onClick={() => setShowNewCollectionModal(false)} className="p-2 hover:bg-[var(--bg-tertiary)]">
                                    <X size={18} className="text-[var(--text-muted)]" />
                                </button>
                            </div>
                            <div className="p-5">
                                <input
                                    type="text"
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    placeholder="Collection name"
                                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)]/50 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                                    autoFocus
                                />
                            </div>
                            <div className="p-5 pt-0 flex gap-3">
                                <button onClick={() => setShowNewCollectionModal(false)} className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                                    Cancel
                                </button>
                                <button onClick={handleCreateCollection} disabled={!newCollectionName.trim()} className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50">
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {editingCollection && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setEditingCollection(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden shadow-md"
                        >
                            <div className="p-5 border-b border-[var(--border-color)]/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Rename Collection</h3>
                                <button onClick={() => setEditingCollection(null)} className="p-2 hover:bg-[var(--bg-tertiary)]">
                                    <X size={18} className="text-[var(--text-muted)]" />
                                </button>
                            </div>
                            <div className="p-5">
                                <input
                                    type="text"
                                    value={editCollectionName}
                                    onChange={(e) => setEditCollectionName(e.target.value)}
                                    placeholder="Collection name"
                                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)]/50 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                                    autoFocus
                                />
                            </div>
                            <div className="p-5 pt-0 flex gap-3">
                                <button onClick={() => setEditingCollection(null)} className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                                    Cancel
                                </button>
                                <button onClick={handleRenameCollection} disabled={!editCollectionName.trim()} className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50">
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            
            <AnimatePresence>
                {showSaveToCollectionModal && postToSave && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowSaveToCollectionModal(false); setPostToSave(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden shadow-md"
                        >
                            <div className="p-5 border-b border-[var(--border-color)]/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Save to Collection</h3>
                                <button onClick={() => { setShowSaveToCollectionModal(false); setPostToSave(null); }} className="p-2 hover:bg-[var(--bg-tertiary)]">
                                    <X size={18} className="text-[var(--text-muted)]" />
                                </button>
                            </div>
                            
                            <div className="max-h-[300px] overflow-y-auto p-3">
                                {collections.map(collection => (
                                    <button
                                        key={collection._id}
                                        onClick={() => handleAddToCollection(postToSave._id, collection._id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <div className="w-11 h-11 bg-[var(--bg-tertiary)] overflow-hidden">
                                            {collection.coverImage ? (
                                                <img src={normalizeMediaUrl(collection.coverImage)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {collection.isDefault ? <Bookmark size={18} className="text-[var(--accent)]" /> : <FolderPlus size={18} className="text-[var(--text-muted)]" />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold text-[var(--text-primary)]">{collection.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{collection.postCount} posts</p>
                                        </div>
                                        <Plus size={16} className="text-[var(--accent)]" />
                                    </button>
                                ))}
                                
                                <button
                                    onClick={() => { setShowSaveToCollectionModal(false); setShowNewCollectionModal(true); }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] transition-colors mt-2 border border-dashed border-[var(--border-color)]"
                                >
                                    <div className="w-11 h-11 border-2 border-dashed border-[var(--border-color)] flex items-center justify-center">
                                        <Plus size={18} className="text-[var(--text-muted)]" />
                                    </div>
                                    <span className="font-medium text-[var(--text-muted)]">New Collection</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Saved;
