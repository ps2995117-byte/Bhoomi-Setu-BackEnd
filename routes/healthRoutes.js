const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get API & Database health status
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    message: 'BHOOMI-SETU API is running',
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

module.exports = router;
