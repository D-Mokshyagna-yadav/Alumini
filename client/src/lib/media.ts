export const resolveMediaUrl = (p?: string | null) => {
    if (!p) return '';
    try {
        if (p.startsWith('data:') || p.startsWith('blob:')) return p;
        // If it's a full URL containing /uploads/, extract just the path
        if (p.startsWith('http')) {
            try {
                const url = new URL(p);
                if (url.pathname.includes('/uploads')) {
                    // Ensure path uses /api/uploads/ prefix
                    const path = url.pathname;
                    if (!path.startsWith('/api/uploads/')) {
                        return path.replace(/\/uploads\//, '/api/uploads/');
                    }
                    return path;
                }
            } catch { /* fall through */ }
            return p;
        }
    } catch (e) { }
    // Ensure path starts with / so it's relative to origin
    if (!p.startsWith('/')) p = '/' + p;
    // Migrate legacy /uploads/ paths to /api/uploads/
    if (p.startsWith('/uploads/')) {
        return '/api/uploads/' + p.substring('/uploads/'.length);
    }
    return p;
};

export default resolveMediaUrl;
