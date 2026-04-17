import Course from '../models/Course.js';

// Get all courses for a specific department
export const getCoursesByDept = async (req, res) => {
  try {
    const { deptId } = req.params;
    const courses = await Course.find({ department: deptId });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses" });
  }
};

// Add a new course
export const addCourse = async (req, res) => {
  try {
    const { code, title, year, department } = req.body;
    
    // Optional: Check if course already exists to prevent duplicates
    const existingCourse = await Course.findOne({ code, department });
    if (existingCourse) {
      return res.status(400).json({ message: "Course already exists!" });
    }

    const newCourse = new Course({ code, title, year, department });
    await newCourse.save();
    
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ message: "Failed to add course" });
  }
};

// Add this to courseController.js
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await Course.findByIdAndDelete(id);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course" });
  }
};

// @desc    Fetch all courses
// @route   GET /api/courses
// @access  Private
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not fetch courses" });
  }
};