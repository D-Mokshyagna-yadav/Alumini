import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
// Removed Google sign-in

const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate('/feed');
            } else {
                if (result.message.includes('pending')) {
                    navigate('/verification-pending');
                    return;
                }
                setError(result.message);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password');
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-[var(--text-muted)]/8 to-[var(--text-muted)]/4 blur-[100px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -30, 0],
                        y: [0, 30, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                    className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-[var(--text-muted)]/6 blur-[80px] rounded-full"
                />
            </div>

            {/* Header */}
            <header className="relative z-10 py-6 px-6">
                <Link to="/" className="flex items-center gap-3 group w-fit">
                    <motion.div
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center"
                    >
                        <GraduationCap size={22} className="text-[var(--bg-primary)]" />
                    </motion.div>
                    <span className="text-xl font-bold text-[var(--text-primary)]">Alumni Network</span>
                </Link>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
                <div className="w-full max-w-[400px] sm:max-w-[440px]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-6 sm:mb-8"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--accent)]/8 text-[var(--accent)] text-xs sm:text-sm font-medium mb-3 sm:mb-4 rounded-full border border-[var(--border-color)]/40"
                        >
                            <Sparkles size={14} className="sm:w-4 sm:h-4" />
                            Welcome Back
                        </motion.div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">Sign In</h1>
                        <p className="text-sm sm:text-base text-[var(--text-secondary)]">Connect with your alma mater community</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative"
                    >
                        <div className="relative bg-[var(--bg-secondary)]/60 backdrop-blur-xl p-6 sm:p-8 border border-[var(--border-color)]/30 rounded-2xl shadow-sm">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 p-3 sm:p-4 mb-4 sm:mb-6 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm rounded-xl"
                                >
                                    <AlertCircle size={16} className="flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                                <div>
                                    <label className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-1.5 sm:mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/40 transition-all text-sm sm:text-base"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] mb-1.5 sm:mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 pr-11 sm:pr-12 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/40 transition-all text-sm sm:text-base"
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1"
                                        >
                                            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[var(--border-color)] rounded-[5px] peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)] transition-all flex items-center justify-center">
                                                {rememberMe && (
                                                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--bg-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs sm:text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Remember me</span>
                                    </label>
                                    <button type="button" className="text-xs sm:text-sm text-[var(--accent)] font-semibold hover:underline">
                                        Forgot password?
                                    </button>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 sm:py-3.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                                        </>
                                    )}
                                </motion.button>
                            </form>


                        </div>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mt-8 text-[var(--text-secondary)]"
                    >
                        New to the Alumni Network?{' '}
                        <Link to="/register" className="text-[var(--text-primary)] font-semibold hover:underline">
                            Create an account
                        </Link>
                    </motion.p>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center text-sm text-[var(--text-muted)]">
                <div className="flex items-center justify-center gap-6 flex-wrap">
                    <span>© 2026 Alumni Network</span>
                    <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</a>
                    <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Terms</a>
                    <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Help</a>
                </div>
            </footer>
        </div>
    );
};

export default Login;
