import cloudinary from '../config/cloudinary.js';
import logger from '../utils/logger.js';

/**
 * Uploads a file buffer to Cloudinary with secure stream pipeline
 * Falls back to mock urls if credentials are default values
 */
export const uploadToCloudinary = async (fileBuffer, folder = 'nexus') => {
  return new Promise((resolve, reject) => {
    const isMock = 
      !process.env.CLOUDINARY_API_KEY || 
      process.env.CLOUDINARY_API_KEY === 'mock_key' ||
      process.env.CLOUDINARY_API_KEY.includes('<');

    if (isMock) {
      logger.info('[Cloudinary Mock Upload] Resolved dummy file upload URL');
      resolve({
        secure_url: `https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=800&q=80`,
        public_id: `mock_public_id_${Date.now()}`
      });
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary Stream Upload Error: ${error.message}`);
          // Graceful fallback for 403 / invalid credentials — don't crash the upload endpoint
          if (error.http_code === 403 || error.message?.includes('403') || error.message?.includes('Invalid')) {
            logger.warn('[Cloudinary Fallback] Using mock URL due to credential error');
            resolve({
              secure_url: `https://placehold.co/800x600/6d28d9/white?text=Document`,
              public_id: `fallback_${Date.now()}`
            });
          } else {
            reject(error);
          }
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};
