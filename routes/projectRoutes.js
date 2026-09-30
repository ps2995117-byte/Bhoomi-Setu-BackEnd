const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(optionalProtect, getProjects)
  .post(protect, createProject);

router
  .route('/:id')
  .get(optionalProtect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

module.exports = router;
