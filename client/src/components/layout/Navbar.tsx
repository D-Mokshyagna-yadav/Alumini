/* eslint-disable react-hooks/refs */
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Menu, X, GraduationCap, Sun, Moon, LogOut, Bell,
    Home, Rss, Users, Briefcase, Calendar, Image,
    Settings, Shield, ChevronDown, Bookmark, Code2, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../ui/Avatar';
import { io, Socket } from 'socket.io-client';
import api from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const guestLinks: { name: string; href: string; icon: typeof Home }[] = [];

const authLinks = [
    { name: 'Home', href: '/feed', icon: Home },
    { name: 'Network', href: '/directory', icon: Users },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Gallery', href: '/gallery', icon: Image },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
];

const mobileAuthLinks = [
    { name: 'Home', href: '/feed', icon: Home },
    { name: 'Network', href: '/directory', icon: Users },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Alerts', href: '/notifications', icon: Bell },
];

const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { theme, mode, toggleTheme } = useTheme();
    const { user, isAuthenticated, logout } = useAuth();
    const location = useLocation();
    const [branding, setBranding] = useState<{ name?: string }>({});

    useEffect(() => {
        let mounted = true;
        api.get('/public/branding').then(res => {
            if (mounted) setBranding(res.data.branding || {});
        }).catch(() => {});
        return () => { mounted = false; };
    }, []);

    // Adjust state based on route changes (during render, not in effect)
    const prevPathRef = useRef(location.pathname);
    if (prevPathRef.current !== location.pathname) {
        prevPathRef.current = location.pathname;
        setMobileOpen(false);
        setProfileOpen(false);
        if (location.pathname === '/notifications') setUnreadCount(0);
    }

    // Fetch unread notification count & listen for real-time updates
    useEffect(() => {
        if (!isAuthenticated) return;
        let mounted = true;

        // Fetch initial count
        api.get('/notifications').then(res => {
            if (!mounted) return;
            const notifs = res.data.notifications || [];
            setUnreadCount(notifs.filter((n: { read: boolean }) => !n.read).length);
        }).catch(() => {});

        // Listen for real-time notifications via socket
        const apiOrigin = import.meta.env.VITE_API_ORIGIN || '';
        const base = apiOrigin || '';
        const win = window as Window & { __ALUMNI_SOCKET?: Socket };
        if (!win.__ALUMNI_SOCKET) {
            win.__ALUMNI_SOCKET = io(base || window.location.origin, { withCredentials: true });
        }
        const socket: Socket = win.__ALUMNI_SOCKET;

        const onNotification = () => {
            if (mounted) setUnreadCount(prev => prev + 1);
        };
        socket.on('notification', onNotification);

        return () => {
            mounted = false;
            socket.off('notification', onNotification);
        };
    }, [isAuthenticated]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleLogout = async () => {
        await logout();
        setMobileOpen(false);
        setProfileOpen(false);
    };

    const isActive = (href: string) => location.pathname === href || (href !== '/' && location.pathname.startsWith(href));

    const links = isAuthenticated ? authLinks : guestLinks;

    return (
        <>
            {/* ─── Top Header Bar ─── */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)]/30">
                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">

                    {/* Logo */}
                    <Link to={isAuthenticated ? '/feed' : '/'} className="flex items-center gap-2.5 shrink-0">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-9 h-9 bg-[var(--accent)] rounded-xl flex items-center justify-center shadow-sm shadow-[var(--accent)]/20"
                        >
                            <GraduationCap size={20} className="text-[var(--bg-primary)]" />
                        </motion.div>
                        <span className="hidden sm:block font-bold text-sm text-[var(--text-primary)] tracking-tight">
                            MIC Alumni
                        </span>
                    </Link>

                    {/* ─── Desktop Navigation (center) ─── */}
                    <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
                        {links.map(({ name, href, icon: Icon }) => {
                            const active = isActive(href);
                            return (
                                <Link key={name} to={href}
                                    className={`relative flex flex-col items-center px-3 lg:px-4 py-1.5 rounded-xl transition-all group ${
                                        active
                                            ? 'text-[var(--accent)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                    }`}
                                >
                                    <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                                    <span className="text-[10px] mt-0.5 font-medium">{name}</span>
                                    {active && (
                                        <motion.div
                                            layoutId="nav-underline"
                                            className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--accent)]"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* ─── Right Side Actions ─── */}
                    <div className="hidden md:flex items-center gap-1.5">
                        {/* Theme Toggle */}
                        <button onClick={toggleTheme}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-all"
                            aria-label="Toggle theme"
                        >
                            {mode === 'auto' ? (
                                <span className="w-4 h-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[9px] font-bold rounded flex items-center justify-center">A</span>
                            ) : theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        {isAuthenticated ? (
                            <>
                                {/* Notifications */}
                                <Link to="/notifications"
                                    className={`relative w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                                        isActive('/notifications')
                                            ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                    }`}
                                >
                                    <Bell size={16} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[var(--accent)] text-[var(--bg-primary)] text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Saved */}
                                <Link to="/saved"
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                                        isActive('/saved')
                                            ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                    }`}
                                >
                                    <Bookmark size={16} />
                                </Link>

                                 {/* Contact Link */}
                                <Link to="/contact"
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-xl transition-all ${
                                        isActive('/contact')
                                            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                    }`}
                                >
                                    <Mail size={14} />
                                </Link>

                                {/* Admin Link (visible for admins) */}
                                {user?.role === 'admin' && (
                                    <Link to="/admin"
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-xl transition-all ${
                                            isActive('/admin')
                                                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                        }`}
                                    >
                                        <Shield size={14} />
                                        Admin
                                    </Link>
                                )}

                                <div className="w-px h-5 bg-[var(--border-color)]/40 mx-0.5" />

                                {/* Profile Dropdown */}
                                <div className="relative">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setProfileOpen(!profileOpen)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded-xl transition-all ${
                                            profileOpen ? 'bg-[var(--bg-tertiary)]/80' : 'hover:bg-[var(--bg-tertiary)]/60'
                                        }`}
                                    >
                                        <div className="w-7 h-7 bg-[var(--accent)] rounded-full flex items-center justify-center shrink-0 ring-2 ring-[var(--accent)]/20 ring-offset-1 ring-offset-[var(--bg-primary)] overflow-hidden">
                                            <Avatar src={user?.avatar} iconSize={14} />
                                        </div>
                                        <span className="text-[13px] font-medium text-[var(--text-primary)] max-w-[80px] truncate">{user?.name?.split(' ')[0]}</span>
                                        <ChevronDown size={13} className={`text-[var(--text-muted)] transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                                    </motion.button>

                                    <AnimatePresence>
                                        {profileOpen && (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setProfileOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                                    className="absolute right-0 top-full mt-2 w-[280px] bg-[var(--bg-secondary)]/95 backdrop-blur-xl shadow-xl rounded-2xl border border-[var(--border-color)]/30 overflow-hidden z-50"
                                                >
                                                    {/* Profile header */}
                                                    <div className="p-4 bg-gradient-to-br from-[var(--accent)]/10 to-transparent border-b border-[var(--border-color)]/20">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full ring-3 ring-[var(--accent)]/20 bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                                                                <Avatar src={user?.avatar} iconSize={20} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-[var(--text-primary)] truncate">{user?.name}</p>
                                                                <p className="text-xs text-[var(--text-muted)]">Class of {user?.graduationYear || '—'}</p>
                                                            </div>
                                                        </div>
                                                        <Link
                                                            to="/profile"
                                                            onClick={() => setProfileOpen(false)}
                                                            className="block mt-3 w-full py-2 text-center text-sm font-semibold text-[var(--bg-primary)] bg-[var(--accent)] rounded-xl hover:shadow-sm hover:shadow-[var(--accent)]/25 transition-all"
                                                        >
                                                            View Profile
                                                        </Link>
                                                    </div>

                                                    {/* Menu items */}
                                                    <div className="py-1.5">
                                                        <Link to="/settings" onClick={() => setProfileOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)]/60 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center">
                                                                <Settings size={16} className="text-[var(--text-secondary)]" />
                                                            </div>
                                                            <span className="text-sm font-medium text-[var(--text-secondary)]">Settings & Privacy</span>
                                                        </Link>
                                                        <button onClick={handleLogout}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-tertiary)]/60 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center">
                                                                <LogOut size={16} className="text-[var(--text-secondary)]" />
                                                            </div>
                                                            <span className="text-sm font-medium text-[var(--text-secondary)]">Sign Out</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-3 py-1.5 text-[13px] font-medium rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-all">
                                    Sign In
                                </Link>
                                <Link to="/register" className="px-4 py-1.5 text-[13px] font-semibold rounded-full bg-[var(--accent)] text-[var(--bg-primary)] hover:shadow-md hover:shadow-[var(--accent)]/25 transition-all">
                                    Join Network
                                </Link>
                            </>
                        )}
                    </div>

                    {/* ─── Mobile Controls ─── */}
                    <div className="flex md:hidden items-center gap-1.5">
                        <button onClick={toggleTheme}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/60 transition-all"
                            aria-label="Toggle theme"
                        >
                            {mode === 'auto' ? (
                                <span className="w-4 h-4 bg-[var(--accent)] text-[var(--bg-primary)] text-[9px] font-bold rounded flex items-center justify-center">A</span>
                            ) : theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <button onClick={() => setMobileOpen(!mobileOpen)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-all"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ─── Mobile Slide-out Menu ─── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-[280px] max-w-[85vw] bg-[var(--bg-primary)] z-50 md:hidden overflow-y-auto rounded-l-2xl"
                        >
                            {/* Mobile header */}
                            <div className="p-4 border-b border-[var(--border-color)]">
                                {isAuthenticated ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full ring-2 ring-[var(--accent)]/30 bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                                            <Avatar src={user?.avatar} iconSize={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[var(--text-primary)] truncate">{user?.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Class of {user?.graduationYear || '—'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Welcome to Alumni Network</p>
                                        <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors">Sign In</Link>
                                        <Link to="/register" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 text-sm font-semibold bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl">Join Network</Link>
                                    </div>
                                )}
                            </div>

                            {/* Mobile nav links */}
                            <nav className="p-2">
                                {(isAuthenticated
                                    ? [...authLinks, { name: 'Alerts', href: '/notifications', icon: Bell }, { name: 'Saved', href: '/saved', icon: Bookmark }]
                                    : guestLinks
                                ).map(({ name, href, icon: Icon }) => {
                                    const active = isActive(href);
                                    return (
                                        <Link key={name} to={href} onClick={() => setMobileOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 mb-0.5 rounded-xl transition-all ${
                                                active
                                                    ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60'
                                            }`}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium">{name}</span>
                                        </Link>
                                    );
                                })}

                                {/* Divider + extra actions */}
                                <div className="border-t border-[var(--border-color)] my-2 pt-2">
                                    {isAuthenticated ? (
                                        <>
                                            <Link to="/developers" onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                                            >
                                                <Code2 size={20} className="text-[var(--text-secondary)]" />
                                                <span className="font-medium">Developers</span>
                                            </Link>

                                            <Link to="/contact" onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                                            >
                                                <Mail size={20} className="text-[var(--text-secondary)]" />
                                                <span className="font-medium">Contact</span>
                                            </Link>

                                            <Link to="/profile" onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                                            >
                                                <div className="w-5 h-5 bg-[var(--accent)]/20 rounded-full flex items-center justify-center overflow-hidden">
                                                    <Avatar src={user?.avatar} iconSize={12} iconClassName="text-[var(--accent)]" />
                                                </div>
                                                <span className="font-medium">View Profile</span>
                                            </Link>

                                            {user?.role === 'admin' && (
                                                <Link to="/admin" onClick={() => setMobileOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                                                >
                                                    <Shield size={20} className="text-[var(--text-secondary)]" />
                                                    <span className="font-medium">Admin Dashboard</span>
                                                </Link>
                                            )}

                                            <Link to="/settings" onClick={() => setMobileOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60"
                                            >
                                                <Settings size={20} />
                                                <span className="font-medium">Settings</span>
                                            </Link>

                                            <button onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/60"
                                            >
                                                <LogOut size={20} />
                                                <span className="font-medium">Sign Out</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                                                <span className="font-medium">Sign In</span>
                                            </Link>
                                            <Link to="/register" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[var(--accent)] hover:bg-[var(--bg-tertiary)]">
                                                <span className="font-medium">Join Network</span>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ─── Mobile Bottom Tab Bar (authenticated only) ─── */}
            {isAuthenticated && (
                <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-color)]/30 safe-area-inset-bottom">
                    <div className="flex justify-around items-center h-14 px-2">
                        {mobileAuthLinks.map(({ name, href, icon: Icon }) => {
                            const active = isActive(href);
                            return (
                                <Link key={name} to={href}
                                    className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors relative ${
                                        active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                    }`}
                                >
                                    <div className="relative">
                                        <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                                        {name === 'Alerts' && unreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 bg-[var(--accent)] text-[var(--bg-primary)] text-[9px] font-bold rounded-full flex items-center justify-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] mt-0.5 font-medium">{name}</span>
                                    {active && (
                                        <motion.div
                                            layoutId="mobile-nav-indicator"
                                            className="absolute bottom-0 w-8 h-0.5 bg-[var(--accent)]"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            )}
        </>
    );
};

export default Navbar;
