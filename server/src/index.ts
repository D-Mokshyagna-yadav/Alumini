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

// Connect to Database
connectDB();

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
import path from 'path';
import runGC from './scripts/gcUploads';

// ... (other imports)

// Socket.io Middleware to make io available in routes
app.use((req, res, next) => {
    (req as any).io = io;
    next();
});

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, '../uploads')));

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
    console.log('===========================================\\n');
    // Run GC on startup and schedule periodic runs every 6 hours
    runGC().catch((e) => console.error('Initial GC error', e));
    setInterval(() => {
        runGC().catch((e) => console.error('Scheduled GC error', e));
    }, 1000 * 60 * 60 * 6);
});
