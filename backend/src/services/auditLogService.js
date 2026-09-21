'use strict';

const AuditLog = require('../models/AuditLog');

const SYSTEM_OBJECT_ID = '000000000000000000000001';

const logAction = async ({
  action,
  actorId,
  actorRole,
  entityType,
  entityId,
  severity = 'Info',
  ipAddress = null,
  userAgent = null,
  geoInfo = null,
  changedFields = {},
  details = {},
}) => {
  try {
    const validActorId = actorId || SYSTEM_OBJECT_ID;

    return await AuditLog.create({
      action,
      actorId: validActorId,
      actorRole: actorRole || 'System',
      entityType,
      entityId: String(entityId),
      severity: ['Info', 'Warning', 'Critical'].includes(severity) ? severity : 'Info',
      ipAddress,
      userAgent,
      geoInfo,
      changedFields,
      details,
      performedAt: new Date(),
    });
  } catch (err) {
    // Audit failures should never crash the main request — log and continue
    console.error('[AuditLog] Failed to write log entry:', err.message);
    return null;
  }
};

/**
 * Returns chronological timeline of audit actions for an entity (Application, Family, etc.)
 */
const getAuditTimeline = async (entityId, entityType = null) => {
  const query = { entityId: String(entityId) };
  if (entityType) query.entityType = entityType;
  return AuditLog.find(query).sort({ performedAt: -1 }).lean();
};

/**
 * Returns all actions taken by an officer within a given time range.
 */
const getOfficerActivityReport = async (officerId, { startDate, endDate, limit = 100 } = {}) => {
  const query = { actorId: officerId };
  if (startDate || endDate) {
    query.performedAt = {};
    if (startDate) query.performedAt.$gte = new Date(startDate);
    if (endDate) query.performedAt.$lte = new Date(endDate);
  }
  return AuditLog.find(query).sort({ performedAt: -1 }).limit(limit).lean();
};

module.exports = {
  logAction,
  getAuditTimeline,
  getOfficerActivityReport,
};
