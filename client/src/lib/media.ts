// When VITE_API_ORIGIN is set (e.g. "https://api.example.com"), media URLs are
// prefixed so images load from the API server. When empty, paths stay relative
// to the current origin (same-origin / single-instance deployment).
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, '') || '';

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
                        return API_ORIGIN + path.replace(/\/uploads\//, '/api/uploads/');
                    }
                    return API_ORIGIN + path;
                }
            } catch { /* fall through */ }
            return p;
        }
    } catch (e) { }
    // Ensure path starts with / so it's relative to origin
    if (!p.startsWith('/')) p = '/' + p;
    // Migrate legacy /uploads/ paths to /api/uploads/
    if (p.startsWith('/uploads/')) {
        return API_ORIGIN + '/api/uploads/' + p.substring('/uploads/'.length);
    }
    return API_ORIGIN + p;
};

export default resolveMediaUrl;
