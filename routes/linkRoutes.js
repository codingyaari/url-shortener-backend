import express from 'express';
import {
  createLink,
  getLinks,
  getLink,
  updateLink,
  deleteLink,
  getLinkBySlug,
} from '../controllers/linkController.js';
import { getLinkAnalyticsBySlug } from '../controllers/clickController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateCreateLink = [
  body('destinationUrl').isURL().withMessage('Please provide a valid URL'),
  validate,
];

const validateUpdateLink = [
  body('destinationUrl').optional().isURL().withMessage('Please provide a valid URL'),
  validate,
];

// Public route for redirect (no auth required) - must be before auth middleware
router.get('/slug/:slug', getLinkBySlug);

// All other routes require authentication
router.use(protect);

router.post('/', validateCreateLink, createLink);
router.get('/', getLinks);
// Analytics route must come before /:id to avoid route conflicts
router.get('/analytics/:slug', getLinkAnalyticsBySlug);
router.get('/:id', getLink);
router.put('/:id', validateUpdateLink, updateLink);
router.delete('/:id', deleteLink);

export default router;
