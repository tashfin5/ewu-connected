import express from 'express';
// 🚨 1. Added getLeaderboard to your imports
import { 
  toggleSaveResource, 
  getUserNotes, 
  getLeaderboard, 
  updateProfilePicture, // 🚨 Added
  forgotPassword,       // 🚨 Added
  resetPassword         // 🚨 Added
} from '../controllers/userController.js';
import { getNotifications, markAsRead } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// 🚨 2. Added the leaderboard route right here at the top!
router.get('/leaderboard', getLeaderboard);

router.post('/save-resource/:id', protect, toggleSaveResource);
router.get('/my-notes', protect, getUserNotes);
router.put('/profile-picture', protect, upload.single('image'), updateProfilePicture);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read', protect, markAsRead);

export default router;