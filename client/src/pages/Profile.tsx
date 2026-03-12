import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import ImageCarousel from '../components/ImageCarousel';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
    User as UserIcon, GraduationCap, Briefcase, Edit3, Camera, Award, Users, UserPlus,
    MessageCircle, Plus, MapPin, Mail, Phone, Calendar, ExternalLink, Clock,
    Linkedin, Github, Globe, X, Check, Upload, FileText, Star, Building2,
    Link as LinkIcon, Trash2, Edit2, Save, ThumbsUp, Twitter, Instagram, Youtube
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import ConnectionsModal from '../components/ConnectionsModal';

interface Experience {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
}

interface Education {
    id: string;
    school: string;
    degree: string;
    field?: string;
    startYear: number;
    endYear?: number;
    description?: string;
}

interface Skill {
    id: string;
    name: string;
    endorsements: number;
}

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { id } = useParams();

    const [editMode, setEditMode] = useState(false);
    const [headline, setHeadline] = useState('');
    const [currentCompany, setCurrentCompany] = useState('');
    const [currentLocation, setCurrentLocation] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [twitterUrl, setTwitterUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const cropContainerRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);
    const [viewUser, setViewUser] = useState<any>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    
    const [experiences, setExperiences] = useState<Experience[]>([]);
    const [education, setEducation] = useState<Education[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [showExpModal, setShowExpModal] = useState(false);
    const [showEduModal, setShowEduModal] = useState(false);
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [editingExp, setEditingExp] = useState<Experience | null>(null);
    const [editingEdu, setEditingEdu] = useState<Education | null>(null);
    const [newSkill, setNewSkill] = useState('');

    const [stats, setStats] = useState({ connections: 0, posts: 0, achievements: 0, profileViews: 0 });

    const handleDeleteProfilePost = async (postId: string) => {
        const ok = await confirm({ title: 'Delete Post', message: 'Are you sure you want to delete this post? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/posts/${postId}`);
            setUserPosts(prev => prev.filter(p => p._id !== postId));
            toast.show('Post deleted', 'success');
        } catch { toast.show('Failed to delete post', 'error'); }
    };

    const handleEditProfilePost = async (postId: string) => {
        if (!editPostContent.trim()) return;
        try {
            const res = await api.put(`/posts/${postId}`, { content: editPostContent });
            setUserPosts(prev => prev.map(p => p._id === postId ? { ...p, content: res.data.post.content } : p));
            setEditingPostId(null);
            toast.show('Post updated', 'success');
        } catch { toast.show('Failed to update post', 'error'); }
    };

    const handleDeleteProfileComment = async (postId: string, commentId: string) => {
        const ok = await confirm({ title: 'Delete Comment', message: 'Are you sure you want to delete this comment?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
            setUserComments(prev => prev.filter(c => c._id !== commentId));
            // Also update the post's comments in userPosts
            if (res.data.comments) {
                setUserPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
            }
            toast.show('Comment deleted', 'success');
        } catch { toast.show('Failed to delete comment', 'error'); }
    };

    const handleProfilePostLike = async (postId: string) => {
        try {
            await api.post(`/posts/${postId}/like`);
            setUserPosts(prev => prev.map(post => {
                if (post._id !== postId) return post;
                const userId = user?.id || '';
                const likes = post.likes || [];
                const newLikes = likes.includes(userId) ? likes.filter((id: string) => id !== userId) : [...likes, userId];
                return { ...post, likes: newLikes };
            }));
        } catch { /* silent */ }
    };

    const handleProfilePostComment = async (postId: string) => {
        if (!profileCommentText.trim()) return;
        try {
            const res = await api.post(`/posts/${postId}/comment`, { text: profileCommentText });
            setUserPosts(prev => prev.map(post =>
                post._id === postId ? { ...post, comments: res.data.comments } : post
            ));
            setProfileCommentText('');
            setActiveProfileCommentPost(null);
        } catch { /* silent */ }
    };

    const handleDeleteProfilePostComment = async (postId: string, commentId: string) => {
        const ok = await confirm({ title: 'Delete Comment', message: 'Are you sure you want to delete this comment?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
            setUserPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
            toast.show('Comment deleted', 'success');
        } catch { toast.show('Failed to delete comment', 'error'); }
    };

    const handleEditProfilePostComment = async (postId: string, commentId: string) => {
        if (!editProfileCommentText.trim()) return;
        try {
            const res = await api.put(`/posts/${postId}/comments/${commentId}`, { text: editProfileCommentText });
            setUserPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.comments } : p));
            setEditingProfileCommentId(null);
            toast.show('Comment updated', 'success');
        } catch { toast.show('Failed to update comment', 'error'); }
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return new Date(dateStr).toLocaleDateString();
    };

    const handleEditProfileComment = async (postId: string, commentId: string) => {
        if (!editCommentText.trim()) return;
        try {
            await api.put(`/posts/${postId}/comments/${commentId}`, { text: editCommentText });
            setUserComments(prev => prev.map(c => c._id === commentId ? { ...c, text: editCommentText } : c));
            setEditingCommentId(null);
            toast.show('Comment updated', 'success');
        } catch { toast.show('Failed to update comment', 'error'); }
    };
    const [connectionStatus, setConnectionStatus] = useState<'none'|'pending_sent'|'pending_received'|'accepted'>('none');
    const [connectionRequestId, setConnectionRequestId] = useState<string | null>(null);
    const [connectionActionLoading, setConnectionActionLoading] = useState(false);
    const [showUnconnectModal, setShowUnconnectModal] = useState(false);
    const [showConnectionsModal, setShowConnectionsModal] = useState(false);
    const [connectionsModalTab, setConnectionsModalTab] = useState<'all' | 'mutual'>('all');
    const [mutualConnections, setMutualConnections] = useState<{mutualCount: number; mutuals: {_id: string; name: string; avatar?: string; headline?: string}[]}>({mutualCount: 0, mutuals: []});
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'experience' | 'comments'>('about');
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [userComments, setUserComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);

    // Inline edit state for posts and comments
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editPostContent, setEditPostContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [editCommentPostId, setEditCommentPostId] = useState<string | null>(null);
    const [activeProfileCommentPost, setActiveProfileCommentPost] = useState<string | null>(null);
    const [profileCommentText, setProfileCommentText] = useState('');
    const [editingProfileCommentId, setEditingProfileCommentId] = useState<string | null>(null);
    const [editProfileCommentText, setEditProfileCommentText] = useState('');
    const confirm = useConfirm();

    const isOwnProfile = !id || id === user?.id;
    const isAdmin = user?.role === 'admin';
    const profileUser = viewUser || user;

    

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            if (cropImage) URL.revokeObjectURL(cropImage);
        };
    }, [avatarPreview, coverPreview, cropImage]);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            try {
                const res = await api.get(`/users/${id}`);
                setViewUser(res.data.user);
                // Record profile view (fire-and-forget, don't block on it)
                api.post(`/users/${id}/view`).catch(() => {});
            } catch (err) {
                console.error('Failed to load user', err);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        const loadProfileData = async () => {
            const targetId = id || user?.id;
            if (!targetId) return;

            try {
                setLoadingPosts(true);
                const [postsRes, statsRes] = await Promise.all([
                    api.get(`/posts/user/${targetId}`).catch((err) => { console.error('Failed to fetch posts:', err); return { data: { posts: [] } }; }),
                    api.get(`/connections/stats/${targetId}`).catch((err) => { console.error('Failed to fetch stats:', err); return { data: { connections: 0, posts: 0 } }; }),
                ]);
                
                const posts = postsRes.data.posts || postsRes.data || [];
                const postsList = Array.isArray(posts) ? posts : [];
                setUserPosts(postsList);
                setStats({
                    connections: statsRes.data.connections ?? 0,
                    posts: statsRes.data.posts ?? postsList.length,
                    achievements: 0,
                    profileViews: statsRes.data.profileViews ?? 0
                });
                // If viewing someone else's profile, check connection status
                if (!isOwnProfile) {
                    try {
                        const [statusRes, mutualRes] = await Promise.all([
                            api.get(`/connections/status/${targetId}`),
                            api.get(`/connections/mutual/${targetId}`).catch(() => ({ data: { mutualCount: 0, mutuals: [] } }))
                        ]);
                        setConnectionStatus(statusRes.data.status || 'none');
                        setConnectionRequestId(statusRes.data.requestId || null);
                        setMutualConnections(mutualRes.data);
                    } catch (err) {
                        console.error('Failed to fetch connection status', err);
                    }
                }
            } catch (err) {
                console.error('Failed to load profile data', err);
            } finally {
                setLoadingPosts(false);
            }
        };
        loadProfileData();
    }, [id, user?.id]);

    const handleConnect = async () => {
        const targetId = id || viewUser?._id;
        if (!targetId || connectionActionLoading) return;
        setConnectionActionLoading(true);
        try {
            await api.post(`/connections/request/${targetId}`);
            setConnectionStatus('pending_sent');
            setConnectionRequestId(null);
            toast.show('Connection request sent', 'success');
        } catch (error: any) {
            console.error('Failed to send connection request', error);
            toast.show(error?.response?.data?.message || 'Failed to send request', 'error');
        } finally {
            setConnectionActionLoading(false);
        }
    };

    const handleRespond = async () => {
        const reqId = connectionRequestId;
        if (!reqId || connectionActionLoading) return;
        setConnectionActionLoading(true);
        try {
            await api.put(`/connections/accept/${reqId}`);
            setConnectionStatus('accepted');
            setConnectionRequestId(null);
            // Refresh authenticated user data so their stats (connections) update
            try { await checkAuth(); } catch (e) { /* ignore */ }
            // also refresh profile stats
            setStats(prev => ({ ...prev, connections: prev.connections + 1 }));
            toast.show('Connection accepted', 'success');
        } catch (error: any) {
            console.error('Failed to accept connection', error);
            toast.show(error?.response?.data?.message || 'Failed to accept request', 'error');
        } finally {
            setConnectionActionLoading(false);
        }
    };

    const handleRemoveConnection = async () => {
        const targetId = id || viewUser?._id;
        if (!targetId) return;
        try {
            await api.delete(`/connections/remove/${targetId}`);
            setConnectionStatus('none');
            setConnectionRequestId(null);
            // refresh stats
            try { await checkAuth(); } catch (e) { /* ignore */ }
            setStats(prev => ({ ...prev, connections: Math.max(0, prev.connections - 1) }));
            toast.show('Connection removed', 'success');
        } catch (error: any) {
            console.error('Failed to remove connection', error);
            toast.show(error?.response?.data?.message || 'Failed to remove connection', 'error');
        }
    };

    useEffect(() => {
        if (isOwnProfile && user) {
            setHeadline(user.headline || '');
            setCurrentCompany(user.currentCompany || '');
            setCurrentLocation(user.currentLocation || '');
            setBio((user as any).bio || '');
            setPhone((user as any).phone || '');
            setLinkedinUrl((user as any).linkedinUrl || '');
            setGithubUrl((user as any).githubUrl || '');
            setWebsiteUrl((user as any).websiteUrl || '');
            setTwitterUrl((user as any).twitterUrl || '');
            setInstagramUrl((user as any).instagramUrl || '');
            setYoutubeUrl((user as any).youtubeUrl || '');
            setExperiences((user as any).experiences || []);
            setEducation((user as any).education || []);
            setSkills((user as any).skills || []);
        } else if (!isOwnProfile && viewUser) {
            setExperiences(viewUser.experiences || []);
            setEducation(viewUser.education || []);
            setSkills(viewUser.skills || []);
        }
    }, [isOwnProfile, user, viewUser]);

    useEffect(() => {
        const fetchUserComments = async () => {
            const targetId = id || user?.id;
            if (!targetId) return;
            setLoadingComments(true);
            try {
                const res = await api.get(`/posts/user-comments/${targetId}`);
                setUserComments(res.data.comments || []);
            } catch (err) {
                console.error('Failed to fetch user comments', err);
            } finally {
                setLoadingComments(false);
            }
        };
        if (activeTab === 'comments') {
            fetchUserComments();
        }
    }, [activeTab, id, user?.id]);

    const handleSave = async () => {
        try {
            setSaving(true);

            if (avatarFile) {
                const fd = new FormData();
                fd.append('avatar', avatarFile);
                await api.post('/upload/profile-pic', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            if (coverFile) {
                const fd2 = new FormData();
                fd2.append('cover', coverFile);
                await api.post('/upload/cover-photo', fd2, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            if (resumeFile) {
                const fd3 = new FormData();
                fd3.append('resume', resumeFile);
                await api.post('/upload/resume', fd3, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            const payload = { 
                headline, currentCompany, currentLocation, bio, phone,
                linkedinUrl, githubUrl, websiteUrl, twitterUrl, instagramUrl, youtubeUrl,
                experiences, education, skills
            };

            await api.put('/users/profile', payload);
            await checkAuth();
            
            setAvatarFile(null);
            setCoverFile(null);
            setResumeFile(null);
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setAvatarPreview(null);
            setCoverPreview(null);
            
            setEditMode(false);
            toast.show('Profile updated successfully', 'success');
        } catch (err: any) {
            console.error(err);
            toast.show(err?.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddExperience = (exp: Experience) => {
        if (editingExp) {
            setExperiences(prev => prev.map(e => e.id === editingExp.id ? exp : e));
        } else {
            setExperiences(prev => [...prev, { ...exp, id: Date.now().toString() }]);
        }
        setShowExpModal(false);
        setEditingExp(null);
    };

    const handleAddEducation = (edu: Education) => {
        if (editingEdu) {
            setEducation(prev => prev.map(e => e.id === editingEdu.id ? edu : e));
        } else {
            setEducation(prev => [...prev, { ...edu, id: Date.now().toString() }]);
        }
        setShowEduModal(false);
        setEditingEdu(null);
    };

    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        setSkills(prev => [...prev, { id: Date.now().toString(), name: newSkill.trim(), endorsements: 0 }]);
        setNewSkill('');
        setShowSkillModal(false);
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-5">
                    {/* Profile Header Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden shadow-md shadow-black/5"
                    >
                        {/* Cover Photo */}
                        <div className="h-[180px] sm:h-[230px] md:h-[270px] relative bg-[var(--accent)]">
                            {coverPreview || profileUser?.coverImage ? (
                                <img
                                    src={coverPreview || resolveMediaUrl(profileUser?.coverImage)}
                                    alt="cover"
                                    className="w-full h-full object-cover"
                                />
                            ) : null}
                            {/* Gradient overlay for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                            {isOwnProfile && (
                                <label className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[var(--bg-primary)]/90 backdrop-blur-sm hover:bg-[var(--bg-primary)] transition-colors cursor-pointer shadow-md flex items-center justify-center z-10">
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        if (f) {
                                            setCropImage(URL.createObjectURL(f));
                                            setCropType('cover');
                                            setShowCropModal(true);
                                        }
                                    }} />
                                    <Camera size={18} className="text-[var(--text-primary)]" />
                                </label>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-16 relative z-10">
                                <motion.div whileHover={{ scale: 1.02 }} className="relative flex-shrink-0">
                                    <div className="w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] rounded-full overflow-hidden bg-[var(--accent)] border-4 border-[var(--bg-primary)] flex items-center justify-center shadow-md shadow-[var(--accent)]/20">
                                        <Avatar src={avatarPreview || profileUser?.avatar} iconSize={56} />
                                    </div>
                                    {isOwnProfile && (
                                        <label className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[var(--bg-primary)] shadow-md hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer flex items-center justify-center border border-[var(--border-color)]">
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                const f = e.target.files?.[0] || null;
                                                if (f) {
                                                    setCropImage(URL.createObjectURL(f));
                                                    setCropType('avatar');
                                                    setShowCropModal(true);
                                                }
                                            }} />
                                            <Camera size={16} className="text-[var(--text-primary)]" />
                                        </label>
                                    )}
                                </motion.div>
                            </div>
                            <div className="mt-3">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{profileUser?.name || 'Alumni User'}</h1>
                                        {editMode ? (
                                            <input 
                                                value={headline} 
                                                onChange={(e) => setHeadline(e.target.value)} 
                                                placeholder="Your professional headline..."
                                                className="w-full mt-2 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]" 
                                            />
                                        ) : (
                                            profileUser?.headline ? (
                                                <p className="text-[var(--text-secondary)] mt-1">{profileUser.headline}</p>
                                            ) : isOwnProfile ? (
                                                <p className="text-[var(--text-muted)] mt-1 italic">Add a professional headline</p>
                                            ) : null
                                        )}
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[var(--text-muted)]">
                                            {(profileUser?.degree || profileUser?.graduationYear) && (
                                                <span className="flex items-center gap-1">
                                                    <GraduationCap size={14} />
                                                    {profileUser?.degree}{profileUser?.degree && profileUser?.graduationYear ? ' • ' : ''}{profileUser?.graduationYear ? `Class of ${profileUser.graduationYear}` : ''}
                                                </span>
                                            )}
                                            {(editMode ? currentLocation : profileUser?.currentLocation) && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {editMode ? (
                                                        <input 
                                                            value={currentLocation} 
                                                            onChange={(e) => setCurrentLocation(e.target.value)}
                                                            className="bg-[var(--bg-tertiary)] px-2 py-1 text-sm w-32"
                                                        />
                                                    ) : profileUser?.currentLocation}
                                                </span>
                                            )}
                                        </div>
                                        {stats.connections > 0 ? (
                                            <p 
                                                className="text-sm text-[var(--accent)] font-semibold mt-1 cursor-pointer hover:underline"
                                                onClick={() => { setConnectionsModalTab('all'); setShowConnectionsModal(true); }}
                                            >
                                                {stats.connections} connection{stats.connections !== 1 ? 's' : ''}
                                            </p>
                                        ) : isOwnProfile ? (
                                            <p className="text-sm text-[var(--text-muted)] mt-1">No connections yet</p>
                                        ) : null}
                                    </div>

                                    {editMode && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)]">
                                                <Building2 size={16} className="text-[var(--text-muted)]" />
                                                <input 
                                                    value={currentCompany} 
                                                    onChange={(e) => setCurrentCompany(e.target.value)}
                                                    placeholder="Current company"
                                                    className="bg-transparent text-sm text-[var(--text-primary)] focus:outline-none w-32"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 mt-6">
                                {isOwnProfile ? (
                                    !editMode ? (
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setEditMode(true)}
                                            className="px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold shadow-sm shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 transition-all"
                                        >
                                            Edit Profile
                                        </motion.button>
                                    ) : (
                                        <>
                                            <motion.button 
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSave} 
                                                disabled={saving}
                                                className="px-6 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <Check size={18} />
                                                {saving ? 'Saving...' : 'Save'}
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setAvatarFile(null);
                                                    setCoverFile(null);
                                                    setAvatarPreview(null);
                                                    setCoverPreview(null);
                                                }}
                                                className="px-6 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                                            >
                                                <X size={18} />
                                                Cancel
                                            </motion.button>
                                        </>
                                    )
                                ) : (
                                    <>
                                                {connectionStatus === 'accepted' ? (
                                                    <motion.div className="flex items-center gap-2">
                                                        <motion.button 
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => setShowUnconnectModal(true)}
                                                            className="px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--accent-light)] transition-colors flex items-center gap-2"
                                                        >
                                                            <X size={16} />
                                                            Unconnect
                                                        </motion.button>
                                                    </motion.div>
                                                ) : connectionStatus === 'pending_sent' ? (
                                                    <motion.button disabled className="px-6 py-2.5 border border-[var(--border-color)] text-[var(--text-muted)] font-semibold cursor-not-allowed flex items-center gap-2">
                                                        <Clock size={16} /> Pending
                                                    </motion.button>
                                                ) : connectionStatus === 'pending_received' ? (
                                                    <motion.button onClick={handleRespond} className="px-6 py-2.5 border border-[var(--accent)] text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/10 transition-colors flex items-center gap-2">
                                                        <UserPlus size={18} /> Respond
                                                    </motion.button>
                                                ) : (
                                                    <motion.button onClick={handleConnect} className="px-6 py-2.5 border border-[var(--accent)] text-[var(--accent)] font-semibold hover:bg-[var(--accent)]/10 transition-colors flex items-center gap-2">
                                                        <Users size={18} /> Connect
                                                    </motion.button>
                                                )}
                                                {mutualConnections.mutualCount > 0 && (
                                                    <div 
                                                        className="flex items-center gap-2 ml-1 cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => { setConnectionsModalTab('mutual'); setShowConnectionsModal(true); }}
                                                    >
                                                        <div className="flex -space-x-2">
                                                            {mutualConnections.mutuals.slice(0, 3).map(m => (
                                                                <div key={m._id} className="w-6 h-6 rounded-full overflow-hidden border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center">
                                                                    <Avatar src={m.avatar} alt={m.name} iconSize={10} imgClassName="w-full h-full object-cover" iconClassName="text-[var(--text-muted)]" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {mutualConnections.mutualCount} mutual connection{mutualConnections.mutualCount !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                    </>
                                )}
                                {isOwnProfile && (
                                    <label className="px-6 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2 cursor-pointer">
                                        <Upload size={18} />
                                        {resumeFile ? 'Resume Selected' : 'Upload Resume'}
                                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Tabs */}
                    <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-1 sm:p-1.5 shadow-md shadow-black/5">
                        <div className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
                            {(['about', 'experience', 'posts', 'comments'] as const).map((tab) => (
                                <motion.button
                                    key={tab}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                                        activeTab === tab
                                            ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* About Section */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'about' && (
                            <motion.div
                                key="about"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-5"
                            >
                                {/* Bio */}
                                <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 shadow-md shadow-black/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">About</h2>
                                        {isOwnProfile && !editMode && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setEditMode(true)}
                                                className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <Edit3 size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                        )}
                                    </div>
                                    {editMode ? (
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself..."
                                            className="w-full h-32 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent)]"
                                        />
                                    ) : (
                                        <p className="text-[var(--text-secondary)] leading-relaxed">
                                            {profileUser?.bio || 'Passionate professional with a strong foundation from MIC College of Technology. Always eager to learn new technologies and contribute to impactful projects.'}
                                        </p>
                                    )}
                                </div>

                                {/* Contact Info */}
                                <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 shadow-md shadow-black/5">
                                    <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Contact Information</h2>
                                    <div className="space-y-3">
                                        {(() => {
                                            const emailVis = profileUser?.privacySettings?.emailVisibility || 'connections';
                                            const showEmail = isOwnProfile || isAdmin || emailVis === 'everyone' || (emailVis === 'connections' && connectionStatus === 'accepted');
                                            return showEmail ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-[var(--accent)]/10 flex items-center justify-center">
                                                        <Mail size={18} className="text-[var(--accent)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[var(--text-muted)]">Email</p>
                                                        <p className="text-sm font-medium text-[var(--text-primary)]">{profileUser?.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 opacity-50">
                                                    <div className="w-10 h-10 bg-[var(--accent)]/10 flex items-center justify-center">
                                                        <Mail size={18} className="text-[var(--accent)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-[var(--text-muted)]">Email</p>
                                                        <p className="text-sm italic text-[var(--text-muted)]">{emailVis === 'only_me' ? 'Hidden' : 'Visible to connections only'}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {(() => {
                                            const phoneVis = profileUser?.privacySettings?.phoneVisibility || 'connections';
                                            const showPhone = isOwnProfile || isAdmin || phoneVis === 'everyone' || (phoneVis === 'connections' && connectionStatus === 'accepted');
                                            if (editMode) {
                                                return (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[var(--accent-light)] flex items-center justify-center">
                                                            <Phone size={18} className="text-[var(--text-secondary)]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-[var(--text-muted)]">Phone</p>
                                                            <input
                                                                value={phone}
                                                                onChange={(e) => setPhone(e.target.value)}
                                                                placeholder="+91 XXXXX XXXXX"
                                                                className="text-sm bg-[var(--bg-tertiary)] px-3 py-1.5 w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (profileUser?.phone && showPhone) {
                                                return (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[var(--accent-light)] flex items-center justify-center">
                                                            <Phone size={18} className="text-[var(--text-secondary)]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-[var(--text-muted)]">Phone</p>
                                                            <p className="text-sm font-medium text-[var(--text-primary)]">{profileUser?.phone}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            if (profileUser?.phone && !showPhone) {
                                                return (
                                                    <div className="flex items-center gap-3 opacity-50">
                                                        <div className="w-10 h-10 bg-[var(--accent-light)] flex items-center justify-center">
                                                            <Phone size={18} className="text-[var(--text-secondary)]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-[var(--text-muted)]">Phone</p>
                                                            <p className="text-sm italic text-[var(--text-muted)]">{phoneVis === 'only_me' ? 'Hidden' : 'Visible to connections only'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* Social Links */}
                                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]/50">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Social Links</p>
                                        <div className="flex flex-wrap gap-2">
                                            {editMode ? (
                                                <div className="w-full space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Linkedin size={16} className="text-[#0A66C2]" />
                                                        <input
                                                            value={linkedinUrl}
                                                            onChange={(e) => setLinkedinUrl(e.target.value)}
                                                            placeholder="https://linkedin.com/in/username"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Github size={16} className="text-[var(--text-primary)]" />
                                                        <input
                                                            value={githubUrl}
                                                            onChange={(e) => setGithubUrl(e.target.value)}
                                                            placeholder="https://github.com/username"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Twitter size={16} className="text-[#1DA1F2]" />
                                                        <input
                                                            value={twitterUrl}
                                                            onChange={(e) => setTwitterUrl(e.target.value)}
                                                            placeholder="https://x.com/username"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Instagram size={16} className="text-[#E4405F]" />
                                                        <input
                                                            value={instagramUrl}
                                                            onChange={(e) => setInstagramUrl(e.target.value)}
                                                            placeholder="https://instagram.com/username"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Youtube size={16} className="text-[#FF0000]" />
                                                        <input
                                                            value={youtubeUrl}
                                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                                            placeholder="https://youtube.com/@channel"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Globe size={16} className="text-[var(--accent)]" />
                                                        <input
                                                            value={websiteUrl}
                                                            onChange={(e) => setWebsiteUrl(e.target.value)}
                                                            placeholder="https://yourwebsite.com"
                                                            className="flex-1 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)]/30 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {profileUser?.linkedinUrl && (
                                                        <a href={profileUser.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2]/10 text-[#0A66C2] text-sm font-medium hover:bg-[#0A66C2]/20 transition-colors rounded-lg">
                                                            <Linkedin size={16} /> LinkedIn
                                                        </a>
                                                    )}
                                                    {profileUser?.githubUrl && (
                                                        <a href={profileUser.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]/80 transition-colors rounded-lg">
                                                            <Github size={16} /> GitHub
                                                        </a>
                                                    )}
                                                    {profileUser?.twitterUrl && (
                                                        <a href={profileUser.twitterUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/10 text-[#1DA1F2] text-sm font-medium hover:bg-[#1DA1F2]/20 transition-colors rounded-lg">
                                                            <Twitter size={16} /> X / Twitter
                                                        </a>
                                                    )}
                                                    {profileUser?.instagramUrl && (
                                                        <a href={profileUser.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#E4405F]/10 text-[#E4405F] text-sm font-medium hover:bg-[#E4405F]/20 transition-colors rounded-lg">
                                                            <Instagram size={16} /> Instagram
                                                        </a>
                                                    )}
                                                    {profileUser?.youtubeUrl && (
                                                        <a href={profileUser.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[#FF0000]/10 text-[#FF0000] text-sm font-medium hover:bg-[#FF0000]/20 transition-colors rounded-lg">
                                                            <Youtube size={16} /> YouTube
                                                        </a>
                                                    )}
                                                    {profileUser?.websiteUrl && (
                                                        <a href={profileUser.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent)]/20 transition-colors rounded-lg">
                                                            <Globe size={16} /> Website
                                                        </a>
                                                    )}
                                                    {!profileUser?.linkedinUrl && !profileUser?.githubUrl && !profileUser?.websiteUrl && !profileUser?.twitterUrl && !profileUser?.instagramUrl && !profileUser?.youtubeUrl && (
                                                        isOwnProfile ? (
                                                            <button
                                                                onClick={() => setEditMode(true)}
                                                                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-[var(--border-color)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors rounded-lg w-full justify-center"
                                                            >
                                                                <Plus size={16} /> Add social links
                                                            </button>
                                                        ) : (
                                                            <p className="text-sm text-[var(--text-muted)]">No social links added</p>
                                                        )
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Skills */}
                                <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 shadow-md shadow-black/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Skills</h2>
                                        {isOwnProfile && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setShowSkillModal(true)}
                                                className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <Plus size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.length > 0 ? skills.map((skill) => (
                                            <motion.div
                                                key={skill.id}
                                                whileHover={{ scale: 1.05 }}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--gradient-end)]/10 group"
                                            >
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{skill.name}</span>
                                                {skill.endorsements > 0 && (
                                                    <span className="text-xs text-[var(--accent)] font-semibold">{skill.endorsements}</span>
                                                )}
                                                {isOwnProfile && (
                                                    <button 
                                                        onClick={() => setSkills(prev => prev.filter(s => s.id !== skill.id))}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} className="text-[var(--text-secondary)]" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        )) : (
                                            <p className="text-sm text-[var(--text-muted)]">No skills added yet</p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'experience' && (
                            <motion.div
                                key="experience"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-5"
                            >
                                {/* Experience */}
                                <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 shadow-md shadow-black/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Experience</h2>
                                        {isOwnProfile && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => { setEditingExp(null); setShowExpModal(true); }}
                                                className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <Plus size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {experiences.length > 0 ? experiences.map((exp, i) => (
                                            <motion.div 
                                                key={exp.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center flex-shrink-0">
                                                    <Briefcase size={22} className="text-[var(--accent)]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold text-[var(--text-primary)]">{exp.title}</h3>
                                                            <p className="text-sm text-[var(--text-secondary)]">{exp.company}</p>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                                                                {exp.location && ` • ${exp.location}`}
                                                            </p>
                                                            {exp.description && (
                                                                <p className="text-sm text-[var(--text-secondary)] mt-2">{exp.description}</p>
                                                            )}
                                                        </div>
                                                        {isOwnProfile && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => { setEditingExp(exp); setShowExpModal(true); }} className="p-1.5 hover:bg-[var(--bg-tertiary)]">
                                                                    <Edit3 size={14} className="text-[var(--text-muted)]" />
                                                                </button>
                                                                <button onClick={() => setExperiences(prev => prev.filter(e => e.id !== exp.id))} className="p-1.5 hover:bg-[var(--accent-light)]">
                                                                    <Trash2 size={14} className="text-[var(--text-secondary)]" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )) : (
                                            <p className="text-sm text-[var(--text-muted)]">No experience added yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Education */}
                                <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-6 shadow-md shadow-black/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Education</h2>
                                        {isOwnProfile && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => { setEditingEdu(null); setShowEduModal(true); }}
                                                className="p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <Plus size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {/* Default MIC Education */}
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[var(--accent)]/20">
                                                <GraduationCap size={22} className="text-[var(--bg-primary)]" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-[var(--text-primary)]">MIC College of Technology</h3>
                                                <p className="text-sm text-[var(--text-secondary)]">{profileUser?.degree || 'B.Tech Computer Science'}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    {(profileUser?.graduationYear || 2020) - 4} - {profileUser?.graduationYear || 2020}
                                                </p>
                                            </div>
                                        </div>
                                        {education.map((edu, i) => (
                                            <motion.div 
                                                key={edu.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                                                    <GraduationCap size={22} className="text-[var(--text-muted)]" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold text-[var(--text-primary)]">{edu.school}</h3>
                                                            <p className="text-sm text-[var(--text-secondary)]">{edu.degree}{edu.field && `, ${edu.field}`}</p>
                                                            <p className="text-xs text-[var(--text-muted)] mt-1">{edu.startYear} - {edu.endYear || 'Present'}</p>
                                                        </div>
                                                        {isOwnProfile && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => { setEditingEdu(edu); setShowEduModal(true); }} className="p-1.5 hover:bg-[var(--bg-tertiary)]">
                                                                    <Edit3 size={14} className="text-[var(--text-muted)]" />
                                                                </button>
                                                                <button onClick={() => setEducation(prev => prev.filter(e => e.id !== edu.id))} className="p-1.5 hover:bg-[var(--accent-light)]">
                                                                    <Trash2 size={14} className="text-[var(--text-secondary)]" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'posts' && (
                            <motion.div
                                key="posts"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                {userPosts.length > 0 ? userPosts.map((post, i) => {
                                    const liked = user?.id ? (post.likes || []).includes(user.id) : false;
                                    return (
                                    <motion.div
                                        key={post._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 shadow-md shadow-black/5 overflow-hidden"
                                    >
                                        <div className="p-5">
                                            {post.status === 'pending' && (
                                                <div className="mb-2 px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs font-medium inline-block">Pending admin approval</div>
                                            )}
                                            {post.status === 'rejected' && (
                                                <div className="mb-2 px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium inline-block">Rejected by admin</div>
                                            )}

                                            {editingPostId === post._id ? (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={editPostContent}
                                                        onChange={e => setEditPostContent(e.target.value)}
                                                        className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg resize-none h-28 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setEditingPostId(null)} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
                                                        <button onClick={() => handleEditProfilePost(post._id)} disabled={!editPostContent.trim()} className="px-3 py-1.5 text-xs bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1">
                                                            <Save size={12} /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-[var(--text-primary)] whitespace-pre-wrap">{post.content}</p>
                                                    {post.media && post.media.length > 0 && (
                                                        <div className="mt-3 overflow-hidden group">
                                                            <ImageCarousel media={post.media} normalizeMediaUrl={resolveMediaUrl} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Engagement Stats */}
                                        <div className="px-5 py-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                            <div className="flex items-center gap-1.5">
                                                {(post.likes?.length || 0) > 0 && (
                                                    <>
                                                        <div className="w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                                                            <ThumbsUp size={8} className="text-[var(--bg-primary)]" />
                                                        </div>
                                                        <span className="font-medium">{post.likes.length}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => setActiveProfileCommentPost(activeProfileCommentPost === post._id ? null : post._id)} className="hover:text-[var(--accent)] transition-colors cursor-pointer">
                                                    {post.comments?.length || 0} comments
                                                </button>
                                                <span>{getTimeAgo(post.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="border-t border-[var(--border-color)]/20 px-2 py-1 flex">
                                            <button onClick={() => handleProfilePostLike(post._id)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-sm ${liked ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50'}`}
                                            >
                                                <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
                                                <span className="font-medium hidden sm:inline">Like</span>
                                            </button>
                                            <button onClick={() => setActiveProfileCommentPost(activeProfileCommentPost === post._id ? null : post._id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/50 transition-all text-sm"
                                            >
                                                <MessageCircle size={16} />
                                                <span className="font-medium hidden sm:inline">Comment</span>
                                            </button>
                                            {(isOwnProfile || isAdmin) && editingPostId !== post._id && (
                                                <>
                                                    <button onClick={() => { setEditingPostId(post._id); setEditPostContent(post.content); }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-all text-sm"
                                                    >
                                                        <Edit2 size={16} />
                                                        <span className="font-medium hidden sm:inline">Edit</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteProfilePost(post._id)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all text-sm"
                                                    >
                                                        <Trash2 size={16} />
                                                        <span className="font-medium hidden sm:inline">Delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Comments Section */}
                                        <AnimatePresence>
                                            {activeProfileCommentPost === post._id && (
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
                                                            <input type="text" value={profileCommentText} onChange={(e) => setProfileCommentText(e.target.value)}
                                                                placeholder="Write a comment..."
                                                                className="flex-1 bg-[var(--bg-secondary)]/80 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] px-3.5 py-2 rounded-full focus:outline-none border border-[var(--border-color)]/30 focus:border-[var(--accent)]/40 transition-colors"
                                                                onKeyDown={(e) => e.key === 'Enter' && handleProfilePostComment(post._id)}
                                                            />
                                                            <button onClick={() => handleProfilePostComment(post._id)} disabled={!profileCommentText.trim()}
                                                                className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold rounded-full disabled:opacity-40 transition-all"
                                                            >Post</button>
                                                        </div>
                                                    </div>
                                                    {post.comments?.length ? (
                                                        <div className="space-y-2.5">
                                                            {post.comments.map((comment: any) => (
                                                                <motion.div key={comment._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 group/comment">
                                                                    <div className="w-7 h-7 bg-[var(--accent)]/80 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                        <Avatar src={comment.author?.avatar} iconSize={12} />
                                                                    </div>
                                                                    <div className="flex-1 bg-[var(--bg-secondary)]/60 rounded-2xl px-3.5 py-2.5 relative">
                                                                        <p className="text-xs font-semibold text-[var(--text-primary)]">{comment.author?.name || 'Unknown'}</p>
                                                                        {editingProfileCommentId === comment._id ? (
                                                                            <div className="mt-1 space-y-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editProfileCommentText}
                                                                                    onChange={e => setEditProfileCommentText(e.target.value)}
                                                                                    className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                                                                    onKeyDown={e => e.key === 'Enter' && handleEditProfilePostComment(post._id, comment._id)}
                                                                                />
                                                                                <div className="flex gap-1.5 justify-end">
                                                                                    <button onClick={() => setEditingProfileCommentId(null)} className="px-2 py-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded transition-colors">Cancel</button>
                                                                                    <button onClick={() => handleEditProfilePostComment(post._id, comment._id)} disabled={!editProfileCommentText.trim()} className="px-2 py-1 text-[10px] bg-[var(--accent)] text-[var(--bg-primary)] rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-0.5">
                                                                                        <Save size={10} /> Save
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <p className="text-xs text-[var(--text-primary)] mt-0.5 leading-relaxed">{comment.text}</p>
                                                                                <p className="text-[10px] text-[var(--text-muted)] mt-1">{getTimeAgo(comment.createdAt)}</p>
                                                                            </>
                                                                        )}
                                                                        {(comment.author?._id === user?.id || user?.role === 'admin') && editingProfileCommentId !== comment._id && (
                                                                            <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-all">
                                                                                <button
                                                                                    onClick={() => { setEditingProfileCommentId(comment._id); setEditProfileCommentText(comment.text); }}
                                                                                    className="p-1 rounded-full hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] text-[var(--text-muted)] transition-all"
                                                                                    title="Edit comment"
                                                                                >
                                                                                    <Edit2 size={12} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteProfilePostComment(post._id, comment._id)}
                                                                                    className="p-1 rounded-full hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] transition-all"
                                                                                    title="Delete comment"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                    );
                                }) : (
                                    <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-12 text-center shadow-md">
                                        <FileText size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                                        <p className="text-[var(--text-muted)]">No posts yet</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'comments' && (
                            <motion.div
                                key="comments"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                {loadingComments ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden shadow-md shadow-black/5 rounded-2xl p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                                                    <div className="space-y-1.5">
                                                        <div className="h-3 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                                        <div className="h-2.5 w-16 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="h-3 w-full rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                                    <div className="h-3 w-2/3 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : userComments.length > 0 ? userComments.map((item, i) => (
                                    <motion.div
                                        key={item._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden shadow-md shadow-black/5"
                                    >
                                        {/* Original post context */}
                                        <button
                                            onClick={() => navigate(`/feed`)}
                                            className="w-full text-left p-4 pb-2 border-b border-[var(--border-color)]/20 hover:bg-[var(--bg-tertiary)]/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-6 h-6 bg-[var(--accent)]/70 rounded-full flex items-center justify-center overflow-hidden">
                                                    <Avatar src={item.post?.author?.avatar} iconSize={10} />
                                                </div>
                                                <span className="text-xs font-semibold text-[var(--text-primary)]">{item.post?.author?.name || 'Unknown'}</span>
                                                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                                                <span className="text-[10px] text-[var(--text-muted)]">{new Date(item.post?.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{item.post?.content}</p>
                                        </button>

                                        {/* The user's comment */}
                                        <div className="p-4 flex gap-3">
                                            <div className="w-1 bg-[var(--accent)]/40 rounded-full flex-shrink-0" />
                                            <div className="flex-1">
                                                {editingCommentId === item._id ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editCommentText}
                                                            onChange={e => setEditCommentText(e.target.value)}
                                                            className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm rounded-lg resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                                        />
                                                        <div className="flex gap-2 justify-end">
                                                            <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">Cancel</button>
                                                            <button onClick={() => handleEditProfileComment(item.postId, item._id)} disabled={!editCommentText.trim()} className="px-3 py-1.5 text-xs bg-[var(--accent)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1">
                                                                <Save size={12} /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{item.text}</p>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                                <MessageCircle size={10} />
                                                                {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            {(isOwnProfile || isAdmin) && (
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => { setEditingCommentId(item._id); setEditCommentText(item.text); setEditCommentPostId(item.postId); }} className="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="Edit comment">
                                                                        <Edit2 size={12} className="text-[var(--text-muted)] hover:text-[var(--accent)]" />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteProfileComment(item.postId, item._id)} className="p-1 hover:bg-red-500/10 rounded transition-colors" title="Delete comment">
                                                                        <Trash2 size={12} className="text-[var(--text-muted)] hover:text-red-500" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-12 text-center shadow-md">
                                        <MessageCircle size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                                        <p className="text-[var(--text-muted)]">No comments yet</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Sidebar */}
                <aside className="hidden lg:block space-y-5">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 p-5 sticky top-[76px] shadow-md shadow-black/5"
                    >
                        <h3 className="font-bold text-[var(--text-primary)] mb-4">Profile Stats</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Connections', value: stats.connections, icon: Users, color: 'text-[var(--accent)]' },
                                { label: 'Posts', value: stats.posts, icon: MessageCircle, color: 'text-[var(--text-secondary)]' },
                                { label: 'Profile Views', value: stats.profileViews, icon: Award, color: 'text-[var(--text-secondary)]' },
                            ].map((stat) => (
                                <div key={stat.label} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)]/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 bg-[var(--bg-secondary)] flex items-center justify-center ${stat.color}`}>
                                            <stat.icon size={18} />
                                        </div>
                                        <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
                                    </div>
                                    <span className="font-bold text-[var(--accent)]">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>


                </aside>
            </div>

            {/* Experience Modal */}
            <AnimatePresence>
                {showExpModal && (
                    <ExperienceModal
                        experience={editingExp}
                        onClose={() => { setShowExpModal(false); setEditingExp(null); }}
                        onSave={handleAddExperience}
                    />
                )}
            </AnimatePresence>

            {/* Education Modal */}
            <AnimatePresence>
                {showEduModal && (
                    <EducationModal
                        education={editingEdu}
                        onClose={() => { setShowEduModal(false); setEditingEdu(null); }}
                        onSave={handleAddEducation}
                    />
                )}
            </AnimatePresence>

            {/* Skill Modal */}
            <AnimatePresence>
                {showSkillModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowSkillModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden shadow-lg rounded-2xl"
                        >
                            <div className="p-5 border-b border-[var(--border-color)]/30">
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Skill</h3>
                            </div>
                            <div className="p-5">
                                <input
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    placeholder="e.g., React, Python, Project Management..."
                                    className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                />
                            </div>
                            <div className="p-5 border-t border-[var(--border-color)] flex justify-end gap-3">
                                <button onClick={() => setShowSkillModal(false)} className="px-5 py-2.5 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <button onClick={handleAddSkill} className="px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold">Add</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {/* Unconnect confirmation modal */}
                {showUnconnectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-overlay px-4">
                        <div className="bg-[var(--bg-secondary)] p-6 w-full max-w-[420px] rounded-2xl shadow-lg modal-content">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove connection</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-2">Are you sure you want to remove this connection? This cannot be undone.</p>
                            <div className="mt-4 flex justify-end gap-3">
                                <button onClick={() => setShowUnconnectModal(false)} className="px-4 py-2 border border-[var(--border-color)]">Cancel</button>
                                <button onClick={async () => { setShowUnconnectModal(false); await handleRemoveConnection(); }} className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)]">Remove</button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Connections List Modal */}
            <ConnectionsModal
                key={connectionsModalTab}
                open={showConnectionsModal}
                onClose={() => setShowConnectionsModal(false)}
                userId={id || user?.id || ''}
                userName={profileUser?.name?.split(' ')[0] || 'User'}
                defaultTab={connectionsModalTab}
            />

            {/* Crop Modal */}
            {showCropModal && cropImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                    <div className="bg-[var(--bg-secondary)] shadow-lg max-w-2xl w-full overflow-hidden rounded-2xl">
                        <div className="p-4 border-b border-[var(--border-color)]/30">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                Crop {cropType === 'avatar' ? 'Profile Photo' : 'Cover Photo'}
                            </h3>
                        </div>
                        
                        <div 
                            ref={cropContainerRef}
                            className="relative h-[400px] bg-black overflow-hidden select-none"
                            onMouseDown={(e) => {
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startCropX = crop.x;
                                const startCropY = crop.y;

                                const handleMouseMove = (e: MouseEvent) => {
                                    const deltaX = e.clientX - startX;
                                    const deltaY = e.clientY - startY;
                                    setCrop({ 
                                        x: Math.max(-500, Math.min(500, startCropX + deltaX)), 
                                        y: Math.max(-500, Math.min(500, startCropY + deltaY))
                                    });
                                };

                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                const startX = touch.clientX;
                                const startY = touch.clientY;
                                const startCropX = crop.x;
                                const startCropY = crop.y;

                                const handleTouchMove = (e: TouchEvent) => {
                                    const t = e.touches[0];
                                    const deltaX = t.clientX - startX;
                                    const deltaY = t.clientY - startY;
                                    setCrop({ 
                                        x: Math.max(-500, Math.min(500, startCropX + deltaX)), 
                                        y: Math.max(-500, Math.min(500, startCropY + deltaY))
                                    });
                                };

                                const handleTouchEnd = () => {
                                    document.removeEventListener('touchmove', handleTouchMove);
                                    document.removeEventListener('touchend', handleTouchEnd);
                                };

                                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                document.addEventListener('touchend', handleTouchEnd);
                            }}
                        >
                            <img 
                                src={cropImage} 
                                alt="Crop preview"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
                                    minWidth: '100%',
                                    minHeight: '100%',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                    userSelect: 'none',
                                    touchAction: 'none',
                                    cursor: 'move'
                                }}
                                draggable={false}
                            />
                            
                            <div className="absolute inset-0 pointer-events-none">
                                <svg width="100%" height="100%" className="absolute inset-0">
                                    <defs>
                                        <mask id="cropMask">
                                            <rect width="100%" height="100%" fill="white" />
                                            {cropType === 'avatar' ? (
                                                <circle cx="50%" cy="50%" r="150" fill="black" />
                                            ) : (
                                                <rect x="50%" y="50%" width="600" height="300" transform="translate(-300, -150)" fill="black" />
                                            )}
                                        </mask>
                                    </defs>
                                    <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#cropMask)" />
                                </svg>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--text-primary)]">Zoom: {zoom.toFixed(1)}x</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.05"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full mt-2"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowCropModal(false);
                                        setCropImage(null);
                                        setCrop({ x: 0, y: 0 });
                                        setZoom(1);
                                    }}
                                    className="px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const img = new Image();
                                        img.src = cropImage;
                                        img.onload = () => {
                                            const canvas = document.createElement('canvas');
                                            const outputW = cropType === 'avatar' ? 400 : 800;
                                            const outputH = cropType === 'avatar' ? 400 : 400;
                                            canvas.width = outputW;
                                            canvas.height = outputH;
                                            const ctx = canvas.getContext('2d');
                                            if (!ctx) return;

                                            // Visual crop mask dimensions (must match the SVG mask)
                                            const maskW = cropType === 'avatar' ? 300 : 600;
                                            const maskH = cropType === 'avatar' ? 300 : 300;

                                            // Container actual dimensions
                                            const cEl = cropContainerRef.current;
                                            const containerW = cEl ? cEl.clientWidth : 600;
                                            const containerH = cEl ? cEl.clientHeight : 400;

                                            // Image display size before zoom (CSS minWidth/minHeight: 100%)
                                            const displayW = Math.max(img.naturalWidth, containerW);
                                            const displayH = Math.max(img.naturalHeight, containerH);

                                            // Total scale: base fit * user zoom
                                            const totalScaleX = (displayW / img.naturalWidth) * zoom;
                                            const totalScaleY = (displayH / img.naturalHeight) * zoom;

                                            // Crop center in original image coords
                                            // Image center is offset by (crop.x, crop.y) from container center
                                            // So the fixed mask center is at (-crop.x, -crop.y) relative to image center
                                            const srcCenterX = img.naturalWidth / 2 - crop.x / totalScaleX;
                                            const srcCenterY = img.naturalHeight / 2 - crop.y / totalScaleY;

                                            // Source region in original image pixels
                                            const srcW = maskW / totalScaleX;
                                            const srcH = maskH / totalScaleY;
                                            const srcX = srcCenterX - srcW / 2;
                                            const srcY = srcCenterY - srcH / 2;

                                            if (cropType === 'avatar') {
                                                // Draw circular crop
                                                ctx.save();
                                                ctx.beginPath();
                                                ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
                                                ctx.closePath();
                                                ctx.clip();
                                                ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);
                                                ctx.restore();
                                            } else {
                                                ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputW, outputH);
                                            }

                                            canvas.toBlob((blob) => {
                                                if (!blob) return;
                                                const file = new File([blob], `${cropType}.png`, { type: 'image/png' });
                                                const preview = URL.createObjectURL(blob);

                                                if (cropType === 'avatar') {
                                                    setAvatarFile(file);
                                                    setAvatarPreview(preview);
                                                } else {
                                                    setCoverFile(file);
                                                    setCoverPreview(preview);
                                                }

                                                setShowCropModal(false);
                                                setCropImage(null);
                                                setCrop({ x: 0, y: 0 });
                                                setZoom(1);
                                                setEditMode(true);
                                            }, 'image/png');
                                        };
                                    }}
                                    className="px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold"
                                >
                                    Apply Crop
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ExperienceModal = ({ experience, onClose, onSave }: { experience: Experience | null, onClose: () => void, onSave: (exp: Experience) => void }) => {
    const [title, setTitle] = useState(experience?.title || '');
    const [company, setCompany] = useState(experience?.company || '');
    const [location, setLocation] = useState(experience?.location || '');
    const [startDate, setStartDate] = useState(experience?.startDate || '');
    const [endDate, setEndDate] = useState(experience?.endDate || '');
    const [current, setCurrent] = useState(experience?.current || false);
    const [description, setDescription] = useState(experience?.description || '');

    const handleSave = () => {
        if (!title || !company || !startDate) return;
        onSave({
            id: experience?.id || '',
            title, company, location, startDate, endDate, current, description
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-secondary)] w-full max-w-lg overflow-hidden shadow-lg rounded-2xl"
            >
                <div className="p-5 border-b border-[var(--border-color)]/30">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{experience ? 'Edit' : 'Add'} Experience</h3>
                </div>
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Title *</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Software Engineer" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Company *</label>
                        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g., Google" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Location</label>
                        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Bangalore, India" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Start Date *</label>
                            <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)]">End Date</label>
                            <input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={current} className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none disabled:opacity-50" />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="w-4 h-4" />
                        I currently work here
                    </label>
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your responsibilities..." className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none h-24 resize-none" />
                    </div>
                </div>
                <div className="p-5 border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)]">Cancel</button>
                    <button onClick={handleSave} disabled={!title || !company || !startDate} className="px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50">Save</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const EducationModal = ({ education, onClose, onSave }: { education: Education | null, onClose: () => void, onSave: (edu: Education) => void }) => {
    const [school, setSchool] = useState(education?.school || '');
    const [degree, setDegree] = useState(education?.degree || '');
    const [field, setField] = useState(education?.field || '');
    const [startYear, setStartYear] = useState(education?.startYear || new Date().getFullYear() - 4);
    const [endYear, setEndYear] = useState(education?.endYear || new Date().getFullYear());
    const [description, setDescription] = useState(education?.description || '');

    const handleSave = () => {
        if (!school || !degree) return;
        onSave({
            id: education?.id || '',
            school, degree, field, startYear, endYear, description
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-secondary)] w-full max-w-lg overflow-hidden shadow-lg rounded-2xl"
            >
                <div className="p-5 border-b border-[var(--border-color)]/30">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{education ? 'Edit' : 'Add'} Education</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">School *</label>
                        <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g., Stanford University" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Degree *</label>
                        <input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="e.g., Bachelor's Degree" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Field of Study</label>
                        <input value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g., Computer Science" className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Start Year</label>
                            <input type="number" value={startYear} onChange={(e) => setStartYear(parseInt(e.target.value))} className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)]">End Year</label>
                            <input type="number" value={endYear || ''} onChange={(e) => setEndYear(parseInt(e.target.value) || undefined)} className="w-full mt-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none" />
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-[var(--border-color)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)]">Cancel</button>
                    <button onClick={handleSave} disabled={!school || !degree} className="px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50">Save</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Profile;