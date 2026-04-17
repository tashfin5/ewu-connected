import Resource from '../models/Resource.js';
import User from '../models/User.js'; 
import Notification from '../models/Notification.js';

// @desc    Get resources by course code
// Example of what your backend controller should look like
// @desc    Get resources by course code
export const getResourcesByCourse = async (req, res) => {
    try {
        const { courseCode } = req.params;
        const { department, sort } = req.query; 

        // 1. Create a strict filter combining Course Code and Department
        let queryFilter = { courseCode: courseCode };

        // Ensure department is strictly matched
        if (department) {
            queryFilter.department = department;
        }

        // 2. Search database and populate the uploader
        let query = Resource.find(queryFilter).populate('uploader', 'name profilePicture');

        // 3. Handle sort logic
        if (sort === 'rating') {
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


// @desc    Upload a new resource
export const uploadResource = async (req, res) => {
  try {
    const { title, courseCode, department, description, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🚨 FIXED: Field names now perfectly match your Mongoose Schema
    const newResource = new Resource({
      title, 
      courseCode, 
      department, // Saved so it can be filtered later!
      description, 
      category,
      file: {
          url: req.file.path,
          fileType: req.file.mimetype ? req.file.mimetype.split('/')[1] : 'unknown'
      },
      uploader: req.user._id // Changed from uploadedBy to uploader!
    });

    // Add points to the user
    const user = await User.findById(req.user._id);
    if (user) {
      user.points += 50; 
      await user.save();
    }
    
    await newResource.save();
    
    // Populate before sending back so the UI doesn't crash
    await newResource.populate('uploader', 'name profilePicture'); 
    
    res.status(201).json(newResource);
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Failed to save file" });
  }
};

// @desc    Delete a resource
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    if (req.user.role !== 'admin' && resource.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await resource.deleteOne();
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Rate a resource & Notify
export const rateResource = async (req, res) => {
  try {
    const { value } = req.body;
    const resource = await Resource.findById(req.params.id).populate('uploadedBy');

    if (!resource) return res.status(404).json({ message: "Resource not found" });
    if (!resource.ratings) resource.ratings = [];

    const existingRating = resource.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.value = value;
    } else {
      resource.ratings.push({ user: req.user._id, value });
    }

    const total = resource.ratings.reduce((acc, item) => item.value + acc, 0);
    resource.rating = (total / resource.ratings.length).toFixed(1);
    await resource.save();

    // 🚨 NOTIFICATION: Aggregated Rating
    if (resource.uploadedBy._id.toString() !== req.user._id.toString()) {
      const otherCount = resource.ratings.length - 1;
      const messageText = otherCount > 0 
        ? `${req.user.name} and ${otherCount} other(s) have rated your note "${resource.title}".`
        : `${req.user.name} rated your note "${resource.title}" ${value} stars!`;

      await Notification.create({
        recipient: resource.uploadedBy._id,
        sender: req.user._id,
        type: 'system',
        title: 'New Rating!',
        message: messageText,
        link: `/repository/${resource.department.toLowerCase()}/${resource.courseCode.toLowerCase()}` 
      });
    }

    res.status(200).json(resource);
  } catch (error) {
    res.status(500).json({ message: "Rating failed" });
  }
};

// server/controllers/resourceController.js

// @desc    Increment download count & Notify (Milestones)
export const downloadResource = async (req, res) => {
    try {
        // 1. Find and Populate the uploader immediately
        const resource = await Resource.findById(req.params.id).populate('uploadedBy');
        
        if(!resource) return res.status(404).json({ message: "Resource not found" });

        // 2. Increment the count
        resource.downloads += 1;
        await resource.save();

        // 3. 🚨 NOTIFICATION LOGIC
        // We notify the owner if it's NOT them downloading their own note
        if (resource.uploadedBy && resource.uploadedBy._id.toString() !== req.user._id.toString()) {
            
            // OPTIONAL: Send notification on every download OR every 5th download
            // Let's do EVERY download for now so you can test it easily
            await Notification.create({
                recipient: resource.uploadedBy._id,
                sender: req.user._id, 
                type: 'system', 
                title: 'Note Downloaded!',
                message: `${req.user.name} downloaded your note: "${resource.title}"`,
                link: `/repository` 
            });
        }
        res.json({ message: "Download tracked" });
    } catch (error) {
        res.status(500).json({ message: "Error tracking download" });
    }
};

// @desc    Save/Bookmark resource & Notify
export const saveResource = async (req, res) => {
  try {
    // 1. Find and Populate
    const resource = await Resource.findById(req.params.id).populate('uploadedBy');
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    const user = await User.findById(req.user._id);
    const isAlreadySaved = user.savedResources.includes(resource._id);

    if (isAlreadySaved) {
      user.savedResources = user.savedResources.filter(id => id.toString() !== resource._id.toString());
    } else {
      user.savedResources.push(resource._id);
      
      // 2. 🚨 NOTIFICATION LOGIC (Only when ADDING a bookmark)
      if (resource.uploadedBy && resource.uploadedBy._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: resource.uploadedBy._id,
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
    res.status(500).json({ message: "Error saving resource" });
  }
};