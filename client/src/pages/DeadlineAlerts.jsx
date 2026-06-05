import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { 
  Calendar as CalendarIcon, Clock, AlertCircle, Plus, 
  Trash2, ChevronLeft, ChevronRight, List as ListIcon, 
  BookOpen, BellRing, CheckCircle, XCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DeadlineAlerts = () => {
  const { user } = useContext(AuthContext);
  const [deadlines, setDeadlines] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // 🚨 NEW: Custom Toast Notification State
  const [toast, setToast] = useState(null);
  const hasNotifiedUrgent = useRef(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', course: '', type: 'Assignment', date: '', time: '23:59', priority: 'Medium'
  });

  // --- Notification Helper ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); // Auto-hide after 4 seconds
  };

  // --- 🚨 MODIFIED: Math & Formatting Helpers for precise Hours/Mins ---
  const getRemainingTime = (dateString) => {
    const due = new Date(dateString);
    if (isNaN(due.getTime())) return { text: "Invalid Date", color: "text-red-500", isUrgent: false };

    const now = new Date();
    const diffTime = due - now;
    
    // Already past due
    if (diffTime < 0) return { text: "Overdue", color: "text-red-600 font-bold", isUrgent: true };

    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

    // Under 24 hours: Show hours and minutes
    if (diffHours < 24) {
      if (diffHours === 0) {
        return { text: `${diffMinutes}m left`, color: "text-red-500 font-bold", isUrgent: true };
      }
      return { text: `${diffHours}h ${diffMinutes}m left`, color: "text-red-500 font-bold", isUrgent: true };
    }

    // Over 24 hours: Show days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 2) return { text: `${diffDays} days left`, color: "text-orange-500 font-bold", isUrgent: true };
    return { text: `${diffDays} days left`, color: "text-gray-500 dark:text-gray-400", isUrgent: false };
  };

  // --- Data Fetching ---
  const fetchDeadlines = async () => {
    if (!user || !user.token) return;

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${API_URL}/api/deadlines`, config);
      
      if (Array.isArray(res.data)) {
        setDeadlines(res.data);
        
        // 🚨 NEW: Trigger Warning Notification on Load if Deadlines are Urgent
        if (!hasNotifiedUrgent.current) {
          const urgentCount = res.data.filter(d => getRemainingTime(d.dueDate).isUrgent).length;
          if (urgentCount > 0) {
            showToast(`You have ${urgentCount} urgent deadline(s) approaching!`, 'warning');
            hasNotifiedUrgent.current = true; // Prevent spamming the notification on every re-render
          }
        }
      } else {
        setDeadlines([]); 
      }
    } catch (error) {
      showToast("Failed to sync deadlines with server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, [user]); 

  // --- Handlers ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const dueDate = new Date(`${formData.date}T${formData.time}`);
      
      const res = await axios.post(`${API_URL}/api/deadlines`, { ...formData, dueDate }, config);
      
      setDeadlines(prevDeadlines => [...prevDeadlines, res.data]);
      setShowModal(false);
      setFormData({ title: '', course: '', type: 'Assignment', date: '', time: '23:59', priority: 'Medium' });
      
      // 🚨 NEW: Success Notification
      showToast("Deadline successfully added!", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to add deadline. Please check your inputs.", "error");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      title: "Delete Deadline?",
      description: "Are you sure you want to delete this deadline?",
      confirmText: "Delete",
      icon: <Trash2 className="w-8 h-8" />,
      action: async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          await axios.delete(`${API_URL}/api/deadlines/${id}`, config);
          setDeadlines(deadlines.filter(d => d._id !== id));
          setConfirmDialog(null);
          showToast("Deadline removed.", "success");
        } catch (error) {
          showToast("Failed to delete deadline.", "error");
        }
      }
    });
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'Exam': return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400';
      case 'Project': return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
      default: return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
    }
  };

  // --- Calendar Logic ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const safeDeadlines = Array.isArray(deadlines) ? deadlines : [];
  const priorityDeadlines = safeDeadlines.filter(d => getRemainingTime(d.dueDate).isUrgent || d.priority === 'High');

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="p-2 border border-transparent"></div>);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = new Date(year, month, d).toDateString();
      const dayDeadlines = safeDeadlines.filter(dl => new Date(dl.dueDate).toDateString() === dateString);
      const isToday = new Date().toDateString() === dateString;

      days.push(
        <div key={d} className={`min-h-[80px] p-2 border border-gray-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-lg hover:border-blue-200 dark:hover:border-blue-500/50 transition ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">{d}</div>
          <div className="space-y-1">
            {dayDeadlines.map(dl => (
              <div key={dl._id} className={`text-[9px] font-bold p-1 rounded truncate ${getTypeColor(dl.type)}`} title={dl.title}>
                {dl.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      {isLoading ? (
        <div className="min-h-[80vh] flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
      <div className="p-4 md:p-8 max-w-7xl mx-auto relative">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Deadline Alerts</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Stay on top of your assignments and exams</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#0056D2] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Deadline
          </button>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: Priority List */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5" /> Priority List
              </h2>
              
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                {priorityDeadlines.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No urgent deadlines.</p>
                ) : (
                  priorityDeadlines.map(deadline => {
                    const time = getRemainingTime(deadline.dueDate);
                    return (
                      <motion.div variants={itemVariants} key={`pri-${deadline._id}`} className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-red-100 dark:border-zinc-800 shadow-sm relative group">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight pr-6">{deadline.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{deadline.course}</p>
                        <div className={`text-xs mt-2 flex items-center gap-1 ${time.color}`}>
                          <Clock className="w-3.5 h-3.5" /> {time.text}
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT: Main Content Area (List or Calendar) */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Deadlines</h2>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 dark:bg-zinc-800/80 p-1 rounded-lg">
                <button 
                  onClick={() => setView('list')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition ${view === 'list' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                >
                  <ListIcon className="w-4 h-4" /> List
                </button>
                <button 
                  onClick={() => setView('calendar')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition ${view === 'calendar' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                >
                  <CalendarIcon className="w-4 h-4" /> Calendar
                </button>
              </div>
            </div>

            {/* --- LIST VIEW --- */}
            {view === 'list' && (
              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
                {safeDeadlines.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900/50 p-10 rounded-2xl border border-gray-100 dark:border-zinc-800/80 text-center text-gray-500 dark:text-gray-400">
                    You have no upcoming deadlines. Click "Add Deadline" to create one!
                  </div>
                ) : (
                  safeDeadlines.map(deadline => {
                    const due = new Date(deadline.dueDate);
                    const isValidDate = !isNaN(due.getTime());
                    const time = getRemainingTime(deadline.dueDate);
                    
                    return (
                      <motion.div variants={itemVariants} key={deadline._id} className="bg-white dark:bg-zinc-900/50 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-200 dark:hover:border-blue-500/50 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getTypeColor(deadline.type)}`}>
                              {deadline.type}
                            </span>
                            {deadline.priority === 'High' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">High Priority</span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">{deadline.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                            <BookOpen className="w-4 h-4" /> {deadline.course}
                          </p>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 min-w-[140px]">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-200 flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            {isValidDate ? due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date Format Error'}
                          </div>
                          <div className={`text-sm flex items-center gap-1.5 ${time.color}`}>
                            <Clock className="w-4 h-4" /> {time.text}
                          </div>
                        </div>

                        <button onClick={() => handleDelete(deadline._id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition p-2.5 sm:ml-2">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            )}

            {/* --- CALENDAR VIEW --- */}
            {view === 'calendar' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-50 dark:bg-zinc-900/30 p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-gray-800 dark:text-gray-100">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 bg-white rounded border border-gray-200 hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 bg-white rounded border border-gray-200 hover:bg-gray-100 text-sm font-bold">Today</button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 bg-white rounded border border-gray-200 hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {renderCalendar()}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* --- ADD DEADLINE MODAL --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                <h3 className="text-lg font-bold text-gray-900">Create New Deadline</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500" placeholder="e.g. Chapter 4 Quiz" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Course Code</label>
                  <input required type="text" value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500" placeholder="e.g. CSE101" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                      <option value="Assignment">Assignment</option>
                      <option value="Exam">Exam</option>
                      <option value="Project">Project</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Priority</label>
                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Time</label>
                    <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-6 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Save Deadline</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🚨 NEW: Toast Notification Anchor */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold ${
              toast.type === 'error' ? 'bg-red-600' : 
              toast.type === 'warning' ? 'bg-orange-500' : 'bg-gray-900'
            }`}>
              {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : 
               toast.type === 'warning' ? <BellRing className="w-5 h-5 animate-bounce" /> : 
               <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {toast.message}
            </div>
          </div>
        )}

      </div>
      )}
      {/* Confirm Modal */}
      {createPortal(
        <AnimatePresence>
          {confirmDialog && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDialog(null)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative z-10 text-center border border-slate-100 dark:border-zinc-800">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  {confirmDialog.icon || <Trash2 className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{confirmDialog.title}</h3>
                <p className="text-slate-500 dark:text-zinc-400 font-medium mb-8">{confirmDialog.description}</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button onClick={() => confirmDialog.action()} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all">{confirmDialog.confirmText || 'Confirm'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Layout>
  );
};
 
export default DeadlineAlerts; 