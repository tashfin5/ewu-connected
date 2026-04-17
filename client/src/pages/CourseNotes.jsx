import { useState, useEffect, useRef, useContext } from 'react'; 
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import ResourceCard from '../components/ResourceCard';
import axios from 'axios';
import { Book, Upload, Trash2, X, AlertTriangle } from 'lucide-react';
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

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        
        {/* Breadcrumbs & Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2 font-medium">
            <Link to="/repository" className="hover:text-blue-600">Repository</Link> &gt; 
            <Link to={`/repository/${deptId}`} className="hover:text-blue-600 uppercase ml-1">{deptId}</Link> &gt; 
            <span className="text-gray-900 uppercase ml-1">{courseCode}</span>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-block bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-lg text-sm mb-2 uppercase">
                {courseCode}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
              <p className="text-gray-500 mt-1">Total uploaded notes: <span className="font-bold text-gray-900">{notes.length}</span></p>
            </div>

            <div className="flex gap-3 items-center">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2.5 outline-none font-bold shadow-sm"
              >
                <option value="recent">Sort by: Recent</option>
                <option value="rating">Sort by: Highest Rated</option>
              </select>
              
              {isAdmin && (
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Delete Course
                </button>
              )}
              
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0056D2] text-white font-bold rounded-xl hover:bg-blue-800 transition shadow-sm"
              >
                <Upload className="w-4 h-4" /> Upload Note
              </button>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {loading && notes.length === 0 ? (
          <div className="flex justify-center py-20">
             <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">
            <Book className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No notes available</h3>
            <p className="text-gray-500 mt-1">Be the first to share materials for this course!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {notes.map((note) => (
              <ResourceCard 
                key={note._id} 
                resource={note} 
                isAdmin={isAdmin} 
                token={token} 
              />
            ))}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Upload Note Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Upload Course Material</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleUploadNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Material Title</label>
                <input type="text" placeholder="e.g. Chapter 1 Summary" value={newNote.title} onChange={(e) => setNewNote({...newNote, title: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Category</label>
                <select value={newNote.category} onChange={(e) => setNewNote({...newNote, category: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500">
                  <option>Lecture Notes</option>
                  <option>Practice Problems</option>
                  <option>Exam Guide</option>
                  <option>Project Resources</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Select File (PDF, Image)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none" required />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Description (Optional)</label>
                <textarea rows="3" placeholder="Briefly describe what this covers..." value={newNote.description} onChange={(e) => setNewNote({...newNote, description: e.target.value})} className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-blue-500"></textarea>
              </div>
              
              <button type="submit" disabled={isUploading} className={`w-full text-white py-3 rounded-xl font-bold mt-2 transition ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0056D2] hover:bg-blue-800'}`}>
                {isUploading ? 'Uploading to Database...' : 'Publish Material +50 pts'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Delete this course?</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">This action cannot be undone. All notes associated with this course will lose their parent link.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleDeleteCourse} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default CourseNotes;