const express = require('express');
const { getDashboardMetrics } = require('../controllers/officerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard-metrics', protect, getDashboardMetrics);

module.exports = router;
