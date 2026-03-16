import { useEffect, useState } from 'react';
import { uploadProgressStore, type UploadProgressSnapshot } from '../lib/uploadProgress';

const initialSnapshot: UploadProgressSnapshot = {
    activeCount: 0,
    averagePercent: 0,
    maxPercent: 0,
    tasks: [],
};

const UploadProgressToast = () => {
    const [snapshot, setSnapshot] = useState<UploadProgressSnapshot>(initialSnapshot);

    useEffect(() => {
        return uploadProgressStore.subscribe(setSnapshot);
    }, []);

    if (snapshot.activeCount === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-[120] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 px-3 py-2 shadow-lg backdrop-blur sm:bottom-6 sm:w-[92%]">
            <div className="mb-2 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-[var(--text-primary)]">
                    Uploading {snapshot.activeCount > 1 ? `${snapshot.activeCount} files` : 'file'}
                </span>
                <span className="font-semibold text-[var(--accent)]">{snapshot.averagePercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                    className="h-full bg-[var(--accent)] transition-[width] duration-200"
                    style={{ width: `${snapshot.averagePercent}%` }}
                />
            </div>
        </div>
    );
};

export default UploadProgressToast;
