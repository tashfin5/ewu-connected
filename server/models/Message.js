import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  image: { type: String },
  isUnsent: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  reactions: [{
    emoji: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  }]
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);