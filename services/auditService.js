const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit trail entry.
 *
 * @param {Object} params
 * @param {Object} [params.actor] - req.user object if available
 * @param {String} params.action - e.g. 'PROJECT_CREATED', 'STAGE_UPDATED'
 * @param {String} params.entityType - 'Project' | 'Parcel' | 'Issue' | 'User'
 * @param {String} params.entityId - ID of the subject entity
 * @param {Object} [params.oldValue] - snapshot of previous state
 * @param {Object} [params.newValue] - snapshot of new state
 * @param {String} [params.note] - human-readable description
 */
const logAction = async ({
  actor = null,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  note = '',
}) => {
  try {
    await AuditLog.create({
      actorId: actor?._id || actor?.id || null,
      actorName: actor?.name || 'System / Automated Trigger',
      actorRole: actor?.role || 'SYSTEM',
      action,
      entityType,
      entityId: String(entityId),
      oldValue,
      newValue,
      note,
      timestamp: new Date(),
    });
  } catch (error) {
    // Non-blocking: log error to console without failing the main transaction
    console.error('Audit Log Error:', error.message);
  }
};

module.exports = { logAction };
