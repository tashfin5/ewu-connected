import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({ code: '', title: '', year: 'First Year' });

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
      alert(error.response?.data?.message || "Failed to add course");
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
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black tracking-widest uppercase mb-4 border border-blue-100 dark:border-blue-800/50 shadow-sm">
              {deptId} Department
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">
              {getFullDeptName(deptId)}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-3 font-medium text-lg">Browse courses by academic year</p>
          </div>

          {/* Action Area: Search & Admin Add */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search course code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
              />
            </div>

            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md shadow-blue-500/20 shrink-0"
              >
                <Plus className="w-5 h-5" /> Add Course
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
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            {Object.keys(filteredGroups).map((year, index) => (
              <motion.div 
                variants={itemVariants} 
                key={year} 
                className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-[2rem] shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden"
              >
                {/* Year Header (Gradient) */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 md:px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner">
                      <Layers className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{year}</h2>
                  </div>
                  <div className="bg-white/10 px-4 py-1.5 rounded-full text-white text-sm font-bold border border-white/20 backdrop-blur-md shadow-sm">
                    {filteredGroups[year].length} {filteredGroups[year].length === 1 ? 'Course' : 'Courses'}
                  </div>
                </div>
                
                {/* Course List */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredGroups[year].map((course) => (
                    <Link 
                      key={course._id}
                      to={`/repository/${deptId}/${course.code.toLowerCase()}`}
                      state={{ courseId: course._id }}
                      className="flex items-center p-6 sm:px-8 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition-colors group relative"
                    >
                      {/* Left Icon */}
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-500/30">
                        <BookOpen className="w-6 h-6" />
                      </div>

                      {/* Course Details */}
                      <div className="ml-6 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                          <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black rounded-xl uppercase tracking-widest w-fit border border-blue-200 dark:border-blue-800/50 shadow-sm">
                            {course.code}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {course.title}
                          </h3>
                        </div>
                        {course.description && (
                          <p className="text-slate-500 dark:text-zinc-400 text-sm mt-2 line-clamp-1 font-medium">{course.description}</p>
                        )}
                      </div>

                      {/* Right Arrow */}
                      <div className="w-12 h-12 flex shrink-0 items-center justify-center rounded-full bg-transparent group-hover:bg-blue-50 dark:group-hover:bg-zinc-800 transition-colors border border-transparent group-hover:border-blue-100 dark:group-hover:border-zinc-700">
                        <ChevronRight className="w-6 h-6 text-slate-300 dark:text-zinc-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
            
            {/* Empty State if Search yields nothing */}
            {searchQuery && Object.keys(filteredGroups).length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
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
      
    </Layout>
  );
};

export default DepartmentCourses;