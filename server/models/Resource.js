import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseCode: { type: String, required: true, uppercase: true },
  department: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String, required: true }, // URL to Google Drive/Cloudinary
  category: { type: String, default: 'General' }, // e.g., 'Notes', 'Practice'
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Add these right below your category or description fields!
  ratings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      value: { type: Number, required: true }
    }
  ],
  rating: { type: Number, default: 0 }, // The average rating
}, { timestamps: true });

export default mongoose.model('Resource', resourceSchema);