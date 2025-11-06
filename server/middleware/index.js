const { requireNP, formatDisplayName } = require('./auth');
const { requireAdmin, isAdmin } = require('./admin');

module.exports = {
  requireNP,
  requireAdmin,
  isAdmin,
  formatDisplayName
};

