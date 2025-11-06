const { addDays } = require('date-fns');

/**
 * Calculate hackathon status based on current time
 */
function calculateHackathonStatus(hackathon) {
  const now = new Date();
  const startTime = new Date(hackathon.start_time);
  const endTime = new Date(hackathon.end_time);
  const voteExpiration = hackathon.vote_expiration 
    ? new Date(hackathon.vote_expiration)
    : addDays(new Date(hackathon.end_time), 7); // Default: 7 days after end
  
  // If manually concluded
  if (hackathon.concluded_at) {
    return {
      status: 'concluded',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration
    };
  }
  
  // Upcoming
  if (now < startTime) {
    return {
      status: 'upcoming',
      canVote: false,
      canSubmit: false,
      voteExpiration: voteExpiration
    };
  }
  
  // Active
  if (now >= startTime && now < endTime) {
    return {
      status: 'active',
      canVote: true,
      canSubmit: true,
      voteExpiration: voteExpiration
    };
  }
  
  // Ended (but voting still open)
  if (now >= endTime && now < voteExpiration) {
    return {
      status: 'ended',
      canVote: true,
      canSubmit: false,
      voteExpiration: voteExpiration
    };
  }
  
  // Vote expired
  return {
    status: 'vote_expired',
    canVote: false,
    canSubmit: false,
    voteExpiration: voteExpiration
  };
}

/**
 * Check if user can vote on a project
 */
function canVoteOnProject(hackathon, userEmail, project) {
  const status = calculateHackathonStatus(hackathon);
  
  // Voting closed
  if (status.status === 'concluded' || status.status === 'vote_expired') {
    return { allowed: false, reason: status.status === 'concluded' ? 'hackathon_concluded' : 'voting_expired' };
  }
  
  // Not started yet
  if (status.status === 'upcoming') {
    return { allowed: false, reason: 'not_started' };
  }
  
  // Check if user is team member
  const teamEmails = JSON.parse(project.team_emails || '[]');
  if (teamEmails.map(e => e.toLowerCase()).includes(userEmail.toLowerCase())) {
    return { allowed: false, reason: 'own_project' };
  }
  
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

