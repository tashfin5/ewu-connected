import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'ewu_connected_notes',
      resource_type: 'auto',
      public_id: file.originalname.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_'),
    };
  },
});
export const upload = multer({ storage: storage });

export const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl || !fileUrl.includes('cloudinary.com')) return;
  
  try {
    const urlParts = fileUrl.split('?')[0].split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return;
    
    const resourceType = urlParts[uploadIndex - 1] || 'image';
    
    let publicIdPath = urlParts.slice(uploadIndex + 1);
    if (publicIdPath[0].startsWith('v') && !isNaN(publicIdPath[0].substring(1))) {
      publicIdPath = publicIdPath.slice(1);
    }
    
    let publicIdWithExt = publicIdPath.join('/');
    publicIdWithExt = decodeURIComponent(publicIdWithExt);
    
    let publicId = publicIdWithExt;
    if (resourceType !== 'raw') {
      const lastDot = publicIdWithExt.lastIndexOf('.');
      if (lastDot !== -1) {
        publicId = publicIdWithExt.substring(0, lastDot);
      }
    }

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
  }
};