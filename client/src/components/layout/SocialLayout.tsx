import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Home, Search, Bell, Bookmark, User, Settings,
    PlusSquare, LogOut, Users, Briefcase, Calendar, Newspaper
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SocialLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { icon: Home, label: 'Home', href: '/feed' },
    { icon: Search, label: 'Explore', href: '/directory' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Bookmark, label: 'Saved', href: '/saved' },
    { icon: Calendar, label: 'Events', href: '/events' },
    { icon: Briefcase, label: 'Jobs', href: '/jobs' },
    { icon: Newspaper, label: 'News', href: '/news' },
    { icon: User, label: 'Profile', href: '/profile' },
];

const SocialLayout = ({ children }: SocialLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-transparent flex">
            {/* Left Sidebar - Fixed */}
            <aside className="fixed left-0 top-0 h-screen w-[72px] xl:w-[244px] border-r border-[var(--border-color)] bg-[var(--bg-primary)] z-40 flex flex-col py-6 px-3">
                {/* Logo */}
                <Link to="/feed" className="mb-8 px-3">
                    <div className="flex items-center gap-3">
                        <img src="/logo-small.png" alt="Logo" className="w-10 h-10 object-contain" />
                        <span className="hidden xl:block font-bold text-xl text-[var(--text-primary)]">
                            MIC College of Technology
                        </span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link key={item.label} to={item.href}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex items-center gap-4 px-3 py-3 transition-all duration-200 ${isActive
                                        ? 'bg-[var(--bg-secondary)] font-semibold'
                                        : 'hover:bg-[var(--bg-secondary)]'
                                        }`}
                                >
                                    <item.icon
                                        size={26}
                                        className={isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    <span className={`hidden xl:block text-[15px] ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                                        }`}>
                                        {item.label}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}

                    {/* Create Post Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center gap-4 px-3 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold mt-4"
                    >
                        <PlusSquare size={26} />
                        <span className="hidden xl:block text-[15px]">Create Post</span>
                    </motion.button>
                </nav>

                {/* User Profile & Settings */}
                <div className="border-t border-[var(--border-color)] pt-4 mt-4 space-y-1">
                    {user?.role === 'admin' && (
                        <Link to="/admin">
                            <div className="flex items-center gap-4 px-3 py-3 hover:bg-[var(--bg-secondary)] transition-colors">
                                <Settings size={26} className="text-[var(--accent)]" />
                                <span className="hidden xl:block text-[15px] text-[var(--accent)] font-medium">Admin Panel</span>
                            </div>
                        </Link>
                    )}

                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-4 px-3 py-3 hover:bg-[var(--accent)]/10 transition-colors"
                    >
                        <LogOut size={26} className="text-[var(--text-secondary)]" />
                        <span className="hidden xl:block text-[15px] text-[var(--text-secondary)]">Log out</span>
                    </button>

                    {/* Current User */}
                    <Link to="/profile">
                        <div className="flex items-center gap-3 px-3 py-3 hover:bg-[var(--bg-secondary)] transition-colors mt-2">
                            <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center">
                                <User size={20} className="text-[var(--bg-primary)]" />
                            </div>
                            <div className="hidden xl:block">
                                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                                    {user?.name || 'User'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">@{user?.email?.split('@')[0]}</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-[72px] xl:ml-[244px]">
                {children}
            </main>
        </div>
    );
};

export default SocialLayout;
