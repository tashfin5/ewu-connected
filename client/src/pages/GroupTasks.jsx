import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { 
  Plus, MessageSquare, Users, Trash2, X, Send, 
  UserPlus, UserMinus, Settings, CheckCircle2, Circle, Clock, LogOut 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GroupTasks = () => {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  
  // Workspace Data
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Modals & UI States
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); 
  
  // Forms
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [chatInput, setChatInput] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
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
    try {
      const res = await axios.get(`${API_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveGroup(res.data.group);
      setTasks(res.data.tasks);
      setMessages(res.data.messages);
      setShouldAutoScroll(true); 
    } catch (err) { alert("Failed to load workspace"); }
  };

  const handleChatScroll = () => {
      if (!chatContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll, isChatOpen]);

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
    } catch (err) { alert("Failed to create group"); }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Delete this entire group and all tasks/messages forever?")) return;
    try {
      await axios.delete(`${API_URL}/api/groups/${activeGroup._id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveGroup(null);
      fetchGroups();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    const myId = user._id || user.id;
    const groupId = activeGroup._id || activeGroup.id;
    
    try {
      await axios.delete(`${API_URL}/api/groups/${groupId}/members/${myId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActiveGroup(null);
      fetchGroups();
      alert("You have left the group.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave group");
    }
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
    } catch (err) { alert(err.response?.data?.message || "Failed to add member"); }
  };

  const handleKickMember = async (memberId) => {
    if (!window.confirm("Kick this member?")) return;
    
    const groupId = activeGroup._id || activeGroup.id;

    try {
      await axios.delete(`${API_URL}/api/groups/${groupId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Refresh workspace data
      loadGroupWorkspace(groupId);
      alert("Member removed.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to kick member");
    }
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
    } catch (err) { alert(err.response?.data?.message || "Failed to add task"); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`${API_URL}/api/groups/${activeGroup._id}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTasks(tasks.filter(t => t._id !== taskId));
    } catch (err) { 
      alert(err.response?.data?.message || "Failed to delete task"); 
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const taskToMove = tasks.find(t => t._id === taskId);
    if (!taskToMove || taskToMove.status === newStatus) return;

    const isAssignedToSomeoneElse = taskToMove.assignedTo && taskToMove.assignedTo._id !== user._id;
    const isNotAdmin = activeGroup.admin._id !== user._id;

    if (isAssignedToSomeoneElse && isNotAdmin) {
      alert(`Only ${taskToMove.assignedTo.name} can move this task.`);
      return;
    }
    
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      await axios.put(`${API_URL}/api/groups/${activeGroup._id}/tasks/${taskId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task");
      setTasks(previousTasks); 
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTaskStatus(taskId, newStatus);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // --- 5. CHAT ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/api/groups/${activeGroup._id}/messages`, { content: chatInput }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages([...messages, res.data]);
      setChatInput('');
      setShouldAutoScroll(true); 
    } catch (err) { alert(err.response?.data?.message || "Failed to send"); }
  };


  // ================= VIEW: GROUP SELECTION =================
  if (!activeGroup) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="text-left">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Groups</h1>
              <p className="text-gray-500 mt-1 font-medium">Collaborate on projects and share tasks.</p>
            </div>
            <button onClick={() => setShowCreateGroup(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-xl shadow-blue-100">
              <Plus className="w-5 h-5" /> Create Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length > 0 ? groups.map(group => (
              <div 
                key={group._id} 
                onClick={() => loadGroupWorkspace(group._id)}
                className="bg-white border-2 border-transparent hover:border-blue-500 rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group/card text-left"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover/card:bg-blue-600 group-hover/card:text-white transition-colors">
                  <Users className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1 truncate">{group.name}</h2>
                <p className="text-sm text-gray-500 line-clamp-2 h-10">{group.description || "No description provided."}</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-400">
                  <span>{group.members.length} Members</span>
                  <span className="text-blue-600">Open Workspace &rarr;</span>
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm mt-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900">No groups yet</h3>
                <p className="text-gray-500 mt-1">Create or join a group to start collaborating.</p>
              </div>
            )}
          </div>
        </div>

        {showCreateGroup && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 text-left">
              <button onClick={() => setShowCreateGroup(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
              <h2 className="text-2xl font-black text-gray-900 mb-6">Start a New Group</h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Group Name</label>
                  <input value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} required className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Capstone Project Team" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Description</label>
                  <textarea value={newGroup.description} onChange={e => setNewGroup({...newGroup, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" rows="3" placeholder="What is this group for?" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black mt-4 hover:bg-blue-700 transition">Create Group</button>
              </form>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  const isAdmin = activeGroup.admin._id === user._id;
  const kanbanColumns = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'text-gray-500', bg: 'bg-gray-100' },
    { id: 'doing', title: 'Doing', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100' },
    { id: 'done', title: 'Done', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
  ];

  // ================= VIEW: ACTIVE WORKSPACE =================
  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-gray-50/50 relative">
        
        {/* --- LEFT: KANBAN BOARD --- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveGroup(null)} className="text-gray-400 hover:text-gray-900 transition"><X className="w-5 h-5"/></button>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">{activeGroup.name}</h1>
              </div>
              {/* 🚨 CHANGE 1: ADDED ADMIN NAME NEXT TO MEMBERS */}
              <p className="text-xs sm:text-sm text-gray-500 ml-8 truncate">
                {activeGroup.members.length} Members • Admin: {activeGroup.admin.name}
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-2">
              <button onClick={() => setShowSettings(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition" title="Group Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={() => setShowAddTask(true)} className="bg-blue-600 text-white p-2 sm:px-5 sm:py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-100">
                <Plus className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add Task</span>
              </button>
              <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded-xl transition relative ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`} title="Toggle Chat">
                <MessageSquare className="w-5 h-5" />
                {!isChatOpen && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></div>}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto p-4 sm:p-6">
            <div className="flex gap-4 sm:gap-6 h-full min-w-max items-start">
              {kanbanColumns.map(col => (
                <div 
                  key={col.id} 
                  className="w-72 sm:w-80 bg-gray-100/50 rounded-[2rem] flex flex-col h-full max-h-full border border-gray-200/60"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="p-4 sm:p-5 flex justify-between items-center border-b border-gray-200/50">
                    <div className="flex items-center gap-2">
                      <col.icon className={`w-5 h-5 ${col.color}`} />
                      <h3 className="font-bold text-gray-900">{col.title}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${col.bg} ${col.color}`}>
                      {tasks.filter(t => t.status === col.id).length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
                    {tasks.filter(t => t.status === col.id).map(task => {
                      const canDrag = !task.assignedTo || task.assignedTo._id === user._id || isAdmin;

                      return (
                        <div 
                          key={task._id} 
                          draggable={canDrag}
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          className={`bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 transition-all group relative text-left
                            ${canDrag ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300' : 'opacity-75'}
                          `}
                        >
                          {(isAdmin || (task.assignedBy && task.assignedBy._id === user._id)) && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id); }}
                              className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete Task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900 leading-tight pr-6">{task.title}</h4>
                          </div>
                          
                          {/* 🚨 CHANGE 2: ADDED TASK DESCRIPTION BACK IN */}
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                          )}

                          <div className="flex justify-between items-end pt-3 border-t border-gray-50 mt-2">
                            <div className="flex flex-col gap-1.5">
                              {task.assignedTo ? (
                                <div className="flex items-center gap-2">
                                  <img src={task.assignedTo.profilePicture || `https://ui-avatars.com/api/?name=${task.assignedTo.name}`} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full" alt="" />
                                  <span className="text-[10px] font-bold text-gray-600 truncate max-w-[60px] sm:max-w-[80px]">{task.assignedTo.name.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 italic bg-gray-100 px-2 py-1 rounded w-fit">Unassigned</span>
                              )}
                            </div>

                            <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                                disabled={!canDrag}
                                className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border outline-none appearance-none cursor-pointer
                                  ${task.status === 'todo' ? 'bg-gray-100 text-gray-600 border-gray-200' : ''}
                                  ${task.status === 'doing' ? 'bg-blue-100 text-blue-600 border-blue-200' : ''}
                                  ${task.status === 'done' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : ''}
                                  ${!canDrag ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <option value="todo">To Do</option>
                                <option value="doing">Doing</option>
                                <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- CHAT SIDEBAR --- */}
        <div className={`
          fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out bg-white
          md:relative md:inset-auto md:translate-x-0 md:w-80 lg:w-96 md:border-l md:shadow-2xl
          flex flex-col h-full shrink-0
          ${isChatOpen ? 'translate-x-0' : 'translate-x-full md:hidden'}
        `}>
          
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 text-left">
            <div>
              <h3 className="font-bold text-gray-900">Team Chat</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-gray-500 font-medium">Group Active</span>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition">
              <X className="w-6 h-6 md:w-5 md:h-5"/>
            </button>
          </div>

          <div 
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 custom-scrollbar"
          >
            {messages.map((msg, index) => {
              const isMe = msg.sender._id === user._id;
              const showHeader = index === 0 || messages[index - 1].sender._id !== msg.sender._id;

              return (
                <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showHeader && (
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? 'pr-1' : 'pl-1'}`}>
                      {!isMe && <span className="text-xs font-bold text-gray-700">{msg.sender.name.split(' ')[0]}</span>}
                      <span className="text-[9px] text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isMe && <span className="text-xs font-bold text-gray-700">You</span>}
                    </div>
                  )}

                  <div className="flex gap-2 max-w-[85%] text-left">
                    {!isMe && showHeader && (
                      <img src={msg.sender.profilePicture || `https://ui-avatars.com/api/?name=${msg.sender.name}`} className="w-7 h-7 rounded-full mt-1 shrink-0 shadow-sm" alt="" />
                    )}
                    {!isMe && !showHeader && <div className="w-7 shrink-0"></div>}

                    <div className={`px-4 py-2.5 text-sm ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100 shrink-0 pb-safe">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 pl-5 pr-12 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim()}
                className="absolute right-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* --- MODALS --- */}
      {showAddTask && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 text-left">
            <button onClick={() => setShowAddTask(false)} className="absolute top-6 right-6 text-gray-400 hover:bg-gray-100 p-2 rounded-full"><X className="w-5 h-5"/></button>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Add New Task</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Task Title</label>
                <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 border border-transparent" placeholder="e.g. Design DB" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 border border-transparent" rows="3" placeholder="Additional details..." />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase ml-1 mb-2">Assign To (Optional)</label>
                <select value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none appearance-none">
                  <option value="">Anyone</option>
                  {activeGroup.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black mt-4 shadow-xl flex justify-center items-center gap-2">
                 <Plus className="w-5 h-5"/> Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar text-left">
            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-gray-400 hover:bg-gray-100 p-2 rounded-full"><X className="w-5 h-5"/></button>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Workspace Settings</h2>
            <p className="text-sm text-gray-500 mb-8">Manage members and workspace data.</p>

            {isAdmin ? (
              <form onSubmit={handleAddMember} className="mb-8 p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3">Add Member</h3>
                <div className="flex gap-2">
                  <input value={newMemberId} onChange={e => setNewMemberId(e.target.value)} required placeholder="Student ID..." className="flex-1 p-3 bg-white rounded-xl outline-none border border-gray-200 text-sm font-bold" />
                  <button type="submit" className="bg-blue-600 text-white px-4 rounded-xl font-bold flex items-center"><UserPlus className="w-4 h-4"/></button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center text-sm font-bold text-gray-500">Only admin can manage members.</div>
            )}

            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Current Members ({activeGroup.members.length})</h3>
            <div className="space-y-3 mb-8">
              {activeGroup.members.map(member => (
                <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <img src={member.profilePicture || `https://ui-avatars.com/api/?name=${member.name}`} className="w-10 h-10 rounded-full bg-white shadow-sm" alt="" />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.student_id} {member._id === activeGroup.admin._id && <span className="ml-1 text-blue-600 font-bold bg-blue-100 px-1.5 rounded">Admin</span>}</p>
                    </div>
                  </div>
                  {isAdmin && member._id !== user._id && (
                    <button onClick={() => handleKickMember(member._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isAdmin ? (
              <div className="pt-6 border-t border-red-100">
                <button onClick={handleDeleteGroup} className="w-full py-4 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl font-black transition-colors flex items-center justify-center gap-2">
                  <Trash2 className="w-5 h-5"/> Delete Workspace
                </button>
              </div>
            ) : (
              <div className="pt-6 border-t border-red-100">
                <button onClick={handleLeaveGroup} className="w-full py-4 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl font-black transition-colors flex items-center justify-center gap-2">
                  <LogOut className="w-5 h-5"/> Leave Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  ); 
};

export default GroupTasks;