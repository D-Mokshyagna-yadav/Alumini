import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Users, UserCheck, UserX, Search, ChevronDown, ChevronUp, Eye, EyeOff, Plus, Edit2, Trash2, X, Lock, FileText, Briefcase, Calendar, Shield, ShieldOff, Image as ImageIcon, Upload, FolderPlus, ThumbsUp, MessageCircle, MapPin, Phone, Mail, GraduationCap, Building2, BadgeCheck, Heart, ToggleLeft, ToggleRight, Newspaper, Star, Landmark } from 'lucide-react';
import { resolveMediaUrl } from '../../lib/media';
import CachedImage from '../../components/CachedImage';
import ImageCarousel from '../../components/ImageCarousel';
import { useConfirm } from '../../context/ConfirmContext';
import { Button } from '../../components/ui/Button';
import api from '../../lib/api';
import Avatar from '../../components/ui/Avatar';

interface User {
    _id: string;
    name: string;
    email: string;
    rollNumber: string;
    degree: string;
    department?: string;
    graduationYear: number;
    status: 'pending' | 'active' | 'rejected';
    createdAt: string;
    updatedAt?: string;
    phone?: string;
    headline?: string;
    industry?: string;
    currentLocation?: string;
    currentCompany?: string;
    designation?: string;
    bio?: string;
    role: string;
    avatar?: string;
    coverImage?: string;
    isMentor?: boolean;
    isVerified?: boolean;
    jobProviderPreference?: boolean;
    jobSeekerPreference?: boolean;
}

interface Analytics {
    totalUsers: number;
    pendingUsers: number;
    activeUsers: number;
    rejectedUsers: number;
    totalPosts: number;
    pendingPosts: number;
    totalJobs: number;
    pendingJobs: number;
    totalEvents: number;
    pendingEvents: number;
}

const emptyUserForm = {
    name: '',
    email: '',
    password: '',
    role: 'alumni',
    status: 'active',
    graduationYear: new Date().getFullYear(),
    degree: '',
    department: '',
    rollNumber: '',
    headline: '',
    industry: '',
    phone: '',
    currentLocation: '',
    currentCompany: '',
    designation: '',
    bio: ''
};

type TabKey = 'pending' | 'registered' | 'posts' | 'jobs' | 'events' | 'gallery' | 'news' | 'notable-alumni' | 'administration' | 'companies';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('pending');
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
    const [allPosts, setAllPosts] = useState<any[]>([]);
    const [allJobs, setAllJobs] = useState<any[]>([]);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [showUserModal, setShowUserModal] = useState(false);
    const [userModalMode, setUserModalMode] = useState<'create' | 'edit' | 'view'>('create');
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userModalLoading, setUserModalLoading] = useState(false);
    const [viewUserData, setViewUserData] = useState<User | null>(null);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectType, setRejectType] = useState<'event' | 'user'>('event');

    // Create modals
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'connections'>('public');
    const [postAttachments, setPostAttachments] = useState<File[]>([]);

    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', location: '', type: 'in-person', description: '' });
    const [eventBanner, setEventBanner] = useState<File | null>(null);

    const [showCreateJobModal, setShowCreateJobModal] = useState(false);
    const [newJob, setNewJob] = useState({ title: '', company: '', location: '', type: 'Full-time', mode: 'Remote', description: '', salary: '' });
    const [jobRequirements, setJobRequirements] = useState('');
    const [jobImage, setJobImage] = useState<File | null>(null);

    // Gallery
    const [allAlbums, setAllAlbums] = useState<any[]>([]);
    const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
    const [newAlbumTitle, setNewAlbumTitle] = useState('');
    const [newAlbumDesc, setNewAlbumDesc] = useState('');
    const [showUploadMediaModal, setShowUploadMediaModal] = useState(false);
    const [uploadAlbumId, setUploadAlbumId] = useState<string | null>(null);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [showEditAlbumModal, setShowEditAlbumModal] = useState(false);
    const [editAlbumId, setEditAlbumId] = useState<string | null>(null);
    const [editAlbumTitle, setEditAlbumTitle] = useState('');
    const [editAlbumDesc, setEditAlbumDesc] = useState('');

    // News
    const [allNews, setAllNews] = useState<any[]>([]);
    const [showNewsModal, setShowNewsModal] = useState(false);
    const [newsModalMode, setNewsModalMode] = useState<'create' | 'edit'>('create');
    const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
    const [newsForm, setNewsForm] = useState({ title: '', body: '', link: '', priority: 0, draft: false });
    const [newsImage, setNewsImage] = useState<File | null>(null);

    // Notable Alumni
    const [allNotableAlumni, setAllNotableAlumni] = useState<any[]>([]);
    const [showAlumniModal, setShowAlumniModal] = useState(false);
    const [alumniModalMode, setAlumniModalMode] = useState<'create' | 'edit'>('create');
    const [editingAlumniId, setEditingAlumniId] = useState<string | null>(null);
    const [alumniForm, setAlumniForm] = useState({ name: '', role: '', batch: '', profileId: '', order: 0 });
    const [alumniImage, setAlumniImage] = useState<File | null>(null);
    const [alumniUserSearch, setAlumniUserSearch] = useState('');
    const [alumniUserResults, setAlumniUserResults] = useState<any[]>([]);

    // Administration
    const [allAdminMembers, setAllAdminMembers] = useState<any[]>([]);
    const [showAdminMemberModal, setShowAdminMemberModal] = useState(false);
    const [adminMemberMode, setAdminMemberMode] = useState<'create' | 'edit'>('create');
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [adminMemberForm, setAdminMemberForm] = useState({ name: '', designation: '', category: 'governing' as 'governing' | 'officials', order: 0 });

    // Alumni Work At (Companies)
    const DEFAULT_COMPANIES = ['Microsoft','Google','Amazon','TCS','Infosys','Wipro','Capgemini','Cognizant','Accenture','HCL Tech','Oracle','IBM'];
    const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);
    const [homeData, setHomeData] = useState<any>(null);
    const [newCompany, setNewCompany] = useState('');
    const [editingCompanyIdx, setEditingCompanyIdx] = useState<number | null>(null);
    const [editCompanyValue, setEditCompanyValue] = useState('');
    const [companiesSaving, setCompaniesSaving] = useState(false);

    // Post preview
    const [previewPost, setPreviewPost] = useState<any | null>(null);
    const [previewPostLoading, setPreviewPostLoading] = useState(false);

    // Edit modals
    const [showEditPostModal, setShowEditPostModal] = useState(false);
    const [editPostId, setEditPostId] = useState<string | null>(null);
    const [editPostContent, setEditPostContent] = useState('');
    const [editPostVisibility, setEditPostVisibility] = useState<'public' | 'connections'>('public');

    const [showEditEventModal, setShowEditEventModal] = useState(false);
    const [editEventId, setEditEventId] = useState<string | null>(null);
    const [editEventForm, setEditEventForm] = useState({ title: '', date: '', time: '', location: '', description: '' });
    const [editEventBanner, setEditEventBanner] = useState<File | null>(null);

    const [showEditJobModal, setShowEditJobModal] = useState(false);
    const [editJobId, setEditJobId] = useState<string | null>(null);
    const [editJobForm, setEditJobForm] = useState({ title: '', company: '', location: '', type: 'Full-time', mode: 'Remote', description: '', salary: '' });
    const [editJobRequirements, setEditJobRequirements] = useState('');
    const [editJobImage, setEditJobImage] = useState<File | null>(null);

    const [toast, setToast] = useState<string | null>(null);
    const confirm = useConfirm();

    // Auto-approval settings
    const [autoApproveUsers, setAutoApproveUsers] = useState(false);
    const [autoApprovePosts, setAutoApprovePosts] = useState(false);
    const [autoApproveJobs, setAutoApproveJobs] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const fetchData = async () => {
        try {
            const [pendingRes, registeredRes, analyticsRes, postsRes, jobsRes, eventsRes, galleryRes, settingsRes, newsRes, notableRes, adminMembersRes, homeContentRes] = await Promise.all([
                api.get('/admin/pending-users'),
                api.get('/admin/all-users?status=active'),
                api.get('/admin/analytics-full').catch(() => api.get('/admin/analytics').then(r => ({ data: { ...r.data, totalPosts: 0, totalJobs: 0, totalEvents: 0, pendingEvents: 0 } }))),
                api.get('/admin/all-posts').catch(() => ({ data: { posts: [] } })),
                api.get('/admin/all-jobs').catch(() => ({ data: { jobs: [] } })),
                api.get('/admin/all-events').catch(() => ({ data: { events: [] } })),
                api.get('/gallery').catch(() => ({ data: { albums: [] } })),
                api.get('/admin/settings').catch(() => ({ data: { settings: { autoApproveUsers: false, autoApprovePosts: false, autoApproveJobs: false } } })),
                api.get('/public/news').catch(() => ({ data: { news: [] } })),
                api.get('/admin/notable-alumni').catch(() => ({ data: { alumni: [] } })),
                api.get('/admin/administration').catch(() => ({ data: { members: [] } })),
                api.get('/public/home').catch(() => ({ data: { home: {} } })),
            ]);
            setPendingUsers(pendingRes.data.users);
            setRegisteredUsers(registeredRes.data.users);
            setAnalytics(analyticsRes.data);
            setAllPosts(postsRes.data.posts || []);
            setAllJobs(jobsRes.data.jobs || []);
            setAllEvents(eventsRes.data.events || []);
            setAllAlbums(galleryRes.data.albums || []);
            setAllNews(newsRes.data.news || []);
            setAllNotableAlumni(notableRes.data.alumni || []);
            const adminMembers = adminMembersRes.data.members || [];
            setAllAdminMembers(adminMembers);
            // Auto-seed administration if empty
            if (adminMembers.length === 0) {
                api.post('/admin/administration/seed').then(r => {
                    if (r.data.members) setAllAdminMembers(r.data.members);
                }).catch(() => {});
            }
            if (settingsRes.data.settings) {
                setAutoApproveUsers(settingsRes.data.settings.autoApproveUsers);
                setAutoApprovePosts(settingsRes.data.settings.autoApprovePosts);
                setAutoApproveJobs(settingsRes.data.settings.autoApproveJobs ?? false);
            }
            // Companies from home content
            const hData = homeContentRes.data.home || {};
            setHomeData(hData);
            if (Array.isArray(hData.companies) && hData.companies.length > 0) {
                setCompanies(hData.companies);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ==================== USER ACTIONS ====================
    const handleVerify = async (userId: string) => {
        // Guard: only verify users currently in the pending list
        const user = pendingUsers.find(u => u._id === userId);
        if (!user || user.status === 'active') {
            setToast('User is already verified');
            setShowUserModal(false);
            return;
        }
        setActionLoading(userId);
        const prevPending = pendingUsers.slice();
        setPendingUsers(prev => prev.filter(u => u._id !== userId));
        setRegisteredUsers(prev => [{ ...user, status: 'active' }, ...prev]);
        if (analytics) setAnalytics({ ...analytics, pendingUsers: analytics.pendingUsers - 1, activeUsers: analytics.activeUsers + 1 });
        try {
            await api.post(`/admin/verify-user/${userId}`);
            setToast('User approved successfully');
        } catch (error) {
            console.error('Verification failed:', error);
            setPendingUsers(prevPending);
            if (user) setRegisteredUsers(prev => prev.filter(u => u._id !== userId));
            setToast('Failed to verify user');
        } finally {
            setActionLoading(null);
            setShowUserModal(false);
        }
    };

    const handleReject = async (userId: string) => {
        setRejectTarget(userId);
        setRejectType('user');
        setShowRejectModal(true);
    };

    const submitRejectUser = async () => {
        if (!rejectTarget || !rejectReason.trim()) {
            setToast('Please provide a reason for rejection');
            return;
        }
        setActionLoading(rejectTarget);
        const prevPending = pendingUsers.slice();
        setPendingUsers(prev => prev.filter(u => u._id !== rejectTarget));
        if (analytics) setAnalytics({ ...analytics, pendingUsers: analytics.pendingUsers - 1, totalUsers: analytics.totalUsers - 1 });
        setShowRejectModal(false);
        setShowUserModal(false);
        try {
            await api.post(`/admin/reject-user/${rejectTarget}`, { reason: rejectReason });
            setToast('User rejected and removed from database');
        } catch (error) {
            console.error('Rejection failed:', error);
            setPendingUsers(prevPending);
            if (analytics) setAnalytics({ ...analytics, pendingUsers: analytics.pendingUsers + 1, totalUsers: analytics.totalUsers + 1 });
            setToast('Failed to reject user');
        } finally {
            setActionLoading(null);
            setRejectTarget(null);
            setRejectReason('');
        }
    };

    const toggleExpand = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    const handleDeleteUser = async (userId: string) => {
        const ok = await confirm({ title: 'Delete User', message: 'Are you sure you want to delete this user? This action cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/admin/user/${userId}`);
            setPendingUsers(prev => prev.filter(u => u._id !== userId));
            setRegisteredUsers(prev => prev.filter(u => u._id !== userId));
            if (analytics) setAnalytics({ ...analytics, totalUsers: analytics.totalUsers - 1, activeUsers: analytics.activeUsers - 1 });
            setToast('User deleted successfully');
        } catch (err) {
            setToast('Failed to delete user');
        }
    };

    const handleToggleAdmin = async (user: User) => {
        const newRole = user.role === 'admin' ? 'alumni' : 'admin';
        const action = newRole === 'admin' ? 'promote to admin' : 'demote from admin';
        const ok = await confirm({ title: 'Change Role', message: `Are you sure you want to ${action} "${user.name}"?`, confirmText: action === 'promote to admin' ? 'Promote' : 'Demote' });
        if (!ok) return;
        try {
            const res = await api.put(`/admin/user/${user._id}`, { role: newRole });
            const updated = res.data.user;
            setRegisteredUsers(prev => prev.map(u => u._id === user._id ? updated : u));
            setPendingUsers(prev => prev.map(u => u._id === user._id ? updated : u));
            setToast(`${user.name} ${newRole === 'admin' ? 'promoted to admin' : 'demoted from admin'}`);
        } catch (err) {
            setToast('Failed to change role');
        }
    };

    // ==================== EVENT ACTIONS ====================
    const handleApproveEvent = async (eventId: string) => {
        const ok = await confirm({ title: 'Approve Event', message: 'Are you sure you want to approve this event?', confirmText: 'Approve' });
        if (!ok) return;
        try {
            await api.post(`/admin/approve-event/${eventId}`);
            setAllEvents(prev => prev.map(e => e._id === eventId ? { ...e, status: 'APPROVED' } : e));
            setToast('Event approved');
        } catch (err) {
            console.error('Approve event failed', err);
            setToast('Failed to approve event');
        }
    };

    const handleRejectEvent = async (eventId: string) => {
        setRejectTarget(eventId);
        setRejectType('event');
        setShowRejectModal(true);
    };

    const submitRejectEvent = async () => {
        if (!rejectTarget) return;
        try {
            await api.post(`/admin/reject-event/${rejectTarget}`, { reason: rejectReason });
            setAllEvents(prev => prev.map(e => e._id === rejectTarget ? { ...e, status: 'REJECTED' } : e));
            setToast('Event rejected');
        } catch (err) {
            console.error('Reject event failed', err);
            setToast('Failed to reject event');
        } finally {
            setShowRejectModal(false);
            setRejectTarget(null);
            setRejectReason('');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        const ok = await confirm({ title: 'Delete Event', message: 'Permanently delete this event? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/admin/event/${eventId}`);
            setAllEvents(prev => prev.filter(e => e._id !== eventId));
            if (analytics) setAnalytics({ ...analytics, totalEvents: analytics.totalEvents - 1 });
            setToast('Event deleted');
        } catch (err) {
            setToast('Failed to delete event');
        }
    };

    // ==================== POST ACTIONS ====================
    const handleApprovePost = async (postId: string) => {
        try {
            await api.post(`/admin/approve-post/${postId}`);
            setAllPosts(prev => prev.map(p => p._id === postId ? { ...p, status: 'approved' } : p));
            if (analytics) setAnalytics({ ...analytics, pendingPosts: Math.max(0, analytics.pendingPosts - 1) });
            setToast('Post approved and published');
        } catch (err) {
            setToast('Failed to approve post');
        }
    };

    const handleRejectPost = async (postId: string) => {
        const reason = prompt('Reason for rejecting this post (optional):');
        try {
            await api.post(`/admin/reject-post/${postId}`, { reason: reason || '' });
            setAllPosts(prev => prev.map(p => p._id === postId ? { ...p, status: 'rejected' } : p));
            if (analytics) setAnalytics({ ...analytics, pendingPosts: Math.max(0, analytics.pendingPosts - 1) });
            setToast('Post rejected');
        } catch (err) {
            setToast('Failed to reject post');
        }
    };

    const handleDeletePost = async (postId: string) => {
        const ok = await confirm({ title: 'Delete Post', message: 'Permanently delete this post? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/admin/post/${postId}`);
            setAllPosts(prev => prev.filter(p => p._id !== postId));
            if (analytics) setAnalytics({ ...analytics, totalPosts: analytics.totalPosts - 1 });
            setToast('Post deleted');
        } catch (err) {
            setToast('Failed to delete post');
        }
    };

    const handleViewPost = async (postId: string) => {
        setPreviewPostLoading(true);
        try {
            const res = await api.get(`/posts/detail/${postId}`);
            setPreviewPost(res.data.post);
        } catch {
            setToast('Failed to load post details');
        } finally {
            setPreviewPostLoading(false);
        }
    };

    // ==================== JOB ACTIONS ====================
    const handleApproveJob = async (jobId: string) => {
        try {
            await api.post(`/admin/approve-job/${jobId}`);
            setAllJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: 'approved' } : j));
            if (analytics) setAnalytics({ ...analytics, pendingJobs: Math.max(0, analytics.pendingJobs - 1) });
            setToast('Job approved and published');
        } catch (err) {
            setToast('Failed to approve job');
        }
    };

    const handleRejectJob = async (jobId: string) => {
        const reason = prompt('Reason for rejecting this job (optional):');
        try {
            await api.post(`/admin/reject-job/${jobId}`, { reason: reason || '' });
            setAllJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: 'rejected' } : j));
            if (analytics) setAnalytics({ ...analytics, pendingJobs: Math.max(0, analytics.pendingJobs - 1) });
            setToast('Job rejected');
        } catch (err) {
            setToast('Failed to reject job');
        }
    };

    const handleDeleteJob = async (jobId: string) => {
        const ok = await confirm({ title: 'Delete Job', message: 'Permanently delete this job posting? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/admin/job/${jobId}`);
            setAllJobs(prev => prev.filter(j => j._id !== jobId));
            if (analytics) setAnalytics({ ...analytics, totalJobs: analytics.totalJobs - 1 });
            setToast('Job deleted');
        } catch (err) {
            setToast('Failed to delete job');
        }
    };

    // ==================== CREATE POST ====================
    const handleAdminCreatePost = async () => {
        if (!newPostContent.trim()) { setToast('Post content is required'); return; }
        try {
            let mediaPayload: any[] = [];
            if (postAttachments.length > 0) {
                const form = new FormData();
                postAttachments.forEach(f => form.append('media', f));
                const uploadRes = await api.post('/upload/post-media', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                mediaPayload = uploadRes.data.media || [];
            }
            const res = await api.post('/posts', { content: newPostContent, media: mediaPayload, visibility: newPostVisibility });
            setAllPosts(prev => [res.data.post, ...prev]);
            if (analytics) setAnalytics({ ...analytics, totalPosts: analytics.totalPosts + 1 });
            setNewPostContent('');
            setPostAttachments([]);
            setShowCreatePostModal(false);
            setToast('Post created and published');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to create post');
        }
    };

    // ==================== CREATE EVENT ====================
    const handleAdminCreateEvent = async () => {
        if (!newEvent.title || !newEvent.date) { setToast('Title and date are required'); return; }
        try {
            let bannerUrl: string | undefined;
            if (eventBanner) {
                const form = new FormData();
                form.append('banner', eventBanner);
                const up = await api.post('/upload/event-banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                bannerUrl = up.data.relative || up.data.url;
            }
            const payload = { title: newEvent.title, description: newEvent.description, date: newEvent.date, time: newEvent.time, venue: newEvent.location, bannerImage: bannerUrl };
            const res = await api.post('/events', payload);
            if (res.data.event) setAllEvents(prev => [res.data.event, ...prev]);
            if (analytics) setAnalytics({ ...analytics, totalEvents: analytics.totalEvents + 1 });
            setNewEvent({ title: '', date: '', time: '', location: '', type: 'in-person', description: '' });
            setEventBanner(null);
            setShowCreateEventModal(false);
            setToast('Event created and published');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to create event');
        }
    };

    // ==================== CREATE JOB ====================
    const handleAdminCreateJob = async () => {
        if (!newJob.title || !newJob.company) { setToast('Title and company are required'); return; }
        try {
            let imageUrl: string | undefined;
            if (jobImage) {
                const fd = new FormData();
                fd.append('image', jobImage);
                const up = await api.post('/upload/job-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = up.data.relative || up.data.url;
            }
            const requirementsArr = jobRequirements.split(',').map(s => s.trim()).filter(Boolean);
            const payload = { ...newJob, image: imageUrl, requirements: requirementsArr, salary: newJob.salary || undefined };
            const res = await api.post('/jobs', payload);
            if (res.data.job) setAllJobs(prev => [res.data.job, ...prev]);
            if (analytics) setAnalytics({ ...analytics, totalJobs: analytics.totalJobs + 1 });
            setNewJob({ title: '', company: '', location: '', type: 'Full-time', mode: 'Remote', description: '', salary: '' });
            setJobRequirements('');
            setJobImage(null);
            setShowCreateJobModal(false);
            setToast('Job created and published');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to create job');
        }
    };

    // ==================== EDIT POST ====================
    const openEditPostModal = (post: any) => {
        setEditPostId(post._id);
        setEditPostContent(post.content || '');
        setEditPostVisibility(post.visibility || 'public');
        setShowEditPostModal(true);
    };

    const handleEditPost = async () => {
        if (!editPostId || !editPostContent.trim()) return;
        try {
            const res = await api.put(`/posts/${editPostId}`, { content: editPostContent, visibility: editPostVisibility });
            if (res.data.post) {
                setAllPosts(prev => prev.map(p => p._id === editPostId ? { ...p, ...res.data.post } : p));
            }
            setShowEditPostModal(false);
            setToast('Post updated');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to update post');
        }
    };

    // ==================== EDIT EVENT ====================
    const openEditEventModal = (ev: any) => {
        setEditEventId(ev._id);
        setEditEventForm({
            title: ev.title || '',
            date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : '',
            time: ev.time || '',
            location: ev.venue || '',
            description: ev.description || '',
        });
        setEditEventBanner(null);
        setShowEditEventModal(true);
    };

    const handleEditEvent = async () => {
        if (!editEventId || !editEventForm.title) return;
        try {
            let bannerUrl: string | undefined;
            if (editEventBanner) {
                const form = new FormData();
                form.append('banner', editEventBanner);
                const up = await api.post('/upload/event-banner', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                bannerUrl = up.data.relative || up.data.url;
            }
            const payload: any = { title: editEventForm.title, description: editEventForm.description, date: editEventForm.date, time: editEventForm.time, venue: editEventForm.location };
            if (bannerUrl) payload.bannerImage = bannerUrl;
            const res = await api.put(`/events/${editEventId}`, payload);
            if (res.data.event) {
                setAllEvents(prev => prev.map(e => e._id === editEventId ? res.data.event : e));
            }
            setShowEditEventModal(false);
            setToast('Event updated');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to update event');
        }
    };

    // ==================== EDIT JOB ====================
    const openEditJobModal = (job: any) => {
        setEditJobId(job._id);
        setEditJobForm({
            title: job.title || '',
            company: job.company || '',
            location: job.location || '',
            type: job.type || 'Full-time',
            mode: job.mode || 'Remote',
            description: job.description || '',
            salary: job.salary || '',
        });
        setEditJobRequirements((job.requirements || []).join(', '));
        setEditJobImage(null);
        setShowEditJobModal(true);
    };

    const handleEditJob = async () => {
        if (!editJobId || !editJobForm.title) return;
        try {
            let imageUrl: string | undefined;
            if (editJobImage) {
                const fd = new FormData();
                fd.append('image', editJobImage);
                const up = await api.post('/upload/job-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = up.data.relative || up.data.url;
            }
            const requirementsArr = editJobRequirements.split(',').map(s => s.trim()).filter(Boolean);
            const payload: any = { ...editJobForm, requirements: requirementsArr };
            if (imageUrl) payload.image = imageUrl;
            if (editJobForm.salary) payload.salary = editJobForm.salary;
            const res = await api.put(`/jobs/${editJobId}`, payload);
            if (res.data.jobId) {
                setAllJobs(prev => prev.map(j => j._id === editJobId ? { ...j, ...editJobForm, requirements: requirementsArr, ...(imageUrl ? { image: imageUrl } : {}) } : j));
            }
            setShowEditJobModal(false);
            setToast('Job updated');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to update job');
        }
    };

    // ==================== NEWS ACTIONS ====================
    const resetNewsForm = () => {
        setNewsForm({ title: '', body: '', link: '', priority: 0, draft: false });
        setNewsImage(null);
        setEditingNewsId(null);
        setNewsModalMode('create');
    };

    const openCreateNewsModal = () => {
        resetNewsForm();
        setNewsModalMode('create');
        setShowNewsModal(true);
    };

    const openEditNewsModal = (item: any) => {
        setNewsForm({
            title: item.title || '',
            body: item.body || '',
            link: item.link || '',
            priority: item.priority || 0,
            draft: !!item.draft,
        });
        setEditingNewsId(item._id);
        setNewsModalMode('edit');
        setShowNewsModal(true);
    };

    const handleSaveNews = async () => {
        if (!newsForm.title.trim()) { setToast('Title is required'); return; }
        try {
            let imageUrl: string | undefined;
            if (newsImage) {
                const fd = new FormData();
                fd.append('image', newsImage);
                const up = await api.post('/upload/news-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = up.data.relative || up.data.url;
            }
            const payload: any = { ...newsForm, publishedAt: new Date().toISOString() };
            if (imageUrl) payload.image = imageUrl;

            if (newsModalMode === 'edit' && editingNewsId) {
                const res = await api.put(`/public/news/${editingNewsId}`, payload);
                if (res.data.item) {
                    setAllNews(prev => prev.map(n => n._id === editingNewsId ? res.data.item : n));
                }
                setToast('News updated');
            } else {
                const res = await api.post('/public/news', payload);
                if (res.data.item) setAllNews(prev => [res.data.item, ...prev]);
                setToast('News published');
            }
            resetNewsForm();
            setShowNewsModal(false);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to save news');
        }
    };

    const handleDeleteNews = async (id: string) => {
        try {
            await api.delete(`/public/news/${id}`);
            setAllNews(prev => prev.filter(n => n._id !== id));
            setToast('News deleted');
        } catch {
            setToast('Failed to delete news');
        }
    };

    const handleToggleNewsDraft = async (item: any) => {
        try {
            const res = await api.put(`/public/news/${item._id}`, { draft: !item.draft });
            if (res.data.item) {
                setAllNews(prev => prev.map(n => n._id === item._id ? res.data.item : n));
            }
            setToast(item.draft ? 'News published' : 'News moved to drafts');
        } catch {
            setToast('Failed to update news');
        }
    };

    // ==================== GALLERY ACTIONS ====================
    const handleCreateAlbum = async () => {
        if (!newAlbumTitle.trim()) { setToast('Album title is required'); return; }
        try {
            const res = await api.post('/gallery/album', { title: newAlbumTitle, description: newAlbumDesc });
            setAllAlbums(prev => [res.data.album, ...prev]);
            setNewAlbumTitle('');
            setNewAlbumDesc('');
            setShowCreateAlbumModal(false);
            setToast('Album created');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to create album');
        }
    };

    const openEditAlbumModal = (album: any) => {
        setEditAlbumId(album.id);
        setEditAlbumTitle(album.title);
        setEditAlbumDesc(album.description || '');
        setShowEditAlbumModal(true);
    };

    const handleEditAlbum = async () => {
        if (!editAlbumId || !editAlbumTitle.trim()) return;
        try {
            await api.put(`/gallery/album/${editAlbumId}`, { title: editAlbumTitle, description: editAlbumDesc });
            setAllAlbums(prev => prev.map(a => a.id === editAlbumId ? { ...a, title: editAlbumTitle, description: editAlbumDesc } : a));
            setShowEditAlbumModal(false);
            setToast('Album updated');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to update album');
        }
    };

    const handleDeleteAlbum = async (albumId: string) => {
        const ok = await confirm({ title: 'Delete Album', message: 'Delete this album and all its contents? This cannot be undone.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/gallery/album/${albumId}`);
            setAllAlbums(prev => prev.filter(a => a.id !== albumId));
            setToast('Album deleted');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to delete album');
        }
    };

    const handleUploadMedia = async () => {
        if (!uploadAlbumId || mediaFiles.length === 0) return;
        try {
            const formData = new FormData();
            mediaFiles.forEach(f => formData.append('images', f));
            const res = await api.post(`/gallery/album/${uploadAlbumId}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const newMedia = res.data.images || [];
            setAllAlbums(prev => prev.map(a => a.id === uploadAlbumId ? { ...a, images: [...(a.images || []), ...newMedia] } : a));
            setMediaFiles([]);
            setShowUploadMediaModal(false);
            setUploadAlbumId(null);
            setToast(`${newMedia.length} file(s) uploaded`);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to upload');
        }
    };

    const handleDeleteMedia = async (albumId: string, mediaId: string) => {
        const ok = await confirm({ title: 'Delete Media', message: 'Delete this media item?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/gallery/album/${albumId}/images/${mediaId}`);
            setAllAlbums(prev => prev.map(a => a.id === albumId ? { ...a, images: (a.images || []).filter((i: any) => i.id !== mediaId) } : a));
            setToast('Media deleted');
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to delete');
        }
    };

    // ==================== AUTO-APPROVAL TOGGLE ====================
    const handleToggleAutoApprove = async (field: 'autoApproveUsers' | 'autoApprovePosts' | 'autoApproveJobs') => {
        const currentValue = field === 'autoApproveUsers' ? autoApproveUsers : field === 'autoApprovePosts' ? autoApprovePosts : autoApproveJobs;
        const newValue = !currentValue;
        // Optimistic update
        if (field === 'autoApproveUsers') setAutoApproveUsers(newValue);
        else if (field === 'autoApprovePosts') setAutoApprovePosts(newValue);
        else setAutoApproveJobs(newValue);
        try {
            await api.put('/admin/settings', { [field]: newValue });
            const label = field === 'autoApproveUsers' ? 'User' : field === 'autoApprovePosts' ? 'Post' : 'Job';
            setToast(`${label} auto-approval ${newValue ? 'enabled' : 'disabled'}`);
        } catch (err) {
            // Revert on failure
            if (field === 'autoApproveUsers') setAutoApproveUsers(!newValue);
            else if (field === 'autoApprovePosts') setAutoApprovePosts(!newValue);
            else setAutoApproveJobs(!newValue);
            setToast('Failed to update setting');
        }
    };

    // ==================== USER MODAL ====================
    const openCreateUserModal = () => {
        setUserForm(emptyUserForm);
        setEditingUserId(null);
        setUserModalMode('create');
        setShowUserModal(true);
    };

    const openEditUserModal = async (user: User) => {
        setUserModalLoading(true);
        setUserModalMode('edit');
        setEditingUserId(user._id);
        setShowUserModal(true);
        try {
            const res = await api.get(`/admin/user/${user._id}`);
            const u = res.data.user;
            setUserForm({
                name: u.name || '',
                email: u.email || '',
                password: '',
                role: u.role || 'alumni',
                status: u.status || 'active',
                graduationYear: u.graduationYear || new Date().getFullYear(),
                degree: u.degree || '',
                department: u.department || '',
                rollNumber: u.rollNumber || '',
                headline: u.headline || '',
                industry: u.industry || '',
                phone: u.phone || '',
                currentLocation: u.currentLocation || '',
                currentCompany: u.currentCompany || '',
                designation: u.designation || '',
                bio: u.bio || ''
            });
        } catch (err) {
            setToast('Failed to load user details');
            setShowUserModal(false);
        } finally {
            setUserModalLoading(false);
        }
    };

    const openViewUserModal = async (user: User) => {
        setUserModalLoading(true);
        setUserModalMode('view');
        setEditingUserId(user._id);
        setViewUserData(null);
        setShowUserModal(true);
        try {
            const res = await api.get(`/admin/user/${user._id}`);
            setViewUserData(res.data.user);
        } catch (err) {
            setToast('Failed to load user details');
            setShowUserModal(false);
        } finally {
            setUserModalLoading(false);
        }
    };

    const handleUserFormChange = (field: string, value: string | number) => {
        setUserForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCreateUser = async () => {
        setUserModalLoading(true);
        try {
            const res = await api.post('/admin/create-user', userForm);
            setRegisteredUsers(prev => [res.data.user, ...prev]);
            if (analytics) setAnalytics({ ...analytics, totalUsers: analytics.totalUsers + 1, activeUsers: analytics.activeUsers + 1 });
            setToast('User created successfully');
            setShowUserModal(false);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to create user');
        } finally {
            setUserModalLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUserId) return;
        setUserModalLoading(true);
        try {
            const payload: any = { ...userForm };
            if (!payload.password) delete payload.password;
            const res = await api.put(`/admin/user/${editingUserId}`, payload);
            setPendingUsers(prev => prev.map(u => u._id === editingUserId ? res.data.user : u));
            setRegisteredUsers(prev => prev.map(u => u._id === editingUserId ? res.data.user : u));
            setToast('User updated successfully');
            setShowUserModal(false);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to update user');
        } finally {
            setUserModalLoading(false);
        }
    };

    // ==================== NOTABLE ALUMNI ACTIONS ====================
    const resetAlumniForm = () => {
        setAlumniForm({ name: '', role: '', batch: '', profileId: '', order: 0 });
        setAlumniImage(null);
        setEditingAlumniId(null);
        setAlumniModalMode('create');
        setAlumniUserSearch('');
        setAlumniUserResults([]);
    };

    const openCreateAlumniModal = () => {
        resetAlumniForm();
        setAlumniModalMode('create');
        setShowAlumniModal(true);
    };

    const openEditAlumniModal = (item: any) => {
        setAlumniForm({
            name: item.name || '',
            role: item.role || '',
            batch: item.batch || '',
            profileId: item.profileId || '',
            order: item.order || 0,
        });
        setEditingAlumniId(item._id);
        setAlumniModalMode('edit');
        setShowAlumniModal(true);
    };

    const handleSaveAlumni = async () => {
        if (!alumniForm.name.trim() || !alumniForm.role.trim() || !alumniForm.batch.trim()) {
            setToast('Name, role and batch are required');
            return;
        }
        try {
            let imageUrl: string | undefined;
            if (alumniImage) {
                const fd = new FormData();
                fd.append('image', alumniImage);
                const up = await api.post('/upload/notable-alumni-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = up.data.relative || up.data.url;
            }

            if (alumniModalMode === 'edit' && editingAlumniId) {
                const payload: any = { ...alumniForm };
                if (imageUrl) payload.image = imageUrl;
                const res = await api.put(`/admin/notable-alumni/${editingAlumniId}`, payload);
                if (res.data.alumni) {
                    setAllNotableAlumni(prev => prev.map(a => a._id === editingAlumniId ? res.data.alumni : a));
                }
                setToast('Alumni updated');
            } else {
                if (!imageUrl && !alumniImage) {
                    setToast('Image is required');
                    return;
                }
                const payload: any = { ...alumniForm, image: imageUrl };
                const res = await api.post('/admin/notable-alumni', payload);
                if (res.data.alumni) setAllNotableAlumni(prev => [...prev, res.data.alumni]);
                setToast('Alumni added');
            }
            resetAlumniForm();
            setShowAlumniModal(false);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to save alumni');
        }
    };

    const handleDeleteAlumni = async (id: string) => {
        const ok = await confirm({ title: 'Delete Alumni', message: 'Remove this notable alumni entry?' });
        if (!ok) return;
        try {
            await api.delete(`/admin/notable-alumni/${id}`);
            setAllNotableAlumni(prev => prev.filter(a => a._id !== id));
            setToast('Alumni deleted');
        } catch {
            setToast('Failed to delete alumni');
        }
    };

    const searchAlumniUsers = async (q: string) => {
        setAlumniUserSearch(q);
        if (q.trim().length < 2) { setAlumniUserResults([]); return; }
        try {
            const res = await api.get(`/admin/all-users?status=active`);
            const filtered = (res.data.users || []).filter((u: any) =>
                u.name.toLowerCase().includes(q.toLowerCase()) ||
                u.email.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 8);
            setAlumniUserResults(filtered);
        } catch {
            setAlumniUserResults([]);
        }
    };

    // ==================== FILTERING ====================

    // ==================== ADMINISTRATION ACTIONS ====================
    const resetAdminMemberForm = () => {
        setAdminMemberForm({ name: '', designation: '', category: 'governing', order: 0 });
        setEditingMemberId(null);
        setAdminMemberMode('create');
    };

    const openCreateAdminMemberModal = () => {
        resetAdminMemberForm();
        setAdminMemberMode('create');
        setShowAdminMemberModal(true);
    };

    const openEditAdminMemberModal = (item: any) => {
        setAdminMemberForm({
            name: item.name || '',
            designation: item.designation || '',
            category: item.category || 'governing',
            order: item.order || 0,
        });
        setEditingMemberId(item._id);
        setAdminMemberMode('edit');
        setShowAdminMemberModal(true);
    };

    const handleSaveAdminMember = async () => {
        if (!adminMemberForm.name.trim() || !adminMemberForm.designation.trim()) {
            setToast('Name and designation are required');
            return;
        }
        try {
            if (adminMemberMode === 'edit' && editingMemberId) {
                const res = await api.put(`/admin/administration/${editingMemberId}`, adminMemberForm);
                if (res.data.member) {
                    setAllAdminMembers(prev => prev.map(m => m._id === editingMemberId ? res.data.member : m));
                }
                setToast('Member updated');
            } else {
                const res = await api.post('/admin/administration', adminMemberForm);
                if (res.data.member) setAllAdminMembers(prev => [...prev, res.data.member]);
                setToast('Member added');
            }
            resetAdminMemberForm();
            setShowAdminMemberModal(false);
        } catch (err: any) {
            setToast(err.response?.data?.message || 'Failed to save member');
        }
    };

    const handleDeleteAdminMember = async (id: string) => {
        const ok = await confirm({ title: 'Delete Member', message: 'Remove this administration member?' });
        if (!ok) return;
        try {
            await api.delete(`/admin/administration/${id}`);
            setAllAdminMembers(prev => prev.filter(m => m._id !== id));
            setToast('Member deleted');
        } catch {
            setToast('Failed to delete member');
        }
    };

    // ==================== FILTERING ====================
    const filteredUsers = (activeTab === 'pending' ? pendingUsers : registeredUsers).filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPosts = allPosts.filter(p =>
        (p.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredJobs = allJobs.filter(j =>
        (j.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.postedBy?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEvents = allEvents.filter(e =>
        (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredNews = allNews.filter(n =>
        (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.body || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredNotableAlumni = allNotableAlumni.filter(a =>
        (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.batch || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAdminMembers = allAdminMembers.filter(m =>
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent py-8">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header skeleton */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div className="h-8 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                        <div className="h-9 w-28 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                    </div>
                    {/* Tabs skeleton */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-10 w-28 rounded-xl bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                        ))}
                    </div>
                    {/* Table skeleton */}
                    <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-[var(--border-color)]/30 flex gap-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-3.5 w-24 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            ))}
                        </div>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={`p-4 flex items-center gap-4 ${i > 0 ? 'border-t border-[var(--border-color)]/20' : ''}`}>
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 w-36 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                    <div className="h-2.5 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                </div>
                                <div className="h-8 w-20 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== COMPANIES (Alumni Work At) ====================
    const handleSaveCompanies = async (updatedCompanies: string[]) => {
        setCompaniesSaving(true);
        try {
            const mergedData = { ...homeData, companies: updatedCompanies };
            await api.put('/public/content/home', { data: mergedData });
            setHomeData(mergedData);
            setCompanies(updatedCompanies);
            setToast('Companies updated successfully');
        } catch {
            setToast('Failed to save companies');
        } finally {
            setCompaniesSaving(false);
        }
    };

    const handleAddCompany = () => {
        const name = newCompany.trim();
        if (!name) return;
        if (companies.includes(name)) { setToast('Company already exists'); return; }
        const updated = [...companies, name];
        setNewCompany('');
        handleSaveCompanies(updated);
    };

    const handleDeleteCompany = async (idx: number) => {
        const ok = await confirm({ title: 'Remove Company', message: `Remove "${companies[idx]}" from the list?`, confirmText: 'Remove', danger: true });
        if (!ok) return;
        const updated = companies.filter((_, i) => i !== idx);
        handleSaveCompanies(updated);
    };

    const handleEditCompanySave = (idx: number) => {
        const name = editCompanyValue.trim();
        if (!name) return;
        if (companies.some((c, i) => c === name && i !== idx)) { setToast('Company already exists'); return; }
        const updated = companies.map((c, i) => i === idx ? name : c);
        setEditingCompanyIdx(null);
        handleSaveCompanies(updated);
    };

    const handleMoveCompany = (idx: number, dir: 'up' | 'down') => {
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= companies.length) return;
        const updated = [...companies];
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        handleSaveCompanies(updated);
    };

    const tabs: { key: TabKey; label: string; count: number; icon: any }[] = [
        { key: 'pending', label: 'Pending Users', count: pendingUsers.length, icon: Clock },
        { key: 'registered', label: 'All Users', count: registeredUsers.length, icon: Users },
        { key: 'posts', label: 'Posts', count: allPosts.length, icon: FileText },
        { key: 'jobs', label: 'Jobs', count: allJobs.length, icon: Briefcase },
        { key: 'events', label: 'Events', count: allEvents.length, icon: Calendar },
        { key: 'gallery', label: 'Gallery', count: allAlbums.length, icon: ImageIcon },
        { key: 'news', label: 'News', count: allNews.length, icon: Newspaper },
        { key: 'notable-alumni', label: 'Notable Alumni', count: allNotableAlumni.length, icon: Star },
        { key: 'administration', label: 'Administration', count: allAdminMembers.length, icon: Landmark },
        { key: 'companies', label: 'Alumni Work At', count: companies.length, icon: Building2 },
    ];

    return (
        <div className="min-h-screen bg-transparent py-8">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <h1 className="text-xl sm:text-3xl font-heading font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'posts' && (
                            <Button onClick={() => setShowCreatePostModal(true)} className="flex items-center gap-2">
                                <Plus size={18} /> Create Post
                            </Button>
                        )}
                        {activeTab === 'events' && (
                            <Button onClick={() => setShowCreateEventModal(true)} className="flex items-center gap-2">
                                <Plus size={18} /> Create Event
                            </Button>
                        )}
                        {activeTab === 'jobs' && (
                            <Button onClick={() => setShowCreateJobModal(true)} className="flex items-center gap-2">
                                <Plus size={18} /> Create Job
                            </Button>
                        )}
                        {activeTab === 'gallery' && (
                            <Button onClick={() => setShowCreateAlbumModal(true)} className="flex items-center gap-2">
                                <FolderPlus size={18} /> New Album
                            </Button>
                        )}
                        {activeTab === 'news' && (
                            <Button onClick={openCreateNewsModal} className="flex items-center gap-2">
                                <Plus size={18} /> Create News
                            </Button>
                        )}
                        {activeTab === 'notable-alumni' && (
                            <Button onClick={openCreateAlumniModal} className="flex items-center gap-2">
                                <Plus size={18} /> Add Alumni
                            </Button>
                        )}
                        {activeTab === 'administration' && (
                            <Button onClick={openCreateAdminMemberModal} className="flex items-center gap-2">
                                <Plus size={18} /> Add Member
                            </Button>
                        )}
                        {(activeTab === 'pending' || activeTab === 'registered') && (
                            <Button onClick={openCreateUserModal} className="flex items-center gap-2">
                                <Plus size={18} /> Create User
                            </Button>
                        )}
                    </div>
                </div>

                {toast && <div className="mb-4 p-3 bg-[var(--bg-secondary)]/80 backdrop-blur-sm border border-[var(--border-color)]/30 rounded-xl text-[var(--text-primary)] shadow-sm animate-fadeInUp">{toast}</div>}

                {/* Analytics Cards */}
                {analytics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                        {[
                            { label: 'Total Users', value: analytics.totalUsers, icon: Users, color: 'text-[var(--accent)]' },
                            { label: 'Pending', value: analytics.pendingUsers, icon: Clock, color: 'text-[var(--text-secondary)]' },
                            { label: 'Active', value: analytics.activeUsers, icon: UserCheck, color: 'text-[var(--text-secondary)]' },
                            { label: 'Rejected', value: analytics.rejectedUsers, icon: UserX, color: 'text-[var(--text-secondary)]' },
                            { label: 'Posts', value: analytics.totalPosts, icon: FileText, color: 'text-[var(--accent)]' },
                            { label: 'Pending Posts', value: analytics.pendingPosts, icon: Clock, color: 'text-[var(--text-secondary)]' },
                            { label: 'Jobs', value: analytics.totalJobs, icon: Briefcase, color: 'text-[var(--accent)]' },
                            { label: 'Pending Jobs', value: analytics.pendingJobs, icon: Clock, color: 'text-[var(--text-secondary)]' },
                            { label: 'Events', value: analytics.totalEvents, icon: Calendar, color: 'text-[var(--accent)]' },
                            { label: 'Pending Events', value: analytics.pendingEvents, icon: Clock, color: 'text-[var(--text-secondary)]' },
                        ].map((stat, idx) => (
                            <div key={stat.label} className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm p-4 border border-[var(--border-color)]/30 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-fadeInUp" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <stat.icon size={16} className={stat.color} />
                                    <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                                </div>
                                <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Auto-Approval Toggles */}
                <div className="flex flex-wrap items-center gap-6 mb-6 bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 px-5 py-3 rounded-xl shadow-sm">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Auto-Approval</span>
                    <button
                        onClick={() => handleToggleAutoApprove('autoApproveUsers')}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {autoApproveUsers
                            ? <ToggleRight size={22} className="text-green-500" />
                            : <ToggleLeft size={22} className="text-[var(--text-muted)]" />}
                        <span>Users</span>
                    </button>
                    <button
                        onClick={() => handleToggleAutoApprove('autoApprovePosts')}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {autoApprovePosts
                            ? <ToggleRight size={22} className="text-green-500" />
                            : <ToggleLeft size={22} className="text-[var(--text-muted)]" />}
                        <span>Posts</span>
                    </button>
                    <button
                        onClick={() => handleToggleAutoApprove('autoApproveJobs')}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {autoApproveJobs
                            ? <ToggleRight size={22} className="text-green-500" />
                            : <ToggleLeft size={22} className="text-[var(--text-muted)]" />}
                        <span>Jobs</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="bg-[var(--bg-secondary)]/60 backdrop-blur-sm border border-[var(--border-color)]/30 overflow-hidden rounded-2xl shadow-sm">
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-[var(--border-color)]/30 px-4 py-3 flex-wrap gap-2">
                        <div className="flex gap-1 flex-wrap">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-3 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-1.5 ${activeTab === tab.key ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:shadow-sm'}`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                    <span className={`ml-1 px-1.5 py-0.5 text-xs ${activeTab === tab.key ? 'bg-[var(--bg-primary)]/20 text-[var(--bg-primary)]' : 'bg-[var(--accent-light)] text-[var(--text-primary)]'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                        </div>
                    </div>

                    {/* =============== POSTS TAB =============== */}
                    {activeTab === 'posts' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredPosts.length === 0 ? (
                                <EmptyState icon={FileText} text="No posts found" />
                            ) : (
                                filteredPosts.map(post => (
                                    <div key={post._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <Avatar src={post.author?.avatar} iconSize={18} imgClassName="w-10 h-10 object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-[var(--text-primary)] text-sm">{post.author?.name || 'Unknown'}</p>
                                                        <span className={`text-xs px-2 py-0.5 ${post.status === 'approved' ? 'bg-green-500/10 text-green-400' : post.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {(post.status || 'approved').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)]">{new Date(post.createdAt).toLocaleDateString()} • {post.visibility || 'public'}</p>
                                                    <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{post.content}</p>
                                                    {post.media?.length > 0 && (
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">{post.media.length} media attachment(s)</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                                                        <span>{post.likes?.length || 0} likes</span>
                                                        <span>{post.comments?.length || 0} comments</span>
                                                        <span>{post.shares || 0} shares</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" variant="outline" onClick={() => handleViewPost(post._id)}>
                                                    <Eye size={14} className="mr-1" /> View
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openEditPostModal(post)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                {post.status === 'pending' && (
                                                    <>
                                                        <Button size="sm" onClick={() => handleApprovePost(post._id)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">
                                                            <CheckCircle size={14} className="mr-1" /> Approve
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleRejectPost(post._id)}>
                                                            <XCircle size={14} className="mr-1" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button size="sm" variant="destructive" onClick={() => handleDeletePost(post._id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== JOBS TAB =============== */}
                    {activeTab === 'jobs' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredJobs.length === 0 ? (
                                <EmptyState icon={Briefcase} text="No jobs found" />
                            ) : (
                                filteredJobs.map(job => (
                                    <div key={job._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-[var(--text-primary)]">{job.title}</p>
                                                    <span className={`text-xs px-2 py-0.5 ${job.status === 'approved' ? 'bg-green-500/10 text-green-400' : job.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {(job.status || 'approved').toUpperCase()}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 ${job.isOpen !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                        {job.isOpen !== false ? 'Open' : 'Closed'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)]">{job.company} • {job.location}</p>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                                    <span>Posted by: {job.postedBy?.name || 'Unknown'}</span>
                                                    <span>{job.type} • {job.mode}</span>
                                                    <span>{job.applicants || 0} applicants</span>
                                                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" variant="outline" onClick={() => openEditJobModal(job)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                {job.status === 'pending' && (
                                                    <>
                                                        <Button size="sm" onClick={() => handleApproveJob(job._id)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">
                                                            <CheckCircle size={14} className="mr-1" /> Approve
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleRejectJob(job._id)}>
                                                            <XCircle size={14} className="mr-1" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteJob(job._id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== EVENTS TAB =============== */}
                    {activeTab === 'events' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredEvents.length === 0 ? (
                                <EmptyState icon={Calendar} text="No events found" />
                            ) : (
                                filteredEvents.map(ev => (
                                    <div key={ev._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-[var(--text-primary)]">{ev.title}</p>
                                                    <span className={`text-xs px-2 py-0.5 ${
                                                        ev.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                                        ev.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' :
                                                        'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {ev.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{ev.description?.slice(0, 120)}{ev.description?.length > 120 ? '...' : ''}</p>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                                    <span>{new Date(ev.date).toLocaleDateString()} {ev.time && `• ${ev.time}`}</span>
                                                    {ev.venue && <span>{ev.venue}</span>}
                                                    <span>By: {ev.createdBy?.name || 'Unknown'}</span>
                                                    <span>{ev.attendeesCount || ev.attendees?.length || 0} attendees</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" variant="outline" onClick={() => openEditEventModal(ev)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                {ev.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" onClick={() => handleApproveEvent(ev._id)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">
                                                            <CheckCircle size={14} className="mr-1" /> Approve
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleRejectEvent(ev._id)}>
                                                            <XCircle size={14} className="mr-1" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(ev._id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== GALLERY TAB =============== */}
                    {activeTab === 'gallery' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {allAlbums.length === 0 ? (
                                <EmptyState icon={ImageIcon} text="No gallery albums found" />
                            ) : (
                                allAlbums.map((album: any) => (
                                    <div key={album.id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-16 h-16 bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {album.coverImage || album.images?.[0]?.url ? (
                                                        <CachedImage src={album.coverImage || album.images[0].url} alt={album.title} className="w-full h-full object-cover" wrapperClassName="w-full h-full" compact />
                                                    ) : (
                                                        <ImageIcon size={24} className="text-[var(--text-muted)]" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-[var(--text-primary)]">{album.title}</p>
                                                    {album.description && <p className="text-sm text-[var(--text-secondary)] line-clamp-1">{album.description}</p>}
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                                        <span>{album.images?.length || 0} media items</span>
                                                        <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                                                        {album.createdBy?.name && <span>By: {album.createdBy.name}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" onClick={() => { setUploadAlbumId(album.id); setShowUploadMediaModal(true); }}>
                                                    <Upload size={14} className="mr-1" /> Upload
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openEditAlbumModal(album)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteAlbum(album.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                        {album.images?.length > 0 && (
                                            <div className="mt-3 ml-20 flex flex-wrap gap-2">
                                                {album.images.slice(0, 8).map((media: any) => (
                                                    <div key={media.id} className="relative group w-16 h-16 bg-[var(--bg-tertiary)] overflow-hidden">
                                                        {media.type === 'video' ? (
                                                            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)]">
                                                                <span className="text-xs text-[var(--text-muted)]">VID</span>
                                                            </div>
                                                        ) : (
                                                            <CachedImage src={media.url} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" compact />
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteMedia(album.id, media.id)}
                                                            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {album.images.length > 8 && (
                                                    <div className="w-16 h-16 bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                                                        +{album.images.length - 8}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== NEWS TAB =============== */}
                    {activeTab === 'news' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredNews.length === 0 ? (
                                <EmptyState icon={Newspaper} text="No news articles found" />
                            ) : (
                                filteredNews.map(item => (
                                    <div key={item._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                {item.image && (
                                                    <CachedImage src={item.image} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" wrapperClassName="w-16 h-16 flex-shrink-0" compact />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${item.draft ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                                                            {item.draft ? 'DRAFT' : 'PUBLISHED'}
                                                        </span>
                                                        {item.priority > 0 && (
                                                            <span className="text-xs px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)]">
                                                                Priority: {item.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.body && (
                                                        <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{item.body}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                                        <span>{item.readers || 0} readers</span>
                                                        {item.link && <span className="truncate max-w-[200px]">{item.link}</span>}
                                                        <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" variant="outline" onClick={() => handleToggleNewsDraft(item)}>
                                                    {item.draft ? <Eye size={14} className="mr-1" /> : <EyeOff size={14} className="mr-1" />}
                                                    {item.draft ? 'Publish' : 'Draft'}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openEditNewsModal(item)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteNews(item._id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== NOTABLE ALUMNI TAB =============== */}
                    {activeTab === 'notable-alumni' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredNotableAlumni.length === 0 ? (
                                <EmptyState icon={Star} text="No notable alumni added yet" />
                            ) : (
                                filteredNotableAlumni.map(item => (
                                    <div key={item._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                {item.image && (
                                                    <CachedImage src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" wrapperClassName="w-16 h-16 flex-shrink-0" compact />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                                                    <p className="text-sm text-[var(--text-secondary)]">{item.role}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                                                        <span>Class of {item.batch}</span>
                                                        {item.profileId && <span className="text-[var(--accent)]">Profile linked</span>}
                                                        <span>Order: {item.order}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button size="sm" variant="outline" onClick={() => openEditAlumniModal(item)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteAlumni(item._id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* =============== USERS TABS (pending + registered) =============== */}

                    {/* =============== ADMINISTRATION TAB =============== */}
                    {activeTab === 'administration' && (
                        <div className="divide-y divide-[var(--border-color)]">
                            {filteredAdminMembers.length === 0 ? (
                                <EmptyState icon={Landmark} text="No administration members found" />
                            ) : (
                                <>
                                    {/* Governing Body */}
                                    {filteredAdminMembers.filter(m => m.category === 'governing').length > 0 && (
                                        <div className="p-4">
                                            <h4 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">Governing Body</h4>
                                            <div className="space-y-2">
                                                {filteredAdminMembers.filter(m => m.category === 'governing').map(item => (
                                                    <div key={item._id} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                                                            <p className="text-sm text-[var(--text-secondary)]">{item.designation}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-xs text-[var(--text-muted)]">#{item.order}</span>
                                                            <Button size="sm" variant="outline" onClick={() => openEditAdminMemberModal(item)}>
                                                                <Edit2 size={14} />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAdminMember(item._id)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Key Officials */}
                                    {filteredAdminMembers.filter(m => m.category === 'officials').length > 0 && (
                                        <div className="p-4">
                                            <h4 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">Key Officials</h4>
                                            <div className="space-y-2">
                                                {filteredAdminMembers.filter(m => m.category === 'officials').map(item => (
                                                    <div key={item._id} className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                                                            <p className="text-sm text-[var(--text-secondary)]">{item.designation}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-xs text-[var(--text-muted)]">#{item.order}</span>
                                                            <Button size="sm" variant="outline" onClick={() => openEditAdminMemberModal(item)}>
                                                                <Edit2 size={14} />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAdminMember(item._id)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* =============== COMPANIES (ALUMNI WORK AT) TAB =============== */}
                    {activeTab === 'companies' && (
                        <div className="p-4 space-y-4">
                            {/* Add company */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCompany}
                                    onChange={e => setNewCompany(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCompany()}
                                    placeholder="Add a company name..."
                                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                                />
                                <Button onClick={handleAddCompany} disabled={!newCompany.trim() || companiesSaving}>
                                    <Plus size={16} className="mr-1" /> Add
                                </Button>
                            </div>

                            {companies.length === 0 ? (
                                <EmptyState icon={Building2} text="No companies added yet" />
                            ) : (
                                <div className="space-y-1">
                                    {companies.map((company, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors group">
                                            {editingCompanyIdx === idx ? (
                                                <div className="flex-1 flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editCompanyValue}
                                                        onChange={e => setEditCompanyValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleEditCompanySave(idx); if (e.key === 'Escape') setEditingCompanyIdx(null); }}
                                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                                                        autoFocus
                                                    />
                                                    <Button size="sm" onClick={() => handleEditCompanySave(idx)}><CheckCircle size={14} /></Button>
                                                    <Button size="sm" variant="outline" onClick={() => setEditingCompanyIdx(null)}><X size={14} /></Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <span className="text-xs text-[var(--text-muted)] w-6 text-right">#{idx + 1}</span>
                                                        <Building2 size={16} className="text-[var(--accent)] flex-shrink-0" />
                                                        <span className="font-medium text-[var(--text-primary)] truncate">{company}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <Button size="sm" variant="outline" onClick={() => handleMoveCompany(idx, 'up')} disabled={idx === 0 || companiesSaving}>
                                                            <ChevronUp size={14} />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleMoveCompany(idx, 'down')} disabled={idx === companies.length - 1 || companiesSaving}>
                                                            <ChevronDown size={14} />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setEditingCompanyIdx(idx); setEditCompanyValue(company); }}>
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCompany(idx)} disabled={companiesSaving}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {companiesSaving && <p className="text-sm text-[var(--text-muted)] text-center">Saving...</p>}
                        </div>
                    )}

                    {(activeTab === 'pending' || activeTab === 'registered') && (
                        <>
                            {filteredUsers.length === 0 ? (
                                <EmptyState
                                    icon={activeTab === 'pending' ? CheckCircle : Users}
                                    text={activeTab === 'pending' ? 'All caught up! No pending verifications.' : 'No registered users found.'}
                                />
                            ) : (
                                <div className="divide-y divide-[var(--border-color)]">
                                    {filteredUsers.map((user) => (
                                        <div key={user._id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-sm overflow-hidden">
                                                        <Avatar src={user.avatar} iconSize={18} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-[var(--text-primary)]">{user.name}</p>
                                                            {user.role === 'admin' && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-[var(--accent)] text-[var(--bg-primary)] font-medium">Admin</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-[var(--bg-tertiary)] px-2 py-1 text-[var(--text-secondary)]">{user.rollNumber}</span>
                                                    <span className="text-sm text-[var(--text-secondary)]">{user.degree} - {user.department || 'N/A'}</span>
                                                    <span className="text-sm text-[var(--text-muted)]">{user.graduationYear}</span>

                                                    <Button size="sm" variant="outline" onClick={() => openViewUserModal(user)}><Eye size={14} className="mr-1" /> View</Button>
                                                    {activeTab === 'pending' ? (
                                                        <>
                                                            <Button size="sm" onClick={() => handleVerify(user._id)} isLoading={actionLoading === user._id} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]"><CheckCircle size={14} className="mr-1" /> Approve</Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleReject(user._id)} isLoading={actionLoading === user._id}><XCircle size={14} className="mr-1" /> Reject</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="outline" onClick={() => handleToggleAdmin(user)} title={user.role === 'admin' ? 'Demote from admin' : 'Promote to admin'}>
                                                                {user.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => openEditUserModal(user)}><Edit2 size={14} className="mr-1" /> Edit</Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user._id)}><Trash2 size={14} /></Button>
                                                        </>
                                                    )}

                                                    <button onClick={() => toggleExpand(user._id)} className="p-2 hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                                        {expandedUser === user._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedUser === user._id && (
                                                <div className="mt-4 ml-4 sm:ml-15 pl-4 border-l-2 border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div><span className="text-[var(--text-muted)]">Role:</span> <span className="text-[var(--text-primary)] capitalize">{user.role}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Status:</span> <span className="text-[var(--text-primary)] capitalize">{user.status}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Phone:</span> <span className="text-[var(--text-primary)]">{user.phone || 'N/A'}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Headline:</span> <span className="text-[var(--text-primary)]">{user.headline || 'N/A'}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Industry:</span> <span className="text-[var(--text-primary)]">{user.industry || 'N/A'}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Company:</span> <span className="text-[var(--text-primary)]">{user.currentCompany || 'N/A'}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Location:</span> <span className="text-[var(--text-primary)]">{user.currentLocation || 'N/A'}</span></div>
                                                    <div><span className="text-[var(--text-muted)]">Registered:</span> <span className="text-[var(--text-primary)]">{new Date(user.createdAt).toLocaleDateString()}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <RejectModal
                        show={showRejectModal}
                        onClose={() => { setShowRejectModal(false); setRejectReason(''); setRejectTarget(null); }}
                        reason={rejectReason}
                        setReason={setRejectReason}
                        onSubmit={rejectType === 'event' ? submitRejectEvent : submitRejectUser}
                        type={rejectType}
                    />
                )}

                {/* User Create/Edit/View Modal */}
                {showUserModal && (
                    <UserModal
                        mode={userModalMode}
                        form={userForm}
                        viewData={viewUserData}
                        onChange={handleUserFormChange}
                        onClose={() => setShowUserModal(false)}
                        onSubmit={userModalMode === 'create' ? handleCreateUser : handleUpdateUser}
                        onApprove={editingUserId ? () => handleVerify(editingUserId) : undefined}
                        onReject={editingUserId ? () => handleReject(editingUserId) : undefined}
                        loading={userModalLoading}
                        actionLoading={actionLoading}
                        userId={editingUserId}
                    />
                )}

                {/* Create Post Modal */}
                {showCreatePostModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create Post</h3>
                                <button onClick={() => setShowCreatePostModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <textarea
                                    value={newPostContent}
                                    onChange={e => setNewPostContent(e.target.value)}
                                    placeholder="What do you want to share?"
                                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-32 resize-none focus:outline-none"
                                />
                                <div className="flex items-center gap-4">
                                    <select value={newPostVisibility} onChange={e => setNewPostVisibility(e.target.value as any)} className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm">
                                        <option value="public">Public</option>
                                        <option value="connections">Connections Only</option>
                                    </select>
                                    <input type="file" multiple accept="image/*,video/*" onChange={e => setPostAttachments(Array.from(e.target.files || []))} className="text-sm text-[var(--text-primary)]" />
                                </div>
                                {postAttachments.length > 0 && (
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] mb-2">{postAttachments.length} file(s) selected</p>
                                        <div className="flex flex-wrap gap-2">
                                            {postAttachments.map((f, i) => (
                                                <div key={i} className="relative w-16 h-16 bg-[var(--bg-tertiary)] overflow-hidden rounded">
                                                    {f.type.startsWith('video') ? (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">VID</div>
                                                    ) : (
                                                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowCreatePostModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleAdminCreatePost} disabled={!newPostContent.trim()}>Publish Post</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Event Modal */}
                {showCreateEventModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create Event</h3>
                                <button onClick={() => setShowCreateEventModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Event Title *</label>
                                    <input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="Alumni Meetup 2026" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Date *</label>
                                        <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Time</label>
                                        <input value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="10:00 AM" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Venue / Location</label>
                                    <input value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="Main Auditorium" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-24 resize-none" placeholder="What is this event about?" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Banner Image (optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setEventBanner(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {eventBanner && (
                                        <img src={URL.createObjectURL(eventBanner)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowCreateEventModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleAdminCreateEvent} disabled={!newEvent.title || !newEvent.date}>Create Event</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Job Modal */}
                {showCreateJobModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create Job Posting</h3>
                                <button onClick={() => setShowCreateJobModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Job Title *</label>
                                    <input value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Company *</label>
                                        <input value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Location</label>
                                        <input value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Type</label>
                                        <select value={newJob.type} onChange={e => setNewJob({ ...newJob, type: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Mode</label>
                                        <select value={newJob.mode} onChange={e => setNewJob({ ...newJob, mode: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                            <option>Remote</option><option>On-site</option><option>Hybrid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Salary</label>
                                        <input value={newJob.salary} onChange={e => setNewJob({ ...newJob, salary: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. ₹12 LPA" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-24 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Requirements (comma separated)</label>
                                    <input value={jobRequirements} onChange={e => setJobRequirements(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="React, TypeScript, 3+ years" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Image (optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setJobImage(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {jobImage && (
                                        <img src={URL.createObjectURL(jobImage)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowCreateJobModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleAdminCreateJob} disabled={!newJob.title || !newJob.company}>Publish Job</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Album Modal */}
                {showCreateAlbumModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-md modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">New Album</h3>
                                <button onClick={() => setShowCreateAlbumModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Album Title *</label>
                                    <input value={newAlbumTitle} onChange={e => setNewAlbumTitle(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="Convocation 2026" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={newAlbumDesc} onChange={e => setNewAlbumDesc(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-20 resize-none" placeholder="Optional description" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowCreateAlbumModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleCreateAlbum} disabled={!newAlbumTitle.trim()}>Create Album</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Album Modal */}
                {showEditAlbumModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-md modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Album</h3>
                                <button onClick={() => setShowEditAlbumModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Album Title *</label>
                                    <input value={editAlbumTitle} onChange={e => setEditAlbumTitle(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={editAlbumDesc} onChange={e => setEditAlbumDesc(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-20 resize-none" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowEditAlbumModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleEditAlbum} disabled={!editAlbumTitle.trim()}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Media Modal */}
                {showUploadMediaModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-md modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upload Media</h3>
                                <button onClick={() => { setShowUploadMediaModal(false); setMediaFiles([]); setUploadAlbumId(null); }} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <input type="file" multiple accept="image/*,video/*" onChange={e => setMediaFiles(Array.from(e.target.files || []))} className="text-sm text-[var(--text-primary)]" />
                                {mediaFiles.length > 0 && (
                                    <div>
                                        <p className="text-sm text-[var(--text-muted)] mb-2">{mediaFiles.length} file(s) selected</p>
                                        <div className="flex flex-wrap gap-2">
                                            {mediaFiles.map((f, i) => (
                                                <div key={i} className="relative w-16 h-16 bg-[var(--bg-tertiary)] overflow-hidden rounded">
                                                    {f.type.startsWith('video') ? (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">VID</div>
                                                    ) : (
                                                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => { setShowUploadMediaModal(false); setMediaFiles([]); setUploadAlbumId(null); }} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleUploadMedia} disabled={mediaFiles.length === 0}>Upload</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Post Preview Modal */}
                {previewPost && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay" onClick={() => setPreviewPost(null)}>
                        <div className="bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Post Preview</h3>
                                <button onClick={() => setPreviewPost(null)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
                            </div>

                            {previewPostLoading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin h-8 w-8 rounded-full border-[3px] border-[var(--bg-tertiary)] border-t-[var(--accent)] mx-auto"></div>
                                </div>
                            ) : (
                                <div className="p-6 space-y-4">
                                    {/* Author Info */}
                                    <div className="flex items-center gap-3">
                                        <Avatar src={previewPost.author?.avatar} iconSize={22} imgClassName="w-12 h-12 object-cover" />
                                        <div>
                                            <p className="font-semibold text-[var(--text-primary)]">{previewPost.author?.name || 'Unknown'}</p>
                                            {previewPost.author?.headline && <p className="text-xs text-[var(--text-muted)]">{previewPost.author.headline}</p>}
                                            <p className="text-xs text-[var(--text-muted)]">{new Date(previewPost.createdAt).toLocaleString()}</p>
                                        </div>
                                        <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${
                                            previewPost.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            previewPost.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                            {previewPost.status || 'legacy'}
                                        </span>
                                    </div>

                                    {/* Post Content */}
                                    <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{previewPost.content}</p>

                                    {/* Media */}
                                    {previewPost.media?.length > 0 && (
                                        <div className="group">
                                            <ImageCarousel media={previewPost.media} normalizeMediaUrl={resolveMediaUrl} />
                                        </div>
                                    )}

                                    {/* Likes Section */}
                                    <div className="border-t border-[var(--border-color)] pt-3">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                                            <ThumbsUp size={14} /> {previewPost.likes?.length || 0} Like{(previewPost.likes?.length || 0) !== 1 ? 's' : ''}
                                        </p>
                                        {previewPost.likes?.length > 0 && (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {previewPost.likes.map((liker: any, idx: number) => (
                                                    <div key={liker._id || idx} className="flex items-center gap-2 text-sm">
                                                        {typeof liker === 'object' ? (
                                                            <>
                                                                <Avatar src={liker.avatar} iconSize={12} imgClassName="w-6 h-6 object-cover" />
                                                                <span className="text-[var(--text-primary)]">{liker.name}</span>
                                                                {liker.headline && <span className="text-[var(--text-muted)] text-xs">· {liker.headline}</span>}
                                                            </>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)]">{liker}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Comments Section */}
                                    <div className="border-t border-[var(--border-color)] pt-3">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                                            <MessageCircle size={14} /> {previewPost.comments?.length || 0} Comment{(previewPost.comments?.length || 0) !== 1 ? 's' : ''}
                                        </p>
                                        {previewPost.comments?.length > 0 && (
                                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                                {previewPost.comments.map((comment: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <Avatar src={comment.author?.avatar} iconSize={12} imgClassName="w-6 h-6 object-cover" />
                                                        <div className="flex-1 bg-[var(--bg-tertiary)] p-2 rounded">
                                                            <p className="text-xs font-semibold text-[var(--text-primary)]">{comment.author?.name || 'Unknown'}</p>
                                                            <p className="text-xs text-[var(--text-secondary)]">{comment.text}</p>
                                                            <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2 sticky bottom-0 bg-[var(--bg-secondary)]">
                                <button onClick={() => setPreviewPost(null)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Close</button>
                                {previewPost.status === 'pending' && (
                                    <>
                                        <Button variant="destructive" onClick={async () => { await handleRejectPost(previewPost._id); setPreviewPost(null); }}>
                                            <XCircle size={16} className="mr-1" /> Reject
                                        </Button>
                                        <Button onClick={async () => { await handleApprovePost(previewPost._id); setPreviewPost(null); }} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">
                                            <CheckCircle size={16} className="mr-1" /> Approve
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* News Create/Edit Modal */}
                {showNewsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{newsModalMode === 'edit' ? 'Edit News' : 'Create News'}</h3>
                                <button onClick={() => { setShowNewsModal(false); resetNewsForm(); }} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Title *</label>
                                    <input value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="News headline" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Body</label>
                                    <textarea value={newsForm.body} onChange={e => setNewsForm({ ...newsForm, body: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-32 resize-none" placeholder="Article content..." />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">External Link</label>
                                    <input value={newsForm.link} onChange={e => setNewsForm({ ...newsForm, link: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Priority</label>
                                        <input type="number" min={0} value={newsForm.priority} onChange={e => setNewsForm({ ...newsForm, priority: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer pb-2">
                                            <input type="checkbox" checked={newsForm.draft} onChange={e => setNewsForm({ ...newsForm, draft: e.target.checked })} className="accent-[var(--accent)]" />
                                            Save as draft
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Image (optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setNewsImage(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {newsImage && (
                                        <img src={URL.createObjectURL(newsImage)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => { setShowNewsModal(false); resetNewsForm(); }} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleSaveNews} disabled={!newsForm.title.trim()}>
                                    {newsModalMode === 'edit' ? 'Save Changes' : 'Publish'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notable Alumni Modal */}
                {showAlumniModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{alumniModalMode === 'edit' ? 'Edit Notable Alumni' : 'Add Notable Alumni'}</h3>
                                <button onClick={() => { setShowAlumniModal(false); resetAlumniForm(); }} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Name *</label>
                                    <input value={alumniForm.name} onChange={e => setAlumniForm({ ...alumniForm, name: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="Alumni name" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Role / Title *</label>
                                    <input value={alumniForm.role} onChange={e => setAlumniForm({ ...alumniForm, role: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. Software Developer, CEO" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Batch / Class *</label>
                                        <input value={alumniForm.batch} onChange={e => setAlumniForm({ ...alumniForm, batch: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. 2015" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Display Order</label>
                                        <input type="number" min={0} value={alumniForm.order} onChange={e => setAlumniForm({ ...alumniForm, order: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Photo {alumniModalMode === 'create' ? '*' : '(optional, leave empty to keep current)'}</label>
                                    <input type="file" accept="image/*" onChange={e => setAlumniImage(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {alumniImage && (
                                        <img src={URL.createObjectURL(alumniImage)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Link to Profile (search by name or email)</label>
                                    <input
                                        value={alumniUserSearch}
                                        onChange={e => searchAlumniUsers(e.target.value)}
                                        className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded"
                                        placeholder="Search registered users..."
                                    />
                                    {alumniForm.profileId && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[var(--accent)]/10 rounded-lg border border-[var(--accent)]/20">
                                            <BadgeCheck size={14} className="text-[var(--accent)] flex-shrink-0" />
                                            <span className="text-sm text-[var(--accent)] font-medium truncate">Linked: {alumniUserSearch || alumniForm.profileId}</span>
                                            <button onClick={() => { setAlumniForm({ ...alumniForm, profileId: '' }); setAlumniUserSearch(''); }} className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium">Remove</button>
                                        </div>
                                    )}
                                    {alumniUserResults.length > 0 && (
                                        <div className="mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg max-h-48 overflow-y-auto shadow-lg">
                                            {alumniUserResults.map((u: any) => (
                                                <button
                                                    key={u._id}
                                                    onClick={() => {
                                                        setAlumniForm({ ...alumniForm, profileId: u._id });
                                                        setAlumniUserSearch(u.name);
                                                        setAlumniUserResults([]);
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--bg-tertiary)] flex items-center gap-3 text-sm border-b border-[var(--border-color)] last:border-b-0 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        <Avatar src={u.avatar} iconSize={16} iconClassName="text-[var(--accent)]" imgClassName="w-8 h-8 rounded-full object-cover" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[var(--text-primary)] font-medium truncate">{u.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => { setShowAlumniModal(false); resetAlumniForm(); }} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleSaveAlumni} disabled={!alumniForm.name.trim() || !alumniForm.role.trim() || !alumniForm.batch.trim()}>
                                    {alumniModalMode === 'edit' ? 'Save Changes' : 'Add Alumni'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Administration Member Modal */}
                {showAdminMemberModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{adminMemberMode === 'edit' ? 'Edit Member' : 'Add Member'}</h3>
                                <button onClick={() => { setShowAdminMemberModal(false); resetAdminMemberForm(); }} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                                    <input value={adminMemberForm.name} onChange={e => setAdminMemberForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Designation *</label>
                                    <input value={adminMemberForm.designation} onChange={e => setAdminMemberForm(p => ({ ...p, designation: e.target.value }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category *</label>
                                    <select value={adminMemberForm.category} onChange={e => setAdminMemberForm(p => ({ ...p, category: e.target.value as 'governing' | 'officials' }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]">
                                        <option value="governing">Governing Body</option>
                                        <option value="officials">Key Officials</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Order</label>
                                    <input type="number" value={adminMemberForm.order} onChange={e => setAdminMemberForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]" />
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => { setShowAdminMemberModal(false); resetAdminMemberForm(); }} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleSaveAdminMember} disabled={!adminMemberForm.name.trim() || !adminMemberForm.designation.trim()}>
                                    {adminMemberMode === 'edit' ? 'Save Changes' : 'Add Member'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Post Modal */}
                {showEditPostModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Post</h3>
                                <button onClick={() => setShowEditPostModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <textarea
                                    value={editPostContent}
                                    onChange={e => setEditPostContent(e.target.value)}
                                    className="w-full p-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-32 resize-none focus:outline-none"
                                />
                                <select value={editPostVisibility} onChange={e => setEditPostVisibility(e.target.value as any)} className="p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm">
                                    <option value="public">Public</option>
                                    <option value="connections">Connections Only</option>
                                </select>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowEditPostModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleEditPost} disabled={!editPostContent.trim()}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Event Modal */}
                {showEditEventModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content">
                            <div className="p-4 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Event</h3>
                                <button onClick={() => setShowEditEventModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Event Title *</label>
                                    <input value={editEventForm.title} onChange={e => setEditEventForm({ ...editEventForm, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Date *</label>
                                        <input type="date" value={editEventForm.date} onChange={e => setEditEventForm({ ...editEventForm, date: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Time</label>
                                        <input value={editEventForm.time} onChange={e => setEditEventForm({ ...editEventForm, time: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="10:00 AM" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Venue / Location</label>
                                    <input value={editEventForm.location} onChange={e => setEditEventForm({ ...editEventForm, location: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={editEventForm.description} onChange={e => setEditEventForm({ ...editEventForm, description: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-24 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Banner Image (optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setEditEventBanner(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {editEventBanner && (
                                        <img src={URL.createObjectURL(editEventBanner)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowEditEventModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleEditEvent} disabled={!editEventForm.title || !editEventForm.date}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Job Modal */}
                {showEditJobModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
                        <div className="bg-[var(--bg-secondary)] w-full max-w-lg modal-content max-h-[90vh] overflow-y-auto">
                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Job</h3>
                                <button onClick={() => setShowEditJobModal(false)} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Job Title *</label>
                                    <input value={editJobForm.title} onChange={e => setEditJobForm({ ...editJobForm, title: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Company *</label>
                                        <input value={editJobForm.company} onChange={e => setEditJobForm({ ...editJobForm, company: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Location</label>
                                        <input value={editJobForm.location} onChange={e => setEditJobForm({ ...editJobForm, location: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Type</label>
                                        <select value={editJobForm.type} onChange={e => setEditJobForm({ ...editJobForm, type: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Mode</label>
                                        <select value={editJobForm.mode} onChange={e => setEditJobForm({ ...editJobForm, mode: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                            <option>Remote</option><option>On-site</option><option>Hybrid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Salary</label>
                                        <input value={editJobForm.salary} onChange={e => setEditJobForm({ ...editJobForm, salary: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. ₹12 LPA" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Description</label>
                                    <textarea value={editJobForm.description} onChange={e => setEditJobForm({ ...editJobForm, description: e.target.value })} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] h-24 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Requirements (comma separated)</label>
                                    <input value={editJobRequirements} onChange={e => setEditJobRequirements(e.target.value)} className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">Image (optional)</label>
                                    <input type="file" accept="image/*" onChange={e => setEditJobImage(e.target.files?.[0] || null)} className="text-sm text-[var(--text-primary)]" />
                                    {editJobImage && (
                                        <img src={URL.createObjectURL(editJobImage)} alt="preview" className="mt-2 w-full h-36 object-contain bg-[var(--bg-tertiary)] rounded" />
                                    )}
                                </div>
                            </div>
                            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                                <button onClick={() => setShowEditJobModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                                <Button onClick={handleEditJob} disabled={!editJobForm.title || !editJobForm.company}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== SUB-COMPONENTS ====================

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="p-12 text-center text-[var(--text-muted)]">
        <Icon className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
        <p className="text-lg font-medium">{text}</p>
    </div>
);

const RejectModal = ({ show, onClose, reason, setReason, onSubmit, type }: any) => {
    if (!show) return null;
    const isUser = type === 'user';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay">
            <div className="bg-[var(--bg-secondary)] w-full max-w-md modal-content">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Reject {isUser ? 'User' : 'Event'}</h3>
                    <button onClick={onClose} className="p-1 text-[var(--text-muted)]"><X size={18} /></button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                        {isUser
                            ? 'Provide a reason for rejecting this user. The user will be permanently removed from the database.'
                            : 'Provide a reason for rejecting this event (visible to the creator):'}
                    </p>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter rejection reason..." className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:outline-none text-[var(--text-primary)] h-28" />
                    {isUser && (
                        <p className="text-xs text-[var(--text-secondary)] mt-2">Warning: This action cannot be undone. All user data will be permanently deleted.</p>
                    )}
                </div>
                <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                    <button onClick={onSubmit} disabled={!reason.trim()} className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed">Reject {isUser ? '& Delete' : ''}</button>
                </div>
            </div>
        </div>
    );
};

const UserModal = ({ mode, form, viewData, onChange, onClose, onSubmit, onApprove, onReject, loading, actionLoading }: any) => {
    const isView = mode === 'view';
    const isCreate = mode === 'create';
    const u: User | null = isView ? viewData : null;

    const DetailRow = ({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | number | null }) => {
        if (!value && value !== 0) return null;
        return (
            <div className="flex items-start gap-3 py-2">
                {Icon && <Icon size={16} className="text-[var(--text-muted)] mt-0.5 shrink-0" />}
                <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                    <p className="text-sm text-[var(--text-primary)] break-words">{value}</p>
                </div>
            </div>
        );
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            active: 'bg-green-500/15 text-green-600',
            pending: 'bg-yellow-500/15 text-yellow-600',
            rejected: 'bg-red-500/15 text-red-600'
        };
        return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>{status}</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto modal-overlay">
            <div className="bg-[var(--bg-secondary)] w-full max-w-2xl modal-content my-8 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-secondary)] z-10">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        {isCreate ? 'Create New User' : isView ? 'User Details' : 'Edit User'}
                    </h3>
                    <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
                </div>

                {loading ? (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                                <div className="h-3 w-48 rounded bg-[var(--bg-tertiary)] animate-pulse" />
                            </div>
                        </div>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-10 w-full rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
                        ))}
                    </div>
                ) : isView && u ? (
                    /* ============ READ-ONLY DETAIL VIEW ============ */
                    <>
                        <div className="p-6 space-y-6">
                            {/* Profile Header */}
                            <div className="relative">
                                {u.coverImage ? (
                                    <div className="h-32 w-full overflow-hidden bg-[var(--bg-tertiary)]">
                                        <CachedImage src={u.coverImage} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
                                    </div>
                                ) : (
                                    <div className="h-24 w-full bg-gradient-to-r from-[var(--bg-tertiary)] to-[var(--bg-secondary)]" />
                                )}
                                <div className="flex items-end gap-4 px-4 -mt-10 relative z-[1]">
                                    <div className="w-20 h-20 rounded-full border-4 border-[var(--bg-secondary)] overflow-hidden bg-[var(--accent)] flex items-center justify-center shrink-0">
                                        <Avatar src={u.avatar} iconSize={32} />
                                    </div>
                                    <div className="pb-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-xl font-bold text-[var(--text-primary)]">{u.name}</h4>
                                            <span className="text-xs px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] capitalize font-medium">{u.role}</span>
                                            <StatusBadge status={u.status} />
                                        </div>
                                        {u.headline && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{u.headline}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Contact & Identity */}
                            <div className="bg-[var(--bg-tertiary)] p-4 space-y-1">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <Users size={16} /> Contact & Identity
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    <DetailRow icon={Mail} label="Email" value={u.email} />
                                    <DetailRow icon={Phone} label="Phone" value={u.phone} />
                                    <DetailRow icon={MapPin} label="Location" value={u.currentLocation} />
                                    <DetailRow label="Roll Number" value={u.rollNumber} />
                                </div>
                            </div>

                            {/* Academic */}
                            <div className="bg-[var(--bg-tertiary)] p-4 space-y-1">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <GraduationCap size={16} /> Academic
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                    <DetailRow label="Degree" value={u.degree} />
                                    <DetailRow label="Department" value={u.department} />
                                    <DetailRow label="Graduation Year" value={u.graduationYear} />
                                </div>
                            </div>

                            {/* Professional */}
                            {(u.currentCompany || u.designation || u.industry) && (
                                <div className="bg-[var(--bg-tertiary)] p-4 space-y-1">
                                    <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <Building2 size={16} /> Professional
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                        <DetailRow label="Company" value={u.currentCompany} />
                                        <DetailRow label="Designation" value={u.designation} />
                                        <DetailRow label="Industry" value={u.industry} />
                                    </div>
                                </div>
                            )}

                            {/* Bio */}
                            {u.bio && (
                                <div className="bg-[var(--bg-tertiary)] p-4">
                                    <h4 className="font-semibold text-[var(--text-primary)] mb-2 text-sm uppercase tracking-wide">Bio</h4>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{u.bio}</p>
                                </div>
                            )}

                            {/* Flags & Preferences */}
                            <div className="bg-[var(--bg-tertiary)] p-4">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <BadgeCheck size={16} /> Status & Preferences
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {u.isVerified && <span className="text-xs px-2 py-1 bg-green-500/15 text-green-600 flex items-center gap-1"><BadgeCheck size={12} /> Verified</span>}
                                    {u.isMentor && <span className="text-xs px-2 py-1 bg-blue-500/15 text-blue-600 flex items-center gap-1"><Heart size={12} /> Mentor</span>}
                                    {u.jobProviderPreference && <span className="text-xs px-2 py-1 bg-purple-500/15 text-purple-600 flex items-center gap-1"><Briefcase size={12} /> Job Provider</span>}
                                    {u.jobSeekerPreference && <span className="text-xs px-2 py-1 bg-orange-500/15 text-orange-600 flex items-center gap-1"><Briefcase size={12} /> Job Seeker</span>}
                                    {!u.isVerified && !u.isMentor && !u.jobProviderPreference && !u.jobSeekerPreference && (
                                        <span className="text-xs text-[var(--text-muted)]">No special flags set</span>
                                    )}
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="flex items-center gap-6 text-xs text-[var(--text-muted)] px-1">
                                <span>Registered: {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                {u.updatedAt && <span>Updated: {new Date(u.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2 sticky bottom-0 bg-[var(--bg-secondary)]">
                            <button onClick={onClose} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Close</button>
                            {onApprove && onReject && u?.status === 'pending' && (
                                <>
                                    <Button variant="destructive" onClick={onReject} isLoading={!!actionLoading}>
                                        <XCircle size={16} className="mr-1" /> Reject
                                    </Button>
                                    <Button onClick={onApprove} isLoading={!!actionLoading} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)]">
                                        <CheckCircle size={16} className="mr-1" /> Approve
                                    </Button>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* ============ CREATE / EDIT FORM ============ */
                    <>
                        <div className="p-6 space-y-6">
                            <div className="bg-[var(--bg-tertiary)] p-4">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <Users size={18} /> Basic Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Full Name *</label>
                                        <input type="text" value={form.name} onChange={(e) => onChange('name', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Email *</label>
                                        <input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Phone</label>
                                        <input type="text" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Role</label>
                                        <select value={form.role} onChange={(e) => onChange('role', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                            <option value="alumni">Alumni</option>
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-tertiary)] p-4">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Academic Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Roll Number *</label>
                                        <input type="text" value={form.rollNumber} onChange={(e) => onChange('rollNumber', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Graduation Year *</label>
                                        <input type="number" value={form.graduationYear} onChange={(e) => onChange('graduationYear', parseInt(e.target.value))} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Degree *</label>
                                        <input type="text" value={form.degree} onChange={(e) => onChange('degree', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Department</label>
                                        <input type="text" value={form.department} onChange={(e) => onChange('department', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-tertiary)] p-4">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Professional Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Headline</label>
                                        <input type="text" value={form.headline} onChange={(e) => onChange('headline', e.target.value)} placeholder="e.g., Software Engineer at Google" className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Industry</label>
                                        <input type="text" value={form.industry} onChange={(e) => onChange('industry', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Current Company</label>
                                        <input type="text" value={form.currentCompany} onChange={(e) => onChange('currentCompany', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Designation</label>
                                        <input type="text" value={form.designation} onChange={(e) => onChange('designation', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Location</label>
                                        <input type="text" value={form.currentLocation} onChange={(e) => onChange('currentLocation', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Bio</label>
                                        <textarea value={form.bio} onChange={(e) => onChange('bio', e.target.value)} rows={3} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] resize-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-tertiary)] p-4">
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <Lock size={18} /> {isCreate ? 'Set Password' : 'Change Password'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">Password {isCreate && '*'}</label>
                                        <input type="password" value={form.password} onChange={(e) => onChange('password', e.target.value)} placeholder={isCreate ? 'Enter password' : 'Leave blank to keep current'} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                    </div>
                                    {!isCreate && (
                                        <div>
                                            <label className="block text-sm text-[var(--text-muted)] mb-1">Status</label>
                                            <select value={form.status} onChange={(e) => onChange('status', e.target.value)} className="w-full p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                                <option value="active">Active</option>
                                                <option value="pending">Pending</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2 sticky bottom-0 bg-[var(--bg-secondary)]">
                            <button onClick={onClose} className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Cancel</button>
                            <Button onClick={onSubmit} isLoading={loading}>
                                {isCreate ? 'Create User' : 'Save Changes'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
