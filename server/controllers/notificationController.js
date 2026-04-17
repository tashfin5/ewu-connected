import Notification from '../models/Notification.js';
import Deadline from '../models/Deadline.js';

export const getUserNotifications = async (req, res) => {
  try {
    // ==========================================
    // 1. SMART 24h DEADLINE SCANNER
    // ==========================================
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const urgentDeadlines = await Deadline.find({
        user: req.user._id, 
        dueDate: { $gte: now, $lte: tomorrow }
      });

      for (const deadline of urgentDeadlines) {
        const messageText = `Urgent: "${deadline.title}" is due in less than 24 hours!`;
        
        const alreadyNotified = await Notification.findOne({
          recipient: req.user._id,
          type: 'reminder',
          message: messageText
        });

        if (!alreadyNotified) {
          await Notification.create({
            recipient: req.user._id,
            sender: req.user._id, // 🚨 FIXED: Added sender to prevent schema crash!
            type: 'reminder', 
            title: 'Deadline Approaching ⏰',
            message: messageText,
            link: '/alerts'
          });
        }
      }
    } catch (deadlineError) {
      // If Deadline model fails/isn't fully set up yet, skip gracefully instead of crashing
      console.log("Skipping deadline check:", deadlineError.message);
    }
    // ==========================================

    // 2. Fetch all notifications
    let notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 });

    // ==========================================
    // 3. WELCOME NOTIFICATION FOR NEW ACCOUNTS
    // ==========================================
    if (notifications.length === 0) {
        const welcomeNotif = await Notification.create({
            recipient: req.user._id,
            sender: req.user._id, // 🚨 FIXED: Added sender to prevent schema crash!
            type: 'system',
            title: 'Welcome to EWU ConnectED! 🎉',
            message: 'We are thrilled to have you! Start by exploring the repository, joining a group, or introducing yourself in the public threads.',
            link: '/repository'
        });
        
        // Push the newly created notification to the frontend instantly
        notifications = [{
            ...welcomeNotif.toObject(),
            // Mock a populated sender so the frontend doesn't crash trying to read sender.name
            sender: { _id: req.user._id, name: "System" } 
        }]; 
    }

    res.json(notifications);
  } catch (error) {
    console.error("Notification Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: "All marked as read" });
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

export const markSingleAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(notification);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};