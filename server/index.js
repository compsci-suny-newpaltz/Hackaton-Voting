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
app.use('/hackathons/static', express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create router for /hackathons base path
const router = express.Router();

// API routes
router.use('/api/hackathons', require('./routes/hackathons'));
router.use('/api', require('./routes/projects'));
router.use('/api', require('./routes/voting'));
router.use('/api', require('./routes/comments'));
router.use('/api/admin', require('./routes/admin'));

// Mount router at /hackathons
app.use('/hackathons', router);

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
});

