import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    MessageCircle,
    Image as ImageIcon, Video, Calendar, FileText, User,
    ThumbsUp, Bookmark, Globe, ChevronDown, X, Users, Trash2,
    Sparkles, TrendingUp, Award, ExternalLink
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import api from '../lib/api';
import Avatar from '../components/ui/Avatar';

interface Comment {
    _id: string;
    author: { _id: string; name: string; avatar?: string };
    text: string;
    createdAt: string;
}

interface Post {
    _id: string;
    author: {
        _id: string;
        name: string;
        headline: string;
        avatar?: string;
        graduationYear?: number;
        degree?: string;
    };
    content: string;
    media: { type: 'image' | 'video'; url: string }[];
    likes: string[];
    comments: Comment[];
    shares: number;
    createdAt: string;
    visibility?: 'public' | 'connections';
    status?: 'pending' | 'approved' | 'rejected';
}

interface PopulatedLiker {
    _id: string;
    name: string;
    avatar?: string;
}

interface DetailedPost extends Omit<Post, 'likes'> {
    likes: (string | PopulatedLiker)[];
}

interface NewsItem {
    _id: string;
    title: string;
    link?: string;
    publishedAt?: string;
    createdAt?: string;
}

const Feed = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const confirm = useConfirm();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [postAttachments, setPostAttachments] = useState<File[]>([]);
    const [postAttachmentPreviews, setPostAttachmentPreviews] = useState<{ url: string; name: string; type: string }[]>([]);
    const postFileInputRef = useRef<HTMLInputElement | null>(null);
    const [postVisibility, setPostVisibility] = useState<'public' | 'connections'>('public');
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [filter, setFilter] = useState<'all' | 'my'>('all');
    const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
    const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
    const [detailedPost, setDetailedPost] = useState<DetailedPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailCommentText, setDetailCommentText] = useState('');

    useEffect(() => {
        fetchPosts();
        fetchNews();
        if (isAuthenticated) fetchSavedPostIds();
        const onNews = () => fetchNews();
        window.addEventListener('news:updated', onNews as EventListener);
        return () => { window.removeEventListener('news:updated', onNews as EventListener); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isAuthenticated]);

    const normalizeMediaUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('/uploads')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try { return new URL(url).pathname; } catch { return url; }
        }
        if (url.startsWith('uploads/')) return `/${url}`;
        return `/uploads/${url}`;
    };

    const fetchNews = async () => {
        try {
            const res = await api.get('/public/news');
            setNewsItems(res.data.news || []);
        } catch { /* silent */ }
    };

    const fetchPosts = async () => {
        try {
            const endpoint = isAuthenticated ? '/posts' : '/public/feed';
            const res = await api.get(endpoint);
            const fetched: Post[] = res.data.posts || [];
            fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setPosts(fetched);
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const fetchSavedPostIds = async () => {
        try {
            const res = await api.get('/saved/all');
            setSavedPosts(new Set(res.data.savedPostIds || []));
        } catch { /* silent */ }
    };

    const myPosts = posts.filter(p => p.author._id === user?.id);
    const displayPosts = filter === 'my' ? myPosts : posts;

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && postAttachments.length === 0) return;
        try {
            let mediaPayload: { type: string; url: string }[] = [];
            if (postAttachments.length > 0) {
                const form = new FormData();
                postAttachments.forEach(f => form.append('media', f));
                setUploading(true);
                setUploadProgress(0);
                const uploadRes = await api.post('/upload/post-media', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (ev) => { if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100)); }
                });
                mediaPayload = uploadRes.data.media || [];
                setUploading(false);
            }
            const res = await api.post('/posts', { content: newPostContent, media: mediaPayload, visibility: postVisibility });
            setPosts([res.data.post, ...posts]);
            setNewPostContent('');
            setPostAttachments([]);
            postAttachmentPreviews.forEach(p => URL.revokeObjectURL(p.url));
            setPostAttachmentPreviews([]);
            setShowPostModal(false);
            const isApproved = res.data.post?.status === 'approved';
            toast.show(isApproved ? 'Post published!' : 'Post submitted for admin approval. It will appear in the feed once approved.', 'success');
        } catch { toast.show('Failed to create post', 'error'); }
    };

    const handleLike = async (postId: string) => {
        if (!isAuthenticated) { navigate('/login'); return; }
        try {
            await api.post(`/posts/${postId}/like`);
            setPosts(prev => prev.map(post => {
                if (post._id !== postId) return post;
                const userId = user?.id || '';
                const newLikes = post.likes.includes(userId) ? post.likes.filter(id => id !== userId) : [...post.likes, userId];
                return { ...post, likes: newLikes };
            }));
        } catch { /* silent */ }
    };

    const handleSave = async (postId: string) => {
        if (!isAuthenticated) { navigate('/login'); return; }
        const wasSaved = savedPosts.has(postId);
        setSavedPosts(prev => { const s = new Set(prev); if (wasSaved) { s.delete(postId); } else { s.add(postId); } return s; });
        try {
            if (wasSaved) { await api.delete(`/saved/unsave/${postId}`); toast.show('Unsaved', 'info'); }
            else { await api.post(`/saved/save/${postId}`); toast.show('Saved!', 'success'); }
        } catch {
            setSavedPosts(prev => { const s = new Set(prev); if (wasSaved) { s.add(postId); } else { s.delete(postId); } return s; });
            toast.show('Failed to save', 'error');
        }
    };

    const handleDelete = async (postId: string) => {
        const ok = await confirm({ title: 'Delete Post', message: 'Are you sure you want to delete this post? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/posts/${postId}`);
            setPosts(prev => prev.filter(p => p._id !== postId));
            toast.show('Post deleted', 'success');
        } catch { toast.show('Failed to delete', 'error'); }
    };

    const handleAddComment = async (postId: string) => {
        if (!isAuthenticated) { navigate('/login'); return; }
        if (!commentText.trim()) return;
        try {
            const res = await api.post(`/posts/${postId}/comment`, { text: commentText });
            setPosts(prev => prev.map(post => post._id === postId ? { ...post, comments: res.data.comments } : post));
            setCommentText('');
            setActiveCommentPost(null);
        } catch { /* silent */ }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        const ok = await confirm({ title: 'Delete Comment', message: 'Are you sure you want to delete this comment?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
            setPosts(prev => prev.map(post => post._id === postId ? { ...post, comments: res.data.comments } : post));
            // Also refresh detail modal if open
            if (detailedPost && detailedPost._id === postId) {
                const detailRes = await api.get(`/posts/detail/${postId}`);
                setDetailedPost(detailRes.data.post);
            }
            toast.show('Comment deleted', 'success');
        } catch { toast.show('Failed to delete comment', 'error'); }
    };

    const isPostLiked = (post: Post) => user?.id ? post.likes.includes(user.id) : false;

    const handleViewDetail = async (postId: string) => {
        setDetailLoading(true);
        setDetailedPost(null);
        try {
            const res = await api.get(`/posts/detail/${postId}`);
            setDetailedPost(res.data.post);
        } catch {
            toast.show('Failed to load post details', 'error');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDetailLike = async () => {
        if (!isAuthenticated || !detailedPost) { navigate('/login'); return; }
        try {
            await api.post(`/posts/${detailedPost._id}/like`);
            const userId = user?.id || '';
            // Update local posts list
            setPosts(prev => prev.map(post => {
                if (post._id !== detailedPost._id) return post;
                const newLikes = post.likes.includes(userId) ? post.likes.filter(id => id !== userId) : [...post.likes, userId];
                return { ...post, likes: newLikes };
            }));
            // Refresh detail
            const res = await api.get(`/posts/detail/${detailedPost._id}`);
            setDetailedPost(res.data.post);
        } catch { /* silent */ }
    };

    const handleDetailComment = async () => {
        if (!isAuthenticated || !detailedPost) { navigate('/login'); return; }
        if (!detailCommentText.trim()) return;
        try {
            const res = await api.post(`/posts/${detailedPost._id}/comment`, { text: detailCommentText });
            setPosts(prev => prev.map(post => post._id === detailedPost._id ? { ...post, comments: res.data.comments } : post));
            setDetailCommentText('');
            // Refresh detail
            const detailRes = await api.get(`/posts/detail/${detailedPost._id}`);
            setDetailedPost(detailRes.data.post);
        } catch { /* silent */ }
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return new Date(dateStr).toLocaleDateString();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const list = Array.from(files);
        const errors: string[] = [];
        const valid: File[] = [];
        list.forEach(f => {
            const prefix = f.type.split('/')[0];
            if (!['image', 'video', 'application', 'text'].includes(prefix)) { errors.push(`${f.name}: Unsupported type`); return; }
            if (f.type.startsWith('image') && f.size > 10 * 1024 * 1024) { errors.push(`${f.name}: Image too large (max 10MB)`); return; }
            if (f.type.startsWith('video') && f.size > 50 * 1024 * 1024) { errors.push(`${f.name}: Video too large (max 50MB)`); return; }
            valid.push(f);
        });
        setFileErrors(errors);
        if (valid.length) {
            setPostAttachments(prev => [...prev, ...valid]);
            setPostAttachmentPreviews(prev => [...prev, ...valid.map(f => ({ url: URL.createObjectURL(f), name: f.name, type: f.type }))]);
        }
        if (postFileInputRef.current) postFileInputRef.current.value = '';
    };

    // Glass card utility
    const glass = 'bg-[var(--bg-secondary)]/60 backdrop-blur-xl border border-[var(--border-color)]/30 rounded-2xl shadow-sm';

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Loading feed...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-6">
            {/* Mobile Filter */}
            {isAuthenticated && (
                <div className="lg:hidden mb-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[var(--accent)] rounded-full flex items-center justify-center overflow-hidden">
                        <Avatar src={user?.avatar} iconSize={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{user?.name}</p>
                    </div>
                    <div className="flex gap-1.5">
                        {(['all', 'my'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${filter === f ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)]/80 text-[var(--text-muted)]'}`}
                            >{f === 'all' ? 'All' : 'Mine'}</button>
                        ))}
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 ${isAuthenticated ? 'lg:grid-cols-[220px_1fr_280px]' : 'lg:grid-cols-[1fr_280px]'} gap-5`}>

                {/* Left Sidebar */}
                {isAuthenticated && (
                    <aside className="hidden lg:block">
                        <div className={`${glass} overflow-hidden sticky top-[72px]`}>
                            <div className="h-16 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] rounded-t-2xl" />
                            <div className="px-4 -mt-8 flex justify-center">
                                <Link to="/profile">
                                    <div className="w-16 h-16 bg-[var(--accent)] rounded-full border-[3px] border-[var(--bg-primary)] flex items-center justify-center shadow-lg overflow-hidden">
                                        <Avatar src={user?.avatar} iconSize={24} />
                                    </div>
                                </Link>
                            </div>
                            <div className="p-4 pt-3 text-center">
                                <Link to="/profile" className="font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors text-sm">
                                    {user?.name}
                                </Link>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    {user?.degree || 'Alumni'} · {user?.graduationYear || '2020'}
                                </p>
                            </div>
                            <div className="px-3 pb-3 space-y-0.5">
                                {([['all', 'All Posts', Globe, posts.length], ['my', 'My Posts', User, myPosts.length]] as const).map(([key, label, Icon, count]) => (
                                    <button key={key} onClick={() => setFilter(key as 'all' | 'my')}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${filter === key ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/60'}`}
                                    >
                                        <span className="flex items-center gap-2"><Icon size={14} />{label}</span>
                                        <span className="text-[10px] font-bold bg-[var(--bg-tertiary)]/80 px-2 py-0.5 rounded-full">{count}</span>
                                    </button>
                                ))}
                                <Link to="/saved" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)]/60 transition-all">
                                    <Bookmark size={14} />Saved
                                </Link>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Main Feed */}
                <div className="space-y-4">
                    {/* Create Post / Welcome CTA */}
                    {isAuthenticated ? (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={glass + ' p-4'}>
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    <Avatar src={user?.avatar} iconSize={18} />
                                </div>
                                <button onClick={() => setShowPostModal(true)}
                                    className="flex-1 text-left px-4 py-2.5 bg-[var(--bg-tertiary)]/60 hover:bg-[var(--bg-tertiary)] rounded-full border border-[var(--border-color)]/30 text-[var(--text-muted)] text-sm transition-all"
                                >
                                    Share something with the community...
                                </button>
                            </div>
                            <div className="flex gap-1 mt-3 pt-3 border-t border-[var(--border-color)]/20">
                                {[
                                    { icon: ImageIcon, label: 'Media', color: 'text-[var(--accent)]' },
                                    { icon: Calendar, label: 'Event', color: 'text-[var(--text-secondary)]' },
                                    { icon: FileText, label: 'Article', color: 'text-[var(--text-secondary)]' },
                                ].map(({ icon: Icon, label, color }) => (
                                    <button key={label} onClick={() => setShowPostModal(true)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)]/60 transition-colors"
                                    >
                                        <Icon size={16} className={color} />
                                        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-[var(--accent)]/8 to-[var(--accent-hover)]/8 backdrop-blur-xl border border-[var(--accent)]/15 rounded-2xl p-5"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-[var(--accent)]/15 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Users size={20} className="text-[var(--accent)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-[var(--text-primary)] text-sm">Welcome to the Alumni Network</h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Join to connect and share with fellow alumni.</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Link to="/login" className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors hidden sm:block">Sign In</Link>
                                    <Link to="/register" className="px-4 py-1.5 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold rounded-full transition-all hover:shadow-md hover:shadow-[var(--accent)]/25">Join Now</Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Posts */}
                    <AnimatePresence mode="popLayout">
                        {displayPosts.map((post, index) => {
                            const liked = isPostLiked(post);
                            return (
                                <motion.article
                                    key={post._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.03 }}
                                    className={glass + ' overflow-hidden'}
                                >
                                    {/* Post Header */}
                                    <div className="p-4 pb-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    <Avatar src={post.author.avatar} iconSize={18} />
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => navigate(`/profile/${post.author._id}`)}
                                                        className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                                                    >
                                                        {post.author.name}
                                                    </button>
                                                    {post.author.headline && (
                                                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{post.author.headline}</p>
                                                    )}
                                                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5">
                                                        <span>{getTimeAgo(post.createdAt)}</span>
                                                        <span>·</span>
                                                        {post.visibility === 'connections' ? <Users size={10} /> : <Globe size={10} />}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleSave(post._id)}
                                                className={`p-2 rounded-full transition-all ${savedPosts.has(post._id) ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-tertiary)]/60 text-[var(--text-muted)]'}`}
                                            >
                                                <Bookmark size={16} fill={savedPosts.has(post._id) ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Post Content */}
                                    <div className="px-4 py-3 cursor-pointer" onClick={() => handleViewDetail(post._id)}>
                                        {post.status === 'pending' && post.author._id === user?.id && (
                                            <div className="mb-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium" onClick={e => e.stopPropagation()}>
                                                Pending admin approval — only visible to you
                                            </div>
                                        )}
                                        {post.status === 'rejected' && post.author._id === user?.id && (
                                            <div className="mb-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium" onClick={e => e.stopPropagation()}>
                                                This post was rejected by an administrator
                                            </div>
                                        )}
                                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed hover:text-[var(--accent)] transition-colors">{post.content}</p>
                                    </div>

                                    {/* Post Media */}
                                    {post.media?.length > 0 && (
                                        <div className={post.media.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
                                            {post.media.map((m, idx) => (
                                                <div key={idx} className={post.media.length === 1 ? '' : post.media.length === 3 && idx === 0 ? 'col-span-2' : ''}>
                                                    {m.type === 'image' ? (
                                                        <img src={normalizeMediaUrl(m.url)} alt="" className="w-full max-h-[480px] object-cover" loading="lazy" />
                                                    ) : (
                                                        <video src={normalizeMediaUrl(m.url)} controls className="w-full max-h-[480px]" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Engagement Stats */}
                                    <div className="px-4 py-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1.5">
                                            {post.likes.length > 0 && (
                                                <>
                                                    <div className="w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                                                        <ThumbsUp size={8} className="text-[var(--bg-primary)]" />
                                                    </div>
                                                    <span className="font-medium">{post.likes.length}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setActiveCommentPost(activeCommentPost === post._id ? null : post._id)} className="hover:text-[var(--accent)] transition-colors cursor-pointer">
                                                {post.comments.length} comments
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="border-t border-[var(--border-color)]/20 px-2 py-1 flex">
                                        <button onClick={() => handleLike(post._id)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm ${liked ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50'}`}
                                        >
                                            <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
                                            <span className="font-medium hidden sm:inline">Like</span>
                                        </button>
                                        <button onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setActiveCommentPost(activeCommentPost === post._id ? null : post._id); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50 transition-all text-sm"
                                        >
                                            <MessageCircle size={16} />
                                            <span className="font-medium hidden sm:inline">Comment</span>
                                        </button>
                                        {(post.author._id === user?.id || user?.role === 'admin') && (
                                            <button onClick={() => handleDelete(post._id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all text-sm"
                                            >
                                                <Trash2 size={16} />
                                                <span className="font-medium hidden sm:inline">Delete</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Comments */}
                                    <AnimatePresence>
                                        {activeCommentPost === post._id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-[var(--border-color)]/20 px-4 py-3 bg-[var(--bg-tertiary)]/20"
                                            >
                                                <div className="flex gap-2.5 mb-3">
                                                    <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        <Avatar src={user?.avatar} iconSize={14} />
                                                    </div>
                                                    <div className="flex-1 flex gap-2">
                                                        <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                                                            placeholder="Write a comment..."
                                                            className="flex-1 bg-[var(--bg-secondary)]/80 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] px-3.5 py-2 rounded-full focus:outline-none border border-[var(--border-color)]/30 focus:border-[var(--accent)]/40 transition-colors"
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post._id)}
                                                        />
                                                        <button onClick={() => handleAddComment(post._id)} disabled={!commentText.trim()}
                                                            className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold rounded-full disabled:opacity-40 transition-all"
                                                        >Post</button>
                                                    </div>
                                                </div>
                                                {post.comments.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        {post.comments.map((comment) => (
                                                            <motion.div key={comment._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 group/comment">
                                                                <div className="w-7 h-7 bg-[var(--accent)]/80 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                    <Avatar src={comment.author.avatar} iconSize={12} />
                                                                </div>
                                                                <div className="flex-1 bg-[var(--bg-secondary)]/60 rounded-2xl px-3.5 py-2.5 relative">
                                                                    <p className="text-xs font-semibold text-[var(--text-primary)]">{comment.author.name}</p>
                                                                    <p className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed">{comment.text}</p>
                                                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{getTimeAgo(comment.createdAt)}</p>
                                                                    {(comment.author._id === user?.id || user?.role === 'admin') && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(post._id, comment._id)}
                                                                            className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover/comment:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] transition-all"
                                                                            title="Delete comment"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.article>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty State */}
                    {displayPosts.length === 0 && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={glass + ' p-10 text-center'}>
                            <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center">
                                <Sparkles size={24} className="text-[var(--accent)]" />
                            </div>
                            <h3 className="text-base font-bold text-[var(--text-primary)]">No posts yet</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                {isAuthenticated ? 'Be the first to share something!' : 'Sign in to join the conversation.'}
                            </p>
                            {isAuthenticated ? (
                                <button onClick={() => setShowPostModal(true)}
                                    className="mt-5 px-5 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-semibold rounded-full"
                                >Create a post</button>
                            ) : (
                                <Link to="/login" className="inline-block mt-5 px-5 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-semibold rounded-full">Sign in</Link>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="hidden lg:block space-y-4">
                    {/* News */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                        className={glass + ' p-4 sticky top-[72px]'}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={15} className="text-[var(--accent)]" />
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                <Link to="/news" className="hover:text-[var(--accent)] transition-colors">College News</Link>
                            </h3>
                        </div>
                        <div className="space-y-1">
                            {newsItems.slice(0, 5).map((news) => (
                                <div key={news._id} className="group">
                                    <div className="flex gap-2.5 items-start p-2 -mx-2 rounded-xl hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                        <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mt-1.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {news.link ? (
                                                <a href={news.link} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] line-clamp-2 flex items-center gap-1">
                                                    {news.title}
                                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </a>
                                            ) : (
                                                <Link to={`/news/${news._id}`} className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] line-clamp-2">{news.title}</Link>
                                            )}
                                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString() : (news.createdAt ? new Date(news.createdAt).toLocaleDateString() : '')}
                                            </p>
                                        </div>
                                        {user?.role === 'admin' && (
                                            <button onClick={async () => {
                                                const ok = await confirm({ title: 'Delete News', message: 'Delete this news item?', confirmText: 'Delete', danger: true });
                                                if (!ok) return;
                                                try { await api.delete(`/public/news/${news._id}`); setNewsItems(prev => prev.filter((n) => n._id !== news._id)); toast.show('Deleted', 'success'); }
                                                catch { toast.show('Failed', 'error'); }
                                            }} className="text-[10px] font-medium text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--accent)]">×</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {user?.role === 'admin' && (
                                <Link to="/admin/news" className="flex items-center justify-center gap-1.5 mt-3 px-3 py-2 border border-dashed border-[var(--border-color)]/40 rounded-xl text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors text-xs font-medium">
                                    <Sparkles size={12} />Add News
                                </Link>
                            )}
                        </div>
                    </motion.div>

                    {/* Quick Links */}
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
                        className={glass + ' p-4'}
                    >
                        <div className="flex items-center gap-2 mb-2.5">
                            <Award size={15} className="text-[var(--accent)]" />
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Quick Links</h3>
                        </div>
                        <div className="space-y-0.5">
                            {[
                                { to: '/events', icon: Calendar, label: 'Upcoming Events' },
                                { to: '/jobs', icon: Award, label: 'Job Opportunities' },
                            ].map(({ to, icon: Icon, label }) => (
                                <Link key={to} to={to} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                                    <Icon size={14} className="text-[var(--accent)]" />
                                    <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
                                </Link>
                            ))}
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <div className="text-[10px] text-[var(--text-muted)] text-center space-y-1.5 pt-1">
                        <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-0.5">
                            <Link to="/about" className="hover:text-[var(--accent)] transition-colors">About</Link>
                            <Link to="/contact" className="hover:text-[var(--accent)] transition-colors">Help</Link>
                            <a href="#" className="hover:text-[var(--accent)] transition-colors">Privacy</a>
                            <a href="#" className="hover:text-[var(--accent)] transition-colors">Terms</a>
                        </div>
                        <p className="font-medium">Alumni Network © {new Date().getFullYear()}</p>
                    </div>
                </aside>
            </div>

            {/* Post Detail Modal */}
            <AnimatePresence>
                {(detailedPost || detailLoading) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => { setDetailedPost(null); setDetailCommentText(''); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 16 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-[600px] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]/30 flex flex-col"
                        >
                            {detailLoading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin h-8 w-8 rounded-full border-[3px] border-[var(--bg-tertiary)] border-t-[var(--accent)] mx-auto"></div>
                                </div>
                            ) : detailedPost && (
                                <>
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                <Avatar src={detailedPost.author?.avatar} iconSize={18} />
                                            </div>
                                            <div>
                                                <button onClick={() => { setDetailedPost(null); navigate(`/profile/${detailedPost.author?._id}`); }}
                                                    className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                                                    {detailedPost.author?.name}
                                                </button>
                                                {detailedPost.author?.headline && (
                                                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{detailedPost.author.headline}</p>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5">
                                                    <span>{getTimeAgo(detailedPost.createdAt)}</span>
                                                    <span>·</span>
                                                    {detailedPost.visibility === 'connections' ? <Users size={10} /> : <Globe size={10} />}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => { setDetailedPost(null); setDetailCommentText(''); }}
                                            className="p-2 rounded-full hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                                            <X size={18} className="text-[var(--text-muted)]" />
                                        </button>
                                    </div>

                                    {/* Scrollable Content */}
                                    <div className="flex-1 overflow-y-auto">
                                        {/* Content */}
                                        <div className="p-4">
                                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{detailedPost.content}</p>
                                        </div>

                                        {/* Media */}
                                        {detailedPost.media?.length > 0 && (
                                            <div className={detailedPost.media.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
                                                {detailedPost.media.map((m, idx) => (
                                                    <div key={idx} className={detailedPost.media.length === 1 ? '' : detailedPost.media.length === 3 && idx === 0 ? 'col-span-2' : ''}>
                                                        {m.type === 'image' ? (
                                                            <img src={normalizeMediaUrl(m.url)} alt="" className="w-full max-h-[480px] object-cover" loading="lazy" />
                                                        ) : (
                                                            <video src={normalizeMediaUrl(m.url)} controls className="w-full max-h-[480px]" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Likes Section */}
                                        <div className="px-4 pt-3 pb-2">
                                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                                {detailedPost.likes?.length > 0 && (
                                                    <>
                                                        <div className="w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                                                            <ThumbsUp size={8} className="text-[var(--bg-primary)]" />
                                                        </div>
                                                        <span className="font-medium">{detailedPost.likes.length} like{detailedPost.likes.length !== 1 ? 's' : ''}</span>
                                                    </>
                                                )}
                                            </div>
                                            {/* Who liked */}
                                            {detailedPost.likes?.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {detailedPost.likes.map((liker, idx) => (
                                                        typeof liker === 'object' ? (
                                                            <div key={liker._id || idx} className="flex items-center gap-1.5 bg-[var(--bg-tertiary)]/60 px-2 py-1 rounded-full">
                                                                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Avatar src={liker.avatar} iconSize={10} imgClassName="w-5 h-5 object-cover" />
                                                                </div>
                                                                <span className="text-[11px] text-[var(--text-primary)] font-medium">{liker.name}</span>
                                                            </div>
                                                        ) : null
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="border-t border-b border-[var(--border-color)]/20 px-2 py-1 flex">
                                            <button onClick={handleDetailLike}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm ${
                                                    user?.id && detailedPost.likes?.some((l: string | PopulatedLiker) => (typeof l === 'object' ? l._id : l) === user.id)
                                                        ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50'
                                                }`}
                                            >
                                                <ThumbsUp size={16} fill={user?.id && detailedPost.likes?.some((l: string | PopulatedLiker) => (typeof l === 'object' ? l._id : l) === user.id) ? 'currentColor' : 'none'} />
                                                <span className="font-medium">Like</span>
                                            </button>
                                            <button onClick={() => document.getElementById('detail-comment-input')?.focus()}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50 transition-all text-sm"
                                            >
                                                <MessageCircle size={16} />
                                                <span className="font-medium">Comment</span>
                                            </button>
                                            <button onClick={() => handleSave(detailedPost._id)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm ${savedPosts.has(detailedPost._id) ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50'}`}
                                            >
                                                <Bookmark size={16} fill={savedPosts.has(detailedPost._id) ? 'currentColor' : 'none'} />
                                                <span className="font-medium">Save</span>
                                            </button>
                                        </div>

                                        {/* Comments List */}
                                        <div className="px-4 py-3 space-y-3">
                                            <p className="text-xs font-semibold text-[var(--text-muted)]">
                                                {detailedPost.comments?.length || 0} comment{(detailedPost.comments?.length || 0) !== 1 ? 's' : ''}
                                            </p>
                                            {detailedPost.comments?.map((comment, idx) => (
                                                <div key={comment._id || idx} className="flex gap-2.5 group/comment">
                                                    <div className="w-7 h-7 bg-[var(--accent)]/80 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        <Avatar src={comment.author?.avatar} iconSize={12} />
                                                    </div>
                                                    <div className="flex-1 bg-[var(--bg-tertiary)]/40 rounded-2xl px-3.5 py-2.5 relative">
                                                        <p className="text-xs font-semibold text-[var(--text-primary)]">{comment.author?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed">{comment.text}</p>
                                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{getTimeAgo(comment.createdAt)}</p>
                                                        {(comment.author?._id === user?.id || user?.role === 'admin') && (
                                                            <button
                                                                onClick={() => handleDeleteComment(detailedPost._id, comment._id)}
                                                                className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover/comment:opacity-100 hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] transition-all"
                                                                title="Delete comment"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comment Input */}
                                    {isAuthenticated && (
                                        <div className="border-t border-[var(--border-color)]/20 p-3 flex gap-2.5 bg-[var(--bg-tertiary)]/20">
                                            <div className="w-8 h-8 bg-[var(--accent)] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                <Avatar src={user?.avatar} iconSize={14} />
                                            </div>
                                            <div className="flex-1 flex gap-2">
                                                <input id="detail-comment-input" type="text" value={detailCommentText} onChange={(e) => setDetailCommentText(e.target.value)}
                                                    placeholder="Write a comment..."
                                                    className="flex-1 bg-[var(--bg-secondary)]/80 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] px-3.5 py-2 rounded-full focus:outline-none border border-[var(--border-color)]/30 focus:border-[var(--accent)]/40 transition-colors"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleDetailComment()}
                                                />
                                                <button onClick={handleDetailComment} disabled={!detailCommentText.trim()}
                                                    className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold rounded-full disabled:opacity-40 transition-all"
                                                >Post</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Post Creation Modal */}
            <AnimatePresence>
                {showPostModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowPostModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 16 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-[520px] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]/30"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[var(--accent)] rounded-full flex items-center justify-center overflow-hidden">
                                        <Avatar src={user?.avatar} iconSize={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm text-[var(--text-primary)]">{user?.name}</h3>
                                        <div className="relative inline-block">
                                            <button onClick={() => setShowVisibilityMenu(v => !v)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 px-2 py-0.5 bg-[var(--bg-tertiary)]/60 rounded-full mt-0.5">
                                                {postVisibility === 'public' ? <><Globe size={10} /> Anyone</> : <><Users size={10} /> Connections</>}
                                                <ChevronDown size={10} />
                                            </button>
                                            <AnimatePresence>
                                                {showVisibilityMenu && (
                                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                                        className="absolute mt-1 left-0 bg-[var(--bg-secondary)] border border-[var(--border-color)]/30 shadow-xl z-30 w-44 rounded-xl overflow-hidden"
                                                    >
                                                        <button onClick={() => { setPostVisibility('public'); setShowVisibilityMenu(false); }} className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-tertiary)]/60 flex items-center gap-2.5 text-xs"><Globe size={14} /> Anyone</button>
                                                        <button onClick={() => { setPostVisibility('connections'); setShowVisibilityMenu(false); }} className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-tertiary)]/60 flex items-center gap-2.5 text-xs"><Users size={14} /> Connections</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowPostModal(false)} className="p-2 rounded-full hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                                    <X size={18} className="text-[var(--text-muted)]" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 max-h-[50vh] overflow-y-auto">
                                <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="What do you want to talk about?"
                                    className="w-full h-[160px] bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm resize-none focus:outline-none leading-relaxed"
                                    autoFocus
                                />
                                {postAttachmentPreviews.length > 0 && (
                                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                                        {postAttachmentPreviews.map((p, idx) => (
                                            <div key={idx} className="relative group rounded-xl overflow-hidden">
                                                {p.type.startsWith('image') ? (
                                                    <img src={p.url} className="w-full h-24 object-cover" alt={p.name} />
                                                ) : p.type.startsWith('video') ? (
                                                    <video src={p.url} className="w-full h-24 object-cover" />
                                                ) : (
                                                    <div className="w-full h-24 flex items-center justify-center bg-[var(--bg-tertiary)] rounded-xl text-xs">{p.name}</div>
                                                )}
                                                <button onClick={() => { setPostAttachmentPreviews(prev => prev.filter((_, i) => i !== idx)); setPostAttachments(prev => prev.filter((_, i) => i !== idx)); }}
                                                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                ><X size={10} className="text-white" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {fileErrors.length > 0 && (
                                    <div className="mt-2">{fileErrors.map((err, i) => <p key={i} className="text-[10px] text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg mb-1">{err}</p>)}</div>
                                )}
                                {uploading && (
                                    <div className="mt-3">
                                        <div className="w-full bg-[var(--bg-tertiary)] h-1.5 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-[var(--accent)] rounded-full" />
                                        </div>
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Uploading — {uploadProgress}%</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]/20 bg-[var(--bg-tertiary)]/20">
                                <div className="flex gap-0.5">
                                    <input ref={postFileInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                                    {[
                                        { icon: ImageIcon, color: 'text-[var(--accent)]' },
                                        { icon: Video, color: 'text-[var(--text-secondary)]' },
                                        { icon: FileText, color: 'text-[var(--text-secondary)]' },
                                    ].map(({ icon: Icon, color }, i) => (
                                        <button key={i} onClick={() => postFileInputRef.current?.click()} className="p-2 rounded-full hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                                            <Icon size={18} className={color} />
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleCreatePost}
                                    disabled={!newPostContent.trim() && postAttachments.length === 0}
                                    className="px-5 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-md hover:shadow-[var(--accent)]/25"
                                >Post</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Feed;