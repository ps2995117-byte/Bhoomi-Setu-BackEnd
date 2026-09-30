const mongoose = require('mongoose');

const DOC_TYPES = [
  'IDENTITY_PROOF',
  'OWNERSHIP_DEED',
  'LAND_RECORD_KHASRA',
  'BANK_PASSBOOK',
  'OTHER',
];

const DOC_STATUSES = [
  'NOT_UPLOADED',
  'UPLOADED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'RESUBMISSION_REQUIRED',
];

const documentSchema = new mongoose.Schema(
  {
    parcelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parcel',
      required: [true, 'Document must be linked to a parcel'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ownerMobile: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: DOC_TYPES,
        message: 'Invalid document type. Allowed: {VALUES}',
      },
      required: [true, 'Document type is required'],
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
    },
    fileName: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    status: {
      type: String,
      enum: {
        values: DOC_STATUSES,
        message: 'Invalid document status. Allowed: {VALUES}',
      },
      default: 'NOT_UPLOADED',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
