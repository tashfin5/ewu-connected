import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // DEBUG: Look at your VS Code terminal after you click Save
      console.log("DECODED TOKEN PAYLOAD:", decoded);

      const userId = decoded.id || decoded.userId;
      req.user = await User.findById(userId).select('-password');

      if (!req.user) {
        console.log("AUTH ERROR: No user found in DB for ID:", userId);
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      // DEBUG: This tells us if the secret is wrong or token is expired
      console.error("AUTH ERROR:", error.message); 
      res.status(401).json({ message: `Not authorized: ${error.message}` });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// ... existing protect middleware ...

// Admin Shield Middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // They are an admin, let them pass!
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};