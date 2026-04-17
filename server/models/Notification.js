import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }, 
  type: { 
    type: String, 
    // 🚨 FIXED: Added 'reminder' and 'group' to match our controller logic
    enum: ['upvote', 'reply', 'system', 'deadline', 'announcement', 'reminder', 'group'], 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  link: { 
    type: String 
  }, 
  isRead: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;