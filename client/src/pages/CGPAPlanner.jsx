import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Calculator, Plus, Trash2, Target, Save, RotateCcw, FolderPlus } from 'lucide-react';

const GRADING_SCALE = {
  'A+': 4.00, 'A': 3.75, 'A-': 3.50, 'B+': 3.25, 'B': 3.00, 'B-': 2.75,
  'C+': 2.50, 'C': 2.25, 'D': 2.00, 'F': 0.00
};

const CgpaPlanner = () => {
  const { user } = useContext(AuthContext);

  // --- State ---
  const [prevCgpa, setPrevCgpa] = useState('');
  const [prevCredits, setPrevCredits] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [targetCgpa, setTargetCgpa] = useState('');
  const [targetCredits, setTargetCredits] = useState('');
  
  // Flag to prevent auto-save from wiping data before it loads
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 🚨 1. LOAD USER-SPECIFIC DATA ON MOUNT
  useEffect(() => {
    if (user && user._id) {
      // Load History
      const savedHistory = JSON.parse(localStorage.getItem(`cgpaHistory_${user._id}`));
      if (savedHistory) {
        setPrevCgpa(savedHistory.cgpa || '');
        setPrevCredits(savedHistory.credits || '');
      }

      // Load Semesters
      const savedSession = localStorage.getItem(`activePlannerSession_${user._id}`);
      if (savedSession) {
        setSemesters(JSON.parse(savedSession));
      } else {
        // Default empty state for brand new users
        setSemesters([{
          id: Date.now(),
          name: 'Current Semester',
          courses: [{ id: 1, name: '', credits: 3, grade: 'A', isRetake: false }]
        }]);
      }

      // Load Targets
      setTargetCgpa(localStorage.getItem(`activePlannerTargetCgpa_${user._id}`) || '');
      setTargetCredits(localStorage.getItem(`activePlannerTargetCredits_${user._id}`) || '');
      
      setIsDataLoaded(true);
    }
  }, [user]);


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

  // 🚨 2. AUTO-SAVE EVERYTHING (Specifically tied to user._id)
  useEffect(() => {
    if (isDataLoaded && user && user._id) {
      localStorage.setItem(`activePlannerSession_${user._id}`, JSON.stringify(semesters));
      localStorage.setItem(`activePlannerTargetCgpa_${user._id}`, targetCgpa);
      localStorage.setItem(`activePlannerTargetCredits_${user._id}`, targetCredits);
      
      // Background Sync: Update the global userInfo so the Dashboard instantly sees the new CGPA
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo._id === user._id) {
         userInfo.cgpa = currentCgpa;
         localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }
    }
  }, [semesters, targetCgpa, targetCredits, isDataLoaded, user, currentCgpa]);

  const handleSaveHistory = () => {
    if (!user) return;
    localStorage.setItem(`cgpaHistory_${user._id}`, JSON.stringify({ cgpa: prevCgpa, credits: prevCredits }));
    alert('Academic history saved successfully!');
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
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600 hidden md:block" />
            CGPA Planner
          </h1>
          <p className="text-gray-500 mt-1 text-sm md:ml-11">Plan your grades and simulate different scenarios</p>
        </div>

        {/* Academic History Save Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">Total Completed Credits</label>
            <input 
              type="number" min="0" step="1"
              value={prevCredits} onChange={(e) => setPrevCredits(e.target.value)}
              placeholder="e.g., 105"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">Current CGPA</label>
            <input 
              type="number" min="0" max="4.00" step="0.01"
              value={prevCgpa} 
              onChange={handleCgpaChange} 
              placeholder="e.g., 2.76"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition"
            />
          </div>
          <button 
            onClick={handleSaveHistory}
            className="w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Save className="w-4 h-4" /> Save History
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ================= LEFT COLUMN: SEMESTERS ================= */}
          <div className="w-full lg:flex-1 flex flex-col gap-6">
            
            {semesters.map((semester, index) => {
              const stats = semesterStats.find(s => s.id === semester.id);
              
              return (
                <div key={semester.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  
                  {/* Semester Header */}
                  <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={semester.name} 
                        onChange={(e) => {
                          const newSemesters = [...semesters];
                          newSemesters[index].name = e.target.value;
                          setSemesters(newSemesters);
                        }}
                        className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-100 rounded px-1"
                      />
                      {semesters.length > 1 && (
                        <button onClick={() => removeSemester(semester.id)} className="text-red-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-bold shadow-sm">
                        Term GPA: <span className="text-blue-600 ml-1">{stats.gpa}</span>
                      </div>
                      <button 
                        onClick={() => addCourse(semester.id, false)}
                        className="bg-[#0056D2] hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition text-sm shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Course
                      </button>
                      <button 
                        onClick={() => addCourse(semester.id, true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition text-sm shadow-sm"
                      >
                        <RotateCcw className="w-4 h-4" /> Add Retake
                      </button>
                    </div>
                  </div>

                  {/* Table Column Titles */}
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <div className="col-span-4">Course Code</div>
                    <div className="col-span-2 text-center">Credit</div>
                    <div className="col-span-3">Grade</div>
                    <div className="col-span-2 text-center">Grd Point</div>
                    <div className="col-span-1 text-center"></div>
                  </div>

                  {/* Course Rows */}
                  <div className="px-6 py-2">
                    {semester.courses.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm font-medium">No courses added to this semester.</div>
                    ) : (
                      semester.courses.map((course) => {
                        const creds = Number(course.credits) || 0;
                        let displayedPoints;
                        if (course.isRetake) {
                          const diff = (GRADING_SCALE[course.grade] - GRADING_SCALE[course.oldGrade]) * creds;
                          displayedPoints = diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
                        } else {
                          displayedPoints = ((GRADING_SCALE[course.grade] || 0) * creds).toFixed(2);
                        }

                        return (
                          <div key={course.id} className={`grid grid-cols-12 gap-4 py-3 items-center border-b border-gray-50 last:border-0 ${course.isRetake ? 'bg-orange-50/30 -mx-6 px-6' : ''}`}>
                            <div className="col-span-4 flex items-center gap-2">
                              {course.isRetake && <RotateCcw className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                              <input 
                                type="text" value={course.name} onChange={(e) => updateCourse(semester.id, course.id, 'name', e.target.value)}
                                placeholder={course.isRetake ? "Retake Course..." : "e.g. CSE412"}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                              />
                            </div>

                            <div className="col-span-2">
                              <input 
                                type="number" min="1" max="4" value={course.credits} onChange={(e) => updateCourse(semester.id, course.id, 'credits', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-center text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                              />
                            </div>

                            <div className="col-span-3 flex items-center gap-1">
                              {course.isRetake && (
                                <div className="flex-1">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase ml-1 block">Old</span>
                                  <select 
                                    value={course.oldGrade} onChange={(e) => updateCourse(semester.id, course.id, 'oldGrade', e.target.value)}
                                    className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 outline-none cursor-pointer appearance-none"
                                  >
                                    {Object.keys(GRADING_SCALE).map(g => <option key={`old-${g}`} value={g}>{g}</option>)}
                                  </select>
                                </div>
                              )}
                              <div className="flex-1">
                                {course.isRetake && <span className="text-[9px] font-bold text-orange-500 uppercase ml-1 block">New</span>}
                                <select 
                                  value={course.grade} onChange={(e) => updateCourse(semester.id, course.id, 'grade', e.target.value)}
                                  className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold outline-none cursor-pointer appearance-none ${course.isRetake ? 'text-orange-700 border-orange-200' : 'text-gray-800 focus:border-blue-500'}`}
                                >
                                  {Object.keys(GRADING_SCALE).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className={`col-span-2 text-center font-bold text-sm ${course.isRetake ? 'text-orange-600' : 'text-gray-800'}`}>
                              {displayedPoints}
                            </div>

                            <div className="col-span-1 flex justify-center">
                              <button onClick={() => removeCourse(semester.id, course.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            <button 
              onClick={addSemester}
              className="w-full border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors bg-white"
            >
              <FolderPlus className="w-5 h-5" /> Add New Semester
            </button>
          </div>

          
          {/* ================= RIGHT COLUMN: SUMMARY CARDS ================= */}
          <div className="w-full lg:w-[340px] flex flex-col gap-6">
            
            {/* 1. Current CGPA Donut Chart Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center">
              <h3 className="font-bold text-gray-900 mb-6">Estimated CGPA</h3>
              
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                  <circle 
                    cx="80" cy="80" r="70" 
                    stroke="#0056D2" strokeWidth="12" fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={`${(currentCgpa / 4.0) * 440} 440`} 
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-[#0056D2]">{currentCgpa}</span>
                  <span className="text-xs font-medium text-gray-400 mt-1">out of 4.00</span>
                </div>
              </div>
            </div>

            {/* 2. Target Simulator Card */}
            <div className="bg-[#EBF3FF] rounded-2xl border border-blue-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Target Simulator</h3>
              </div>
              
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Target CGPA</label>
                  <input 
                    type="number" step="0.01" min="0" max="4.00"
                    value={targetCgpa} onChange={(e) => setTargetCgpa(e.target.value)}
                    placeholder="e.g. 3.50"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Remaining Credits</label>
                  <input 
                    type="number" step="1" min="0"
                    value={targetCredits} onChange={(e) => setTargetCredits(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-blue-50">
                <p className="text-xs text-gray-500 mb-1 font-medium">To reach your target:</p>
                <p className={`text-sm font-bold leading-snug ${isTargetImpossible ? 'text-red-600' : 'text-blue-800'}`}>
                  {simulatorMessage}
                </p>
              </div>
            </div>

            {/* 3. Summary Breakdown Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-5">Summary Breakdown</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Previous Credits</span>
                  <span className="font-bold text-gray-900">{prevCredits || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">New Credits Added</span>
                  <span className="font-bold text-gray-900">+{newCreditsAdded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Total Credits</span>
                  <span className="font-bold text-gray-900">{totalCumulativeCredits}</span>
                </div>
                
                <div className="w-full h-px bg-gray-100 my-2"></div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-bold">Estimated CGPA</span>
                  <span className="font-black text-[#0056D2] text-lg">{currentCgpa}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
};

export default CgpaPlanner;