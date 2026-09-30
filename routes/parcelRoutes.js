const express = require('express');
const {
  createParcel,
  getParcels,
  getParcelById,
  advanceStage,
  flagGovernmentIssue,
  resolveGovernmentIssue,
} = require('../controllers/parcelController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(optionalProtect, getParcels)
  .post(protect, createParcel);

router
  .route('/:id')
  .get(optionalProtect, getParcelById);

// Offline Workflow Progression & Stage Actions (PRD Section 5, 6, 7)
router.post('/:id/advance-stage', protect, advanceStage);
router.post('/:id/flag-issue', protect, flagGovernmentIssue);
router.post('/:id/resolve-issue', protect, resolveGovernmentIssue);

module.exports = router;
