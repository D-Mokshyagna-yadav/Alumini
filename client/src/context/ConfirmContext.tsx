import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialog(options);
        });
    }, []);

    const handleClose = (result: boolean) => {
        resolveRef.current?.(result);
        resolveRef.current = null;
        setDialog(null);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {dialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                        onClick={() => handleClose(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--bg-secondary)] w-full max-w-[380px] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-color)]/30"
                        >
                            <div className="p-6 pb-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${dialog.danger ? 'bg-red-500/10' : 'bg-[var(--accent)]/10'}`}>
                                        <AlertTriangle size={20} className={dialog.danger ? 'text-red-500' : 'text-[var(--accent)]'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                                            {dialog.title || 'Confirm'}
                                        </h3>
                                        <p className="text-sm text-[var(--text-muted)] mt-1 leading-relaxed">
                                            {dialog.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-5 pt-1">
                                <button
                                    onClick={() => handleClose(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)]/80 hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
                                >
                                    {dialog.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={() => handleClose(true)}
                                    className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                                        dialog.danger
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)]'
                                    }`}
                                >
                                    {dialog.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx.confirm;
};

export default ConfirmContext;
