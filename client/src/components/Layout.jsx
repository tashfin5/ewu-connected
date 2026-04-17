import { useContext, useState, useEffect } from 'react'; // 🚨 Added useEffect
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios'; // 🚨 Added axios
import { 
  LayoutDashboard, BookOpen, MessageSquare, Bell, 
  Calculator, Trophy, Award, Menu, X, ListChecks,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // 🚨 Notification state

  // 🚨 FETCH NOTIFICATIONS ON LOAD/REFRESH
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
    // Refresh count every 60 seconds automatically
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  const isActive = (path) => location.pathname === path;

  const points = user?.points || 0;

  let currentRank = 'Bronze';
  let nextRank = 'Silver';
  let currentTierMin = 0;
  let nextTierMin = 500;
  let rankTextColor = 'text-orange-700';
  let badgeBg = 'bg-orange-100';

  if (points >= 2500) {
    currentRank = 'Radiant';
    nextRank = 'Max Rank';
    currentTierMin = 2500;
    nextTierMin = 2500; 
    rankTextColor = 'text-yellow-500 drop-shadow-sm'; 
    badgeBg = 'bg-yellow-100';
  } else if (points >= 2000) {
    currentRank = 'Diamond';
    nextRank = 'Radiant';
    currentTierMin = 2000;
    nextTierMin = 2500;
    rankTextColor = 'text-pink-500'; 
    badgeBg = 'bg-pink-100';
  } else if (points >= 1500) {
    currentRank = 'Platinum';
    nextRank = 'Diamond';
    currentTierMin = 1500;
    nextTierMin = 2000;
    rankTextColor = 'text-blue-500'; 
    badgeBg = 'bg-blue-100';
  } else if (points >= 1000) {
    currentRank = 'Gold';
    nextRank = 'Platinum';
    currentTierMin = 1000;
    nextTierMin = 1500;
    rankTextColor = 'text-yellow-600'; 
    badgeBg = 'bg-yellow-100';
  } else if (points >= 500) {
    currentRank = 'Silver';
    nextRank = 'Gold';
    currentTierMin = 500;
    nextTierMin = 1000;
    rankTextColor = 'text-gray-500'; 
    badgeBg = 'bg-gray-200';
  }

  const rankProgress = points >= 2500 ? 100 : ((points - currentTierMin) / (nextTierMin - currentTierMin)) * 100;

  const NavLinks = ({ mobile = false }) => (
    <nav className={`flex-1 ${mobile ? 'px-4 py-2 mt-4' : 'px-3 py-4'} space-y-1 overflow-y-auto overflow-x-hidden`}>
      {[
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/repository', icon: BookOpen, label: 'Smart Repository' },
        { path: '/groups', icon: ListChecks, label: 'Group Tasks' },
        { path: '/threads', icon: MessageSquare, label: 'Public Threads' },
        { path: '/alerts', icon: Bell, label: 'Deadline Alerts' },
        { path: '/cgpa', icon: Calculator, label: 'CGPA Planner' },
        { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
      ].map((item) => (
        <Link 
          key={item.path}
          to={item.path} 
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 ${isCollapsed && !mobile ? 'justify-center px-2' : 'px-4'} py-3 rounded-xl text-sm transition-colors duration-200 relative group ${
            isActive(item.path) 
              ? 'bg-blue-50 text-blue-600 font-semibold' 
              : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
          title={isCollapsed && !mobile ? item.label : ""}
        >
          <div className="relative">
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {/* 🚨 RED DOT BADGE FOR NOTIFICATIONS LINK */}
            {item.path === '/notifications' && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </div>
          {(!isCollapsed || mobile) && <span className="whitespace-nowrap">{item.label}</span>}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      
      {/* ------------- MOBILE HEADER ------------- */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center fixed top-0 w-full z-40">
        <div className="flex items-center gap-2">
          <BookOpen className="text-blue-600 w-6 h-6" />
          <span className="font-bold text-gray-900 tracking-tight">EWU ConnectED</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Mobile Notification Dot */}
          <Link to="/notifications" className="relative">
             <Bell className="w-6 h-6 text-gray-700" />
             {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
          </Link>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1">
            {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* ------------- DESKTOP SIDEBAR ------------- */}
      <aside className={`bg-white border-r border-gray-200 hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-gray-50 text-gray-500 transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} overflow-hidden`}>
          <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          {!isCollapsed && <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">EWU ConnectED</span>}
        </div>
        
        <NavLinks />

        {showNotif && !isCollapsed && (
          <div className="mx-4 mb-4 p-4 bg-blue-600 rounded-2xl shadow-xl text-white animate-in zoom-in-95 slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
              <h5 className="font-black text-[10px] uppercase tracking-tighter">System Updates</h5>
              <button onClick={() => setShowNotif(false)}><X className="w-3 h-3 hover:scale-110 transition"/></button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] leading-tight">📸 <b>Threads:</b> Now you can upload Images and PDFs to your posts!</p>
              <p className="text-[11px] leading-tight">💬 <b>Replies:</b> Check out the new nested comment system in Threads.</p>
              <p className="text-[11px] leading-tight">🏆 <b>Profile:</b> You can now update your CGPA & Credits directly.</p>
            </div>
          </div>
        )}

        <div className={`p-4 border-t border-gray-100 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          <div 
            onClick={() => navigate('/profile')}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} mb-4 cursor-pointer hover:opacity-80 transition w-full`}
            title={isCollapsed ? "View Profile" : ""}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <div className={`${badgeBg} rounded-full p-1`}><Award className={`w-3 h-3 ${rankTextColor}`}/></div>
              </div>
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-gray-900 truncate">{user.name}</h4>
                <p className={`text-xs font-bold ${rankTextColor}`}>{currentRank}</p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                <span className="uppercase tracking-wider">{currentRank}</span>
                <span className="uppercase tracking-wider">{nextRank}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${rankProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button 
            onClick={logout} 
            className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-4 py-2 w-full'} text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium transition mt-auto`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* ------------- MOBILE MENU OVERLAY ------------- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-30 flex flex-col md:hidden pt-16">
          <NavLinks mobile />
          
          <div className="p-6 border-t border-gray-100 mt-auto bg-gray-50">
            <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}>
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{user.name}</h4>
                  <p className="text-sm text-gray-500"><span className={`font-bold ${rankTextColor}`}>{currentRank} Rank</span> • View Profile</p>
                </div>
            </div>
            
            <button onClick={logout} className="flex items-center gap-3 text-red-600 bg-red-50 hover:bg-red-100 transition font-bold w-full p-3 rounded-xl">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
      
    </div>
  );
};

export default Layout;