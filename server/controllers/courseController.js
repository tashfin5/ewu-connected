import Course from '../models/Course.js';
import CourseRequest from '../models/CourseRequest.js';
import Notification from '../models/Notification.js';

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

// @desc    Submit a new course request
// @route   POST /api/courses/requests
// @access  Private
export const requestCourse = async (req, res) => {
  try {
    const { courseCode, courseTitle, department, year } = req.body;
    
    // Check if course already exists
    const existingCourse = await Course.findOne({ code: courseCode, department });
    if (existingCourse) {
      return res.status(400).json({ message: "This course already exists!" });
    }

    // Check if request already exists
    const existingRequest = await CourseRequest.findOne({ courseCode, department, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: "A request for this course is already pending." });
    }

    const newRequest = new CourseRequest({
      courseCode,
      courseTitle,
      department,
      year,
      requestedBy: req.user._id
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit course request" });
  }
};

// @desc    Get all course requests
// @route   GET /api/courses/requests
// @access  Private/Admin
export const getCourseRequests = async (req, res) => {
  try {
    const requests = await CourseRequest.find({}).populate('requestedBy', 'name student_id').sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch course requests" });
  }
};

// @desc    Update course request status (and optionally edit details before approving)
// @route   PUT /api/courses/requests/:id
// @access  Private/Admin
export const updateCourseRequestStatus = async (req, res) => {
  try {
    const { status, courseCode, courseTitle, year } = req.body;
    const request = await CourseRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    
    // Allow admin to edit details before approving
    if (courseCode) request.courseCode = courseCode;
    if (courseTitle) request.courseTitle = courseTitle;
    if (year) request.year = year;

    await request.save();

    // If approved, automatically add it to the main Course collection
    if (status === 'approved') {
      const existingCourse = await Course.findOne({ code: request.courseCode, department: request.department });
      if (!existingCourse) {
        const newCourse = new Course({
          code: request.courseCode,
          title: request.courseTitle,
          year: request.year,
          department: request.department
        });
        await newCourse.save();
      }

      const notification = new Notification({
        recipient: request.requestedBy,
        type: 'system',
        title: 'Course Request Approved',
        message: `Your request for ${request.courseCode} (${request.courseTitle}) has been approved and added to the repository.`
      });
      await notification.save();
    } else if (status === 'rejected') {
      const notification = new Notification({
        recipient: request.requestedBy,
        type: 'system',
        title: 'Course Request Rejected',
        message: `Your request for ${request.courseCode} (${request.courseTitle}) was not approved.`
      });
      await notification.save();
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Failed to update course request" });
  }
};