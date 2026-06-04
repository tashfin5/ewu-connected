import { useContext, useState, useEffect } from 'react'; 
import logoImage from '../assets/logo2.png';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, BookOpen, MessageSquare, Bell, 
  Calculator, Trophy, Award, Menu, X, ListChecks,
  ChevronLeft, ChevronRight, LogOut, Sun, Moon,
  Loader2, MoreHorizontal, DownloadCloud
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/repository', icon: BookOpen, label: 'Smart Repository' },
  { path: '/groups', icon: ListChecks, label: 'Group Tasks' },
  { path: '/threads', icon: MessageSquare, label: 'Public Threads' },
  { path: '/alerts', icon: Bell, label: 'Deadline Alerts' },
  { path: '/cgpa', icon: Calculator, label: 'CGPA Planner' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

const Layout = ({ children }) => {
  const isNative = Capacitor.isNativePlatform();
  const isElectron = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('electron');
  const isWeb = !isNative && !isElectron;

  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); 

  // Dynamically add Downloads to NAV_ITEMS if web
  const dynamicNavItems = [...NAV_ITEMS];
  if (isWeb) {
    dynamicNavItems.push({ path: '/downloads', icon: DownloadCloud, label: 'Downloads' });
  }

  // Admin Links
  if (user && user.role === 'admin') {
    dynamicNavItems.push({ path: '/admin/requests', icon: BookOpen, label: 'Course Requests' });
  }

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.token) return;
      try {
        const res = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const count = res.data.filter(n => !n.isRead).length;
        setUnreadCount(count);
      } catch (err) {
        console.error("Layout notification fetch failed");
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="bg-white/50 dark:bg-zinc-800/50 p-4 rounded-2xl shadow-xl backdrop-blur-md border border-slate-200/50 dark:border-zinc-700/50"
      >
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </motion.div>
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-6 text-slate-600 dark:text-zinc-400 font-semibold tracking-wide animate-pulse"
      >
        Waking up backend...
      </motion.p>
    </div>
  );

  const isActive = (path) => location.pathname === path;
  const points = Number(user?.points) || 0;

  // --- Persistent Rank Logic ---
  let currentRank = 'Bronze';
  let nextRank = 'Silver';
  let currentTierMin = 0;
  let nextTierMin = 500;
  let rankTextColor = 'text-orange-700 dark:text-orange-400';
  let badgeBg = 'bg-orange-100 dark:bg-orange-900/50';

  if (points >= 5000) {
    currentRank = 'Radiant'; nextRank = 'Max Rank'; currentTierMin = 5000; nextTierMin = 5000; 
    rankTextColor = 'text-yellow-500 drop-shadow-sm'; badgeBg = 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500/20';
  } else if (points >= 4000) {
    currentRank = 'Diamond'; nextRank = 'Radiant'; currentTierMin = 4000; nextTierMin = 5000;
    rankTextColor = 'text-pink-500 dark:text-pink-400'; badgeBg = 'bg-pink-100 dark:bg-pink-900/30 border border-pink-500/20';
  } else if (points >= 3000) {
    currentRank = 'Platinum'; nextRank = 'Diamond'; currentTierMin = 3000; nextTierMin = 4000;
    rankTextColor = 'text-blue-500 dark:text-blue-400'; badgeBg = 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500/20';
  } else if (points >= 2000) {
    currentRank = 'Gold'; nextRank = 'Platinum'; currentTierMin = 2000; nextTierMin = 3000;
    rankTextColor = 'text-yellow-600 dark:text-yellow-500'; badgeBg = 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500/20';
  } else if (points >= 1000) {
    currentRank = 'Silver'; nextRank = 'Gold'; currentTierMin = 1000; nextTierMin = 2000;
    rankTextColor = 'text-slate-500 dark:text-slate-300'; badgeBg = 'bg-slate-200 dark:bg-zinc-700/50 border border-slate-500/20';
  } else {
    currentRank = 'Bronze'; nextRank = 'Silver'; currentTierMin = 0; nextTierMin = 1000;
    rankTextColor = 'text-orange-700 dark:text-orange-400'; badgeBg = 'bg-orange-100 dark:bg-orange-900/50';
  }

  const rankProgress = points >= 5000 ? 100 : Math.max(0, Math.min(100, ((points - currentTierMin) / (nextTierMin - currentTierMin)) * 100));

  const DesktopNavLinks = () => (
    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
      {dynamicNavItems.map((item) => (
        <Link 
          key={item.path}
          to={item.path} 
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-2xl text-sm transition-all duration-300 relative group ${
            isActive(item.path) 
              ? 'bg-blue-600 shadow-md shadow-blue-600/20 text-white font-semibold' 
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
          title={isCollapsed ? item.label : ""}
        >
          <div className="relative">
            <item.icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
            {item.path === '/alerts' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive(item.path) ? 'bg-white' : 'bg-red-500'}`}></span>
              </span>
            )}
          </div>
          {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
        </Link>
      ))}
      <Link
        to="/notifications"
        className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-2xl text-sm transition-all duration-300 relative group ${
          isActive('/notifications') 
            ? 'bg-blue-600 shadow-md shadow-blue-600/20 text-white font-semibold' 
            : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white font-medium'
        }`}
        title={isCollapsed ? "Notifications" : ""}
      >
        <div className="relative">
          <Bell className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {!isCollapsed && <span className="whitespace-nowrap">Notifications</span>}
      </Link>
    </nav>
  );

  return (
    <div className="h-full bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 flex font-sans transition-colors duration-300">
      
      {/* MOBILE HEADER (Glassmorphic) */}
      <div className="md:hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-zinc-800/50 p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logoImage} alt="Logo" className="w-8 h-8 object-contain dark:invert" />
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-zinc-400">EWU ConnectED</span>
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link to="/notifications" className="relative p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
             <Bell className="w-4 h-4" />
             {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></span>}
          </Link>
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex flex-col h-full sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-r border-slate-200/50 dark:border-zinc-800/50 transition-all duration-300 z-30 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full p-1.5 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 transition-all z-10 hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all`}>
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img src={logoImage} alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm transition-transform group-hover:scale-105 dark:invert" />
            {!isCollapsed && <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-zinc-400 tracking-tight whitespace-nowrap">EWU ConnectED</span>}
          </Link>
        </div>
        
        <DesktopNavLinks />

        <div className={`p-4 mx-3 mb-4 rounded-2xl bg-slate-100/50 dark:bg-zinc-800/30 border border-slate-200/50 dark:border-zinc-700/50 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-center justify-between w-full mb-4">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Theme</span>
              <button 
                onClick={toggleTheme} 
                className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all text-slate-700 dark:text-zinc-300"
              >
                {theme === 'dark' ? <><Sun className="w-4 h-4"/> <span className="text-xs font-semibold pr-2">Light</span></> : <><Moon className="w-4 h-4"/> <span className="text-xs font-semibold pr-2">Dark</span></>}
              </button>
            </div>
          )}
          {isCollapsed && (
             <button onClick={toggleTheme} className="p-2 mb-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm text-slate-700 dark:text-zinc-300">
               {theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
             </button>
          )}

          <div 
            onClick={() => navigate('/profile')}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-4 cursor-pointer hover:opacity-80 transition w-full`}
            title={isCollapsed ? "View Profile" : ""}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden border-2 border-white dark:border-zinc-800">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5 shadow-sm">
                <div className={`${badgeBg} rounded-full p-1`}><Award className={`w-3 h-3 ${rankTextColor}`}/></div>
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold truncate text-slate-900 dark:text-white">{user.name}</h4>
                <p className={`text-xs font-bold ${rankTextColor}`}>{currentRank}</p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-zinc-500 mb-1.5">
                <span className="uppercase tracking-wider">{currentRank}</span>
                <span className="uppercase tracking-wider">{nextRank}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${rankProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button 
            onClick={logout} 
            className={`flex items-center justify-center ${isCollapsed ? 'p-2' : 'gap-2 px-4 py-2 w-full'} text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-bold transition-colors`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV (Glassmorphic) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-zinc-800/50 z-40 pb-safe">
        <nav className="flex justify-around items-center p-2">
          {[
            { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
            { path: '/repository', icon: BookOpen, label: 'Repo' },
            { path: '/groups', icon: ListChecks, label: 'Groups' },
            { path: '/threads', icon: MessageSquare, label: 'Threads' }
          ].map(item => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
                isActive(item.path) 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-1 transition-transform ${isActive(item.path) ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-semibold ${isActive(item.path) ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
            </Link>
          ))}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-12 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-semibold opacity-70">Menu</span>
          </button>
        </nav>
      </div>

      {/* MOBILE SLIDE-OUT MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col md:hidden overflow-y-auto"
            >
              <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-lg dark:text-white">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full text-slate-600 dark:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-2">
                {[
                  ...dynamicNavItems,
                  { path: '/profile', icon: Award, label: 'My Profile' }
                ].map((item) => (
                  <Link 
                    key={item.path}
                    to={item.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                      isActive(item.path) 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-600 dark:border-blue-400' 
                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50 font-medium border-l-4 border-transparent'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
                <button onClick={logout} className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors font-bold w-full p-3 rounded-xl">
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA WITH PAGE TRANSITIONS */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative pt-16 pb-20 md:pt-0 md:pb-0 scroll-smooth">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      
    </div>
  );
};

export default Layout;