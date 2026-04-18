import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Heart, Plus, Tag, 
  Image as ImageIcon, FileText, Send, X, Loader2, Filter, Clock, Search, Trash2, Edit2
} from 'lucide-react'; 

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return `1d ago`;
  if (diffInDays <= 7) return `${diffInDays}d ago`;
  
  return past.toLocaleDateString();
};

const PublicThreads = () => {
  const { user } = useContext(AuthContext);
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState('recent'); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [showModal, setShowModal] = useState(false);
  const [expandedThread, setExpandedThread] = useState(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  
  const [commentTexts, setCommentTexts] = useState({});
  
  const [editingId, setEditingId] = useState(null); 
  const commentInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // --- 1. FETCH LOGIC WITH DEEP COMPARISON ---
  const fetchThreads = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/threads?sort=${filter}`);
      // Only update if the data has actually changed to prevent UI flicker/input loss
      if (JSON.stringify(res.data) !== JSON.stringify(threads)) {
        setThreads(res.data);
      }
    } catch (err) { console.error(err); }
  };

  // --- 2. AUTOMATIC POLLING (REAL-TIME UPDATES) ---
  useEffect(() => {
    // Initial fetch
    fetchThreads();

    // Set up interval to poll every 5 seconds
    const interval = setInterval(() => {
      fetchThreads();
    }, 5000);

    return () => clearInterval(interval);
  }, [filter, threads]); // Dependencies ensure fresh comparison

  useEffect(() => {
    if (location.state && location.state.editThread) {
      const t = location.state.editThread;
      setTitle(t.title);
      setContent(t.content);
      setTags(t.tags ? t.tags.join(', ') : '');
      setEditingId(t._id);
      setShowModal(true);

      navigate('/threads', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const resetForm = () => {
    setTitle(''); setContent(''); setTags(''); setFile(null); setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPosting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tags', tags);
    if (file) formData.append('file', file);

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
      
      if (editingId) {
        await axios.put(`${API_URL}/api/threads/${editingId}`, formData, config);
      } else {
        await axios.post(`${API_URL}/api/threads`, formData, config);
      }
      
      setShowModal(false);
      resetForm();
      fetchThreads();
    } catch (err) { alert("Action failed."); }
    finally { setIsPosting(false); }
  };

  const handleEditClick = (thread) => {
    setTitle(thread.title);
    setContent(thread.content);
    setTags(thread.tags ? thread.tags.join(', ') : '');
    setFile(null); 
    setEditingId(thread._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this thread?")) return;
    try {
      await axios.delete(`${API_URL}/api/threads/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads(); 
    } catch (err) { alert("Failed to delete thread"); }
  };

  const handleLikeThread = async (id) => {
    try {
      await axios.post(`${API_URL}/api/threads/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) { alert("Please login to like"); }
  };

  const handleLikeReply = async (threadId, replyId) => {
    try {
      await axios.post(`${API_URL}/api/threads/${threadId}/reply/${replyId}/like`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) { alert("Please login to like"); }
  };

  const handleComment = async (threadId) => {
    const text = commentTexts[threadId];
    if (!text || !text.trim()) return;
    try {
      await axios.post(`${API_URL}/api/threads/${threadId}/reply`, 
        { content: text },
        { headers: { Authorization: `Bearer ${user.token}` }}
      );
      setCommentTexts(prev => ({ ...prev, [threadId]: '' }));
      fetchThreads();
    } catch (err) { alert("Error posting comment"); }
  };

  // 🚨 ADDED: Delete Reply Handler
  const handleDeleteReply = async (threadId, replyId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await axios.delete(`${API_URL}/api/threads/${threadId}/reply/${replyId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleReplyClick = (threadId, authorName) => {
    setCommentTexts(prev => ({ ...prev, [threadId]: `@${authorName} ` }));
    commentInputRef.current?.focus();
  };

  const filteredThreads = threads.filter(t => {
    const query = searchQuery.toLowerCase();
    const titleMatch = t.title?.toLowerCase().includes(query);
    const contentMatch = t.content?.toLowerCase().includes(query);
    const tagsMatch = t.tags?.some(tag => tag.toLowerCase().includes(query));
    return titleMatch || contentMatch || tagsMatch;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Public Threads</h1>
            <p className="text-gray-500 mt-1 font-medium">Join the discussion with the EWU community</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }} 
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 shrink-0"
          >
            <Plus className="w-5 h-5" /> New Post
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 border-b border-gray-200 pb-4">
          <div className="flex gap-2">
            <button onClick={() => setFilter('recent')} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${filter === 'recent' ? 'bg-gray-900 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}><Clock className="w-4 h-4" /> Recent</button>
            <button onClick={() => setFilter('popular')} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${filter === 'popular' ? 'bg-gray-900 text-white shadow-md' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}><Filter className="w-4 h-4" /> Popular</button>
          </div>
          
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search threads or #tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-full text-sm font-medium outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {filteredThreads.length > 0 ? filteredThreads.map((t) => (
            <div key={t._id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm p-6">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={t.author?.profilePicture || `https://ui-avatars.com/api/?name=${t.author?.name}`} className="w-10 h-10 rounded-full bg-gray-50 object-cover" alt="" />
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{t.author?.name}</h3>
                    <span className="text-[11px] font-medium text-gray-400">{timeAgo(t.createdAt)}</span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {(user._id === t.author?._id) && (
                    <button 
                      onClick={() => handleEditClick(t)} 
                      className="p-2 text-gray-300 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                      title="Edit Thread"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  {(user._id === t.author?._id || user.role === 'admin') && (
                    <button 
                      onClick={() => handleDelete(t._id)} 
                      className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                      title="Delete Thread"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{t.content}</p>
              </div>

              {t.file && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
                  {t.file.fileType === 'pdf' ? (
                    <a href={t.file.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 text-blue-600 font-bold hover:bg-blue-100">
                      <FileText className="w-6 h-6" /> View Attached PDF
                    </a>
                  ) : (
                    <img src={t.file.url} alt="Thread" className="max-h-[400px] w-full object-contain bg-slate-900/5" />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {t.tags?.map(tag => (
                  <span 
                    key={tag} 
                    onClick={() => setSearchQuery(tag)} 
                    className="text-blue-600 text-xs font-bold hover:underline cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-gray-50">
                <button onClick={() => handleLikeThread(t._id)} className={`flex items-center gap-2 font-bold transition-colors ${t.likes?.includes(user._id) ? 'text-red-500' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Heart className={`w-6 h-6 ${t.likes?.includes(user._id) ? 'fill-red-500 text-red-500' : ''}`} />
                  {t.likeCount || 0}
                </button>
                
                <button onClick={() => setExpandedThread(expandedThread === t._id ? null : t._id)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-colors">
                  <MessageSquare className="w-6 h-6" />
                  {t.replies?.length || 0}
                </button>
              </div>

              {expandedThread === t._id && (
                <div className="mt-6 pt-4 animate-in fade-in duration-300">
                  <div className="space-y-4 mb-6">
                    {t.replies?.map((reply) => (
                      <div key={reply._id} className="flex gap-3 group">
                         <img src={reply.author?.profilePicture || `https://ui-avatars.com/api/?name=${reply.author?.name}`} className="w-8 h-8 rounded-full shadow-sm mt-1 object-cover" alt="" />
                         <div className="flex-1">
                           <div className="bg-gray-50/80 px-4 py-3 rounded-2xl inline-block w-full relative">
                             <span className="text-xs font-bold text-gray-900 mr-2">{reply.author?.name}</span>
                             <span className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</span>
                             
                             {/* 🚨 ADDED: Delete Comment Button */}
                             {(user._id === reply.author?._id || user._id === t.author?._id || user.role === 'admin') && (
                               <button 
                                 onClick={() => handleDeleteReply(t._id, reply._id)}
                                 className="absolute right-2 top-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                 title="Delete comment"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                           
                           <div className="flex items-center gap-4 mt-1.5 ml-2">
                             <span className="text-[10px] text-gray-400 font-medium">{timeAgo(reply.createdAt)}</span>
                             <button onClick={() => handleReplyClick(t._id, reply.author?.name)} className="text-[11px] font-bold text-gray-500 hover:text-gray-800">Reply</button>
                             <button onClick={() => handleLikeReply(t._id, reply._id)} className={`flex items-center gap-1 text-[11px] font-bold ${reply.likes?.includes(user._id) ? 'text-red-500' : 'text-gray-500 hover:text-gray-800'}`}>
                               <Heart className={`w-3 h-3 ${reply.likes?.includes(user._id) ? 'fill-red-500 text-red-500' : ''}`} />
                               {reply.likes?.length > 0 && reply.likes.length}
                             </button>
                           </div>
                         </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div className="relative flex-1">
                      <input 
                        ref={commentInputRef} 
                        value={commentTexts[t._id] || ''} 
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [t._id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); 
                            if (commentTexts[t._id]?.trim()) { 
                              handleComment(t._id); 
                            }
                          }
                        }}
                        placeholder="Add a comment..." 
                        className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:border-gray-400 transition-all outline-none pr-12" 
                      />
                      <button onClick={() => handleComment(t._id)} className="absolute right-2 top-1.5 p-1.5 text-blue-600 font-bold hover:scale-110 transition-transform">
                        <Send className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">No discussions found</h3>
              <p className="text-gray-500">Try searching for a different keyword or tag.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-8 w-full max-w-xl shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => { setShowModal(false); resetForm(); }} type="button" className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"><X className="w-6 h-6"/></button>
             <h2 className="text-2xl font-black text-gray-900 mb-6">{editingId ? "Edit Post" : "Create Post"}</h2>
             
             <div className="space-y-4">
               <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Post Title" className="w-full p-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all" />
               <textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="What do you want to talk about?" rows="5" className="w-full p-4 bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
               
               <div className="flex gap-3 h-[56px]">
                 <div className="flex-1 min-w-0 h-full">
                   {file ? (
                     <div className="flex items-center justify-between px-4 h-full rounded-2xl border-2 border-dashed bg-green-50 border-green-200 text-green-700">
                       <div className="flex items-center gap-2 min-w-0">
                         <FileText className="w-5 h-5 flex-shrink-0" /> 
                         <span className="text-sm font-bold truncate block">{file.name}</span>
                       </div>
                       <button type="button" onClick={() => setFile(null)} className="p-1.5 ml-2 hover:bg-green-200 rounded-full flex-shrink-0 text-green-700 transition-colors">
                         <X className="w-4 h-4"/>
                       </button>
                     </div>
                   ) : (
                     <label className="flex items-center justify-center gap-2 px-4 h-full rounded-2xl cursor-pointer transition-all border-2 border-dashed bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100">
                       <ImageIcon className="w-5 h-5 flex-shrink-0"/> 
                       <span className="text-sm font-bold truncate">Add Photo/PDF</span>
                       <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                     </label>
                   )}
                 </div>
                 <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (CSE302...)" className="flex-1 min-w-0 px-4 h-full bg-gray-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
               </div>
             </div>

             <button type="submit" disabled={isPosting} className="w-full mt-6 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
               {isPosting ? <Loader2 className="animate-spin w-5 h-5" /> : (editingId ? "Save Changes" : "Post")}
             </button>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default PublicThreads;