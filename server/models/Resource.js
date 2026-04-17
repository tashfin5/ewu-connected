import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  
  // File must be an object matching this structure
  file: {
    url: { type: String, required: true },
    fileType: { type: String }
  },
  
  // Must be 'uploader' to match your frontend expectations
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // 🚨 Crucial for Filtering
  courseCode: { type: String, required: true }, 
  department: { type: String, required: true },
  
  // (Optional: keep your other fields below)
  averageRating: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;