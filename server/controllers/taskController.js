import Group from '../models/Group.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

// @desc    Create a new Group
export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds } = req.body;

        // Ensure the creator is always a member
        const members = memberIds ? [...new Set([...memberIds, req.user._id.toString()])] : [req.user._id];

        const group = await Group.create({
            name,
            description,
            members,
            createdBy: req.user._id
        });

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: 'Error creating group', error: error.message });
    }
};

// @desc    Get all Groups for a User
export const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user._id })
            .populate('members', 'name email student_id'); // Populate fetches member details
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching groups', error: error.message });
    }
};

// @desc    Create a new Task in a Group
export const createTask = async (req, res) => {
    try {
        const { title, description, groupId, assigneeId } = req.body;

        // Verify the group exists and the user is a member
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }
        if (!group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        const task = await Task.create({
            title,
            description,
            group: groupId,
            assignee: assigneeId || null
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error: error.message });
    }
};

// @desc    Get all Tasks for a Group
export const getGroupTasks = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Verify group membership before sending tasks
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to view these tasks' });
        }

        const tasks = await Task.find({ group: groupId }).populate('assignee', 'name');
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error: error.message });
    }
};