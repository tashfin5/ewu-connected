import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true }, // e.g., CSE101
  title: { type: String, required: true }, // e.g., Structured Programming
  year: { type: String, required: true }, // e.g., First Year
  department: { type: String, required: true } // e.g., cse
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);