import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import axios from 'axios';
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
        headers: {
          Authorization: `Bearer ${token}`
        }
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
      llb: 'Bachelor of Laws'
      // Add more as needed
    };
    return names[id] || id;
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans">
        
        {/* ================= BREADCRUMBS & BACK BUTTON ================= */}
        <div className="flex items-center justify-between mb-8">
          <nav className="flex items-center text-sm font-bold text-gray-500">
            <Link to="/repository" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
              <Folder className="w-4 h-4" /> Repository
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
            <span className="text-blue-600 uppercase">{deptId}</span>
          </nav>
          
          <Link to="/repository" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>

        {/* ================= MODERN HEADER ================= */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black tracking-widest uppercase mb-3 border border-blue-100">
              {deptId} Department
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase leading-tight">
              {getFullDeptName(deptId)}
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Browse courses by academic year</p>
          </div>

          {/* Action Area: Search & Admin Add */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search course code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>

            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 shrink-0"
              >
                <Plus className="w-5 h-5" /> Add Course
              </button>
            )}
          </div>
        </div>

        {/* ================= COURSES DISPLAY ================= */}
        {courses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-8">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No courses added yet</h3>
            <p className="text-gray-500 mt-1">Be the first to add a course for this department!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(filteredGroups).map(year => (
              <div key={year} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in">
                
                {/* Year Header (Gradient) */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 md:px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{year}</h2>
                  </div>
                  <div className="bg-blue-800/40 px-3 py-1 rounded-full text-white text-xs font-bold border border-white/10">
                    {filteredGroups[year].length} Courses
                  </div>
                </div>
                
                {/* Course List */}
                <div className="divide-y divide-gray-50">
                  {filteredGroups[year].map((course) => (
                    <Link 
                      key={course._id}
                      to={`/repository/${deptId}/${course.code.toLowerCase()}`}
                      state={{ courseId: course._id }}
                      className="flex items-center p-6 hover:bg-gray-50 transition-colors group relative"
                    >
                      {/* Left Icon */}
                      <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <BookOpen className="w-5 h-5" />
                      </div>

                      {/* Course Details */}
                      <div className="ml-5 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-lg uppercase tracking-widest w-fit">
                            {course.code}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {course.title}
                          </h3>
                        </div>
                        {course.description && (
                          <p className="text-gray-500 text-sm mt-2 line-clamp-1">{course.description}</p>
                        )}
                      </div>

                      {/* Right Arrow */}
                      <div className="w-10 h-10 flex shrink-0 items-center justify-center rounded-full bg-transparent group-hover:bg-blue-100 transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Empty State if Search yields nothing */}
            {searchQuery && Object.keys(filteredGroups).length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-8">
                <h3 className="text-xl font-bold text-gray-900">No courses found</h3>
                <p className="text-gray-500 mt-1">We couldn't find a match for "{searchQuery}".</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ================= ADD COURSE MODAL (ADMIN ONLY) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <h3 className="text-2xl font-black text-gray-900 mb-6">Add New Course</h3>
              
              <form onSubmit={handleAddCourse} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Course Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CSE101" 
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Course Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Structured Programming" 
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Academic Year</label>
                  <select 
                    value={newCourse.year}
                    onChange={(e) => setNewCourse({...newCourse, year: e.target.value})}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option>First Year</option>
                    <option>Second Year</option>
                    <option>Third Year</option>
                    <option>Fourth Year</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mt-4 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Save Course
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </Layout>
  );
};

export default DepartmentCourses;