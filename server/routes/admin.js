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
  
  res.json({
    hackathon,
    projects,
    judges: judgeCodes.map(jc => ({
      ...jc,
      link: generateJudgeLink(jc.hackathon_id, jc.code)
    }))
  });
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
  const { judge_name } = req.body;
  
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
    expires_at: expiresAt.toISOString()
  });
  
  const link = generateJudgeLink(req.params.id, code);
  
  logAudit(req.user.email, 'judge_link_generated', `judge_${result.lastInsertRowid}`, {
    judge_name,
    hackathon_id: req.params.id
  });
  
  res.json({
    id: result.lastInsertRowid,
    code,
    link,
    judge_name
  });
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

