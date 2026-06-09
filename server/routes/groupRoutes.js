import express from 'express';
import { 
  createGroup, getUserGroups, getGroupDetails, deleteGroup,
  addMember, removeMember, createTask, updateTaskStatus, deleteTask, sendMessage,
  editMessage, unsendMessage, toggleReaction,
  getTotalUnreadMessages, markGroupRead
} from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Group operations
router.post('/', protect, createGroup);
router.get('/', protect, getUserGroups);
router.get('/unread/total', protect, getTotalUnreadMessages);
router.get('/:id', protect, getGroupDetails);
router.put('/:id/read', protect, markGroupRead);
router.delete('/:id', protect, deleteGroup);

// Member operations
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);

// 🚨 TASK OPERATIONS (Fixed URLs to match frontend exactly)
router.post('/:id/tasks', protect, createTask);
router.put('/:id/tasks/:taskId', protect, updateTaskStatus);
router.delete('/:id/tasks/:taskId', protect, deleteTask);
// Ensure this matches the params used in the controller
router.delete('/:groupId/members/:memberId', protect, removeMember);

// Chat operations
router.post('/:id/messages', protect, upload.single('file'), sendMessage);
router.put('/:id/messages/:messageId', protect, editMessage);
router.delete('/:id/messages/:messageId', protect, unsendMessage);
router.put('/:id/messages/:messageId/react', protect, toggleReaction);

export default router; 