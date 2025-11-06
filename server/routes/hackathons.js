const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireNP, requireAdmin } = require('../middleware');
const { calculateHackathonStatus } = require('../utils/hackathon-status');
const { logAudit } = require('../utils/audit-logger');
const { addDays } = require('date-fns');

// Ensure upload directories exist
const bannersDir = path.join(__dirname, '../../uploads/banners');
if (!fs.existsSync(bannersDir)) {
  fs.mkdirSync(bannersDir, { recursive: true });
}

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, bannersDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'hackathon-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
    }
  }
});

// Get all hackathons (public)
router.get('/', (req, res) => {
  try {
    const hackathons = db.getHackathons();
    const current = db.getCurrentHackathon();
    
    res.json({
      current,
      all: hackathons.map(h => ({
        ...h,
        status: calculateHackathonStatus(h)
      }))
    });
  } catch (error) {
    console.error('Error getting hackathons:', error);
    res.status(500).json({ 
      error: 'Database error. Please ensure the database is initialized.',
      details: error.message 
    });
  }
});

// Get hackathon by ID (public)
router.get('/:id', (req, res) => {
  try {
    const hackathon = db.getHackathon(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    const status = calculateHackathonStatus(hackathon);
    const projects = db.getProjectsByHackathon(hackathon.id);
    
    res.json({
      ...hackathon,
      status,
      projects
    });
  } catch (error) {
    console.error('Error getting hackathon:', error);
    res.status(500).json({ 
      error: 'Database error. Please ensure the database is initialized.',
      details: error.message 
    });
  }
});

// Create hackathon (admin only)
router.post('/', requireNP, requireAdmin, (req, res) => {
  const { name, description, start_time, end_time, vote_expiration, banner_url } = req.body;
  
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Default vote expiration: 7 days after end_time
  const defaultVoteExpiration = vote_expiration || addDays(new Date(end_time), 7).toISOString();
  
  const result = db.createHackathon({
    name,
    description,
    start_time,
    end_time,
    vote_expiration: defaultVoteExpiration,
    banner_url,
    created_by: req.user.email
  });
  
  logAudit(req.user.email, 'hackathon_created', `hackathon_${result.lastInsertRowid}`, {
    name,
    start_time,
    end_time
  });
  
  res.json({ id: result.lastInsertRowid, ...req.body });
});

// Update hackathon (admin only)
router.put('/:id', requireNP, requireAdmin, (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.start_time !== undefined) updateData.start_time = req.body.start_time;
  if (req.body.end_time !== undefined) updateData.end_time = req.body.end_time;
  if (req.body.vote_expiration !== undefined) updateData.vote_expiration = req.body.vote_expiration;
  if (req.body.banner_url !== undefined) updateData.banner_url = req.body.banner_url;
  if (req.body.banner_position_x !== undefined) updateData.banner_position_x = req.body.banner_position_x;
  if (req.body.banner_position_y !== undefined) updateData.banner_position_y = req.body.banner_position_y;
  
  db.updateHackathon(req.params.id, updateData);
  
  logAudit(req.user.email, 'hackathon_updated', `hackathon_${req.params.id}`, updateData);
  
  res.json({ success: true });
});

// Conclude hackathon (admin only)
router.post('/:id/conclude', requireNP, requireAdmin, (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  db.updateHackathon(req.params.id, {
    concluded_at: new Date().toISOString(),
    concluded_by: req.user.email
  });
  
  logAudit(req.user.email, 'hackathon_concluded', `hackathon_${req.params.id}`, {
    concluded_at: new Date().toISOString()
  });
  
  res.json({ success: true });
});

// Delete hackathon (admin only)
router.delete('/:id', requireNP, requireAdmin, (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  try {
    db.deleteHackathon(req.params.id);
    
    logAudit(req.user.email, 'hackathon_deleted', `hackathon_${req.params.id}`, {
      name: hackathon.name
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    res.status(500).json({ error: 'Failed to delete hackathon' });
  }
});

// Upload hackathon banner (admin only)
router.post('/:id/banner', requireNP, requireAdmin, bannerUpload.single('banner'), (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const bannerUrl = `/hackathons/uploads/banners/${req.file.filename}`;
    
    const updateData = {
      banner_url: bannerUrl
    };
    
    // Add position if provided
    if (req.body.position_x !== undefined) {
      updateData.banner_position_x = parseInt(req.body.position_x);
    }
    if (req.body.position_y !== undefined) {
      updateData.banner_position_y = parseInt(req.body.position_y);
    }
    
    db.updateHackathon(req.params.id, updateData);
    
    logAudit(req.user.email, 'hackathon_banner_uploaded', `hackathon_${req.params.id}`, {
      filename: req.file.filename
    });
    
    res.json({ 
      success: true,
      banner_url: bannerUrl
    });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

module.exports = router;

