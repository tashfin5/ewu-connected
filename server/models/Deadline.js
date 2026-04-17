import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  course: { type: String, required: true },
  type: { type: String, enum: ['Assignment', 'Exam', 'Project', 'Other'], default: 'Assignment' },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }
}, { timestamps: true });

export default mongoose.model('Deadline', deadlineSchema);