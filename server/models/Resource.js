import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  
  file: {
    url: { type: String, required: true },
    fileType: { type: String }
  },
  
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseCode: { type: String, required: true }, 
  department: { type: String, required: true },
  
  averageRating: { type: Number, default: 0 },
  
  // 🚨 THIS IS THE FIX: The database will now remember individual user ratings!
  ratings: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      value: { type: Number, required: true }
  }],
  
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Resource = mongoose.model('Resource', resourceSchema);
export default Resource;