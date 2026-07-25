import express from 'express';
import {
  createLink,
  getLinks,
  getLink,
  updateLink,
  deleteLink,
  getLinkBySlug,
  unlockLinkBySlug,
  getOverviewStats,
} from '../controllers/linkController.js';
import { getLinkAnalyticsBySlug } from '../controllers/clickController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

const validateCreateLink = [
  body('destinationUrl').isURL({ require_protocol: true }).withMessage('Please provide a valid URL'),
  validate,
];

const validateUpdateLink = [
  body('destinationUrl').optional().isURL({ require_protocol: true }).withMessage('Please provide a valid URL'),
  validate,
];

// Public
router.get('/slug/:slug', getLinkBySlug);
router.post('/slug/:slug/unlock', unlockLinkBySlug);

// Private
router.use(protect);

router.post('/', validateCreateLink, createLink);
router.get('/', getLinks);
router.get('/stats/overview', getOverviewStats);
router.get('/analytics/:slug', getLinkAnalyticsBySlug);
router.get('/:id', getLink);
router.put('/:id', validateUpdateLink, updateLink);
router.delete('/:id', deleteLink);

export default router;
