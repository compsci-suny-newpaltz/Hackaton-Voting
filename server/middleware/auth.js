require('dotenv').config();

const HYDRA_BASE_URL = process.env.HYDRA_BASE_URL || 'https://hydra.newpaltz.edu';

/**
 * Call Hydra /check with the token. Returns { ok:boolean, data?:object, status:number }.
 */
async function verifyWithHydra(token) {
  if (!token) return { ok: false, status: 401 };
  try {
    const r = await fetch(`${HYDRA_BASE_URL}/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) return { ok: false, status: r.status };
    const data = await r.json();
    return { ok: true, status: 200, data };
  } catch (error) {
    console.error('Hydra verification error:', error);
    return { ok: false, status: 500 };
  }
}

/**
 * Middleware: require New Paltz identity
 * Reads np_access cookie, verifies with Hydra /check, and attaches req.user.
 */
async function requireNP(req, res, next) {
  try {
    const token = req.cookies?.np_access;
    const result = await verifyWithHydra(token);
    if (!result.ok || !result.data?.active) {
      return res.status(401).json({ error: 'Please log in with your New Paltz account.' });
    }
    req.user = result.data;
    next();
  } catch (e) {
    console.error('requireNP error:', e);
    res.status(500).json({ error: 'Verification failed.' });
  }
}

/**
 * Format display name from Hydra user data
 */
function formatDisplayName(user) {
  const firstName = user.given_name || '';
  const lastInitial = user.family_name ? user.family_name[0] + '.' : '';
  return `${firstName} ${lastInitial}`.trim();
}

module.exports = {
  verifyWithHydra,
  requireNP,
  formatDisplayName
};

