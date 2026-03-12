import { Request, Response, NextFunction } from 'express';
import User, { UserStatus } from '../models/User';

/**
 * Shared authentication middleware.
 *
 * Wrapped in try/catch to prevent unhandled rejections from crashing
 * the process or causing 502s during MongoDB hiccups.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (user.status !== UserStatus.ACTIVE && user.role !== 'admin') {
            return res.status(403).json({ message: 'Account not approved.' });
        }
        // Attach user to request for downstream handlers
        (req as any).user = user;
        next();
    } catch (err) {
        console.error('[requireAuth] error:', err);
        res.status(500).json({ message: 'Authentication error' });
    }
};

/**
 * Lightweight auth — only checks session exists, no DB lookup.
 * Use for routes that do their own user lookup or don't need the full user object.
 */
export const requireSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        next();
    } catch (err) {
        console.error('[requireSession] error:', err);
        res.status(500).json({ message: 'Authentication error' });
    }
};

/**
 * Admin-only middleware. Checks session + admin role.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        (req as any).user = user;
        next();
    } catch (err) {
        console.error('[requireAdmin] error:', err);
        res.status(500).json({ message: 'Authentication error' });
    }
};
