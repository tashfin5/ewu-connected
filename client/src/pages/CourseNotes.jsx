import { useState, useEffect, useRef, useContext } from 'react'; 
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import ResourceCard from '../components/ResourceCard';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Upload, Trash2, X, AlertTriangle, ArrowLeft, Folder, ChevronRight, BookOpen } from 'lucide-react';
import { AuthContext } from '../context/AuthContext'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CourseNotes = () => {
  // 🚨 THE FIX: Failsafe URL Extraction
  const params = useParams();
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  
  // If useParams fails because of a naming mismatch in App.jsx, this rips the exact names from the URL
  const courseCode = params.courseCode || params.course || params.id || pathSegments[pathSegments.length - 1];
  const deptId = params.deptId || params.department || params.dept || pathSegments[pathSegments.length - 2];

  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId;

  const [notes, setNotes] = useState([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { user, login } = useContext(AuthContext); 
  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo && userInfo.role === 'admin';
  const token = userInfo ? userInfo.token : null;
  
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  
  const initialLoadDone = useRef(false);

  const [newNote, setNewNote] = useState({
    title: '',
    description: '',
    category: 'Lecture Notes'
  });

  const fetchNotes = async (isInitialLoad = false) => {
    // Failsafe check: Stop if we somehow still don't have a course code
    if (!courseCode || courseCode === 'undefined') return;

    try {
      const res = await axios.get(`${API_URL}/api/resources/${courseCode}?sort=${sortBy}&department=${deptId}`);
      
      if (isInitialLoad || !initialLoadDone.current || JSON.stringify(res.data) !== JSON.stringify(notes)) {
        setNotes(res.data);
      }
    } catch (error) {
      console.error("Failed to load notes", error);
    } finally {
      setLoading(false);
      initialLoadDone.current = true; 
    }
  };

  useEffect(() => {
    setLoading(true);
    initialLoadDone.current = false; 
    fetchNotes(true); 
  }, [courseCode, deptId, sortBy]);

  useEffect(() => {
    if (loading || !initialLoadDone.current) return;

    const interval = setInterval(() => {
      fetchNotes(false); 
    }, 5000);

    return () => clearInterval(interval);
  }, [notes, courseCode, deptId, sortBy, loading]);

  const handleUploadNote = async (e) => {
    e.preventDefault();
    
    if (!file) return alert("Please select a file to upload.");
    if (!courseCode || courseCode === 'undefined') return alert("Error: Course Code is missing from the URL.");

    setIsUploading(true);

    try {
      let currentToken = token;
      if (!currentToken) return alert("Authentication error. Please LOGOUT and LOGIN again.");

      const formData = new FormData();
      formData.append('title', newNote.title);
      formData.append('description', newNote.description);
      formData.append('category', newNote.category);
      formData.append('courseCode', courseCode); // This is now guaranteed to be correct
      formData.append('department', deptId);     // This is now guaranteed to be correct
      formData.append('file', file); 

      const config = { 
        headers: { 
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'multipart/form-data'
        } 
      };

      const res = await axios.post(`${API_URL}/api/resources/upload`, formData, config);
      
      setNotes([res.data, ...notes]); 
      setIsUploadModalOpen(false);
      setNewNote({ title: '', description: '', category: 'Lecture Notes' });
      setFile(null);

      if (user) {
        const updatedUser = { ...user, points: (Number(user.points) || 0) + 50 };
        localStorage.setItem('userInfo', JSON.stringify(updatedUser));
        login(updatedUser); 
      }

    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return alert("Course ID not found. Return to the department page and try again.");
    
    try {
      await axios.delete(`${API_URL}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/repository/${deptId}`); 
    } catch (error) {
      alert("Failed to delete course");
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
      <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
        
        {/* ================= BREADCRUMBS & BACK BUTTON ================= */}
        <div className="flex items-center justify-between mb-8">
          <nav className="flex items-center text-sm font-bold text-slate-500 dark:text-zinc-500">
            <Link to="/repository" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors">
              <Folder className="w-4 h-4" /> Repository
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-300 dark:text-zinc-600" />
            <Link to={`/repository/${deptId}`} className="hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-wider transition-colors">
              {deptId}
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-300 dark:text-zinc-600" />
            <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wider">{courseCode}</span>
          </nav>
          
          <Link to={`/repository/${deptId}`} className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
        </div>
        
        {/* ================= HEADER ================= */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black tracking-widest uppercase mb-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                {courseCode} Materials
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Course Resources
              </h1>
              <p className="text-slate-500 dark:text-zinc-400 mt-3 font-medium text-lg">Total uploaded materials: <span className="font-black text-slate-900 dark:text-white">{notes.length}</span></p>
            </div>

            <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto shrink-0">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all shadow-sm flex-1 sm:flex-none cursor-pointer appearance-none"
              >
                <option value="recent">Sort by: Recent</option>
                <option value="rating">Sort by: Highest Rated</option>
              </select>
              
              {isAdmin && (
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-red-200 dark:border-red-900/50 text-red-500 font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex-1 sm:flex-none"
                >
                  <Trash2 className="w-5 h-5" /> Delete Course
                </button>
              )}
              
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20 flex-1 sm:flex-none"
              >
                <Upload className="w-5 h-5" /> Upload Material
              </button>
            </div>
          </div>
        </motion.div>

        {/* ================= NOTES GRID ================= */}
        {loading && notes.length === 0 ? (
          <div className="flex justify-center items-center py-32">
             <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : notes.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
            <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No materials available</h3>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Be the first to share resources for this course and earn points!</p>
            <button onClick={() => setIsUploadModalOpen(true)} className="mt-6 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/20 dark:shadow-white/10 flex items-center gap-2 mx-auto">
              <Upload className="w-4 h-4" /> Upload Now
            </button>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
            {notes.map((note) => (
              <motion.div variants={itemVariants} key={note._id}>
                <ResourceCard 
                  resource={note} 
                  isAdmin={isAdmin} 
                  token={token} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      <AnimatePresence>
        {/* Upload Note Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
                <h3 className="font-black text-slate-900 dark:text-white text-lg">Upload Course Material</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors bg-white dark:bg-zinc-800 p-2 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              
              <form onSubmit={handleUploadNote} className="p-8 space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Material Title</label>
                  <input type="text" placeholder="e.g. Chapter 1 Summary" value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" required />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Category</label>
                  <select value={newNote.category} onChange={(e) => setNewNote({...newNote, category: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                    <option>Lecture Notes</option>
                    <option>Practice Problems</option>
                    <option>Exam Guide</option>
                    <option>Project Resources</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Select File (PDF, Image)</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} className="w-full p-3 bg-slate-50 dark:bg-zinc-800/50 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-zinc-300 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-100 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-200 dark:hover:file:bg-blue-800/50 outline-none cursor-pointer transition-colors" required />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Description (Optional)</label>
                  <textarea rows="3" placeholder="Briefly describe what this covers..." value={newNote.description} onChange={(e) => setNewNote({...newNote, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all resize-none"></textarea>
                </div>
                
                <button type="submit" disabled={isUploading} className={`w-full text-white py-4 rounded-2xl font-black mt-2 transition-all shadow-xl flex items-center justify-center gap-2 ${isUploading ? 'bg-slate-400 dark:bg-zinc-700 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5'}`}>
                  {isUploading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Uploading...</> : <><Upload className="w-5 h-5" /> Publish Material (+50 pts)</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Course Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-xl">Delete this course?</h3>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-3 mb-8 font-medium leading-relaxed">This action cannot be undone. All notes associated with this course will lose their parent link.</p>
              <div className="flex gap-4">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-white font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                <button onClick={handleDeleteCourse} className="flex-1 py-3.5 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </Layout>
  );
};

export default CourseNotes;