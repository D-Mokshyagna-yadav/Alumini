import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { UserStatus, UserRole, IUser } from '../models/User';
import { getSettings } from '../models/SiteSettings';

// Extend Session Data
declare module 'express-session' {
    interface SessionData {
        userId: string;
        role: string;
    }
}

export const register = async (req: Request, res: Response) => {
    try {
        const {
            name, email, password, graduationYear,
            degree, rollNumber, department, role,
            headline, industry, phone, currentLocation, currentCompany,
            designation
        } = req.body;

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
            // LinkedIn-like fields
            headline,
            industry,
            phone,
            currentLocation,
            currentCompany,
            designation
        });

        await newUser.save();

        res.status(201).json({
            message: settings.autoApproveUsers
                ? 'Registration successful. Your account has been automatically approved.'
                : 'Registration successful. Your account is pending admin verification.',
            autoApproved: !!settings.autoApproveUsers
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        const user = await User.findOne({ email });
        console.log('User found:', user ? { id: user._id, email: user.email, hasPasswordHash: !!user.passwordHash } : 'No user found');
        
        if (!user) {
            console.log('Login failed: User not found');
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        console.log('Password provided:', password ? 'Yes' : 'No');
        console.log('Password hash exists:', !!user.passwordHash);
        
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log('Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        if (user.status !== UserStatus.ACTIVE && user.role !== UserRole.ADMIN) {
            return res.status(403).json({
                message: 'Your account is pending verification. Please wait for admin approval.'
            });
        }

        // Set Session
        if (req.session) {
            req.session.userId = String(user._id);
            req.session.role = user.role;
        }

        const userObj = user.toJSON();
        delete (userObj as any).passwordHash;
        res.json({
            message: 'Login successful',
            user: { ...userObj, id: user._id }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

export const logout = (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy((err: any) => {
            if (err) {
                return res.status(500).json({ message: 'Could not log out.' });
            }
            res.clearCookie('connect.sid'); // Default session cookie name
            res.json({ message: 'Logout successful' });
        });
    } else {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    }
};

export const checkAuth = async (req: Request, res: Response) => {
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
