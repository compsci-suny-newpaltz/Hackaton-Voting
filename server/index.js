require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');
const { ensureUploadDir } = require('./utils/file-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for correct URL generation
app.set('trust proxy', 1);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
ensureUploadDir();

// Serve static files
app.use('/hackathons/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve built client at the base path so Vite assets resolve correctly (base '/hackathons/')
app.use('/hackathons', express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create router for /hackathons base path
const router = express.Router();

// Auth status endpoint (optional auth - doesn't require login)
router.get('/api/auth/status', async (req, res) => {
  try {
    const { verifyWithHydra } = require('./middleware/auth');
    const { isAdmin } = require('./middleware/admin');
    const token = req.cookies?.np_access;
    
    if (!token) {
      return res.json({ authenticated: false, user: null, isAdmin: false });
    }
    
    const result = await verifyWithHydra(token);
    if (!result.ok || !result.data?.active) {
      return res.json({ authenticated: false, user: null, isAdmin: false });
    }
    
    const user = result.data;
    
    // Wrap isAdmin check in try-catch in case database isn't available
    let adminStatus = false;
    try {
      adminStatus = isAdmin(user);
    } catch (error) {
      console.warn('Could not check admin status (database may not be initialized):', error.message);
      // Default to false if database check fails
      adminStatus = false;
    }
    
    res.json({
      authenticated: true,
      user: {
        email: user.email,
        display_name: user.name || user.email,
        roles: user.roles || []
      },
      isAdmin: adminStatus
    });
  } catch (error) {
    console.error('Auth status error:', error);
    res.json({ authenticated: false, user: null, isAdmin: false });
  }
});

// API routes
router.use('/api/hackathons', require('./routes/hackathons'));
router.use('/api', require('./routes/projects'));
router.use('/api', require('./routes/voting'));
router.use('/api', require('./routes/comments'));
router.use('/api', require('./routes/results'));
router.use('/api/admin', require('./routes/admin'));

// Mount API router at /hackathons
app.use('/hackathons', router);

// SPA fallback: send index.html for any non-API route under /hackathons
app.get('/hackathons/*', (req, res, next) => {
  // Let API and uploads continue down the chain
  // req.path includes the full path like /hackathons/api/... or /hackathons/3/projects/1
  const path = req.path;
  if (path.startsWith('/hackathons/api') || path.startsWith('/hackathons/uploads')) {
    return next();
  }
  res.sendFile(require('path').join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Hackathon Management System running on port ${PORT}`);
  console.log(`Base path: /hackathons`);
  console.log(`Database: ${process.env.DATABASE_URL || './hackathon.db'}`);
  
  // Test database connection
  try {
    const db = require('./db');
    db.getHackathons();
    console.log('✓ Database connection successful');
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    console.error('  Make sure better-sqlite3 is properly installed and the database is initialized.');
    console.error('  Run: npm rebuild better-sqlite3 (after installing Windows SDK)');
    console.error('  Then run: npm run init-db');
  }
});

