const { addDays } = require('date-fns');

/**
 * Calculate hackathon status based on current time in Eastern Time
 * All comparisons are done in Eastern Time (EST/EDT)
 * Possible statuses: upcoming, active, ended, vote_expired, review-period, concluded, archived
 */
function calculateHackathonStatus(hackathon) {
  // Get current time in Eastern Time
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

  // Convert stored UTC times to Eastern Time for comparison
  const startTime = new Date(new Date(hackathon.start_time).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const endTime = new Date(new Date(hackathon.end_time).toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const voteExpiration = hackathon.vote_expiration
    ? new Date(new Date(hackathon.vote_expiration).toLocaleString('en-US', { timeZone: 'America/New_York' }))
    : addDays(endTime, 7); // Default: 7 days after end
  const reviewEndsAt = hackathon.review_ends_at
    ? new Date(new Date(hackathon.review_ends_at).toLocaleString('en-US', { timeZone: 'America/New_York' }))
    : null;

  // Archived
  if (hackathon.archived) {
    return {
      status: 'archived',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration,
      isPublicResultsVisible: true // Archived hackathons show results
    };
  }

  // If manually concluded
  if (hackathon.concluded_at) {
    return {
      status: 'concluded',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration,
      isPublicResultsVisible: true
    };
  }

  // Review period (after voting expires, before review ends)
  if (reviewEndsAt && now >= voteExpiration && now < reviewEndsAt) {
    return {
      status: 'review-period',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration,
      reviewEndsAt: reviewEndsAt,
      isPublicResultsVisible: false // Results hidden during review
    };
  }

  // Upcoming
  if (now < startTime) {
    return {
      status: 'upcoming',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration,
      isPublicResultsVisible: false
    };
  }

  // Active (submissions open)
  if (now >= startTime && now < endTime) {
    return {
      status: 'active',
      canVote: true,
      canSubmit: true,
      voteExpiration: voteExpiration,
      isPublicResultsVisible: false
    };
  }

  // Ended (submissions closed, voting still open)
  if (now >= endTime && now < voteExpiration) {
    return {
      status: 'ended',
      canVote: true,
      canSubmit: false,
      voteExpiration: voteExpiration,
      isPublicResultsVisible: false
    };
  }

  // Vote expired (no review period or review period ended)
  return {
    status: 'vote_expired',
    canVote: false,
    canSubmit: false,
    voteExpiration: voteExpiration,
    isPublicResultsVisible: !reviewEndsAt || now >= reviewEndsAt // Show results if no review period or review ended
  };
}

/**
 * Check if user can vote on a project
 * Popular voting is always available (no time restrictions)
 * Only restrictions: can't vote on own project, can't vote if concluded (unless keep_popular_vote_open is enabled)
 */
function canVoteOnProject(hackathon, userEmail, project) {
  // Only block if hackathon manually concluded AND keep_popular_vote_open is false
  if (hackathon.concluded_at && !hackathon.keep_popular_vote_open) {
    return { allowed: false, reason: 'hackathon_concluded' };
  }

  // Check if user is team member
  const teamEmails = JSON.parse(project.team_emails || '[]');
  if (teamEmails.map(e => e.toLowerCase()).includes(userEmail.toLowerCase())) {
    return { allowed: false, reason: 'own_project' };
  }

  // Popular voting always available (requires SSO auth via requireNP middleware)
  return { allowed: true };
}

/**
 * Check if project can be edited
 */
function canEditProject(project, hackathon, userEmail, isAdmin = false) {
  // Admins can always edit
  if (isAdmin) {
    return true;
  }
  
  // Must be team member
  const teamEmails = JSON.parse(project.team_emails || '[]');
  if (!teamEmails.map(e => e.toLowerCase()).includes(userEmail.toLowerCase())) {
    return false;
  }
  
  // If admin override enabled, always allow
  if (project.deadline_override_enabled) {
    return true;
  }
  
  // Otherwise, check if hackathon is still active
  const status = calculateHackathonStatus(hackathon);
  return status.status === 'active';
}

module.exports = {
  calculateHackathonStatus,
  canVoteOnProject,
  canEditProject
};
