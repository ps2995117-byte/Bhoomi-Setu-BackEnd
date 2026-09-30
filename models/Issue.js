const mongoose = require('mongoose');

const ISSUE_TYPES = [
  'PARCEL_DISPUTE',
  'OWNERSHIP_DISPUTE',
  'CRITICAL_DISPUTE',
  'DOCUMENT_REJECTION',
  'COMPENSATION_OBJECTION',
  'BANK_FAILURE',
  'PAYMENT_FAILURE',
];

const issueSchema = new mongoose.Schema(
  {
    parcelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parcel',
      required: [true, 'Issue must be associated with a parcel'],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Issue must be associated with a project'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ISSUE_TYPES,
        message: 'Invalid issue type. Allowed: {VALUES}',
      },
      required: [true, 'Please specify the issue type'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please specify the issue category'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide an issue description'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    raisedByRole: {
      type: String,
      enum: ['LANDOWNER', 'PROJECT_OFFICER', 'DISTRICT_OFFICER', 'STATE_ADMIN', 'SUPER_ADMIN', 'SYSTEM'],
      default: 'LANDOWNER',
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED'],
      default: 'OPEN',
      index: true,
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;
