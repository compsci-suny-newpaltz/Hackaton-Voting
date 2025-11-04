const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { requireNP, requireAdmin } = require('../middleware');
const { canEditProject } = require('../utils/hackathon-status');
const { uploadProjectFile } = require('../utils/file-manager');
const { logAudit } = require('../utils/audit-logger');

// Ensure temp directory exists
const fs = require('fs');
const path = require('path');
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  dest: tempDir,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') }
});

// Get project by ID (public)
router.get('/:hackathonId/projects/:projectId', (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (project.hackathon_id !== parseInt(req.params.hackathonId)) {
    return res.status(404).json({ error: 'Project not found in this hackathon' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  const comments = db.getCommentsByProject(req.params.projectId);
  const fileHistory = db.getFileHistory(req.params.projectId);
  
  res.json({
    ...project,
    hackathon,
    comments,
    fileHistory
  });
});

// Create project (admin only - initialization)
router.post('/:hackathonId/projects', requireNP, requireAdmin, (req, res) => {
  const { name, team_emails } = req.body;
  
  if (!name || !team_emails || !Array.isArray(team_emails)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  const result = db.createProject({
    hackathon_id: req.params.hackathonId,
    name,
    team_emails,
    created_by: req.user.email
  });
  
  logAudit(req.user.email, 'project_initialized', `project_${result.lastInsertRowid}`, {
    hackathon_id: req.params.hackathonId,
    name,
    team_emails
  });
  
  res.json({ id: result.lastInsertRowid, ...req.body });
});

// Update project (team members only)
router.put('/:hackathonId/projects/:projectId', requireNP, async (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  // Check edit permissions
  if (!canEditProject(project, hackathon, req.user.email)) {
    return res.status(403).json({ error: 'You do not have permission to edit this project' });
  }
  
  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.github_link !== undefined) updateData.github_link = req.body.github_link;
  if (req.body.banner_url !== undefined) updateData.banner_url = req.body.banner_url;
  if (req.body.image_url !== undefined) updateData.image_url = req.body.image_url;
  
  db.updateProject(req.params.projectId, updateData);
  
  res.json({ success: true });
});

// Upload project file (team members only)
router.post('/:hackathonId/projects/:projectId/file', requireNP, upload.single('file'), async (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  // Check edit permissions
  if (!canEditProject(project, hackathon, req.user.email)) {
    return res.status(403).json({ error: 'You do not have permission to edit this project' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const { changelog } = req.body;
    const result = await uploadProjectFile(
      req.params.projectId,
      req.file,
      req.user.email,
      changelog
    );
    
    res.json({ success: true, file: result });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Toggle deadline override (admin only)
router.post('/:hackathonId/projects/:projectId/deadline-override', requireNP, requireAdmin, (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const newValue = !project.deadline_override_enabled;
  
  db.updateProject(req.params.projectId, {
    deadline_override_enabled: newValue,
    deadline_override_by: req.user.email,
    deadline_override_at: new Date().toISOString()
  });
  
  logAudit(req.user.email, 'deadline_override_toggled', `project_${req.params.projectId}`, {
    enabled: newValue
  });
  
  res.json({ success: true, deadline_override_enabled: newValue });
});

module.exports = router;

