import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import connectDB from './config/db';
import { authRouter } from './routes/authRoutes';
import { adminRouter } from './routes/adminRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow multiple origins for network access - supports all common local network ranges
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,  // 192.168.x.x local network
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,  // 10.x.x.x local network
    /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/,  // 172.16-31.x.x local network
    /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,  // Any IP address (for college network)
];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
        if (!origin) return callback(null, true);
        
        // In development/local network mode, allow all origins
        // This enables access from any computer on the college network
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
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(express.json());

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'alumni_association_secret_key',
    resave: false,
    saveUninitialized: false, // Don't save empty sessions
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/alumni_association',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax', // Allow cookies over LAN (same-site navigation)
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

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

// ... (other imports)

// Socket.io Middleware to make io available in routes
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// Middleware: sanitize absolute localhost URLs in JSON responses so images work on any LAN IP.
// Old records in MongoDB may have been stored with http://localhost:5000/api/uploads/... —
// this strips them to relative /api/uploads/... paths before sending to the client.
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
        if (body) {
            const sanitized = JSON.parse(
                JSON.stringify(body)
                    .replace(/http:\/\/localhost:\d+(?=\/api\/uploads\/)/g, '')
                    // Migrate legacy /uploads/ paths → /api/uploads/
                    .replace(/(?<!\/api)\/uploads\//g, '/api/uploads/')
            );
            return originalJson(sanitized);
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
    bucket.find({ filename: gridName }).toArray()
        .then(files => {
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

            res.set('Content-Type', file.contentType || 'application/octet-stream');
            // Filenames contain unique timestamps — safe to cache long-term + immutable
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            res.set('ETag', etag);
            if (lastModified) res.set('Last-Modified', lastModified);
            if (file.length) res.set('Content-Length', String(file.length));

            const downloadStream = bucket.openDownloadStreamByName(gridName);
            downloadStream.pipe(res);
            downloadStream.on('error', () => {
                if (!res.headersSent) res.status(404).end();
            });
        })
        .catch(err => {
            console.error('GridFS serve error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Error retrieving file' });
        });
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
    console.log('User connected:', socket.id);

    socket.on('join_user_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);
    });

    socket.on('typing', ({ recipientId, senderId }) => {
        io.to(recipientId).emit('user_typing', { senderId });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('Alumni Association API is running');
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

server.listen(Number(PORT), HOST, () => {
    console.log('\\n===========================================');
    console.log('  Alumni Association Server Started');
    console.log('===========================================');
    console.log(`  Local:    http://localhost:${PORT}`);
    
    const localIPs = getLocalIPs();
    if (localIPs.length > 0) {
        console.log('\\n  Network Access URLs:');
        localIPs.forEach(ip => {
            console.log(`    ➜  http://${ip}:${PORT}`);
        });
        console.log('\\n  Share these URLs with other computers');
        console.log('  on your college network!');
    }
    console.log('===========================================\\n');});

// Connect to Database, then run GC (GridFS needs an active connection)
connectDB().then(() => {    // Run GC on startup and schedule periodic runs every 6 hours
    runGC().catch((e) => console.error('Initial GC error', e));
    setInterval(() => {
        runGC().catch((e) => console.error('Scheduled GC error', e));
    }, 1000 * 60 * 60 * 6);
});
