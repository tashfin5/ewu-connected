import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Removed nodemailer as Render blocks SMTP port 465
// Instead, we will use Brevo's HTTP API (which goes over port 443 and is not blocked)

const sendEmailHTTP = async (toEmail, subject, htmlContent) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { 
        email: process.env.EMAIL_USER, // The Gmail address you verified in Brevo
        name: "EWU ConnectED" 
      },
      to: [{ email: toEmail }],
      subject: subject,
      htmlContent: htmlContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Brevo API Error:", errorData);
    throw new Error('Failed to send email via Brevo HTTP API');
  }
  return await response.json();
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
export const registerUser = async (req, res) => {
    try {
        const { name, email, student_id, studentId, password } = req.body;
        const finalStudentId = student_id || studentId;

        if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
        if (!email.endsWith('@std.ewubd.edu') && !email.endsWith('@ewubd.edu')) {
        return res.status(400).json({ message: "Must be a valid EWU email." });
        }

        if (!finalStudentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        let userExists = await User.findOne({ $or: [{ email }, { student_id: finalStudentId }] });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (userExists) {
            if (userExists.isVerified) {
                return res.status(400).json({ message: 'User with this email or Student ID already exists' });
            }
            // User exists but unverified: update their details and resend OTP
            userExists.name = name;
            userExists.password = hashedPassword;
            userExists.verificationOTP = otp;
            userExists.otpExpires = Date.now() + 10 * 60 * 1000;
            await userExists.save();
        } else {
            await User.create({
                name, 
                email, 
                student_id: finalStudentId, 
                password: hashedPassword,
                verificationOTP: otp,
                otpExpires: Date.now() + 10 * 60 * 1000 // 10 mins
            });
        }

        try {
            await sendEmailHTTP(
                email,
                'Verify Your Account',
                `<h1>Your Verification Code is: ${otp}</h1>`
            );
            res.status(200).json({ message: "Verification code sent to email." });
        } catch (mailError) {
            console.error("Mail Error:", mailError);
            res.status(500).json({ message: "Failed to send verification email. Please check configuration." });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Authenticate a user (Login)
export const loginUser = async (req, res) => {
    try {
        const { student_id, studentId, password } = req.body;
        const finalStudentId = student_id || studentId;

        const user = await User.findOne({ 
            $or: [
                { student_id: finalStudentId },
                { email: finalStudentId }
            ]
        });

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

    await sendEmailHTTP(
      user.email,
      'Password Reset Code',
      `<h2>Your Password Reset Code is: <b>${otp}</b></h2><p>This code will expire in 10 minutes.</p>`
    );

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