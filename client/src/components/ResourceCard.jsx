import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Star, Download, Bookmark, Eye, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResourceCard = ({ resource, isAdmin, token, onSaveToggle, isSavedInitially = false }) => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // 🚨 THE FIX: Safely checks the database array to see if YOU already rated this
  const initialUserRating = resource.ratings?.find(
    (r) => r.user === userInfo._id || r.user?._id === userInfo._id
  )?.value || 0;

  const [isHovering, setIsHovering] = useState(0);
  
  // Initializes the stars with your saved rating from the database
  const [userRating, setUserRating] = useState(initialUserRating);
  
  const [avgRating, setAvgRating] = useState(Number(resource.averageRating || 0));
  const [isDownloading, setIsDownloading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  const currentlySaved = isSavedInitially || (userInfo.savedResources?.includes(resource._id));
  const [isSaved, setIsSaved] = useState(currentlySaved);

  const uploaderName = resource.uploader?.name || 'Anonymous';
  const uploaderInitial = uploaderName.charAt(0).toUpperCase();
  const title = resource.title || "Untitled Note";
  const description = resource.description || "No description provided.";
  const date = new Date(resource.createdAt).toLocaleDateString();
  const fileUrl = resource.file?.url || resource.fileUrl || '';

  const canDelete = isAdmin || (userInfo._id && resource.uploader?._id === userInfo._id);

  const handleRate = async (star) => {
    if (!token) return toast.error("Please login to rate materials.");
    
    // Instant UI update for the bottom stars
    setUserRating(star);
    
    try {
      const res = await axios.post(`${API_URL}/api/resources/${resource._id}/rate`, { value: star }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Instant UI update for the TOP BADGE 
      setAvgRating(Number(res.data.averageRating || 0));

    } catch (error) {
      console.error("Failed to submit rating.");
      setUserRating(initialUserRating); // Revert back if it fails
    }
  };

  const handleSave = async () => {
    if (!token) return toast.error("Please login to save notes.");

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    try {
      await axios.post(`${API_URL}/api/resources/${resource._id}/save`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let updatedUserInfo = { ...userInfo };
      if (!updatedUserInfo.savedResources) updatedUserInfo.savedResources = [];
      
      if (newSavedState) {
        updatedUserInfo.savedResources.push(resource._id);
      } else {
        updatedUserInfo.savedResources = updatedUserInfo.savedResources.filter(id => id !== resource._id);
      }
      
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

      if (onSaveToggle) onSaveToggle(resource, newSavedState);
    } catch (error) {
      setIsSaved(!newSavedState);
      console.error("Failed to save note.");
    }
  };

  // 🚨 THE FIX: Forces an actual download instead of just viewing the file
  const handleDownload = async () => {
    if (!fileUrl) return toast.error("File link is broken or missing.");
    setIsDownloading(true);
    try {
      // 1. Tell backend we downloaded it (for your points/stats)
      await axios.post(`${API_URL}/api/resources/${resource._id}/download`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Fetch the raw file data to bypass the browser's PDF/Image viewer
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 3. Create an invisible link, force download, and click it
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = title || 'EWU_Resource_Download'; 
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error("Forced download failed (usually CORS), falling back to new tab.", error);
      // Fallback: If their browser blocks the fetch due to strict settings, just open it
      window.open(fileUrl, '_blank'); 
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = () => {
    if (!fileUrl) return toast.error("File link is broken or missing.");
    window.open(fileUrl, '_blank');
  };

  const handleDeleteMaterial = async () => {
    setConfirmDialog({
      title: "Delete Material?",
      description: "Are you sure you want to delete this material?",
      confirmText: "Delete",
      icon: <Trash2 className="w-8 h-8" />,
      action: async () => {
        try {
          await axios.delete(`${API_URL}/api/resources/${resource._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          window.location.reload();
          setConfirmDialog(null);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete material");
        }
      }
    });
  };

  return (
    <>
    <div className="border border-gray-200 dark:border-zinc-800 rounded-[2rem] p-6 bg-white dark:bg-[#121212] hover:shadow-lg transition-all flex flex-col h-full relative group text-left">
      
      {canDelete && (
        <button 
          onClick={handleDeleteMaterial}
          className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all z-10"
          title="Delete Material"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      <div className="mb-2 pr-8">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white line-clamp-1 tracking-tight">{title}</h3>
      </div>

      <p className="text-gray-500 dark:text-zinc-400 text-base mb-4 line-clamp-2 flex-grow leading-relaxed">{description}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100 dark:border-blue-900/50">
          {resource.category || "Lecture Notes"}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-6">
        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex items-center justify-center text-gray-700 dark:text-zinc-300 font-bold shadow-sm overflow-hidden text-base">
          {resource.uploader?.profilePicture ? (
             <img src={resource.uploader.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
             uploaderInitial
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-base text-gray-700 dark:text-zinc-200 leading-none">{uploaderName}</p>
            
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-100 dark:border-yellow-500/20 flex-shrink-0">
              <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-500">
                 {Number(avgRating).toFixed(1)}
              </span>
            </div>
          </div>
          <p className="font-medium opacity-80">{date}</p>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl p-3 flex justify-between items-center">
           <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider ml-1">
             {userRating > 0 ? "Rated" : "Rate This"}
           </span>
           <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                className={`w-5 h-5 cursor-pointer transition-all hover:scale-110 ${
                  star <= (isHovering || userRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-zinc-600'
                }`}
                onMouseEnter={() => setIsHovering(star)}
                onMouseLeave={() => setIsHovering(0)}
                onClick={() => handleRate(star)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-100 dark:shadow-blue-900/50 disabled:opacity-70"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download
          </button>

          <button 
            onClick={handleSave}
            className={`px-4 py-3 border-2 rounded-2xl transition-all ${
              isSaved ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-inner' : 'border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-500 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-500 dark:hover:text-blue-400'
            }`}
            title="Bookmark this note"
          >
            <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
          </button>

          <button 
            onClick={handleView}
            className="px-4 py-3 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-gray-400 dark:text-zinc-500 hover:border-gray-200 dark:hover:border-zinc-700 hover:text-gray-700 dark:hover:text-zinc-300 transition-all"
            title="Quick View"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
      {/* Confirm Modal */}
      {createPortal(
        <AnimatePresence>
          {confirmDialog && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDialog(null)} className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" />
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
    </>
  );
};

export default ResourceCard;