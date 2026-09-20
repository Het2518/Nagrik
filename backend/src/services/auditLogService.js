'use strict';

const AuditLog = require('../models/AuditLog');

const logAction = async ({ action, actorId, actorRole, entityType, entityId, changedFields = {} }) => {
  try {
    await AuditLog.create({ action, actorId, actorRole, entityType, entityId, changedFields });
  } catch (err) {
    // Audit failures should never crash the main request — log and continue
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
};

module.exports = { logAction };
