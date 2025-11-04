const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireNP, formatDisplayName } = require('../middleware');

// Get comments for a project (public)
router.get('/:hackathonId/projects/:projectId/comments', (req, res) => {
  const comments = db.getCommentsByProject(req.params.projectId);
  res.json(comments);
});

// Add comment (authenticated)
router.post('/:hackathonId/projects/:projectId/comments', requireNP, (req, res) => {
  const { content } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content required' });
  }
  
  const displayName = formatDisplayName(req.user);
  
  const result = db.addComment({
    project_id: req.params.projectId,
    user_email: req.user.email,
    display_name: displayName,
    content: content.trim()
  });
  
  res.json({ id: result.lastInsertRowid, success: true });
});

// Update comment (owner only, within 15 minutes)
router.put('/:hackathonId/projects/:projectId/comments/:commentId', requireNP, (req, res) => {
  const comment = db.getCommentsByProject(req.params.projectId)
    .find(c => c.id === parseInt(req.params.commentId));
  
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  if (comment.user_email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Not your comment' });
  }
  
  // Check 15-minute edit window
  const createdAt = new Date(comment.created_at);
  const now = new Date();
  const minutesDiff = (now - createdAt) / (1000 * 60);
  
  if (minutesDiff > 15) {
    return res.status(403).json({ error: 'Edit window expired (15 minutes)' });
  }
  
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content required' });
  }
  
  db.updateComment(req.params.commentId, content.trim());
  
  res.json({ success: true });
});

// Delete comment (owner only, within 15 minutes)
router.delete('/:hackathonId/projects/:projectId/comments/:commentId', requireNP, (req, res) => {
  const comment = db.getCommentsByProject(req.params.projectId)
    .find(c => c.id === parseInt(req.params.commentId));
  
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  if (comment.user_email.toLowerCase() !== req.user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Not your comment' });
  }
  
  // Check 15-minute edit window
  const createdAt = new Date(comment.created_at);
  const now = new Date();
  const minutesDiff = (now - createdAt) / (1000 * 60);
  
  if (minutesDiff > 15) {
    return res.status(403).json({ error: 'Delete window expired (15 minutes)' });
  }
  
  db.deleteComment(req.params.commentId);
  
  res.json({ success: true });
});

module.exports = router;

