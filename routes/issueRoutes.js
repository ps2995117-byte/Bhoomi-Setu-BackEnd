const express = require('express');
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
} = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(protect, getIssues)
  .post(protect, createIssue);

router
  .route('/:id')
  .get(protect, getIssueById)
  .patch(protect, updateIssue);

module.exports = router;
