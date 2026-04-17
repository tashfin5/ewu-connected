import Group from '../models/Group.js';
import Task from '../models/Task.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// --- GROUP MANAGEMENT ---
export const createGroup = async (req, res) => {
  try {
    const group = await Group.create({
      name: req.body.name,
      description: req.body.description,
      admin: req.user._id,
      members: [req.user._id]
    });
    res.status(201).json(group);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id }).populate('admin', 'name profilePicture');
    res.json(groups);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name student_id profilePicture')
      .populate('admin', 'name');
    
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    const tasks = await Task.find({ group: req.params.id }).populate('assignedTo assignedBy', 'name profilePicture');
    const messages = await Message.find({ group: req.params.id }).populate('sender', 'name profilePicture').sort({ createdAt: 1 });

    res.json({ group, tasks, messages });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (group.admin.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can delete' });
    
    await Task.deleteMany({ group: req.params.id });
    await Message.deleteMany({ group: req.params.id });
    await group.deleteOne();
    
    res.json({ message: 'Group deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- MEMBER MANAGEMENT ---
export const addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (group.admin.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can add members' });

    const userToAdd = await User.findOne({ student_id: req.body.student_id });
    if (!userToAdd) return res.status(404).json({ message: 'Student not found' });
    if (group.members.includes(userToAdd._id)) return res.status(400).json({ message: 'Already a member' });

    group.members.push(userToAdd._id);
    await group.save();

    await Notification.create({
      recipient: userToAdd._id,
      sender: req.user._id,
      type: 'system', // 🚨 FIXED ENUM ERROR
      title: 'Added to Workspace',
      message: `${req.user.name} added you to the group "${group.name}"`,
      link: `/groups`
    });

    res.json(group);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

export const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (group.admin.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only admin can kick members' });
    if (req.params.userId === group.admin.toString()) return res.status(400).json({ message: 'Admin cannot be removed' });

    group.members = group.members.filter(id => id.toString() !== req.params.userId);
    await group.save();
    res.json(group);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

// --- TASKS & CHAT ---
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;
    
    const taskData = {
      title,
      description,
      group: req.params.id,
      assignedBy: req.user._id 
    };

    if (assignedTo && assignedTo.trim() !== "" && assignedTo !== "Anyone") {
      taskData.assignedTo = assignedTo;
    }

    const task = await Task.create(taskData);
    const populatedTask = await task.populate('assignedTo assignedBy', 'name profilePicture');
    
    if (taskData.assignedTo && taskData.assignedTo.toString() !== req.user._id.toString()) {
      const group = await Group.findById(req.params.id);
      await Notification.create({
        recipient: taskData.assignedTo,
        sender: req.user._id,
        type: 'system', // 🚨 FIXED ENUM ERROR
        title: 'New Task Assigned',
        message: `${req.user.name} assigned you a task in ${group.name}: "${task.title}"`,
        link: `/groups`
      });
    }

    res.status(201).json(populatedTask);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.taskId);
    if (!oldTask) return res.status(404).json({ message: "Task not found" });

    const task = await Task.findByIdAndUpdate(
      req.params.taskId, 
      { status: req.body.status }, 
      { new: true }
    ).populate('assignedTo assignedBy', 'name profilePicture');

    if (task.status === 'done' && oldTask.status !== 'done') {
      if (task.assignedBy && task.assignedBy._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: task.assignedBy._id,
          sender: req.user._id,
          type: 'system', // 🚨 FIXED ENUM ERROR
          title: 'Task Completed!',
          message: `${req.user.name} finished the task: "${task.title}"`,
          link: `/groups`
        });
      }
    }

    res.json(task);
  } catch (error) { 
    res.status(400).json({ message: error.message }); 
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const group = await Group.findById(req.params.id);
    const isAssigner = task.assignedBy.toString() === req.user._id.toString();
    const isAdmin = group.admin.toString() === req.user._id.toString();

    if (!isAssigner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: 'system', // 🚨 FIXED ENUM ERROR
        title: 'Task Removed',
        message: `${req.user.name} removed a task assigned to you: "${task.title}"`,
        link: `/groups`
      });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const message = await Message.create({ group: req.params.id, sender: req.user._id, content: req.body.content });
    const group = await Group.findById(req.params.id);

    const recipients = group.members.filter(m => m.toString() !== req.user._id.toString());
    
    await Promise.all(recipients.map(recipientId => 
      Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'system', // 🚨 FIXED ENUM ERROR
        title: `New message in ${group.name}`,
        message: `${req.user.name}: ${req.body.content.substring(0, 30)}${req.body.content.length > 30 ? '...' : ''}`,
        link: `/groups`
      })
    ));

    const populatedMessage = await message.populate('sender', 'name profilePicture');
    res.status(201).json(populatedMessage);
  } catch (error) { res.status(400).json({ message: error.message }); }
};