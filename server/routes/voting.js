const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireNP } = require('../middleware');
const { canVoteOnProject, calculateHackathonStatus } = require('../utils/hackathon-status');

// Popular vote - check if user can vote
router.get('/:hackathonId/projects/:projectId/vote-status', requireNP, (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }
  
  const voteCheck = canVoteOnProject(hackathon, req.user.email, project);
  const hasVoted = !!db.getPopularVote(req.params.projectId, req.user.email);
  
  res.json({
    canVote: voteCheck.allowed,
    reason: voteCheck.reason,
    hasVoted,
    voteExpiration: hackathon.vote_expiration
  });
});

// Popular vote - cast vote
router.post('/:hackathonId/projects/:projectId/vote', requireNP, (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  // Explicit check for vote expiration
  const now = new Date();
  const voteExpiration = new Date(hackathon.vote_expiration);
  if (now >= voteExpiration) {
    return res.status(403).json({
      error: 'voting_expired',
      message: 'Voting period has ended',
      expired_at: hackathon.vote_expiration
    });
  }

  // Check if hackathon is concluded
  if (hackathon.concluded_at) {
    return res.status(403).json({
      error: 'hackathon_concluded',
      message: 'This hackathon has been concluded'
    });
  }

  const voteCheck = canVoteOnProject(hackathon, req.user.email, project);
  if (!voteCheck.allowed) {
    return res.status(403).json({ error: voteCheck.reason });
  }

  // NEW: Check if user has already voted in this hackathon (1 vote per hackathon)
  const userVotes = db.getUserVotesInHackathon(req.params.hackathonId, req.user.email);
  if (userVotes && userVotes.length > 0) {
    const votedProject = userVotes[0];
    return res.status(400).json({
      error: 'already_voted_in_hackathon',
      message: `You've already voted for "${votedProject.project_name}". Click the vote button on that project to remove your vote, then you can vote for a different project.`,
      votedProjectId: votedProject.project_id,
      votedProjectName: votedProject.project_name
    });
  }

  // Add vote
  db.addPopularVote(req.params.projectId, req.user.email);

  res.json({ success: true });
});

// Popular vote - remove vote (toggle off)
router.delete('/:hackathonId/projects/:projectId/vote', requireNP, (req, res) => {
  const project = db.getProject(req.params.projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const hackathon = db.getHackathon(req.params.hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  // Check if voting is still allowed
  const now = new Date();
  const voteExpiration = new Date(hackathon.vote_expiration);
  if (now >= voteExpiration) {
    return res.status(403).json({
      error: 'voting_expired',
      message: 'Voting period has ended'
    });
  }

  if (hackathon.concluded_at) {
    return res.status(403).json({
      error: 'hackathon_concluded',
      message: 'This hackathon has been concluded'
    });
  }

  // Check if user has voted for this project
  const existingVote = db.getPopularVote(req.params.projectId, req.user.email);
  if (!existingVote) {
    return res.status(400).json({ error: 'You have not voted for this project' });
  }

  // Remove vote
  db.removePopularVote(req.params.projectId, req.user.email);

  res.json({ success: true, message: 'Vote removed successfully' });
});

// Judge voting page - get projects
router.get('/:hackathonId/judgevote', (req, res) => {
  const { code } = req.query;
  const hackathonId = req.params.hackathonId;
  
  // If no code, show entry form
  if (!code) {
    return res.json({
      requiresCode: true,
      hackathonId
    });
  }
  
  // Validate code
  const judgeCode = db.getJudgeCode(code);
  if (!judgeCode) {
    return res.status(404).json({ error: 'Invalid judge code' });
  }
  
  // Verify code belongs to this hackathon
  if (judgeCode.hackathon_id !== parseInt(hackathonId)) {
    return res.status(403).json({ error: 'This code is not valid for this hackathon' });
  }
  
  // Check if revoked or expired
  if (judgeCode.revoked) {
    return res.status(403).json({ error: 'This code has been revoked' });
  }
  
  if (new Date() > new Date(judgeCode.expires_at)) {
    return res.status(403).json({ error: 'This code has expired' });
  }
  
  // Check if already voted
  if (judgeCode.voted) {
    return res.json({
      alreadyVoted: true,
      judgeName: judgeCode.judge_name,
      votedAt: judgeCode.voted_at
    });
  }
  
  // Get hackathon and projects
  const hackathon = db.getHackathon(hackathonId);
  if (!hackathon) {
    return res.status(404).json({ error: 'Hackathon not found' });
  }

  const projects = db.getProjectsByHackathon(hackathonId);
  const categories = db.getJudgeCategories(hackathonId);

  res.json({
    hackathon,
    projects,
    categories,
    judgeName: judgeCode.judge_name,
    code: code
  });
});

// Judge voting - submit scores
router.post('/:hackathonId/judgevote', (req, res) => {
  const { code, votes } = req.body;
  const hackathonId = req.params.hackathonId;

  if (!code || !votes) {
    return res.status(400).json({ error: 'Missing code or votes' });
  }

  const judgeCode = db.getJudgeCode(code);
  if (!judgeCode) {
    return res.status(404).json({ error: 'Invalid judge code' });
  }

  // Validation
  if (judgeCode.hackathon_id !== parseInt(hackathonId)) {
    return res.status(403).json({ error: 'Code not valid for this hackathon' });
  }

  if (judgeCode.revoked || judgeCode.voted) {
    return res.status(403).json({ error: 'Code already used or revoked' });
  }

  if (new Date() > new Date(judgeCode.expires_at)) {
    return res.status(403).json({ error: 'Code expired' });
  }

  // Check hackathon status - must be ended or concluded
  const hackathon = db.getHackathon(hackathonId);

  // Check vote expiration explicitly
  const now = new Date();
  const voteExpiration = new Date(hackathon.vote_expiration);
  if (now >= voteExpiration) {
    return res.status(403).json({
      error: 'voting_expired',
      message: 'Voting period has ended',
      expired_at: hackathon.vote_expiration
    });
  }

  const status = calculateHackathonStatus(hackathon);
  if (status.status === 'upcoming' || status.status === 'active') {
    return res.status(403).json({ error: 'Voting not yet open for judges' });
  }

  // Get categories for this hackathon
  const categories = db.getJudgeCategories(hackathonId);

  // Save category-based votes in transaction
  try {
    db.transaction(() => {
      // votes format: { projectId: { categories: { categoryId: { score, comment } } } }
      for (const [projectId, projectData] of Object.entries(votes)) {
        // Support both old format (single score) and new format (category scores)
        if (projectData.categories) {
          // New format: category-based scoring
          for (const [categoryId, scoreData] of Object.entries(projectData.categories)) {
            const score = typeof scoreData === 'object' ? scoreData.score : scoreData;
            const comment = typeof scoreData === 'object' ? scoreData.comment : null;

            if (score < 1 || score > 10) {
              throw new Error(`Invalid score: ${score} (must be 1-10)`);
            }

            db.addJudgeCategoryVote({
              judge_code_id: judgeCode.id,
              project_id: parseInt(projectId),
              category_id: parseInt(categoryId),
              score: parseInt(score),
              comment: comment || null
            });
          }
        } else {
          // Old format fallback: single score (distribute to all categories equally)
          const score = typeof projectData === 'object' ? projectData.score : projectData;
          const comment = typeof projectData === 'object' ? projectData.comment : null;

          if (score < 1 || score > 10) {
            throw new Error(`Invalid score: ${score} (must be 1-10)`);
          }

          // Add same score to all categories
          for (const category of categories) {
            db.addJudgeCategoryVote({
              judge_code_id: judgeCode.id,
              project_id: parseInt(projectId),
              category_id: category.id,
              score: parseInt(score),
              comment: comment || null
            });
          }
        }
      }

      // Mark code as voted
      db.markJudgeCodeVoted(judgeCode.id);
    })();

    res.json({ success: true, message: 'Votes recorded successfully' });
  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({ error: 'Failed to record votes', details: error.message });
  }
});

module.exports = router;

