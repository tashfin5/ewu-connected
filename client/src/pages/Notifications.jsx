import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { Bell, CheckCircle2, MessageSquare, Users, Info, Loader2, Clock, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.token) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('${API_URL}/api/notifications', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put('${API_URL}/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) { console.error("Failed to mark as read"); }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await axios.put(`${API_URL}/api/notifications/${notification._id}/read`, {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setNotifications(notifications.map(n => 
          n._id === notification._id ? { ...n, isRead: true } : n
        ));
      } catch (err) { console.error("Failed to mark read"); }
    }
    if (notification.link) navigate(notification.link);
  };

  // 🚨 UI FIX: Handle the 'reminder' type with a custom Red icon
  const getIcon = (type) => {
    switch(type) {
      case 'reply': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'group': return <Users className="w-5 h-5 text-emerald-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-red-500" />; // 🚨 Deadline Icon
      case 'system': return <Info className="w-5 h-5 text-indigo-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Notifications</h1>
            </div>
            <p className="text-gray-500 font-medium ml-14">
              You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}.
            </p>
          </div>

          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllRead}
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
        ) : notifications.length > 0 ? (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {notifications.map(notif => (
                <div 
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-6 flex gap-4 cursor-pointer transition-colors hover:bg-gray-50 ${!notif.isRead ? 'bg-blue-50/30' : 'bg-white'}`}
                >
                  {/* Sender Avatar or System Icon */}
                  <div className="shrink-0 relative">
                    {notif.sender ? (
                      <img src={notif.sender.profilePicture || `https://ui-avatars.com/api/?name=${notif.sender.name}`} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="" />
                    ) : (
                      // 🚨 Added a red background for reminders to make them pop!
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${notif.type === 'reminder' ? 'bg-red-50 border border-red-100' : 'bg-gray-100'}`}>
                        {getIcon(notif.type)}
                      </div>
                    )}
                    {/* Unread dot indicator */}
                    {!notif.isRead && <div className="absolute top-0 -right-1 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full"></div>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-base truncate pr-4 ${!notif.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                        {notif.title}
                        {notif.type === 'reminder' && !notif.isRead && <AlertTriangle className="inline w-4 h-4 ml-2 text-red-500 mb-1" />}
                      </h4>
                      <span className="text-xs text-gray-400 font-medium shrink-0 mt-1">
                        {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-sm line-clamp-2 ${!notif.isRead ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">All caught up!</h3>
            <p className="text-gray-500 mt-1">You have no new notifications right now.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;