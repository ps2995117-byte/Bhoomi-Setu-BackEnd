const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      unique: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'Please provide a project code'],
      trim: true,
      unique: true,
      uppercase: true,
      maxlength: [50, 'Code cannot exceed 50 characters'],
    },
    type: {
      type: String,
      required: [true, 'Please specify infrastructure project type'],
      enum: [
        'EXPRESSWAY',
        'HIGHWAY',
        'RAILWAY',
        'METRO',
        'AIRPORT',
        'INDUSTRIAL_CORRIDOR',
        'URBAN_INFRA',
      ],
      default: 'EXPRESSWAY',
    },
    authority: {
      type: String,
      required: [true, 'Please specify implementing authority (e.g. NHAI, DFCCIL, NCRTC)'],
      trim: true,
      default: 'NHAI',
    },
    state: {
      type: String,
      required: [true, 'Please specify primary state'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'Please specify primary district'],
      trim: true,
      index: true,
    },
    secondaryDistricts: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    targetCompletionDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['PLANNING', 'ACQUISITION_ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'HALTED'],
      default: 'ACQUISITION_ACTIVE',
    },
    // GeoJSON route geometry or waypoint coordinates for GIS map polyline rendering
    routeGeometry: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        order: { type: Number, default: 0 },
        name: { type: String },
      },
    ],
    budget: {
      type: Number,
      default: 0, // Total estimated compensation budget in INR
    },
    totalAreaRequired: {
      type: Number,
      default: 0, // In acres
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedOfficers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for parcels count
projectSchema.virtual('parcels', {
  ref: 'Parcel',
  localField: '_id',
  foreignField: 'projectId',
  justOne: false,
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
