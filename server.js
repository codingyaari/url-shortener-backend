import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import linkRoutes from './routes/linkRoutes.js';
import clickRoutes from './routes/clickRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import bioRoutes from './routes/bioRoutes.js';

dotenv.config();

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://shortener.codingyari.com',
  'https://www.shortener.codingyari.com',
];

const allowedOrigins = [
  ...new Set(
    `${process.env.CORS_ORIGIN || ''},${defaultOrigins.join(',')}`
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean)
  ),
];

app.use(cors({
  origin(origin, callback) {
    // Same-origin / server-to-server / curl often send no Origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Return false (not Error) so the browser still gets a clean CORS failure
    console.warn(`[cors] blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use('/api/', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'urlbeam-api',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/clicks', clickRoutes);
app.use('/api/bio', bioRoutes);
app.use('/r', redirectRoutes);

app.get('/api/test', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Urlbeam API is running',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Urlbeam API running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
