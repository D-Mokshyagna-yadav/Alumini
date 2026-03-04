// Lightweight no-op branding provider and hook.
// We keep this file as a compatibility shim so existing imports won't break.
import type { ReactNode } from 'react';

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
    return <>{children}</>;
};

export const useBranding = () => {
    return {
        branding: {},
        isLoading: false,
        refresh: async () => {},
    } as const;
};
