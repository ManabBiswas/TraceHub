import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with credentials from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The original file name
 * @param {string} folder - Cloudinary folder path (e.g., 'tracehub/submissions')
 * @returns {Promise<{url: string, publicId: string}>} Cloudinary URL and public ID
 */
export const uploadFileToCloudinary = async (fileBuffer, fileName, folder = "tracehub") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: folder,
        public_id: `${Date.now()}_${fileName.replace(/\.[^/.]+$/, "")}`,
        use_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            fileName: fileName,
            size: result.bytes,
            mimeType: result.resource_type === "raw" ? "application/octet-stream" : result.type,
          });
        }
      },
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The Cloudinary public ID
 * @returns {Promise<void>}
 */
export const deleteFileFromCloudinary = async (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Check if Cloudinary is configured
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};
