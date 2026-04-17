import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import resourceRoutes from './routes/resourceRoutes.js';

// 1. Import your routes
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deadlineRoutes from './routes/deadlineRoutes.js';
import threadRoutes from './routes/threadRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// --- 🚨 FINAL CORS SETTINGS ---
const allowedOrigins = [
    'http://localhost:5173', // For your local testing
    'https://ewu-connected.vercel.app' // Vercel production URL
];

// --- 🚨 BULLETPROOF CORS SETTINGS ---
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'https://ewu-connected.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// Body Parsers (Increased limit for image/PDF uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static Folders
app.use('/uploads', express.static('uploads'));

// 2. Connect the routes to the app
app.use('/api/resources', resourceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Basic Test Route
app.get('/', (req, res) => {
    res.send('EWU ConnectED API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    connectDB();
    console.log(`🚀 Server running on port ${PORT}`);
});