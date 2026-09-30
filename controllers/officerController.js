const Parcel = require('../models/Parcel');
const Project = require('../models/Project');
const AuditLog = require('../models/AuditLog');
const { getJurisdictionFilter } = require('../middleware/authMiddleware');
const { STAGE_TITLES } = require('../models/Parcel');

// @desc    Get officer role-tailored dashboard metrics and queues (PRD Section 15 & 19)
// @route   GET /api/officer/dashboard-metrics
// @access  Private (Officer / Admin)
const getDashboardMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const projectFilter = getJurisdictionFilter(user, 'project');
    const parcelFilter = getJurisdictionFilter(user, 'parcel');

    // 1. Fetch assigned projects in officer jurisdiction
    const projects = await Project.find(projectFilter).select('_id name code authority state district secondaryDistricts budget totalAreaRequired').lean();
    const projectIds = projects.map((p) => p._id);

    // 2. Fetch all parcels in officer jurisdiction
    const combinedParcelFilter = {
      ...parcelFilter,
      projectId: { $in: projectIds },
    };

    const parcels = await Parcel.find(combinedParcelFilter)
      .populate('projectId', 'name code state district')
      .sort({ updatedAt: -1 })
      .lean();

    // 3. Status Breakdown (3-State System: 🟢 Green, 🟡 Yellow, 🔴 Red)
    const statusCounts = {
      GREEN: 0,  // Completed
      YELLOW: 0, // In Progress
      RED: 0,    // Government Issues
    };

    let totalAcquiredArea = 0;
    let totalAssignedArea = 0;
    let totalCompensationAwarded = 0;

    const pendingActionsQueue = [];
    const governmentIssuesQueue = [];

    parcels.forEach((p) => {
      if (statusCounts[p.zone] !== undefined) {
        statusCounts[p.zone]++;
      } else {
        statusCounts.YELLOW++;
      }

      totalAssignedArea += p.area || 0;
      if (p.zone === 'GREEN' || p.stage === 'STAGE_11_COMPLETED') {
        totalAcquiredArea += p.area || 0;
      }

      if (p.compensationDetails?.totalCompensationAward) {
        totalCompensationAwarded += p.compensationDetails.totalCompensationAward;
      }

      // Government issues queue
      if (p.zone === 'RED' || p.governmentIssue?.isFlagged) {
        governmentIssuesQueue.push({
          _id: p._id,
          parcelId: p.parcelId,
          ownerName: p.ownerName,
          surveyNumber: p.surveyNumber,
          village: p.village,
          district: p.district,
          stage: p.stage,
          stageTitle: STAGE_TITLES[p.stage] || p.stage,
          projectName: p.projectId?.name || 'Assigned Project',
          issueCategory: p.governmentIssue?.category || 'ADMINISTRATIVE_BOTTLENECK',
          issueDescription: p.governmentIssue?.description || p.zoneReason || 'Government-side administrative delay',
          flaggedAt: p.governmentIssue?.flaggedAt || p.updatedAt,
          flaggedByName: p.governmentIssue?.flaggedByName || 'Assigned Authority',
        });
      }

      // In-Progress pending workflow actions
      if (p.zone === 'YELLOW' && p.stage !== 'STAGE_11_COMPLETED') {
        pendingActionsQueue.push({
          _id: p._id,
          parcelId: p.parcelId,
          ownerName: p.ownerName,
          surveyNumber: p.surveyNumber,
          village: p.village,
          district: p.district,
          area: p.area,
          areaUnit: p.areaUnit,
          stage: p.stage,
          stageTitle: STAGE_TITLES[p.stage] || p.stage,
          projectName: p.projectId?.name || 'Assigned Project',
          updatedAt: p.updatedAt,
        });
      }
    });

    // 4. Fetch recent audit logs within jurisdiction
    const recentActivity = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const overallProgress =
      parcels.length > 0
        ? Math.round((statusCounts.GREEN / parcels.length) * 100)
        : 0;

    res.status(200).json({
      success: true,
      jurisdiction: {
        officerName: user.name,
        role: user.role,
        designation: user.designation,
        department: user.department,
        state: user.state,
        district: user.district,
        village: user.village,
        canCreateProject: user.role === 'SUPER_ADMIN' || user.hasPermission('CREATE_PROJECT'),
      },
      summary: {
        totalProjects: projects.length,
        totalParcels: parcels.length,
        completed: statusCounts.GREEN,
        inProgress: statusCounts.YELLOW,
        governmentIssues: statusCounts.RED,
        overallProgress,
        totalAssignedArea: Math.round(totalAssignedArea * 100) / 100,
        totalAcquiredArea: Math.round(totalAcquiredArea * 100) / 100,
        totalCompensationAwarded,
      },
      statusCounts,
      zoneCounts: statusCounts, // Compatibility
      pendingActionsQueue: pendingActionsQueue.slice(0, 15),
      governmentIssuesQueue: governmentIssuesQueue.slice(0, 15),
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
};
