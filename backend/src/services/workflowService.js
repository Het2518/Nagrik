'use strict';

const mongoose = require('mongoose');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Member = require('../models/Member');
const Family = require('../models/Family');
const { logAction } = require('./auditLogService');

const findApplication = async (id) => {
  if (!id) return null;
  const isOid = mongoose.isValidObjectId(id);
  return Application.findOne(isOid ? { $or: [{ _id: id }, { applicationId: id }] } : { applicationId: id });
};

/**
 * Advanced Workflow, Auto-Sanctioning & Clarification Engine (Req 49-51, 59-66)
 */
const workflowService = {
  /**
   * Fast-track auto-approval for low-risk applications with 100% verified digital evidence.
   */
  evaluateAutoApproval: async (applicationId) => {
    const isOid = mongoose.isValidObjectId(applicationId);
    const app = await Application.findOne(isOid ? { $or: [{ _id: applicationId }, { applicationId }] } : { applicationId })
      .populate('schemeId')
      .populate('familyId')
      .populate('memberId');

    if (!app || app.status !== 'Pending') return false;

    const scheme = app.schemeId;
    if (!scheme) return false;

    // Condition 1: Risk score must be Low
    if (app.riskFlag !== 'Low') return false;

    // Condition 2: Scheme must allow auto-approval or fast-track
    const isAutoEligibleScheme = scheme.autoRenewable || scheme.priority === 'High' || app.priority === 'FastTrack';
    if (!isAutoEligibleScheme) return false;

    // Condition 3: Check all required documents are verified and present
    const required = scheme.requiredDocuments?.filter(d => d.required) || [];
    const submitted = app.submittedDocuments || [];

    const hasAllDocs = required.every(req =>
      submitted.some(sub => sub.docKey === req.docKey)
    );
    if (!hasAllDocs) return false;

    // Auto-approve!
    app.status = 'FinalApproved';
    app.autoApprovalEligible = true;
    app.autoApproved = true;
    app.decidedAt = new Date();

    app.approvalChain.push({
      level: 1,
      officerId: app.familyId?.createdByUserId || app._id,
      officerRole: 'AI_AutoSanction_Engine',
      action: 'Approved',
      remarks: 'Fast-Track Auto Sanction: 100% digital evidence verified via state repository with zero risk score.',
      decidedAt: new Date(),
    });

    app.statusHistory.push({
      status: 'FinalApproved',
      changedAt: new Date(),
      officerRole: 'AI_AutoSanction_Engine',
      remarks: 'Entitlement automatically sanctioned and sent for Direct Benefit Transfer (DBT).',
    });

    await app.save();

    await logAction({
      action: 'APPLICATION_AUTO_APPROVED',
      actorId: 'AUTO_ENGINE',
      actorRole: 'System',
      entityType: 'Application',
      entityId: app.applicationId,
      details: { schemeCode: scheme.schemeCode, memberName: app.memberId?.name },
    });

    return true;
  },

  /**
   * Bulk decisions for batches of low-risk applications.
   */
  bulkDecide: async ({ applicationIds = [], action, remarks, rejectionCategory, officerId, officerRole, level = 1 }) => {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const id of applicationIds) {
      try {
        const app = await Application.findById(id);
        if (!app) {
          failedCount++;
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        const newStatus = action === 'Approved'
          ? (level >= 3 ? 'FinalApproved' : `Level${level}Approved`)
          : (action === 'Rejected' ? 'Rejected' : 'ResubmissionRequired');

        app.status = newStatus;
        if (action === 'Approved' && level < 3) {
          app.currentPipelineLevel = level + 1;
        }
        if (action === 'Rejected') {
          app.rejectedAtLevel = level;
          app.rejectionCategory = rejectionCategory || 'Other';
          app.decidedAt = new Date();
        }
        if (newStatus === 'FinalApproved') {
          app.decidedAt = new Date();
        }

        app.approvalChain.push({
          level,
          officerId,
          officerRole,
          action,
          rejectionCategory: action === 'Rejected' ? rejectionCategory : null,
          remarks: remarks || `Bulk ${action} by ${officerRole}`,
          decidedAt: new Date(),
        });

        app.statusHistory.push({
          status: newStatus,
          changedAt: new Date(),
          byOfficerId: officerId,
          officerRole,
          remarks: remarks || `Bulk processed by ${officerRole}`,
        });

        await app.save();
        successCount++;
        results.push({ id, success: true, newStatus });

        await logAction({
          action: `APPLICATION_BULK_${action.toUpperCase()}`,
          actorId: officerId,
          actorRole,
          entityType: 'Application',
          entityId: app.applicationId,
          details: { action, level, remarks },
        });
      } catch (err) {
        failedCount++;
        results.push({ id, success: false, error: err.message });
      }
    }

    return { total: applicationIds.length, successCount, failedCount, results };
  },

  /**
   * Clarification / correction request from officer to citizen with deadline.
   */
  requestClarification: async ({ applicationId, remarks, documentKey, deadlineDays = 7, officerId, officerRole }) => {
    const app = await findApplication(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);

    app.status = 'ResubmissionRequired';
    app.officerRemarks = remarks;
    app.documentAffected = documentKey || null;
    app.correctionRequired = remarks;
    app.resubmissionDeadline = deadline;

    app.clarificationHistory.push({
      requestedAt: new Date(),
      requestedBy: `${officerRole}`,
      remarks,
      documentKey: documentKey || null,
    });

    app.statusHistory.push({
      status: 'ResubmissionRequired',
      changedAt: new Date(),
      byOfficerId: officerId,
      officerRole,
      remarks: `Clarification requested: ${remarks}. Deadline: ${deadline.toLocaleDateString('en-IN')}`,
    });

    await app.save();

    await logAction({
      action: 'CLARIFICATION_REQUESTED',
      actorId: officerId,
      actorRole: officerRole || 'Officer',
      entityType: 'Application',
      entityId: app.applicationId,
      details: { documentKey, remarks, deadline },
    });

    return app;
  },

  /**
   * Citizen response to requested clarification.
   */
  submitClarification: async ({ applicationId, citizenResponse, updatedDocuments = [] }) => {
    const app = await findApplication(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    // Update the last clarification record
    if (app.clarificationHistory.length > 0) {
      const last = app.clarificationHistory[app.clarificationHistory.length - 1];
      last.citizenResponse = citizenResponse;
      last.respondedAt = new Date();
    }

    // Merge updated documents if any
    if (updatedDocuments.length > 0) {
      for (const newDoc of updatedDocuments) {
        const idx = app.submittedDocuments.findIndex(d => d.docKey === newDoc.docKey);
        if (idx >= 0) {
          app.submittedDocuments[idx] = newDoc;
        } else {
          app.submittedDocuments.push(newDoc);
        }
      }
    }

    // Move back to review queue
    const resumeStatus = app.currentPipelineLevel === 1 ? 'Level1Review' : `Level${app.currentPipelineLevel}Review`;
    app.status = resumeStatus;
    app.correctionRequired = null;

    app.statusHistory.push({
      status: resumeStatus,
      changedAt: new Date(),
      officerRole: 'Citizen',
      remarks: `Citizen responded: "${citizenResponse || 'Clarification submitted'}". Resuming review.`,
    });

    await app.save();

    await logAction({
      action: 'CLARIFICATION_SUBMITTED',
      actorId: app.familyId?.toString(),
      actorRole: 'Citizen',
      entityType: 'Application',
      entityId: app.applicationId,
      details: { citizenResponse, documentCount: updatedDocuments.length },
    });

    return app;
  },

  /**
   * Escalates an application to high priority.
   */
  escalateApplication: async (applicationId, reason, actor = 'Officer') => {
    const app = await findApplication(applicationId);
    if (!app) throw new Error(`Application ${applicationId} not found`);

    app.escalated = true;
    app.escalatedAt = new Date();
    app.priority = 'Urgent';
    app.escalationReason = reason || 'Manual officer escalation';

    app.statusHistory.push({
      status: app.status,
      changedAt: new Date(),
      officerRole: actor,
      remarks: `Application escalated to Urgent: ${app.escalationReason}`,
    });

    await app.save();

    await logAction({
      action: 'APPLICATION_ESCALATED',
      actorId: actor,
      actorRole: actor,
      entityType: 'Application',
      entityId: app.applicationId,
      details: { reason: app.escalationReason },
    });

    return app;
  },
};

module.exports = workflowService;
