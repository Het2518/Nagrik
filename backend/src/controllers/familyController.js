'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const CitizenUser = require('../models/CitizenUser');
const Application = require('../models/Application');
const { logAction } = require('../services/auditLogService');
const { sendSuccess, createApiError } = require('../utils/apiResponse');
const lifecycleTriggerService = require('../services/lifecycleTriggerService');

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

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

    await CitizenUser.findByIdAndUpdate(req.user.id, { familyId: family._id });

    await logAction({
      action: 'FAMILY_REGISTERED',
      actorId: req.user.id,
      actorRole: 'Citizen',
      entityType: 'Family',
      entityId: family.familyId,
    });

    sendSuccess(res, { familyId: family.familyId, family, headMember }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:familyId
const getFamilyProfile = async (req, res, next) => {
  try {
    const family = await Family.findOne({ familyId: req.params.familyId });
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
    const family = await Family.findOne({ familyId: req.params.familyId });
    if (!family) return next(createApiError(404, 'Family not found'));

    // Citizens can only update their own family
    if (
      req.user.role === 'Citizen' &&
      family.createdByUserId?.toString() !== req.user.id.toString()
    ) {
      return next(createApiError(403, 'You can only update your own family profile'));
    }

    const allowedFields = ['annualIncome', 'rationCardNumber', 'rationCardType', 'address', 'bplStatus', 'hasPuccaHouse'];
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
    const family = await Family.findOne({ familyId: req.params.familyId });
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

    const family = await Family.findOne({ familyId: req.params.familyId });
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

    const family = await Family.findOne({ familyId: req.params.familyId });
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
      // Mark all members as deleted or migrated if needed, but keeping it simple for now
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
    const family = await Family.findOne({ familyId: req.params.familyId });
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
    const family = await Family.findOne({ familyId: req.params.familyId });
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
    const family = await Family.findOne({ familyId: req.params.familyId });
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
      .populate('schemeId', 'schemeName schemeCode benefitType maxBenefitAmount')
      .populate('memberId', 'name gender dateOfBirth')
      .sort({ submittedAt: -1 });

    sendSuccess(res, { familyId: req.params.familyId, applications, total: applications.length });
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
};
