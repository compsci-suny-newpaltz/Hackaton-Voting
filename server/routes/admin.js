const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireNP, requireAdmin } = require('../middleware');
const { isAdmin } = require('../middleware/admin');
const { generateJudgeCode, generateJudgeLink } = require('../utils/token-generator');
const { logAudit } = require('../utils/audit-logger');

// Get admin dashboard data
router.get('/dashboard', requireNP, requireAdmin, (req, res) => {
  const hackathons = db.getHackathons();
  const admins = db.getAdmins();
  const auditLogs = db.getAuditLogs(50);
  
  res.json({
    hackathons,
    admins,
    auditLogs,
    currentUser: {
      email: req.user.email,
      isAdmin: isAdmin(req.user)
    }
  });
});

// Get hackathon settings
router.get('/hackathons/:id/settings', requireNP, requireAdmin, (req, res) => {
  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  const projects = db.getProjectsByHackathon(req.params.id);
  const judgeCodes = db.getJudgeCodesByHackathon(req.params.id);
  const judgeCategories = db.getJudgeCategories(req.params.id);

  res.json({
    hackathon,
    projects,
    judges: judgeCodes.map(jc => ({
      ...jc,
      link: generateJudgeLink(jc.hackathon_id, jc.code)
    })),
    judgeCategories
  });
});

// Judge Categories Management
// Get all judge categories for a hackathon
router.get('/hackathons/:id/categories', requireNP, requireAdmin, (req, res) => {
  const categories = db.getJudgeCategories(req.params.id);
  res.json(categories);
});

// Create a new judge category
router.post('/hackathons/:id/categories', requireNP, requireAdmin, (req, res) => {
  const { name, description, weight } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  // Get max display_order for this hackathon
  const categories = db.getJudgeCategories(req.params.id);
  const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : -1;

  const result = db.createJudgeCategory({
    hackathon_id: req.params.id,
    name,
    description,
    weight: weight || 1.0,
    display_order: maxOrder + 1
  });

  logAudit(req.user.email, 'judge_category_created', `category_${result.lastInsertRowid}`, {
    hackathon_id: req.params.id,
    name,
    weight
  });

  res.json({ id: result.lastInsertRowid, name, description, weight: weight || 1.0, display_order: maxOrder + 1 });
});

// Update a judge category
router.put('/categories/:id', requireNP, requireAdmin, (req, res) => {
  const updateData = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.weight !== undefined) updateData.weight = req.body.weight;
  if (req.body.display_order !== undefined) updateData.display_order = req.body.display_order;

  db.updateJudgeCategory(req.params.id, updateData);

  logAudit(req.user.email, 'judge_category_updated', `category_${req.params.id}`, updateData);

  res.json({ success: true });
});

// Delete a judge category
router.delete('/categories/:id', requireNP, requireAdmin, (req, res) => {
  db.deleteJudgeCategory(req.params.id);

  logAudit(req.user.email, 'judge_category_deleted', `category_${req.params.id}`, {});

  res.json({ success: true });
});

// Reorder categories
router.post('/hackathons/:id/categories/reorder', requireNP, requireAdmin, (req, res) => {
  const { categoryIds } = req.body;

  if (!Array.isArray(categoryIds)) {
    return res.status(400).json({ error: 'categoryIds must be an array' });
  }

  // Update display_order for each category
  categoryIds.forEach((categoryId, index) => {
    db.updateJudgeCategory(categoryId, { display_order: index });
  });

  logAudit(req.user.email, 'judge_categories_reordered', `hackathon_${req.params.id}`, {
    order: categoryIds
  });

  res.json({ success: true });
});

// Admin management
router.get('/admins', requireNP, requireAdmin, (req, res) => {
  const admins = db.getAdmins();
  res.json(admins);
});

router.post('/admins', requireNP, requireAdmin, (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  
  // Check if already admin
  if (db.isAdmin(email)) {
    return res.status(400).json({ error: 'Already an admin' });
  }
  
  db.addAdmin(email.toLowerCase(), req.user.email);
  
  logAudit(req.user.email, 'admin_added', email, { added_email: email });
  
  res.json({ success: true });
});

router.delete('/admins/:email', requireNP, requireAdmin, (req, res) => {
  const email = req.params.email.toLowerCase();
  
  // Cannot remove hardcoded admin
  if (email === 'gopeen1@newpaltz.edu') {
    return res.status(403).json({ error: 'Cannot remove hardcoded admin' });
  }
  
  // Cannot remove self
  if (email === req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Cannot remove yourself' });
  }
  
  db.removeAdmin(email);
  
  logAudit(req.user.email, 'admin_removed', email, { removed_email: email });
  
  res.json({ success: true });
});

// Judge management
router.post('/hackathons/:id/judges', requireNP, requireAdmin, (req, res) => {
  const { judge_name, anonymous_responses } = req.body;

  if (!judge_name || !judge_name.trim()) {
    return res.status(400).json({ error: 'Judge name required' });
  }

  const hackathon = db.getHackathon(req.params.id);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  const code = generateJudgeCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parseInt(process.env.JUDGE_CODE_EXPIRY_HOURS || '168'));

  const result = db.createJudgeCode({
    code,
    judge_name: judge_name.trim(),
    hackathon_id: req.params.id,
    created_by: req.user.email,
    expires_at: expiresAt.toISOString(),
    anonymous_responses: anonymous_responses ? 1 : 0
  });

  const link = generateJudgeLink(req.params.id, code);

  logAudit(req.user.email, 'judge_link_generated', `judge_${result.lastInsertRowid}`, {
    judge_name,
    hackathon_id: req.params.id,
    anonymous_responses: anonymous_responses ? 1 : 0
  });

  res.json({
    id: result.lastInsertRowid,
    code,
    link,
    judge_name,
    anonymous_responses: anonymous_responses ? 1 : 0
  });
});

router.put('/hackathons/:id/judges/:judgeId', requireNP, requireAdmin, (req, res) => {
  const { judge_name, anonymous_responses } = req.body;

  // Get the judge code to verify it exists and belongs to this hackathon
  const judgeCode = db.getJudgeCode(req.body.code);
  if (!judgeCode || judgeCode.hackathon_id !== parseInt(req.params.id) || judgeCode.id !== parseInt(req.params.judgeId)) {
    return res.status(404).json({ error: 'Judge code not found' });
  }

  const updateData = {};
  if (judge_name !== undefined && judge_name.trim()) {
    updateData.judge_name = judge_name.trim();
  }
  if (anonymous_responses !== undefined) {
    updateData.anonymous_responses = anonymous_responses ? 1 : 0;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  db.updateJudgeCode(req.params.judgeId, updateData);

  logAudit(req.user.email, 'judge_code_updated', `judge_${req.params.judgeId}`, updateData);

  res.json({ success: true });
});

router.post('/hackathons/:id/judges/:codeId/revoke', requireNP, requireAdmin, (req, res) => {
  const judgeCode = db.getJudgeCode(req.query.code || '');
  if (!judgeCode || judgeCode.hackathon_id !== parseInt(req.params.id)) {
    return res.status(404).json({ error: 'Judge code not found' });
  }
  
  db.revokeJudgeCode(judgeCode.code);
  
  logAudit(req.user.email, 'judge_code_revoked', `judge_${judgeCode.id}`, {
    judge_name: judgeCode.judge_name
  });
  
  res.json({ success: true });
});

module.exports = router;

