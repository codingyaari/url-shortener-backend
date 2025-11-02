import express from 'express';
import { googleLogin, adminLogin, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation middleware for Google login
const validateGoogleLogin = [
  body('idToken').notEmpty().withMessage('Google ID token is required'),
  validate,
];

// Validation middleware for admin login
const validateAdminLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// Google social login - handles both registration and login
router.post('/google', authLimiter, validateGoogleLogin, googleLogin);

// Admin/Owner login (only for you)
router.post('/admin', authLimiter, validateAdminLogin, adminLogin);

// Get current authenticated user
router.get('/me', protect, getMe);

export default router;
