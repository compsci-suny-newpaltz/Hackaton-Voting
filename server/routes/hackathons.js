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
const { maskProjectEmails } = require('../utils/email-masking');

// Configuration constants
const MAX_HACKATHON_NAME_LENGTH = 200;
const MAX_HACKATHON_DESCRIPTION_LENGTH = 5000;

// Validation helper for hackathon time constraints
function validateHackathonTimes(start_time, end_time, vote_expiration) {
  const errors = [];

  // Parse dates
  const start = new Date(start_time);
  const end = new Date(end_time);
  const voteExp = vote_expiration ? new Date(vote_expiration) : null;

  // Check for invalid dates
  if (isNaN(start.getTime())) {
    errors.push('Invalid start_time format');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end_time format');
  }
  if (voteExp && isNaN(voteExp.getTime())) {
    errors.push('Invalid vote_expiration format');
  }

  // If dates are invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate time ordering: start < end < vote_expiration
  if (start >= end) {
    errors.push('start_time must be before end_time');
  }

  if (voteExp && end >= voteExp) {
    errors.push('end_time must be before vote_expiration');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

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
      current: current ? { ...current, status: calculateHackathonStatus(current).status } : null,
      all: hackathons.map(h => ({
        ...h,
        status: calculateHackathonStatus(h).status
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

    const statusInfo = calculateHackathonStatus(hackathon);

    // Get projects with proper visibility filtering
    const userEmail = req.user?.email;
    const userIsAdmin = req.user && require('../middleware/admin').isAdmin(req.user);
    const projects = db.getProjectsByHackathon(hackathon.id);

    // Apply email masking to each project
    const maskedProjects = projects.map(project =>
      maskProjectEmails(project, userEmail, userIsAdmin)
    );

    res.json({
      ...hackathon,
      status: statusInfo.status,
      projects: maskedProjects
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
  const { name, description, start_time, end_time, vote_expiration, review_ends_at, banner_url } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields: name, start_time, and end_time are required' });
  }

  // Validate length limits
  if (name.length > MAX_HACKATHON_NAME_LENGTH) {
    return res.status(400).json({
      error: 'Hackathon name too long',
      message: `Name must be ${MAX_HACKATHON_NAME_LENGTH} characters or less (currently ${name.length})`
    });
  }

  if (description && description.length > MAX_HACKATHON_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: 'Hackathon description too long',
      message: `Description must be ${MAX_HACKATHON_DESCRIPTION_LENGTH} characters or less (currently ${description.length})`
    });
  }

  // Default vote expiration: 7 days after end_time
  const defaultVoteExpiration = vote_expiration || addDays(new Date(end_time), 7).toISOString();

  // Validate time constraints
  const validation = validateHackathonTimes(start_time, end_time, defaultVoteExpiration);
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid time configuration',
      details: validation.errors
    });
  }

  // Validate review_ends_at if provided: must be between vote_expiration and some reasonable future
  if (review_ends_at) {
    const reviewDate = new Date(review_ends_at);
    const voteExpDate = new Date(defaultVoteExpiration);

    if (isNaN(reviewDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid review_ends_at format',
        message: 'review_ends_at must be a valid ISO date'
      });
    }

    if (reviewDate <= voteExpDate) {
      return res.status(400).json({
        error: 'Invalid review period',
        message: 'review_ends_at must be after vote_expiration'
      });
    }
  }

  const result = db.createHackathon({
    name,
    description,
    start_time,
    end_time,
    vote_expiration: defaultVoteExpiration,
    review_ends_at,
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

  // Validate length limits for fields being updated
  if (req.body.name !== undefined && req.body.name.length > MAX_HACKATHON_NAME_LENGTH) {
    return res.status(400).json({
      error: 'Hackathon name too long',
      message: `Name must be ${MAX_HACKATHON_NAME_LENGTH} characters or less (currently ${req.body.name.length})`
    });
  }

  if (req.body.description !== undefined && req.body.description && req.body.description.length > MAX_HACKATHON_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      error: 'Hackathon description too long',
      message: `Description must be ${MAX_HACKATHON_DESCRIPTION_LENGTH} characters or less (currently ${req.body.description.length})`
    });
  }

  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.start_time !== undefined) updateData.start_time = req.body.start_time;
  if (req.body.end_time !== undefined) updateData.end_time = req.body.end_time;
  if (req.body.vote_expiration !== undefined) updateData.vote_expiration = req.body.vote_expiration;
  if (req.body.review_ends_at !== undefined) updateData.review_ends_at = req.body.review_ends_at;
  if (req.body.banner_url !== undefined) updateData.banner_url = req.body.banner_url;
  if (req.body.banner_position_x !== undefined) updateData.banner_position_x = req.body.banner_position_x;
  if (req.body.banner_position_y !== undefined) updateData.banner_position_y = req.body.banner_position_y;

  // If any time fields are being updated, validate the entire time configuration
  if (updateData.start_time || updateData.end_time || updateData.vote_expiration || updateData.review_ends_at) {
    // Use updated values or fall back to existing values
    const finalStartTime = updateData.start_time || hackathon.start_time;
    const finalEndTime = updateData.end_time || hackathon.end_time;
    const finalVoteExpiration = updateData.vote_expiration || hackathon.vote_expiration;
    const finalReviewEndsAt = updateData.review_ends_at !== undefined ? updateData.review_ends_at : hackathon.review_ends_at;

    const validation = validateHackathonTimes(finalStartTime, finalEndTime, finalVoteExpiration);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid time configuration',
        details: validation.errors
      });
    }

    // Validate review_ends_at if provided
    if (finalReviewEndsAt) {
      const reviewDate = new Date(finalReviewEndsAt);
      const voteExpDate = new Date(finalVoteExpiration);

      if (isNaN(reviewDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid review_ends_at format',
          message: 'review_ends_at must be a valid ISO date'
        });
      }

      if (reviewDate <= voteExpDate) {
        return res.status(400).json({
          error: 'Invalid review period',
          message: 'review_ends_at must be after vote_expiration'
        });
      }
    }
  }

  db.updateHackathon(req.params.id, updateData);

  logAudit(req.user.email, 'hackathon_updated', `hackathon_${req.params.id}`, updateData);

  res.json({ success: true });
});

// Get active and upcoming hackathons (public)
router.get('/active', (req, res) => {
  try {
    const hackathons = db.getHackathons();
    const activeAndUpcoming = hackathons
      .filter(h => !h.archived) // Exclude archived
      .map(h => {
        const status = calculateHackathonStatus(h);
        return {
          id: h.id,
          name: h.name,
          start_time: h.start_time,
          end_time: h.end_time,
          vote_expiration: h.vote_expiration,
          status: status.status,
          banner_url: h.banner_url
        };
      })
      .filter(h => ['upcoming', 'active', 'ended'].includes(h.status)); // Only active, upcoming, and ended (voting)

    res.json(activeAndUpcoming);
  } catch (error) {
    console.error('Error getting active hackathons:', error);
    res.status(500).json({ error: 'Failed to fetch active hackathons' });
  }
});

// Archive hackathon (admin only)
router.post('/:id/archive', requireNP, requireAdmin, (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  db.updateHackathon(req.params.id, {
    archived: 1
  });

  logAudit(req.user.email, 'hackathon_archived', `hackathon_${req.params.id}`, {
    archived_at: new Date().toISOString()
  });

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

