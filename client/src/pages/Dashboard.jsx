import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

import { 
  Clock, TrendingUp, ListChecks, MessageSquare, 
  CheckCircle2, Award, AlertCircle, BookOpen, 
  BellRing, Info, Users, Search, ChevronRight
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
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA ---
  useEffect(() => {
    if (!user || !user.token) return;

    const fetchDashboardData = async () => {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      try {
        // Fetch all primary independent data in parallel!
        const [deadlineRes, groupRes, notifRes, resourceRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/deadlines`, config),
          axios.get(`${API_URL}/api/groups`, config),
          axios.get(`${API_URL}/api/notifications`, config),
          axios.get(`${API_URL}/api/resources`, config)
        ]);

        // 1. Process Deadlines
        if (deadlineRes.status === 'fulfilled') {
          const now = new Date();
          const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          const urgent = deadlineRes.value.data.filter(d => {
            const dueDate = new Date(d.dueDate);
            return dueDate >= now && dueDate <= in48Hours;
          }).slice(0, 3); 
          setPriorityDeadlines(urgent);
        }

        // 2. Process Group Tasks concurrently
        if (groupRes.status === 'fulfilled') {
          const groupDetailPromises = groupRes.value.data.map(group => 
            axios.get(`${API_URL}/api/groups/${group._id}`, config)
          );
          
          const detailsResponses = await Promise.allSettled(groupDetailPromises);
          
          let taskCount = 0;
          detailsResponses.forEach(res => {
            if (res.status === 'fulfilled' && res.value.data.tasks) {
              const myPending = res.value.data.tasks.filter(t => 
                (t.assignedTo?._id === user._id || !t.assignedTo) && t.status !== 'done'
              ).length;
              taskCount += myPending;
            }
          });
          setPendingTasksCount(taskCount);
        }

        // 3. Process Notifications & Recent Activity
        if (notifRes.status === 'fulfilled') {
          const unreadCount = notifRes.value.data.filter(n => !n.isRead).length;
          setUnreadNotificationsCount(unreadCount);
          setRecentActivity(notifRes.value.data.slice(0, 3));
        }

        // 4. Process Resources
        if (resourceRes.status === 'fulfilled') {
          const resourcesArray = Array.isArray(resourceRes.value.data) ? resourceRes.value.data : (resourceRes.value.data.resources || []);
          setRepositoryCount(resourcesArray.length);
        }

      } catch (error) {
        console.error("Dashboard data sync failed", error);
      } finally {
        setIsLoading(false);
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
  let cardBg = 'from-orange-500 to-orange-700'; 

  if (points >= 2500) {
    currentRank = 'Radiant'; nextRank = 'Max Rank'; currentTierMin = 2500; nextTierMin = 2500; 
    cardBg = 'from-yellow-400 via-yellow-500 to-orange-500 shadow-yellow-500/20'; 
  } else if (points >= 2000) {
    currentRank = 'Diamond'; nextRank = 'Radiant'; currentTierMin = 2000; nextTierMin = 2500;
    cardBg = 'from-pink-400 to-pink-600 shadow-pink-500/20'; 
  } else if (points >= 1500) {
    currentRank = 'Platinum'; nextRank = 'Diamond'; currentTierMin = 1500; nextTierMin = 2000;
    cardBg = 'from-blue-400 to-blue-600 shadow-blue-500/20'; 
  } else if (points >= 1000) {
    currentRank = 'Gold'; nextRank = 'Platinum'; currentTierMin = 1000; nextTierMin = 1500;
    cardBg = 'from-yellow-500 to-yellow-600 shadow-yellow-600/20'; 
  } else if (points >= 500) {
    currentRank = 'Silver'; nextRank = 'Gold'; currentTierMin = 500; nextTierMin = 1000;
    cardBg = 'from-slate-400 to-slate-600 shadow-slate-500/20'; 
  }

  const pointsNeeded = nextTierMin - points;
  const rankProgress = points >= 2500 ? 100 : ((points - currentTierMin) / (nextTierMin - currentTierMin)) * 100;

  // Formatting Helper
  const getTypeColor = (type) => {
    switch(type) {
      case 'Exam': return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50';
      case 'Project': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50';
      default: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-[80vh] flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
      <motion.div 
        variants={containerVariants} initial="hidden" animate="show"
        className="p-4 md:p-8 max-w-7xl mx-auto"
      >
        
        {/* Top Header & Rank Card */} 
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 text-lg font-medium">Ready to excel today?</p>
          </div>
          
          <div className={`bg-gradient-to-br ${cardBg} text-white p-6 rounded-3xl shadow-xl w-full lg:w-96 relative overflow-hidden transition-all hover:scale-[1.02] duration-300`}>
            {/* Abstract Background Shapes */}
            <div className="absolute -right-6 -top-6 bg-white/20 w-32 h-32 rounded-full blur-2xl"></div>
            <div className="absolute -left-6 -bottom-6 bg-black/10 w-24 h-24 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm shadow-sm">
                    <Award className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-white/80 font-bold tracking-widest uppercase">Current Rank</p>
                    <p className="font-black text-2xl leading-tight drop-shadow-sm">{currentRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/80 font-bold uppercase tracking-widest">Points</p>
                  <p className="font-black text-2xl drop-shadow-sm">{points}</p>
                </div>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2.5 mb-2 relative overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${rankProgress}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                  className="bg-white h-2.5 rounded-full"
                />
              </div>
              <p className="text-xs font-semibold text-white/90">
                {points >= 2500 
                  ? 'Highest rank achieved!' 
                  : <><span className="font-black text-white">{pointsNeeded} points</span> to {nextRank}!</>
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Smart Repository CTA */}
          <Link to="/repository" className="group">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-500/20 text-white flex flex-col justify-between h-full relative overflow-hidden hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -right-8 -top-8 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-blue-100 font-bold text-xs tracking-widest uppercase">Smart Repository</h3>
                  <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform"><Search className="text-white w-5 h-5" /></div>
                </div>
                <p className="text-2xl font-black mb-1">Need study materials?</p>
                <p className="text-blue-100 text-sm mb-6 font-medium leading-relaxed">
                  Access {repositoryCount > 0 ? `${repositoryCount}+` : 'community'} notes, slides, and past papers.
                </p>
              </div>
              <div className="relative z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
                Browse Now <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
          
          <Link to="/groups" className="group">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 hover:shadow-xl hover:border-orange-300/50 dark:hover:border-orange-900/50 transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 dark:text-zinc-400 font-bold text-xs tracking-widest uppercase">Tasks Pending</h3>
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform"><ListChecks className="w-5 h-5" /></div>
                </div>
                <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="text-5xl font-black text-slate-900 dark:text-white mb-3">
                  {pendingTasksCount}
                </motion.p>
              </div>
              <div className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:gap-2 transition-all">View tasks <ChevronRight className="w-4 h-4" /></div>
            </div>
          </Link>
          
          <Link to="/notifications" className="group">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 hover:shadow-xl hover:border-purple-300/50 dark:hover:border-purple-900/50 transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 dark:text-zinc-400 font-bold text-xs tracking-widest uppercase">Unread Alerts</h3>
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><BellRing className="w-5 h-5" /></div>
                </div>
                <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="text-5xl font-black text-slate-900 dark:text-white mb-3">
                  {unreadNotificationsCount}
                </motion.p>
              </div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:gap-2 transition-all">Check alerts <ChevronRight className="w-4 h-4" /></div>
            </div>
          </Link>

        </motion.div>

        {/* Priority Deadlines */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-500" /> Priority Deadlines
            </h2>
            <Link to="/alerts" className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">View All</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {priorityDeadlines.length > 0 ? priorityDeadlines.map((deadline, i) => {
               const due = new Date(deadline.dueDate);
               const diffTime = due - new Date();
               const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
               
               return (
                 <motion.div 
                   key={deadline._id} 
                   initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (i * 0.1) }}
                   className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-red-200/50 dark:border-red-900/30 shadow-lg shadow-red-100/20 dark:shadow-none hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
                 >
                   <div className="flex justify-between items-start mb-3">
                     <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate pr-2">{deadline.title}</h3>
                     <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border shrink-0 ${getTypeColor(deadline.type)}`}>
                       {deadline.type}
                     </span>
                   </div>
                   <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-medium">{deadline.course}</p>
                   <div className="flex justify-between items-center text-sm font-bold text-red-500 dark:text-red-400">
                     <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4" /> {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                     <span className="text-xs bg-red-100 dark:bg-red-500/20 px-2.5 py-1.5 rounded-lg text-red-700 dark:text-red-300 shadow-sm">{hoursLeft <= 0 ? 'Due Now!' : `${hoursLeft}h left`}</span>
                   </div>
                 </motion.div>
               )
            }) : (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-10 rounded-3xl text-center text-emerald-600 dark:text-emerald-400 flex flex-col items-center">
                 <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-full mb-4">
                   <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <p className="font-bold text-lg mb-1">You're all caught up!</p>
                 <p className="text-sm font-medium opacity-80">No urgent deadlines in the next 48 hours.</p>
               </motion.div>
            )}
          </div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Real-time Activity Feed */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Activity</h2>
               <Link to="/notifications" className="text-sm text-blue-600 dark:text-blue-400 font-bold hover:underline">View History</Link>
            </div>
            
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden">
              {recentActivity.length > 0 ? recentActivity.map((act, index) => {
                 const isLast = index === recentActivity.length - 1;
                 
                 let Icon = Info;
                 let colorClass = "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400";
                 if(act.type === 'group') { Icon = Users; colorClass = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"; }
                 if(act.type === 'reply') { Icon = MessageSquare; colorClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"; }
                 if(act.type === 'reminder') { Icon = Clock; colorClass = "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"; }
                 if(act.type === 'system') { Icon = BookOpen; colorClass = "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"; }

                 return (
                   <motion.div 
                     key={act._id} 
                     initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                     className={`flex items-start gap-5 p-5 ${!isLast ? 'border-b border-slate-100 dark:border-zinc-800/50' : ''} hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer`}
                   >
                     <div className={`p-3 rounded-2xl shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium"><span className="font-bold text-slate-900 dark:text-white mr-1">{act.title}:</span>{act.message}</p>
                       <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 font-semibold tracking-wide">
                          {new Date(act.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </p>
                     </div>
                   </motion.div>
                 )
              }) : (
                 <div className="p-10 text-center text-slate-400 dark:text-zinc-500 text-sm font-medium">No recent activity found.</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/repository" className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col items-center justify-center text-center hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl mb-4 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 transition-colors"><BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:text-white" /></div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Repository</span>
              </Link>
              <Link to="/groups" className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col items-center justify-center text-center hover:border-orange-300 dark:hover:border-orange-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl mb-4 group-hover:bg-orange-500 transition-colors"><ListChecks className="w-7 h-7 text-orange-500 dark:text-orange-400 group-hover:text-white" /></div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Group Tasks</span>
              </Link>
              <Link to="/threads" className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col items-center justify-center text-center hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl mb-4 group-hover:bg-emerald-500 transition-colors"><MessageSquare className="w-7 h-7 text-emerald-500 dark:text-emerald-400 group-hover:text-white" /></div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Ask Question</span>
              </Link>
              <Link to="/cgpa" className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col items-center justify-center text-center hover:border-purple-300 dark:hover:border-purple-700 hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl mb-4 group-hover:bg-purple-500 transition-colors"><TrendingUp className="w-7 h-7 text-purple-500 dark:text-purple-400 group-hover:text-white" /></div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Calc CGPA</span>
              </Link>
            </div>
          </div>

        </motion.div>
      </motion.div>
      )}
    </Layout>
  );
};

export default Dashboard;