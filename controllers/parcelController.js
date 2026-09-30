const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const { logAction } = require('../services/auditService');
const { getJurisdictionFilter } = require('../middleware/authMiddleware');
const { STAGES, STAGE_TITLES } = require('../models/Parcel');

// Helper to get next stage index
const getNextStage = (currentStage) => {
  const currentIndex = STAGES.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGES.length - 1) {
    return 'STAGE_11_COMPLETED';
  }
  return STAGES[currentIndex + 1];
};

// @desc    Get all parcels filtered strictly by jurisdiction (PRD Section 10-14)
// @route   GET /api/parcels
// @access  Private (Officer / Admin) / Optional Protect
const getParcels = async (req, res, next) => {
  try {
    const jurisdictionQuery = getJurisdictionFilter(req.user, 'parcel');

    const query = { ...jurisdictionQuery };

    // Query parameter filters
    if (req.query.projectId) query.projectId = req.query.projectId;
    if (req.query.zone) query.zone = req.query.zone;
    if (req.query.stage) query.stage = req.query.stage;
    if (req.query.district && (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'STATE_ADMIN')) {
      query.district = req.query.district;
    }
    if (req.query.village) query.village = req.query.village;
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { parcelId: searchRegex },
        { ownerName: searchRegex },
        { surveyNumber: searchRegex },
        { village: searchRegex },
        { ownerReferenceId: searchRegex },
      ];
    }

    const parcels = await Parcel.find(query)
      .populate('projectId', 'name code authority state district')
      .populate('assignedOfficer', 'name designation role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: parcels.length,
      userJurisdiction: {
        role: req.user?.role || 'PUBLIC',
        state: req.user?.state || 'All',
        district: req.user?.district || 'All',
        village: req.user?.village || 'All',
      },
      parcels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single parcel by ID with full workflow history & notices
// @route   GET /api/parcels/:id
// @access  Private / Optional Protect
const getParcelById = async (req, res, next) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate('projectId')
      .populate('assignedOfficer', 'name designation role mobile email')
      .lean();

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    // Jurisdiction Access Guard (PRD Section 34)
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'STATE_ADMIN' && req.user.state !== 'All' && parcel.state !== req.user.state) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: Parcel is outside ${req.user.state}`,
        });
      }
      if (req.user.role === 'DISTRICT_OFFICER' && req.user.district !== 'All' && parcel.district !== req.user.district) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: Parcel is outside ${req.user.district}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      parcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Advance parcel to next lifecycle stage (Offline Action Workflow - PRD Section 5, 6, 7)
// @route   POST /api/parcels/:id/advance-stage
// @access  Private (Officer / Admin)
const advanceStage = async (req, res, next) => {
  try {
    const parcel = await Parcel.findById(req.params.id);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel record not found',
      });
    }

    const { targetStage, notes } = req.body;
    const oldStage = parcel.stage;
    const newStage = targetStage || getNextStage(parcel.stage);

    parcel.stage = newStage;

    // Recalculate status (if reaching completed stage, set GREEN, else YELLOW unless government issue exists)
    if (newStage === 'STAGE_11_COMPLETED') {
      parcel.zone = 'GREEN';
      parcel.statusText = 'Completed';
      parcel.zoneReason = 'Land acquisition process and mutation completed successfully';
    } else if (parcel.governmentIssue?.isFlagged) {
      parcel.zone = 'RED';
      parcel.statusText = 'Government Issue';
    } else {
      parcel.zone = 'YELLOW';
      parcel.statusText = 'In Progress';
      parcel.zoneReason = `Workflow advanced to ${STAGE_TITLES[newStage] || newStage}`;
    }

    // Record in immutable workflow history (PRD Section 29)
    parcel.workflowHistory.push({
      stage: newStage,
      stageTitle: STAGE_TITLES[newStage] || newStage,
      status: parcel.zone === 'GREEN' ? 'COMPLETED' : 'IN_PROGRESS',
      startedAt: new Date(),
      completedAt: newStage === 'STAGE_11_COMPLETED' ? new Date() : undefined,
      completedBy: `${req.user.name} (${req.user.designation || req.user.role})`,
      officerRole: req.user.role,
      notes: notes || `Officer completed offline stage requirements and advanced case.`,
    });

    await parcel.save();

    await logAction({
      actor: req.user,
      action: 'WORKFLOW_STAGE_ADVANCED',
      entityType: 'Parcel',
      entityId: parcel._id,
      oldValue: { stage: oldStage },
      newValue: { stage: newStage, zone: parcel.zone },
      note: `Stage transitioned from '${oldStage}' to '${newStage}' by ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: `Parcel successfully advanced to ${STAGE_TITLES[newStage] || newStage}`,
      parcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flag a government-side issue / administrative delay (PRD Section 7 & 8)
// @route   POST /api/parcels/:id/flag-issue
// @access  Private (Officer / Admin)
const flagGovernmentIssue = async (req, res, next) => {
  try {
    const { category, description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clear description of the government-side issue / delay',
      });
    }

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    parcel.governmentIssue = {
      isFlagged: true,
      category: category || 'ADMINISTRATIVE_BOTTLENECK',
      description,
      flaggedAt: new Date(),
      flaggedBy: req.user._id,
      flaggedByName: `${req.user.name} (${req.user.designation || req.user.role})`,
    };

    parcel.zone = 'RED';
    parcel.statusText = 'Government Issue';
    parcel.zoneReason = `Government Issue: ${description}`;

    parcel.workflowHistory.push({
      stage: parcel.stage,
      stageTitle: STAGE_TITLES[parcel.stage] || parcel.stage,
      status: 'GOVERNMENT_ISSUE',
      startedAt: new Date(),
      completedBy: `${req.user.name} (${req.user.designation || req.user.role})`,
      officerRole: req.user.role,
      issueFlagged: true,
      issueReason: description,
      notes: `Government-side delay flagged: ${description}`,
    });

    await parcel.save();

    await logAction({
      actor: req.user,
      action: 'GOVERNMENT_ISSUE_FLAGGED',
      entityType: 'Parcel',
      entityId: parcel._id,
      newValue: { issue: description, category },
      note: `Government-side bottleneck flagged on parcel ${parcel.parcelId}: ${description}`,
    });

    res.status(200).json({
      success: true,
      message: 'Government-side issue flagged. Case marked as RED (Administrative Delay).',
      parcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a government-side issue / bottleneck (PRD Section 7)
// @route   POST /api/parcels/:id/resolve-issue
// @access  Private (Officer / Admin)
const resolveGovernmentIssue = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;

    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Parcel not found',
      });
    }

    if (parcel.governmentIssue) {
      parcel.governmentIssue.isFlagged = false;
      parcel.governmentIssue.resolvedAt = new Date();
      parcel.governmentIssue.resolutionNotes = resolutionNotes || 'Administrative issue resolved by competent authority.';
    }

    if (parcel.stage === 'STAGE_11_COMPLETED') {
      parcel.zone = 'GREEN';
      parcel.statusText = 'Completed';
    } else {
      parcel.zone = 'YELLOW';
      parcel.statusText = 'In Progress';
    }

    parcel.zoneReason = `Issue resolved: ${resolutionNotes || 'Workflow resumed'}`;

    parcel.workflowHistory.push({
      stage: parcel.stage,
      stageTitle: STAGE_TITLES[parcel.stage] || parcel.stage,
      status: parcel.zone === 'GREEN' ? 'COMPLETED' : 'IN_PROGRESS',
      startedAt: new Date(),
      completedBy: `${req.user.name} (${req.user.designation || req.user.role})`,
      officerRole: req.user.role,
      notes: `Resolution: ${resolutionNotes || 'Government-side issue resolved.'}`,
    });

    await parcel.save();

    await logAction({
      actor: req.user,
      action: 'GOVERNMENT_ISSUE_RESOLVED',
      entityType: 'Parcel',
      entityId: parcel._id,
      note: `Government issue resolved on parcel ${parcel.parcelId}: ${resolutionNotes || 'Cleared'}`,
    });

    res.status(200).json({
      success: true,
      message: 'Government-side issue successfully resolved. Case returned to active workflow.',
      parcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new parcel under a project
// @route   POST /api/parcels
// @access  Private (Officer / Admin)
const createParcel = async (req, res, next) => {
  try {
    const {
      parcelId,
      projectId,
      ownerName,
      ownerMobile,
      surveyNumber,
      village,
      tehsil,
      district,
      state,
      area,
      areaUnit,
      latitude,
      longitude,
      landCategory,
      compensationDetails,
    } = req.body;

    if (!parcelId || !projectId || !ownerName || !surveyNumber || !village || !district || !state || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory parcel details (ID, owner, survey number, location)',
      });
    }

    const existingParcel = await Parcel.findOne({ parcelId: parcelId.toUpperCase() });
    if (existingParcel) {
      return res.status(400).json({
        success: false,
        message: `Parcel with ID ${parcelId.toUpperCase()} already exists in registry`,
      });
    }

    const parcel = await Parcel.create({
      parcelId: parcelId.toUpperCase(),
      ownerReferenceId: `REF-${district.substring(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`,
      projectId,
      ownerName,
      ownerMobile,
      surveyNumber,
      village,
      tehsil: tehsil || 'Central Tehsil',
      district,
      state,
      area: Number(area) || 1,
      areaUnit: areaUnit || 'Acres',
      latitude: Number(latitude),
      longitude: Number(longitude),
      landCategory: landCategory || 'AGRICULTURAL_IRRIGATED',
      stage: 'STAGE_1_PROJECT_INITIATION',
      zone: 'YELLOW',
      statusText: 'In Progress',
      zoneReason: 'Project initiated and land parcel mapped into command center',
      assignedOfficer: req.user?._id,
      compensationDetails: compensationDetails || {},
      workflowHistory: [
        {
          stage: 'STAGE_1_PROJECT_INITIATION',
          stageTitle: STAGE_TITLES['STAGE_1_PROJECT_INITIATION'],
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          completedBy: `${req.user?.name || 'System'} (${req.user?.designation || 'Registry'})`,
          notes: 'Parcel cadastral mapping registered in Bhoomi Setu.',
        },
      ],
    });

    await logAction({
      actor: req.user,
      action: 'PARCEL_CREATED',
      entityType: 'Parcel',
      entityId: parcel._id,
      newValue: { parcelId: parcel.parcelId, ownerName: parcel.ownerName },
      note: `Parcel '${parcel.parcelId}' created by ${req.user?.name}`,
    });

    res.status(201).json({
      success: true,
      message: 'Parcel created successfully',
      parcel,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getParcels,
  getParcelById,
  createParcel,
  advanceStage,
  flagGovernmentIssue,
  resolveGovernmentIssue,
};
