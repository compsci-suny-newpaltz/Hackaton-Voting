const { requireNP, formatDisplayName } = require('./auth');
const { requireAdmin } = require('./admin');

module.exports = {
  requireNP,
  requireAdmin,
  formatDisplayName
};

