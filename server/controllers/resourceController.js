import Resource from '../models/Resource.js';
import User from '../models/User.js'; 
import Notification from '../models/Notification.js';

// ==========================================
// 1. GET RESOURCES BY COURSE
// ==========================================
export const getResourcesByCourse = async (req, res) => {
    try {
        // Fallback to query if params fails
        const courseCode = req.params.courseCode || req.query.courseCode;
        const department = req.query.department;

        // 🚨 THE KILL SWITCH: If the course code is missing or empty, STOP. Return nothing.
        if (!courseCode || courseCode.trim() === '' || courseCode === 'undefined') {
            console.log("⚠️ BLOCKED: API tried to fetch without a valid course code.");
            return res.json([]); 
        }

        // 🚨 EXACT MATCH ONLY: Cleans string to "CSE103"
        const strictCourseCode = courseCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        let queryFilter = { 
            courseCode: strictCourseCode 
        };

        if (department) {
            queryFilter.department = department;
        }

        console.log(`[FETCHING] Strict Match For -> Course: ${strictCourseCode} | Dept: ${department}`);

        let query = Resource.find(queryFilter).populate('uploader', 'name profilePicture');

        if (req.query.sort === 'rating') {
            query = query.sort({ averageRating: -1 });
        } else {
            query = query.sort({ createdAt: -1 });
        }

        const resources = await query;
        res.json(resources);
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// ==========================================
// 2. UPLOAD RESOURCE
// ==========================================
export const uploadResource = async (req, res) => {
  try {
    const { title, courseCode, department, description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🚨 EXACT MATCH ON SAVE: Forces it to save exactly as "CSE103"
    const strictCourseCode = courseCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    console.log(`[UPLOADING] Locked To -> Course: ${strictCourseCode} | Dept: ${department}`);

    const newResource = new Resource({
      title, 
      courseCode: strictCourseCode, 
      department, 
      description, 
      category,
      file: {
          url: req.file.path,
          fileType: req.file.mimetype ? req.file.mimetype.split('/')[1] : 'unknown'
      },
      uploader: req.user._id 
    });

    const user = await User.findById(req.user._id);
    if (user) {
      user.points += 50; 
      await user.save();
    }
    
    await newResource.save();
    await newResource.populate('uploader', 'name profilePicture'); 
    
    res.status(201).json(newResource);
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Failed to save file" });
  }
};

// ==========================================
// 3. DELETE RESOURCE
// ==========================================
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    if (req.user.role !== 'admin' && resource.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await resource.deleteOne();
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================================
// 4. RATE RESOURCE
// ==========================================
export const rateResource = async (req, res) => {
  try {
    const { value } = req.body;
    const resource = await Resource.findById(req.params.id).populate('uploader');

    if (!resource) return res.status(404).json({ message: "Resource not found" });
    if (!resource.ratings) resource.ratings = [];

    const existingRating = resource.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.value = value;
    } else {
      resource.ratings.push({ user: req.user._id, value });
    }

    const total = resource.ratings.reduce((acc, item) => item.value + acc, 0);
    resource.averageRating = (total / resource.ratings.length).toFixed(1);
    await resource.save();

    if (resource.uploader && resource.uploader._id.toString() !== req.user._id.toString()) {
      const otherCount = resource.ratings.length - 1;
      const messageText = otherCount > 0 
        ? `${req.user.name} and ${otherCount} other(s) have rated your note "${resource.title}".`
        : `${req.user.name} rated your note "${resource.title}" ${value} stars!`;

      await Notification.create({
        recipient: resource.uploader._id,
        sender: req.user._id,
        type: 'system',
        title: 'New Rating!',
        message: messageText,
        link: `/repository/${resource.department.toLowerCase()}/${resource.courseCode.toLowerCase()}` 
      });
    }

    res.status(200).json(resource);
  } catch (error) {
    console.error("Rate Error:", error);
    res.status(500).json({ message: "Rating failed" });
  }
};

// ==========================================
// 5. DOWNLOAD RESOURCE
// ==========================================
export const downloadResource = async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id).populate('uploader');
        
        if(!resource) return res.status(404).json({ message: "Resource not found" });

        resource.downloads += 1;
        await resource.save();

        if (resource.uploader && resource.uploader._id.toString() !== req.user._id.toString()) {
            await Notification.create({
                recipient: resource.uploader._id,
                sender: req.user._id, 
                type: 'system', 
                title: 'Note Downloaded!',
                message: `${req.user.name} downloaded your note: "${resource.title}"`,
                link: `/repository` 
            });
        }
        res.json({ message: "Download tracked" });
    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ message: "Error tracking download" });
    }
};

// ==========================================
// 6. SAVE/BOOKMARK RESOURCE
// ==========================================
export const saveResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('uploader');
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    const user = await User.findById(req.user._id);
    const isAlreadySaved = user.savedResources.includes(resource._id);

    if (isAlreadySaved) {
      user.savedResources = user.savedResources.filter(id => id.toString() !== resource._id.toString());
    } else {
      user.savedResources.push(resource._id);
      
      if (resource.uploader && resource.uploader._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: resource.uploader._id,
          sender: req.user._id,
          type: 'system',
          title: 'Note Bookmarked!',
          message: `${req.user.name} saved your note "${resource.title}" to their profile.`,
          link: `/repository`
        });
      }
    }

    await user.save();
    res.json({ message: isAlreadySaved ? "Removed" : "Saved" });
  } catch (error) {
    console.error("Save Bookmark Error:", error);
    res.status(500).json({ message: "Error saving resource" });
  }
};