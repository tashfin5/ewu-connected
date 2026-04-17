import { useContext } from 'react'; // 🚨 Added
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // 🚨 Added Navigate
import { AuthContext } from './context/AuthContext'; // 🚨 Added

// Pages
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTE --- */}
        <Route path="/" element={<PublicRoute><Auth /></PublicRoute>} />

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

        {/* Catch-all: Redirect to Auth if not found */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;