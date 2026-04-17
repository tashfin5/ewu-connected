import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        student_id: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        cgpa: { type: String, default: '0.00' },
        credits: { type: String, default: '0' },
        profilePicture: { type: String, default: "" },
        points: { type: Number, default: 0 },
        resetPasswordOTP: { type: String },
        resetPasswordExpires: { type: Date },
        isVerified: { type: Boolean, default: false },
        verificationOTP: { type: String },
        otpExpires: { type: Date },
        reputation_points: { type: Number, default: 0 }, // For your gamification system!
        role: { type: String, enum: ['student', 'admin'], default: 'student' },
        savedResources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

const User = mongoose.model('User', userSchema);

userSchema.pre('save', async function (next) {
  // If the password is NOT modified OR if it's already a bcrypt hash, skip
  if (!this.isModified('password') || this.password.startsWith('$2b$')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default User;