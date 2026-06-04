import mongoose from 'mongoose';

const courseRequestSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true },
    courseTitle: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

const CourseRequest = mongoose.model('CourseRequest', courseRequestSchema);

export default CourseRequest;
