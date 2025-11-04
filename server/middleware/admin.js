const db = require('../db');

/**
 * Check if user is an admin
 * - Hardcoded: gopeen1@newpaltz.edu
 * - Auto-admin: Any user with faculty role
 * - Whitelist: Check database
 */
function isAdmin(user) {
  if (!user || !user.email) return false;
  
  const email = user.email.toLowerCase();
  const roles = (user.roles || []).map(r => r.toLowerCase());
  
  // Hardcoded super admin
  if (email === 'gopeen1@newpaltz.edu') return true;
  if (email === 'manzim1@newpaltz.edu') return true;

  
  // Faculty are auto-admins
  if (roles.includes('faculty')) return true;
  
  // Check whitelist database (with error handling)
  try {
    return db.isAdmin(email);
  } catch (error) {
    // If database isn't available, only check hardcoded and faculty
    console.warn('Database unavailable for admin check, using fallback logic:', error.message);
    return false;
  }
}

/**
 * Middleware: require admin access
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

module.exports = {
  isAdmin,
  requireAdmin
};

