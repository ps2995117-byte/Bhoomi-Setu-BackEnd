const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  simulateAlert,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications);
router.patch('/:id/read', protect, markAsRead);
router.post('/read-all', protect, markAllAsRead);
router.post('/simulate-alert', protect, simulateAlert);

module.exports = router;
