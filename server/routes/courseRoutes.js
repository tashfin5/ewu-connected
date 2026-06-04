import express from 'express';
import { getCourses, getCoursesByDept, addCourse, deleteCourse, requestCourse, getCourseRequests, updateCourseRequestStatus } from '../controllers/courseController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/requests', protect, requestCourse);
router.get('/requests', protect, admin, getCourseRequests);
router.put('/requests/:id', protect, admin, updateCourseRequestStatus);

router.get('/', protect, getCourses);
router.get('/:deptId', getCoursesByDept);
router.post('/', protect, admin, addCourse); 
router.delete('/:id', protect, admin, deleteCourse);

export default router;