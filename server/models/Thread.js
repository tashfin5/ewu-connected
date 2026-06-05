import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // 🚨 Added Likes for comments
  replyTo: { type: mongoose.Schema.Types.ObjectId }, // To support 1-level deep nested replies
  image: { type: String }, // Store uploaded image URL
  createdAt: { type: Date, default: Date.now },
  isEdited: { type: Boolean, default: false }
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