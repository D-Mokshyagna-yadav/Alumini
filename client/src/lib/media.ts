export const resolveMediaUrl = (p?: string | null) => {
    if (!p) return '';
    try {
        if (p.startsWith('data:') || p.startsWith('blob:')) return p;
        // If it's a full URL containing /uploads/, extract just the path
        // so it goes through Vite proxy and works on any network
        if (p.startsWith('http')) {
            try {
                const url = new URL(p);
                if (url.pathname.includes('/uploads')) return url.pathname;
            } catch { /* fall through */ }
            return p;
        }
    } catch (e) { }
    // Ensure path starts with / so it's relative to origin
    if (!p.startsWith('/')) p = '/' + p;
    return p;
};

export default resolveMediaUrl;
