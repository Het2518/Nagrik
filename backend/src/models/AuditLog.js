'use strict';

const mongoose = require('mongoose');

// Immutable audit trail — nothing is ever updated or deleted from this collection.
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. 'APPLICATION_APPROVED'
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true }, // 'Citizen' | 'Talati' | 'Admin' etc.
    entityType: { type: String, required: true }, // 'Application' | 'Family' | 'Member'
    entityId: { type: String, required: true },   // human-readable ID like APP-XXXX
    changedFields: { type: Object, default: {} }, // { before, after } snapshot
    performedAt: { type: Date, default: Date.now, immutable: true },
  },
  {
    timestamps: false, // performedAt is the canonical timestamp
    // Prevent any updates — audit logs must be append-only
  }
);

auditLogSchema.index({ actorId: 1, performedAt: -1 });
auditLogSchema.index({ entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
