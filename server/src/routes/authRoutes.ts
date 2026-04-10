import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, checkAuth, verifyOtp, resendOtp, forgotPassword, resetPassword, verify2fa, requestOtpLogin, sendRegisterOtp, verifyRegisterOtp } from '../controllers/authController';

const router = express.Router();

// ─── Rate limiters ────────────────────────────────────────────
// Strict limit for login attempts to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
});

// Limit OTP send/resend to prevent email flooding
const otpSendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many OTP requests. Please try again later.' },
});

// Limit OTP verification attempts to prevent brute-force of OTP codes
const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many verification attempts. Please try again after 15 minutes.' },
});

router.post('/send-register-otp', otpSendLimiter, sendRegisterOtp);
router.post('/verify-register-otp', otpVerifyLimiter, verifyRegisterOtp);
router.post('/register', otpVerifyLimiter, register);
router.post('/verify-otp', otpVerifyLimiter, verifyOtp);
router.post('/verify-2fa', otpVerifyLimiter, verify2fa);
router.post('/resend-otp', otpSendLimiter, resendOtp);
router.post('/forgot-password', otpSendLimiter, forgotPassword);
router.post('/reset-password', otpVerifyLimiter, resetPassword);
router.post('/login', loginLimiter, login);
router.post('/otp-login', otpSendLimiter, requestOtpLogin);
router.post('/logout', logout);
router.get('/check', checkAuth);

export { router as authRouter };
