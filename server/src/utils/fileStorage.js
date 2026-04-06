import { uploadFileToCloudinary, isCloudinaryConfigured } from "../services/cloudinary.service.js";

/**
 * Process files for storage - uses Cloudinary in DEMO_MODE, otherwise stores in DB
 * @param {Array} files - Array of multer file objects
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Array>} Array of processed file objects
 */
export const processFilesForStorage = async (files, folder = "tracehub/submissions") => {
  if (!files || files.length === 0) {
    return [];
  }

  const isDemoMode = process.env.DEMO_MODE === "true";
  const cloudinaryAvailable = isCloudinaryConfigured();

  // In DEMO mode with Cloudinary configured, upload to Cloudinary
  if (isDemoMode && cloudinaryAvailable) {
    return await Promise.all(
      files.map(async (file) => {
        try {
          const cloudinaryResult = await uploadFileToCloudinary(file.buffer, file.originalname, folder);
          return {
            fileName: cloudinaryResult.fileName,
            mimeType: cloudinaryResult.mimeType,
            size: cloudinaryResult.size,
            url: cloudinaryResult.url,
            cloudinaryPublicId: cloudinaryResult.publicId,
            hasBinaryData: false, // No binary data stored locally
          };
        } catch (error) {
          console.error(`Failed to upload ${file.originalname} to Cloudinary:`, error.message);
          // Fallback to storing in DB if Cloudinary upload fails
          return {
            fileName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            data: file.buffer, // Fallback to DB storage
            hasBinaryData: true,
          };
        }
      }),
    );
  }

  // Otherwise, store files in database (original behavior)
  return files.map((file) => ({
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    data: file.buffer,
    hasBinaryData: true,
  }));
};

/**
 * Get file retrieval method - returns URL if Cloudinary, or signal to fetch from DB
 * @param {Object} fileMetadata - File metadata object
 * @returns {Object} Object with retrieval info
 */
export const getFileRetrievalInfo = (fileMetadata) => {
  if (fileMetadata.url && fileMetadata.cloudinaryPublicId) {
    return {
      source: "cloudinary",
      url: fileMetadata.url,
      publicId: fileMetadata.cloudinaryPublicId,
    };
  }

  return {
    source: "database",
    hasData: fileMetadata.hasBinaryData || !!fileMetadata.data,
  };
};
