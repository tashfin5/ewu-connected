# EWU ConnectED

**Course:** Software Engineering (CSE412)  
**Institution:** East West University  

## Project Overview

**EWU ConnectED** is a cross-platform (Web, Desktop, and Mobile) application designed for students and faculty at East West University. It provides a cohesive platform for managing academic content, communicating, and staying updated with university resources.

The application features a modern, responsive user interface and a robust backend capable of handling authentication, media uploads, and real-time data processing. It is distributed as a web application, an Android APK, and a Windows executable.

## Technology Stack

### Frontend (Client)
The client is a modern React application built with cross-platform capabilities in mind.
- **Framework:** React 19 with Vite
- **Styling:** Tailwind CSS, Framer Motion (for animations)
- **Desktop Packaging:** Electron
- **Mobile Packaging:** Capacitor
- **Key Libraries:** React Router DOM, Axios, React PDF, React Hot Toast

### Backend (Server)
The server provides a RESTful API to support the client applications.
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Media Management:** Cloudinary & Multer

## Project Structure

- `/client` - Contains the frontend source code (React, Electron, Capacitor).
- `/server` - Contains the backend Node.js/Express source code.
- `EWU-ConnectED.Setup.exe` - Windows Desktop installer.
- `EWU-ConnectED.apk` - Android mobile application package.

## Setup and Installation

### Prerequisites
- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Cloudinary account (for image uploads)

### Running the Backend Server

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the `.env` file with your credentials (PORT, MONGO_URI, JWT_SECRET, CLOUDINARY details).
4. Start the development server:
   ```bash
   npm run dev
   ```

### Running the Frontend Client

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

### Building for Desktop / Mobile

- **Desktop (Windows):** Run `npm run electron:build` in the `client` directory to generate the `.exe` installer.
- **Mobile (Android):** Use Capacitor CLI (`npx cap sync android` and `npx cap open android`) to build the APK via Android Studio.

## License

This project is created for academic purposes at East West University.
