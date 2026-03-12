import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, AlertCircle, Check, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { CountryStateSelector, formatLocation } from '../components/ui/CountryStateSelector';
import api from '../lib/api';

const industries = [
    'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
    'Consulting', 'Retail', 'Government', 'Media & Entertainment', 'Energy',
    'Automotive', 'Real Estate', 'Telecommunications', 'Other'
];

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, isLoading } = useAuth();

    // If redirected from login with unverified email, pre-fill & jump to OTP
    const incomingOtpEmail = (location.state as any)?.otpEmail;

    const [step, setStep] = useState(1);
    // Sub-step within step 1: 'form' = filling details, 'otp' = verifying code, 'verified' = done
    const [accountSubStep, setAccountSubStep] = useState<'form' | 'otp' | 'verified'>(incomingOtpEmail ? 'otp' : 'form');
    const [formData, setFormData] = useState({
        name: '',
        email: incomingOtpEmail || '',
        password: '',
        confirmPassword: '',
        role: 'alumni',
        graduationYear: '',
        degree: '',
        department: '',
        rollNumber: '',
        employeeId: '',
        designation: '',
        phone: '',
        headline: '',
        industry: '',
        country: '',
        state: '',
        currentCompany: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    // If redirected with otpEmail from login, auto-send OTP
    useEffect(() => {
        if (incomingOtpEmail) {
            api.post('/auth/send-register-otp', { email: incomingOtpEmail }).catch(() => {});
            setResendCooldown(60);
        }
    }, [incomingOtpEmail]);

    // Auto-focus first OTP box when OTP sub-step appears
    useEffect(() => {
        if (accountSubStep === 'otp') {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [accountSubStep]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    /* ─── Step 1: Validate account fields then send OTP ─── */
    const handleAccountContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Send OTP (server checks if email is already taken)
        setIsSendingOtp(true);
        try {
            await api.post('/auth/send-register-otp', { email: formData.email.trim() });
            setResendCooldown(60);
            setOtpDigits(['', '', '', '', '', '']);
            setAccountSubStep('otp');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send verification code.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    /* ─── Verify OTP within Step 1 ─── */
    const handleVerifyEmailOtp = async () => {
        const otp = otpDigits.join('');
        if (otp.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
        setIsVerifying(true);
        setError('');
        try {
            await api.post('/auth/verify-register-otp', { email: formData.email, otp });
            setVerifiedEmail(formData.email);
            setAccountSubStep('verified');
            // Auto-advance to step 2 after a brief delay
            setTimeout(() => setStep(2), 600);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleNext = () => {
        if (step === 2) {
            if (formData.role === 'teacher') {
                if (!formData.department || !formData.employeeId || !formData.designation) {
                    setError('Please fill in all required fields');
                    return;
                }
            } else {
                if (!formData.graduationYear || !formData.degree || !formData.department || !formData.rollNumber) {
                    setError('Please fill in all required academic fields');
                    return;
                }
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        setStep(step - 1);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.country) {
            setError('Please select your country');
            return;
        }

        try {
            const registrationData: any = {
                name: formData.name,
                email: verifiedEmail,
                password: formData.password,
                role: formData.role as 'alumni' | 'student' | 'teacher',
                department: formData.department,
                phone: formData.phone || undefined,
                currentLocation: formData.country
                    ? formatLocation(formData.country, formData.state || undefined)
                    : undefined,
            };

            if (formData.role === 'teacher') {
                registrationData.rollNumber = formData.employeeId;
                registrationData.designation = formData.designation;
                registrationData.graduationYear = new Date().getFullYear();
                registrationData.degree = 'Faculty';
            } else {
                registrationData.graduationYear = parseInt(formData.graduationYear);
                registrationData.degree = formData.degree;
                registrationData.rollNumber = formData.rollNumber;
                registrationData.headline = formData.headline || undefined;
                registrationData.industry = formData.industry || undefined;
                registrationData.currentCompany = formData.currentCompany || undefined;
            }

            const result = await register(registrationData);
            if (result.success) {
                navigate(result.autoApproved ? '/login' : '/verification-pending');
            } else {
                setError(result.message || 'Registration failed. Please try again.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

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
                <div className="w-full max-w-[520px]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Join MIC College of Technology Alumni Network</h1>
                        <p className="text-[var(--text-muted)]">Connect with alumni, students, and faculty of MIC College of Technology</p>
                    </motion.div>

                    {/* 3-step progress bar */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${step >= s ? 'bg-[var(--accent)] text-[var(--bg-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                                    {step > s ? <Check size={16} /> : s}
                                </div>
                                <span className={`text-xs hidden sm:inline ${step >= s ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                    {s === 1 ? 'Account' : s === 2 ? 'Academic' : 'Profile'}
                                </span>
                                {s < 3 && <div className="w-8 h-px bg-[var(--border-color)]" />}
                            </div>
                        ))}
                    </div>

                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: step === 1 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[var(--bg-secondary)]/60 backdrop-blur-xl shadow-sm p-6 sm:p-8 overflow-visible border border-[var(--border-color)]/30 rounded-2xl"
                    >
                        {error && (
                            <div className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        {/* ── Step 1: Account details + inline OTP verification ── */}
                        {step === 1 && (
                            <div className="space-y-5">
                                {accountSubStep === 'form' && (
                                    <form onSubmit={handleAccountContinue} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Full Name *</label>
                                            <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Enter your full name" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email *</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="Enter your email" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Password *</label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className={`${inputClass} pr-12`} placeholder="Create a password (6+ characters)" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Confirm Password *</label>
                                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className={inputClass} placeholder="Confirm your password" />
                                        </div>
                                        <button type="submit" disabled={isSendingOtp} className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                            {isSendingOtp
                                                ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                                : <>Continue <ArrowRight size={18} /></>}
                                        </button>
                                    </form>
                                )}

                                {accountSubStep === 'otp' && (
                                    <div className="space-y-5">
                                        <div className="text-center">
                                            <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
                                                <Mail size={28} className="text-[var(--accent)]" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Verify Your Email</h2>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                Enter the 6-digit code sent to<br />
                                                <span className="text-[var(--text-primary)] font-medium">{formData.email}</span>
                                            </p>
                                        </div>

                                        <div className="flex justify-center gap-2">
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
                                                            // Handle multi-char input (autofill / paste fallback)
                                                            const chars = val.slice(0, 6).split('');
                                                            const nd = ['', '', '', '', '', ''];
                                                            chars.forEach((c, ci) => { nd[ci] = c; });
                                                            setOtpDigits(nd);
                                                            otpRefs.current[Math.min(chars.length, 5)]?.focus();
                                                            setError('');
                                                        } else {
                                                            handleOtpChange(i, val);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        handleOtpKeyDown(i, e);
                                                        if (e.key === 'Enter' && otpDigits.join('').length === 6) handleVerifyEmailOtp();
                                                    }}
                                                    className="w-12 h-14 text-center text-xl font-bold bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] rounded-xl text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all"
                                                />
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleVerifyEmailOtp}
                                            disabled={isVerifying || otpDigits.join('').length !== 6}
                                            className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isVerifying
                                                ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" />
                                                : <>Verify Email <ArrowRight size={18} /></>}
                                        </button>

                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => { setAccountSubStep('form'); setOtpDigits(['', '', '', '', '', '']); setError(''); }}
                                                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                                            >
                                                <ArrowLeft size={14} /> Back
                                            </button>
                                            <button
                                                disabled={resendCooldown > 0}
                                                onClick={async () => {
                                                    try {
                                                        await api.post('/auth/send-register-otp', { email: formData.email });
                                                        setResendCooldown(60);
                                                        setOtpDigits(['', '', '', '', '', '']);
                                                        setError('');
                                                    } catch (err: any) {
                                                        setError(err.response?.data?.message || 'Failed to resend OTP.');
                                                    }
                                                }}
                                                className="text-sm text-[var(--accent)] font-medium hover:underline disabled:text-[var(--text-muted)] disabled:no-underline inline-flex items-center gap-1"
                                            >
                                                <RefreshCw size={14} />
                                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {accountSubStep === 'verified' && (
                                    <div className="text-center py-4">
                                        <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                            <Check size={28} className="text-emerald-500" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Email Verified!</h2>
                                        <p className="text-sm text-[var(--text-muted)]">Proceeding to next step...</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Step 2: Academic details ── */}
                        {step === 2 && (
                            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">I am a *</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {['alumni', 'student', 'teacher'].map((r) => (
                                            <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })} className={`py-3 px-4 border-2 rounded-xl font-medium transition-all capitalize ${formData.role === r ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]' : 'border-[var(--border-color)]/40 text-[var(--text-secondary)] hover:border-[var(--text-muted)]'}`}>
                                                {r === 'student' ? 'Current Student' : r === 'teacher' ? 'Teacher' : 'Alumni'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.role !== 'teacher' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                                {formData.role === 'student' ? 'Expected Graduation Year *' : 'Graduation Year *'}
                                            </label>
                                            <select name="graduationYear" value={formData.graduationYear} onChange={handleChange} required className={inputClass}>
                                                <option value="">Select year</option>
                                                {formData.role === 'student'
                                                    ? Array.from({ length: 6 }, (_, i) => currentYear + i).map(year => <option key={year} value={year}>{year}</option>)
                                                    : years.map(year => <option key={year} value={year}>{year}</option>)
                                                }
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Degree *</label>
                                            <select name="degree" value={formData.degree} onChange={handleChange} required className={inputClass}>
                                                <option value="">Select degree</option>
                                                <option value="B.Tech">B.Tech</option>
                                                <option value="M.Tech">M.Tech</option>
                                                <option value="MBA">MBA</option>
                                                <option value="MCA">MCA</option>
                                                <option value="Diploma">Diploma</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Department *</label>
                                    <select name="department" value={formData.department} onChange={handleChange} required className={inputClass}>
                                        <option value="">Select department</option>
                                        <option value="CSE">Computer Science & Engineering</option>
                                        <option value="ECE">Electronics & Communication</option>
                                        <option value="EEE">Electrical & Electronics</option>
                                        <option value="Mech">Mechanical Engineering</option>
                                        <option value="Civil">Civil Engineering</option>
                                        <option value="IT">Information Technology</option>
                                        <option value="AI&DS">AI & Data Science</option>
                                        <option value="AI&ML">AI & Machine Learning</option>
                                        <option value="MBA">MBA</option>
                                        <option value="MCA">MCA</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {formData.role === 'teacher' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Employee ID * <span className="text-[var(--text-muted)] font-normal">(for verification)</span></label>
                                            <input type="text" name="employeeId" value={formData.employeeId} onChange={handleChange} required className={inputClass} placeholder="Enter your employee ID" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Designation *</label>
                                            <select name="designation" value={formData.designation} onChange={handleChange} required className={inputClass}>
                                                <option value="">Select designation</option>
                                                <option value="Professor">Professor</option>
                                                <option value="Associate Professor">Associate Professor</option>
                                                <option value="Assistant Professor">Assistant Professor</option>
                                                <option value="Lecturer">Lecturer</option>
                                                <option value="Lab Instructor">Lab Instructor</option>
                                                <option value="HOD">Head of Department</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Roll Number * <span className="text-[var(--text-muted)] font-normal">(for verification)</span></label>
                                        <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} required className={inputClass} placeholder="Enter your university roll number" />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Phone Number</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} placeholder="+91 XXXXX XXXXX" />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={handleBack} className="flex-1 py-3 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-all flex items-center justify-center gap-2">
                                        <ArrowLeft size={18} /> Back
                                    </button>
                                    <button type="submit" className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                        Continue <ArrowRight size={18} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── Step 3: Profile & Location ── */}
                        {step === 3 && (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <p className="text-sm text-[var(--text-muted)] text-center mb-2">
                                    {formData.role === 'teacher'
                                        ? 'Almost there! Add your location details.'
                                        : 'Almost there! Help others find and connect with you.'}
                                </p>

                                {formData.role !== 'teacher' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Headline</label>
                                            <input type="text" name="headline" value={formData.headline} onChange={handleChange} className={inputClass} placeholder={formData.role === 'student' ? 'e.g., B.Tech CSE Student at MIC' : 'e.g., Software Engineer at Google'} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Industry</label>
                                            <select name="industry" value={formData.industry} onChange={handleChange} className={inputClass}>
                                                <option value="">Select industry</option>
                                                {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                            </select>
                                        </div>
                                        {formData.role === 'alumni' && (
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Current Company</label>
                                                <input type="text" name="currentCompany" value={formData.currentCompany} onChange={handleChange} className={inputClass} placeholder="e.g., Microsoft, TCS, Infosys" />
                                            </div>
                                        )}
                                    </>
                                )}

                                <CountryStateSelector
                                    country={formData.country}
                                    state={formData.state}
                                    onCountryChange={(country) => setFormData(prev => ({ ...prev, country, state: '' }))}
                                    onStateChange={(state) => setFormData(prev => ({ ...prev, state }))}
                                    required
                                />
                                <div className="flex gap-3">
                                    <button type="button" onClick={handleBack} className="flex-1 py-3 border border-[var(--border-color)]/40 rounded-xl text-[var(--text-secondary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-all flex items-center justify-center gap-2">
                                        <ArrowLeft size={18} /> Back
                                    </button>
                                    <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg-primary)] rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isLoading ? <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-[var(--bg-primary)] rounded-full animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] text-center">
                                    By joining, you agree to our <a href="#" className="text-[var(--text-primary)] hover:underline">Terms</a> and <a href="#" className="text-[var(--text-primary)] hover:underline">Privacy Policy</a>
                                </p>
                            </form>
                        )}
                    </motion.div>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-6 text-[var(--text-secondary)]">
                        Already a member? <Link to="/login" className="text-[var(--text-primary)] font-semibold hover:underline">Sign in</Link>
                    </motion.p>
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

export default Register;
