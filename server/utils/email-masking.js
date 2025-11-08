/**
 * Email masking utility - DISABLED
 * All emails are now shown in full
 */

/**
 * No-op: returns email unchanged
 */
function maskEmail(email) {
  return email;
}

/**
 * No-op: always returns false (never mask)
 */
function shouldMaskEmail(userEmail, projectTeamEmails = [], isAdmin = false) {
  return false;
}

/**
 * No-op: returns project unchanged
 */
function maskProjectEmails(project, userEmail = null, isAdmin = false) {
  return project;
}

/**
 * No-op: returns comment unchanged
 */
function maskCommentEmail(comment, userEmail = null, projectTeamEmails = [], isAdmin = false) {
  return comment;
}

module.exports = {
  maskEmail,
  shouldMaskEmail,
  maskProjectEmails,
  maskCommentEmail
};
