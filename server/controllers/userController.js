import User from '../models/User.js';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import Notification from '../models/Notification.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const toggleSaveResource = async (req, res) => {
  try {
    const userId = req.user._id; // From your authMiddleware
    const resourceId = req.params.id;

    const user = await User.findById(userId);

    // Check if already saved
    const isSaved = user.savedResources.includes(resourceId);

    if (isSaved) {
      // If it is saved, remove it (Unsave)
      user.savedResources = user.savedResources.filter(id => id.toString() !== resourceId);
    } else {
      // If not saved, add it
      user.savedResources.push(resourceId);
    }

    await user.save();
    res.status(200).json({ message: isSaved ? "Removed from saved" : "Saved successfully", savedResources: user.savedResources });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

import Resource from '../models/Resource.js'; // Ensure Resource is imported!

// @desc    Get user's uploaded and saved notes
// @route   GET /api/users/my-notes
// @access  Private
export const getUserNotes = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find notes the user uploaded
    const uploadedNotes = await Resource.find({ uploadedBy: userId })
                                        .populate('uploadedBy', 'name');

    // 2. Find the user document and populate their savedResources array
    const user = await User.findById(userId).populate({
      path: 'savedResources',
      populate: { path: 'uploadedBy', select: 'name' } // Fetch the author names too!
    });

    res.json({
      uploaded: uploadedNotes,
      saved: user.savedResources
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user notes", error: error.message });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    // Fetch users, sort by highest points, limit to top 50
    // Change it to this temporarily:
    const leaders = await User.find({})
                              .select('name points profilePicture department')
                              .sort({ points: -1 })
                              .select('name department points')
                              .limit(20);
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaderboard" });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // req.file.path is provided by the Cloudinary storage engine
    user.profilePicture = req.file.path;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      student_id: updatedUser.student_id,
      points: updatedUser.points || 0,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// --- FORGOT PASSWORD (SEND OTP) ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "No account found with this email." });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP and Expiry (10 mins) to database
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // The 16-digit App Password
      }
    });

    await transporter.sendMail({
      from: '"EWU ConnectED" <noreply@ewuconnected.com>',
      to: user.email,
      subject: 'Your Password Reset Code',
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2>Password Reset Request</h2>
              <p>You requested a password reset. Use the code below to update your password:</p>
              <h1 style="color: #2563eb; letter-spacing: 5px;">${otp}</h1>
              <p>This code expires in 10 minutes.</p>
             </div>`
    });

    res.json({ message: "OTP sent to your email!" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email", error: error.message });
  }
};

// --- RESET PASSWORD (VERIFY OTP & UPDATE) ---
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // 🚨 MANUALLY HASH IT HERE 
    // This bypasses any issues with the Mongoose pre-save hook
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(newPassword, salt);

    // Update the fields
    user.password = hashedPass; 
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;

    // Save the already-hashed password
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Reset failed", error: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};