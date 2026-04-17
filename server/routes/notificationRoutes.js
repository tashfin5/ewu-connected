import express from 'express';
import { 
  getUserNotifications, 
  markAllAsRead, 
  markSingleAsRead 
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUserNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markSingleAsRead);

export default router;