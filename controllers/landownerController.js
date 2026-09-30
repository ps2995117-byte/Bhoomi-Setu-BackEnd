const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const { STAGES, STAGE_TITLES } = require('../models/Parcel');

// @desc    Citizen Landowner lookup by Parcel ID, Reference Number, or Mobile (PRD Section 25 & 26)
// @route   GET /api/landowner/lookup/:identifier
// @access  Public / Citizen
const lookupParcel = async (req, res, next) => {
  try {
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Parcel ID, Khasra Number, or Reference ID',
      });
    }

    const cleanId = identifier.trim();

    const parcel = await Parcel.findOne({
      $or: [
        { parcelId: cleanId.toUpperCase() },
        { ownerReferenceId: cleanId.toUpperCase() },
        { surveyNumber: cleanId },
        { ownerMobile: cleanId },
      ],
    })
      .populate('projectId', 'name code type authority state district description status')
      .populate('assignedOfficer', 'name designation department')
      .lean();

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: `No land acquisition record found for reference '${identifier}'. Please verify your Reference ID or Khasra Number.`,
      });
    }

    // Build complete 11-stage progress tracker
    const currentStageIndex = STAGES.indexOf(parcel.stage);

    const fullStageTimeline = STAGES.map((stageKey, idx) => {
      let stageStatus = 'UPCOMING';
      if (idx < currentStageIndex || (parcel.stage === 'STAGE_11_COMPLETED')) {
        stageStatus = 'COMPLETED';
      } else if (idx === currentStageIndex) {
        stageStatus = parcel.zone === 'RED' ? 'GOVERNMENT_ISSUE' : 'IN_PROGRESS';
      }

      // Check if there is specific workflow history for this stage
      const historyItem = parcel.workflowHistory?.find((h) => h.stage === stageKey);

      return {
        stageKey,
        stageNumber: idx + 1,
        title: STAGE_TITLES[stageKey] || stageKey,
        status: stageStatus,
        completedAt: historyItem?.completedAt,
        completedBy: historyItem?.completedBy,
        notes: historyItem?.notes,
        isCurrent: idx === currentStageIndex,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        parcel: {
          _id: parcel._id,
          parcelId: parcel.parcelId,
          ownerReferenceId: parcel.ownerReferenceId,
          ownerName: parcel.ownerName,
          surveyNumber: parcel.surveyNumber,
          landCategory: parcel.landCategory,
          village: parcel.village,
          tehsil: parcel.tehsil,
          district: parcel.district,
          state: parcel.state,
          area: parcel.area,
          areaUnit: parcel.areaUnit,
          latitude: parcel.latitude,
          longitude: parcel.longitude,
          stage: parcel.stage,
          stageTitle: STAGE_TITLES[parcel.stage] || parcel.stage,
          zone: parcel.zone,
          statusText: parcel.statusText,
          zoneReason: parcel.zoneReason,
          updatedAt: parcel.updatedAt,
        },
        project: parcel.projectId,
        compensationDetails: parcel.compensationDetails || {},
        officialNotices: parcel.officialNotices || [],
        timeline: fullStageTimeline,
        competentAuthority: {
          office: `Office of the Special Land Acquisition Officer (SLAO)`,
          district: parcel.district,
          state: parcel.state,
          assignedOfficer: parcel.assignedOfficer ? `${parcel.assignedOfficer.name} (${parcel.assignedOfficer.designation})` : 'District SLAO Desk',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen lookup for logged-in landowner
// @route   GET /api/landowner/me
// @access  Private (Landowner)
const getMyParcels = async (req, res, next) => {
  try {
    const parcels = await Parcel.find({
      $or: [
        { ownerId: req.user._id },
        { ownerMobile: req.user.mobile },
      ],
    })
      .populate('projectId')
      .lean();

    res.status(200).json({
      success: true,
      count: parcels.length,
      parcels,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  lookupParcel,
  getMyParcels,
};
