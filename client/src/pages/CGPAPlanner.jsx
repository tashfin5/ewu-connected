import { useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Plus, Trash2, Target, Save, RotateCcw, FolderPlus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GRADING_SCALE = {
  'A+': 4.00, 'A': 3.75, 'A-': 3.50, 'B+': 3.25, 'B': 3.00, 'B-': 2.75,
  'C+': 2.50, 'C': 2.25, 'D': 2.00, 'F': 0.00
};

const CgpaPlanner = () => {
  const { user, login } = useContext(AuthContext);

  // --- State ---
  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [targetCgpa, setTargetCgpa] = useState('');
  const [targetCredits, setTargetCredits] = useState('');
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (user && user._id) {
      const dbCgpa = user.cgpa ? Number(user.cgpa).toFixed(2) : '';
      const dbCredits = user.credits || '';
      
      setPrevCgpa(dbCgpa);
      setPrevCredits(dbCredits);

      const savedSession = localStorage.getItem(`activePlannerSession_${user._id}`);
      if (savedSession) {
        setSemesters(JSON.parse(savedSession));
      } else {
        setSemesters([{
          id: Date.now(),
          name: 'Current Semester',
          courses: [{ id: 1, name: '', credits: 3, grade: 'A', isRetake: false }]
        }]);
      }

      setTargetCgpa(localStorage.getItem(`activePlannerTargetCgpa_${user._id}`) || '');
      setTargetCredits(localStorage.getItem(`activePlannerTargetCredits_${user._id}`) || '');
      
      setIsDataLoaded(true);
    }
  }, [user._id]); 

  const handleCgpaChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setPrevCgpa('');
      return;
    }
    if (Number(value) > 4.00) {
      setPrevCgpa('4.00'); 
    } else {
      setPrevCgpa(value);
    }
  };

  const formatCgpaOnBlur = () => {
    if (prevCgpa !== '') {
      setPrevCgpa(Number(prevCgpa).toFixed(2));
    }
  };

  // --- Core Math Engine ---
  let totalCumulativeCredits = Number(prevCredits) || 0;
  let totalCumulativePoints = (Number(prevCgpa) || 0) * totalCumulativeCredits;
  let newCreditsAdded = 0;

  const semesterStats = semesters.map(sem => {
    let termCredits = 0;
    let termPoints = 0;

    sem.courses.forEach(c => {
      const creds = Number(c.credits) || 0;
      const pts = (GRADING_SCALE[c.grade] || 0) * creds;

      termCredits += creds;
      termPoints += pts;

      if (c.isRetake) {
        const oldPts = (GRADING_SCALE[c.oldGrade] || 0) * creds;
        totalCumulativePoints += (pts - oldPts);
      } else {
        totalCumulativeCredits += creds;
        newCreditsAdded += creds;
        totalCumulativePoints += pts;
      }
    });

    const termGpa = termCredits > 0 ? (termPoints / termCredits).toFixed(2) : '0.00';
    return { id: sem.id, gpa: termGpa, credits: termCredits };
  });

  const currentCgpa = totalCumulativeCredits > 0 ? (totalCumulativePoints / totalCumulativeCredits).toFixed(2) : '0.00';

  useEffect(() => {
    if (isDataLoaded && user && user._id) {
      localStorage.setItem(`activePlannerSession_${user._id}`, JSON.stringify(semesters));
      localStorage.setItem(`activePlannerTargetCgpa_${user._id}`, targetCgpa);
      localStorage.setItem(`activePlannerTargetCredits_${user._id}`, targetCredits);
    }
  }, [semesters, targetCgpa, targetCredits, isDataLoaded, user]);

  const handleSaveHistory = async () => {
    if (!user || !user.token) return toast.error("Please login again.");

    const finalCgpa = prevCgpa !== '' ? Number(prevCgpa).toFixed(2) : '0.00';
    const finalCredits = prevCredits !== '' ? prevCredits : '0';

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const payload = {
        name: user.name,
        email: user.email,
        student_id: user.student_id,
        cgpa: finalCgpa,
        credits: finalCredits
      };

      const res = await axios.put(`${API_URL}/api/auth/update-profile`, payload, config);

      const updatedUser = { 
        ...user, 
        ...res.data, 
        cgpa: finalCgpa, 
        credits: finalCredits 
      };
      
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      if (login) login(updatedUser);

      setPrevCgpa(finalCgpa); 
      toast.success('Synced with Profile successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save to database.');
    }
  };

  // --- Target Simulator Logic ---
  let simulatorMessage = "Enter your desired CGPA and credits.";
  let isTargetImpossible = false;

  const reqCgpa = Number(targetCgpa);
  const reqCreds = Number(targetCredits);

  if (reqCgpa > 0 && reqCreds > 0) {
    const desiredTotalPoints = reqCgpa * (totalCumulativeCredits + reqCreds);
    const pointsNeeded = desiredTotalPoints - totalCumulativePoints;
    const requiredGpaAverage = pointsNeeded / reqCreds;

    if (requiredGpaAverage > 4.00) {
      isTargetImpossible = true;
      simulatorMessage = `Impossible. You need a ${requiredGpaAverage.toFixed(2)} average, which is above 4.00.`;
    } else if (requiredGpaAverage <= 0) {
      simulatorMessage = `You've practically already secured this!`;
    } else {
      const requiredGrade = Object.entries(GRADING_SCALE).reverse().find(([_, val]) => val >= requiredGpaAverage)?.[0] || 'A+';
      simulatorMessage = `You need an average GPA of ${requiredGpaAverage.toFixed(2)} (approx. ${requiredGrade}) in your remaining courses.`;
    }
  }

  // --- Action Handlers ---
  const addSemester = () => {
    setSemesters([...semesters, { id: Date.now(), name: `Semester ${semesters.length + 1}`, courses: [] }]);
  };

  const removeSemester = (semId) => {
    setSemesters(semesters.filter(s => s.id !== semId));
  };

  const addCourse = (semId, isRetake) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) {
        const newCourse = isRetake 
          ? { id: Date.now(), name: '', credits: 3, grade: 'A', isRetake: true, oldGrade: 'F' }
          : { id: Date.now(), name: '', credits: 3, grade: 'A', isRetake: false };
        return { ...sem, courses: [...sem.courses, newCourse] };
      }
      return sem;
    }));
  };

  const updateCourse = (semId, courseId, field, value) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => c.id === courseId ? { ...c, [field]: value } : c)
        };
      }
      return sem;
    }));
  };

  const removeCourse = (semId, courseId) => {
    setSemesters(semesters.map(sem => {
      if (sem.id === semId) {
        return { ...sem, courses: sem.courses.filter(c => c.id !== courseId) };
      }
      return sem;
    }));
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-sans">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 hidden md:flex">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            CGPA Planner
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-3 text-lg font-medium md:ml-16">Plan your grades and simulate different academic scenarios.</p>
        </motion.div>

        {/* Academic History Save Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none p-6 md:p-8 mb-10 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full text-left">
            <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Completed Credits</label>
            <input 
              type="number" min="0" step="1"
              value={prevCredits} onChange={(e) => setPrevCredits(e.target.value)}
              placeholder="e.g., 105"
              className="w-full px-4 py-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="flex-1 w-full text-left">
            <label className="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Current CGPA</label>
            <input 
              type="number" min="0" max="4.00" step="0.01"
              value={prevCgpa} 
              onChange={handleCgpaChange} 
              onBlur={formatCgpaOnBlur}
              placeholder="e.g., 2.76"
              className="w-full px-4 py-3.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button 
            onClick={handleSaveHistory}
            className="w-full md:w-auto bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-8 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl hover:-translate-y-0.5 hover:shadow-slate-500/20"
          >
            <Save className="w-5 h-5" /> Save to Profile
          </button>
        </motion.div>

        <div className="flex flex-col xl:flex-row gap-8 items-start">
          
          {/* Main Semester Area */}
          <div className="w-full xl:flex-1 flex flex-col gap-8">
            <AnimatePresence>
              {semesters.map((semester, index) => {
                const stats = semesterStats.find(s => s.id === semester.id);
                
                return (
                  <motion.div 
                    key={semester.id} 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none overflow-hidden text-left"
                  >
                    
                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/50 dark:bg-zinc-900/50">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input 
                          type="text" 
                          value={semester.name} 
                          onChange={(e) => {
                            const newSemesters = [...semesters];
                            newSemesters[index].name = e.target.value;
                            setSemesters(newSemesters);
                          }}
                          className="text-2xl font-black text-slate-900 dark:text-white bg-transparent border-b-2 border-transparent focus:border-blue-500 outline-none transition-all w-full md:w-auto px-1"
                        />
                        {semesters.length > 1 && (
                          <button onClick={() => removeSemester(semester.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition bg-red-50 dark:bg-red-900/20 p-2 rounded-xl">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold shadow-sm flex items-center gap-2">
                          <span className="text-slate-500 dark:text-zinc-400">GPA:</span>
                          <span className="text-blue-600 dark:text-blue-400 text-lg">{stats.gpa}</span>
                        </div>
                        <button 
                          onClick={() => addCourse(semester.id, false)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-500/20"
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                        <button 
                          onClick={() => addCourse(semester.id, true)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-orange-500/20"
                        >
                          <RotateCcw className="w-4 h-4" /> Retake
                        </button>
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-white/50 dark:bg-zinc-900/50 text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest border-b border-slate-100 dark:border-zinc-800">
                      <div className="col-span-4">Course Name/Code</div>
                      <div className="col-span-2 text-center">Credits</div>
                      <div className="col-span-3">Grade (New / Old)</div>
                      <div className="col-span-2 text-center">Grade Point</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>

                    {/* Courses List */}
                    <div className="px-4 md:px-8 py-2 divide-y divide-slate-100 dark:divide-zinc-800">
                      {semester.courses.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 dark:text-zinc-500 text-sm font-medium">No courses added yet. Start planning!</div>
                      ) : (
                        <AnimatePresence>
                          {semester.courses.map((course) => {
                            const creds = Number(course.credits) || 0;
                            let displayedPoints;
                            if (course.isRetake) {
                              const diff = (GRADING_SCALE[course.grade] - GRADING_SCALE[course.oldGrade]) * creds;
                              displayedPoints = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
                            } else {
                              displayedPoints = ((GRADING_SCALE[course.grade] || 0) * creds).toFixed(2);
                            }

                            return (
                              <motion.div 
                                key={course.id} 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className={`flex flex-col md:grid md:grid-cols-12 gap-4 py-4 md:py-6 items-center ${course.isRetake ? 'bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl md:-mx-4 md:px-4 my-2' : ''}`}
                              >
                                
                                <div className="col-span-12 md:col-span-4 flex items-center gap-3 w-full">
                                  {course.isRetake && <RotateCcw className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                                  <div className="w-full md:w-auto flex-1">
                                    <label className="md:hidden block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Course Code</label>
                                    <input 
                                      type="text" value={course.name} onChange={(e) => updateCourse(semester.id, course.id, 'name', e.target.value)}
                                      placeholder={course.isRetake ? "Retake Course..." : "e.g. CSE412"}
                                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                                    />
                                  </div>
                                </div>

                                <div className="col-span-12 md:col-span-2 w-full flex gap-4 md:block">
                                  <div className="flex-1">
                                    <label className="md:hidden block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Credits</label>
                                    <select 
                                      value={course.credits} 
                                      onChange={(e) => updateCourse(semester.id, course.id, 'credits', e.target.value)}
                                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer focus:border-blue-500 transition"
                                    >
                                      <option value="4.5">4.5</option>
                                      <option value="4">4.0</option>
                                      <option value="3">3.0</option>
                                      <option value="2">2.0</option>
                                      <option value="1.5">1.5</option>
                                      <option value="1">1.0</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="col-span-12 md:col-span-3 flex items-center gap-2 w-full">
                                  {course.isRetake && (
                                    <div className="flex-1 relative">
                                      <span className="absolute -top-2 left-2 bg-white dark:bg-zinc-900 px-1 text-[9px] font-black text-slate-400 uppercase">Old</span>
                                      <select 
                                        value={course.oldGrade} onChange={(e) => updateCourse(semester.id, course.id, 'oldGrade', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-500 dark:text-zinc-400 outline-none cursor-pointer appearance-none"
                                      >
                                        {Object.keys(GRADING_SCALE).map(g => <option key={`old-${g}`} value={g}>{g}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="flex-1 relative">
                                    {course.isRetake && <span className="absolute -top-2 left-2 bg-white dark:bg-zinc-900 px-1 text-[9px] font-black text-orange-500 uppercase">New</span>}
                                    <select 
                                      value={course.grade} onChange={(e) => updateCourse(semester.id, course.id, 'grade', e.target.value)}
                                      className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-zinc-800 border rounded-xl text-sm font-bold outline-none cursor-pointer appearance-none ${course.isRetake ? 'text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-800' : 'text-blue-600 dark:text-blue-400 border-slate-200 dark:border-zinc-700 focus:border-blue-500'}`}
                                    >
                                      {Object.keys(GRADING_SCALE).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                  </div>
                                </div>

                                <div className={`col-span-12 md:col-span-2 text-center font-black text-lg ${course.isRetake ? 'text-orange-500' : 'text-slate-900 dark:text-white'} w-full flex md:block justify-between items-center`}>
                                  <span className="md:hidden text-xs text-slate-400 dark:text-zinc-500 uppercase">Grade Point:</span>
                                  {displayedPoints}
                                </div>

                                <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center w-full">
                                  <button onClick={() => removeCourse(semester.id, course.id)} className="text-slate-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <button 
              onClick={addSemester}
              className="w-full border-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 py-6 rounded-3xl font-black flex items-center justify-center gap-3 transition-colors bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
            >
              <FolderPlus className="w-6 h-6" /> ADD ANOTHER SEMESTER
            </button>
          </div>

          {/* Right Side Widgets */}
          <div className="w-full xl:w-[380px] flex flex-col gap-6 shrink-0">
            
            {/* Main Dial */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none p-8 flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              
              <h3 className="font-black text-slate-900 dark:text-white mb-8 text-left w-full">Estimated CGPA</h3>
              
              <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                <svg viewBox="0 0 192 192" className="w-full h-full transform -rotate-90 filter drop-shadow-xl">
                  <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-zinc-800" fill="none" />
                  <circle 
                    cx="96" cy="96" r="80" 
                    stroke="url(#gradient)" strokeWidth="16" fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={`${(currentCgpa / 4.0) * 502} 502`} 
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{currentCgpa}</span>
                  <span className="text-sm font-bold text-slate-400 dark:text-zinc-500 mt-1 uppercase tracking-widest">Out of 4.0</span>
                </div>
              </div>
            </motion.div>

            {/* Target Simulator */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-900/50 p-8 shadow-lg shadow-blue-500/10 text-left">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white">Target Simulator</h3>
              </div>
              
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-blue-300 uppercase tracking-widest mb-2">Target CGPA</label>
                  <input 
                    type="number" step="0.01" min="0" max="4.00"
                    value={targetCgpa} 
                    onChange={(e) => {
                      let val = e.target.value;
                      if (Number(val) > 4.00) val = "4.00";
                      setTargetCgpa(val);
                    }}
                    placeholder="3.80"
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-500 dark:text-blue-300 uppercase tracking-widest mb-2">Credits Left</label>
                  <input 
                    type="number" step="1" min="0" max="999"
                    value={targetCredits} 
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 3) val = val.slice(0, 3);
                      setTargetCredits(val);
                    }}
                    placeholder="15"
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isTargetImpossible ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' : 'bg-white dark:bg-zinc-900 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400'} shadow-sm`}>
                <p className="text-sm font-bold leading-relaxed">
                  {simulatorMessage}
                </p>
              </div>
            </motion.div>

            {/* Breakdown */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none p-8 text-left">
              <h3 className="font-black text-slate-900 dark:text-white mb-6">Summary Breakdown</h3>
              
              <div className="space-y-5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400 font-bold">Previous Credits</span>
                  <span className="font-black text-slate-900 dark:text-white text-lg">{prevCredits || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400 font-bold">New Credits</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">+{newCreditsAdded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-zinc-400 font-bold">Total Credits</span>
                  <span className="font-black text-slate-900 dark:text-white text-lg">{totalCumulativeCredits}</span>
                </div>
                <div className="w-full h-px bg-slate-100 dark:bg-zinc-800 my-4"></div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs">Estimated CGPA</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-2xl">{currentCgpa}</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </Layout>
  );
};

export default CgpaPlanner;