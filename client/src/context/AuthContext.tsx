import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api, { flushClientCache } from '../lib/api';
import { io, Socket } from 'socket.io-client';

// Configure axios defaults
// using central `api` instance

interface User {
    id: string;
    name: string;
    email: string;
    role: 'alumni' | 'student' | 'admin';
    status: 'pending' | 'active' | 'rejected';
    avatar?: string;
    coverImage?: string;
    graduationYear?: number;
    degree?: string;
    // Profile fields
    headline?: string;
    industry?: string;
    phone?: string;
    currentLocation?: string;
    currentCompany?: string;
    designation?: string;
    bio?: string;
    isMentor?: boolean;
    // Extended profile fields
    experiences?: any[];
    education?: any[];
    skills?: any[];
    linkedinUrl?: string;
    githubUrl?: string;
    websiteUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    // Job preferences
    jobProviderPreference?: 'provider' | 'referrer' | 'not_provider';
    jobSeekerPreference?: 'active' | 'casual' | 'not_interested';
    isVerified?: boolean;
    twoFactorEnabled?: boolean;
    // Privacy settings
    privacySettings?: {
        emailVisibility?: 'everyone' | 'connections' | 'only_me';
        phoneVisibility?: 'everyone' | 'connections' | 'only_me';
        connectionsVisibility?: 'everyone' | 'connections' | 'only_me';
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string; requireOtp?: boolean; require2fa?: boolean; email?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; message: string; autoApproved?: boolean }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    graduationYear: number;
    degree: string;
    rollNumber: string;
    department?: string;
    role: 'alumni' | 'student' | 'teacher';
    designation?: string;
    // LinkedIn-like fields
    headline?: string;
    industry?: string;
    phone?: string;
    currentLocation?: string;
    currentCompany?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await api.get('/auth/check');
            const u = res.data.user;
            setUser(u ? { ...u, id: u.id || u._id } : null);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // Setup a shared socket to listen for events that should refresh auth state
    useEffect(() => {
        const win = window as any;
        if (!win.__ALUMNI_SOCKET) {
            win.__ALUMNI_SOCKET = io(import.meta.env.VITE_SOCKET_URL || undefined, { withCredentials: true, transports: ['polling', 'websocket'], path: '/socket.io/' });
        }
        const socket: Socket = win.__ALUMNI_SOCKET;

        const onConnect = () => {
            try { if (user?.id) socket.emit('join_user_room', user.id); } catch (e) { }
        };

        socket.on('connect', onConnect);
        socket.on('connection:accepted', () => { checkAuth().catch(() => {}); });
        socket.on('connection:removed', () => { checkAuth().catch(() => {}); });

        return () => {
            socket.off('connect', onConnect);
            socket.off('connection:accepted');
            socket.off('connection:removed');
        };
    }, [user?.id]);

    const login = async (email: string, password: string) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            // 2FA required — don't set user yet
            if (res.data.require2fa) {
                return {
                    success: false,
                    message: res.data.message,
                    require2fa: true,
                    email: res.data.email,
                };
            }
            setUser(res.data.user);
            return { success: true, message: 'Login successful' };
        } catch (error: any) {
            const data = error.response?.data;
            return {
                success: false,
                message: data?.message || 'Login failed',
                requireOtp: data?.requireOtp,
                require2fa: data?.require2fa,
                email: data?.email,
            };
        }
    };

    const register = async (data: RegisterData) => {
        try {
            const res = await api.post('/auth/register', data);
            return {
                success: true,
                message: res.data.message,
                autoApproved: res.data.autoApproved,
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed',
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            flushClientCache();
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
