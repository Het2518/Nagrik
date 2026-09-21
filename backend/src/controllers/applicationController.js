'use strict';

const mongoose = require('mongoose');
const Application = require('../models/Application');
const Family = require('../models/Family');
const Member = require('../models/Member');
const DocumentReference = require('../models/DocumentReference');
const { scoreRisk } = require('../services/riskScoringService');
const { checkEligibilityWithFetch } = require('../services/eligibilityEngine');
const { logAction } = require('../services/auditLogService');
const { getChecklistForSchemeAndLevel, buildChecklist, validateSchemeFormData, validateRequiredDocuments, getUncheckedItems } = require('../services/verificationChecklistService');
const Scheme = require('../models/Scheme');
const slaService = require('../services/slaService');
const workflowService = require('../services/workflowService');
const { sendSuccess, createApiError } = require('../utils/apiResponse');

// ─── Approval Pipeline Configuration ────────────────────────────────────────
const PIPELINE = {
  Talati: {
    level: 1,
    allowedCurrentStatuses: ['Pending', 'Level1Review', 'ResubmissionRequired'],
    reviewStatus:   'Level1Review',
    approvedStatus: 'Level1Approved',
    levelLabel:     'Level 1 — Talati (Village Clerk)',
  },
  Mamlatdar: {
    level: 2,
    allowedCurrentStatuses: ['Level1Approved', 'Level2Review'],
    reviewStatus:   'Level2Review',
    approvedStatus: 'Level2Approved',
    levelLabel:     'Level 2 — Mamlatdar (Taluka Supervisor)',
  },
  DistrictOfficer: {
    level: 3,
    allowedCurrentStatuses: ['Level2Approved', 'Level3Review'],
    reviewStatus:   'Level3Review',
    approvedStatus: 'FinalApproved',
    levelLabel:     'Level 3 — District Officer',
  },
  Admin: {
    level: 3,
    allowedCurrentStatuses: [
      'Pending', 'Level1Review', 'Level1Approved',
      'Level2Review', 'Level2Approved', 'Level3Review',
      'ResubmissionRequired',
    ],
    reviewStatus:   'Level3Review',
    approvedStatus: 'FinalApproved',
    levelLabel:     'Level 3 — Admin (Super)',
  },
};

const LEVEL_LABEL = {
  0: 'Citizen (withdrawn)',
  1: 'Village Clerk (Talati)',
  2: 'Taluka Supervisor (Mamlatdar)',
  3: 'District Officer / Admin',
};

// ─── GET /api/v1/applications/:id/checklist ──────────────────────────────────
// Returns the verification checklist the current officer must fill before deciding.
const getVerificationChecklist = async (req, res, next) => {
  try {
    const isMongoId = mongoose.isValidObjectId(req.params.id);
    const query = isMongoId
      ? { $or: [{ _id: req.params.id }, { applicationId: req.params.id }] }
      : { applicationId: req.params.id };
    const application = await Application.findOne(query)
      .populate('schemeId');
    if (!application) return next(createApiError(404, 'Application not found'));

    const pipeline = PIPELINE[req.user.role];
    if (!pipeline) return next(createApiError(403, 'Your role is not part of the approval pipeline'));

    // Merge generic + scheme-specific + per-document checklist items
    const checklist = buildChecklist(application.schemeId, pipeline.level);

    sendSuccess(res, {
      applicationId: application.applicationId,
      schemeName: application.schemeId?.schemeName,
      level: pipeline.level,
      levelLabel: pipeline.levelLabel,
      checklist,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/applications/:id/decision ────────────────────────────────
// action: 'Approve' | 'Reject' | 'RequestResubmission'
// remarks: required — free-text justification
// rejectionCategory: required on Reject — standardized reason code
// checklist: array of { item, checked, note } — the officer's filled checklist
const makeDecision = async (req, res, next) => {
  try {
    const {
      action,
      remarks,
      rejectionCategory,
      checklist = [],
      documentAffected,
      correctionRequired,
      resubmissionDeadline
    } = req.body;

    let normalizedAction = action;
    if (action === 'Approved') normalizedAction = 'Approve';
    if (action === 'Rejected') normalizedAction = 'Reject';
    if (action === 'ResubmissionRequired') normalizedAction = 'RequestResubmission';

    const validActions = ['Approve', 'Reject', 'RequestResubmission'];
    if (!validActions.includes(normalizedAction)) {
      return next(createApiError(400, `action must be one of: ${validActions.join(', ')}`));
    }
    if (!remarks?.trim()) {
      return next(createApiError(400, 'Remarks are required for every decision'));
    }
    if (normalizedAction === 'Reject' && !rejectionCategory) {
      return next(createApiError(400, 'rejectionCategory is required when rejecting. Valid values: DocumentIncomplete, DocumentFraud, IneligibleIncome, IneligibleCategory, ResidenceNotVerified, DuplicateBenefit, PhysicalVerificationFailed, Other'));
    }

    const officerRole = req.user.role;
    const pipeline = PIPELINE[officerRole];
    if (!pipeline) return next(createApiError(403, 'Your role is not part of the approval pipeline'));

    const isMongoId = mongoose.isValidObjectId(req.params.id);
    const query = isMongoId
      ? { $or: [{ _id: req.params.id }, { applicationId: req.params.id }] }
      : { applicationId: req.params.id };

    const application = await Application.findOne(query)
      .populate('familyId')
      .populate('memberId');
    if (!application) return next(createApiError(404, 'Application not found'));

    // Enforce pipeline order — officer cannot act out of sequence
    if (!pipeline.allowedCurrentStatuses.includes(application.status)) {
      return next(
        createApiError(409,
          `Cannot act. Current status is '${application.status}'. ${officerRole} acts on: ${pipeline.allowedCurrentStatuses.join(', ')}.`
        )
      );
    }

    // Warn if officer is approving but left checklist items unchecked
    const unchecked = checklist.length > 0 ? getUncheckedItems(checklist) : [];

    const previousStatus = application.status;
    let nextStatus;
    let citizenMessage;
    let eligibilityWarning = null;

    if (normalizedAction === 'Reject') {
      nextStatus = 'Rejected';
      application.rejectedAtLevel = pipeline.level;
      application.rejectionCategory = rejectionCategory;
      application.decidedAt = new Date();
      citizenMessage = `Your application was reviewed by ${LEVEL_LABEL[pipeline.level]} and was not approved. Reason: ${remarks.trim()}`;

    } else if (normalizedAction === 'RequestResubmission') {
      // Officer found incomplete/incorrect documents but is giving citizen a chance to fix it
      nextStatus = 'ResubmissionRequired';
      application.currentPipelineLevel = pipeline.level;
      application.documentAffected = documentAffected || null;
      application.correctionRequired = correctionRequired || null;
      if (resubmissionDeadline) application.resubmissionDeadline = new Date(resubmissionDeadline);
      citizenMessage = `${LEVEL_LABEL[pipeline.level]} has requested additional or corrected documents. Please re-upload and resubmit. Details: ${remarks.trim()}`;

    } else {
      // Approve
      // Re-run eligibility before final approval — catch changed circumstances
      if (pipeline.approvedStatus === 'FinalApproved') {
        const eligResults = await checkEligibilityWithFetch(application.familyId, application.memberId);
        const schemeResult = eligResults.find(
          (r) => r.schemeId.toString() === application.schemeId.toString()
        );
        if (schemeResult && !schemeResult.isEligible) {
          eligibilityWarning = `Eligibility re-check failed: ${schemeResult.reasons.join('; ')}`;
        }
        if (application.memberId.lifecycleStatus !== 'Active') {
          eligibilityWarning = `Member status is now '${application.memberId.lifecycleStatus}' — benefit disbursement may be affected`;
        }
        application.decidedAt = new Date();
        citizenMessage = 'Congratulations! Your application has been fully approved. You will receive the benefit shortly.';
      } else {
        const nextLevelLabel = LEVEL_LABEL[pipeline.level + 1];
        citizenMessage = `Your application was approved by ${LEVEL_LABEL[pipeline.level]} and forwarded to ${nextLevelLabel} for the next review.`;
      }
      nextStatus = pipeline.approvedStatus;
      application.currentPipelineLevel = pipeline.level + 1;
    }

    application.status = nextStatus;
    application.officerRemarks = remarks.trim();

    // Append to the permanent approval chain (audit record)
    application.approvalChain.push({
      level: pipeline.level,
      officerId: req.user.id,
      officerRole,
      action: action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : 'ResubmissionRequested',
      rejectionCategory: action === 'Reject' ? rejectionCategory : null,
      remarks: remarks.trim(),
      checklist,
    });

    // Append to citizen-facing timeline
    application.statusHistory.push({
      status: nextStatus,
      byOfficerId: req.user.id,
      officerRole,
      remarks: citizenMessage,
    });

    await application.save();

    await logAction({
      action: `APPLICATION_${action.toUpperCase().replace('REQUESTRESUBMISSION', 'RESUBMISSION_REQUESTED')}_L${pipeline.level}`,
      actorId: req.user.id,
      actorRole: officerRole,
      entityType: 'Application',
      entityId: application.applicationId,
      changedFields: {
        before: { status: previousStatus },
        after: { status: nextStatus },
        level: pipeline.level,
        rejectionCategory: rejectionCategory || null,
        uncheckedItems: unchecked,
        eligibilityWarning,
      },
    });

    const responsePayload = {
      applicationId: application.applicationId,
      status: nextStatus,
      approvalLevel: pipeline.level,
      levelLabel: pipeline.levelLabel,
      citizenMessage,
    };

    if (unchecked.length > 0) {
      responsePayload.warning = `The following checklist items were not checked: ${unchecked.join('; ')}`;
    }
    if (eligibilityWarning) responsePayload.eligibilityWarning = eligibilityWarning;
    if (action === 'Reject') responsePayload.rejectionCategory = rejectionCategory;

    sendSuccess(res, responsePayload);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/applications ───────────────────────────────────────────────
const submitApplication = async (req, res, next) => {
  try {
    const {
      memberId,
      schemeId,
      documents = [],
      schemeSpecificData = {},
      submittedDocumentKeys = [],
      // Cloudinary document objects uploaded via /api/v1/uploads/document
      // Shape: [{ docKey, url, publicId, originalName, format, sizeBytes }]
      submittedDocuments = [],
    } = req.body;

    if (!req.user.familyId) {
      return next(createApiError(400, 'Please register your family before applying for a scheme'));
    }

    const family = await Family.findById(req.user.familyId);
    if (!family) return next(createApiError(404, 'No registered family found for your account'));

    if (family.status !== 'Permanent') {
      return next(createApiError(403, `Cannot apply for schemes while family status is ${family.status}. Please wait for verification.`));
    }

    const member = await Member.findById(memberId);
    if (!member) return next(createApiError(404, 'Member not found'));

    if (member.familyId.toString() !== family._id.toString()) {
      return next(createApiError(403, 'Member does not belong to your family'));
    }
    if (member.lifecycleStatus !== 'Active') {
      return next(createApiError(400, `Cannot apply — member status is ${member.lifecycleStatus}`));
    }

    // Fetch the full scheme (needed for form validation + eligibility)
    const scheme = await Scheme.findById(schemeId);
    if (!scheme || !scheme.isActive) return next(createApiError(404, 'Scheme not found or inactive'));

    // Validate per-scheme required documents
    // Support both the new rich Cloudinary format and the legacy key array
    const allDocKeys = [
      ...submittedDocumentKeys,
      ...submittedDocuments.map((d) => d.docKey),
    ];
    const missingDocs = validateRequiredDocuments(scheme, allDocKeys);
    if (missingDocs.length > 0) {
      return next(createApiError(400, `Missing required documents: ${missingDocs.join('; ')}. Please upload all required documents before submitting.`));
    }

    // Validate per-scheme dynamic form fields
    const formErrors = validateSchemeFormData(scheme, schemeSpecificData);
    if (formErrors.length > 0) {
      return next(createApiError(400, `Incomplete application form: ${formErrors.join('; ')}`));
    }

    // Enforce eligibility server-side
    const schemeIdStr = schemeId.toString();
    const eligibilityResults = await checkEligibilityWithFetch(family, member);
    const schemeResult = eligibilityResults.find((r) => r.schemeId.toString() === schemeIdStr);
    if (!schemeResult) return next(createApiError(404, 'Scheme not found or inactive'));
    if (!schemeResult.isEligible) {
      return next(createApiError(422, `Not eligible: ${schemeResult.reasons.join('; ')}`));
    }

    const alreadyApplied = await Application.findOne({ memberId, schemeId });
    if (alreadyApplied) {
      return next(createApiError(409, 'This member has already applied for this scheme'));
    }

    const certificateNumbers = documents.map((d) => d.certificateNumber);
    const savedDocRefs = await Promise.all(
      documents.map((doc) =>
        DocumentReference.findOneAndUpdate(
          { certificateNumber: doc.certificateNumber },
          { $setOnInsert: { ...doc }, $addToSet: { linkedFamilyIds: family._id } },
          { upsert: true, returnDocument: 'after' }
        )
      )
    );

    const riskFlag = await scoreRisk({ familyId: family._id, schemeId, certificateNumbers });

    const priority = req.body.priority || (submittedDocuments.length > 0 && submittedDocuments.every(d => d.reusedFromLocker) ? 'FastTrack' : 'Normal');

    const application = new Application({
      familyId: family._id,
      memberId,
      schemeId,
      riskFlag,
      priority,
      currentPipelineLevel: 1,
      schemeSpecificData,
      submittedDocumentKeys,          // legacy flat keys (backward compat)
      submittedDocuments,             // rich Cloudinary objects with URLs
      documentReferences: savedDocRefs.map((d) => d._id),
      statusHistory: [{ status: 'Pending', remarks: 'Application submitted by citizen. Awaiting Level 1 (Talati) review.' }],
    });

    slaService.calculateSLA(application, scheme);
    await application.save();

    // Check fast-track auto-approval criteria
    await workflowService.evaluateAutoApproval(application._id);

    await DocumentReference.updateMany(
      { _id: { $in: savedDocRefs.map((d) => d._id) } },
      { $addToSet: { linkedApplicationIds: application._id } }
    );

    await logAction({
      action: 'APPLICATION_SUBMITTED',
      actorId: req.user.id,
      actorRole: 'Citizen',
      entityType: 'Application',
      entityId: application.applicationId,
      changedFields: { riskFlag, schemeId, schemeSpecificData, submittedDocumentKeys, priority, autoApproved: application.autoApproved },
    });

    sendSuccess(res, {
      applicationId: application.applicationId,
      riskFlag,
      priority,
      status: application.status,
      autoApproved: application.autoApproved,
    }, 201);
  } catch (err) {
    if (err.code === 11000) return next(createApiError(409, 'This member has already applied for this scheme'));
    next(err);
  }
};

// ─── GET /api/v1/applications ────────────────────────────────────────────────
const listApplications = async (req, res, next) => {
  try {
    const {
      familyId: familyIdParam,
      status,
      riskFlag,
      priority,
      isBreached,
      escalated,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};

    if (req.user.role === 'Citizen') {
      if (!req.user.familyId) return sendSuccess(res, { applications: [], total: 0, page: 1, totalPages: 0 });
      const family = await Family.findById(req.user.familyId);
      if (!family) return next(createApiError(404, 'Family not found'));
      filter.familyId = family._id;
    } else {
      if (req.user.jurisdiction?.district && req.user.jurisdiction.district !== 'All') {
        const familiesInJurisdiction = await Family.find({
          'address.district': req.user.jurisdiction.district,
        }).select('_id');
        filter.familyId = { $in: familiesInJurisdiction.map((f) => f._id) };
      }

      if (familyIdParam) {
        const family = await Family.findOne({ familyId: familyIdParam });
        if (family) {
          const jFilter = filter.familyId;
          if (jFilter?.$in) {
            const inJurisdiction = jFilter.$in.some((id) => id.toString() === family._id.toString());
            if (!inJurisdiction) return next(createApiError(403, 'Family is outside your jurisdiction'));
          }
          filter.familyId = family._id;
        }
      }

      // Default view: show only this officer's actionable queue
      if (!status) {
        const pipeline = PIPELINE[req.user.role];
        if (pipeline && req.user.role !== 'Admin') {
          filter.status = { $in: pipeline.allowedCurrentStatuses };
        }
      }
    }

    if (status) filter.status = status;
    if (riskFlag) filter.riskFlag = riskFlag;
    if (priority) filter.priority = priority;
    if (isBreached === 'true') filter['sla.isBreached'] = true;
    if (escalated === 'true') filter.escalated = true;

    const skip = (Number(page) - 1) * Number(limit);
    const [applications, total, slaMetrics] = await Promise.all([
      Application.find(filter)
        .populate('schemeId', 'schemeName schemeCode benefitType maxBenefitAmount slaDays')
        .populate('memberId', 'name dateOfBirth gender')
        .sort({ priority: -1, 'sla.targetCompletionDate': 1, submittedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
      req.user.role !== 'Citizen' ? slaService.getQueueSLAMetrics(filter) : null,
    ]);

    sendSuccess(res, {
      applications,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      slaMetrics,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/applications/:id ────────────────────────────────────────────
const getApplicationById = async (req, res, next) => {
  try {
    const isMongoId = mongoose.isValidObjectId(req.params.id);
    const query = isMongoId
      ? { $or: [{ _id: req.params.id }, { applicationId: req.params.id }] }
      : { applicationId: req.params.id };

    const application = await Application.findOne(query)
      .populate('schemeId')
      .populate('memberId', '-aadhaarEncrypted -aadhaarHash')
      .populate('familyId')
      .populate('documentReferences')
      .populate('approvalChain.officerId', 'name role officerId');

    if (!application) return next(createApiError(404, 'Application not found'));

    sendSuccess(res, { application });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/v1/applications/:id ─────────────────────────────────────────
const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return next(createApiError(404, 'Application not found'));

    if (!req.user.familyId) return next(createApiError(403, 'Access denied'));
    const family = await Family.findById(req.user.familyId);
    if (!family || application.familyId.toString() !== family._id.toString()) {
      return next(createApiError(403, 'You can only withdraw your own applications'));
    }
    if (application.status !== 'Pending') {
      return next(createApiError(400, `Cannot withdraw — application is already under review (status: ${application.status})`));
    }

    application.status = 'Rejected';
    application.rejectedAtLevel = 0;
    application.officerRemarks = 'Withdrawn by citizen before review';
    application.decidedAt = new Date();
    application.statusHistory.push({ status: 'Rejected', remarks: 'Application withdrawn by citizen before any review.' });
    await application.save();

    await logAction({
      action: 'APPLICATION_WITHDRAWN',
      actorId: req.user.id,
      actorRole: 'Citizen',
      entityType: 'Application',
      entityId: application.applicationId,
    });

    sendSuccess(res, { applicationId: application.applicationId, status: 'Rejected', note: 'Withdrawn by citizen' });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/applications/:id/resubmit ────────────────────────────────
// Citizen provides updated/corrected documents for an application in ResubmissionRequired
const resubmitApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { submittedDocuments = [], submittedDocumentKeys = [], remarks = '' } = req.body;

    const application = await Application.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { applicationId: id }
      ]
    });
    if (!application) return next(createApiError(404, 'Application not found'));

    if (!req.user.familyId) return next(createApiError(403, 'Access denied'));
    const family = await Family.findById(req.user.familyId);
    if (!family || application.familyId.toString() !== family._id.toString()) {
      return next(createApiError(403, 'You can only resubmit your own family applications'));
    }

    if (application.status !== 'ResubmissionRequired') {
      return next(
        createApiError(
          400,
          `Cannot resubmit application with status '${application.status}'. Only applications in 'ResubmissionRequired' can be resubmitted.`
        )
      );
    }

    // Merge or replace submitted documents
    if (submittedDocuments.length > 0) {
      application.submittedDocuments = [
        ...application.submittedDocuments.filter(d => !submittedDocuments.some(nd => nd.docKey === d.docKey)),
        ...submittedDocuments
      ];
    }
    if (submittedDocumentKeys.length > 0) {
      application.submittedDocumentKeys = Array.from(
        new Set([...application.submittedDocumentKeys, ...submittedDocumentKeys])
      );
    }

    // Transition back to the review queue for the level that requested resubmission
    const returnStatus =
      application.currentPipelineLevel === 1 ? 'Pending' :
      application.currentPipelineLevel === 2 ? 'Level1Approved' : 'Level2Approved';

    application.status = returnStatus;
    const updateRemarks = remarks.trim()
      ? `Corrected documents resubmitted by citizen: ${remarks.trim()}`
      : 'Corrected documents resubmitted by citizen. Forwarded for re-verification.';

    application.statusHistory.push({
      status: returnStatus,
      byOfficerId: null,
      officerRole: 'Citizen',
      remarks: updateRemarks,
    });

    await application.save();

    await logAction({
      action: 'APPLICATION_RESUBMITTED',
      actorId: req.user.id,
      actorRole: 'Citizen',
      entityType: 'Application',
      entityId: application.applicationId,
      changedFields: {
        status: returnStatus,
        resubmittedDocsCount: submittedDocuments.length,
        citizenRemarks: remarks.trim(),
      },
    });

    sendSuccess(res, {
      applicationId: application.applicationId,
      status: returnStatus,
      citizenMessage: 'Your application has been resubmitted with updated documents. The reviewing officer will re-evaluate your file.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Phase 4 Workflow & SLA Endpoints ────────────────────────────────────────

// POST /api/v1/applications/bulk-decide
const bulkDecideApplications = async (req, res, next) => {
  try {
    const { applicationIds = [], action, remarks, rejectionCategory } = req.body;
    if (!applicationIds.length) return next(createApiError(400, 'applicationIds array is required'));
    if (!['Approved', 'Rejected', 'ResubmissionRequired'].includes(action)) {
      return next(createApiError(400, 'Invalid action for bulk processing'));
    }

    const pipeline = PIPELINE[req.user.role];
    const level = pipeline?.level || 1;

    const result = await workflowService.bulkDecide({
      applicationIds,
      action,
      remarks,
      rejectionCategory,
      officerId: req.user.id,
      officerRole: req.user.role,
      level,
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/applications/:id/clarify
const requestClarificationEndpoint = async (req, res, next) => {
  try {
    const { remarks, documentKey, deadlineDays = 7 } = req.body;
    if (!remarks) return next(createApiError(400, 'remarks are required for clarification request'));

    const app = await workflowService.requestClarification({
      applicationId: req.params.id,
      remarks,
      documentKey,
      deadlineDays,
      officerId: req.user.id,
      officerRole: req.user.role,
    });

    sendSuccess(res, { application: app });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/applications/:id/respond-clarify
const respondToClarificationEndpoint = async (req, res, next) => {
  try {
    const { citizenResponse, updatedDocuments } = req.body;
    const app = await workflowService.submitClarification({
      applicationId: req.params.id,
      citizenResponse,
      updatedDocuments,
    });

    sendSuccess(res, { application: app });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/applications/:id/escalate
const escalateApplicationEndpoint = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const app = await workflowService.escalateApplication(req.params.id, reason, req.user.role || 'Officer');
    sendSuccess(res, { application: app });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitApplication,
  makeDecision,
  getVerificationChecklist,
  listApplications,
  getApplicationById,
  withdrawApplication,
  resubmitApplication,
  bulkDecideApplications,
  requestClarificationEndpoint,
  respondToClarificationEndpoint,
  escalateApplicationEndpoint,
};
