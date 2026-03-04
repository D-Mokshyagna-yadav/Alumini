export const resolveMediaUrl = (p?: string | null) => {
    if (!p) return '';
    try {
        if (p.startsWith('http') || p.startsWith('data:')) return p;
    } catch (e) { }
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    return `${baseUrl}${p}`;
};

export default resolveMediaUrl;
