import { useContext, useEffect } from 'react'; // 🚨 Added
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'; // 🚨 Added Navigate
import { AuthContext } from './context/AuthContext'; // 🚨 Added

// Pages
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import GroupTasks from './pages/GroupTasks';
import TaskBoard from './pages/TaskBoard';
import Repository from './pages/Repository';
import Profile from './pages/Profile';
import PublicThreads from './pages/PublicThreads';
import CgpaPlanner from './pages/CGPAPlanner';
import DeadlineAlerts from './pages/DeadlineAlerts';
import Leaderboard from './pages/Leaderboard';
import DepartmentCourses from './pages/DepartmentCourses';
import CourseNotes from './pages/CourseNotes';
import Notifications from './pages/Notifications';
import Downloads from './pages/Downloads';
import PublicDownloads from './pages/PublicDownloads';
import CourseRequests from './pages/CourseRequests';

// 🛡️ Guard 1: Kicks logged-out users back to Auth page
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    // If your auth page is at "/", we redirect there
    return <Navigate to="/" replace />;
  }
  return children;
};

// 🛡️ Guard 2: Kicks logged-in users away from Auth page to Dashboard
const PublicRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

import { Toaster } from 'react-hot-toast';
import { ThemeContext } from './context/ThemeContext'; // Import ThemeContext

// Conditionally use HashRouter for Electron (file:// protocol or Electron userAgent)
const isElectron = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('electron');
const Router = isElectron ? HashRouter : BrowserRouter;

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are at root or dashboard, exit app.
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        CapacitorApp.exitApp();
      } else {
        // Navigate back in history
        navigate(-1);
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [location.pathname, navigate]);

  return null;
};

function App() {
  const { theme } = useContext(ThemeContext) || { theme: 'light' }; // Fallback in case it's used outside

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0a]">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#18181b' : '#ffffff',
            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
            border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e2e8f0',
          },
          success: {
            iconTheme: {
              primary: '#3b82f6', // The blue tick!
              secondary: theme === 'dark' ? '#18181b' : '#ffffff',
            },
          },
        }}
      />
      {isElectron && (
        <div className="h-8 shrink-0 w-full electron-titlebar bg-slate-50 dark:bg-[#0a0a0a] flex items-center pl-4 border-b border-slate-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-widest uppercase">EWU ConnectED</span>
        </div>
      )}
      <div className="flex-1 w-full relative overflow-hidden">
        <Router>
          <BackButtonHandler />
          <Routes>
          {/* --- PUBLIC ROUTE --- */}
        <Route path="/" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/download-app" element={<PublicDownloads />} />

        {/* --- PROTECTED ROUTES --- */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><GroupTasks /></ProtectedRoute>} />
        <Route path="/groups/:groupId" element={<ProtectedRoute><TaskBoard /></ProtectedRoute>} />
        <Route path="/repository" element={<ProtectedRoute><Repository /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/threads" element={<ProtectedRoute><PublicThreads /></ProtectedRoute>} />
        <Route path="/cgpa" element={<ProtectedRoute><CgpaPlanner /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><DeadlineAlerts /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/repository/:deptId" element={<ProtectedRoute><DepartmentCourses /></ProtectedRoute>} />
        <Route path="/repository/:deptId/:courseId" element={<ProtectedRoute><CourseNotes /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
        <Route path="/admin/requests" element={<ProtectedRoute><CourseRequests /></ProtectedRoute>} />

        {/* Catch-all: Redirect to Auth if not found */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;