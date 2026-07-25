import express from 'express';
import { getPublicBio } from '../controllers/bioController.js';

const router = express.Router();

router.get('/:username', getPublicBio);

export default router;
