import express from 'express';
import { trackClick, getLinkAnalytics } from '../controllers/clickController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Track click (public route)
router.post('/', trackClick);

// Get analytics (private route)
router.get('/links/:id/analytics', protect, getLinkAnalytics);

export default router;
