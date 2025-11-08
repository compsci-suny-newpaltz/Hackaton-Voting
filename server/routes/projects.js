const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { requireNP, requireAdmin, isAdmin } = require('../middleware');
const { canEditProject, calculateHackathonStatus } = require('../utils/hackathon-status');
const { uploadProjectFile } = require('../utils/file-manager');
const { logAudit } = require('../utils/audit-logger');
const { maskProjectEmails, maskCommentEmail } = require('../utils/email-masking');

// Configuration constants
const MAX_PROJECT_NAME_LENGTH = 200;
const MAX_PROJECT_DESCRIPTION_LENGTH = 10000;
const MAX_GITHUB_LINK_LENGTH = 500;

// Validation helper for team emails
function validateTeamEmails(emails) {
  const errors = [];
  const normalized = [];
  const seen = new Set();

  if (!Array.isArray(emails) || emails.length === 0) {
    return { valid: false, errors: ['team_emails must be a non-empty array'], normalized: [] };
  }

  for (const email of emails) {
    if (!email || typeof email !== 'string') {
      errors.push('All team emails must be non-empty strings');
      continue;
    }

    // Normalize email to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicates
    if (seen.has(normalizedEmail)) {
      errors.push(`Duplicate email: ${normalizedEmail}`);
      continue;
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      errors.push(`Invalid email format: ${email}`);
      continue;
    }

    // Validate domain (newpaltz.edu and subdomains)
    const domain = normalizedEmail.split('@')[1];
    if (!domain.endsWith('newpaltz.edu')) {
      errors.push(`Email must be from newpaltz.edu domain: ${email}`);
      continue;
    }

    seen.add(normalizedEmail);
    normalized.push(normalizedEmail);
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized
  };
}

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

  // Calculate dynamic hackathon status
  const hackathonStatus = calculateHackathonStatus(hackathon);

  // Apply email masking for privacy
  const userEmail = req.user?.email;
  const userIsAdmin = req.user && isAdmin(req.user);

  const maskedProject = maskProjectEmails(project, userEmail, userIsAdmin);

  // Mask comment author emails
  const teamEmails = JSON.parse(project.team_emails || '[]');
  const maskedComments = comments.map(comment =>
    maskCommentEmail(comment, userEmail, teamEmails, userIsAdmin)
  );

  res.json({
    ...maskedProject,
    hackathon: {
      ...hackathon,
      status: hackathonStatus.status
    },
    comments: maskedComments,
    fileHistory
  });
});

// Create project (admin only - initialization)
router.post('/:hackathonId/projects', requireNP, requireAdmin, (req, res) => {
  const { name, team_emails } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  // Validate length limits
  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return res.status(400).json({
      error: 'Project name too long',
      message: `Name must be ${MAX_PROJECT_NAME_LENGTH} characters or less (currently ${name.length})`
    });
  }

  // Validate and normalize team emails
  const emailValidation = validateTeamEmails(team_emails);
  if (!emailValidation.valid) {
    return res.status(400).json({
      error: 'Invalid team emails',
      details: emailValidation.errors
    });
  }

  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  const result = db.createProject({
    hackathon_id: req.params.hackathonId,
    name,
    team_emails: emailValidation.normalized,  // Use normalized emails
    created_by: req.user.email
  });

  logAudit(req.user.email, 'project_initialized', `project_${result.lastInsertRowid}`, {
    hackathon_id: req.params.hackathonId,
    name,
    team_emails: emailValidation.normalized
  });

  res.json({ id: result.lastInsertRowid, name, team_emails: emailValidation.normalized });
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

  // Check edit permissions (admins can edit any project)
  const userIsAdmin = isAdmin(req.user);
  if (!canEditProject(project, hackathon, req.user.email, userIsAdmin)) {
    return res.status(403).json({ error: 'You do not have permission to edit this project' });
  }

  // Validate length limits for fields being updated
  if (req.body.name !== undefined && req.body.name.length > MAX_PROJECT_NAME_LENGTH) {
    return res.status(400).json({
      error: 'Project name too long',
      message: `Name must be ${MAX_PROJECT_NAME_LENGTH} characters or less (currently ${req.body.name.length})`
    });
  }

  if (req.body.description !== undefined && req.body.description && req.body.description.length > MAX_PROJECT_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: 'Project description too long',
      message: `Description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or less (currently ${req.body.description.length})`
    });
  }

  if (req.body.github_link !== undefined && req.body.github_link && req.body.github_link.length > MAX_GITHUB_LINK_LENGTH) {
    return res.status(400).json({
      error: 'GitHub link too long',
      message: `GitHub link must be ${MAX_GITHUB_LINK_LENGTH} characters or less (currently ${req.body.github_link.length})`
    });
  }

  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.github_link !== undefined) updateData.github_link = req.body.github_link;
  if (req.body.banner_url !== undefined) updateData.banner_url = req.body.banner_url;
  if (req.body.banner_position_x !== undefined) updateData.banner_position_x = req.body.banner_position_x;
  if (req.body.banner_position_y !== undefined) updateData.banner_position_y = req.body.banner_position_y;
  if (req.body.image_url !== undefined) updateData.image_url = req.body.image_url;
  if (req.body.image_position_x !== undefined) updateData.image_position_x = req.body.image_position_x;
  if (req.body.image_position_y !== undefined) updateData.image_position_y = req.body.image_position_y;
  
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
  
  // Check edit permissions (admins can edit any project)
  const userIsAdmin = isAdmin(req.user);
  if (!canEditProject(project, hackathon, req.user.email, userIsAdmin)) {
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

// Upload banner image
router.post('/:hackathonId/projects/:projectId/banner', requireNP, upload.single('banner'), async (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  // Check edit permissions (admins can edit any project)
  const userIsAdmin = isAdmin(req.user);
  if (!canEditProject(project, hackathon, req.user.email, userIsAdmin)) {
    return res.status(403).json({ error: 'You do not have permission to edit this project' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No banner uploaded' });
  }
  
  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path); // Clean up
    return res.status(400).json({ error: 'Banner must be JPG, PNG, or WebP' });
  }
  
  // Validate file size (25MB)
  if (req.file.size > 25 * 1024 * 1024) {
    fs.unlinkSync(req.file.path); // Clean up
    return res.status(400).json({ error: 'Banner must be less than 25MB' });
  }
  
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/banners');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const ext = path.extname(req.file.originalname);
    const filename = `banner_${req.params.projectId}_${Date.now()}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    
    // Delete old banner if exists
    if (project.banner_url) {
      const oldPath = project.banner_url.replace('/hackathons/uploads/banners/', '');
      const oldFullPath = path.join(uploadsDir, oldPath);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }
    
    fs.renameSync(req.file.path, finalPath);
    
    const bannerUrl = `/hackathons/uploads/banners/${filename}`;
    db.updateProject(req.params.projectId, { banner_url: bannerUrl });
    
    logAudit(req.user.email, 'banner_uploaded', `project_${req.params.projectId}`, { filename });
    
    res.json({ success: true, banner_url: bannerUrl });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

// Upload project image
router.post('/:hackathonId/projects/:projectId/image', requireNP, upload.single('image'), async (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  // Check edit permissions (admins can edit any project)
  const userIsAdmin = isAdmin(req.user);
  if (!canEditProject(project, hackathon, req.user.email, userIsAdmin)) {
    return res.status(403).json({ error: 'You do not have permission to edit this project' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  
  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path); // Clean up
    return res.status(400).json({ error: 'Image must be JPG, PNG, or WebP' });
  }
  
  // Validate file size (25MB)
  if (req.file.size > 25 * 1024 * 1024) {
    fs.unlinkSync(req.file.path); // Clean up
    return res.status(400).json({ error: 'Image must be less than 25MB' });
  }
  
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const ext = path.extname(req.file.originalname);
    const filename = `image_${req.params.projectId}_${Date.now()}${ext}`;
    const finalPath = path.join(uploadsDir, filename);
    
    // Delete old image if exists
    if (project.image_url) {
      const oldPath = project.image_url.replace('/hackathons/uploads/images/', '');
      const oldFullPath = path.join(uploadsDir, oldPath);
      if (fs.existsSync(oldFullPath)) {
        fs.unlinkSync(oldFullPath);
      }
    }
    
    fs.renameSync(req.file.path, finalPath);
    
    const imageUrl = `/hackathons/uploads/images/${filename}`;
    db.updateProject(req.params.projectId, { image_url: imageUrl });
    
    logAudit(req.user.email, 'image_uploaded', `project_${req.params.projectId}`, { filename });
    
    res.json({ success: true, image_url: imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
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

// Add team member (team member or admin)
router.post('/:hackathonId/projects/:projectId/team-members', requireNP, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing required field: email' });
  }

  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (project.hackathon_id !== parseInt(req.params.hackathonId)) {
    return res.status(404).json({ error: 'Project not found in this hackathon' });
  }

  const hackathon = db.getHackathon(req.params.hackathonId);

  // Check permissions: must be team member or admin
  const userIsAdmin = isAdmin(req.user);
  const teamEmails = JSON.parse(project.team_emails || '[]');
  const userIsTeamMember = teamEmails.map(e => e.toLowerCase()).includes(req.user.email.toLowerCase());

  if (!userIsAdmin && !userIsTeamMember) {
    return res.status(403).json({ error: 'Only team members or admins can add team members' });
  }

  // Prevent adding team members to concluded hackathons
  if (hackathon.concluded_at) {
    return res.status(403).json({ error: 'Cannot modify team members for concluded hackathons' });
  }

  // Validate the new email
  const validation = validateTeamEmails([...teamEmails, email]);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid email',
      details: validation.errors
    });
  }

  // Check if email is already a team member
  if (teamEmails.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
    return res.status(400).json({ error: 'Email is already a team member' });
  }

  // Add the new team member
  const updatedTeamEmails = [...teamEmails, email.toLowerCase()];

  db.updateProject(req.params.projectId, {
    team_emails: updatedTeamEmails
  });

  logAudit(req.user.email, 'team_member_added', `project_${req.params.projectId}`, {
    project_name: project.name,
    added_email: email.toLowerCase()
  });

  res.json({
    success: true,
    team_emails: updatedTeamEmails
  });
});

// Remove team member (team member or admin)
router.delete('/:hackathonId/projects/:projectId/team-members/:email', requireNP, async (req, res) => {
  const emailToRemove = req.params.email.toLowerCase();

  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (project.hackathon_id !== parseInt(req.params.hackathonId)) {
    return res.status(404).json({ error: 'Project not found in this hackathon' });
  }

  const hackathon = db.getHackathon(req.params.hackathonId);

  // Check permissions: must be team member or admin
  const userIsAdmin = isAdmin(req.user);
  const teamEmails = JSON.parse(project.team_emails || '[]');
  const userIsTeamMember = teamEmails.map(e => e.toLowerCase()).includes(req.user.email.toLowerCase());

  if (!userIsAdmin && !userIsTeamMember) {
    return res.status(403).json({ error: 'Only team members or admins can remove team members' });
  }

  // Prevent removing team members from concluded hackathons
  if (hackathon.concluded_at) {
    return res.status(403).json({ error: 'Cannot modify team members for concluded hackathons' });
  }

  // Check if email exists in team
  if (!teamEmails.map(e => e.toLowerCase()).includes(emailToRemove)) {
    return res.status(404).json({ error: 'Email is not a team member' });
  }

  // Prevent removing the last team member
  if (teamEmails.length === 1) {
    return res.status(400).json({ error: 'Cannot remove the last team member' });
  }

  // Remove the team member
  const updatedTeamEmails = teamEmails.filter(e => e.toLowerCase() !== emailToRemove);

  db.updateProject(req.params.projectId, {
    team_emails: updatedTeamEmails
  });

  logAudit(req.user.email, 'team_member_removed', `project_${req.params.projectId}`, {
    project_name: project.name,
    removed_email: emailToRemove
  });

  res.json({
    success: true,
    team_emails: updatedTeamEmails
  });
});

// Delete project (admin only)
router.delete('/:hackathonId/projects/:projectId', requireNP, requireAdmin, (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (project.hackathon_id !== parseInt(req.params.hackathonId)) {
    return res.status(404).json({ error: 'Project not found in this hackathon' });
  }
  
  try {
    db.deleteProject(req.params.projectId);
    
    logAudit(req.user.email, 'project_deleted', `project_${req.params.projectId}`, {
      name: project.name,
      hackathon_id: project.hackathon_id
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;

