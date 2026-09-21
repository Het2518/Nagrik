'use strict';

const mongoose = require('mongoose');

// Immutable audit trail — nothing is ever updated or deleted from this collection.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. 'APPLICATION_APPROVED'
    actorId: { type: mongoose.Schema.Types.Mixed, required: true },
    actorRole: { type: String, required: true, index: true }, // 'Citizen' | 'Talati' | 'Admin' etc.
    entityType: { type: String, required: true, index: true }, // 'Application' | 'Family' | 'Member'
    entityId: { type: String, required: true, index: true },   // human-readable ID like APP-XXXX
    severity: {
      type: String,
      enum: ['Info', 'Warning', 'Critical'],
      default: 'Info',
      index: true,
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    geoInfo: {
      district: { type: String, default: null },
      taluka: { type: String, default: null },
      location: { type: String, default: null },
    },
    changedFields: { type: Object, default: {} }, // { before, after } snapshot
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedAt: { type: Date, default: Date.now, immutable: true, index: true },
  },
  {
    timestamps: false, // performedAt is the canonical timestamp
    // Prevent any updates — audit logs must be append-only
  }
);

auditLogSchema.index({ actorId: 1, performedAt: -1 });
auditLogSchema.index({ entityId: 1, performedAt: -1 });
auditLogSchema.index({ severity: 1, performedAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
