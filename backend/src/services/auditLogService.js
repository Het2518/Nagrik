'use strict';

const AuditLog = require('../models/AuditLog');

const SYSTEM_OBJECT_ID = '000000000000000000000001';

const logAction = async ({ action, actorId, actorRole, entityType, entityId, changedFields = {} }) => {
  try {
    const validActorId = (actorId && String(actorId).match(/^[0-9a-fA-F]{24}$/))
      ? actorId
      : SYSTEM_OBJECT_ID;

    await AuditLog.create({
      action,
      actorId: validActorId,
      actorRole: actorRole || 'System',
      entityType,
      entityId: String(entityId),
      changedFields,
    });
  } catch (err) {
    // Audit failures should never crash the main request — log and continue
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
};

module.exports = { logAction };
