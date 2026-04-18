import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Setup Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mwtsfn@gmail.com', 
    pass: 'ywcy siru aehj ujic' 
  }
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
export const registerUser = async (req, res) => {
    try {
        const { name, email, student_id, studentId, password } = req.body;
        const finalStudentId = student_id || studentId;

        if (password.length <= 6) return res.status(400).json({ message: "Password must be more than 6 characters." });
        if (!email.endsWith('@std.ewubd.edu') && !email.endsWith('@ewubd.edu')) {
        return res.status(400).json({ message: "Must be a valid EWU email." });
        }

        if (!finalStudentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        const userExists = await User.findOne({ $or: [{ email }, { student_id: finalStudentId }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or Student ID already exists' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name, 
            email, 
            student_id: finalStudentId, 
            password: hashedPassword,
            verificationOTP: otp,
            otpExpires: Date.now() + 10 * 60 * 1000 // 10 mins
        });

        await transporter.sendMail({
            from: '"EWU ConnectED" <noreply@ewuconnected.com>',
            to: email,
            subject: 'Verify Your Account',
            html: `<h1>Your Verification Code is: ${otp}</h1>`
        });

        res.status(200).json({ message: "Verification code sent to email." });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Authenticate a user (Login)
export const loginUser = async (req, res) => {
    try {
        const { student_id, studentId, password } = req.body;
        const finalStudentId = student_id || studentId;

        const user = await User.findOne({ student_id: finalStudentId });

        if (user && (await bcrypt.compare(password, user.password))) {
            
            // 🚨 THE BRICK WALL: Check verification BEFORE allowing login
            if (user.isVerified === false) {
                return res.status(403).json({ 
                    isVerified: false, 
                    email: user.email, // Required for the frontend OTP screen to know where to send the code
                    message: "Please verify your email before logging in." 
                });
            }

            // If verified, proceed with normal login payload
            res.json({
                _id: user._id, 
                name: user.name, 
                email: user.email,
                student_id: user.student_id, 
                role: user.role,
                savedResources: user.savedResources,
                profilePicture: user.profilePicture || "",
                points: user.points || 0,
                // 🚨 CRITICAL FIX 1: Send these back when logging in!
                cgpa: user.cgpa || '0.00',     
                credits: user.credits || '0',  
                isVerified: user.isVerified, // Include this in the success payload too
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid Student ID or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, student_id, studentId, email, oldPassword, newPassword, cgpa, credits } = req.body;
    const finalStudentId = student_id || studentId;

    if (newPassword && newPassword.trim() !== "") {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt); 
    }

    user.name = name || user.name;
    user.student_id = finalStudentId || user.student_id;
    user.email = email || user.email;
    
    // 🚨 CRITICAL FIX 2: Actually save the incoming data to the database
    user.cgpa = cgpa || user.cgpa;
    user.credits = credits || user.credits;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      student_id: updatedUser.student_id,
      profilePicture: updatedUser.profilePicture,
      role: updatedUser.role,
      points: updatedUser.points,
      // 🚨 CRITICAL FIX 3: Send the updated data back to the frontend
      cgpa: updatedUser.cgpa,
      credits: updatedUser.credits,
      token: req.headers.authorization.split(' ')[1],
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    await transporter.sendMail({
      from: '"EWU ConnectED" <noreply@ewuconnected.com>',
      to: user.email,
      subject: 'Password Reset Code',
      html: `<h2>Your Password Reset Code is: <b>${otp}</b></h2><p>This code will expire in 10 minutes.</p>`
    });

    res.json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ 
      email, 
      verificationOTP: otp, 
      otpExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now login." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};