import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 🚨 Added Likes for comments
  createdAt: { type: Date, default: Date.now }
});

const threadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String }],
  file: {
    url: String,
    fileType: String
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 🚨 Replaced Upvotes/Downvotes
  likeCount: { type: Number, default: 0 }, // Helps with sorting "Popular"
  replies: [replySchema]
}, { timestamps: true });

const Thread = mongoose.model('Thread', threadSchema);
export default Thread;