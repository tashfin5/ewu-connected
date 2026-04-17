import express from 'express';
import { createGroup, getMyGroups, createTask, getGroupTasks } from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js'; // Import our bouncer!

const router = express.Router();

// Group Routes
router.post('/groups', protect, createGroup); // Protect means a token is required
router.get('/groups', protect, getMyGroups);

// Task Routes
router.post('/', protect, createTask);
router.get('/:groupId', protect, getGroupTasks);

export default router;