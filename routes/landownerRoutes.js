const express = require('express');
const {
  lookupParcel,
  getMyParcels,
} = require('../controllers/landownerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public / Citizen direct lookup by Parcel ID, Khasra, or Reference ID
router.get('/lookup/:identifier', lookupParcel);

// Protected Citizen lookup if logged in
router.get('/my-parcels', protect, getMyParcels);

module.exports = router;
