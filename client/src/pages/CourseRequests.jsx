import { useState, useEffect, useContext } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { 
  ClipboardList, CheckCircle, XCircle, Edit, 
  Trash2, X, AlertCircle, Save, BookOpen 
} from 'lucide-react';
import toast from 'react-hot-toast'; // Using react-hot-toast if available, else just alert. It's in package.json.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CourseRequests = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get(`${API_URL}/api/courses/requests`, config);
      setRequests(res.data);
    } catch (error) {
      toast.error("Failed to load course requests");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status, updatedData = null) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = { status, ...(updatedData || {}) };
      
      await axios.put(`${API_URL}/api/courses/requests/${id}`, payload, config);
      
      toast.success(`Request ${status} successfully`);
      fetchRequests(); // Refresh the list
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${status} request`);
    }
  };

  const openEditModal = (req) => {
    setEditingRequest({ ...req });
    setIsEditModalOpen(true);
  };

  const saveAndApprove = (e) => {
    e.preventDefault();
    if (editingRequest) {
      handleStatusUpdate(editingRequest._id, 'approved', {
        courseCode: editingRequest.courseCode.toUpperCase(),
        courseTitle: editingRequest.courseTitle,
        year: editingRequest.year
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-black tracking-widest uppercase mb-4 border border-purple-100 dark:border-purple-800/50 shadow-sm">
            Admin Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Course Requests
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium text-lg">Review and manage courses suggested by students.</p>
        </motion.div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : requests.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
            <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
               <ClipboardList className="w-12 h-12 text-slate-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No pending requests</h3>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">All student requests have been processed.</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
            {requests.map(req => (
              <motion.div 
                key={req._id} variants={itemVariants}
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-3xl p-6 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-2xl shrink-0 mt-1 ${req.status === 'pending' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : req.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                     <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-200 dark:border-zinc-700">
                        {req.department}
                      </span>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest border ${req.status === 'pending' ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800/50 dark:text-orange-400' : req.status === 'approved' ? 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800/50 dark:text-emerald-400' : 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-800/50 dark:text-red-400'}`}>
                        {req.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {req.courseCode} - {req.courseTitle}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mt-1">
                      Year: <span className="text-slate-700 dark:text-zinc-300">{req.year}</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-3">
                      Requested by <span className="font-bold text-slate-600 dark:text-zinc-400">{req.requestedBy?.name || 'Unknown'}</span> ({req.requestedBy?.student_id || 'N/A'})
                    </p>
                  </div>
                </div>

                {/* Actions (Only for pending requests) */}
                {req.status === 'pending' && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button 
                      onClick={() => handleStatusUpdate(req._id, 'rejected')}
                      className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors tooltip"
                      title="Reject"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => openEditModal(req)}
                      className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors tooltip"
                      title="Edit & Approve"
                    >
                      <Edit className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(req._id, 'approved', { courseCode: req.courseCode, courseTitle: req.courseTitle, year: req.year })}
                      className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                    >
                      <CheckCircle className="w-5 h-5" /> Approve directly
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

      </div>

      {/* Edit & Approve Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full">
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Edit & Approve</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-medium">Modify the details before officially adding it.</p>
                
                <form onSubmit={saveAndApprove} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Code</label>
                    <input 
                      type="text" 
                      value={editingRequest.courseCode}
                      onChange={(e) => setEditingRequest({...editingRequest, courseCode: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Title</label>
                    <input 
                      type="text" 
                      value={editingRequest.courseTitle}
                      onChange={(e) => setEditingRequest({...editingRequest, courseTitle: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Academic Year</label>
                    <select 
                      value={editingRequest.year}
                      onChange={(e) => setEditingRequest({...editingRequest, year: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option>First Year</option>
                      <option>Second Year</option>
                      <option>Third Year</option>
                      <option>Fourth Year</option>
                    </select>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mt-6 transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Save & Approve
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default CourseRequests;
