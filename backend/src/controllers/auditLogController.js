'use strict';

const AuditLog = require('../models/AuditLog');
const { getAuditTimeline, getOfficerActivityReport } = require('../services/auditLogService');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/v1/auditlogs  (Admin only)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityId, actorRole, entityType, severity, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = { $regex: action, $options: 'i' };
    if (entityId) filter.entityId = entityId;
    if (actorRole) filter.actorRole = actorRole;
    if (entityType) filter.entityType = entityType;
    if (severity) filter.severity = severity;

    if (from || to) {
      filter.performedAt = {};
      if (from) filter.performedAt.$gte = new Date(from);
      if (to) filter.performedAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ performedAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, { logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auditlogs/timeline/:entityId
const getEntityTimeline = async (req, res, next) => {
  try {
    const { entityId } = req.params;
    const { entityType } = req.query;
    const timeline = await getAuditTimeline(entityId, entityType);
    sendSuccess(res, { entityId, timeline });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auditlogs/export
const exportAuditLogs = async (req, res, next) => {
  try {
    const { from, to, severity, entityType } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (entityType) filter.entityType = entityType;
    if (from || to) {
      filter.performedAt = {};
      if (from) filter.performedAt.$gte = new Date(from);
      if (to) filter.performedAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter).sort({ performedAt: -1 }).limit(1000).lean();

    // CSV format output
    const headers = 'Action,Severity,ActorRole,EntityType,EntityId,IPAddress,Timestamp\n';
    const rows = logs.map((l) => {
      const ts = l.performedAt ? new Date(l.performedAt).toISOString() : '';
      return `"${l.action || ''}","${l.severity || 'Info'}","${l.actorRole || ''}","${l.entityType || ''}","${l.entityId || ''}","${l.ipAddress || ''}","${ts}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="nagrik_audit_logs_${Date.now()}.csv"`);
    return res.send(headers + rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs,
  getEntityTimeline,
  exportAuditLogs,
};
