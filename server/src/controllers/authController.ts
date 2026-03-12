import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User, { UserStatus, UserRole, IUser } from '../models/User';
import OTP from '../models/OTP';
import { getSettings } from '../models/SiteSettings';
import { sendOtpEmail, sendWaitlistEmail } from '../config/email';
import logger from '../config/logger';

// Extend Session Data
declare module 'express-session' {
    interface SessionData {
        userId: string;
        role: string;
    }
}

/* ──── helpers ──── */
function generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
}

const OTP_EXPIRY_MINUTES = 10;

/* ──── SEND REGISTER OTP (Step 0: verify email before registration) ──── */
export const sendRegisterOtp = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        // Block if a verified user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.emailVerified) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        // If unverified stale user exists, clean it up
        if (existingUser && !existingUser.emailVerified) {
            await User.deleteOne({ _id: existingUser._id });
        }

        const otp = generateOtp();
        await OTP.deleteMany({ email, type: 'register' });
        await OTP.create({
            email,
            otp,
            type: 'register',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        });
        await sendOtpEmail(email, otp, 'register');

        res.json({ message: 'Verification code sent to your email.', email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending OTP.' });
    }
};

/* ──── VERIFY REGISTER OTP (Step 0b: confirm email ownership) ──── */
export const verifyRegisterOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

        const record = await OTP.findOne({ email, type: 'register', otp });
        if (!record) return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        if (record.expiresAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Clean up register OTPs and create a verified marker (30 min TTL)
        await OTP.deleteMany({ email, type: 'register' });
        await OTP.deleteMany({ email, type: 'email_verified' as any });
        await OTP.create({
            email,
            otp: 'verified',
            type: 'email_verified' as any,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min to complete registration
        });

        res.json({ message: 'Email verified successfully.', verified: true, email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during verification.' });
    }
};

/* ──── REGISTER (creates user — email must be pre-verified) ──── */
export const register = async (req: Request, res: Response) => {
    try {
        const {
            name, email, password, graduationYear,
            degree, rollNumber, department, role,
            headline, industry, phone, currentLocation, currentCompany,
            designation
        } = req.body;

        // Check that email was pre-verified via OTP
        const verified = await OTP.findOne({ email, type: 'email_verified' as any });
        if (!verified) {
            return res.status(400).json({ message: 'Email not verified. Please verify your email first.' });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { rollNumber }]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this Email or Roll Number already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Check auto-approval setting
        const settings = await getSettings();
        const userStatus = settings.autoApproveUsers ? UserStatus.ACTIVE : UserStatus.PENDING;

        const newUser = new User({
            name,
            email,
            passwordHash,
            graduationYear,
            degree,
            department,
            rollNumber,
            role: role || UserRole.ALUMNI,
            status: userStatus,
            isVerified: settings.autoApproveUsers,
            emailVerified: true, // already verified via OTP
            // LinkedIn-like fields
            headline,
            industry,
            phone,
            currentLocation,
            currentCompany,
            designation
        });

        await newUser.save();

        // Clean up the verification marker
        await OTP.deleteMany({ email, type: 'email_verified' as any });

        // Send waitlist email if account needs admin approval
        if (!settings.autoApproveUsers) {
            try {
                await sendWaitlistEmail(email, name);
            } catch (e) { console.error('Waitlist email error:', e); }
        }

        res.status(201).json({
            message: 'Registration successful.',
            autoApproved: !!settings.autoApproveUsers,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

/* ──── VERIFY OTP (Step 2: email verification for registration) ──── */
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const record = await OTP.findOne({ email, type: 'register', otp });
        if (!record) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }
        if (record.expiresAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Mark email as verified
        const user = await User.findOneAndUpdate(
            { email },
            { emailVerified: true },
            { new: true }
        );

        // Clean up used OTPs
        await OTP.deleteMany({ email, type: 'register' });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({
            message: 'Email verified successfully.',
            autoApproved: user.status === UserStatus.ACTIVE,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

/* ──── RESEND OTP ──── */
export const resendOtp = async (req: Request, res: Response) => {
    try {
        const { email, type } = req.body as { email: string; type: 'register' | 'reset' };
        if (!email || !type) {
            return res.status(400).json({ message: 'Email and type are required.' });
        }

        if (type === 'register') {
            // For registration resends, check that email isn't already taken by a verified user
            const user = await User.findOne({ email });
            if (user && user.emailVerified) return res.status(400).json({ message: 'Email is already verified.' });
        }

        if (type === 'reset') {
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ message: 'No account with this email.' });
        }

        const otp = generateOtp();
        await OTP.deleteMany({ email, type });
        await OTP.create({
            email,
            otp,
            type,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        });
        await sendOtpEmail(email, otp, type);

        res.json({ message: 'OTP has been resent to your email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while resending OTP.' });
    }
};

/* ──── FORGOT PASSWORD (send reset OTP) ──── */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal whether account exists
            return res.json({ message: 'If this email is registered, you will receive an OTP.' });
        }

        const otp = generateOtp();
        await OTP.deleteMany({ email, type: 'reset' });
        await OTP.create({
            email,
            otp,
            type: 'reset',
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        });
        await sendOtpEmail(email, otp, 'reset');

        res.json({ message: 'If this email is registered, you will receive an OTP.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
};

/* ──── RESET PASSWORD (verify OTP + set new password) ──── */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const record = await OTP.findOne({ email, type: 'reset', otp });
        if (!record) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }
        if (record.expiresAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await User.findOneAndUpdate({ email }, { passwordHash });
        await OTP.deleteMany({ email, type: 'reset' });

        res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

/* ──── LOGIN ──── */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Block users who haven't verified their email (skip for admin or already-active legacy users)
        if (!user.emailVerified && user.role !== UserRole.ADMIN && user.status !== UserStatus.ACTIVE) {
            return res.status(403).json({
                message: 'Please verify your email first.',
                requireOtp: true,
                email: user.email,
            });
        }

        if (user.status !== UserStatus.ACTIVE && user.role !== UserRole.ADMIN) {
            return res.status(403).json({
                message: 'Your account is pending verification. Please wait for admin approval.'
            });
        }

        // 2-Step Verification: if enabled, send OTP before granting session
        if (user.twoFactorEnabled) {
            const otp = generateOtp();
            await OTP.deleteMany({ email: user.email, type: 'login' });
            await OTP.create({
                email: user.email,
                otp,
                type: 'login' as any,
                expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
            });
            await sendOtpEmail(user.email, otp, 'login' as any);
            return res.status(200).json({
                message: 'A verification code has been sent to your email.',
                require2fa: true,
                email: user.email,
            });
        }

        // Set Session
        const userObj = user.toJSON();
        delete (userObj as any).passwordHash;

        if (req.session) {
            req.session.userId = String(user._id);
            req.session.role = user.role;

            // Ensure session is saved before responding (critical behind reverse proxies)
            req.session.save((err: any) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ message: 'Session error during login.' });
                }
                res.json({
                    message: 'Login successful',
                    user: { ...userObj, id: user._id }
                });
            });
        } else {
            res.json({
                message: 'Login successful',
                user: { ...userObj, id: user._id }
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/* ──── VERIFY 2FA (Two-Step Verification on login) ──── */
export const verify2fa = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const record = await OTP.findOne({ email, type: 'login', otp });
        if (!record) {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }
        if (record.expiresAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: 'Code has expired. Please login again.' });
        }

        // Clean up
        await OTP.deleteMany({ email, type: 'login' });

        // Find user and set session
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const userObj = user.toJSON();
        delete (userObj as any).passwordHash;

        if (req.session) {
            req.session.userId = String(user._id);
            req.session.role = user.role;

            req.session.save((err: any) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ message: 'Session error during login.' });
                }
                res.json({
                    message: 'Login successful',
                    user: { ...userObj, id: user._id }
                });
            });
        } else {
            res.json({
                message: 'Login successful',
                user: { ...userObj, id: user._id }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during 2FA verification.' });
    }
};

/* ──── REQUEST OTP LOGIN (passwordless) ──── */
export const requestOtpLogin = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'No account found with this email.' });
        }

        // Block users who haven't verified their email
        if (!user.emailVerified && user.role !== UserRole.ADMIN && user.status !== UserStatus.ACTIVE) {
            return res.status(403).json({
                message: 'Please verify your email first.',
                requireOtp: true,
                email: user.email,
            });
        }

        if (user.status !== UserStatus.ACTIVE && user.role !== UserRole.ADMIN) {
            return res.status(403).json({
                message: 'Your account is pending verification. Please wait for admin approval.',
            });
        }

        const otp = generateOtp();
        await OTP.deleteMany({ email: user.email, type: 'login' });
        await OTP.create({
            email: user.email,
            otp,
            type: 'login' as any,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        });
        await sendOtpEmail(user.email, otp, 'login' as any);

        return res.status(200).json({
            message: 'A login OTP has been sent to your email.',
            email: user.email,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending OTP.' });
    }
};

export const logout = (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy((err: any) => {
            if (err) {
                return res.status(500).json({ message: 'Could not log out.' });
            }
            res.clearCookie('alumni.sid');
            res.json({ message: 'Logout successful' });
        });
    } else {
        res.clearCookie('alumni.sid');
        res.json({ message: 'Logout successful' });
    }
};

export const checkAuth = async (req: Request, res: Response) => {
    logger.log('[auth/check] sessionID:', req.session?.id, 'userId:', req.session?.userId, 'cookie:', req.headers.cookie?.substring(0, 60));
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).select('-passwordHash');
            if (!user) return res.status(401).json({ message: 'Unauthorized' });
            const userObj = user.toJSON();
            return res.json({ user: { ...userObj, id: user._id } });
        } catch (error) {
            return res.status(500).json({ message: 'Server error' });
        }
    } else {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};
