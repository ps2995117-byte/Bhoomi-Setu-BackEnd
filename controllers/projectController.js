const Project = require('../models/Project');
const Parcel = require('../models/Parcel');
const { logAction } = require('../services/auditService');
const { getJurisdictionFilter } = require('../middleware/authMiddleware');

// @desc    Create a new infrastructure project
// @route   POST /api/projects
// @access  Private (Super Admin / State Admin with CREATE_PROJECT permission)
const createProject = async (req, res, next) => {
  try {
    // Check permission (PRD Section 13 & 35)
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.hasPermission('CREATE_PROJECT')) {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: Only Central or State Administrative Authorities can initialize projects.',
      });
    }

    const {
      name,
      code,
      type,
      authority,
      state,
      district,
      secondaryDistricts,
      description,
      startDate,
      targetCompletionDate,
      routeGeometry,
      budget,
      totalAreaRequired,
    } = req.body;

    if (!name || !code || !state || !district) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project name, code, state, and primary district',
      });
    }

    const existingProject = await Project.findOne({
      $or: [{ name }, { code: code.toUpperCase() }],
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'A project with this name or code already exists in the registry',
      });
    }

    const project = await Project.create({
      name,
      code: code.toUpperCase(),
      type: type || 'EXPRESSWAY',
      authority: authority || 'NHAI',
      state,
      district,
      secondaryDistricts: secondaryDistricts || [],
      description,
      startDate: startDate || new Date(),
      targetCompletionDate,
      routeGeometry: routeGeometry || [],
      budget: budget || 0,
      totalAreaRequired: totalAreaRequired || 0,
      createdBy: req.user?._id,
    });

    await logAction({
      actor: req.user,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project._id,
      newValue: { name: project.name, code: project.code, state: project.state, district: project.district },
      note: `Project '${project.name}' (${project.code}) initialized by ${req.user?.name} (${req.user?.designation})`,
    });

    res.status(201).json({
      success: true,
      message: 'Infrastructure project created and registered successfully',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects filtered strictly by officer jurisdiction (PRD Section 10-14)
// @route   GET /api/projects
// @access  Private / Optional Protect
const getProjects = async (req, res, next) => {
  try {
    const jurisdictionQuery = getJurisdictionFilter(req.user, 'project');

    // Optional query param filters
    const query = { ...jurisdictionQuery };
    if (req.query.state && (req.user?.role === 'SUPER_ADMIN' || req.user?.state === 'All')) {
      query.state = req.query.state;
    }
    if (req.query.district && (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'STATE_ADMIN' || req.user?.district === 'All')) {
      query.district = req.query.district;
    }
    if (req.query.type) {
      query.type = req.query.type;
    }

    const projects = await Project.find(query).sort({ createdAt: -1 }).lean();

    // Aggregate 3-state parcel statistics for each project (🟢 Green, 🟡 Yellow, 🔴 Red)
    const projectStats = await Promise.all(
      projects.map(async (p) => {
        const parcels = await Parcel.find({ projectId: p._id }).select('zone stage area').lean();

        const statusCounts = {
          GREEN: 0,  // Completed
          YELLOW: 0, // In Progress
          RED: 0,    // Government Issue / Bottleneck
        };

        let acquiredArea = 0;
        let totalParcelArea = 0;

        parcels.forEach((parcel) => {
          if (statusCounts[parcel.zone] !== undefined) {
            statusCounts[parcel.zone]++;
          }
          totalParcelArea += parcel.area || 0;
          if (parcel.zone === 'GREEN' || parcel.stage === 'STAGE_11_COMPLETED') {
            acquiredArea += parcel.area || 0;
          }
        });

        const totalParcels = parcels.length;
        const progressPercentage =
          totalParcels > 0
            ? Math.round((statusCounts.GREEN / totalParcels) * 100)
            : 0;

        return {
          ...p,
          totalParcels,
          statusCounts,
          zoneCounts: statusCounts, // Backwards compatibility for UI helpers
          totalParcelArea: Math.round(totalParcelArea * 100) / 100,
          acquiredArea: Math.round(acquiredArea * 100) / 100,
          progressPercentage,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: projectStats.length,
      userJurisdiction: {
        role: req.user?.role || 'PUBLIC',
        state: req.user?.state || 'All',
        district: req.user?.district || 'All',
      },
      projects: projectStats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project details with parcels and metrics (strictly isolated)
// @route   GET /api/projects/:id
// @access  Private / Optional Protect
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found in registry',
      });
    }

    // Check Data Isolation on Single Project Read (PRD Section 34)
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'STATE_ADMIN' && req.user.state !== 'All' && project.state !== req.user.state) {
        return res.status(403).json({
          success: false,
          message: `Access Denied: You are not authorized to view projects outside ${req.user.state}`,
        });
      }
      if (req.user.role === 'DISTRICT_OFFICER' && req.user.district !== 'All') {
        const isCovered = project.district === req.user.district || (project.secondaryDistricts && project.secondaryDistricts.includes(req.user.district));
        if (!isCovered) {
          return res.status(403).json({
            success: false,
            message: `Access Denied: Project does not fall under ${req.user.district} jurisdiction`,
          });
        }
      }
    }

    // Query parcels for this project, respecting sub-jurisdictions if Field Officer
    const parcelFilter = { projectId: project._id };
    if (req.user?.role === 'PROJECT_OFFICER' && req.user?.village !== 'All') {
      parcelFilter.$or = [
        { assignedOfficer: req.user._id },
        { village: req.user.village },
      ];
    }

    const parcels = await Parcel.find(parcelFilter)
      .sort({ createdAt: -1 })
      .lean();

    const statusCounts = { GREEN: 0, YELLOW: 0, RED: 0 };
    let totalArea = 0;
    let acquiredArea = 0;

    parcels.forEach((p) => {
      if (statusCounts[p.zone] !== undefined) statusCounts[p.zone]++;
      totalArea += p.area || 0;
      if (p.zone === 'GREEN' || p.stage === 'STAGE_11_COMPLETED') acquiredArea += p.area || 0;
    });

    const progressPercentage =
      parcels.length > 0
        ? Math.round((statusCounts.GREEN / parcels.length) * 100)
        : 0;

    res.status(200).json({
      success: true,
      project: {
        ...project,
        totalParcels: parcels.length,
        statusCounts,
        zoneCounts: statusCounts,
        totalParcelArea: Math.round(totalArea * 100) / 100,
        acquiredArea: Math.round(acquiredArea * 100) / 100,
        progressPercentage,
      },
      parcels,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project metadata
// @route   PUT /api/projects/:id
// @access  Private (Admin / State Admin)
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    const oldSnapshot = project.toObject();
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAction({
      actor: req.user,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: project._id,
      oldValue: oldSnapshot,
      newValue: updated.toObject(),
      note: `Project '${updated.name}' updated by ${req.user?.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Super Admin only)
const deleteProject = async (req, res, next) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only National Super Admin can delete project records',
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await Parcel.deleteMany({ projectId: project._id });
    await project.deleteOne();

    await logAction({
      actor: req.user,
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: req.params.id,
      note: `Project '${project.name}' (${project.code}) and all associated records deleted`,
    });

    res.status(200).json({
      success: true,
      message: 'Project and associated parcel records deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
