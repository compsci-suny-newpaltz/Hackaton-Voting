const crypto = require('crypto');

/**
 * Generates a cryptographically secure random code for judge authentication
 * @returns {string} URL-safe base64 encoded random string
 */
function generateJudgeCode() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generates a complete judge voting link for a specific hackathon
 * @param {number} hackathonId - The ID of the hackathon
 * @param {string} code - The judge's unique authentication code
 * @returns {string} Complete URL to the judge voting page
 */
function generateJudgeLink(hackathonId, code) {
  const baseUrl = process.env.BASE_URL || 'https://hydra.newpaltz.edu';
  const basePath = process.env.APP_BASE_PATH || '/hackathons';
  return `${baseUrl}${basePath}/${hackathonId}/judgevote?code=${code}`;
}

module.exports = {
  generateJudgeCode,
  generateJudgeLink
};

