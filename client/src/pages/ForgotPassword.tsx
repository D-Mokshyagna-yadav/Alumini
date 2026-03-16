import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, AlertCircle, Mail, RefreshCw, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';

type Step = 'email' | 'otp' | 'password' | 'done';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const resendOtpLockRef = useRef(false);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleOtpChange = useCallback((index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newDigits = [...otpDigits];
        newDigits[index] = value.slice(-1);
        setOtpDigits(newDigits);
        setError('');
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    }, [otpDigits]);

    const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpDigits]);

    const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
        setOtpDigits(newDigits);
        const nextEmpty = pasted.length >= 6 ? 5 : pasted.length;
        otpRefs.current[nextEmpty]?.focus();
    }, [otpDigits]);

    /* Step 1: Request OTP */
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!email) { setError('Please enter your email.'); return; }
        setIsSubmitting(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setResendCooldown(60);
            setCurrentStep('otp');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* Step 2 + 3: Verify OTP & reset password in one call */
    const handleResetPassword = async () => {
        if (isSubmitting) return;
        const otp = otpDigits.join('');
        if (otp.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
        if (!newPassword) { setError('Please enter a new password.'); return; }
        if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

        setIsSubmitting(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { email, otp, newPassword });
            setCurrentStep('done');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resendOtpLockRef.current || isResendingOtp) return;
        resendOtpLockRef.current = true;
        setIsResendingOtp(true);
        try {
            await api.post('/auth/resend-otp', { email, type: 'reset' });
            setResendCooldown(60);
            setOtpDigits(['', '', '', '', '', '']);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP.');
        } finally {
            setIsResendingOtp(false);
            resendOtpLockRef.current = false;
        }
    };

    const inputClass = "w-full px-4 py-3 bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/40 transition-all";

    return (
        <div className="min-h-screen bg-transparent flex flex-col">
            <header className="py-4 px-6">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo-small.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
                    <span className="text-xl font-bold text-[var(--text-primary)]">MIC College of Technology</span>
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-[440px]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl shadow-sm p-6 sm:p-8 border border-[var(--border-color)]/30 rounded-2xl"
                    >
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl"
                            >
                                <AlertCircle size={18} className="flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}

                        {/* ─── Step 1: Enter email ─── */}
                        {currentStep === 'email' && (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div className="text-center mb-2">
                                    <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
                                        <Lock size={28} className="text-[var(--accent)]" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Forgot Password?</h1>
                                    <p className="text-sm text-[var(--text-muted)]">Enter your email and we'll send you a verification code.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                        required
                                        className={inputClass}
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting
                                        ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                        : <>Send OTP <ArrowRight size={18} /></>}
                                </button>
                                <p className="text-center text-sm text-[var(--text-secondary)]">
                                    <Link to="/login" className="text-[var(--text-primary)] font-semibold hover:underline inline-flex items-center gap-1">
                                        <ArrowLeft size={14} /> Back to Sign In
                                    </Link>
                                </p>
                            </form>
                        )}

                        {/* ─── Step 2: Enter OTP + new password ─── */}
                        {currentStep === 'otp' && (
                            <div className="space-y-5">
                                <div className="text-center">
                                    <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
                                        <Mail size={28} className="text-[var(--accent)]" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Reset Your Password</h2>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Enter the 6-digit code sent to<br />
                                        <span className="text-[var(--text-primary)] font-medium">{email}</span>
                                    </p>
                                </div>

                                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                                    {otpDigits.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-xl font-bold bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]/40 transition-all"
                                        />
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                            className={`${inputClass} pr-12`}
                                            placeholder="Min 6 characters"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                        className={inputClass}
                                        placeholder="Re-enter password"
                                    />
                                </div>

                                <button
                                    onClick={handleResetPassword}
                                    disabled={isSubmitting || otpDigits.join('').length !== 6}
                                    className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting
                                        ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                        : <>Reset Password <ArrowRight size={18} /></>}
                                </button>

                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => { setCurrentStep('email'); setOtpDigits(['', '', '', '', '', '']); setError(''); }}
                                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                                    >
                                        <ArrowLeft size={14} /> Change email
                                    </button>
                                    <button
                                        disabled={resendCooldown > 0 || isResendingOtp}
                                        onClick={handleResendOtp}
                                        className="text-sm text-[var(--accent)] font-medium hover:underline disabled:text-[var(--text-muted)] disabled:no-underline inline-flex items-center gap-1"
                                    >
                                        <RefreshCw size={14} className={isResendingOtp ? 'animate-spin' : ''} />
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : isResendingOtp ? 'Resending...' : 'Resend Code'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── Step 3: Success ─── */}
                        {currentStep === 'done' && (
                            <div className="text-center space-y-5">
                                <div className="w-16 h-16 mx-auto mb-2 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle size={32} className="text-green-500" />
                                </div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Password Reset Successful</h2>
                                <p className="text-sm text-[var(--text-muted)]">Your password has been updated. You can now sign in with your new password.</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    Go to Sign In <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>

            <footer className="py-4 text-center text-xs text-[var(--text-muted)]">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    <span>MIC College of Technology Alumni Association © 2026</span>
                    <a href="#" className="hover:text-[var(--text-secondary)]">Privacy Policy</a>
                    <a href="#" className="hover:text-[var(--text-secondary)]">Terms of Service</a>
                </div>
            </footer>
        </div>
    );
};

export default ForgotPassword;
