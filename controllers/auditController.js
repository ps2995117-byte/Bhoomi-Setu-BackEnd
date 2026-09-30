const AuditLog = require('../models/AuditLog');

// @desc    Get system audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin / Officer)
const getAuditLogs = async (req, res, next) => {
  try {
    const { entityType, entityId, action, page = 1, limit = 50 } = req.query;

    const query = {};
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      count: logs.length,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
