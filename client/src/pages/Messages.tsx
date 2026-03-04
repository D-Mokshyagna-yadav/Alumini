import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Search, MoreHorizontal, Edit, Send, Image, Smile,
    Paperclip, Phone, Video, Info, Check, CheckCheck, X, ChevronLeft, ChevronRight,
    MessageSquare, Circle, Mic, Camera, ArrowLeft
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import Avatar from '../components/ui/Avatar';
import api from '../lib/api';
import resolveMediaUrl from '../lib/media';
import { io, Socket } from 'socket.io-client';

interface Message {
    _id: string;
    sender: string | { _id: string, name: string, avatar?: string };
    content: string;
    media?: { type: string; url: string }[];
    createdAt: string;
    status: 'sent' | 'delivered' | 'read';
    isOwn?: boolean;
}

interface Conversation {
    id: string;
    user: {
        _id: string;
        name: string;
        headline: string;
        avatar?: string;
        isOnline: boolean;
    };
    lastMessage: Message;
    unread: number;
    updatedAt: string;
}

const ModalVideoPlayer: React.FC<{ src: string; autoPlayMuted?: boolean; className?: string }> = ({ src, autoPlayMuted = true, className }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(autoPlayMuted);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = useCallback(async () => {
        const v = videoRef.current;
        if (!v) return;
        try {
            if (v.paused) {
                await v.play();
                setPlaying(true);
            } else {
                v.pause();
                setPlaying(false);
            }
        } catch (e) {
            console.warn('Play failed', e);
        }
    }, []);

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
    };

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = muted;

        const onTime = () => setCurrent(v.currentTime || 0);
        const onMeta = () => setDuration(v.duration || 0);

        v.addEventListener('timeupdate', onTime);
        v.addEventListener('loadedmetadata', onMeta);
        v.addEventListener('durationchange', onMeta);

        if (autoPlayMuted) {
            v.play().then(() => setPlaying(true)).catch(() => {});
        }

        return () => {
            v.removeEventListener('timeupdate', onTime);
            v.removeEventListener('loadedmetadata', onMeta);
            v.removeEventListener('durationchange', onMeta);
        };
    }, [autoPlayMuted, muted]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
            if (e.key === 'm' || e.key === 'M') toggleMute();
            if (e.key === 'ArrowLeft') {
                const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, v.currentTime - 5);
            }
            if (e.key === 'ArrowRight') {
                const v = videoRef.current; if (!v) return; v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [togglePlay]);

    const onSeek = (ev: React.MouseEvent<HTMLDivElement>) => {
        const el = ev.currentTarget as HTMLDivElement;
        const rect = el.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        const v = videoRef.current; if (!v) return;
        v.currentTime = pos * (v.duration || 0);
        setCurrent(v.currentTime);
    };

    const format = (s: number) => {
        if (!s || isNaN(s)) return '0:00';
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <div className={`relative w-full ${className || ''}`}>
            <video ref={videoRef} src={src} className="max-w-full max-h-[80vh] object-contain" playsInline />
            <div className="mt-4 flex items-center gap-4 px-2">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={togglePlay} 
                    className="px-4 py-2 bg-[var(--bg-primary)]/10 backdrop-blur-sm text-[var(--bg-primary)] font-medium text-sm"
                >
                    {playing ? 'Pause' : 'Play'}
                </motion.button>
                <div className="flex-1">
                    <div className="h-1.5 bg-[var(--bg-primary)]/20 cursor-pointer overflow-hidden" onClick={onSeek}>
                        <motion.div 
                            className="h-full bg-[var(--accent)]" 
                            style={{ width: duration ? `${(current / duration) * 100}%` : '0%' }} 
                        />
                    </div>
                    <div className="text-xs text-[var(--bg-primary)]/60 mt-2 flex justify-between">
                        <span>{format(current)}</span>
                        <span>{format(duration)}</span>
                    </div>
                </div>
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleMute} 
                    className="px-4 py-2 bg-[var(--bg-primary)]/10 backdrop-blur-sm text-[var(--bg-primary)] font-medium text-sm"
                >
                    {muted ? 'Unmute' : 'Mute'}
                </motion.button>
            </div>
        </div>
    );
};

let socket: Socket;

const Messages = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messageRequests, setMessageRequests] = useState<Conversation[]>([]);
    const [showRequests, setShowRequests] = useState(false);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<{ url: string; name: string; type: string }[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploading, setUploading] = useState<boolean>(false);
    const [fileErrors, setFileErrors] = useState<string[]>([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type?: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const lastTouchRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);
    const lastTapRef = useRef<number>(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const origin = import.meta.env.VITE_API_ORIGIN || window.location.origin;

        if (!socket) {
            socket = io(origin, { withCredentials: true, transports: ['polling', 'websocket'] });
        } else if (!socket.connected) {
            try { socket.connect(); } catch { /* ignore */ }
        }

        const joinRoom = () => {
            try { socket.emit('join_user_room', user.id); } catch (e) { console.warn('join room failed', e); }
        };

        socket.on('connect', () => {
            console.log('Socket connected', socket.id);
            joinRoom();
        });

        socket.on('reconnect', () => {
            console.log('Socket reconnected');
            joinRoom();
        });

        socket.on('connect_error', (err) => {
            console.warn('Socket connect error', err);
        });

        socket.on('receive_message', (message: any) => {
            handleReceiveMessage(message);
        });

        socket.on('message_delivered', (data: any) => {
            const { messageId } = data;
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'delivered' } : m));
        });

        socket.on('message_read', (data: any) => {
            const { messageIds } = data;
            if (messageIds && messageIds.length) {
                setMessages(prev => prev.map(m => messageIds.includes(m._id) ? { ...m, status: 'read' } : m));
            }
        });

        socket.on('message_edited', (data: any) => {
            if (!data || !data.messageId) return;
            setMessages(prev => prev.map(m => m._id === data.messageId ? { ...m, content: data.content, isEdited: true } : m));
        });

        socket.on('user_typing', (data: any) => {
            if (selectedConvo && data.userId === selectedConvo.user._id) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        });

        if (socket.connected) joinRoom();

        return () => {
            socket.off('connect');
            socket.off('reconnect');
            socket.off('connect_error');
            socket.off('receive_message');
            socket.off('message_edited');
            socket.off('message_delivered');
            socket.off('message_read');
            socket.off('user_typing');
        };
    }, [user, selectedConvo]);

    const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';
    const normalizeMediaUrl = (url: string) => {
        if (!url) return url;
        if (url.startsWith('/uploads')) return `${apiOrigin}${url}`;
        return url;
    };

    useEffect(() => {
        const init = async () => {
            if (!user) return;
            await fetchConversations();

            if (location.state?.startChatWithUser) {
                const targetUser = location.state.startChatWithUser;
                console.log('Starting chat with:', targetUser);

                const existing = conversations.find(c => c.user._id === targetUser._id);
                if (existing) {
                    setSelectedConvo(existing);
                } else {
                    const newConvo: Conversation = {
                        id: 'temp_' + targetUser._id,
                        user: {
                            _id: targetUser._id,
                            name: targetUser.name,
                            headline: targetUser.headline || '',
                            avatar: targetUser.avatar,
                            isOnline: false
                        },
                        lastMessage: {
                            _id: 'temp',
                            sender: user.id,
                            content: '',
                            createdAt: new Date().toISOString(),
                            status: 'sent'
                        },
                        unread: 0,
                        updatedAt: new Date().toISOString()
                    };
                    setSelectedConvo(newConvo);
                }
                setShowMobileChat(true);
            }
        };
        init();
    }, [location.state]);

    useEffect(() => {
        if (selectedConvo && !selectedConvo.id.startsWith('temp_')) {
            fetchMessages(selectedConvo.id);
        } else {
            setMessages([]);
        }
    }, [selectedConvo]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/chat/conversations');
            console.log('Conversations:', res.data);
            const convos = res.data.conversations || res.data || [];
            const requests = res.data.messageRequests || [];
            setConversations(convos);
            setMessageRequests(requests);
            if (!selectedConvo && convos.length > 0 && !location.state?.startChatWithUser) {
                setSelectedConvo(convos[0]);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    };

    const fetchMessages = async (convoId: string) => {
        if (!user) return;
        try {
            const res = await api.get(`/chat/messages/${convoId}`);
            const msgs = res.data.map((m: any) => ({
                ...m,
                isOwn: (typeof m.sender === 'string' ? m.sender : m.sender._id) === user.id
            }));
            setMessages(msgs);
            scrollToBottom();
            try {
                await api.put(`/chat/read/${convoId}`);
            } catch (e) {
                console.error('Failed to mark read:', e);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleReceiveMessage = (message: any) => {
        if (!user) return;
        const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;

        if (selectedConvo && (senderId === selectedConvo.user._id || senderId === user.id)) {
            setMessages(prev => [...prev, {
                ...message,
                isOwn: senderId === user.id
            }]);
            scrollToBottom();
        }

        fetchConversations();

        (async () => {
            try {
                if (message && message._id) {
                    await api.put(`/chat/delivered/${message._id}`);
                }
            } catch (e) {
                console.error('Failed to send delivered ack:', e);
            }
        })();
    };

    const openLightbox = (media: { url: string; type?: string }[], index = 0) => {
        if (!media || media.length === 0) return;
        setLightboxMedia(media);
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
        setLightboxMedia([]);
        setLightboxIndex(0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const prevLightbox = () => {
        setLightboxIndex(i => (i - 1 + lightboxMedia.length) % lightboxMedia.length);
    };

    const nextLightbox = () => {
        setLightboxIndex(i => (i + 1) % lightboxMedia.length);
    };

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevLightbox();
            if (e.key === 'ArrowRight') nextLightbox();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightboxOpen, lightboxMedia.length]);

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => nextLightbox(),
        onSwipedRight: () => prevLightbox(),
        trackMouse: true
    });

    // Accept any object with clientX/clientY to be compatible with React.Touch
    const getDistance = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) => {
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const d = getDistance(e.touches[0], e.touches[1]);
            const center = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
            lastTouchRef.current = { distance: d, center };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchRef.current) {
            const d = getDistance(e.touches[0], e.touches[1]);
            const scale = d / lastTouchRef.current.distance;
            const newZoom = Math.max(1, Math.min(4, zoom * scale));
            setZoom(newZoom);
            lastTouchRef.current = { distance: d, center: { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 } };
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        lastTouchRef.current = null;
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            setZoom(prev => (prev > 1 ? 1 : 2));
        }
        lastTapRef.current = now;
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() && attachments.length === 0) return;
        if (!selectedConvo) return;

        try {
            const recipientId = selectedConvo.user._id;
            let mediaPayload: any[] = [];
            if (attachments.length > 0) {
                const form = new FormData();
                attachments.forEach(f => form.append('media', f));
                setUploading(true);
                setUploadProgress(0);
                const uploadRes = await api.post('/upload/post-media', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (ev) => {
                        if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                    }
                });
                mediaPayload = uploadRes.data.media || [];
                setUploadProgress(100);
                setUploading(false);
            }

            const res = await api.post('/chat/message', {
                recipientId,
                content: newMessage,
                type: 'text',
                media: mediaPayload
            });

            const newMsg = {
                ...res.data,
                isOwn: true
            };

            if (selectedConvo.id.startsWith('temp_')) {
                await fetchConversations();
            }

            setMessages(prev => [...prev, newMsg]);
            setNewMessage('');
            setAttachments([]);
            attachmentPreviews.forEach(p => URL.revokeObjectURL(p.url));
            setAttachmentPreviews([]);
            scrollToBottom();
            fetchConversations();
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const filteredConvos = conversations.filter(c =>
        c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    const groupMessagesByDate = (msgs: Message[]) => {
        const groups: { date: string; messages: Message[] }[] = [];
        let currentDate = '';
        
        msgs.forEach(msg => {
            const msgDate = new Date(msg.createdAt).toLocaleDateString();
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                groups.push({ date: msgDate, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });
        
        return groups;
    };

    const formatDateHeader = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-secondary)]/70 backdrop-blur-xl border border-[var(--border-color)]/50 overflow-hidden h-[calc(100vh-120px)] shadow-md shadow-black/10 rounded-2xl"
            >
                <div className="flex h-full">
                    {/* Conversations List */}
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={`w-full md:w-[340px] border-r border-[var(--border-color)]/50 flex flex-col bg-[var(--bg-primary)]/30 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}
                    >
                        <div className="p-5 border-b border-[var(--border-color)]/50">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-xl text-[var(--text-primary)]">Messages</h2>
                                <div className="flex gap-1">
                                    {messageRequests.length > 0 && (
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowRequests(!showRequests)}
                                            className={`px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1 ${showRequests ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}
                                        >
                                            Requests
                                            <span className="w-5 h-5 bg-[var(--bg-primary)]/20 flex items-center justify-center text-[10px]">{messageRequests.length}</span>
                                        </motion.button>
                                    )}
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2.5 hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <MoreHorizontal size={18} className="text-[var(--text-muted)]" />
                                    </motion.button>
                                    <motion.button 
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2.5 hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <Edit size={18} className="text-[var(--text-muted)]" />
                                    </motion.button>
                                </div>
                            </div>

                            <motion.div 
                                animate={{ 
                                    boxShadow: searchFocused ? '0 0 0 2px var(--accent)' : '0 0 0 0px transparent',
                                    backgroundColor: searchFocused ? 'var(--bg-secondary)' : 'var(--bg-tertiary)'
                                }}
                                className="flex items-center gap-3 px-4 py-3 transition-all"
                            >
                                <Search size={18} className={`transition-colors ${searchFocused ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    className="bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-full !border-none !shadow-none !ring-0 !rounded-none"
                                />
                            </motion.div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence>
                                {showRequests ? (
                                    messageRequests.length === 0 ? (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center h-full p-8 text-center"
                                        >
                                            <div className="w-16 h-16 bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                                                <MessageSquare size={28} className="text-[var(--accent)]" />
                                            </div>
                                            <p className="text-[var(--text-muted)] text-sm">No message requests</p>
                                        </motion.div>
                                    ) : (
                                        messageRequests.map((convo, index) => (
                                            <motion.div
                                                key={convo.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-4 border-b border-[var(--border-color)]/30"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                                                            <Avatar src={convo.user.avatar} iconSize={20} />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-[var(--text-primary)] truncate">{convo.user.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)] truncate">{convo.lastMessage?.content || 'Sent you a message'}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={async () => {
                                                                    try {
                                                                        await api.put(`/chat/accept-request/${convo.id}`);
                                                                        setMessageRequests(prev => prev.filter(r => r.id !== convo.id));
                                                                        setConversations(prev => [...prev, { ...convo }]);
                                                                        setSelectedConvo(convo);
                                                                        setShowRequests(false);
                                                                        setShowMobileChat(true);
                                                                    } catch (e) {
                                                                        console.error('Failed to accept request:', e);
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-semibold"
                                                            >
                                                                Accept
                                                            </motion.button>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={async () => {
                                                                    try {
                                                                        await api.delete(`/chat/decline-request/${convo.id}`);
                                                                        setMessageRequests(prev => prev.filter(r => r.id !== convo.id));
                                                                    } catch (e) {
                                                                        console.error('Failed to decline request:', e);
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs font-semibold"
                                                            >
                                                                Delete
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )
                                ) : filteredConvos.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center h-full p-8 text-center"
                                    >
                                        <div className="w-16 h-16 bg-[var(--accent)]/10 flex items-center justify-center mb-4">
                                            <MessageSquare size={28} className="text-[var(--accent)]" />
                                        </div>
                                        <p className="text-[var(--text-muted)] text-sm">No conversations yet</p>
                                        <p className="text-[var(--text-muted)] text-xs mt-1">Start chatting with alumni!</p>
                                    </motion.div>
                                ) : (
                                    filteredConvos.map((convo, index) => (
                                        <motion.button
                                            key={convo.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
                                            onClick={() => { setSelectedConvo(convo); setShowMobileChat(true); }}
                                            className={`w-full p-4 flex gap-4 text-left transition-all border-l-4 ${selectedConvo?.id === convo.id 
                                                ? 'bg-[var(--accent)]/5 border-l-[var(--accent)]' 
                                                : 'border-l-transparent hover:border-l-[var(--accent)]/30'
                                            }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <motion.div whileHover={{ scale: 1.05 }}>
                                                    <div className="w-14 h-14 bg-[var(--accent)] flex items-center justify-center ring-2 ring-[var(--border-color)]/50 shadow-sm shadow-[var(--accent)]/20 overflow-hidden">
                                                        <Avatar src={convo.user.avatar} iconSize={24} />
                                                    </div>
                                                </motion.div>
                                                {convo.user.isOnline && (
                                                    <motion.div 
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--text-secondary)] border-3 border-[var(--bg-primary)] shadow-sm"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-semibold truncate ${convo.unread ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                                        {convo.user.name}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">{getTimeAgo(convo.updatedAt)}</span>
                                                </div>
                                                <p className={`text-sm truncate ${convo.unread ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                                                    {convo.lastMessage ? (
                                                        (convo.lastMessage.sender === user?.id ? 'You: ' : '') + convo.lastMessage.content
                                                    ) : 'Start a conversation'}
                                                </p>
                                            </div>
                                            {convo.unread > 0 && (
                                                <motion.div 
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-6 h-6 bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm shadow-[var(--accent)]/30"
                                                >
                                                    {convo.unread}
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Chat Area */}
                    <AnimatePresence mode="wait">
                        {selectedConvo ? (
                            <motion.div 
                                key={selectedConvo.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}
                            >
                                {/* Chat Header */}
                                <div className="p-4 border-b border-[var(--border-color)]/50 bg-[var(--bg-primary)]/50/50 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setShowMobileChat(false)}
                                                className="md:hidden p-2 hover:bg-[var(--bg-tertiary)] transition-colors"
                                            >
                                                <ArrowLeft size={20} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                            <div className="relative">
                                                <motion.button 
                                                    whileHover={{ scale: 1.05 }}
                                                    onClick={() => navigate(`/profile/${selectedConvo.user._id}`)} 
                                                    className="block"
                                                >
                                                    <div className="w-12 h-12 bg-[var(--accent)] flex items-center justify-center ring-2 ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/20 overflow-hidden">
                                                        <Avatar src={selectedConvo.user.avatar} iconSize={20} />
                                                    </div>
                                                </motion.button>
                                                {selectedConvo.user.isOnline && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--text-secondary)] border-2 border-[var(--bg-primary)]" />
                                                )}
                                            </div>
                                            <div>
                                                <button onClick={() => navigate(`/profile/${selectedConvo.user._id}`)} className="font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
                                                    {selectedConvo.user.name}
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {isTyping ? (
                                                        <motion.p 
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="text-xs text-[var(--accent)] font-medium flex items-center gap-1"
                                                        >
                                                            typing
                                                            <motion.span
                                                                animate={{ opacity: [0, 1, 0] }}
                                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                            >...</motion.span>
                                                        </motion.p>
                                                    ) : (
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {selectedConvo.user.isOnline ? (
                                                                <span className="flex items-center gap-1.5">
                                                                    <Circle size={8} className="fill-[var(--text-secondary)] text-[var(--text-secondary)]" />
                                                                    Active now
                                                                </span>
                                                            ) : selectedConvo.user.headline}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <motion.button 
                                                whileHover={{ scale: 1.1, backgroundColor: 'var(--bg-tertiary)' }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-2.5 transition-colors"
                                            >
                                                <Phone size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.1, backgroundColor: 'var(--bg-tertiary)' }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-2.5 transition-colors"
                                            >
                                                <Video size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.1, backgroundColor: 'var(--bg-tertiary)' }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-2.5 transition-colors"
                                            >
                                                <Info size={18} className="text-[var(--text-muted)]" />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-[var(--bg-tertiary)]/20">
                                    {groupMessagesByDate(messages).map((group, groupIndex) => (
                                        <div key={group.date}>
                                            <div className="flex items-center justify-center mb-6">
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="px-4 py-1.5 bg-[var(--bg-tertiary)]/80 backdrop-blur-sm text-xs font-medium text-[var(--text-muted)]"
                                                >
                                                    {formatDateHeader(group.date)}
                                                </motion.div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {group.messages.map((msg, msgIndex) => {
                                                    const showAvatar = !msg.isOwn && (msgIndex === 0 || group.messages[msgIndex - 1]?.isOwn);
                                                    
                                                    return (
                                                        <motion.div 
                                                            key={msg._id}
                                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            transition={{ delay: msgIndex * 0.02 }}
                                                            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            <div className={`flex gap-3 max-w-[75%] ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                                                                {!msg.isOwn && (
                                                                    <div className="w-9 flex-shrink-0">
                                                                        {showAvatar && (
                                                                            <motion.div 
                                                                                initial={{ scale: 0 }}
                                                                                animate={{ scale: 1 }}
                                                                                className="w-9 h-9 overflow-hidden"
                                                                            >
                                                                                <div className="w-full h-full bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                                                                                    <Avatar src={selectedConvo.user.avatar} iconSize={14} />
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                
                                                                <div className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.01 }}
                                                                        className={`px-4 py-3 shadow-sm ${msg.isOwn
                                                                            ? 'bg-[var(--accent)] text-[var(--bg-primary)]-md'
                                                                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]-md border border-[var(--border-color)]/50'
                                                                        }`}
                                                                    >
                                                                        {msg.media && msg.media.length > 0 ? (
                                                                            <div className="space-y-2">
                                                                                {msg.media.map((m, i) => (
                                                                                    <div key={i} className="max-w-[280px]">
                                                                                        {m.type && (m.type === 'image' || (m.type as string).startsWith('image')) ? (
                                                                                            (() => {
                                                                                                const images = (msg.media || []).filter((mm: any) => (mm.type === 'image' || (mm.type as string).startsWith('image'))).map((mm: any) => ({ url: normalizeMediaUrl(mm.url), type: mm.type }));
                                                                                                const idx = images.findIndex(u => u.url === normalizeMediaUrl(m.url));
                                                                                                return (
                                                                                                    <motion.img
                                                                                                        whileHover={{ scale: 1.02 }}
                                                                                                        src={normalizeMediaUrl(m.url)}
                                                                                                        alt={m.url}
                                                                                                        className="object-cover w-full cursor-zoom-in shadow-sm"
                                                                                                        onClick={() => openLightbox(images, idx >= 0 ? idx : 0)}
                                                                                                    />
                                                                                                );
                                                                                            })()
                                                                                        ) : m.type && (m.type === 'video' || (m.type as string).startsWith('video')) ? (
                                                                                            <video src={normalizeMediaUrl(m.url)} controls className="w-full shadow-sm" />
                                                                                        ) : m.type && (m.type === 'audio' || (m.type as string).startsWith('audio')) ? (
                                                                                            <audio src={normalizeMediaUrl(m.url)} controls className="w-full" />
                                                                                        ) : (
                                                                                            <a href={normalizeMediaUrl(m.url)} target="_blank" rel="noreferrer" className="underline text-sm">{m.url.split('/').pop()}</a>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                                {msg.content && <p className="text-sm mt-2">{msg.content}</p>}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                                                        )}
                                                                    </motion.div>
                                                                    
                                                                    <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                                                                        <span className="text-[10px] text-[var(--text-muted)]">{formatTime(msg.createdAt)}</span>
                                                                        {msg.isOwn && (
                                                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                                                {msg.status === 'read' ? (
                                                                                    <CheckCheck size={14} className="text-[var(--accent)]" />
                                                                                ) : msg.status === 'delivered' ? (
                                                                                    <CheckCheck size={14} className="text-[var(--text-muted)]" />
                                                                                ) : (
                                                                                    <Check size={14} className="text-[var(--text-muted)]" />
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}

                                    {messages.length === 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-center justify-center h-full text-center"
                                        >
                                            <div className="w-20 h-20 bg-gradient-to-br from-[var(--accent)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center mb-4">
                                                <MessageSquare size={36} className="text-[var(--accent)]" />
                                            </div>
                                            <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">Start a conversation</h3>
                                            <p className="text-sm text-[var(--text-muted)]">Say hello to {selectedConvo.user.name}!</p>
                                        </motion.div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <div className="p-4 border-t border-[var(--border-color)]/50 bg-[var(--bg-primary)]/50/50 backdrop-blur-sm">
                                    {fileErrors.length > 0 && (
                                        <div className="mb-3">
                                            {fileErrors.map((err, i) => (
                                                <motion.p 
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-xs text-[var(--text-secondary)] bg-[var(--accent-light)] px-3 py-2 mb-1"
                                                >
                                                    {err}
                                                </motion.p>
                                            ))}
                                        </div>
                                    )}

                                    {uploading && (
                                        <div className="mb-3">
                                            <div className="w-full bg-[var(--bg-tertiary)] h-1.5 overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    className="h-full bg-[var(--accent)]" 
                                                />
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-1.5">Uploading... {uploadProgress}%</p>
                                        </div>
                                    )}

                                    {attachmentPreviews.length > 0 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex gap-2 mb-3 overflow-x-auto pb-2"
                                        >
                                            {attachmentPreviews.map((p, idx) => (
                                                <motion.div 
                                                    key={idx}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="relative w-20 h-20 flex-shrink-0 overflow-hidden border border-[var(--border-color)]/50 group"
                                                >
                                                    {p.type.startsWith('image') ? (
                                                        <img src={p.url} className="w-full h-full object-cover" alt={p.name} />
                                                    ) : p.type.startsWith('video') ? (
                                                        <video src={p.url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)] px-2 text-xs text-center">{p.name}</div>
                                                    )}
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => {
                                                            setAttachmentPreviews(prev => {
                                                                const copy = prev.filter((_, i) => i !== idx);
                                                                try { URL.revokeObjectURL(prev[idx].url); } catch {}
                                                                return copy;
                                                            });
                                                            setAttachments(prev => prev.filter((_, i) => i !== idx));
                                                        }} 
                                                        className="absolute top-1 right-1 bg-black/60 hover:bg-[var(--accent)] text-[var(--bg-primary)] w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </motion.button>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}

                                    <div className="flex items-end gap-3">
                                        <div className="flex gap-1">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/zip,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (!files) return;
                                                    const list = Array.from(files);
                                                    const allowedPrefixes = ['image', 'video', 'audio', 'application', 'text'];
                                                    const maxImage = 10 * 1024 * 1024;
                                                    const maxVideo = 50 * 1024 * 1024;
                                                    const errors: string[] = [];
                                                    const valid: File[] = [];

                                                    list.forEach(f => {
                                                        const prefix = f.type.split('/')[0];
                                                        if (!allowedPrefixes.includes(prefix)) {
                                                            errors.push(`${f.name}: Unsupported file type`);
                                                            return;
                                                        }
                                                        if (f.type.startsWith('image') && f.size > maxImage) {
                                                            errors.push(`${f.name}: Image too large (max 10MB)`);
                                                            return;
                                                        }
                                                        if (f.type.startsWith('video') && f.size > maxVideo) {
                                                            errors.push(`${f.name}: Video too large (max 50MB)`);
                                                            return;
                                                        }
                                                        valid.push(f);
                                                    });

                                                    setFileErrors(errors);
                                                    if (valid.length > 0) {
                                                        setAttachments(prev => [...prev, ...valid]);
                                                        const previews = valid.map(f => ({ url: URL.createObjectURL(f), name: f.name, type: f.type }));
                                                        setAttachmentPreviews(prev => [...prev, ...previews]);
                                                    }
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                            />
                                            <motion.button 
                                                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => fileInputRef.current?.click()} 
                                                className="p-3 hover:bg-[var(--bg-tertiary)] transition-all text-[var(--text-muted)]"
                                            >
                                                <Image size={20} />
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => fileInputRef.current?.click()} 
                                                className="p-3 hover:bg-[var(--bg-tertiary)] transition-all text-[var(--text-muted)]"
                                            >
                                                <Paperclip size={20} />
                                            </motion.button>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <motion.div
                                                whileFocus={{ boxShadow: '0 0 0 2px var(--accent)' }}
                                                className="relative"
                                            >
                                                <textarea
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Type a message..."
                                                    rows={1}
                                                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] px-5 py-3.5 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                />
                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                                                >
                                                    <Smile size={20} />
                                                </motion.button>
                                            </motion.div>
                                        </div>
                                        
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleSendMessage}
                                            disabled={!newMessage.trim() && attachments.length === 0}
                                            className="p-3.5 bg-[var(--accent)] text-[var(--bg-primary)] hover:shadow-sm hover:shadow-[var(--accent)]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                        >
                                            <Send size={20} />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-[var(--bg-tertiary)]/20 to-transparent"
                            >
                                <div className="text-center">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--accent)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center"
                                    >
                                        <MessageSquare size={40} className="text-[var(--accent)]" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Your Messages</h3>
                                    <p className="text-[var(--text-muted)]">Select a conversation to start chatting</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Lightbox */}
                    <AnimatePresence>
                        {lightboxOpen && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                {...swipeHandlers} 
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                            >
                                <motion.button 
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={closeLightbox} 
                                    className="absolute top-6 right-6 p-3 bg-[var(--bg-primary)]/10 backdrop-blur-sm text-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/20 transition-colors"
                                >
                                    <X size={24} />
                                </motion.button>

                                {lightboxMedia.length > 1 && (
                                    <motion.button 
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={prevLightbox} 
                                        className="absolute left-6 p-3 bg-[var(--bg-primary)]/10 backdrop-blur-sm text-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/20 transition-colors"
                                    >
                                        <ChevronLeft size={28} />
                                    </motion.button>
                                )}

                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="max-w-[90%] max-h-[90%] flex flex-col items-center justify-center"
                                >
                                    <div className="flex items-center justify-center w-full">
                                        {lightboxMedia[lightboxIndex] && (lightboxMedia[lightboxIndex].type && lightboxMedia[lightboxIndex].type?.startsWith('video') ? (
                                            <ModalVideoPlayer src={lightboxMedia[lightboxIndex].url} autoPlayMuted={true} className="max-w-full max-h-[90vh]" />
                                        ) : lightboxMedia[lightboxIndex].type && lightboxMedia[lightboxIndex].type?.startsWith('audio') ? (
                                            <audio src={lightboxMedia[lightboxIndex].url} controls className="w-full" />
                                        ) : (
                                            <motion.img
                                                key={lightboxIndex}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                src={lightboxMedia[lightboxIndex].url}
                                                alt={`media-${lightboxIndex}`}
                                                className="max-w-full max-h-[85vh] object-contain shadow-md touch-none"
                                                style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transition: zoom === 1 ? 'transform 200ms' : 'none' }}
                                                onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(); }}
                                                onTouchMove={handleTouchMove}
                                                onTouchEnd={handleTouchEnd}
                                                onDoubleClick={() => setZoom(prev => (prev > 1 ? 1 : 2))}
                                            />
                                        ))}
                                    </div>

                                    {lightboxMedia.length > 1 && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-6 w-full overflow-x-auto flex items-center justify-center gap-2 px-4"
                                        >
                                            {lightboxMedia.map((m, i) => (
                                                <motion.button 
                                                    key={i} 
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => { setLightboxIndex(i); setZoom(1); setPan({ x: 0, y: 0 }); }} 
                                                    className={`overflow-hidden transition-all ${i === lightboxIndex ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-black' : 'opacity-50 hover:opacity-100'}`}
                                                >
                                                    {m.type && m.type.startsWith('image') ? (
                                                        <img src={m.url} className="w-16 h-16 object-cover" alt={`thumb-${i}`} />
                                                    ) : m.type && m.type.startsWith('video') ? (
                                                        <video src={m.url} className="w-16 h-16 object-cover" />
                                                    ) : (
                                                        <div className="w-16 h-16 flex items-center justify-center bg-[var(--bg-primary)]/10 text-xs text-[var(--bg-primary)]">file</div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </motion.div>
                                    )}

                                    {lightboxMedia.length > 1 && (
                                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                                            {lightboxMedia.map((_, i) => (
                                                <motion.button 
                                                    key={i} 
                                                    whileHover={{ scale: 1.2 }}
                                                    onClick={() => setLightboxIndex(i)} 
                                                    className={`w-2.5 h-2.5 transition-all ${i === lightboxIndex ? 'bg-[var(--bg-primary)] scale-125' : 'bg-[var(--bg-primary)]/40'}`} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>

                                {lightboxMedia.length > 1 && (
                                    <motion.button 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={nextLightbox} 
                                        className="absolute right-6 p-3 bg-[var(--bg-primary)]/10 backdrop-blur-sm text-[var(--bg-primary)] hover:bg-[var(--bg-primary)]/20 transition-colors"
                                    >
                                        <ChevronRight size={28} />
                                    </motion.button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Messages;