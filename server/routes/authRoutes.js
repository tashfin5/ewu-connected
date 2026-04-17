import express from 'express';
import { registerUser, loginUser, updateProfile, verifyOTP } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
// THIS IS THE LINE THAT MAKES THE BUTTON WORK:
router.put('/update-profile', protect, updateProfile);
router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);

export default router;