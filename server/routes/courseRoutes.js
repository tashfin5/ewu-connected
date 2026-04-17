import express from 'express';
import { getCourses, getCoursesByDept, addCourse, deleteCourse } from '../controllers/courseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCourses);
router.get('/:deptId', getCoursesByDept);
router.post('/', protect, admin, addCourse); 
router.delete('/:id', protect, admin, deleteCourse);

export default router;