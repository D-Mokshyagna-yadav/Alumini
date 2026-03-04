import React, { createContext, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: string; message: string; type: ToastType };

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void } | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const show = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2);
        const t: ToastItem = { id, message, type };
        setToasts((s) => [t, ...s]);
        // Auto-dismiss
        setTimeout(() => setToasts((s) => s.filter(tt => tt.id !== id)), 4500);
    };

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={`max-w-sm w-full px-4 py-2 shadow-lg text-sm rounded-xl backdrop-blur-xl border border-[var(--border-color)]/30 ${t.type === 'success' ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

export default ToastContext;
