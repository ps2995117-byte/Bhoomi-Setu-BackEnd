const mongoose = require('mongoose');

const STAGES = [
  'STAGE_1_PROJECT_INITIATION',
  'STAGE_2_LAND_IDENTIFICATION',
  'STAGE_3_LAND_SURVEY',
  'STAGE_4_PHYSICAL_VERIFICATION',
  'STAGE_5_ADMINISTRATIVE_PROCESSING',
  'STAGE_6_ACQUISITION_PROCEEDINGS',
  'STAGE_7_COMPENSATION_ASSESSMENT',
  'STAGE_8_AWARD_APPROVAL',
  'STAGE_9_COMPENSATION_PROCESSING',
  'STAGE_10_POSSESSION_ACQUISITION',
  'STAGE_11_COMPLETED',
];

const STAGE_TITLES = {
  STAGE_1_PROJECT_INITIATION: 'Project Initiation & Notification',
  STAGE_2_LAND_IDENTIFICATION: 'Land Identification & Cadastral Mapping',
  STAGE_3_LAND_SURVEY: 'Land Survey & Demarcation',
  STAGE_4_PHYSICAL_VERIFICATION: 'Physical Verification & Ground Truth Audit',
  STAGE_5_ADMINISTRATIVE_PROCESSING: 'Administrative Processing & Revenue Scrutiny',
  STAGE_6_ACQUISITION_PROCEEDINGS: 'Acquisition Proceedings (Sec 11/19 Declaration)',
  STAGE_7_COMPENSATION_ASSESSMENT: 'Compensation Assessment & Valuation',
  STAGE_8_AWARD_APPROVAL: 'Award Inquiry & Administrative Approval',
  STAGE_9_COMPENSATION_PROCESSING: 'Compensation Processing & PFMS Payout',
  STAGE_10_POSSESSION_ACQUISITION: 'Possession Taking & Mutation Entry',
  STAGE_11_COMPLETED: 'Acquisition Completed',
};

const ZONES = ['GREEN', 'YELLOW', 'RED'];

const parcelSchema = new mongoose.Schema(
  {
    parcelId: {
      type: String,
      required: [true, 'Please provide a unique parcel identifier'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    ownerReferenceId: {
      type: String,
      trim: true,
      index: true, // Citizen reference number for easy lookup (e.g. 'REF-HR-00124')
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Parcel must belong to a project'],
      index: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Please specify the primary landowner name'],
      trim: true,
    },
    ownerMobile: {
      type: String,
      trim: true,
      index: true,
    },
    surveyNumber: {
      type: String,
      required: [true, 'Please provide Khasra / Survey Number'],
      trim: true,
    },
    landCategory: {
      type: String,
      enum: ['AGRICULTURAL_IRRIGATED', 'AGRICULTURAL_UNIRRIGATED', 'COMMERCIAL', 'RESIDENTIAL', 'BARREN_GOVT'],
      default: 'AGRICULTURAL_IRRIGATED',
    },
    village: {
      type: String,
      required: [true, 'Please specify village / locality'],
      trim: true,
      index: true,
    },
    tehsil: {
      type: String,
      trim: true,
      default: 'Central Tehsil',
      index: true,
    },
    district: {
      type: String,
      required: [true, 'Please specify district'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'Please specify state'],
      trim: true,
      index: true,
    },
    area: {
      type: Number,
      required: [true, 'Please specify land area'],
      min: [0.001, 'Area must be greater than 0'],
    },
    areaUnit: {
      type: String,
      enum: ['Acres', 'Hectares', 'Sq. Meters', 'Bigha', 'Guntha'],
      default: 'Acres',
    },
    latitude: {
      type: Number,
      required: [true, 'Please provide centroid latitude'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please provide centroid longitude'],
    },
    boundaryCoordinates: [
      {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    ],
    // Current Workflow Stage (PRD Section 9)
    stage: {
      type: String,
      enum: {
        values: STAGES,
        message: 'Invalid workflow stage. Allowed: {VALUES}',
      },
      default: 'STAGE_1_PROJECT_INITIATION',
      index: true,
    },
    // Global 3-State Status (PRD Section 8)
    // GREEN = Completed | YELLOW = In Progress | RED = Government-side Issue
    zone: {
      type: String,
      enum: {
        values: ZONES,
        message: 'Invalid zone. Allowed: {VALUES}',
      },
      default: 'YELLOW',
      index: true,
    },
    statusText: {
      type: String,
      default: 'In Progress', // 'Completed', 'In Progress', 'Government Issue / Hold'
    },
    zoneReason: {
      type: String,
      default: 'Standard government acquisition workflow actively progressing',
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Government Issue Tracking (PRD Section 7 & 8)
    governmentIssue: {
      isFlagged: { type: Boolean, default: false },
      category: {
        type: String,
        enum: [
          'INTER_DEPARTMENTAL_DELAY',
          'SURVEY_RESCRUTINY_ORDERED',
          'REVENUE_RECORD_DISCREPANCY',
          'VALUATION_REASSESSMENT_PENDING',
          'PFMS_TREASURY_CLEARANCE_HOLD',
          'HIGH_COURT_STAY_INQUIRY',
          'ADMINISTRATIVE_BOTTLENECK',
          'COLLECTOR_APPROVAL_PENDING',
        ],
      },
      description: { type: String },
      flaggedAt: { type: Date },
      flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      flaggedByName: { type: String },
      resolvedAt: { type: Date },
      resolutionNotes: { type: String },
    },
    // Compensation Assessment Details (PRD Section 18 & 26)
    compensationDetails: {
      circleRatePerUnit: { type: Number, default: 0 },
      baseLandValue: { type: Number, default: 0 },
      solatiumAmount: { type: Number, default: 0 }, // 100% Solatium under RFCTLARR Act 2013
      additionalAssetsValue: { type: Number, default: 0 }, // Trees/Structures/Tube-wells
      totalCompensationAward: { type: Number, default: 0 },
      awardNumber: { type: String },
      awardDate: { type: Date },
      disbursementStatus: {
        type: String,
        enum: ['ASSESSMENT_PENDING', 'VALUATION_COMPLETED', 'SANCTIONED', 'DISBURSED', 'HELD_IN_ESCROW'],
        default: 'ASSESSMENT_PENDING',
      },
      disbursementTransactionRef: { type: String },
    },
    // Official Government Notifications & Gazette Dispatches
    officialNotices: [
      {
        noticeType: { type: String }, // e.g. 'Section 11(1) Preliminary Notification', 'Section 19 Declaration'
        gazetteRef: { type: String },
        issuedDate: { type: Date, default: Date.now },
        description: { type: String },
        issuingAuthority: { type: String, default: 'District Collector & SLAO' },
      },
    ],
    // Immutable Workflow Progression History
    workflowHistory: [
      {
        stage: { type: String, required: true },
        stageTitle: { type: String },
        status: { type: String, enum: ['COMPLETED', 'IN_PROGRESS', 'GOVERNMENT_ISSUE'], default: 'COMPLETED' },
        startedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
        completedBy: { type: String }, // Officer Name & Designation
        officerRole: { type: String },
        notes: { type: String },
        issueFlagged: { type: Boolean, default: false },
        issueReason: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helper method to automatically calculate 3-state Zone
parcelSchema.methods.recalculateStatus = function () {
  if (this.governmentIssue && this.governmentIssue.isFlagged) {
    this.zone = 'RED';
    this.statusText = 'Government Issue';
  } else if (this.stage === 'STAGE_11_COMPLETED') {
    this.zone = 'GREEN';
    this.statusText = 'Completed';
  } else {
    this.zone = 'YELLOW';
    this.statusText = 'In Progress';
  }
};

const Parcel = mongoose.model('Parcel', parcelSchema);

module.exports = Parcel;
module.exports.STAGES = STAGES;
module.exports.STAGE_TITLES = STAGE_TITLES;
module.exports.ZONES = ZONES;
