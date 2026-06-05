import Thread from '../models/Thread.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const extractMentions = (content) => {
  if (!content) return [];
  const mentions = [];
  const regex = /@\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
};

export const getThreads = async (req, res) => {
  try {
    const { sort } = req.query;
    let threads = Thread.find()
      .populate('author', 'name profilePicture')
      .populate('replies.author', 'name profilePicture');
    
    // Sort by likes instead of upvotes
    if (sort === 'popular') {
      threads = threads.sort({ likeCount: -1 });
    } else {
      threads = threads.sort({ createdAt: -1 });
    }

    res.json(await threads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CREATE A NEW THREAD ---
export const createThread = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    
    let fileData = {};
    if (req.file) {
      fileData = {
        url: req.file.path, // This is the Cloudinary URL
        fileType: req.file.mimetype.includes('pdf') ? 'pdf' : 'image'
      };
    }

    const thread = await Thread.create({
      title,
      content,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      author: req.user._id, // Coming from 'protect' middleware
      file: req.file ? fileData : undefined
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 50 } });

    // 🚨 SEND MENTION NOTIFICATIONS
    const mentionedUserIds = extractMentions(content);
    for (const userId of mentionedUserIds) {
      if (userId !== req.user._id.toString()) {
        await Notification.create({
          recipient: userId,
          sender: req.user._id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.name} mentioned you in a thread: "${title}"`,
          link: `/threads`
        });
      }
    }

    const populatedThread = await thread.populate('author', 'name profilePicture');
    res.status(201).json(populatedThread);
  } catch (error) {
    console.error("Backend Create Error:", error);
    res.status(400).json({ message: error.message });
  }
};

// --- REPLY TO A THREAD (AND SEND NOTIFICATION) ---
export const createReply = async (req, res) => {
  try {
    const { id } = req.params; // This is the Thread ID
    const { content } = req.body;

    const thread = await Thread.findById(id);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Define variables for the notification
    const threadAuthorId = thread.author; 
    const threadTitle = thread.title;

    // Add the reply to the thread
    thread.replies.push({
      author: req.user._id,
      content,
      replyTo: req.body.replyTo || undefined
    });

    await thread.save();

    // 🚨 SEND NOTIFICATION TO THREAD AUTHOR
    if (threadAuthorId.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: threadAuthorId,
        sender: req.user._id,
        type: 'reply',
        title: 'New Reply',
        message: `${req.user.name} commented on your thread: "${threadTitle}"`,
        link: `/threads` 
      });
    }

    // 🚨 SEND MENTION NOTIFICATION TO COMMENT AUTHOR
    if (req.body.replyTo) {
      const parentReply = thread.replies.id(req.body.replyTo);
      if (parentReply && parentReply.author.toString() !== req.user._id.toString() && parentReply.author.toString() !== threadAuthorId.toString()) {
        await Notification.create({
          recipient: parentReply.author,
          sender: req.user._id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.name} replied to your comment on "${threadTitle}"`,
          link: `/threads`
        });
      }
    }

    // 🚨 SEND MENTION NOTIFICATIONS IN COMMENT CONTENT
    const mentionedUserIds = extractMentions(content);
    for (const userId of mentionedUserIds) {
      if (userId !== req.user._id.toString()) {
        await Notification.create({
          recipient: userId,
          sender: req.user._id,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.name} mentioned you in a comment on "${threadTitle}"`,
          link: `/threads`
        });
      }
    }

    // Populate the newly added reply author before sending back
    const populatedThread = await thread.populate('replies.author', 'name profilePicture');
    res.status(201).json(populatedThread);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const toggleLikeThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const index = thread.likes.indexOf(req.user._id);
    if (index === -1) {
      thread.likes.push(req.user._id); // Add Like
      thread.likeCount += 1;
    } else {
      thread.likes.splice(index, 1); // Remove Like
      thread.likeCount -= 1;
    }
    
    await thread.save();
    res.json(thread);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🚨 Like a Comment/Reply
export const toggleLikeReply = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.threadId);
    const reply = thread.replies.id(req.params.replyId); // Get specific comment
    
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const index = reply.likes.indexOf(req.user._id);
    if (index === -1) {
      reply.likes.push(req.user._id); // Add Like
    } else {
      reply.likes.splice(index, 1); // Remove Like
    }
    
    await thread.save();
    res.json(thread);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ... existing imports and functions ...

// 🚨 GET USER'S OWN THREADS (For Profile Tab)
export const getUserThreads = async (req, res) => {
  try {
    const threads = await Thread.find({ author: req.user._id }).sort({ createdAt: -1 });
    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🚨 DELETE A THREAD (Admin or Author)
export const deleteThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Check if the user is the author OR an admin
    if (thread.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized to delete this thread" });
    }

    await thread.deleteOne();
    res.json({ message: "Thread deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🚨 UPDATE A THREAD
export const updateThread = async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Only the author can edit
    if (thread.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this thread" });
    }

    thread.title = req.body.title || thread.title;
    thread.content = req.body.content || thread.content;
    thread.tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : thread.tags;

    // If they uploaded a new file, replace the old one
    if (req.file) {
      thread.file = {
        url: req.file.path,
        fileType: req.file.mimetype.includes('pdf') ? 'pdf' : 'image'
      };
    }

    await thread.save();
    
    const populatedThread = await thread.populate('author', 'name profilePicture');
    res.json(populatedThread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🚨 NEW: DELETE A REPLY/COMMENT
export const deleteReply = async (req, res) => {
  try {
    const { threadId, replyId } = req.params;

    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const reply = thread.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const requesterId = req.user._id.toString();
    const isCommentAuthor = reply.author.toString() === requesterId;
    const isPostOwner = thread.author.toString() === requesterId;
    const isAdmin = req.user.role === 'admin';

    // Allow deletion if the user is the comment author, post owner, or an admin
    if (!isCommentAuthor && !isPostOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    // Pull the reply out of the array
    thread.replies.pull(replyId);
    await thread.save();

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🚨 NEW: UPDATE A REPLY/COMMENT
export const updateReply = async (req, res) => {
  try {
    const { threadId, replyId } = req.params;
    const { content } = req.body;

    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const reply = thread.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (reply.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this comment" });
    }

    reply.content = content || reply.content;
    
    // Parse mentions from the new content
    const mentionRegex = /@\[.*?\]\((.*?)\)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      if (!mentions.includes(match[1])) {
        mentions.push(match[1]);
      }
    }
    reply.mentions = mentions;

    await thread.save();

    res.status(200).json(thread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};