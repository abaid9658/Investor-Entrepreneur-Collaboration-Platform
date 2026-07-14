import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import meetingRoutes from './routes/meeting.js';
import chatRoutes from './routes/chat.js';
import documentRoutes from './routes/document.js';
import notificationRoutes from './routes/notification.js';
import paymentRoutes from './routes/payment.js';
import dealRoutes from './routes/deals.js';
import supportRoutes from './routes/support.js';

import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

const app = express();

// ─── 0. TRUST PROXY ──────────────────────────────────────────────────────────
// Required on Render/Heroku/Railway — they sit behind a reverse proxy that sets
// X-Forwarded-For. Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// on every single request (including OPTIONS preflight), breaking CORS.
app.set('trust proxy', 1);

// ─── 1. CORS — Must be FIRST so headers survive even if later middleware throws ─
// Accepts: any *.vercel.app preview/prod URL, explicitly configured FRONTEND_URL,
// and localhost for local development.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain (handles all preview deployment hashes)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Block everything else
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Handle OPTIONS preflight for ALL routes — must come before helmet & rate limiter
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── 2. SECURITY MIDDLEWARE ───────────────────────────────────────────────────
app.use(helmet());

// Parsers & limits to prevent payload size abuse
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize inputs to prevent MongoDB Query Injection
app.use(mongoSanitize());

// HTTP Parameter Pollution protection
app.use(hpp());

// Response body compression
app.use(compression());

// Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── 3. RATE LIMITER ─────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── 4. API ROUTES ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/support', supportRoutes);

// Health check endpoints (useful for Render uptime monitoring)
app.get('/', (_req, res) => res.status(200).json({ status: 'ok', service: 'Nexus API Gateway' }));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// ─── 5. 404 CATCH-ALL ────────────────────────────────────────────────────────
app.use('*', (req, res, next) => {
  const err = new Error(`Endpoint '${req.originalUrl}' not found`);
  err.statusCode = 404;
  next(err);
});

// ─── 6. GLOBAL ERROR HANDLER ─────────────────────────────────────────────────
app.use(errorHandler);

export default app;
