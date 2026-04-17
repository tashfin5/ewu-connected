import express from 'express';
// Make sure you add deleteResource to this import list!
import { getResourcesByCourse, uploadResource, deleteResource, rateResource } from '../controllers/resourceController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/:courseCode', getResourcesByCourse);
router.post('/upload', protect, upload.single('file'), uploadResource);
router.post('/:id/rate', protect, rateResource);

// 🚨 Add this Delete Route! 
router.delete('/:id', protect, deleteResource);

export default router;