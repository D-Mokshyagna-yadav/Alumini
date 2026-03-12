import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    /** The underlying Socket.io client instance (or null before connection). */
    socket: Socket | null;
    /** Subscribe to an event. Returns an unsubscribe function. */
    on: (event: string, handler: (...args: any[]) => void) => () => void;
    /** Emit an event to the server. */
    emit: (event: string, ...args: any[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    // Initialise socket once (reuses the global singleton for backward compat)
    useEffect(() => {
        const win = window as any;

        if (!win.__ALUMNI_SOCKET) {
            win.__ALUMNI_SOCKET = io(import.meta.env.VITE_SOCKET_URL || undefined, {
                withCredentials: true,
                transports: ['polling', 'websocket'],
                path: '/socket.io/',
            });
        }

        socketRef.current = win.__ALUMNI_SOCKET;

        return () => {
            // Don't disconnect on unmount — other code may still hold a reference.
            // The connection lives for the lifetime of the tab.
        };
    }, []);

    // Join user room whenever the authenticated user changes
    useEffect(() => {
        const s = socketRef.current;
        if (!s || !user?.id) return;

        const joinRoom = () => {
            s.emit('join_user_room', user.id);
        };

        // Join immediately if already connected
        if (s.connected) joinRoom();
        // Also join on (re)connect
        s.on('connect', joinRoom);

        return () => {
            s.off('connect', joinRoom);
        };
    }, [user?.id]);

    const on = useCallback((event: string, handler: (...args: any[]) => void) => {
        const s = socketRef.current;
        s?.on(event, handler);
        return () => {
            s?.off(event, handler);
        };
    }, []);

    const emit = useCallback((event: string, ...args: any[]) => {
        socketRef.current?.emit(event, ...args);
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, on, emit }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = (): SocketContextType => {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
    return ctx;
};
