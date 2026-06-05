import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Book, Plus, ChevronRight, X, 
  Search, Folder, ArrowLeft, Layers, BookOpen 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DepartmentCourses = () => {
  const { deptId } = useParams();
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({ code: '', title: '', year: 'First Year' });
  const [requestCourseData, setRequestCourseData] = useState({ code: '', title: '', year: 'First Year' });

  // 1. CHECK IF USER IS ADMIN & GET TOKEN
  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo && userInfo.role === 'admin';
  const token = userInfo ? userInfo.token : null;

  // 2. FETCH COURSES FROM MONGODB WHEN PAGE LOADS
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/courses/${deptId}`);
        setCourses(res.data);
      } catch (error) {
        console.error("Error fetching courses", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [deptId]);

  const toTitleCase = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // 3. SAVE NEW COURSE TO MONGODB
  const handleAddCourse = async (e) => {
    e.preventDefault();

    const formattedCourse = {
      code: newCourse.code.trim().toUpperCase(),
      title: toTitleCase(newCourse.title.trim()),
      year: newCourse.year,
      department: deptId 
    };

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.post(`${API_URL}/api/courses`, formattedCourse, config);
      
      setCourses([...courses, res.data]);
      setNewCourse({ code: '', title: '', year: 'First Year' });
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add course");
    }
  };

  const handleRequestCourse = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("You must be logged in to request a course.");
      return;
    }
    const formattedRequest = {
      courseCode: requestCourseData.code.trim().toUpperCase(),
      courseTitle: toTitleCase(requestCourseData.title.trim()),
      year: requestCourseData.year,
      department: deptId 
    };

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/courses/requests`, formattedRequest, config);
      toast.success("Course requested successfully! An admin will review it.");
      setRequestCourseData({ code: '', title: '', year: 'First Year' });
      setIsRequestModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  // 4. GROUP AND FILTER COURSES
  const groupedCourses = courses.reduce((acc, course) => {
    if (!acc[course.year]) acc[course.year] = [];
    acc[course.year].push(course);
    return acc;
  }, {});

  // Pre-filter the grouped courses based on search query
  const filteredGroups = Object.keys(groupedCourses).reduce((acc, year) => {
    const filtered = groupedCourses[year].filter(c => 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[year] = filtered;
    return acc;
  }, {});

  // Mapping for full department names
  const getFullDeptName = (id) => {
    const names = {
      cse: 'Computer Science & Engineering',
      bba: 'Bachelor of Business Administration',
      eee: 'Electrical & Electronic Engineering',
      pharmacy: 'Bachelor of Pharmacy',
      llb: 'Bachelor of Laws',
      economics: 'Economics',
      english: 'English',
      sociology: 'Sociology'
    };
    return names[id] || id;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
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
            <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wider">{deptId}</span>
          </nav>
          
          <Link to="/repository" className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
        </div>

        {/* ================= MODERN HEADER ================= */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 p-8 md:p-12 bg-white dark:bg-[#12121a] rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden"
        >
          {/* Decorative Background Elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-600/10 dark:to-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-gradient-to-tr from-sky-400/20 to-blue-500/20 dark:from-sky-500/10 dark:to-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-black tracking-widest uppercase mb-6 border border-blue-100/50 dark:border-blue-800/30 shadow-sm">
              {deptId} Department
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight leading-tight uppercase mb-4">
              {getFullDeptName(deptId)}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 font-medium text-lg md:text-xl">
              Explore the curriculum, discover courses, and access shared repository resources.
            </p>
          </div>

          {/* Action Area: Search & Admin Add */}
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0 mt-6 lg:mt-0">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search by code or title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner"
              />
            </div>

            {isAdmin ? (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all shrink-0"
              >
                <Plus className="w-5 h-5" /> Add Course
              </button>
            ) : (
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all shrink-0"
              >
                <Plus className="w-5 h-5" /> Request Course
              </button>
            )}
          </div>
        </motion.div>

        {/* ================= COURSES DISPLAY ================= */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : courses.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
            <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <Book className="w-12 h-12 text-slate-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No courses added yet</h3>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Be the first to add a course for this department!</p>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-16">
            {Object.keys(filteredGroups).map((year, index) => (
              <motion.div 
                variants={itemVariants} 
                key={year} 
                className="relative"
              >
                {/* Elegant Year Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-10 w-2 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.4)]"></div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{year}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-zinc-800 ml-4"></div>
                  <div className="px-4 py-1.5 bg-white dark:bg-[#12121a] text-slate-500 dark:text-zinc-400 text-xs font-black uppercase tracking-widest rounded-full border border-slate-200/50 dark:border-white/5 shadow-sm">
                    {filteredGroups[year].length} {filteredGroups[year].length === 1 ? 'Course' : 'Courses'}
                  </div>
                </div>
                
                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredGroups[year].map((course) => (
                    <Link 
                      key={course._id}
                      to={`/repository/${deptId}/${course.code.toLowerCase()}`}
                      state={{ courseId: course._id }}
                      className="group relative flex flex-col p-6 bg-white dark:bg-[#12121a] rounded-[2rem] border border-slate-200/60 dark:border-white/5 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
                    >
                      {/* Subtle hover flare */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-400/10 to-indigo-400/10 dark:from-blue-500/10 dark:to-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                      <div className="flex items-start justify-between mb-6 relative z-10">
                         <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center border border-blue-100/50 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-inner">
                           <BookOpen className="w-6 h-6" />
                         </div>
                         <span className="px-3 py-1.5 bg-slate-50 dark:bg-[#0a0a0a] text-slate-600 dark:text-zinc-400 text-xs font-black tracking-widest rounded-xl uppercase border border-slate-200 dark:border-white/5 shadow-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                           {course.code}
                         </span>
                      </div>
                      
                      <div className="relative z-10 flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-3 leading-snug">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-slate-500 dark:text-zinc-400 text-sm line-clamp-2 font-medium leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-8 flex items-center text-sm font-black tracking-wide text-slate-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 relative z-10 transition-colors duration-300">
                        <span className="relative">
                          Explore Resources
                          <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 group-hover:w-full transition-all duration-300"></span>
                        </span>
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
            
            {/* Empty State if Search yields nothing */}
            {searchQuery && Object.keys(filteredGroups).length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/50 dark:bg-[#12121a]/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-white/5 shadow-sm mt-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">No courses found</h3>
                <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">We couldn't find a match for "{searchQuery}".</p>
              </motion.div>
            )}
          </motion.div>
        )}

      </div>

      {/* ================= ADD COURSE MODAL (ADMIN ONLY) ================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full">
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Add New Course</h3>
                
                <form onSubmit={handleAddCourse} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CSE101" 
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Structured Programming" 
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Academic Year</label>
                    <select 
                      value={newCourse.year}
                      onChange={(e) => setNewCourse({...newCourse, year: e.target.value})}
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
                    <Plus className="w-5 h-5" /> Save Course
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= REQUEST COURSE MODAL (STUDENTS ONLY) ================= */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <button onClick={() => setIsRequestModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white transition-colors bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full">
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Request a Course</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8 font-medium">An admin will review and approve your request.</p>
                
                <form onSubmit={handleRequestCourse} className="space-y-5">
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CSE101" 
                      value={requestCourseData.code}
                      onChange={(e) => setRequestCourseData({...requestCourseData, code: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Course Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Structured Programming" 
                      value={requestCourseData.title}
                      onChange={(e) => setRequestCourseData({...requestCourseData, title: e.target.value})}
                      className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Academic Year</label>
                    <select 
                      value={requestCourseData.year}
                      onChange={(e) => setRequestCourseData({...requestCourseData, year: e.target.value})}
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
                    <Plus className="w-5 h-5" /> Submit Request
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

export default DepartmentCourses;