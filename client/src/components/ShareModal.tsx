import React from 'react';
import { X, Copy, Facebook, Linkedin, Twitter, MessageSquare, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariant } from './animation/motionVariants';

const socialButtons = [
    { id: 'facebook', label: 'Facebook post', icon: <Facebook size={18} /> },
    { id: 'whatsapp', label: 'Whatsapp', icon: <MessageSquare size={18} /> },
    { id: 'linkedin', label: 'Linkedin post', icon: <Linkedin size={18} /> },
    { id: 'twitter', label: 'X (formerly Twitter)', icon: <Twitter size={18} /> },
    { id: 'telegram', label: 'Telegram', icon: <MessageSquare size={18} /> },
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} /> },
];

export default function ShareModal({ open, onClose, url, resourceType, resourceId }: { open: boolean; onClose: () => void; url: string; resourceType?: string; resourceId?: string }) {
    if (!open) return null;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            // send telemetry
            fetch('/api/telemetry/share', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resourceType, resourceId, action: 'copy', url })
            }).catch(e => console.error('Telemetry error', e));
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    const openShare = (channel: string) => {
        // build share url per channel
        let shareUrl = url;
        const encoded = encodeURIComponent(url);
        switch (channel) {
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`; break;
            case 'linkedin': shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`; break;
            case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encoded}`; break;
            case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${encoded}`; break;
            case 'telegram': shareUrl = `https://t.me/share/url?url=${encoded}`; break;
            case 'instagram': shareUrl = url; break;
            default: shareUrl = url;
        }

        // telemetry
        fetch('/api/telemetry/share', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceType, resourceId, action: 'share', channel, url })
        }).catch(e => console.error('Telemetry error', e));

        // open share target
        window.open(shareUrl, '_blank', 'noopener');
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 modal-overlay"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="bg-[var(--bg-secondary)] w-full max-w-md overflow-hidden modal-content"
                        variants={modalVariant} initial="hidden" animate="visible" exit="exit">
                        <div className="px-4 py-3 border-b border-[var(--border-color)]/30 flex items-center justify-between">
                            <h3 className="font-semibold text-[var(--text-primary)]">Share options</h3>
                            <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)]"><X size={20} /></button>
                        </div>
                        <div className="p-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Copy Link</label>
                                <div className="flex items-center gap-2 p-2 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-xl">
                                    <input value={url} readOnly className="flex-1 bg-transparent text-sm text-[var(--text-secondary)] focus:outline-none !border-none !shadow-none !ring-0 !rounded-none" />
                                    <button onClick={copy} className="p-1.5 hover:bg-[var(--border-color)]"><Copy size={16} className="text-[var(--accent)]" /></button>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-[var(--text-primary)] mb-3">Share link via</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => openShare('facebook')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <Facebook size={18} className="text-[var(--accent)]" /> <span>Facebook post</span>
                                    </button>
                                    <button onClick={() => openShare('whatsapp')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <MessageSquare size={18} className="text-[var(--accent)]" /> <span>Whatsapp</span>
                                    </button>
                                    <button onClick={() => openShare('linkedin')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <Linkedin size={18} className="text-[var(--accent)]" /> <span>Linkedin post</span>
                                    </button>
                                    <button onClick={() => openShare('telegram')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <MessageSquare size={18} className="text-[var(--accent)]" /> <span>Telegram</span>
                                    </button>
                                    <button onClick={() => openShare('twitter')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <Twitter size={18} /> <span>X (formerly Twitter)</span>
                                    </button>
                                    <button onClick={() => openShare('instagram')} className="flex items-center gap-2 p-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                        <Instagram size={18} className="text-[var(--accent)]" /> <span>Instagram</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
