import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db';
import logger from './config/logger';
import { authRouter } from './routes/authRoutes';
import { adminRouter } from './routes/adminRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── CORS Origins ──────────────────────────────────────────
// In production set ALLOWED_ORIGINS to a comma-separated list of allowed
// origins (e.g. "https://alumni.example.com,https://www.alumni.example.com").
// WEBSITE_URL is the canonical frontend URL used for email links etc.
const WEBSITE_URL = process.env.WEBSITE_URL || 'http://localhost:5173';

const allowedOrigins: (string | RegExp)[] = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    ];

// Always include WEBSITE_URL in allowed origins
if (WEBSITE_URL && !allowedOrigins.includes(WEBSITE_URL)) {
    allowedOrigins.push(WEBSITE_URL);
}

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
        if (!origin) return callback(null, true);

        // In production, only allow explicitly listed origins
        if (process.env.ALLOWED_ORIGINS) {
            const allowed = allowedOrigins.some(o =>
                typeof o === 'string' ? o === origin : o.test(origin)
            );
            return callback(allowed ? null : new Error('CORS not allowed'), allowed);
        }

        // In development, allow all origins for LAN access
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

const io = new Server(server, {
    cors: corsOptions,
    transports: ["polling", "websocket"]
});

// Configure helmet to allow cross-origin images
// Trust proxy for Coolify / reverse proxy deployments (needed for secure cookies)
app.set('trust proxy', 1);

// Cloudflare + Traefik double-proxy fix: Traefik connects to Cloudflare over
// HTTP internally, so it overwrites X-Forwarded-Proto to "http" even though
// the end-user connection is HTTPS.  Force the correct proto so express-session
// will issue Secure cookies.
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    app.use((req, _res, next) => {
        // Cloudflare always sends cf-visitor with the real client scheme
        const cfVisitor = req.headers['cf-visitor'];
        if (cfVisitor) {
            try {
                const parsed = JSON.parse(cfVisitor as string);
                if (parsed.scheme === 'https') {
                    req.headers['x-forwarded-proto'] = 'https';
                }
            } catch { /* ignore parse errors */ }
        } else if (process.env.ALLOWED_ORIGINS?.startsWith('https://')) {
            // Fallback: if we know the site is HTTPS-only, trust that
            req.headers['x-forwarded-proto'] = 'https';
        }
        next();
    });
}

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "wss:", "ws:", "https://cloudflareinsights.com"],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
}));
app.use(cors(corsOptions));
app.use(compression()); // Enable gzip/brotli compression for faster responses
app.use(express.json());

// Session Middleware

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/alumni_association',
    ttl: 7 * 24 * 60 * 60, // 7 days
    autoRemove: 'native',
});
sessionStore.on('error', (err: Error) => {
    logger.error('MongoStore session error:', err);
});

app.use(session({
    name: 'alumni.sid',
    secret: process.env.SESSION_SECRET || 'alumni_association_secret_key',
    proxy: true, // Trust Traefik / Coolify reverse proxy for secure cookies
    resave: false,
    saveUninitialized: false, // Don't save empty sessions
    store: sessionStore,
    cookie: {
        secure: isProduction, // true behind Traefik TLS termination
        httpOnly: true,
        sameSite: 'lax', // same-origin deployment — 'lax' is correct
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
}));

// Debug session state on API requests (helps diagnose auth issues in Coolify logs)
app.use('/api', (req, _res, next) => {
    if (req.path === '/auth/check' || req.path === '/health') {
        logger.debug(`[session] ${req.method} ${req.originalUrl} | sid:${req.session?.id?.substring(0, 8)}… | userId:${req.session?.userId || 'none'} | cookie:${req.headers.cookie ? 'yes' : 'NO'} | secure:${req.secure} | proto:${req.protocol}`);
    }
    next();
});

import { chatRouter } from './routes/chatRoutes';
import { userRouter } from './routes/userRoutes';
import { postRouter } from './routes/postRoutes';
import { uploadRouter } from './routes/uploadRoutes';
import { groupRouter } from './routes/groupRoutes';
import { connectionRouter } from './routes/connectionRoutes';
import { eventRouter } from './routes/eventRoutes';
import { notificationRouter } from './routes/notificationRoutes';
import { jobRouter } from './routes/jobRoutes';
import { telemetryRouter } from './routes/telemetryRoutes';
import { eventPostRouter } from './routes/eventPostRoutes';
import { publicRouter } from './routes/publicRoutes';
import galleryRouter from './routes/gallery';
import savedRouter from './routes/savedRoutes';
import runGC from './scripts/gcUploads';
import { autoInvalidate } from './config/cache';

// ... (other imports)

// Socket.io Middleware to make io available in routes
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// Auto-invalidate cache on successful mutations (POST/PUT/DELETE/PATCH → 2xx)
app.use(autoInvalidate());

// Middleware: sanitize absolute localhost URLs in JSON responses so images work on any LAN IP.
// Old records in MongoDB may have been stored with http://localhost:5000/api/uploads/... —
// this strips them to relative /api/uploads/... paths before sending to the client.
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
        if (body) {
            try {
                const raw = JSON.stringify(body);
                const sanitized = JSON.parse(
                    raw
                        .replace(/http:\/\/localhost:\d+(?=\/api\/uploads\/)/g, '')
                        // Migrate legacy /uploads/ paths → /api/uploads/
                        .replace(/(?<!\/api)\/uploads\//g, '/api/uploads/')
                );
                return originalJson(sanitized);
            } catch {
                // If stringify/parse fails (circular refs etc.), send body as-is
                return originalJson(body);
            }
        }
        return originalJson(body);
    };
    next();
});

// Serve uploaded files from GridFS (MongoDB) with CDN-friendly caching headers.
// Uploads go direct to MongoDB; reads are served with ETag + conditional 304
// so a CDN in front can cache efficiently without re-fetching.
import { getGridFSBucket } from './config/gridfs';

app.use('/api/uploads', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // gridName is everything after /api/uploads/, e.g. "username/profile/123-456.jpg"
    const gridName = decodeURIComponent(req.path.replace(/^\//, ''));
    if (!gridName) return res.status(404).end();

    const bucket = getGridFSBucket();

    // Helper: try finding the file, with a .webp fallback for images that were
    // auto-converted by processImageAndStore but stored in DB with original ext.
    const findWithFallback = async (name: string) => {
        let files = await bucket.find({ filename: name }).toArray();
        if ((!files || files.length === 0) && /\.(jpe?g|png|gif)$/i.test(name)) {
            const webpName = name.replace(/\.[^.]+$/, '.webp');
            files = await bucket.find({ filename: webpName }).toArray();
            if (files && files.length > 0) return { files, resolvedName: webpName };
        }
        return { files, resolvedName: name };
    };

    findWithFallback(gridName)
        .then(({ files, resolvedName }) => {
            if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });

            const file = files[0];
            const etag = `"${file._id.toString()}"`;
            const lastModified = file.uploadDate ? file.uploadDate.toUTCString() : undefined;

            // Conditional request support — CDN and browsers send these to revalidate
            const ifNoneMatch = req.headers['if-none-match'];
            const ifModifiedSince = req.headers['if-modified-since'];

            if (ifNoneMatch === etag) return res.status(304).end();
            if (ifModifiedSince && lastModified && new Date(ifModifiedSince) >= new Date(lastModified)) {
                return res.status(304).end();
            }

            const contentType = file.contentType || 'application/octet-stream';
            const fileLength = file.length || 0;

            res.set('Content-Type', contentType);
            // Filenames contain unique timestamps — safe to cache long-term + immutable
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.set('ETag', etag);
            if (lastModified) res.set('Last-Modified', lastModified);
            // Advertise range support for progressive loading
            res.set('Accept-Ranges', 'bytes');

            // Handle range requests (for progressive image/video loading)
            const rangeHeader = req.headers.range;
            if (rangeHeader && fileLength > 0) {
                const parts = rangeHeader.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileLength - 1;
                const chunkSize = end - start + 1;

                res.status(206);
                res.set('Content-Range', `bytes ${start}-${end}/${fileLength}`);
                res.set('Content-Length', String(chunkSize));

                const downloadStream = bucket.openDownloadStreamByName(resolvedName, { start, end: end + 1 });
                downloadStream.pipe(res);
                downloadStream.on('error', () => {
                    if (!res.headersSent) res.status(404).end();
                });
            } else {
                if (fileLength) res.set('Content-Length', String(fileLength));
                const downloadStream = bucket.openDownloadStreamByName(resolvedName);
                downloadStream.pipe(res);
                downloadStream.on('error', () => {
                    if (!res.headersSent) res.status(404).end();
                });
            }
        })
        .catch(err => {
            console.error('GridFS serve error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Error retrieving file' });
        });
});

// ─── Health Check (Coolify / load-balancer) ───
app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/groups', groupRouter);
app.use('/api/connections', connectionRouter);
app.use('/api/events', eventRouter);
app.use('/api/event-posts', eventPostRouter);
app.use('/api/public', publicRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/saved', savedRouter);
// Mentorship routes removed

// Socket.io Connection Handler
io.on('connection', (socket) => {
    logger.log('User connected:', socket.id);

    socket.on('join_user_room', (userId) => {
        socket.join(userId);
        logger.log(`User ${userId} joined room`);
    });

    socket.on('typing', ({ recipientId, senderId }) => {
        io.to(recipientId).emit('user_typing', { senderId });
    });

    socket.on('disconnect', () => {
        logger.log('User disconnected');
    });
});

// ─── Global Express error handler ───
// Catches any error thrown/next(err)'d by route handlers or middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(`[ERROR] ${req.method} ${req.originalUrl}`, err?.message || err);
    if (!res.headersSent) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
});

// ─── Serve Client Build (single-instance deployment) ───
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath, {
    maxAge: '1y',
    immutable: true,
    index: false, // We handle index.html ourselves for SPA routing
}));

// SPA catch-all: any non-API route serves index.html for client-side routing
app.get('*', (req, res) => {
    // Skip API routes (they should 404 normally)
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ message: 'Not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Get local IP addresses for network access info
const getLocalIPs = () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
};

// ─── Process-level error handlers (prevent silent crashes → 502) ───
process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException]', err);
    // Don't exit — keep serving; Coolify will restart if truly broken
});

// Connect to Database FIRST so MongoStore is ready, then start server
connectDB().then(() => {
    // Run GC on startup and schedule periodic runs every 6 hours
    runGC().catch((e) => console.error('Initial GC error', e));
    setInterval(() => {
        runGC().catch((e) => console.error('Scheduled GC error', e));
    }, 1000 * 60 * 60 * 6);

    server.listen(Number(PORT), HOST, () => {
        logger.startup('\n===========================================');
        logger.startup('  Alumni Association Server Started');
        logger.startup(`  Mode:     ${process.env.NODE_ENV || 'development'}`);
        logger.startup('===========================================');
        logger.startup(`  Local:    http://localhost:${PORT}`);

        const localIPs = getLocalIPs();
        if (localIPs.length > 0) {
            logger.startup('\n  Network Access URLs:');
            localIPs.forEach(ip => {
                logger.startup(`    \u279c  http://${ip}:${PORT}`);
            });
            logger.log('\n  Share these URLs with other computers');
            logger.log('  on your college network!');
        }
        logger.startup('===========================================\n');
    });
}).catch((err) => {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
});
