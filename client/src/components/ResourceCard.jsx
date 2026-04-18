import { useState, useEffect } from 'react';
import { Star, Download, Bookmark, Eye, Loader2, Trash2 } from 'lucide-react';
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
    if (!token) return alert("Please login to rate materials.");
    
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
    if (!token) return alert("Please login to save notes.");

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
    if (!fileUrl) return alert("File link is broken or missing.");
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
    if (!fileUrl) return alert("File link is broken or missing.");
    window.open(fileUrl, '_blank');
  };

  const handleDeleteMaterial = async () => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    try {
      await axios.delete(`${API_URL}/api/resources/${resource._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload(); 
    } catch (error) {
      alert("Failed to delete material.");
    }
  };

  return (
    <div className="border border-gray-200 rounded-[2rem] p-6 bg-white hover:shadow-lg transition-all flex flex-col h-full relative group text-left">
      
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
        <h3 className="text-xl font-black text-gray-900 line-clamp-1 tracking-tight">{title}</h3>
      </div>

      <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">{description}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100">
          {resource.category || "Lecture Notes"}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-6">
        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold shadow-sm overflow-hidden">
          {resource.uploader?.profilePicture ? (
             <img src={resource.uploader.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
             uploaderInitial
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-gray-700 leading-none">{uploaderName}</p>
            
            <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100 flex-shrink-0">
              <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] font-black text-yellow-700">
                 {Number(avgRating).toFixed(1)}
              </span>
            </div>
          </div>
          <p className="font-medium opacity-80">{date}</p>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3 flex justify-between items-center">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">
             {userRating > 0 ? "Rated" : "Rate This"}
           </span>
           <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star}
                className={`w-5 h-5 cursor-pointer transition-all hover:scale-110 ${
                  star <= (isHovering || userRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-100 disabled:opacity-70"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download
          </button>

          <button 
            onClick={handleSave}
            className={`px-4 py-3 border-2 rounded-2xl transition-all ${
              isSaved ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' : 'border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'
            }`}
            title="Bookmark this note"
          >
            <Bookmark className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} />
          </button>

          <button 
            onClick={handleView}
            className="px-4 py-3 border-2 border-gray-100 rounded-2xl text-gray-400 hover:border-gray-200 hover:text-gray-700 transition-all"
            title="Quick View"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResourceCard; 