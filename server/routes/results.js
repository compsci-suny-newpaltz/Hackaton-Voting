const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireNP, requireAdmin } = require('../middleware');
const { calculateHackathonStatus } = require('../utils/hackathon-status');

// Get judge results for a hackathon (concluded hackathons only, or admin preview)
router.get('/:hackathonId/results', async (req, res) => {
  try {
    const hackathon = db.getHackathon(req.params.hackathonId);
    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    const status = calculateHackathonStatus(hackathon);
    
    // Check if results should be public
    const isConcluded = status.status === 'concluded' || hackathon.concluded_at;
    
    // If not concluded, require admin auth
    if (!isConcluded) {
      // Check if user is authenticated and admin
      try {
        const { verifyWithHydra } = require('../middleware/auth');
        const { isAdmin } = require('../middleware/admin');
        const token = req.cookies?.np_access;
        
        if (!token) {
          return res.status(403).json({ error: 'Results not yet public. Admin access required.' });
        }
        
        const authResult = await verifyWithHydra(token);
        if (!authResult.ok || !authResult.data?.active) {
          return res.status(403).json({ error: 'Results not yet public. Admin access required.' });
        }
        
        if (!isAdmin(authResult.data)) {
          return res.status(403).json({ error: 'Results not yet public. Admin access required.' });
        }
      } catch (error) {
        return res.status(403).json({ error: 'Results not yet public. Admin access required.' });
      }
    }
    
    // Get results
    const summary = db.getProjectScoresSummary(req.params.hackathonId);
    const detailedResults = db.getJudgeResultsByHackathon(req.params.hackathonId);
    
    // Group detailed results by project
    const projectResults = {};
    detailedResults.forEach(result => {
      if (!projectResults[result.project_id]) {
        projectResults[result.project_id] = {
          project_id: result.project_id,
          project_name: result.project_name,
          scores: []
        };
      }
      if (result.score !== null) {
        projectResults[result.project_id].scores.push({
          judge_name: result.judge_name,
          score: result.score,
          comment: result.comment,
          voted_at: result.voted_at
        });
      }
    });
    
    res.json({
      hackathon: {
        id: hackathon.id,
        name: hackathon.name,
        status: status.status,
        is_concluded: isConcluded
      },
      summary,
      detailed: Object.values(projectResults)
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get scores for a specific project
router.get('/:hackathonId/projects/:projectId/scores', async (req, res) => {
  try {
    const project = db.getProject(req.params.projectId);
    if (!project || project.hackathon_id !== parseInt(req.params.hackathonId)) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const hackathon = db.getHackathon(req.params.hackathonId);
    const status = calculateHackathonStatus(hackathon);
    const isConcluded = status.status === 'concluded' || hackathon.concluded_at;
    
    // If not concluded, require admin auth (same logic as above)
    if (!isConcluded) {
      try {
        const { verifyWithHydra } = require('../middleware/auth');
        const { isAdmin } = require('../middleware/admin');
        const token = req.cookies?.np_access;
        
        if (!token) {
          return res.status(403).json({ error: 'Scores not yet public' });
        }
        
        const authResult = await verifyWithHydra(token);
        if (!authResult.ok || !authResult.data?.active || !isAdmin(authResult.data)) {
          return res.status(403).json({ error: 'Scores not yet public' });
        }
      } catch (error) {
        return res.status(403).json({ error: 'Scores not yet public' });
      }
    }
    
    const scores = db.getJudgeVotesByProject(req.params.projectId);
    
    // Calculate statistics
    const scoreValues = scores.map(s => s.score);
    const avg = scoreValues.length > 0 
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2)
      : null;
    
    res.json({
      project_id: project.id,
      project_name: project.name,
      is_concluded: isConcluded,
      scores: scores.map(s => ({
        score: s.score,
        comment: s.comment,
        voted_at: s.voted_at
      })),
      statistics: {
        average: avg,
        count: scoreValues.length,
        min: scoreValues.length > 0 ? Math.min(...scoreValues) : null,
        max: scoreValues.length > 0 ? Math.max(...scoreValues) : null
      }
    });
  } catch (error) {
    console.error('Error fetching project scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

module.exports = router;
