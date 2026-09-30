const express = require('express');
const {
  upload,
  uploadDocument,
  getParcelDocuments,
  attachSampleDocuments,
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/parcel/:parcelId', protect, getParcelDocuments);
router.post('/sample-attach', protect, attachSampleDocuments);

module.exports = router;
