import Deadline from '../models/Deadline.js';

export const getDeadlines = async (req, res) => {
  try {
    const deadlines = await Deadline.find({ user: req.user._id }).sort({ dueDate: 1 });
    res.json(deadlines);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const createDeadline = async (req, res) => {
  try {
    const { title, course, type, dueDate, priority } = req.body;
    const deadline = await Deadline.create({
      user: req.user._id,
      title, course, type, dueDate, priority
    });
    res.status(201).json(deadline);
  } catch (error) {
    res.status(400).json({ message: "Invalid data" });
  }
};

export const deleteDeadline = async (req, res) => {
  try {
    const deadline = await Deadline.findById(req.params.id);
    if (!deadline || deadline.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Not found or not authorized" });
    }
    await deadline.deleteOne();
    res.json({ message: "Deadline removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};