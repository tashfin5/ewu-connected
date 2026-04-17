import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { 
  Clock, TrendingUp, ListChecks, MessageSquare, 
  CheckCircle2, Award, AlertCircle, BookOpen, 
  BellRing, Info, Users, Search
} from 'lucide-react';

import Layout from '../components/Layout'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  // --- DYNAMIC STATE ---
  const [priorityDeadlines, setPriorityDeadlines] = useState([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [repositoryCount, setRepositoryCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  // --- FETCH DATA ---
  useEffect(() => {
    if (!user || !user.token) return;

    const fetchDashboardData = async () => {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      try {
        // 1. Fetch Deadlines 
        const deadlineRes = await axios.get(`${API_URL}/api/deadlines`, config);
        const now = new Date();
        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        
        const urgent = deadlineRes.data.filter(d => {
          const dueDate = new Date(d.dueDate);
          return dueDate >= now && dueDate <= in48Hours;
        }).slice(0, 3); 
        setPriorityDeadlines(urgent);

        // 2. Fetch Group Tasks
        const groupRes = await axios.get(`${API_URL}/api/groups`, config);
        let taskCount = 0;
        
        for (const group of groupRes.data) {
           const detailsRes = await axios.get(`${API_URL}/api/groups/${group._id}`, config);
           const myPending = detailsRes.data.tasks.filter(t => 
             (t.assignedTo?._id === user._id || !t.assignedTo) && t.status !== 'done'
           ).length;
           taskCount += myPending;
        }
        setPendingTasksCount(taskCount);

        // 3. Fetch Unread Notifications
        const notifRes = await axios.get(`${API_URL}/api/notifications`, config);
        const unreadCount = notifRes.data.filter(n => !n.isRead).length;
        setUnreadNotificationsCount(unreadCount);

        // 4. Fetch Total Repository Resources
        try {
          const resourceRes = await axios.get(`${API_URL}/api/resources`, config);
          const resourcesArray = Array.isArray(resourceRes.data) ? resourceRes.data : (resourceRes.data.resources || []);
          setRepositoryCount(resourcesArray.length);
        } catch (resourceError) {
          console.error("Failed to fetch resources for dashboard", resourceError);
        }

        // 5. Build Recent Activity Feed 
        const recentNotifs = notifRes.data.slice(0, 3);
        setRecentActivity(recentNotifs);

      } catch (error) {
        console.error("Dashboard data sync failed", error);
      }
    };

    fetchDashboardData();
  }, [user]);

  // --- RANKING MATH ---
  const points = user?.points || 0;
  let currentRank = 'Bronze';
  let nextRank = 'Silver';
  let currentTierMin = 0;
  let nextTierMin = 500;
  let cardBg = 'bg-orange-700'; 

  if (points >= 2500) {
    currentRank = 'Radiant';
    nextRank = 'Max Rank';
    currentTierMin = 2500;
    nextTierMin = 2500; 
    cardBg = 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 shadow-yellow-200/50'; 
  } else if (points >= 2000) {
    currentRank = 'Diamond';
    nextRank = 'Radiant';
    currentTierMin = 2000;
    nextTierMin = 2500;
    cardBg = 'bg-pink-500 shadow-pink-200/50'; 
  } else if (points >= 1500) {
    currentRank = 'Platinum';
    nextRank = 'Diamond';
    currentTierMin = 1500;
    nextTierMin = 2000;
    cardBg = 'bg-blue-600 shadow-blue-200/50'; 
  } else if (points >= 1000) {
    currentRank = 'Gold';
    nextRank = 'Platinum';
    currentTierMin = 1000;
    nextTierMin = 1500;
    cardBg = 'bg-yellow-500 shadow-yellow-100/50'; 
  } else if (points >= 500) {
    currentRank = 'Silver';
    nextRank = 'Gold';
    currentTierMin = 500;
    nextTierMin = 1000;
    cardBg = 'bg-slate-500 shadow-slate-200/50'; 
  }

  const pointsNeeded = nextTierMin - points;
  const rankProgress = points >= 2500 ? 100 : ((points - currentTierMin) / (nextTierMin - currentTierMin)) * 100;

  // Formatting Helper
  const getTypeColor = (type) => {
    switch(type) {
      case 'Exam': return 'bg-red-50 text-red-600 border-red-100';
      case 'Project': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
        
        {/* Top Header & Rank Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Good Evening, {user?.name?.split(' ')[0]}</h1>
            <p className="text-gray-500 mt-1 text-sm">Ready to excel today?</p>
          </div>
          
          <div className={`${cardBg} text-white p-5 rounded-2xl shadow-lg w-full md:w-80 transition-colors duration-500`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Award className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-white/80 font-medium tracking-wide uppercase">Current Rank</p>
                <p className="font-bold text-xl leading-tight">{currentRank}</p>
              </div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 mb-2 relative overflow-hidden">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${rankProgress}%` }}
              ></div>
            </div>
            <p className="text-xs font-medium text-white/90">
              {points >= 2500 
                ? 'Highest rank achieved!' 
                : <><span className="font-bold text-white">{pointsNeeded} points</span> to {nextRank}!</>
              }
            </p>
          </div>
        </div>

        {/* Priority Deadlines */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Priority Deadlines (Due in 48 Hours)
            </h2>
            <Link to="/alerts" className="text-blue-600 text-sm font-semibold hover:underline">View All</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {priorityDeadlines.length > 0 ? priorityDeadlines.map(deadline => {
               const due = new Date(deadline.dueDate);
               const diffTime = due - new Date();
               const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
               
               return (
                 <div key={deadline._id} className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition group">
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-gray-900 text-base truncate pr-2">{deadline.title}</h3>
                     <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border shrink-0 ${getTypeColor(deadline.type)}`}>
                       {deadline.type}
                     </span>
                   </div>
                   <p className="text-sm text-gray-500 mb-4">{deadline.course}</p>
                   <div className="flex justify-between items-center text-sm font-bold text-red-500">
                     <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                     <span className="text-xs bg-red-50 px-2 py-1 rounded text-red-600">{hoursLeft <= 0 ? 'Due Now!' : `${hoursLeft}h left`}</span>
                   </div>
                 </div>
               )
            }) : (
               <div className="col-span-full bg-emerald-50/50 border border-emerald-100 p-8 rounded-2xl text-center text-emerald-600 flex flex-col items-center">
                 <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
                 <p className="font-bold">You're all caught up!</p>
                 <p className="text-sm opacity-80 mt-1">No urgent deadlines in the next 48 hours.</p>
               </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* 🚨 NEW: Study Resources Unique CTA Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-md shadow-blue-200/50 text-white flex flex-col justify-between hover:shadow-lg transition-all group overflow-hidden relative">
            <div className="absolute -right-6 -top-6 bg-white/10 w-24 h-24 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-blue-100 font-bold text-sm tracking-wide uppercase">Smart Repository</h3>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm"><Search className="text-white w-5 h-5" /></div>
              </div>
              <p className="text-2xl font-black mb-1">Need study materials?</p>
              <p className="text-blue-100 text-sm mb-6">
                Access {repositoryCount > 0 ? `${repositoryCount}+` : 'community'} notes, slides, and past papers.
              </p>
            </div>
            
            <Link to="/repository" className="relative z-10 bg-white text-blue-700 text-sm font-black py-3 px-4 rounded-xl text-center hover:bg-blue-50 transition transform hover:scale-[1.02] shadow-sm">
              Browse Now →
            </Link>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-gray-500 font-medium text-sm">Tasks Pending</h3><ListChecks className="text-orange-500 w-5 h-5" />
              </div>
              <p className="text-4xl font-black text-gray-900 mb-3">{pendingTasksCount}</p>
            </div>
            <Link to="/groups" className="text-sm font-bold text-blue-600 hover:underline">View all tasks →</Link>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-purple-200 transition flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-gray-500 font-medium text-sm">Unread Alerts</h3><BellRing className="text-purple-500 w-5 h-5" />
              </div>
              <p className="text-4xl font-black text-gray-900 mb-3">{unreadNotificationsCount}</p>
            </div>
            <Link to="/notifications" className="text-sm font-bold text-blue-600 hover:underline">Check notifications →</Link>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Real-time Activity Feed */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
               <Link to="/notifications" className="text-sm text-blue-600 font-medium hover:underline">View History</Link>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {recentActivity.length > 0 ? recentActivity.map((act, index) => {
                 const isLast = index === recentActivity.length - 1;
                 
                 let Icon = Info;
                 let colorClass = "bg-gray-50 text-gray-500";
                 if(act.type === 'group') { Icon = Users; colorClass = "bg-emerald-50 text-emerald-500"; }
                 if(act.type === 'reply') { Icon = MessageSquare; colorClass = "bg-blue-50 text-blue-500"; }
                 if(act.type === 'reminder') { Icon = Clock; colorClass = "bg-red-50 text-red-500"; }
                 if(act.type === 'system') { Icon = BookOpen; colorClass = "bg-purple-50 text-purple-500"; }

                 return (
                   <div key={act._id} className={`flex items-start gap-4 p-4 ${!isLast ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition cursor-pointer`}>
                     <div className={`p-2 rounded-full mt-1 shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm text-gray-800 leading-snug"><span className="font-bold text-gray-900">{act.title}:</span> {act.message}</p>
                       <p className="text-xs text-gray-400 mt-1">
                          {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </p>
                     </div>
                   </div>
                 )
              }) : (
                 <div className="p-8 text-center text-gray-400 text-sm">No recent activity found.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/repository" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-300 hover:shadow-md transition group">
                <div className="bg-blue-50 p-3 rounded-xl mb-3 group-hover:bg-blue-600 transition-colors"><BookOpen className="w-6 h-6 text-blue-600 group-hover:text-white" /></div>
                <span className="text-sm font-bold text-gray-900">Browse Repository</span>
              </Link>
              <Link to="/groups" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-orange-300 hover:shadow-md transition group">
                <div className="bg-orange-50 p-3 rounded-xl mb-3 group-hover:bg-orange-500 transition-colors"><ListChecks className="w-6 h-6 text-orange-500 group-hover:text-white" /></div>
                <span className="text-sm font-bold text-gray-900">Manage Group Tasks</span>
              </Link>
              <Link to="/threads" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-emerald-300 hover:shadow-md transition group">
                <div className="bg-emerald-50 p-3 rounded-xl mb-3 group-hover:bg-emerald-500 transition-colors"><MessageSquare className="w-6 h-6 text-emerald-500 group-hover:text-white" /></div>
                <span className="text-sm font-bold text-gray-900">Ask a Question</span>
              </Link>
              <Link to="/cgpa" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-purple-300 hover:shadow-md transition group">
                <div className="bg-purple-50 p-3 rounded-xl mb-3 group-hover:bg-purple-500 transition-colors"><TrendingUp className="w-6 h-6 text-purple-500 group-hover:text-white" /></div>
                <span className="text-sm font-bold text-gray-900">Calculate CGPA</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;