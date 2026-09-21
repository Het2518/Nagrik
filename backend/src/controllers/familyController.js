'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const CitizenUser = require('../models/CitizenUser');
const Application = require('../models/Application');
const { logAction } = require('../services/auditLogService');
const { sendSuccess, createApiError } = require('../utils/apiResponse');
const lifecycleTriggerService = require('../services/lifecycleTriggerService');
const DocumentReference = require('../models/DocumentReference');
const reusableEvidenceService = require('../services/reusableEvidenceService');
const digiLockerService = require('../services/digiLockerService');

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// Helper to find a family either by human-readable familyId (GJ-GND-2024-001) or MongoDB _id (6aafbdeb...)
const findFamily = async (idOrCode) => {
  if (!idOrCode) return null;
  const isObjectId = String(idOrCode).match(/^[0-9a-fA-F]{24}$/);
  return Family.findOne({
    $or: [
      { _id: isObjectId ? idOrCode : null },
      { familyId: String(idOrCode) },
    ],
  });
};

// POST /api/v1/families
const registerFamily = async (req, res, next) => {
  try {
    const { headMemberDetails, familyDetails } = req.body;

    // One citizen account = one family — enforce strictly
    const existingUser = await CitizenUser.findById(req.user.id);
    if (existingUser?.familyId) {
      return next(createApiError(409, 'Your account already has a registered family. Use PATCH /families/:familyId to update it.'));
    }

    if (!familyDetails || !headMemberDetails) {
      return next(createApiError(400, 'familyDetails and headMemberDetails are required'));
    }

    const family = await Family.create({ ...familyDetails, createdByUserId: req.user.id });

    const headMember = new Member({
      ...headMemberDetails,
      familyId: family._id,
      relationToHead: 'Self',
    });
    if (headMemberDetails.aadhaar) headMember.setAadhaar(headMemberDetails.aadhaar);
    await headMember.save();

    family.headOfFamilyMemberId = headMember._id;
    await family.save();

    await recalculateFamilyComposition(family._id);
    const updatedFamily = await Family.findById(family._id);

    await CitizenUser.findByIdAndUpdate(req.user.id, { familyId: family._id });

    await logAction({
      action: 'FAMILY_REGISTERED',
      actorId: req.user.id,
      actorRole: 'Citizen',
      entityType: 'Family',
      entityId: family.familyId,
    });

    sendSuccess(res, { familyId: family.familyId, family: updatedFamily, headMember }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId
const getFamilyProfile = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const members = await Member.find({ familyId: family._id });
    sendSuccess(res, { family, members });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/families/:familyId — citizen updates their family profile
// Any update resets isVerified so an officer must re-check before benefits continue
const updateFamilyProfile = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    // Citizens can only update their own family
    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only update your own family profile'));
    }

    const allowedFields = [
      'annualIncome', 'rationCardNumber', 'rationCardType', 'address', 'bplStatus', 'hasPuccaHouse',
      'familyType', 'socioeconomic', 'household',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Any self-reported change resets verification — officer must re-verify
    updates.isVerified = false;
    updates.lastVerifiedAt = undefined;
    updates.reVerificationDueAt = undefined;

    const previousValues = {};
    for (const field of Object.keys(updates)) {
      previousValues[field] = family[field];
    }

    Object.assign(family, updates);
    await family.save();

    await logAction({
      action: 'FAMILY_PROFILE_UPDATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Family',
      entityId: family.familyId,
      changedFields: { before: previousValues, after: updates },
    });

    // Re-evaluate family scheme eligibility in background
    lifecycleTriggerService.handleFamilyMutation(family._id, 'FAMILY_UPDATED', {
      actorId: req.user.id,
      actorRole: req.user.role,
      changedFields: updates,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating family update:', e?.message));

    sendSuccess(res, { familyId: family.familyId, family });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families — officer search with filters
const searchFamilies = async (req, res, next) => {
  try {
    const { district, taluka, village, overdueverification, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Officers see only their own jurisdiction unless they are Admin/DistrictOfficer
    if (req.user.jurisdiction?.district && req.user.jurisdiction.district !== 'All') {
      filter['address.district'] = req.user.jurisdiction.district;
    }

    if (district) filter['address.district'] = { $regex: district, $options: 'i' };
    if (taluka) filter['address.taluka'] = { $regex: taluka, $options: 'i' };
    if (village) filter['address.village'] = { $regex: village, $options: 'i' };
    if (overdueverification === 'true') filter.reVerificationDueAt = { $lte: new Date() };

    const skip = (Number(page) - 1) * Number(limit);
    const [families, total] = await Promise.all([
      Family.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Family.countDocuments(filter),
    ]);

    sendSuccess(res, { families, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/members
const addFamilyMember = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    // Citizens can only add members to their own family
    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only add members to your own family'));
    }

    if (!req.body.name || !req.body.dateOfBirth || !req.body.gender || !req.body.relationToHead) {
      return next(createApiError(400, 'name, dateOfBirth, gender, and relationToHead are required'));
    }

    const newMember = new Member({ ...req.body, familyId: family._id });
    if (req.body.aadhaar) newMember.setAadhaar(req.body.aadhaar);
    await newMember.save();

    await logAction({
      action: 'MEMBER_ADDED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Member',
      entityId: newMember.memberId,
      changedFields: { familyId: family.familyId },
    });

    // Re-evaluate family scheme eligibility in background (birth / new member)
    lifecycleTriggerService.handleFamilyMutation(family._id, 'MEMBER_ADDED', {
      memberId: newMember._id,
      actorId: req.user.id,
      actorRole: req.user.role,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating member add:', e?.message));

    sendSuccess(res, { member: newMember }, 201);
  } catch (err) {
    if (err.code === 11000) {
      return next(createApiError(409, 'This Aadhaar number is already registered in the system'));
    }
    next(err);
  }
};

// PATCH /api/v1/families/:familyId/members/:memberId — update lifecycle status
const updateMemberStatus = async (req, res, next) => {
  try {
    const { lifecycleStatus } = req.body;
    if (!['Active', 'Deceased', 'Migrated'].includes(lifecycleStatus)) {
      return next(createApiError(400, 'lifecycleStatus must be Active, Deceased, or Migrated'));
    }

    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const member = await Member.findOne({ memberId: req.params.memberId, familyId: family._id });
    if (!member) return next(createApiError(404, 'Member not found in this family'));

    const previousStatus = member.lifecycleStatus;
    member.lifecycleStatus = lifecycleStatus;
    await member.save();

    // Auto-suspend all in-flight applications when member is no longer active
    if (lifecycleStatus !== 'Active') {
      await Application.updateMany(
        { memberId: member._id, status: { $nin: ['FinalApproved', 'Rejected'] } },
        {
          $set: {
            status: 'Rejected',
            officerRemarks: `Auto-rejected: member lifecycle status changed to ${lifecycleStatus}`,
          },
          $push: {
            statusHistory: {
              status: 'Rejected',
              remarks: `Auto-rejected: member status changed to ${lifecycleStatus}`,
            },
          },
        }
      );
    }

    await logAction({
      action: 'MEMBER_STATUS_UPDATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Member',
      entityId: member.memberId,
      changedFields: { before: { lifecycleStatus: previousStatus }, after: { lifecycleStatus } },
    });

    // Re-evaluate family scheme eligibility in background (bereavement / status update)
    lifecycleTriggerService.handleFamilyMutation(family._id, 'MEMBER_STATUS_CHANGED', {
      memberId: member._id,
      lifecycleStatus,
      actorId: req.user.id,
      actorRole: req.user.role,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating member status change:', e?.message));

    sendSuccess(res, { memberId: member.memberId, lifecycleStatus });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/families/:familyId/verify — officer verifies (Approves/Rejects) provisional family
const verifyFamily = async (req, res, next) => {
  try {
    const { action = 'Approve', verificationNotes } = req.body;
    
    if (!['Approve', 'Reject'].includes(action)) {
      return next(createApiError(400, 'action must be Approve or Reject'));
    }

    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    if (family.status !== 'Provisional' && action === 'Reject') {
      return next(createApiError(409, `Cannot reject family that is already ${family.status}`));
    }

    const previousStatus = family.status;

    if (action === 'Approve') {
      family.status = 'Permanent';
      family.isVerified = true;
      family.lastVerifiedAt = new Date();
      family.reVerificationDueAt = new Date(Date.now() + SIX_MONTHS_MS);
    } else if (action === 'Reject') {
      family.status = 'Deleted';
    }

    family.verificationNotes = verificationNotes?.trim() || '';
    await family.save();

    await logAction({
      action: action === 'Approve' ? 'FAMILY_VERIFIED' : 'FAMILY_REJECTED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Family',
      entityId: family.familyId,
      changedFields: { before: { status: previousStatus }, after: { status: family.status } },
    });

    sendSuccess(res, { 
      familyId: family.familyId, 
      status: family.status,
      isVerified: family.isVerified, 
      reVerificationDueAt: family.reVerificationDueAt 
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId/members/:memberId
const getMember = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const member = await Member.findOne({ memberId: req.params.memberId, familyId: family._id });
    if (!member) return next(createApiError(404, 'Member not found in this family'));

    sendSuccess(res, { member });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/families/:familyId/members/:memberId/profile
// Citizen can update their own member's personal details (not lifecycle status — that's a separate endpoint)
const updateMemberProfile = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only update members of your own family'));
    }

    const member = await Member.findOne({ memberId: req.params.memberId, familyId: family._id });
    if (!member) return next(createApiError(404, 'Member not found in this family'));

    const allowedFields = [
      'name', 'dateOfBirth', 'gender', 'mobileNumber', 'occupation',
      'maritalStatus', 'hasDisability', 'disabilityPercentage', 'isStudent', 'educationLevel',
      'healthStatus', 'skills', 'bankDetails',
    ];
    const previousValues = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        previousValues[field] = member[field];
        member[field] = req.body[field];
      }
    }

    if (Object.keys(previousValues).length === 0) {
      return next(createApiError(400, `No valid fields provided. Updatable: ${allowedFields.join(', ')}`));
    }

    await member.save();

    await logAction({
      action: 'MEMBER_PROFILE_UPDATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Member',
      entityId: member.memberId,
      changedFields: { before: previousValues, after: req.body },
    });

    // Re-evaluate family scheme eligibility in background (marriage / education / disability updates)
    lifecycleTriggerService.handleFamilyMutation(family._id, 'MEMBER_UPDATED', {
      memberId: member._id,
      actorId: req.user.id,
      actorRole: req.user.role,
      changedFields: req.body,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating member profile update:', e?.message));

    sendSuccess(res, { member });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId/applications
// Returns all applications for a given family — citizen sees own, officer sees within jurisdiction
const getFamilyApplications = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    if (req.user.role === 'Citizen') {
      // Citizens can only see their own family's applications
      const user = await CitizenUser.findById(req.user.id);
      if (!user?.familyId || user.familyId.toString() !== family._id.toString()) {
        return next(createApiError(403, 'You can only view your own family\'s applications'));
      }
    } else {
      // Officers scoped to jurisdiction
      if (
        req.user.jurisdiction?.district &&
        req.user.jurisdiction.district !== 'All' &&
        family.address.district !== req.user.jurisdiction.district
      ) {
        return next(createApiError(403, 'This family is outside your jurisdiction'));
      }
    }

    const applications = await Application.find({ familyId: family._id })
      .populate('schemeId', 'schemeCode schemeName benefitType maxBenefitAmount')
      .populate('memberId', 'name gender dateOfBirth')
      .sort({ submittedAt: -1 });

    sendSuccess(res, { familyId: family.familyId, applications, total: applications.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId/documents — list all registered family evidence
const getFamilyDocuments = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    // Citizens can only view their own family's documents
    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only view your own family\'s documents'));
    }

    const registry = await reusableEvidenceService.getFamilyEvidenceRegistry(family._id);
    sendSuccess(res, { familyId: family.familyId, ...registry });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/documents — add/register a verified document or certificate
const addFamilyDocument = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only add documents to your own family'));
    }

    const { certificateNumber, certificateType, issuingAuthority, issueDate, expiryDate, docUrl, fileName } = req.body;
    if (!certificateNumber || !certificateType || !issuingAuthority || !issueDate) {
      return next(createApiError(400, 'certificateNumber, certificateType, issuingAuthority, and issueDate are required'));
    }

    const certNum = certificateNumber.trim().toUpperCase();

    // Check if document reference already exists
    let doc = await DocumentReference.findOne({ certificateNumber: certNum });
    if (doc) {
      if (!doc.linkedFamilyIds.some((id) => id.toString() === family._id.toString())) {
        doc.linkedFamilyIds.push(family._id);
      }
      doc.certificateType = certificateType;
      doc.issuingAuthority = issuingAuthority.trim();
      doc.issueDate = new Date(issueDate);
      if (expiryDate) doc.expiryDate = new Date(expiryDate);
      if (docUrl) doc.docUrl = docUrl;
      if (fileName) doc.fileName = fileName;
      if (req.user.role !== 'Citizen') doc.isVerifiedByOfficer = true;
      await doc.save();
    } else {
      doc = await DocumentReference.create({
        certificateNumber: certNum,
        certificateType,
        issuingAuthority: issuingAuthority.trim(),
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        docUrl: docUrl || null,
        fileName: fileName || null,
        isVerifiedByOfficer: req.user.role !== 'Citizen',
        linkedFamilyIds: [family._id],
      });
    }

    await logAction({
      action: 'FAMILY_DOCUMENT_ADDED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'DocumentReference',
      entityId: doc.certificateNumber,
      changedFields: { certificateType, familyId: family.familyId },
    });

    // Re-evaluate family scheme eligibility in background with new evidence
    lifecycleTriggerService.handleFamilyMutation(family._id, 'DOCUMENT_UPLOADED', {
      actorId: req.user.id,
      actorRole: req.user.role,
      certificateType,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating doc add:', e?.message));

    sendSuccess(res, { document: doc }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/documents/:certNumber/verify — officer verifies a certificate
const verifyFamilyDocument = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const certNum = req.params.certNumber.trim().toUpperCase();
    const doc = await DocumentReference.findOne({ certificateNumber: certNum });
    if (!doc) return next(createApiError(404, 'Document reference not found'));

    const action = req.body.action === 'Reject' ? 'Reject' : 'Approve';
    const isApproved = action === 'Approve';

    doc.isVerifiedByOfficer = isApproved;
    doc.status = isApproved ? 'Verified' : 'Rejected';
    doc.verificationHistory = doc.verificationHistory || [];
    doc.verificationHistory.push({
      verifiedBy: `${req.user.name || req.user.role} (${req.user.role})`,
      verifiedAt: new Date(),
      action: isApproved ? 'Verified' : 'Rejected',
      remarks: req.body.remarks || (isApproved ? 'Officer verification confirmed' : 'Document rejected upon scrutiny'),
    });
    await doc.save();

    await logAction({
      action: isApproved ? 'FAMILY_DOCUMENT_VERIFIED' : 'FAMILY_DOCUMENT_REJECTED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'DocumentReference',
      entityId: doc.certificateNumber,
      changedFields: { isVerifiedByOfficer: isApproved, status: doc.status, familyId: family.familyId },
    });

    // Re-evaluate family scheme eligibility in background
    lifecycleTriggerService.handleFamilyMutation(family._id, 'DOCUMENT_VERIFIED', {
      actorId: req.user.id,
      actorRole: req.user.role,
      certificateType: doc.certificateType,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating doc verify:', e?.message));

    sendSuccess(res, { message: `Document ${isApproved ? 'verified' : 'rejected'} successfully`, document: doc });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/families/:familyId/documents/:certNumber — remove/unlink document from family
const deleteFamilyDocument = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only manage documents of your own family'));
    }

    const certNum = req.params.certNumber.trim().toUpperCase();
    const doc = await DocumentReference.findOne({ certificateNumber: certNum });
    if (!doc) return next(createApiError(404, 'Document reference not found'));

    // Unlink family from document
    doc.linkedFamilyIds = doc.linkedFamilyIds.filter(
      (id) => id.toString() !== family._id.toString()
    );
    if (doc.linkedFamilyIds.length === 0) {
      await DocumentReference.deleteOne({ _id: doc._id });
    } else {
      await doc.save();
    }

    await logAction({
      action: 'FAMILY_DOCUMENT_REMOVED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'DocumentReference',
      entityId: certNum,
      changedFields: { familyId: family.familyId },
    });

    // Re-evaluate family scheme eligibility
    lifecycleTriggerService.handleFamilyMutation(family._id, 'DOCUMENT_REMOVED', {
      actorId: req.user.id,
      actorRole: req.user.role,
      certificateType: doc.certificateType,
    }).catch((e) => console.error('[Lifecycle] Error re-evaluating doc remove:', e?.message));

    sendSuccess(res, { message: 'Document unlinked successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Phase 3 — Document & Evidence Operations ─────────────────────────────

// GET /api/v1/families/:familyId/evidence/completeness
const getEvidenceCompleteness = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));
    const report = await reusableEvidenceService.checkEvidenceCompleteness(family._id);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId/evidence/match-scheme/:schemeCode
const matchEvidenceToScheme = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));
    const match = await reusableEvidenceService.matchEvidenceToScheme(family._id, req.params.schemeCode);
    sendSuccess(res, match);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/evidence/:docId/renew
const renewFamilyDocument = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));
    const result = await reusableEvidenceService.renewDocument(req.params.docId, req.body, req.user?.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId/digilocker/available
const fetchDigiLockerDocs = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));
    const member = req.query.memberId ? await Member.findById(req.query.memberId) : await Member.findById(family.headOfFamilyMemberId);
    const docs = await digiLockerService.fetchAvailableDigiLockerDocs(member?.aadhaarEncrypted, member?.name);
    sendSuccess(res, { availableDocuments: docs });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/digilocker/import
const importDigiLockerDocs = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));
    const { memberId, docTypes } = req.body;
    const docs = await digiLockerService.importToEvidenceLocker(family._id, memberId, docTypes, req.user?.id);
    sendSuccess(res, { importedDocuments: docs });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ══ Phase 1 — Family Lifecycle Operations ══════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

// Helper: recalculate family composition from its member roster
async function recalculateFamilyComposition(familyObjectId) {
  const members = await Member.find({ familyId: familyObjectId, lifecycleStatus: 'Active' });
  const now = new Date();

  const composition = {
    totalMembers: members.length,
    activeMembers: members.length,
    earningMembers: 0,
    dependentMembers: 0,
    seniorCitizens: 0,
    children: 0,
    women: 0,
    disabledMembers: 0,
    students: 0,
  };

  for (const m of members) {
    // Calculate age
    let age = 0;
    if (m.dateOfBirth) {
      age = now.getFullYear() - m.dateOfBirth.getFullYear();
      const monthDiff = now.getMonth() - m.dateOfBirth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < m.dateOfBirth.getDate())) age--;
    }

    if (age >= 60) composition.seniorCitizens++;
    if (age < 18) composition.children++;
    if (m.gender === 'Female') composition.women++;
    if (m.hasDisability) composition.disabledMembers++;
    if (m.isStudent) composition.students++;
    if (m.occupation && m.occupation !== 'Unemployed' && age >= 18) {
      composition.earningMembers++;
    }
  }
  composition.dependentMembers = composition.totalMembers - composition.earningMembers;

  await Family.findByIdAndUpdate(familyObjectId, { familyComposition: composition });
  return composition;
};

// POST /api/v1/families/:familyId/split — Split family by moving selected members to a new family
const splitFamily = async (req, res, next) => {
  try {
    const { memberIds, reason, newFamilyDetails } = req.body;
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return next(createApiError(400, 'memberIds array is required (at least one member to split off)'));
    }

    const sourceFamily = await findFamily(req.params.familyId);
    if (!sourceFamily) return next(createApiError(404, 'Source family not found'));

    // Verify all members belong to the source family
    const membersToMove = await Member.find({
      _id: { $in: memberIds },
      familyId: sourceFamily._id,
      lifecycleStatus: 'Active',
    });
    if (membersToMove.length !== memberIds.length) {
      return next(createApiError(400, 'Some member IDs are invalid or do not belong to this family'));
    }

    // Cannot move the head if other members remain
    const remainingMembers = await Member.find({
      familyId: sourceFamily._id,
      lifecycleStatus: 'Active',
      _id: { $nin: memberIds },
    });
    if (remainingMembers.length === 0) {
      return next(createApiError(400, 'Cannot split all members — at least one must remain in the original family'));
    }

    // Create the new family — inherit core socioeconomic data from source
    const newFamily = await Family.create({
      annualIncome: newFamilyDetails?.annualIncome || sourceFamily.annualIncome,
      category: sourceFamily.category,
      bplStatus: sourceFamily.bplStatus,
      address: newFamilyDetails?.address || sourceFamily.address,
      familyType: newFamilyDetails?.familyType || 'Nuclear',
      socioeconomic: sourceFamily.socioeconomic,
      household: newFamilyDetails?.household || sourceFamily.household,
      previousFamilyIds: [sourceFamily._id],
      createdByUserId: sourceFamily.createdByUserId,
    });

    // Move members to new family
    await Member.updateMany(
      { _id: { $in: memberIds } },
      { $set: { familyId: newFamily._id, previousFamilyId: sourceFamily._id } }
    );

    // Set head of new family (first member with relationToHead 'Self', or first member)
    const newHead = membersToMove.find(m => m.relationToHead === 'Self') || membersToMove[0];
    newFamily.headOfFamilyMemberId = newHead._id;
    await newFamily.save();

    // Record split history on source family
    sourceFamily.splitHistory.push({
      newFamilyId: newFamily._id,
      movedMemberIds: memberIds,
      reason: reason || 'Family Split',
      approvedBy: req.user.role !== 'Citizen' ? req.user.id : null,
    });

    // If head was moved, re-assign head in source family
    if (memberIds.includes(sourceFamily.headOfFamilyMemberId?.toString())) {
      sourceFamily.headOfFamilyMemberId = remainingMembers[0]._id;
    }
    await sourceFamily.save();

    // Recalculate composition for both families
    await Promise.all([
      recalculateFamilyComposition(sourceFamily._id),
      recalculateFamilyComposition(newFamily._id),
    ]);

    // Create LifeEvent
    const LifeEvent = require('../models/LifeEvent');
    await LifeEvent.create({
      eventType: 'FamilySplit',
      affectedFamilyId: sourceFamily._id,
      source: req.user.role === 'Citizen' ? 'CitizenReported' : 'OfficerRecorded',
      details: { newFamilyId: newFamily.familyId, movedCount: memberIds.length, reason },
      verificationStatus: req.user.role !== 'Citizen' ? 'Verified' : 'PendingVerification',
      recordedBy: req.user.id,
      recordedByRole: req.user.role,
    });

    await logAction({
      action: 'FAMILY_SPLIT',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Family',
      entityId: sourceFamily.familyId,
      changedFields: { newFamilyId: newFamily.familyId, movedMembers: memberIds.length },
    });

    sendSuccess(res, {
      sourceFamilyId: sourceFamily.familyId,
      newFamilyId: newFamily.familyId,
      newFamily,
      movedMembers: membersToMove.map(m => m.memberId),
    }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/merge — Merge another family into this one
const mergeFamily = async (req, res, next) => {
  try {
    const { mergeFamilyId, reason } = req.body;
    if (!mergeFamilyId) {
      return next(createApiError(400, 'mergeFamilyId is required'));
    }

    const targetFamily = await findFamily(req.params.familyId);
    if (!targetFamily) return next(createApiError(404, 'Target family not found'));

    const sourceFamily = await findFamily(mergeFamilyId);
    if (!sourceFamily) return next(createApiError(404, 'Source family to merge not found'));

    if (targetFamily._id.toString() === sourceFamily._id.toString()) {
      return next(createApiError(400, 'Cannot merge a family into itself'));
    }

    // Move all active members from source to target
    const membersToAbsorb = await Member.find({
      familyId: sourceFamily._id,
      lifecycleStatus: 'Active',
    });

    const absorbedMemberIds = membersToAbsorb.map(m => m._id);
    await Member.updateMany(
      { _id: { $in: absorbedMemberIds } },
      { $set: { familyId: targetFamily._id, previousFamilyId: sourceFamily._id } }
    );

    // Record merge history on target family
    targetFamily.mergeHistory.push({
      mergedFamilyId: sourceFamily._id,
      mergedFamilyCode: sourceFamily.familyId,
      absorbedMemberIds,
      reason: reason || 'Family Merge',
      approvedBy: req.user.role !== 'Citizen' ? req.user.id : null,
    });
    targetFamily.previousFamilyIds.push(sourceFamily._id);
    await targetFamily.save();

    // Mark source family as Merged
    sourceFamily.status = 'Merged';
    await sourceFamily.save();

    // Recalculate target family composition
    await recalculateFamilyComposition(targetFamily._id);

    // Create LifeEvent
    const LifeEvent = require('../models/LifeEvent');
    await LifeEvent.create({
      eventType: 'FamilyMerge',
      affectedFamilyId: targetFamily._id,
      source: req.user.role === 'Citizen' ? 'CitizenReported' : 'OfficerRecorded',
      details: { mergedFamilyCode: sourceFamily.familyId, absorbedCount: absorbedMemberIds.length, reason },
      verificationStatus: req.user.role !== 'Citizen' ? 'Verified' : 'PendingVerification',
      recordedBy: req.user.id,
      recordedByRole: req.user.role,
    });

    await logAction({
      action: 'FAMILY_MERGED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Family',
      entityId: targetFamily.familyId,
      changedFields: { mergedFrom: sourceFamily.familyId, absorbedMembers: absorbedMemberIds.length },
    });

    sendSuccess(res, {
      targetFamilyId: targetFamily.familyId,
      mergedFamilyId: sourceFamily.familyId,
      absorbedMembers: absorbedMemberIds.length,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/members/:memberId/transfer — Move member to another family
const transferMember = async (req, res, next) => {
  try {
    const { destinationFamilyId, reason } = req.body;
    if (!destinationFamilyId) {
      return next(createApiError(400, 'destinationFamilyId is required'));
    }

    const sourceFamily = await findFamily(req.params.familyId);
    if (!sourceFamily) return next(createApiError(404, 'Source family not found'));

    const destFamily = await findFamily(destinationFamilyId);
    if (!destFamily) return next(createApiError(404, 'Destination family not found'));

    const member = await Member.findOne({
      $or: [
        { _id: req.params.memberId.match(/^[0-9a-fA-F]{24}$/) ? req.params.memberId : null },
        { memberId: req.params.memberId },
      ],
      familyId: sourceFamily._id,
    });
    if (!member) return next(createApiError(404, 'Member not found in source family'));

    // Cannot transfer the only remaining active member
    const remainingCount = await Member.countDocuments({
      familyId: sourceFamily._id,
      lifecycleStatus: 'Active',
      _id: { $ne: member._id },
    });
    if (remainingCount === 0) {
      return next(createApiError(400, 'Cannot transfer the last remaining member. Use merge instead.'));
    }

    // If transferring head, re-assign head in source family
    if (sourceFamily.headOfFamilyMemberId?.toString() === member._id.toString()) {
      const nextHead = await Member.findOne({
        familyId: sourceFamily._id,
        lifecycleStatus: 'Active',
        _id: { $ne: member._id },
      });
      sourceFamily.headOfFamilyMemberId = nextHead._id;
      await sourceFamily.save();
    }

    // Move member
    member.previousFamilyId = sourceFamily._id;
    member.familyId = destFamily._id;
    member.transferHistory.push({
      fromFamilyId: sourceFamily._id,
      toFamilyId: destFamily._id,
      reason: reason || 'Transfer',
      approvedBy: req.user.role !== 'Citizen' ? req.user.id : null,
    });
    // Update relation to head in destination family
    member.relationToHead = 'Other';
    await member.save();

    // Recalculate composition for both families
    await Promise.all([
      recalculateFamilyComposition(sourceFamily._id),
      recalculateFamilyComposition(destFamily._id),
    ]);

    // Create LifeEvent
    const LifeEvent = require('../models/LifeEvent');
    await LifeEvent.create({
      eventType: 'HouseholdCompositionChange',
      affectedFamilyId: sourceFamily._id,
      affectedMemberId: member._id,
      source: req.user.role === 'Citizen' ? 'CitizenReported' : 'OfficerRecorded',
      details: { type: 'MemberTransfer', to: destFamily.familyId, reason },
      verificationStatus: req.user.role !== 'Citizen' ? 'Verified' : 'PendingVerification',
      recordedBy: req.user.id,
      recordedByRole: req.user.role,
    });

    await logAction({
      action: 'MEMBER_TRANSFERRED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Member',
      entityId: member.memberId,
      changedFields: { from: sourceFamily.familyId, to: destFamily.familyId, reason },
    });

    // Re-evaluate eligibility for both families
    lifecycleTriggerService.handleFamilyMutation(sourceFamily._id, 'MEMBER_TRANSFERRED_OUT', {
      memberId: member._id, actorId: req.user.id, actorRole: req.user.role,
    }).catch(e => console.error('[Lifecycle] Transfer out error:', e?.message));

    lifecycleTriggerService.handleFamilyMutation(destFamily._id, 'MEMBER_TRANSFERRED_IN', {
      memberId: member._id, actorId: req.user.id, actorRole: req.user.role,
    }).catch(e => console.error('[Lifecycle] Transfer in error:', e?.message));

    sendSuccess(res, {
      memberId: member.memberId,
      fromFamily: sourceFamily.familyId,
      toFamily: destFamily.familyId,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/families/:familyId/change-head — Head of family succession
const changeHeadOfFamily = async (req, res, next) => {
  try {
    const { newHeadMemberId, reason } = req.body;
    if (!newHeadMemberId) {
      return next(createApiError(400, 'newHeadMemberId is required'));
    }

    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const newHead = await Member.findOne({
      $or: [
        { _id: newHeadMemberId.match(/^[0-9a-fA-F]{24}$/) ? newHeadMemberId : null },
        { memberId: newHeadMemberId },
      ],
      familyId: family._id,
      lifecycleStatus: 'Active',
    });
    if (!newHead) return next(createApiError(404, 'New head member not found or not active in this family'));

    const previousHeadId = family.headOfFamilyMemberId;

    // Update old head's relation
    if (previousHeadId) {
      await Member.findByIdAndUpdate(previousHeadId, { relationToHead: 'Other' });
    }

    // Set new head
    family.headOfFamilyMemberId = newHead._id;
    await family.save();

    newHead.relationToHead = 'Self';
    await newHead.save();

    await logAction({
      action: 'HEAD_OF_FAMILY_CHANGED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Family',
      entityId: family.familyId,
      changedFields: { previousHeadId: previousHeadId?.toString(), newHeadId: newHead._id.toString(), reason },
    });

    sendSuccess(res, {
      familyId: family.familyId,
      newHeadMemberId: newHead.memberId,
      newHeadName: newHead.name,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:familyId/recalculate — Recalculate family composition
const recalculateCompositionEndpoint = async (req, res, next) => {
  try {
    const family = await findFamily(req.params.familyId);
    if (!family) return next(createApiError(404, 'Family not found'));

    const composition = await recalculateFamilyComposition(family._id);
    sendSuccess(res, { familyId: family.familyId, composition });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerFamily,
  getFamilyProfile,
  updateFamilyProfile,
  searchFamilies,
  addFamilyMember,
  getMember,
  updateMemberProfile,
  getFamilyApplications,
  updateMemberStatus,
  verifyFamily,
  getFamilyDocuments,
  addFamilyDocument,
  verifyFamilyDocument,
  deleteFamilyDocument,
  // Phase 1 — Family Lifecycle
  splitFamily,
  mergeFamily,
  transferMember,
  changeHeadOfFamily,
  recalculateCompositionEndpoint,
  recalculateFamilyComposition,
  // Phase 3 — Evidence & DigiLocker
  getEvidenceCompleteness,
  matchEvidenceToScheme,
  renewFamilyDocument,
  fetchDigiLockerDocs,
  importDigiLockerDocs,
};
