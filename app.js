'use strict';

const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');

const authRoutes     = require('./src/routes/auth');
const referralRoutes = require('./src/routes/referral');
const healthRoutes   = require('./src/routes/health');
const { authLimiter, apiLimiter } = require('./src/middleware/rateLimiter');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health check (no rate limit)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/referral', apiLimiter,  referralRoutes);

// Catch-all: serve index.html for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only start listening when run directly (not during tests)
if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('ERROR: JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Evodron Referral server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
