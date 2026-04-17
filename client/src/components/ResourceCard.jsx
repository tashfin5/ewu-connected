import React, { useState } from 'react';
import axios from 'axios';
import { Download, Bookmark, Eye, Trash2, Star, Loader2 } from 'lucide-react';

const ResourceCard = ({ resource, isAdmin, token, onSaveToggle }) => {
  // 1. Storage and Context setup
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const savedList = userInfo.savedResources || [];
  const currentUserId = userInfo._id;

  // Find out if the current user already rated this note
  const existingRating = (resource.ratings || []).find(
    r => (r.user === currentUserId || r.user?._id === currentUserId)
  );
  
  // 2. State setup
  const [isSaved, setIsSaved] = useState(savedList.includes(resource._id));
  const [currentRating, setCurrentRating] = useState(resource.rating || 0); 
  const [userRating, setUserRating] = useState(existingRating ? existingRating.value : 0); 
  const [isHovering, setIsHovering] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // SECURITY: Check if the current user owns this note
  const uploaderId = resource?.uploadedBy?._id || resource?.uploadedBy;
  const isOwner = currentUserId && uploaderId && currentUserId === uploaderId;
  const canDelete = isAdmin || isOwner;

  // 3. Helper Functions
  const getDownloadUrl = (url) => {
    if (!url) return '#';
    // Forces Cloudinary to download the file instead of just opening it in a tab
    return url.replace('/upload/', '/upload/fl_attachment/');
  };

  const handleView = () => {
    window.open(resource.fileUrl, '_blank');
  };

  // 4. Action Handlers
  
  // 🚨 Handle Download Tracking & File Trigger
  const handleDownload = async (e) => {
    e.preventDefault();
    setIsDownloading(true);
    
    try {
      // 1. Ping the backend to increment downloads & trigger notification milestones
      await axios.post(`http://localhost:5000/api/resources/${resource._id}/download`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Failed to track download milestone.");
    } finally {
      setIsDownloading(false);
    }

    // 2. Trigger the actual browser download manually
    const link = document.createElement('a');
    link.href = getDownloadUrl(resource.fileUrl);
    // Setting a clean filename for the user
    link.setAttribute('download', `${resource.title.replace(/\s+/g, '_')}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteMaterial = async () => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await axios.delete(`http://localhost:5000/api/resources/${resource._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        window.location.reload(); 
      } catch (error) {
        alert("Failed to delete material.");
      }
    }
  };

  const handleSave = async () => {
    try {
      // This route handles both adding and removing bookmarks in the backend
      await axios.post(`http://localhost:5000/api/users/save-resource/${resource._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newSavedState = !isSaved;
      setIsSaved(newSavedState);

      // Sync the local storage so the heart/bookmark stays filled across page changes
      let updatedSavedResources = [...savedList];
      if (newSavedState) {
        updatedSavedResources.push(resource._id);
      } else {
        updatedSavedResources = updatedSavedResources.filter(id => id !== resource._id);
      }
      
      userInfo.savedResources = updatedSavedResources;
      localStorage.setItem('userInfo', JSON.stringify(userInfo));

      // Trigger UI updates in parent components (like Profile tab)
      if (onSaveToggle) {
         onSaveToggle(resource, newSavedState);
      }
    } catch (error) {
      alert("Failed to save resource.");
    }
  };

  const handleRate = async (value) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/resources/${resource._id}/rate`, { value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentRating(res.data.rating); // Updates the global average badge in the corner
      setUserRating(value); // Instantly colors the stars you just clicked
    } catch (error) {
      alert("Failed to submit rating.");
    }
  };

  // 5. Data Formatting
  const title = resource.title || "Untitled Document";
  const description = resource.description || "No description provided.";
  const uploaderName = resource?.uploadedBy?.name || "Anonymous";
  const uploaderInitial = uploaderName.charAt(0).toUpperCase();
  const date = new Date(resource.createdAt).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className="border border-gray-200 rounded-[2rem] p-6 bg-white hover:shadow-lg transition-all flex flex-col h-full relative group text-left">
      
      {/* ADMIN OR OWNER ONLY: Delete Material Button */}
      {canDelete && (
        <button 
          onClick={handleDeleteMaterial}
          className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete Material"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* Header: Title & Average Rating Badge */}
      <div className="flex justify-between items-start mb-2 pr-8">
        <h3 className="text-xl font-black text-gray-900 line-clamp-1 tracking-tight">{title}</h3>
        
        {/* Rating Badge */}
        <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100 shadow-sm flex-shrink-0">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-bold text-yellow-700">
             {Number(currentRating).toFixed(1)}
          </span>
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">{description}</p>

      {/* Category Tag */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100">
          {resource.category || "Note"}
        </span>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-3 text-xs text-gray-400 mb-6">
        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold shadow-sm">
          {uploaderInitial}
        </div>
        <div>
          <p className="font-bold text-gray-700 leading-none mb-0.5">{uploaderName}</p>
          <p className="font-medium opacity-80">{date}</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto space-y-4">
        
        {/* Interactive Star Rating Input */}
        <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3 flex justify-between items-center">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">
             {userRating > 0 ? "Your Rating" : "Rate This"}
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

        {/* Primary Buttons */}
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