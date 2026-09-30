const express = require('express');
const {
  getExecutiveSummary,
  exportCSVReport,
  analyzeDocumentOCR,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/executive-summary', protect, getExecutiveSummary);
router.get('/export-csv', protect, exportCSVReport);
router.post('/ocr-inspect', protect, analyzeDocumentOCR);

module.exports = router;
