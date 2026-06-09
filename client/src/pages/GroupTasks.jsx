import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { 
  Plus, MessageSquare, Users, Trash2, X, Send, 
  UserPlus, UserMinus, Settings, CheckCircle2, Circle, Clock, LogOut, Smile,
  Edit2, MoreVertical, Loader2, Image as ImageIcon, Download, FileText, Paperclip, CornerUpLeft
} from 'lucide-react';
import MentionInput from '../components/MentionInput';
import PdfViewerModal from '../components/PdfViewerModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GroupTasks = () => {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingGroupId, setLoadingGroupId] = useState(null);
  
  // Workspace Data
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Modals & UI States
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(window.innerWidth >= 1024); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [viewPdfFile, setViewPdfFile] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const { theme } = useContext(ThemeContext);
  
  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [chatInput, setChatInput] = useState('');
  const [chatFile, setChatFile] = useState(null);
  
  const [activeMessageMenu, setActiveMessageMenu] = useState({ id: null, type: null });
  const [reactEmojiPickerId, setReactEmojiPickerId] = useState(null);
  const [showReactionDetailsId, setShowReactionDetailsId] = useState(null);
  const [visibleTimeMsgId, setVisibleTimeMsgId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [openTaskStatusId, setOpenTaskStatusId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [messageToUnsend, setMessageToUnsend] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  
  const [newMemberId, setNewMemberId] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        if (event.target.closest('.emoji-toggle-btn')) return;
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    if (user && user.token) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/groups`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setGroups(res.data);
      } catch (err) { 
        console.error("Failed to load groups", err);
      } finally {
        setLoading(false);
      }
    };

  // --- REAL-TIME POLLING FOR WORKSPACE ---
  useEffect(() => {
    let interval;
    if (activeGroup && user && user.token) {
      interval = setInterval(() => {
        pollGroupWorkspace(activeGroup._id);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeGroup, user]);

  const pollGroupWorkspace = async (groupId) => {
    try {
      const res = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTasks(res.data.tasks);
      if (res.data.messages.length > messages.length) {
         setMessages(res.data.messages);
      }
    } catch (err) { 
        console.error("Polling error", err); 
    }
  };

  const loadGroupWorkspace = async (groupId) => {
    setLoadingGroupId(groupId);
    try {
      const res = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveGroup(res.data.group);
      setTasks(res.data.tasks);
      setMessages(res.data.messages);
      setShouldAutoScroll(true); 
      
      // Mark as read
      await axios.put(`${API_URL}/api/groups/${groupId}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setGroups(prev => {
        const openedGroup = prev.find(g => g._id === groupId);
        if (openedGroup && openedGroup.unreadCount > 0) {
          window.dispatchEvent(new CustomEvent('group-read', { detail: { count: openedGroup.unreadCount } }));
        }
        return prev.map(g => g._id === groupId ? { ...g, unreadCount: 0 } : g);
      });
      
    } catch (err) { toast.error("Failed to load workspace"); }
    finally { setLoadingGroupId(null); }
  };

  const handleEditMessageSubmit = async (messageId) => {
    if (!editingMessageText.trim()) return;
    try {
      const res = await axios.put(`${API_URL}/api/groups/${activeGroup._id}/messages/${messageId}`, {
        content: editingMessageText
      }, { headers: { Authorization: `Bearer ${user.token}` } });
      setEditingMessageId(null);
      setActiveMessageMenu({ id: null, type: null });
      setEditingMessageText('');
      setMessages(messages.map(msg => msg._id === messageId ? res.data : msg));
    } catch (err) {
      toast.error("Failed to edit message");
    }
  };

  const handleUnsendMessage = async () => {
    if (!messageToUnsend) return;
    try {
      const res = await axios.delete(`${API_URL}/api/groups/${activeGroup._id}/messages/${messageToUnsend}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveMessageMenu({ id: null, type: null });
      setMessageToUnsend(null);
      setMessages(messages.map(msg => msg._id === messageToUnsend ? res.data : msg));
    } catch (err) {
      toast.error("Failed to unsend message");
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const res = await axios.put(`${API_URL}/api/groups/${activeGroup._id}/messages/${messageId}/react`, { emoji }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(messages.map(m => m._id === messageId ? res.data : m));
      setActiveMessageMenu(null);
    } catch (err) {
      toast.error("Failed to react");
    }
  };

  const handleChatScroll = () => {
      if (!chatContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll && chatContainerRef.current) {
      // Direct scroll to prevent window from shifting (unlike scrollIntoView)
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll, isChatOpen]);

  // Handle mobile back button for modals and chat overlay
  useEffect(() => {
    const isChatOverlay = isChatOpen && window.innerWidth < 1024;
    const hasModal = !!(viewImage || confirmDialog || showCreateGroup || showAddTask || showSettings || isChatOverlay);
    const hasHash = window.location.hash === '#modal';

    if (hasModal && !hasHash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + '#modal');
    } else if (!hasModal && hasHash) {
      window.history.back();
    }
  }, [viewImage, confirmDialog, showCreateGroup, showAddTask, showSettings, isChatOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash !== '#modal') {
        if (viewImage) setViewImage(null);
        if (confirmDialog) setConfirmDialog(null);
        if (showCreateGroup) setShowCreateGroup(false);
        if (showAddTask) setShowAddTask(false);
        if (showSettings) setShowSettings(false);
        if (isChatOpen && window.innerWidth < 1024) setIsChatOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewImage, confirmDialog, showCreateGroup, showAddTask, showSettings, isChatOpen]);

  const groupMembersSuggestions = async (query, callback) => {
    if (!activeGroup) return;
    const lowerQuery = (query || '').toLowerCase();
    const suggestions = activeGroup.members
      .filter(m => m._id !== user._id)
      .filter(m => m.name.toLowerCase().includes(lowerQuery) || m.student_id.toLowerCase().includes(lowerQuery))
      .map(m => ({ id: m._id, display: m.name, profilePicture: m.profilePicture }));
    callback(suggestions);
  };


  // --- 2. GROUP MANAGEMENT ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/groups`, newGroup, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setShowCreateGroup(false);
      setNewGroup({ name: '', description: '' });
      fetchGroups();
    } catch (err) { toast.error("Failed to create group"); }
  };

  const handleDeleteGroup = async () => {
    setConfirmDialog({
      title: "Delete Workspace?",
      description: "Delete this entire group and all tasks/messages forever? This action cannot be undone.",
      confirmText: "Delete Forever",
      icon: <Trash2 className="w-8 h-8" />,
      action: async () => {
        try {
          await axios.delete(`${API_URL}/api/groups/${activeGroup._id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setActiveGroup(null);
          fetchGroups();
          setConfirmDialog(null);
        } catch (err) { toast.error("Failed to delete"); }
      }
    });
  };

  const handleLeaveGroup = async () => {
    setConfirmDialog({
      title: "Leave Workspace?",
      description: "Are you sure you want to leave this group? You will lose access to all tasks and messages.",
      confirmText: "Leave Group",
      icon: <LogOut className="w-8 h-8" />,
      action: async () => {
        const myId = user._id || user.id;
        const groupId = activeGroup._id || activeGroup.id;
        try {
          await axios.delete(`${API_URL}/api/groups/${groupId}/members/${myId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setActiveGroup(null);
          fetchGroups();
          toast.success("You have left the group.");
          setConfirmDialog(null);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to leave group");
        }
      }
    });
  };

  // --- 3. MEMBER MANAGEMENT (Admin Only) ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/groups/${activeGroup._id}/members`, { student_id: newMemberId }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNewMemberId('');
      loadGroupWorkspace(activeGroup._id); 
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add member"); }
  };

  const handleKickMember = async (memberId) => {
    setConfirmDialog({
      title: "Kick Member?",
      description: "Are you sure you want to remove this member from the group?",
      confirmText: "Kick Member",
      icon: <UserMinus className="w-8 h-8" />,
      action: async () => {
        const groupId = activeGroup._id || activeGroup.id;
        try {
          await axios.delete(`${API_URL}/api/groups/${groupId}/members/${memberId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          loadGroupWorkspace(groupId);
          toast.success("Member removed.");
          setConfirmDialog(null);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to kick member");
        }
      }
    });
  };

  // --- 4. TASKS ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    const payload = {
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo === '' ? null : newTask.assignedTo
    };
    try {
      const res = await axios.post(`${API_URL}/api/groups/${activeGroup._id}/tasks`, payload, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTasks([...tasks, res.data]);
      setShowAddTask(false);
      setNewTask({ title: '', description: '', assignedTo: '' });
    } catch (err) { toast.error(err.response?.data?.message || "Failed to add task"); }
  };

  const handleDeleteTask = async (taskId) => {
    setConfirmDialog({
      title: "Delete Task?",
      description: "Are you sure you want to delete this task?",
      confirmText: "Delete Task",
      icon: <Trash2 className="w-8 h-8" />,
      action: async () => {
        try {
          await axios.delete(`${API_URL}/api/groups/${activeGroup._id}/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setTasks(tasks.filter(t => t._id !== taskId));
          setConfirmDialog(null);
        } catch (err) { 
          toast.error(err.response?.data?.message || "Failed to delete task"); 
        }
      }
    });
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const taskToMove = tasks.find(t => t._id === taskId);
    if (!taskToMove || taskToMove.status === newStatus) return;

    const isAssignedToSomeoneElse = taskToMove.assignedTo && taskToMove.assignedTo._id !== user._id;
    const isNotAdmin = activeGroup.admin._id !== user._id;

    if (isAssignedToSomeoneElse && isNotAdmin) {
      toast.error(`Only ${taskToMove.assignedTo.name} can move this task.`);
      return;
    }
    
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      await axios.put(`${API_URL}/api/groups/${activeGroup._id}/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
      setTasks(previousTasks); 
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
    if (taskId) {
      updateTaskStatus(taskId, newStatus);
    }
    setTimeout(() => setDraggedTaskId(null), 50);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverColumnId(null);
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      setDraggedTaskId(null);
      setDragOverColumnId(null);
    }, 100);
  };

  // --- 5. CHAT ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isSendingMessage) return;
    if (!chatInput.trim() && !chatFile) return;
    
    setIsSendingMessage(true);

    const tempId = 'temp_' + Date.now();
    const optimisticMessage = {
      _id: tempId,
      content: chatInput.trim(),
      sender: user,
      createdAt: new Date().toISOString(),
      isSending: true,
      image: chatFile ? URL.createObjectURL(chatFile) : null,
      replyTo: replyingTo ? replyingTo : null
    };

    const currentInput = chatInput;
    const currentFile = chatFile;
    const currentReplyingTo = replyingTo;

    setMessages(prev => [...prev, optimisticMessage]);
    setChatInput('');
    setChatFile(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setShouldAutoScroll(true); 

    try {
        const formData = new FormData();
        if (currentInput.trim()) formData.append('content', currentInput);
        if (currentFile) formData.append('file', currentFile);
        if (currentReplyingTo) formData.append('replyTo', currentReplyingTo._id);
  
        const res = await axios.post(`${API_URL}/api/groups/${activeGroup._id}/messages`, formData, {
          headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' }
        });
        setMessages(prev => prev.map(m => m._id === tempId ? res.data : m));
    } catch (err) {
        setMessages(prev => prev.filter(m => m._id !== tempId));
        setChatInput(currentInput);
        setChatFile(currentFile);
        setReplyingTo(currentReplyingTo);
        toast.error("Failed to send message");
    } finally {
        setIsSendingMessage(false);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type === 'application/pdf') {
          const file = items[i].getAsFile();
          if (file.size > 15 * 1024 * 1024) {
            toast.error('Pasted file size must be less than 15MB');
            return;
          }
          setChatFile(file);
          e.preventDefault();
          break;
        }
    }
  };


  // ================= VIEW: GROUP SELECTION =================
  if (!activeGroup) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                Collaboration
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">My Groups</h1>
              <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Collaborate on projects, share tasks, and chat in real-time.</p>
            </div>
            <button onClick={() => setShowCreateGroup(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20 shrink-0">
              <Plus className="w-5 h-5" /> Create Group
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {loading ? (
                <div className="col-span-full flex justify-center items-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : groups.length > 0 ? groups.map((group, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={group._id} 
                  onClick={() => loadGroupWorkspace(group._id)}
                  className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800/50 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group/card text-left flex flex-col h-full hover:-translate-y-1.5 select-none"
                >
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-5 group-hover/card:bg-blue-600 group-hover/card:text-white group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-300 shadow-sm relative">
                    <Users className="w-7 h-7" />
                    {group.unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-sm">
                        {group.unreadCount > 9 ? '9+' : group.unreadCount}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 truncate group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">{group.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed flex-1">{group.description || "No description provided."}</p>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    <span className="bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">{group.members.length} Members</span>
                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover/card:translate-x-1 transition-transform">
                      {loadingGroupId === group._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Workspace</>}
                    </span>
                  </div>
                </motion.div>
              )) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center py-24 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 dark:border-zinc-800/50 shadow-sm mt-8">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <Users className="w-12 h-12 text-slate-300 dark:text-zinc-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No groups yet</h3>
                  <p className="text-slate-500 dark:text-zinc-400 mt-2 font-medium">Create or join a group to start collaborating.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {showCreateGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateGroup(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative z-10 text-left border border-slate-100 dark:border-zinc-800">
                <button onClick={() => setShowCreateGroup(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Start a New Group</h2>
                <form onSubmit={handleCreateGroup} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Group Name</label>
                    <input value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} required className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" placeholder="e.g. Capstone Project Team" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Description</label>
                    <textarea value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl font-medium text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all resize-none" rows="3" placeholder="What is this group for?" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mt-4 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5">Create Group</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Layout>
    );
  }

  const isAdmin = activeGroup.admin._id === user._id;
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'text-slate-500 dark:text-zinc-400', bg: 'bg-slate-100 dark:bg-zinc-800' },
    { id: 'doing', title: 'Doing', icon: Clock, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'done', title: 'Done', icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
  ];

  const isElectron = window.location.protocol === 'file:' || navigator.userAgent.toLowerCase().includes('electron');

  // ================= VIEW: ACTIVE WORKSPACE =================
  return (
    <Layout>
      <style>{`
        main { overflow: hidden !important; }
      `}</style>
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`flex h-[calc(100vh-144px)] ${isElectron ? 'md:h-[calc(100vh-32px)]' : 'md:h-screen'} overflow-hidden bg-slate-50/50 dark:bg-[#0a0a0a] relative font-sans -mx-4 md:mx-0`}
      >
        
        {/* --- LEFT: KANBAN BOARD --- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Header */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-zinc-800/50 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveGroup(null)} className="text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{activeGroup.name}</h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 ml-[3.25rem] truncate font-bold uppercase tracking-widest mt-1">
                {activeGroup.members.length} Members • Admin: <span className="text-slate-800 dark:text-slate-200">{activeGroup.admin?.name}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-2">
              <button onClick={() => setShowSettings(true)} className="p-2.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-zinc-700" title="Group Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={() => setShowAddTask(true)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2.5 sm:px-5 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10 shrink-0">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add Task</span>
              </button>
              <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2.5 rounded-xl transition-all relative border ${isChatOpen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-sm'}`} title="Toggle Chat">
                <MessageSquare className="w-5 h-5" />
                {!isChatOpen && <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900"></div>}
              </button>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="flex-1 overflow-x-auto p-4 sm:p-6 custom-scrollbar">
            <div className="flex gap-4 sm:gap-6 h-full min-w-max items-start">
              {kanbanColumns.map(col => (
                <div 
                  key={col.id} 
                  className={`w-72 sm:w-80 backdrop-blur-sm rounded-[2rem] flex flex-col h-full max-h-full border transition-all duration-200 ${dragOverColumnId === col.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.01]' : 'bg-slate-100/50 dark:bg-zinc-900/50 border-slate-200/50 dark:border-zinc-800/50 shadow-inner'}`}
                  onDragEnter={(e) => e.preventDefault()}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="p-5 flex justify-between items-center border-b border-slate-200/50 dark:border-zinc-800/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <col.icon className={`w-5 h-5 ${col.color}`} />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">{col.title}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${col.bg} ${col.color}`}>
                      {tasks.filter(t => t.status === col.id).length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
                    <AnimatePresence>
                      {tasks.filter(t => t.status === col.id).map(task => {
                        const canDrag = !task.assignedTo || task.assignedTo._id === user._id || isAdmin;

                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, task._id)}
                            onDragEnd={handleDragEnd}
                            className={`group bg-white dark:bg-zinc-800/80 p-4 rounded-2xl border shadow-sm flex flex-col relative overflow-hidden transition-all duration-200
                              ${canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-not-allowed opacity-75'}
                              ${draggedTaskId === task._id ? 'opacity-40 scale-95 border-blue-400' : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'}
                            `}
                          >
                            {(isAdmin || (task.assignedBy && task.assignedBy._id === user._id)) && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                                className="absolute top-3 right-3 p-1.5 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            <h4 className="font-bold text-slate-900 dark:text-white leading-snug pr-6 mb-2">{task.title}</h4>
                            
                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mb-3 leading-relaxed font-medium">{task.description}</p>
                            )}
                            
                            {task.assignedBy?.name && (
                              <p className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-3 bg-blue-50 dark:bg-blue-900/20 w-fit px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800/50">
                                By: {task.assignedBy.name.split(' ')[0]}
                              </p>
                            )}
                            
                            <div className="flex justify-between items-end pt-3 border-t border-slate-100 dark:border-zinc-800 mt-2">
                              <div className="flex flex-col gap-1.5">
                                {task.assignedTo ? (
                                  <div className="flex items-center gap-2" title={task.assignedTo.name}>
                                    <img src={task.assignedTo.profilePicture || `https://ui-avatars.com/api/?name=${task.assignedTo.name}`} className="w-6 h-6 rounded-full border border-slate-100 dark:border-zinc-700" alt="" />
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{task.assignedTo.name.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md">Unassigned</span>
                                )}
                              </div>

                              <div className="relative">
                                <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canDrag) {
                                        setOpenTaskStatusId(openTaskStatusId === task._id ? null : task._id);
                                      }
                                    }}
                                    disabled={!canDrag}
                                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors
                                      ${task.status === 'todo' ? 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700' : ''}
                                      ${task.status === 'doing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : ''}
                                      ${task.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : ''}
                                      ${!canDrag ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                                    `}
                                >
                                    {task.status === 'todo' ? 'To Do' : task.status === 'doing' ? 'Doing' : 'Done'}
                                </button>
                                
                                <AnimatePresence>
                                  {openTaskStatusId === task._id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenTaskStatusId(null); }} />
                                      <motion.div
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-2 w-32 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col p-1"
                                      >
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task._id, 'todo'); setOpenTaskStatusId(null); }}
                                          className={`text-[10px] font-black uppercase tracking-widest text-left px-3 py-2 rounded-lg transition-colors ${task.status === 'todo' ? 'bg-slate-100 dark:bg-zinc-700 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50'}`}
                                        >
                                          To Do
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task._id, 'doing'); setOpenTaskStatusId(null); }}
                                          className={`text-[10px] font-black uppercase tracking-widest text-left px-3 py-2 rounded-lg transition-colors ${task.status === 'doing' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50'}`}
                                        >
                                          Doing
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); updateTaskStatus(task._id, 'done'); setOpenTaskStatusId(null); }}
                                          className={`text-[10px] font-black uppercase tracking-widest text-left px-3 py-2 rounded-lg transition-colors ${task.status === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700/50'}`}
                                        >
                                          Done
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- CHAT SIDEBAR --- */}
        <div className={`
          fixed inset-y-0 right-0 z-40 md:relative md:inset-auto md:h-full shrink-0
          transition-transform duration-500 md:transition-[width,transform,opacity] md:duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden
          ${isChatOpen ? 'translate-x-0 w-[100vw] sm:w-[400px] md:w-[350px] lg:w-[400px] xl:w-[450px] md:opacity-100' : 'translate-x-full md:translate-x-0 w-[100vw] sm:w-[400px] md:w-0 md:opacity-0'}
        `}>
          
          <div className="w-[100vw] sm:w-[400px] md:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-white dark:bg-zinc-900/95 md:bg-white/90 md:dark:bg-zinc-900/90 backdrop-blur-xl border-l border-slate-200/50 dark:border-zinc-800/50 flex flex-col absolute top-0 right-0 md:static shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
            <div className="p-5 border-b border-slate-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 shrink-0 text-left">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Team Chat</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-widest">Active</span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors md:hidden">
              <X className="w-5 h-5"/>
            </button>
          </div>

          <div 
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-[#0a0a0a]/50"
          >
            {messages.map((msg, index) => {
              const isMe = msg.sender._id === user._id;
              const isNewSender = index === 0 || messages[index - 1].sender._id !== msg.sender._id;
              const timeDiff = index === 0 ? 0 : new Date(msg.createdAt) - new Date(messages[index - 1].createdAt);
              const isTimeGap10Min = timeDiff > 10 * 60 * 1000;
              const showHeader = isNewSender || isTimeGap10Min;

              return (
                <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {isTimeGap10Min && (
                    <div className="w-full flex justify-center my-4">
                      <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  )}
                  {showHeader && !isMe && (
                    <div className={`flex items-center gap-2 mb-1.5 pl-1`}>
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{msg.sender.name.split(' ')[0]}</span>
                    </div>
                  )}

                  <motion.div 
                      drag={(typeof window !== 'undefined' && window.innerWidth < 768 && !msg.isUnsent && !msg.isSending) ? "x" : false}
                      dragConstraints={isMe ? { left: -40, right: 0 } : { left: 0, right: 40 }}
                      dragElastic={isMe ? { left: 0.05, right: 0 } : { left: 0, right: 0.05 }}
                      dragSnapToOrigin={true}
                      onDragEnd={(e, info) => {
                        if (msg.isUnsent || msg.isSending) return;
                        if (isMe && info.offset.x < -30) setReplyingTo(msg);
                        else if (!isMe && info.offset.x > 30) setReplyingTo(msg);
                      }}
                      onClick={() => setVisibleTimeMsgId(visibleTimeMsgId === msg._id ? null : msg._id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!msg.isUnsent && !msg.isSending) {
                          const type = isMe ? 'both' : 'react';
                          setActiveMessageMenu(
                            activeMessageMenu?.id === msg._id && activeMessageMenu?.type === type
                              ? { id: null, type: null }
                              : { id: msg._id, type }
                          );
                        }
                      }}
                      className={`flex gap-2 max-w-[85%] text-left relative group touch-pan-y ${msg.isSending ? 'opacity-60 blur-[1px] pointer-events-none' : 'transition-[opacity,filter] duration-300'}`}
                      id={`msg-${msg._id}`}
                    >
                    {!isMe && showHeader && (
                      <img src={msg.sender.profilePicture || `https://ui-avatars.com/api/?name=${msg.sender.name}`} className="w-8 h-8 rounded-full shrink-0 shadow-sm border border-slate-100 dark:border-zinc-700" alt="" />
                    )}
                    {!isMe && !showHeader && <div className="w-8 shrink-0"></div>}

                    <div className="flex flex-col w-full max-w-full">
                      {msg.replyTo && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById(`msg-${msg.replyTo._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`cursor-pointer mb-1.5 px-3 py-1.5 rounded-xl text-xs shadow-sm border-l-4 transition-opacity hover:opacity-80 ${isMe ? 'bg-blue-700/30 border-white/40 text-blue-50' : 'bg-slate-200/60 dark:bg-zinc-800/80 border-blue-400 text-slate-600 dark:text-zinc-400'}`}
                        >
                          <div className="font-black mb-0.5">{msg.replyTo.sender.name}</div>
                          <div className="truncate max-w-[200px] opacity-90">{msg.replyTo.content ? msg.replyTo.content.replace(/@\[(.*?)\]\(.*?\)/g, '@$1') : (msg.replyTo.unsentType === 'image' || msg.replyTo.image ? 'Photo' : msg.replyTo.unsentType === 'pdf' ? 'PDF Document' : 'Attachment')}</div>
                        </div>
                      )}

                      <div className={`relative select-none md:select-text text-sm font-medium rounded-[1.25rem] ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${(!msg.isUnsent && !msg.content && msg.image) ? 'p-0 bg-transparent shadow-none' : `px-4 py-2.5 ${isMe ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700 text-slate-800 dark:text-slate-200 shadow-sm'}`}`}>
                      {msg.isUnsent ? (
                        <span className={`italic text-xs ${isMe ? 'text-white/70' : 'text-slate-400 dark:text-zinc-500'}`}>
                          {msg.sender.name} unsent a {msg.unsentType === 'image' ? 'photo' : msg.unsentType === 'pdf' ? 'pdf' : 'message'}
                        </span>
                      ) : editingMessageId === msg._id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <MentionInput 
                            autoFocus={true}
                            singleLine={true}
                            value={editingMessageText}
                            onChange={(e, val) => setEditingMessageText(val)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleEditMessageSubmit(msg._id);
                              }
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                            fetchSuggestions={groupMembersSuggestions}
                            className="w-full bg-white/20 dark:bg-black/20 border border-transparent rounded-xl focus-within:border-white/50 transition-all shadow-sm"
                            inputClassName="py-2 px-3 text-sm text-white"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMessageId(null)} className="text-[11px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => handleEditMessageSubmit(msg._id)} className="text-[11px] font-bold bg-white hover:bg-slate-100 text-blue-600 px-3 py-1.5 rounded-lg shadow-sm transition-colors">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {msg.image && (
                            msg.image.endsWith('.pdf') ? (
                              <button onClick={() => setViewPdfFile({ url: msg.image, title: 'Document.pdf', category: 'Document' })} className={`w-full flex items-center gap-3 p-3 rounded-xl border hover:opacity-80 transition-opacity text-left ${!msg.content ? 'mb-0' : 'mb-2'} ${isMe ? (!msg.content ? 'bg-blue-600 text-white border-blue-500 shadow-md' : 'bg-white/20 border-white/30 text-white') : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'}`}>
                                <FileText className={`w-8 h-8 shrink-0 ${isMe ? 'text-white' : 'text-red-500'}`} />
                                <div className="flex flex-col overflow-hidden">
                                  <span className="text-sm font-bold truncate">Document.pdf</span>
                                  <span className={`text-[10px] font-bold ${isMe ? 'text-white/70' : 'text-slate-500 dark:text-zinc-400'}`}>Click to view</span>
                                </div>
                              </button>
                            ) : (
                              <div onClick={() => setViewImage(msg.image)} className="cursor-pointer">
                                <img draggable={false} src={msg.image} alt="Attachment" className={`rounded-[1.25rem] max-w-full sm:max-w-sm ${!msg.content ? 'mb-0 border border-slate-200 dark:border-zinc-800' : 'mb-2 object-cover border border-slate-200 dark:border-zinc-700'} hover:opacity-90 transition-opacity`} />
                              </div>
                            )
                          )}
                          {msg.content && (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {(msg.content || '').split(/(@\[.*?\]\(.*?\))/g).map((part, i) => {
                                const match = part.match(/@\[(.*?)\]\((.*?)\)/);
                                if (match) {
                                  return <span key={i} className={`font-bold ${isMe ? 'underline decoration-white/50' : 'text-blue-600 dark:text-blue-400'}`}>@{match[1]}</span>;
                                }
                                return <span key={i}>{part}</span>;
                              })}
                            </p>
                          )}
                          {msg.isEdited && (
                            <span className={`text-[9px] font-medium italic text-right mt-1 ${isMe ? 'text-white/60' : 'text-slate-400 dark:text-zinc-500'}`}>
                              (edited)
                            </span>
                          )}
                        </div>
                      )}
                      
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 z-10 cursor-pointer`}
                               onClick={(e) => { e.stopPropagation(); setShowReactionDetailsId(msg._id); }}
                          >
                            {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => (
                              <span key={emoji}>{emoji}</span>
                            ))}
                            <span className="font-bold text-slate-500 dark:text-zinc-400 ml-0.5">{msg.reactions.length > 1 ? msg.reactions.length : ''}</span>
                          </div>
                        )}
                        {/* Hover Button for Desktop */}
                        {!msg.isUnsent && editingMessageId !== msg._id && (
                          <div className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 hidden md:flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5`}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMessageMenu(
                                  activeMessageMenu?.id === msg._id && activeMessageMenu?.type === 'react'
                                    ? { id: null, type: null }
                                    : { id: msg._id, type: 'react' }
                                );
                              }}
                              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 rounded-full"
                              title="React"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo(msg);
                              }}
                              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 rounded-full"
                              title="Reply"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                            </button>
                            {isMe && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMessageMenu(
                                    activeMessageMenu?.id === msg._id && activeMessageMenu?.type === 'options'
                                      ? { id: null, type: null }
                                      : { id: msg._id, type: 'options' }
                                  );
                                }}
                                className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 rounded-full"
                                title="More options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className={`overflow-hidden transition-all duration-300 flex ${isMe ? 'justify-end pr-1' : 'justify-start pl-1'} ${visibleTimeMsgId === msg._id ? `max-h-[20px] opacity-100 ${(msg.reactions && msg.reactions.length > 0) ? 'mt-4' : 'mt-1'}` : `max-h-0 opacity-0 md:group-hover:max-h-[20px] md:group-hover:opacity-100 ${(msg.reactions && msg.reactions.length > 0) ? 'md:group-hover:mt-4' : 'md:group-hover:mt-1'}`}`}>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 whitespace-nowrap">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>


                    <AnimatePresence>
                      {activeMessageMenu?.id === msg._id && !msg.isUnsent && (
                        <>
                        <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); setActiveMessageMenu({ id: null, type: null }); }} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className={`absolute z-[100] ${isMe ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1'} bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden min-w-[220px] flex flex-col`}
                        >
                          {(activeMessageMenu.type === 'react' || activeMessageMenu.type === 'both') && (
                            <div className={`flex items-center justify-between px-3 py-2 bg-slate-50/50 dark:bg-zinc-900/50 gap-1 ${activeMessageMenu.type === 'both' ? 'border-b border-slate-100 dark:border-zinc-800' : ''}`}>
                              {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => {
                                const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user === user._id);
                                return (
                                  <button key={emoji} onClick={() => { handleReaction(msg._id, emoji); setActiveMessageMenu({ id: null, type: null }); }} className={`text-xl hover:scale-125 transition-transform ${hasReacted ? 'bg-blue-100 dark:bg-blue-900/40 rounded-full' : ''}`}>
                                    {emoji}
                                  </button>
                                )
                              })}
                              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReactEmojiPickerId(msg._id); setActiveMessageMenu({ id: null, type: null }); }} className="text-xl text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:scale-125 transition-transform bg-slate-100 dark:bg-zinc-800 rounded-full w-8 h-8 flex items-center justify-center">
                                <Plus className="w-4 h-4 pointer-events-none" />
                              </button>
                            </div>
                          )}
                           {(activeMessageMenu.type === 'options' || activeMessageMenu.type === 'both' || activeMessageMenu.type === 'react') && (
                              <>
                                <button onClick={() => { setReplyingTo(msg); setActiveMessageMenu({ id: null, type: null }); }} className={`flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left ${activeMessageMenu.type !== 'react' ? 'border-b border-slate-100 dark:border-zinc-800' : ''}`}>
                                  <CornerUpLeft className="w-4 h-4 text-blue-500" /> Reply
                                </button>
                              </>
                            )}

                          {(activeMessageMenu.type === 'options' || activeMessageMenu.type === 'both') && isMe && (
                            <>
                              <button onClick={() => { setEditingMessageId(msg._id); setEditingMessageText(msg.content); setActiveMessageMenu({ id: null, type: null }); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left border-b border-slate-100 dark:border-zinc-800">
                                <Edit2 className="w-4 h-4 text-blue-500" /> Edit Message
                              </button>
                              <button onClick={() => { setMessageToUnsend(msg._id); setActiveMessageMenu({ id: null, type: null }); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                                <Trash2 className="w-4 h-4 text-red-500" /> Unsend Message
                              </button>
                            </>
                          )}
                        </motion.div>
                        </>
                      )}
                      {reactEmojiPickerId === msg._id && !msg.isUnsent && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
                          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setReactEmojiPickerId(null); }} />
                          <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 z-10" onClick={e => e.stopPropagation()}>
                            <EmojiPicker 
                              skinTonesDisabled={true}
                              onEmojiClick={(emojiData) => {
                                handleReaction(msg._id, emojiData.emoji);
                                setReactEmojiPickerId(null);
                              }}
                              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                            />
                          </div>
                        </div>
                      )}

                      {/* Reaction Details Modal */}
                      {showReactionDetailsId === msg._id && !msg.isUnsent && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowReactionDetailsId(null); }} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden w-full max-w-[260px] flex flex-col z-10"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-700 dark:text-zinc-300">Reactions</span>
                              <button onClick={() => setShowReactionDetailsId(null)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors"><X className="w-4 h-4"/></button>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
                              {msg.reactions?.map((react, i) => {
                                const reactedUser = activeGroup.members.find(m => m._id === react.user) || { name: 'Unknown', _id: react.user };
                                const isMyReact = react.user === user._id;
                                return (
                                  <div key={i} className="flex justify-between items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">{react.emoji}</span>
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{reactedUser.name}</span>
                                    </div>
                                    {isMyReact && (
                                      <button onClick={() => { handleReaction(msg._id, react.emoji); setShowReactionDetailsId(null); }} className="text-[10px] text-red-500 hover:text-red-600 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors shrink-0">
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-zinc-800/50 shrink-0 relative z-[100] pb-safe">
            {replyingTo && (
              <div className="flex items-center justify-between bg-slate-100/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 mb-2 rounded-xl border-l-4 border-blue-500 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">Replying to {replyingTo.sender.name}</span>
                  <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md">{replyingTo.content ? replyingTo.content.replace(/@\[(.*?)\]\(.*?\)/g, '@$1') : (replyingTo.unsentType === 'image' || replyingTo.image ? 'Photo' : replyingTo.unsentType === 'pdf' ? 'PDF Document' : 'Attachment')}</span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Removed the fixed inset-0 overlay because we now use a mousedown listener to handle clicks outside */}

            <AnimatePresence>
              {showEmojiPicker && (
                  <motion.div 
                    ref={emojiPickerRef}
                    key="emoji-picker"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 z-[100] shadow-2xl origin-bottom-left"
                  >
                    <EmojiPicker 
                      skinTonesDisabled={true}
                      theme={theme === 'dark' ? 'dark' : 'light'} 
                      onEmojiClick={(emojiData) => setChatInput(prev => prev + emojiData.emoji)} 
                      width={320}
                      height={400}
                    />
                  </motion.div>
              )}
            </AnimatePresence>
            
            {chatFile && (
              <div className="relative inline-block mb-2 self-start ml-4 bg-slate-100 dark:bg-zinc-800 rounded-lg p-2 pr-6 border border-slate-200 dark:border-zinc-700">
                {chatFile.type === 'application/pdf' ? (
                  <div className="flex items-center gap-2 px-2 h-16">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate max-w-[150px]">{chatFile.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">PDF Document</span>
                    </div>
                  </div>
                ) : (
                  <img src={URL.createObjectURL(chatFile)} alt="Attachment" className="h-20 rounded-lg object-cover" />
                )}
                <button onClick={() => setChatFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md z-10">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative flex items-center" onPaste={handlePaste}>
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-2 p-2 text-slate-400 hover:text-blue-500 transition-colors z-20 emoji-toggle-btn"
              >
                <Smile className="w-5 h-5" />
              </button>

              <label className="absolute left-10 p-2 text-slate-400 hover:text-blue-500 transition-colors z-20 cursor-pointer">
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && file.size <= 15 * 1024 * 1024) setChatFile(file);
                  else if (file) toast.error("File must be less than 15MB");
                  e.target.value = null;
                }} />
                <Paperclip className="w-5 h-5" />
              </label>
              
              <MentionInput 
                singleLine={true}
                value={chatInput}
                onChange={(e, newValue) => setChatInput(newValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim() || chatFile) handleSendMessage(e);
                  }
                }}
                placeholder="Type a message..." 
                fetchSuggestions={groupMembersSuggestions}
                className="w-full bg-slate-100 dark:bg-zinc-800 border border-transparent dark:border-zinc-700 rounded-full focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:border-blue-500 transition-all shadow-inner"
                inputClassName="py-4 pl-20 pr-14 text-[15px] font-medium text-slate-900 dark:text-white"
              />

              <button 
                type="submit" 
                disabled={(!chatInput.trim() && !chatFile) || isSendingMessage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-zinc-700 disabled:text-slate-500 disabled:dark:text-zinc-500 transition-all shadow-md disabled:shadow-none z-20"
              >
                {isSendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {showAddTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTask(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative z-10 text-left border border-slate-100 dark:border-zinc-800">
              <button onClick={() => setShowAddTask(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Add New Task</h2>
              <form onSubmit={handleAddTask} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Task Title</label>
                  <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all" placeholder="e.g. Design DB" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl font-medium text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all resize-none" rows="3" placeholder="Additional details..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest ml-1 mb-2">Assign To (Optional)</label>
                  <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-zinc-800/50 border-2 border-transparent dark:border-zinc-800 rounded-2xl font-bold text-slate-900 dark:text-white outline-none appearance-none cursor-pointer focus:bg-white dark:focus:bg-zinc-900 focus:border-blue-500 transition-all">
                    <option value="">Anyone</option>
                    {activeGroup.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black mt-4 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2">
                   <Plus className="w-5 h-5"/> Create Task
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar text-left border border-slate-100 dark:border-zinc-800">
              <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 p-2.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Workspace Settings</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-8">Manage members and workspace data.</p>

              {isAdmin ? (
                <form onSubmit={handleAddMember} className="mb-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl">
                  <h3 className="text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-3 ml-1">Add Member</h3>
                  <div className="flex gap-3">
                    <input value={newMemberId} onChange={e => setNewMemberId(e.target.value)} required placeholder="Student ID..." className="flex-1 p-3.5 bg-white dark:bg-zinc-900 rounded-xl outline-none border border-transparent dark:border-zinc-800 focus:border-blue-500 text-sm font-bold text-slate-900 dark:text-white shadow-sm transition-colors" />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl font-bold flex items-center transition-colors shadow-md shadow-blue-500/20"><UserPlus className="w-5 h-5"/></button>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-6 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl border border-slate-100 dark:border-zinc-800 text-center text-sm font-bold text-slate-500 dark:text-zinc-400">Only admin can manage members.</div>
              )}

              <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 ml-1">Current Members ({activeGroup.members.length})</h3>
              <div className="space-y-3 mb-8">
                {activeGroup.members.map(member => (
                  <div key={member._id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-4">
                      <img src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.name}`} className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-700 object-cover" alt="" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{member.name}</p>
                        <p className="text-[11px] font-black tracking-wider text-slate-500 dark:text-zinc-400 mt-1 uppercase">{member.student_id} {member._id === activeGroup.admin._id && <span className="ml-2 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">Admin</span>}</p>
                      </div>
                    </div>
                    {isAdmin && member._id !== user._id && (
                      <button onClick={() => handleKickMember(member._id)} className="p-2.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                        <UserMinus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin ? (
                <div className="pt-8 border-t border-slate-100 dark:border-zinc-800 mt-auto">
                  <button onClick={handleDeleteGroup} className="w-full py-4 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-500 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/20 hover:border-red-500">
                    <Trash2 className="w-5 h-5"/> Delete Workspace
                  </button>
                </div>
              ) : (
                <div className="pt-8 border-t border-slate-100 dark:border-zinc-800 mt-auto">
                  <button onClick={handleLeaveGroup} className="w-full py-4 text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-500 hover:text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/20 hover:border-red-500">
                    <LogOut className="w-5 h-5"/> Leave Group
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {createPortal(
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
        </AnimatePresence>,
        document.body
      )}
      {createPortal(
        <AnimatePresence>
          {messageToUnsend && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMessageToUnsend(null)} className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative z-10 text-center border border-slate-100 dark:border-zinc-800">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Unsend Message?</h3>
                <p className="text-slate-500 dark:text-zinc-400 font-medium mb-8">This message will be removed for everyone in the group.</p>
                <div className="flex gap-3">
                  <button onClick={() => setMessageToUnsend(null)} className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                  <button onClick={handleUnsendMessage} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all">Unsend</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {createPortal(
        <AnimatePresence>
          {viewImage && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewImage(null)} className="absolute inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center pointer-events-none">
                <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 p-3 rounded-full transition-colors pointer-events-auto backdrop-blur-sm">
                  <X className="w-6 h-6" />
                </button>
                <img src={viewImage} alt="Fullscreen View" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-auto" />
                <a href={viewImage} download target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl backdrop-blur-sm transition-colors font-bold pointer-events-auto">
                  <Download className="w-4 h-4" /> Download Image
                </a>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* PDF View Modal */}
      <PdfViewerModal 
        isOpen={!!viewPdfFile}
        onClose={() => setViewPdfFile(null)}
        fileUrl={viewPdfFile?.url}
        title={viewPdfFile?.title}
        category={viewPdfFile?.category}
      />
      </motion.div>
    </Layout>
  );
}; 

export default GroupTasks;