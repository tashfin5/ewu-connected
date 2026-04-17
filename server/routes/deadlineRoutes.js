import express from 'express';
import { getDeadlines, createDeadline, deleteDeadline } from '../controllers/deadlineController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getDeadlines)
  .post(protect, createDeadline);
  
router.delete('/:id', protect, deleteDeadline);

export default router;