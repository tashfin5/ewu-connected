import { useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ResourceCard from '../components/ResourceCard';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Upload, Bookmark, Edit2, X, Save, Lock, KeyRound, Camera, Loader2, MessageSquare, ExternalLink, Trash2, Eye, EyeOff, Award, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate(); 
  const [activeTab, setActiveTab] = useState('uploaded');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [academicHistory, setAcademicHistory] = useState({ cgpa: 'N/A', credits: '0' });
  
  const [myUploadedNotes, setMyUploadedNotes] = useState([]);
  const [mySavedNotes, setMySavedNotes] = useState([]);
  const [myThreads, setMyThreads] = useState([]);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    confirmPassword: '', 
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
      const res = await axios.put(`${API_URL}/api/users/profile-picture`, uploadData, config);
      
      const currentInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const updatedUserInfo = { ...currentInfo, profilePicture: res.data.profilePicture };
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      
      login(updatedUserInfo);
      window.location.reload(); 
    } catch (error) {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user && user._id) {
      const dbCgpa = user.cgpa ? Number(user.cgpa).toFixed(2) : '';
      const dbCredits = user.credits || '';

      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        student_id: user.student_id || '',
        email: user.email || '',
        cgpa: dbCgpa, 
        credits: dbCredits, 
        oldPassword: '', 
        newPassword: '',
        confirmPassword: '' 
      }));

      setAcademicHistory({ 
        cgpa: dbCgpa || 'N/A', 
        credits: dbCredits || '0' 
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
        const res = await axios.get(`${API_URL}/api/users/my-notes`, config);
        setMyUploadedNotes(res.data.uploaded);
        setMySavedNotes(res.data.saved);
      } catch (error) {
        console.error("Failed to fetch profile notes", error);
      }
    };

    const fetchMyThreads = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/api/threads/my-threads`, {
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
    if (e.target.name === 'cgpa') {
      let val = e.target.value;
      if (val !== '' && Number(val) > 4.00) val = '4.00';
      setFormData({ ...formData, cgpa: val });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const formatCgpaOnBlur = () => {
    if (formData.cgpa) {
      setFormData(prev => ({ ...prev, cgpa: Number(prev.cgpa).toFixed(2) }));
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!token || !user) {
      toast.error("Session invalid. Please login again.");
      return;
    }

    if (showPasswordFields) {
      if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
        toast.error("Please fill in all password fields.");
        return;
      }
      if (formData.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters long.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const finalCgpa = formData.cgpa ? Number(formData.cgpa).toFixed(2) : '0.00';
      const finalCredits = formData.credits || '0';

      const payload = { 
        name: formData.name,
        student_id: formData.student_id, 
        email: formData.email,
        cgpa: finalCgpa,
        credits: finalCredits
      };

      if (showPasswordFields) {
        payload.oldPassword = formData.oldPassword;
        payload.newPassword = formData.newPassword;
      }
      
      const res = await axios.put(`${API_URL}/api/auth/update-profile`, payload, config);
      
      const updatedFullData = {
        ...user,         
        ...res.data,     
        cgpa: finalCgpa,
        credits: finalCredits
      };

      setAcademicHistory({ cgpa: finalCgpa, credits: finalCredits });
      localStorage.setItem('userInfo', JSON.stringify(updatedFullData));
      login(updatedFullData); 
      
      setIsEditing(false);
      setShowPasswordFields(false);
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' })); 
      toast.success("Profile updated successfully!");
      
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    }
  };

  const handleDeleteMyThread = async (id) => {
    setConfirmDialog({
      title: "Delete Thread?",
      description: "Are you sure you want to delete this thread? This action cannot be undone.",
      confirmText: "Delete Thread",
      icon: <Trash2 className="w-8 h-8" />,
      action: async () => {
        try {
          await axios.delete(`${API_URL}/api/threads/${id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setMyThreads(myThreads.filter(t => t._id !== id));
          setConfirmDialog(null);
        } catch (err) { toast.error("Failed to delete thread"); }
      }
    });
  };

  const handleEditMyThread = (thread) => {
    navigate('/threads', { state: { editThread: thread } });
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
        
        {/* ================= HEADER ================= */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-800/50 shadow-sm">
            Personal Space
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">My Profile</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Manage your personal information and uploaded resources.</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ================= SIDEBAR (PROFILE INFO) ================= */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="w-full lg:w-[380px] flex-shrink-0 lg:sticky lg:top-24 relative z-0">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-lg shadow-slate-200/20 dark:shadow-none p-8 flex flex-col items-center relative transition-all overflow-hidden">
              
              {/* Animated Background Blob */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <button 
                onClick={() => { setIsEditing(!isEditing); setShowPasswordFields(false); }}
                className="absolute top-5 right-5 text-slate-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 transition-colors p-2.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 z-10 bg-slate-50 dark:bg-zinc-800"
                title={isEditing ? "Cancel" : "Edit Profile"}
              >
                {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
              </button>

              <div className="relative group cursor-pointer mb-6 z-10 mt-4">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 border-4 border-white dark:border-zinc-800 text-4xl font-black overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                  {uploading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                  ) : user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>

              <AnimatePresence mode="wait">
                {!isEditing ? (
                  <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full text-center z-10">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{user?.name}</h2>
                    <p className="text-blue-600 dark:text-blue-400 font-bold mt-1 text-sm">{user?.student_id}</p>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1 font-medium">{user?.email}</p>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-zinc-800 w-full text-left">
                      <h4 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Award className="w-3 h-3" /> Academic Status
                      </h4>
                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 space-y-3 border border-slate-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600 dark:text-zinc-300">Current CGPA</span>
                          <span className="text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-lg shadow-inner">{academicHistory.cgpa}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600 dark:text-zinc-300">Total Credits</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-zinc-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-zinc-600 shadow-sm">{academicHistory.credits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800 w-full">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-zinc-800">
                          <span className="block text-2xl font-black text-slate-900 dark:text-white">{myUploadedNotes.length}</span>
                          <span className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mt-1">Uploads</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-zinc-800">
                          <span className="block text-2xl font-black text-slate-900 dark:text-white">{mySavedNotes.length}</span>
                          <span className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mt-1">Saved</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-zinc-800">
                          <span className="block text-2xl font-black text-slate-900 dark:text-white">{myThreads.length}</span>
                          <span className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mt-1">Threads</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSaveProfile} className="w-full flex flex-col z-10" autoComplete="off">
                    <div className="w-full space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-1.5">Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all shadow-sm" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 flex justify-between">
                          <span>Student ID</span> <Lock className="w-3 h-3" />
                        </label> 
                        <input type="text" name="student_id" value={formData.student_id} className="w-full p-3.5 bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none cursor-not-allowed text-slate-400 dark:text-zinc-500" disabled readOnly /> 
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 flex justify-between">
                          <span>Email</span> <Lock className="w-3 h-3" />
                        </label>
                        <input type="email" name="email" value={formData.email} className="w-full p-3.5 bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none cursor-not-allowed text-slate-400 dark:text-zinc-500" disabled readOnly />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-1.5">CGPA</label>
                          <input 
                            type="number" min="0" max="4.00" step="0.01" name="cgpa" 
                            value={formData.cgpa} onChange={handleInputChange} onBlur={formatCgpaOnBlur} placeholder="3.50" 
                            className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all shadow-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-1.5">Credits</label>
                          <input type="number" name="credits" value={formData.credits} onChange={handleInputChange} placeholder="105" className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all shadow-sm" />
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 mt-2">
                        <button 
                          type="button" 
                          onClick={() => { 
                            setShowPasswordFields(!showPasswordFields); 
                            setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' })); 
                            setShowOldPassword(false);
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                          }} 
                          className="flex items-center gap-2 text-[11px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors uppercase tracking-widest w-full justify-center p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> {showPasswordFields ? "Cancel Password Change" : "Change Password?"}
                        </button>
                      </div>

                      <AnimatePresence>
                        {showPasswordFields && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                              <input 
                                type={showOldPassword ? "text" : "password"} name="oldPassword" placeholder="Current Password" 
                                value={formData.oldPassword} onChange={handleInputChange} autoComplete="new-password" 
                                className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm transition-all" 
                              />
                              <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            
                            <div className="relative">
                              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                              <input 
                                type={showNewPassword ? "text" : "password"} name="newPassword" placeholder="New Password" 
                                value={formData.newPassword} onChange={handleInputChange} autoComplete="new-password" 
                                className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm transition-all" 
                              />
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            
                            <div className="relative">
                              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                              <input 
                                type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm New Password" 
                                value={formData.confirmPassword} onChange={handleInputChange} autoComplete="new-password" 
                                className="w-full pl-11 pr-11 py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm transition-all" 
                              />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black mt-6 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5">
                      <Save className="w-5 h-5" /> Save Changes
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ================= MAIN CONTENT TABS ================= */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex-1 w-full">
            
            {/* Tabs Header */}
            <div className="flex overflow-x-auto mb-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/50 dark:border-zinc-800/50 hide-scrollbar">
              <button 
                onClick={() => setActiveTab('uploaded')} 
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'uploaded' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent'}`}
              >
                <Upload className="w-4 h-4" /> Uploads
              </button>
              <button 
                onClick={() => setActiveTab('saved')} 
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'saved' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent'}`}
              >
                <Bookmark className="w-4 h-4" /> Saved
              </button>
              <button 
                onClick={() => setActiveTab('threads')} 
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === 'threads' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/50 border border-transparent'}`}
              >
                <MessageSquare className="w-4 h-4" /> Threads
              </button>
            </div>

            {/* Tab Content */}
            <div className={`grid gap-6 ${activeTab === 'threads' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              <AnimatePresence mode="wait">
                
                {/* UPLOADED TAB */}
                {activeTab === 'uploaded' && (
                  <motion.div key="uploaded" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="contents">
                    {myUploadedNotes.length > 0 ? (
                      myUploadedNotes.map(note => (
                        <motion.div variants={itemVariants} key={note._id}>
                          <ResourceCard resource={note} isAdmin={isAdmin} token={token} onSaveToggle={handleSaveToggle} />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm">
                        <Upload className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No uploads yet</h3>
                        <p className="text-slate-500 dark:text-zinc-400 mt-1 font-medium">Share your first resource to earn points!</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* SAVED TAB */}
                {activeTab === 'saved' && (
                  <motion.div key="saved" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="contents">
                    {mySavedNotes.length > 0 ? (
                      mySavedNotes.map(note => (
                        <motion.div variants={itemVariants} key={note._id}>
                          <ResourceCard resource={note} isAdmin={isAdmin} token={token} onSaveToggle={handleSaveToggle} isSavedInitially={true} />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm">
                        <Bookmark className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No saved notes</h3>
                        <p className="text-slate-500 dark:text-zinc-400 mt-1 font-medium">Bookmark helpful notes to find them easily here.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* THREADS TAB */}
                {activeTab === 'threads' && (
                  <motion.div key="threads" variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-4 col-span-full w-full">
                    {myThreads.length > 0 ? (
                      myThreads.map((thread, index) => (
                        <motion.div variants={itemVariants} key={thread._id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 rounded-[1.5rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg mb-1">{thread.title}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                              <span className="bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{new Date(thread.createdAt).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {thread.likes?.length || 0} Likes</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> {thread.replies?.length || 0} Comments</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800 pt-3 sm:pt-0 mt-2 sm:mt-0">
                            <Link to="/threads" className="flex-1 sm:flex-none flex items-center justify-center p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors font-bold text-xs" title="View in Community">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                            <button onClick={() => handleEditMyThread(thread)} className="flex-1 sm:flex-none flex items-center justify-center p-3 text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors font-bold text-xs" title="Edit Thread">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteMyThread(thread._id)} className="flex-1 sm:flex-none flex items-center justify-center p-3 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-xs border border-transparent hover:border-red-600" title="Delete Thread">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm">
                        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No threads yet</h3>
                        <p className="text-slate-500 dark:text-zinc-400 mt-1 font-medium">Start a discussion with the community.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
        </div>
      </div>
      {/* Confirm Modal */}
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
      </AnimatePresence>
    </Layout>
  );
};

export default Profile;