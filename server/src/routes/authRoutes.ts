import express from 'express';
import { register, login, logout, checkAuth, verifyOtp, resendOtp, forgotPassword, resetPassword, verify2fa, requestOtpLogin, sendRegisterOtp, verifyRegisterOtp } from '../controllers/authController';

const router = express.Router();

router.post('/send-register-otp', sendRegisterOtp);
router.post('/verify-register-otp', verifyRegisterOtp);
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/verify-2fa', verify2fa);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login', login);
router.post('/otp-login', requestOtpLogin);
router.post('/logout', logout);
router.get('/check', checkAuth);

export { router as authRouter };
