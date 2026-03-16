type Listener = (snapshot: UploadProgressSnapshot) => void;

interface UploadTask {
    id: string;
    percent: number;
}

export interface UploadProgressSnapshot {
    activeCount: number;
    averagePercent: number;
    maxPercent: number;
    tasks: UploadTask[];
}

const listeners = new Set<Listener>();
const tasks = new Map<string, number>();

const createSnapshot = (): UploadProgressSnapshot => {
    const list = Array.from(tasks.entries()).map(([id, percent]) => ({ id, percent }));
    if (list.length === 0) {
        return { activeCount: 0, averagePercent: 0, maxPercent: 0, tasks: [] };
    }

    const total = list.reduce((sum, it) => sum + it.percent, 0);
    const max = list.reduce((m, it) => (it.percent > m ? it.percent : m), 0);

    return {
        activeCount: list.length,
        averagePercent: Math.round(total / list.length),
        maxPercent: Math.round(max),
        tasks: list,
    };
};

const emit = () => {
    const snapshot = createSnapshot();
    listeners.forEach((listener) => listener(snapshot));
};

export const uploadProgressStore = {
    subscribe(listener: Listener) {
        listeners.add(listener);
        listener(createSnapshot());
        return () => {
            listeners.delete(listener);
        };
    },
    start(id: string) {
        tasks.set(id, 0);
        emit();
    },
    update(id: string, percent: number) {
        if (!tasks.has(id)) return;
        const clamped = Math.max(0, Math.min(100, Math.round(percent)));
        tasks.set(id, clamped);
        emit();
    },
    finish(id: string) {
        if (!tasks.has(id)) return;
        tasks.set(id, 100);
        emit();
        setTimeout(() => {
            tasks.delete(id);
            emit();
        }, 350);
    },
    fail(id: string) {
        if (!tasks.has(id)) return;
        tasks.delete(id);
        emit();
    },
};
