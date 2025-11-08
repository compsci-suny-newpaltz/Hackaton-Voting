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

    // Check if results should be public (respects review period)
    const isPublicResultsVisible = status.isPublicResultsVisible;

    // If results not public yet, require admin auth
    if (!isPublicResultsVisible) {
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
  const hackathonId = req.params.hackathonId;
  const summary = db.getProjectScoresSummary(hackathonId);
  const detailedResults = db.getJudgeResultsByHackathon(hackathonId);
  const categories = db.getJudgeCategories(hackathonId);
    
    // Group detailed results by project
    const projectResults = {};
    // Also accumulate per-category averages per project for winners
    const categoryAgg = new Map(); // categoryId -> Map(projectId -> {sum,count})
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
          voted_at: result.voted_at,
          category_id: result.category_id,
          category_name: result.category_name,
          category_weight: result.category_weight
        });

        if (result.category_id) {
          if (!categoryAgg.has(result.category_id)) categoryAgg.set(result.category_id, new Map());
          const projMap = categoryAgg.get(result.category_id);
          if (!projMap.has(result.project_id)) projMap.set(result.project_id, { sum: 0, count: 0, project_name: result.project_name });
          const agg = projMap.get(result.project_id);
          agg.sum += result.score;
          agg.count += 1;
        }
      }
    });

    // Compute category winners
    const categoryWinners = categories.map(cat => {
      const projMap = categoryAgg.get(cat.id) || new Map();
      const averages = [];
      for (const [project_id, { sum, count, project_name }] of projMap.entries()) {
        const avg = count > 0 ? sum / count : null;
        if (avg !== null) {
          averages.push({ project_id, project_name, average_score: parseFloat(avg.toFixed(2)) });
        }
      }
      // Determine winners (handle ties)
      averages.sort((a, b) => b.average_score - a.average_score);
      const topScore = averages.length > 0 ? averages[0].average_score : null;
      const winners = topScore === null ? [] : averages.filter(a => a.average_score === topScore);
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        weight: cat.weight,
        display_order: cat.display_order,
        winners,
        averages
      };
    }).sort((a, b) => a.display_order - b.display_order);

    // Compute overall winners from summary (weighted avg across categories)
    const validSummaries = (summary || []).filter(s => s.avg_judge_score !== null);
    let overall = { winners: [], top_score: null };
    if (validSummaries.length > 0) {
      const top = [...validSummaries].sort((a, b) => b.avg_judge_score - a.avg_judge_score)[0].avg_judge_score;
      overall.top_score = top;
      overall.winners = validSummaries.filter(s => s.avg_judge_score === top).map(s => ({
        project_id: s.id,
        project_name: s.name,
        average_score: s.avg_judge_score
      }));
    }
    
    res.json({
      hackathon: {
        id: hackathon.id,
        name: hackathon.name,
        status: status.status,
        is_public_results_visible: isPublicResultsVisible,
        review_ends_at: hackathon.review_ends_at
      },
      summary,
      detailed: Object.values(projectResults),
      categories: categoryWinners,
      overall
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
    const isPublicResultsVisible = status.isPublicResultsVisible;

    // If results not public yet, require admin auth (same logic as above)
    if (!isPublicResultsVisible) {
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
      is_public_results_visible: isPublicResultsVisible,
      scores: scores.map(s => ({
        id: s.id,
        judge_code_id: s.judge_code_id,
        category_id: s.category_id,
        category_name: s.category_name,
        category_weight: s.category_weight,
        score: s.score,
        comment: s.comment,
        judge_name: s.judge_name,
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
