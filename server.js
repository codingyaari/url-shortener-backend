import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import os from 'os';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import linkRoutes from './routes/linkRoutes.js';
import clickRoutes from './routes/clickRoutes.js';

// Load environment variables
dotenv.config();

// Connect to database (async)
connectDB()

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colored output for development
} else {
  app.use(morgan('combined')); // Standard Apache combined log format for production
}

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/clicks', clickRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test endpoint is working!',
    timestamp: new Date().toISOString(),
    server: 'URL Shortener Backend',
    version: '1.0.0',
  });
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;


app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});
