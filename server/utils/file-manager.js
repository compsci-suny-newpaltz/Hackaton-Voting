const fs = require('fs').promises;
const path = require('path');
const db = require('../db');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

/**
 * Upload project file - deletes old file and saves new one
 * @param {number} projectId - Project ID
 * @param {object} file - Multer file object with path, originalname, size
 * @param {string} uploadedBy - Email of user uploading
 * @param {string} changelog - Changelog notes
 */
async function uploadProjectFile(projectId, file, uploadedBy, changelog) {
  await ensureUploadDir();
  
  try {
    const project = db.getProject(projectId);
    
    // Delete old file if it exists
    if (project && project.current_file_url) {
      const oldFilePath = path.join(UPLOAD_DIR, path.basename(project.current_file_url));
      try {
        await fs.unlink(oldFilePath);
      } catch (err) {
        // File might not exist, ignore error
        console.warn('Failed to delete old file:', err.message);
      }
    }
    
    // Generate new filename
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newFileName = `project-${projectId}-${timestamp}-${sanitizedOriginalName}`;
    const newFilePath = path.join(UPLOAD_DIR, newFileName);
    
    // Move file from temp location to final location (multer saves to temp first)
    await fs.rename(file.path, newFilePath);
    
    // Get file size
    const stats = await fs.stat(newFilePath);
    const fileSize = stats.size;
    
    // Update project
    const fileUrl = `/hackathons/uploads/${newFileName}`;
    db.updateProject(projectId, {
      current_file_url: fileUrl,
      current_file_name: file.originalname,
      current_file_size: fileSize,
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString()
    });
    
    // Get current version number
    const history = db.getFileHistory(projectId);
    const nextVersion = history.length > 0 ? history[0].version + 1 : 1;
    
    // Log metadata in history table (no actual file stored)
    db.addFileHistory({
      project_id: projectId,
      version: nextVersion,
      filename: file.originalname,
      file_size: fileSize,
      changelog: changelog || '',
      uploaded_by: uploadedBy
    });
    
    return {
      url: fileUrl,
      filename: file.originalname,
      size: fileSize
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Delete a file by URL
 */
async function deleteFile(fileUrl) {
  try {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.unlink(filePath);
  } catch (error) {
    console.warn('Failed to delete file:', error.message);
  }
}

module.exports = {
  uploadProjectFile,
  deleteFile,
  ensureUploadDir
};

