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

import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

const app = express();

// 1. SECURITY MIDDLEWARE (OWASP Compliant configurations)
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
}));

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

// Logger configuration
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// 2. RATE LIMITER
app.use('/api', apiLimiter);

// 3. API ENDPOINTS WIRE-UP
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// Catch undefined router calls (404)
app.use('*', (req, res, next) => {
  const err = new Error(`Requested endpoint resource '${req.originalUrl}' not found`);
  err.statusCode = 404;
  next(err);
});

// 4. GLOBAL ERROR EXCEPTION HANDLER
app.use(errorHandler);

export default app;
