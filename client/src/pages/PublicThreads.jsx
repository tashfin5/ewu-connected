import React, { useState, useEffect, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Heart, Plus, Tag, 
  Image as ImageIcon, FileText, Send, X, Loader2, Filter, Clock, Search, Trash2, Edit2
} from 'lucide-react'; 
import MentionInput from '../components/MentionInput';

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
  const { user, login } = useContext(AuthContext);
  const [threads, setThreads] = useState([]);
  const [filter, setFilter] = useState('recent'); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [showModal, setShowModal] = useState(false);
  const [expandedThread, setExpandedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  
  const [commentTexts, setCommentTexts] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState({});
  
  const [editingId, setEditingId] = useState(null); 
  const commentInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchUserSuggestions = async (query, callback) => {
    try {
      const q = query || '';
      const res = await axios.get(`${API_URL}/api/users/search?q=${q}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const suggestions = res.data.map(u => ({ id: u._id, display: u.name, profilePicture: u.profilePicture }));
      callback(suggestions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/threads?sort=${filter}`);
      if (JSON.stringify(res.data) !== JSON.stringify(threads)) {
        setThreads(res.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchThreads();
    
    const updateVisitTime = async () => {
      if (user?._id) {
        try {
          const res = await axios.put(`${API_URL}/api/users/visit-threads`, {}, { 
            headers: { Authorization: `Bearer ${user.token}` } 
          });
          if (res.data.lastVisitedThreadsAt && res.data.lastVisitedThreadsAt !== user.lastVisitedThreadsAt) {
            login({ ...user, lastVisitedThreadsAt: res.data.lastVisitedThreadsAt });
          }
        } catch (error) {
          console.error("Failed to update visit time", error);
        }
      }
    };
    updateVisitTime();

    const interval = setInterval(() => {
      fetchThreads();
      updateVisitTime();
    }, 15000);
    return () => clearInterval(interval);
  }, [filter, user?._id]); 

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
    } catch (err) { toast.error("Action failed."); }
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
    } catch (err) { toast.error("Failed to delete thread"); }
  };

  const handleLikeThread = async (id) => {
    try {
      await axios.post(`${API_URL}/api/threads/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) { toast.error("Please login to like"); }
  };

  const handleLikeReply = async (threadId, replyId) => {
    try {
      await axios.post(`${API_URL}/api/threads/${threadId}/reply/${replyId}/like`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) { toast.error("Please login to like"); }
  };

  const handleComment = async (threadId) => {
    const text = commentTexts[threadId];
    if (!text || !text.trim()) return;
    try {
      await axios.post(`${API_URL}/api/threads/${threadId}/reply`, 
        { 
          content: text,
          replyTo: replyingToCommentId[threadId] || undefined
        },
        { headers: { Authorization: `Bearer ${user.token}` }}
      );
      setCommentTexts(prev => ({ ...prev, [threadId]: '' }));
      setReplyingToCommentId(prev => ({ ...prev, [threadId]: null }));
      fetchThreads();
    } catch (err) { toast.error("Error posting comment"); }
  };

  const handleDeleteReply = async (threadId, replyId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await axios.delete(`${API_URL}/api/threads/${threadId}/reply/${replyId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchThreads();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleReplyClick = (threadId, replyId, authorName) => {
    setReplyingToCommentId(prev => ({ ...prev, [threadId]: replyId }));
    setCommentTexts(prev => ({ ...prev, [threadId]: `@${authorName} ` }));
  };

  const filteredThreads = threads.filter(t => {
    const query = searchQuery.toLowerCase();
    const titleMatch = t.title?.toLowerCase().includes(query);
    const contentMatch = t.content?.toLowerCase().includes(query);
    const tagsMatch = t.tags?.some(tag => tag.toLowerCase().includes(query));
    return titleMatch || contentMatch || tagsMatch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const renderContentWithMentions = (content, thread, className) => {
    if (!content) return null;
    
    // Support react-mentions format: @[Name](id)
    const parts = (content || '').split(/(@\[.*?\]\(.*?\))/g);
    
    if (parts.length > 1) {
      return (
        <span className={className}>
          {parts.map((part, i) => {
            const match = part.match(/@\[(.*?)\]\((.*?)\)/);
            if (match) {
              return <span key={i} className="font-bold text-blue-600 dark:text-blue-400">@{match[1]}</span>;
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }

    const possibleNames = [thread.author?.name, ...(thread.replies?.map(r => r.author?.name) || [])].filter(Boolean);
    // Remove duplicates and sort by length descending to match longest names first (e.g. 'Miftahul Islam Tashfin' before 'Miftahul')
    const uniqueNames = [...new Set(possibleNames)].sort((a, b) => b.length - a.length);
    
    let matchedName = null;
    for (const name of uniqueNames) {
      if (content.startsWith(`@${name} `) || content === `@${name}`) {
        matchedName = name;
        break;
      }
    }

    if (matchedName) {
      const mention = `@${matchedName}`;
      const rest = content.substring(mention.length);
      return (
        <span className={className}>
          <span className="font-bold text-blue-600 dark:text-blue-400">{mention}</span>
          {rest}
        </span>
      );
    }
    
    return <span className={className}>{content}</span>;
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto font-sans">
        
        {/* ================= HEADER ================= */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-800/50 shadow-sm">
              Community Forum
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Public Threads</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Join the discussion with the EWU community</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowModal(true); }} 
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 shrink-0"
          >
            <Plus className="w-5 h-5" /> New Post
          </button>
        </motion.div>

        {/* ================= FILTERS & SEARCH ================= */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col md:flex-row gap-4 mb-8 border-b border-slate-200 dark:border-zinc-800 pb-6">
          <div className="flex gap-3">
            <button onClick={() => setFilter('recent')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${filter === 'recent' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
              <Clock className="w-4 h-4" /> Recent
            </button>
            <button onClick={() => setFilter('popular')} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${filter === 'popular' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}>
              <Filter className="w-4 h-4" /> Popular
            </button>
          </div>
          
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search threads or #tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 dark:focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition-all shadow-sm"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 bg-slate-100 dark:bg-zinc-800 p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ================= THREADS ================= */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : filteredThreads.length > 0 ? (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {filteredThreads.map((t) => (
                <motion.div variants={itemVariants} key={t._id} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/20 dark:shadow-none p-6 md:p-8">
                  
                  {/* Thread Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <img src={t.author?.profilePicture || `https://ui-avatars.com/api/?name=${t.author?.name}`} className="w-12 h-12 rounded-full bg-slate-50 dark:bg-zinc-800 object-cover shadow-sm border border-slate-100 dark:border-zinc-700" alt="" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{t.author?.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{timeAgo(t.createdAt)}</span>
                          {t.author?.role === 'admin' && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">Admin</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {(user._id === t.author?._id) && (
                        <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors" title="Edit Thread">
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {(user._id === t.author?._id || user.role === 'admin') && (
                        <button onClick={() => handleDelete(t._id)} className="p-2 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors" title="Delete Thread">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thread Content */}
                  <div className="mb-5">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-3 leading-snug">{t.title}</h2>
                    <p className="text-slate-600 dark:text-zinc-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{t.content}</p>
                  </div>

                  {t.file && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 shadow-inner">
                      {t.file.fileType === 'pdf' ? (
                        <a href={t.file.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 p-6 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                          <FileText className="w-6 h-6" /> View Attached Document
                        </a>
                      ) : (
                        <img src={t.file.url} alt="Thread Attachment" className="max-h-[400px] w-full object-contain backdrop-blur-md" />
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {t.tags?.map(tag => (
                      <span key={tag} onClick={() => setSearchQuery(tag)} className="text-blue-600 dark:text-blue-400 text-xs font-black bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors border border-blue-100 dark:border-blue-800/50 shadow-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-5 border-t border-slate-100 dark:border-zinc-800">
                    <button onClick={() => handleLikeThread(t._id)} className={`flex items-center gap-2 font-bold transition-all ${t.likes?.includes(user._id) ? 'text-red-500 scale-105' : 'text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400'}`}>
                      <Heart className={`w-6 h-6 transition-colors ${t.likes?.includes(user._id) ? 'fill-red-500 text-red-500' : ''}`} />
                      {t.likeCount || 0}
                    </button>
                    
                    <button onClick={() => setExpandedThread(expandedThread === t._id ? null : t._id)} className={`flex items-center gap-2 font-bold transition-colors ${expandedThread === t._id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400'}`}>
                      <MessageSquare className={`w-6 h-6 ${expandedThread === t._id ? 'fill-blue-50 text-blue-600 dark:fill-blue-900/20 dark:text-blue-400' : ''}`} />
                      {t.replies?.length || 0} Comments
                    </button>
                  </div>

                  {/* Replies Section */}
                  <AnimatePresence>
                    {expandedThread === t._id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
                          
                          <div className="space-y-6 mb-8">
                            {t.replies?.filter(r => !r.replyTo).map((reply) => (
                              <div key={reply._id}>
                                <div className="flex gap-4 group z-10 relative">
                                  <img src={reply.author?.profilePicture || `https://ui-avatars.com/api/?name=${reply.author?.name}`} className="w-10 h-10 rounded-full shadow-sm object-cover border border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800" alt="" />
                                  <div className="flex-1">
                                    <div className="bg-slate-50 dark:bg-zinc-800 px-5 py-4 rounded-[1.5rem] rounded-tl-sm inline-block max-w-full relative shadow-sm border border-slate-100 dark:border-zinc-700">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">{reply.author?.name}</span>
                                        {reply.author?._id === t.author?._id && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">OP</span>}
                                      </div>
                                      {renderContentWithMentions(reply.content, t, "text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed")}
                                      
                                      {(user._id === reply.author?._id || user._id === t.author?._id || user.role === 'admin') && (
                                        <button onClick={() => handleDeleteReply(t._id, reply._id)} className="absolute -right-10 top-2 p-2 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100" title="Delete comment">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-5 mt-2 ml-3">
                                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{timeAgo(reply.createdAt)}</span>
                                      <button onClick={() => handleReplyClick(t._id, reply._id, reply.author?.name)} className="text-[11px] font-black text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors">Reply</button>
                                      <button onClick={() => handleLikeReply(t._id, reply._id)} className={`flex items-center gap-1.5 text-[11px] font-black transition-colors ${reply.likes?.includes(user._id) ? 'text-red-500' : 'text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400'}`}>
                                        <Heart className={`w-3.5 h-3.5 ${reply.likes?.includes(user._id) ? 'fill-red-500 text-red-500' : ''}`} />
                                        {reply.likes?.length > 0 && reply.likes.length}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* 🚨 NESTED REPLIES */}
                                {t.replies.filter(r => r.replyTo === reply._id).map(nestedReply => (
                                  <div key={nestedReply._id} className="mt-4 ml-14 flex gap-3 group z-10 relative">
                                    <div className="absolute -left-[38px] top-[-25px] w-6 h-10 border-l-2 border-b-2 border-slate-200 dark:border-zinc-700 rounded-bl-xl z-0"></div>
                                    <img src={nestedReply.author?.profilePicture || `https://ui-avatars.com/api/?name=${nestedReply.author?.name}`} className="w-8 h-8 rounded-full shadow-sm object-cover border border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 z-10" alt="" />
                                    <div className="flex-1 z-10">
                                      <div className="bg-slate-50 dark:bg-zinc-800 px-4 py-3 rounded-[1.25rem] rounded-tl-sm inline-block max-w-full relative shadow-sm border border-slate-100 dark:border-zinc-700">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[11px] font-black text-slate-900 dark:text-white">{nestedReply.author?.name}</span>
                                          {nestedReply.author?._id === t.author?._id && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">OP</span>}
                                        </div>
                                        {renderContentWithMentions(nestedReply.content, t, "text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed")}
                                        
                                        {(user._id === nestedReply.author?._id || user._id === t.author?._id || user.role === 'admin') && (
                                          <button onClick={() => handleDeleteReply(t._id, nestedReply._id)} className="absolute -right-8 top-1 p-1.5 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete comment">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 mt-1.5 ml-2">
                                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{timeAgo(nestedReply.createdAt)}</span>
                                        <button onClick={() => handleReplyClick(t._id, reply._id, nestedReply.author?.name)} className="text-[10px] font-black text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors">Reply</button>
                                        <button onClick={() => handleLikeReply(t._id, nestedReply._id)} className={`flex items-center gap-1 text-[10px] font-black transition-colors ${nestedReply.likes?.includes(user._id) ? 'text-red-500' : 'text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400'}`}>
                                          <Heart className={`w-3 h-3 ${nestedReply.likes?.includes(user._id) ? 'fill-red-500 text-red-500' : ''}`} />
                                          {nestedReply.likes?.length > 0 && nestedReply.likes.length}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* 🚨 INLINE REPLY INPUT (Facebook Style) */}
                                {replyingToCommentId[t._id] === reply._id && (
                                  <div className="mt-4 ml-14 relative flex items-center gap-2">
                                    <div className="absolute -left-[38px] top-[-30px] w-6 h-12 border-l-2 border-b-2 border-slate-200 dark:border-zinc-700 rounded-bl-xl z-0"></div>
                                    <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name}`} className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200 dark:border-zinc-700 z-10 bg-white dark:bg-zinc-800" alt="" />
                                    <div className="relative flex-1 z-10 w-full min-w-0">
                                      <MentionInput 
                                        singleLine={true}
                                        value={commentTexts[t._id] || ''} 
                                        onChange={(e, newValue) => setCommentTexts(prev => ({ ...prev, [t._id]: newValue }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault(); 
                                            if (commentTexts[t._id]?.trim()) handleComment(t._id); 
                                          }
                                        }}
                                        placeholder="Write a reply..." 
                                        fetchSuggestions={fetchUserSuggestions}
                                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-full focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:border-blue-500 transition-all shadow-sm" 
                                        inputClassName="py-2.5 pl-4 pr-12 text-sm font-medium text-slate-900 dark:text-white"
                                      />
                                      <button onClick={() => handleComment(t._id)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                                        <Send className="w-3.5 h-3.5"/>
                                      </button>
                                    </div>
                                    <button onClick={() => setReplyingToCommentId(prev => ({ ...prev, [t._id]: null }))} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors z-10">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {!replyingToCommentId[t._id] && (
                            <div className="flex items-center gap-4">
                              <img src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name}`} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-zinc-700 hidden sm:block" alt="" />
                              <div className="relative flex-1 w-full min-w-0">
                                <MentionInput 
                                  singleLine={true}
                                  value={commentTexts[t._id] || ''} 
                                  onChange={(e, newValue) => setCommentTexts(prev => ({ ...prev, [t._id]: newValue }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault(); 
                                      if (commentTexts[t._id]?.trim()) handleComment(t._id); 
                                    }
                                  }}
                                  placeholder="Write a comment..." 
                                  fetchSuggestions={fetchUserSuggestions}
                                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all shadow-sm"
                                  inputClassName="py-3.5 pl-5 pr-14 text-sm font-medium text-slate-900 dark:text-white"
                                />
                                <button onClick={() => handleComment(t._id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 hover:scale-105 transition-all shadow-md shadow-blue-500/20">
                                  <Send className="w-4 h-4"/>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
              <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-zinc-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No discussions found</h3>
              <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Try searching for a different keyword or start a new thread.</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ================= POST MODAL ================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowModal(false); resetForm(); }} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
            <motion.form 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onSubmit={handleSubmit} 
              className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 md:p-10 w-full max-w-xl shadow-2xl relative z-10 border border-slate-100 dark:border-zinc-800"
            >
              <button onClick={() => { setShowModal(false); resetForm(); }} type="button" className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-8">{editingId ? "Edit Post" : "Create Post"}</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="What's on your mind?" className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all shadow-sm" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">Content</label>
                  <MentionInput 
                    value={content} 
                    onChange={(e, newValue) => setContent(newValue)} 
                    placeholder="Add more details to your post..." 
                    fetchSuggestions={fetchUserSuggestions}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:border-blue-500 transition-all shadow-sm"
                    inputClassName="p-4 text-sm font-medium text-slate-900 dark:text-white"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">Attachment (Optional)</label>
                    {file ? (
                      <div className="flex items-center justify-between p-3.5 h-[52px] rounded-2xl border-2 border-dashed bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 flex-shrink-0" /> 
                          <span className="text-sm font-bold truncate block">{file.name}</span>
                        </div>
                        <button type="button" onClick={() => setFile(null)} className="p-1.5 ml-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-full flex-shrink-0 transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 p-3.5 h-[52px] rounded-2xl cursor-pointer transition-all border-2 border-dashed bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600">
                        <ImageIcon className="w-5 h-5 flex-shrink-0"/> 
                        <span className="text-sm font-bold truncate">Add Photo / PDF</span>
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 ml-1">Tags (Optional)</label>
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. CSE302, Help" className="w-full p-3.5 h-[52px] bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 outline-none text-sm font-bold text-slate-900 dark:text-white transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isPosting} className={`w-full mt-8 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl ${isPosting ? 'bg-slate-400 dark:bg-zinc-700 text-white cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5'}`}>
                {isPosting ? <><Loader2 className="animate-spin w-5 h-5" /> Posting...</> : (editingId ? "Save Changes" : <><Send className="w-5 h-5" /> Publish Post</>)}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default PublicThreads;