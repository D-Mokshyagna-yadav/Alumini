import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, ShieldCheck, ArrowLeft, RefreshCw, Mail } from 'lucide-react';
import api from '../lib/api';

type LoginMode = 'password' | 'otp-request' | 'otp-verify' | '2fa';

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

    // Login mode state
    const [mode, setMode] = useState<LoginMode>('password');
    const [otpEmail, setOtpEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // Auto-focus first OTP box when OTP mode appears
    useEffect(() => {
        if (mode === '2fa' || mode === 'otp-verify') {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [mode]);

    const handleOtpChange = useCallback((index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const d = [...otpDigits];
        d[index] = value.slice(-1);
        setOtpDigits(d);
        setError('');
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    }, [otpDigits]);

    const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    }, [otpDigits]);

    const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const d = [...otpDigits];
        for (let i = 0; i < 6; i++) d[i] = pasted[i] || '';
        setOtpDigits(d);
        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }, [otpDigits]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const resetOtpState = () => {
        setOtpDigits(['', '', '', '', '', '']);
        setError('');
        setResendCooldown(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate('/feed');
            } else {
                if (result.require2fa) {
                    setOtpEmail(result.email || formData.email);
                    setResendCooldown(60);
                    resetOtpState();
                    setResendCooldown(60);
                    setMode('2fa');
                    return;
                }
                if (result.requireOtp) {
                    navigate('/register', { state: { otpEmail: result.email } });
                    return;
                }
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

    /* Send OTP for passwordless login */
    const handleRequestOtpLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = formData.email.trim();
        if (!email) { setError('Please enter your email address.'); return; }
        setIsSendingOtp(true);
        setError('');
        try {
            const res = await api.post('/auth/otp-login', { email });
            setOtpEmail(res.data.email || email);
            resetOtpState();
            setResendCooldown(60);
            setMode('otp-verify');
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.requireOtp) {
                navigate('/register', { state: { otpEmail: data.email } });
                return;
            }
            if (data?.message?.includes('pending')) {
                navigate('/verification-pending');
                return;
            }
            setError(data?.message || 'Failed to send OTP.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    /* Verify OTP (used by both 2FA and OTP-login) */
    const handleVerifyOtp = async () => {
        const otp = otpDigits.join('');
        if (otp.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
        setIsVerifying(true);
        setError('');
        try {
            await api.post('/auth/verify-2fa', { email: otpEmail, otp });
            window.location.href = '/feed';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setIsVerifying(false);
        }
    };

    /* Resend OTP for 2FA or OTP-login */
    const handleResendOtp = async () => {
        try {
            if (mode === '2fa') {
                // Re-trigger password login to resend 2FA OTP
                await login(formData.email, formData.password);
            } else {
                // Re-request OTP login
                await api.post('/auth/otp-login', { email: otpEmail });
            }
            setResendCooldown(60);
            setOtpDigits(['', '', '', '', '', '']);
            setError('');
        } catch {
            setError('Failed to resend code.');
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
                    >
                        <img src="/logo-small.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
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

                            {(mode === '2fa' || mode === 'otp-verify') ? (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${mode === '2fa' ? 'bg-[var(--accent)]/10' : 'bg-emerald-500/10'}`}>
                                            {mode === '2fa'
                                                ? <ShieldCheck size={28} className="text-[var(--accent)]" />
                                                : <Mail size={28} className="text-emerald-500" />}
                                        </div>
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                                            {mode === '2fa' ? 'Two-Step Verification' : 'OTP Verification'}
                                        </h2>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Enter the 6-digit code sent to<br />
                                            <span className="text-[var(--text-primary)] font-medium">{otpEmail}</span>
                                        </p>
                                    </div>

                                    <div className="flex justify-center gap-1.5 sm:gap-2">
                                        {otpDigits.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => { otpRefs.current[i] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={digit}
                                                onPaste={handleOtpPaste}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val.length > 1) {
                                                        const chars = val.slice(0, 6).split('');
                                                        const d = ['', '', '', '', '', ''];
                                                        chars.forEach((c, ci) => { d[ci] = c; });
                                                        setOtpDigits(d);
                                                        otpRefs.current[Math.min(chars.length, 5)]?.focus();
                                                        setError('');
                                                    } else {
                                                        handleOtpChange(i, val);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    handleOtpKeyDown(i, e);
                                                    if (e.key === 'Enter' && otpDigits.join('').length === 6) handleVerifyOtp();
                                                }}
                                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all"
                                            />
                                        ))}
                                    </div>

                                    <motion.button
                                        onClick={handleVerifyOtp}
                                        disabled={isVerifying || otpDigits.join('').length !== 6}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-3 sm:py-3.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        {isVerifying
                                            ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                            : <>{mode === '2fa' ? 'Verify & Sign In' : 'Sign In'} <ArrowRight size={16} /></>}
                                    </motion.button>

                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => { setMode('password'); resetOtpState(); }}
                                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                                        >
                                            <ArrowLeft size={14} /> Back
                                        </button>
                                        <button
                                            disabled={resendCooldown > 0}
                                            onClick={handleResendOtp}
                                            className="text-sm text-[var(--accent)] font-medium hover:underline disabled:text-[var(--text-muted)] disabled:no-underline inline-flex items-center gap-1"
                                        >
                                            <RefreshCw size={14} />
                                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                        </button>
                                    </div>
                                </div>
                            ) : mode === 'otp-request' ? (
                                <form onSubmit={handleRequestOtpLogin} className="space-y-4 sm:space-y-5">
                                    <div className="text-center mb-2">
                                        <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                            <Mail size={28} className="text-emerald-500" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Login with OTP</h2>
                                        <p className="text-sm text-[var(--text-muted)]">We'll send a verification code to your email</p>
                                    </div>

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

                                    <motion.button
                                        type="submit"
                                        disabled={isSendingOtp}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-3 sm:py-3.5 bg-[var(--accent)] text-[var(--bg-primary)] font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                                    >
                                        {isSendingOtp ? (
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Send OTP
                                                <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                                            </>
                                        )}
                                    </motion.button>

                                    <button
                                        type="button"
                                        onClick={() => { setMode('password'); setError(''); }}
                                        className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeft size={14} /> Back to password login
                                    </button>
                                </form>
                            ) : (
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
                                    <Link to="/forgot-password" className="text-xs sm:text-sm text-[var(--accent)] font-semibold hover:underline">
                                        Forgot password?
                                    </Link>
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

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-[var(--border-color)]/40" />
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">or</span>
                                    <div className="flex-1 h-px bg-[var(--border-color)]/40" />
                                </div>

                                {/* OTP Login Button */}
                                <motion.button
                                    type="button"
                                    onClick={() => { setMode('otp-request'); setError(''); }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 sm:py-3.5 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/40 text-[var(--text-primary)] font-semibold rounded-xl hover:bg-[var(--bg-tertiary)] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                                >
                                    <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    Login with OTP
                                </motion.button>
                            </form>
                            )}

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
