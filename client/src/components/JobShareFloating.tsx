import React from 'react';
import { Facebook, Linkedin, MessageSquare, Copy, MoreHorizontal } from 'lucide-react';

export default function JobShareFloating({ url }: { url: string }) {
    if (!url) return null;

    const openShare = (channel: string) => {
        const encoded = encodeURIComponent(url);
        let shareUrl = url;
        switch (channel) {
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`; break;
            case 'linkedin': shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`; break;
            case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${encoded}`; break;
            case 'copy':
                navigator.clipboard.writeText(url).catch(() => null);
                break;
            default: shareUrl = url;
        }

        if (channel !== 'copy') window.open(shareUrl, '_blank', 'noopener');

        // fire telemetry async
        fetch('/api/telemetry/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resourceType: 'job', action: channel, url }) }).catch(() => null);
    };

    return (
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-3">
            <button onClick={() => openShare('facebook')} title="Share on Facebook" className="w-10 h-10 bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center shadow"> <Facebook size={18} /></button>
            <button onClick={() => openShare('whatsapp')} title="Share on WhatsApp" className="w-10 h-10 bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center shadow"> <MessageSquare size={18} /></button>
            <button onClick={() => openShare('linkedin')} title="Share on LinkedIn" className="w-10 h-10 bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center shadow"> <Linkedin size={18} /></button>
            <button onClick={() => openShare('copy')} title="Copy link" className="w-10 h-10 bg-[var(--bg-secondary)] text-[var(--text-primary)] flex items-center justify-center border border-[var(--border-color)] shadow"> <Copy size={18} /></button>
            <button onClick={() => openShare('more')} title="More" className="w-10 h-10 bg-[var(--bg-secondary)] text-[var(--text-primary)] flex items-center justify-center border border-[var(--border-color)] shadow"> <MoreHorizontal size={18} /></button>
        </div>
    );
}
