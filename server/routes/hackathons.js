const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireNP, requireAdmin } = require('../middleware');
const { calculateHackathonStatus } = require('../utils/hackathon-status');
const { logAudit } = require('../utils/audit-logger');
const { addDays } = require('date-fns');

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
    status: 'concluded',
    concluded_at: new Date().toISOString(),
    concluded_by: req.user.email
  });
  
  logAudit(req.user.email, 'hackathon_concluded', `hackathon_${req.params.id}`, {
    concluded_at: new Date().toISOString()
  });
  
  res.json({ success: true });
});

module.exports = router;

