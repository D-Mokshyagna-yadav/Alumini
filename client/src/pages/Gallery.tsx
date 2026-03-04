import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { 
    Image as ImageIcon, ChevronLeft, ChevronRight, X, Download, Share2, Heart, 
    Maximize2, Grid, LayoutList, Search, Camera, Trash2, FolderPlus, Upload,
    Play, Video, Film, Sparkles, Folder, ImagePlus, Loader2
} from 'lucide-react';

interface GalleryMedia {
    id: string;
    url: string;
    type: 'image' | 'video';
    caption?: string;
    likes: number;
    isLiked?: boolean;
    createdAt: string;
}

interface GalleryAlbum {
    id: string;
    title: string;
    description?: string;
    folderName?: string;
    coverImage?: string;
    images: GalleryMedia[];
    createdAt: string;
    createdBy?: { name: string };
}

const Gallery = () => {
    const { user } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();
    
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
    const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        try {
            const res = await api.get('/gallery').catch(() => ({ data: { albums: [] } }));
            setAlbums(res.data.albums || []);
        } catch (err) {
            console.error('Failed to load gallery', err);
            setAlbums([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredAlbums = albums.filter(album =>
        album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentMedia = selectedAlbum?.images || [];

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => setLightboxOpen(false);
    const nextMedia = () => setLightboxIndex((prev) => (prev + 1) % currentMedia.length);
    const prevMedia = () => setLightboxIndex((prev) => (prev - 1 + currentMedia.length) % currentMedia.length);

    const handleLike = async (mediaId: string) => {
        if (!selectedAlbum) return;
        try {
            await api.post(`/gallery/album/${selectedAlbum.id}/images/${mediaId}/like`);
            setAlbums(prev => prev.map(album => 
                album.id === selectedAlbum.id
                    ? {
                        ...album,
                        images: album.images.map(img => 
                            img.id === mediaId 
                                ? { ...img, likes: img.isLiked ? img.likes - 1 : img.likes + 1, isLiked: !img.isLiked }
                                : img
                        )
                    }
                    : album
            ));
            setSelectedAlbum(prev => prev ? {
                ...prev,
                images: prev.images.map(img => 
                    img.id === mediaId 
                        ? { ...img, likes: img.isLiked ? img.likes - 1 : img.likes + 1, isLiked: !img.isLiked }
                        : img
                )
            } : null);
        } catch (err) {
            console.error('Failed to like', err);
        }
    };

    const handleShare = (media: GalleryMedia) => {
        const fullUrl = window.location.origin + media.url;
        navigator.clipboard.writeText(fullUrl);
        toast.show('Link copied!', 'success');
    };

    const handleDownload = (media: GalleryMedia) => {
        const link = document.createElement('a');
        link.href = media.url;
        link.download = media.type === 'video' ? 'video.mp4' : 'photo.jpg';
        link.click();
    };

    const handleCreateAlbum = async (title: string, description: string) => {
        try {
            const res = await api.post('/gallery/album', { title, description });
            setAlbums(prev => [res.data.album, ...prev]);
            setShowCreateModal(false);
            toast.show('Album created!', 'success');
        } catch (err: any) {
            toast.show(err?.response?.data?.message || 'Failed to create album', 'error');
        }
    };

    const handleUploadMedia = async (files: File[]) => {
        if (!selectedAlbum) return;
        try {
            const formData = new FormData();
            files.forEach(f => formData.append('images', f));
            const res = await api.post(`/gallery/album/${selectedAlbum.id}/images`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newMedia = res.data.images || [];
            setAlbums(prev => prev.map(a => 
                a.id === selectedAlbum.id ? { ...a, images: [...a.images, ...newMedia] } : a
            ));
            setSelectedAlbum(prev => prev ? { ...prev, images: [...prev.images, ...newMedia] } : null);
            setShowUploadModal(false);
            toast.show('Media uploaded!', 'success');
        } catch (err: any) {
            toast.show(err?.response?.data?.message || 'Failed to upload', 'error');
        }
    };

    const handleDeleteAlbum = async (albumId: string) => {
        const ok = await confirm({ title: 'Delete Album', message: 'Delete this album and all its contents?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/gallery/album/${albumId}`);
            setAlbums(prev => prev.filter(a => a.id !== albumId));
            if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
            toast.show('Album deleted', 'success');
        } catch (err: any) {
            toast.show(err?.response?.data?.message || 'Failed to delete album', 'error');
        }
    };

    const handleDeleteMedia = async (mediaId: string) => {
        if (!selectedAlbum) return;
        const ok = await confirm({ title: 'Delete Item', message: 'Delete this item?', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.delete(`/gallery/album/${selectedAlbum.id}/images/${mediaId}`);
            setAlbums(prev => prev.map(a => 
                a.id === selectedAlbum.id ? { ...a, images: a.images.filter(i => i.id !== mediaId) } : a
            ));
            setSelectedAlbum(prev => prev ? { ...prev, images: prev.images.filter(i => i.id !== mediaId) } : null);
            toast.show('Item deleted', 'success');
        } catch (err: any) {
            toast.show(err?.response?.data?.message || 'Failed to delete', 'error');
        }
    };

    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevMedia();
            if (e.key === 'ArrowRight') nextMedia();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightboxOpen, currentMedia.length]);

    const imageCount = selectedAlbum?.images.filter(m => m.type === 'image').length || 0;
    const videoCount = selectedAlbum?.images.filter(m => m.type === 'video').length || 0;

    const handleSetCover = async (mediaUrl: string) => {
        if (!selectedAlbum) return;
        try {
            await api.put(`/gallery/album/${selectedAlbum.id}`, { coverImage: mediaUrl });
            setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, coverImage: mediaUrl } : a));
            setSelectedAlbum(prev => prev ? { ...prev, coverImage: mediaUrl } : null);
            toast.show('Album cover updated!', 'success');
        } catch (err: any) {
            toast.show(err?.response?.data?.message || 'Failed to update cover', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bg-tertiary)]" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
                </div>
                <p className="text-[var(--text-muted)] text-sm">Loading gallery...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[var(--bg-primary)]/80/80 backdrop-blur-2xl border border-[var(--border-color)]/30 p-6 mb-8 shadow-md shadow-black/5"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {selectedAlbum && (
                            <motion.button
                                whileHover={{ scale: 1.1, x: -4 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedAlbum(null)}
                                className="p-3 hover:bg-[var(--bg-tertiary)] transition-all"
                            >
                                <ChevronLeft size={24} className="text-[var(--text-primary)]" />
                            </motion.button>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-4">
                                <motion.div 
                                    whileHover={{ rotate: 10, scale: 1.1 }}
                                    className="w-14 h-14 bg-gradient-to-br from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] flex items-center justify-center shadow-sm shadow-[var(--accent)]/30"
                                >
                                    {selectedAlbum ? <Folder size={28} className="text-[var(--bg-primary)]" /> : <Camera size={28} className="text-[var(--bg-primary)]" />}
                                </motion.div>
                                <span className="text-gradient">{selectedAlbum ? selectedAlbum.title : 'Gallery'}</span>
                            </h1>
                            <p className="text-[var(--text-muted)] mt-2 ml-[72px]">
                                {selectedAlbum 
                                    ? <span className="flex items-center gap-3">
                                        {imageCount > 0 && <span className="flex items-center gap-1"><ImageIcon size={14} /> {imageCount} photos</span>}
                                        {videoCount > 0 && <span className="flex items-center gap-1"><Video size={14} /> {videoCount} videos</span>}
                                      </span>
                                    : `${albums.length} album${albums.length !== 1 ? 's' : ''} • Browse memories`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {!selectedAlbum && (
                            <div className="relative group flex-1 md:w-72">
                                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-tertiary)]/60 backdrop-blur-xl border-none shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-within:shadow-[0_4px_32px_rgba(0,0,0,0.10),inset_0_0_0_1.5px_rgba(128,128,128,0.25)] transition-all duration-300 px-4 py-2.5">
                                    <Search size={18} className="text-[var(--text-muted)] flex-shrink-0 group-focus-within:text-[var(--accent)] transition-colors duration-300" />
                                    <input
                                        type="text"
                                        placeholder="Search albums..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent !border-none !outline-none !ring-0 !shadow-none !rounded-none text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 focus:border-none focus:shadow-none w-full font-medium"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="p-1 rounded-full hover:bg-[var(--bg-secondary)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 flex-shrink-0"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        {selectedAlbum && (
                            <div className="flex gap-1 p-1.5 bg-[var(--bg-tertiary)]/80">
                                {[{ v: 'grid', icon: Grid }, { v: 'list', icon: LayoutList }].map(({ v, icon: Icon }) => (
                                    <motion.button
                                        key={v}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setView(v as 'grid' | 'list')}
                                        className={`p-3 transition-all ${view === v ? 'bg-[var(--bg-secondary)] shadow-sm' : ''}`}
                                    >
                                        <Icon size={20} className={view === v ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                        {isAdmin && !selectedAlbum && (
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-[var(--bg-primary)] font-semibold shadow-md shadow-[var(--accent)]/30 flex items-center gap-2"
                            >
                                <FolderPlus size={20} />
                                New Album
                            </motion.button>
                        )}
                        {isAdmin && selectedAlbum && (
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowUploadModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-[var(--bg-primary)] font-semibold shadow-md shadow-[var(--accent)]/30 flex items-center gap-2"
                            >
                                <Upload size={20} />
                                Add Media
                            </motion.button>
                        )}
                    </div>
                </div>
            </motion.div>

            {!selectedAlbum ? (
                filteredAlbums.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--bg-primary)]/80/80 backdrop-blur-2xl border border-[var(--border-color)]/30 p-16 text-center shadow-md"
                    >
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--gradient-start)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center"
                        >
                            <Sparkles size={48} className="text-[var(--accent)]" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">No albums yet</h3>
                        <p className="text-[var(--text-muted)] mt-3 max-w-md mx-auto">Create your first album to start organizing photos and videos from events</p>
                        {isAdmin && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowCreateModal(true)}
                                className="mt-8 px-8 py-4 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-[var(--bg-primary)] font-bold shadow-md shadow-[var(--accent)]/30"
                            >
                                Create First Album
                            </motion.button>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredAlbums.map((album, index) => (
                            <motion.div
                                key={album.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                className="bg-[var(--bg-primary)]/80/80 backdrop-blur-xl border border-[var(--border-color)]/30 overflow-hidden shadow-md hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => setSelectedAlbum(album)}
                            >
                                <div className="aspect-[4/3] relative bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--accent)]/10">
                                    {album.coverImage || album.images[0]?.url ? (
                                        album.images[0]?.type === 'video' && !album.coverImage ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--accent)]/20 to-[var(--gradient-end)]/20">
                                                <Film size={48} className="text-[var(--accent)]" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="absolute inset-0 flex items-center justify-center z-0 album-cover-loader">
                                                    <Loader2 size={24} className="text-[var(--text-muted)] animate-spin" />
                                                </div>
                                                <img 
                                                    src={album.coverImage || album.images[0]?.url} 
                                                    alt={album.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-[1]"
                                                    onLoad={(e) => { const loader = (e.target as HTMLElement).parentElement?.querySelector('.album-cover-loader'); if (loader) (loader as HTMLElement).style.display = 'none'; }}
                                                />
                                            </>
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon size={56} className="text-[var(--text-muted)]/50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                                        <div className="flex gap-2">
                                            {album.images.filter(m => m.type === 'image').length > 0 && (
                                                <span className="text-[var(--bg-primary)] text-sm font-medium flex items-center gap-1 bg-[var(--bg-primary)]/20 backdrop-blur-sm px-3 py-1.5">
                                                    <ImageIcon size={14} /> {album.images.filter(m => m.type === 'image').length}
                                                </span>
                                            )}
                                            {album.images.filter(m => m.type === 'video').length > 0 && (
                                                <span className="text-[var(--bg-primary)] text-sm font-medium flex items-center gap-1 bg-[var(--bg-primary)]/20 backdrop-blur-sm px-3 py-1.5">
                                                    <Video size={14} /> {album.images.filter(m => m.type === 'video').length}
                                                </span>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                                                className="p-2.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm"
                                            >
                                                <Trash2 size={16} />
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">{album.title}</h3>
                                    {album.description && (
                                        <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">{album.description}</p>
                                    )}
                                    <p className="text-xs text-[var(--text-muted)] mt-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-[var(--accent)]"></span>
                                        {new Date(album.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            ) : (
                currentMedia.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[var(--bg-primary)]/80/80 backdrop-blur-2xl border border-[var(--border-color)]/30 p-16 text-center shadow-md"
                    >
                        <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--gradient-start)]/20 to-[var(--gradient-end)]/20 flex items-center justify-center"
                        >
                            <Upload size={48} className="text-[var(--accent)]" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)]">Empty Album</h3>
                        <p className="text-[var(--text-muted)] mt-3">Upload photos and videos to this album</p>
                        {isAdmin && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowUploadModal(true)}
                                className="mt-8 px-8 py-4 bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-mid)] to-[var(--gradient-end)] text-[var(--bg-primary)] font-bold shadow-md"
                            >
                                Upload Media
                            </motion.button>
                        )}
                    </motion.div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {currentMedia.map((media, index) => (
                            <motion.div
                                key={media.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.04 }}
                                whileHover={{ y: -6, scale: 1.02 }}
                                className="group relative aspect-square overflow-hidden bg-[var(--bg-tertiary)] cursor-pointer shadow-md hover:shadow-md transition-all"
                                onClick={() => openLightbox(index)}
                            >
                                {media.type === 'video' ? (
                                    <div className="w-full h-full relative">
                                        <video src={media.url} className="w-full h-full object-cover" muted />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <motion.div 
                                                whileHover={{ scale: 1.2 }}
                                                className="w-16 h-16 bg-[var(--bg-primary)]/90 flex items-center justify-center shadow-md"
                                            >
                                                <Play size={28} className="text-[var(--accent)] ml-1" fill="currentColor" />
                                            </motion.div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 flex items-center justify-center z-0 media-loader">
                                            <Loader2 size={24} className="text-[var(--text-muted)] animate-spin" />
                                        </div>
                                        <img 
                                            src={media.url} 
                                            alt={media.caption || 'Photo'}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 relative z-[1]"
                                            onLoad={(e) => { const loader = (e.target as HTMLElement).parentElement?.querySelector('.media-loader'); if (loader) (loader as HTMLElement).style.display = 'none'; }}
                                        />
                                    </>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        {media.caption && (
                                            <p className="text-[var(--bg-primary)] text-sm truncate mb-3 font-medium">{media.caption}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <motion.button 
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handleLike(media.id); }}
                                                className="flex items-center gap-1.5 text-[var(--bg-primary)]/90 hover:text-[var(--bg-primary)]"
                                            >
                                                <Heart size={18} fill={media.isLiked ? 'currentColor' : 'none'} className={media.isLiked ? 'text-[var(--text-secondary)]' : ''} />
                                                <span className="text-sm font-medium">{media.likes}</span>
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.2 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handleShare(media); }}
                                                className="text-[var(--bg-primary)]/90 hover:text-[var(--bg-primary)]"
                                            >
                                                <Share2 size={18} />
                                            </motion.button>
                                            {isAdmin && (
                                                <motion.button 
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMedia(media.id); }}
                                                    className="text-[var(--bg-primary)]/90 hover:text-[var(--text-secondary)] ml-auto"
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="absolute top-3 right-3 p-2.5 bg-black/50 backdrop-blur-sm text-[var(--bg-primary)] opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Maximize2 size={18} />
                                </motion.div>
                                {media.type === 'video' && (
                                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-sm text-[var(--bg-primary)] text-xs font-medium flex items-center gap-1">
                                        <Video size={12} /> Video
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentMedia.map((media, index) => (
                            <motion.div
                                key={media.id}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.06 }}
                                whileHover={{ x: 4 }}
                                className="bg-[var(--bg-primary)]/80/80 backdrop-blur-xl border border-[var(--border-color)]/30 overflow-hidden shadow-md hover:shadow-md transition-all cursor-pointer"
                                onClick={() => openLightbox(index)}
                            >
                                <div className="flex gap-5 p-5">
                                    <div className="w-40 h-28 overflow-hidden flex-shrink-0 relative">
                                        {media.type === 'video' ? (
                                            <>
                                                <video src={media.url} className="w-full h-full object-cover" muted />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <Play size={24} className="text-[var(--bg-primary)]" fill="currentColor" />
                                                </div>
                                            </>
                                        ) : (
                                            <img src={media.url} alt={media.caption || 'Photo'} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                {media.type === 'video' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold mb-2">
                                                        <Video size={12} /> Video
                                                    </span>
                                                )}
                                                {media.caption && (
                                                    <p className="text-[var(--text-primary)] font-medium line-clamp-2">{media.caption}</p>
                                                )}
                                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                                    {new Date(media.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-4">
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                onClick={(e) => { e.stopPropagation(); handleLike(media.id); }}
                                                className={`flex items-center gap-2 text-sm font-medium ${media.isLiked ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}
                                            >
                                                <Heart size={18} fill={media.isLiked ? 'currentColor' : 'none'} />
                                                {media.likes} likes
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                onClick={(e) => { e.stopPropagation(); handleShare(media); }}
                                                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] font-medium"
                                            >
                                                <Share2 size={18} />
                                                Share
                                            </motion.button>
                                            <motion.button 
                                                whileHover={{ scale: 1.1 }}
                                                onClick={(e) => { e.stopPropagation(); handleDownload(media); }}
                                                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] font-medium"
                                            >
                                                <Download size={18} />
                                                Download
                                            </motion.button>
                                            {isAdmin && (
                                                <motion.button 
                                                    whileHover={{ scale: 1.1 }}
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMedia(media.id); }}
                                                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] ml-auto font-medium"
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )
            )}

            <AnimatePresence>
                {showCreateModal && (
                    <CreateAlbumModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateAlbum} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showUploadModal && (
                    <UploadMediaModal onClose={() => setShowUploadModal(false)} onUpload={handleUploadMedia} />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {lightboxOpen && currentMedia[lightboxIndex] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center"
                        onClick={closeLightbox}
                    >
                        {/* Top bar */}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 z-10 bg-gradient-to-b from-black/60 to-transparent">
                            <div className="flex items-center gap-2">
                                {currentMedia.length > 1 && (
                                    <span className="text-white/70 text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        {lightboxIndex + 1} / {currentMedia.length}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); handleDownload(currentMedia[lightboxIndex]); }}
                                    className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors rounded-full" title="Download"
                                >
                                    <Download size={20} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); handleShare(currentMedia[lightboxIndex]); }}
                                    className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors rounded-full" title="Share"
                                >
                                    <Share2 size={20} />
                                </motion.button>
                                {isAdmin && currentMedia[lightboxIndex].type === 'image' && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleSetCover(currentMedia[lightboxIndex].url); }}
                                        className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors rounded-full" title="Set as album cover"
                                    >
                                        <ImagePlus size={20} />
                                    </motion.button>
                                )}
                                {isAdmin && (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteMedia(currentMedia[lightboxIndex].id); closeLightbox(); }}
                                        className="p-2.5 bg-red-500/80 backdrop-blur-sm text-white hover:bg-red-500 transition-colors rounded-full" title="Delete"
                                    >
                                        <Trash2 size={20} />
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={closeLightbox}
                                    className="p-2.5 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors rounded-full" title="Close"
                                >
                                    <X size={22} />
                                </motion.button>
                            </div>
                        </div>

                        {currentMedia.length > 1 && (
                            <>
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ scale: 1.1, x: -5 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); prevMedia(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-10 rounded-full"
                                >
                                    <ChevronLeft size={28} />
                                </motion.button>
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ scale: 1.1, x: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); nextMedia(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-10 rounded-full"
                                >
                                    <ChevronRight size={28} />
                                </motion.button>
                            </>
                        )}

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {currentMedia[lightboxIndex].type === 'video' ? (
                                <video
                                    key={lightboxIndex}
                                    src={currentMedia[lightboxIndex].url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] shadow-md"
                                />
                            ) : (
                                <motion.img
                                    key={lightboxIndex}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    src={currentMedia[lightboxIndex].url}
                                    alt={currentMedia[lightboxIndex].caption || 'Photo'}
                                    className="max-w-full max-h-[80vh] object-contain shadow-md"
                                />
                            )}

                            {/* Bottom bar */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleLike(currentMedia[lightboxIndex].id); }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentMedia[lightboxIndex].isLiked ? 'bg-red-500/20 text-red-400' : 'bg-white/10 backdrop-blur-sm text-white'}`}
                                    >
                                        <Heart size={18} fill={currentMedia[lightboxIndex].isLiked ? 'currentColor' : 'none'} />
                                        <span className="text-sm font-medium">{currentMedia[lightboxIndex].likes}</span>
                                    </motion.button>
                                    {currentMedia[lightboxIndex].caption && (
                                        <span className="text-white/80 text-sm font-medium truncate max-w-xs">{currentMedia[lightboxIndex].caption}</span>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CreateAlbumModal = ({ onClose, onCreate }: { onClose: () => void, onCreate: (title: string, description: string) => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden shadow-lg rounded-2xl"
            >
                <div className="p-6 border-b border-[var(--border-color)]/30">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Create Album</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Albums help organize your photos and videos</p>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="text-sm font-semibold text-[var(--text-secondary)] block mb-2">Album Name *</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Annual Day 2024"
                            className="w-full px-5 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none text-[var(--text-primary)] font-medium"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-[var(--text-secondary)] block mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe this album..."
                            className="w-full px-5 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none h-28 resize-none text-[var(--text-primary)]"
                        />
                    </div>
                </div>
                <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-tertiary)]/50">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-6 py-3 text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)]">Cancel</motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onCreate(title, description)}
                        disabled={!title.trim()}
                        className="px-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50 shadow-sm"
                    >
                        Create Album
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const UploadMediaModal = ({ onClose, onUpload }: { onClose: () => void, onUpload: (files: File[]) => void }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        setFiles(prev => [...prev, ...selected]);
        const newPreviews = selected.map(f => ({ url: URL.createObjectURL(f), type: f.type }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previews[index].url);
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-secondary)] w-full max-w-lg overflow-hidden shadow-lg rounded-2xl"
            >
                <div className="p-6 border-b border-[var(--border-color)]/30">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Upload Media</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Upload photos and videos to this album</p>
                </div>
                <div className="p-6 space-y-5">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--border-color)] cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group">
                        <motion.div 
                            animate={{ y: [0, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <Upload size={40} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors mb-3" />
                        </motion.div>
                        <span className="text-sm text-[var(--text-muted)] font-medium">Drop files or click to browse</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">Images & Videos (max 100MB each)</span>
                        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
                    </label>

                    {previews.length > 0 && (
                        <div className="grid grid-cols-4 gap-3 max-h-52 overflow-y-auto p-1">
                            {previews.map((preview, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative aspect-square overflow-hidden group"
                                >
                                    {preview.type.startsWith('video') ? (
                                        <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                            <Play size={24} className="text-[var(--text-muted)]" />
                                        </div>
                                    ) : (
                                        <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                    )}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => removeFile(i)}
                                        className="absolute top-1.5 right-1.5 p-1.5 bg-[var(--accent)] text-[var(--bg-primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    >
                                        <X size={12} />
                                    </motion.button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-tertiary)]/50">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-6 py-3 text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)]">Cancel</motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onUpload(files)}
                        disabled={files.length === 0}
                        className="px-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold disabled:opacity-50 shadow-sm"
                    >
                        Upload {files.length > 0 && `(${files.length})`}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Gallery;