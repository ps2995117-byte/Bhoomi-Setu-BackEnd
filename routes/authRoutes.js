const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  requestOtp,
  verifyOtp,
  getMe,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiting for auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/otp/request', authLimiter, requestOtp);
router.post('/otp/verify', authLimiter, verifyOtp);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
