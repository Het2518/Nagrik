'use strict';

const AuditLog = require('../models/AuditLog');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/v1/auditlogs  (Admin only)
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityId, actorRole, entityType, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (action) filter.action = { $regex: action, $options: 'i' };
    if (entityId) filter.entityId = entityId;
    if (actorRole) filter.actorRole = actorRole;
    if (entityType) filter.entityType = entityType;

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

module.exports = { getAuditLogs };
