import express from 'express';
import { 
    getResourcesByCourse, 
    uploadResource, 
    deleteResource, 
    rateResource, 
    downloadResource, 
    saveResource 
} from '../controllers/resourceController.js';

// Add any middleware you use for auth/uploads here
import { protect } from '../middleware/authMiddleware.js'; 
import upload from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

// 🚨 THIS MUST BE FIRST
router.post('/upload', protect, upload.single('file'), uploadResource);

// PUT THESE NEXT
router.delete('/:id', protect, deleteResource);
router.post('/:id/rate', protect, rateResource);
router.post('/:id/download', protect, downloadResource);
router.post('/:id/save', protect, saveResource);

// 🚨 THIS MUST BE LAST
router.get('/:courseCode', getResourcesByCourse);

export default router;