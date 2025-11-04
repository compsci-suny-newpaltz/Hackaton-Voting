const db = require('../db');

/**
 * Log an admin action to the audit log
 */
function logAudit(actorEmail, actionType, targetEntity, details) {
  try {
    db.logAudit(actorEmail, actionType, targetEntity, details);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

module.exports = {
  logAudit
};

