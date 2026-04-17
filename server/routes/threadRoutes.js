import express from 'express';
import { 
  getThreads, 
  createThread, 
  toggleLikeThread, 
  toggleLikeReply,  
  createReply,
  getUserThreads,
  deleteThread,
  updateThread // 🚨 Added import
} from '../controllers/threadController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getThreads);
router.get('/my-threads', protect, getUserThreads); 
router.post('/', protect, upload.single('file'), createThread);

// 🚨 Added PUT route for editing
router.put('/:id', protect, upload.single('file'), updateThread); 
router.delete('/:id', protect, deleteThread); 

router.post('/:id/like', protect, toggleLikeThread);
router.post('/:threadId/reply/:replyId/like', protect, toggleLikeReply);
router.post('/:id/reply', protect, createReply);

export default router;