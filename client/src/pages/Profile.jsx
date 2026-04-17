import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ResourceCard from '../components/ResourceCard';
import axios from 'axios';
import { 
  User, Upload, Bookmark, Edit2, X, Save, Lock, KeyRound, Camera, Loader2, MessageSquare, ExternalLink, Trash2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate(); 
  const [activeTab, setActiveTab] = useState('uploaded');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [academicHistory, setAcademicHistory] = useState({ cgpa: 'N/A', credits: '0' });
  
  const [myUploadedNotes, setMyUploadedNotes] = useState([]);
  const [mySavedNotes, setMySavedNotes] = useState([]);
  const [myThreads, setMyThreads] = useState([]);
  
  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo && userInfo.role === 'admin';
  const token = localStorage.getItem('token') || userInfo?.token;

  const [formData, setFormData] = useState({
    name: '',
    student_id: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    cgpa: '', 
    credits: '', 
  });

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);
    setUploading(true);

    try {
      const config = { 
        headers: { 
          'Content-Type': 'multipart/form-data', 
          Authorization: `Bearer ${token}` 
        } 
      };
      const res = await axios.put('${API_URL}/api/users/profile-picture', uploadData, config);
      
      const updatedUserInfo = { ...JSON.parse(localStorage.getItem('userInfo')), profilePicture: res.data.profilePicture };
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      
      window.location.reload(); 
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // 🚨 FIXED: Load user-specific CGPA Data
  useEffect(() => {
    if (user && user._id) {
      const savedHistory = JSON.parse(localStorage.getItem(`cgpaHistory_${user._id}`)) || {};
      
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        student_id: user.student_id || '',
        email: user.email || '',
        cgpa: savedHistory.cgpa || '', 
        credits: savedHistory.credits || '', 
        oldPassword: '', 
        newPassword: ''  
      }));

      setAcademicHistory({ 
        cgpa: savedHistory.cgpa || 'N/A', 
        credits: savedHistory.credits || '0' 
      });
    }
  }, [user, isEditing]);

  const handleSaveToggle = (resource, isNowSaved) => {
    if (isNowSaved) {
      setMySavedNotes(prev => [...prev, resource]);
    } else {
      setMySavedNotes(prev => prev.filter(note => note._id !== resource._id));
    }
  };

  useEffect(() => {
    const fetchMyNotes = async () => {
      if (!token) return;
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get('${API_URL}/api/users/my-notes', config);
        setMyUploadedNotes(res.data.uploaded);
        setMySavedNotes(res.data.saved);
      } catch (error) {
        console.error("Failed to fetch profile notes", error);
      }
    };

    const fetchMyThreads = async () => {
      if (!token) return;
      try {
        const res = await axios.get('${API_URL}/api/threads/my-threads', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMyThreads(res.data);
      } catch (err) { console.error("Failed to load your threads"); }
    };

    if (activeTab === 'threads') {
      fetchMyThreads();
    } else {
      fetchMyNotes();
    }
  }, [token, activeTab]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!token || !user) {
      alert("Session invalid. Please login again.");
      return;
    }

    if (showPasswordFields && formData.newPassword.length <= 6) {
      alert("New password must be more than 6 characters long.");
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { 
        name: formData.name,
        student_id: formData.student_id,
        email: formData.email
      };

      if (showPasswordFields) {
        if (!formData.oldPassword || !formData.newPassword) {
          return alert("Please fill in both password fields");
        }
        payload.oldPassword = formData.oldPassword;
        payload.newPassword = formData.newPassword;
      }
      
      const res = await axios.put('${API_URL}/api/auth/update-profile', payload, config);
      
      const updatedData = {
        ...res.data,
        profilePicture: user.profilePicture 
      };

      // 🚨 FIXED: Save unique CGPA Data and sync with global user info
      const newAcademicHistory = {
        cgpa: formData.cgpa || '0.00',
        credits: formData.credits || '0'
      };
      
      // 1. Save uniquely to user
      localStorage.setItem(`cgpaHistory_${user._id}`, JSON.stringify(newAcademicHistory));
      setAcademicHistory(newAcademicHistory);
      
      // 2. Sync to Dashboard
      const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (currentUserInfo._id === user._id) {
         currentUserInfo.cgpa = newAcademicHistory.cgpa;
         localStorage.setItem('userInfo', JSON.stringify(currentUserInfo));
      }

      login(res.data); 
      setIsEditing(false);
      setShowPasswordFields(false);
      setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '' }));
      alert("Profile updated successfully!");
      
    } catch (err) {
      alert(err.response?.data?.message || "Update failed.");
    }
  };

  const handleDeleteMyThread = async (id) => {
    if (!window.confirm("Are you sure you want to delete this thread?")) return;
    try {
      await axios.delete(`${API_URL}/api/threads/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMyThreads(myThreads.filter(t => t._id !== id));
    } catch (err) { alert("Failed to delete thread"); }
  };

  const handleEditMyThread = (thread) => {
    navigate('/threads', { state: { editThread: thread } });
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center relative transition-all">
              
              <button 
                onClick={() => { setIsEditing(!isEditing); setShowPasswordFields(false); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 transition p-2 rounded-full hover:bg-blue-50"
              >
                {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>

              <div className="relative group cursor-pointer mb-4">
                <div className="w-24 h-24 bg-[#0056D2] text-white rounded-full flex items-center justify-center shadow-md border-4 border-white text-3xl font-bold overflow-hidden">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>

              {!isEditing ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500 font-medium mt-1">{user?.student_id}</p>
                  <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
                  <p className="text-blue-600 font-bold mt-3 bg-blue-50 px-3 py-1 rounded-full text-xs">CSE Department</p>

                  <div className="mt-6 pt-6 border-t border-gray-100 w-full">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 text-left">Academic Status</h4>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-600">Current CGPA</span>
                      <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">{academicHistory.cgpa}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Credits</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">{academicHistory.credits}</span>
                    </div>
                  </div>

                  <div className="w-full h-px bg-gray-100 my-6"></div>
                  <div className="w-full space-y-4 text-sm font-medium text-gray-500">
                    <div className="flex justify-between"><span>Uploaded</span><span className="text-gray-900 font-bold">{myUploadedNotes.length}</span></div>
                    <div className="flex justify-between"><span>Saved</span><span className="text-gray-900 font-bold">{mySavedNotes.length}</span></div>
                    <div className="flex justify-between"><span>Threads</span><span className="text-gray-900 font-bold">{myThreads.length}</span></div>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveProfile} className="w-full flex flex-col items-center animate-in fade-in duration-300" autoComplete="off">
                  <div className="w-full space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Name</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Student ID</label>
                      <input type="text" name="student_id" value={formData.student_id} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Email (Locked)</label>
                      <input type="email" name="email" value={formData.email} className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm outline-none cursor-not-allowed text-gray-400" disabled readOnly />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">CGPA</label>
                        <input type="number" step="0.01" name="cgpa" value={formData.cgpa} onChange={handleInputChange} placeholder="3.50" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1">Credits</label>
                        <input type="number" name="credits" value={formData.credits} onChange={handleInputChange} placeholder="105" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    
                    <button type="button" onClick={() => { setShowPasswordFields(!showPasswordFields); setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '' })); }} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline pt-1">
                      <Lock className="w-3 h-3" /> {showPasswordFields ? "Cancel Password Change" : "Change Password?"}
                    </button>

                    {showPasswordFields && (
                      <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input type="password" name="oldPassword" placeholder="Current Password" value={formData.oldPassword} onChange={handleInputChange} autoComplete="new-password" className="w-full pl-10 p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                          <input type="password" name="newPassword" placeholder="New Password" value={formData.newPassword} onChange={handleInputChange} autoComplete="new-password" className="w-full pl-10 p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" className="w-full bg-[#0056D2] hover:bg-blue-800 text-white py-3 rounded-xl font-bold mt-6 flex items-center justify-center gap-2 transition shadow-sm">
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex overflow-x-auto border-b border-gray-200 mb-6 hide-scrollbar">
              <button onClick={() => setActiveTab('uploaded')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'uploaded' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap'}`}>
                <Upload className="w-4 h-4" /> My Uploaded Notes
              </button>
              <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'saved' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap'}`}>
                <Bookmark className="w-4 h-4" /> Saved Notes
              </button>
              <button onClick={() => setActiveTab('threads')} className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'threads' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 whitespace-nowrap'}`}>
                <MessageSquare className="w-4 h-4" /> My Threads
              </button>
            </div>

            <div className={`grid gap-6 ${activeTab === 'threads' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              
              {activeTab === 'uploaded' && (
                myUploadedNotes.length > 0 ? (
                  myUploadedNotes.map(note => <ResourceCard key={note._id} resource={note} isAdmin={isAdmin} token={token} onSaveToggle={handleSaveToggle} />)
                ) : (
                  <div className="col-span-full text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">You haven't uploaded any notes yet.</p>
                  </div>
                )
              )}

              {activeTab === 'saved' && (
                mySavedNotes.length > 0 ? (
                  mySavedNotes.map(note => (
                    <ResourceCard key={note._id} resource={note} isAdmin={isAdmin} token={token} onSaveToggle={handleSaveToggle} isSavedInitially={true} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">You don't have any saved notes.</p>
                  </div>
                )
              )}

              {activeTab === 'threads' && (
                <div className="space-y-4 animate-in fade-in col-span-full">
                  {myThreads.length > 0 ? myThreads.map(thread => (
                    <div key={thread._id} className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-bold text-gray-900 truncate text-lg">{thread.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{new Date(thread.createdAt).toLocaleDateString()} • {thread.likes?.length || 0} Likes • {thread.replies?.length || 0} Comments</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link to="/threads" className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition font-bold text-xs flex items-center gap-2" title="View in Community">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleEditMyThread(thread)} 
                          className="p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition font-bold text-xs flex items-center gap-2"
                          title="Edit Thread"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMyThread(thread._id)} 
                          className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition font-bold text-xs flex items-center gap-2"
                          title="Delete Thread"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">You haven't posted any threads yet.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
          
        </div>
      </div>
    </Layout>
  );
};

export default Profile;