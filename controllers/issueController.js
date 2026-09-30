const Issue = require('../models/Issue');
const Parcel = require('../models/Parcel');
const { recalculateParcelZone } = require('../services/zoneService');
const { logAction } = require('../services/auditService');

// @desc    Raise an issue or dispute on a parcel
// @route   POST /api/issues
// @access  Private (Landowner / Officer / Admin)
const createIssue = async (req, res, next) => {
  try {
    const { parcelId, type, category, description, assignedOfficer } = req.body;

    if (!parcelId || !type || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide parcel ID, issue type, category, and description',
      });
    }

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: 'Associated land parcel not found',
      });
    }

    const issue = await Issue.create({
      parcelId: parcel._id,
      projectId: parcel.projectId,
      type,
      category,
      description,
      raisedBy: req.user?.id,
      raisedByRole: req.user?.role || 'LANDOWNER',
      status: 'OPEN',
      assignedOfficer: assignedOfficer || parcel.assignedOfficer,
    });

    // Automatically recalculate and apply zone changes (e.g. PARCEL_DISPUTE -> RED)
    const updatedParcel = await recalculateParcelZone(parcel._id);

    await logAction({
      actor: req.user,
      action: 'ISSUE_RAISED',
      entityType: 'Issue',
      entityId: issue._id,
      newValue: {
        type: issue.type,
        category: issue.category,
        parcelId: parcel.parcelId,
        newParcelZone: updatedParcel.zone,
      },
      note: `Issue '${issue.type}' raised on parcel ${parcel.parcelId}. Parcel transitioned to ${updatedParcel.zone} zone`,
    });

    res.status(201).json({
      success: true,
      message: 'Issue registered successfully',
      issue,
      parcel: updatedParcel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all issues with filters (Triage Queue)
// @route   GET /api/issues
// @access  Private (Officer / Admin)
const getIssues = async (req, res, next) => {
  try {
    const { status, type, projectId, parcelId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (projectId) query.projectId = projectId;
    if (parcelId) query.parcelId = parcelId;

    // Strict Role-Based Data Isolation (PRD Section 7)
    if (req.user?.role === 'LANDOWNER') {
      const myParcels = await Parcel.find({
        $or: [{ ownerId: req.user.id }, { ownerMobile: req.user.mobile }],
      }).select('_id');
      const myParcelIds = myParcels.map((p) => p._id);
      query.parcelId = { $in: myParcelIds };
    }

    const issues = await Issue.find(query)
      .populate('parcelId', 'parcelId surveyNumber village district area zone stage ownerName ownerMobile')
      .populate('projectId', 'name code type authority')
      .populate('raisedBy', 'name role email')
      .populate('assignedOfficer', 'name role email')
      .sort({ createdAt: -1 })
      .lean();

    // Summary count
    const stats = {
      TOTAL: issues.length,
      OPEN: issues.filter((i) => i.status === 'OPEN').length,
      UNDER_REVIEW: issues.filter((i) => i.status === 'UNDER_REVIEW').length,
      RESOLVED: issues.filter((i) => i.status === 'RESOLVED').length,
      ESCALATED: issues.filter((i) => i.status === 'ESCALATED').length,
      RED_DISPUTES: issues.filter((i) =>
        ['PARCEL_DISPUTE', 'OWNERSHIP_DISPUTE', 'CRITICAL_DISPUTE'].includes(i.type)
      ).length,
      ORANGE_ATTENTION: issues.filter((i) =>
        ['DOCUMENT_REJECTION', 'COMPENSATION_OBJECTION', 'BANK_FAILURE', 'PAYMENT_FAILURE'].includes(i.type)
      ).length,
    };

    res.status(200).json({
      success: true,
      count: issues.length,
      stats,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue detail
// @route   GET /api/issues/:id
// @access  Private
const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('parcelId')
      .populate('projectId')
      .populate('raisedBy', 'name role email')
      .populate('assignedOfficer', 'name role email');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue record not found',
      });
    }

    res.status(200).json({
      success: true,
      issue,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update issue status & resolution notes (triggers zone recalculation)
// @route   PATCH /api/issues/:id
// @access  Private (Officer / Admin)
const updateIssue = async (req, res, next) => {
  try {
    const { status, resolutionNotes, assignedOfficer } = req.body;

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found',
      });
    }

    const previousStatus = issue.status;

    if (status) issue.status = status;
    if (resolutionNotes !== undefined) issue.resolutionNotes = resolutionNotes;
    if (assignedOfficer) issue.assignedOfficer = assignedOfficer;

    if (status === 'RESOLVED') {
      issue.resolvedAt = new Date();
    }

    await issue.save();

    // Recalculate the associated parcel's zone
    const updatedParcel = await recalculateParcelZone(issue.parcelId);

    await logAction({
      actor: req.user,
      action: 'ISSUE_UPDATED',
      entityType: 'Issue',
      entityId: issue._id,
      oldValue: { status: previousStatus },
      newValue: { status: issue.status, resolutionNotes: issue.resolutionNotes },
      note: `Issue ${issue.type} updated to ${issue.status}. Parcel zone re-evaluated to ${updatedParcel?.zone}`,
    });

    res.status(200).json({
      success: true,
      message: `Issue updated to ${issue.status}`,
      issue,
      parcel: updatedParcel,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
};
