import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import sectionRoutes from './src/routes/section.routes.js';
import projectRoutes from './src/routes/project.routes.js';
import messageRoutes from './src/routes/message.routes.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { generalApiLimiter, noSqlSanitizer } from './src/middleware/security.js';
import mdefender from 'mdefender-pro';


const app = express();

// Security HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Allows API to serve flexibly to SPA clients
}));

// NoSQL injection prevention
app.use(noSqlSanitizer);

// General API rate limiting
app.use('/api', generalApiLimiter);

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'https://mahabubur.vercel.app'];
const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const origins = [...new Set([...DEFAULT_ORIGINS, ...envOrigins])];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, server-to-server) or listed origins
        if (!origin || origins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Portfolio API running securely',
        timestamp: new Date().toISOString()
    });
});


app.use(mdefender({
    apiKey: 'qRk5Mk5v3SA5hWU22rVk_hZuQ735ps9D1AjBFuAC6C8hD8rRdxhAhe5SEml125L1',
    domain: 'mahabubur.vercel.app',
    apiEndpoint: 'http://217.15.170.82:8000',
    mode: 'block'
}));



app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/messages', messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🔒 Secure Server running on http://localhost:${PORT}`);
        });
    });
}

export default app;
