'use strict';

const Scheme = require('../models/Scheme');
const { logAction } = require('../services/auditLogService');
const { sendSuccess, createApiError } = require('../utils/apiResponse');
const saturationAnalyticsService = require('../services/saturationAnalyticsService');
const cronService = require('../services/cronService');
const schemeVersioningService = require('../services/schemeVersioningService');
const socialRegistryService = require('../services/socialRegistryService');

// Fields a citizen is allowed to see — internal officer checklist config is excluded
const CITIZEN_PROJECTION = 'schemeCode schemeName department benefitType maxBenefitAmount benefitFrequency applicationDeadline eligibilityRules requiredDocuments applicationFormFields isActive';

// Fields Admin is allowed to set when creating or updating a scheme
const WRITABLE_FIELDS = [
  'schemeName',
  'department',
  'benefitType',
  'maxBenefitAmount',
  'benefitFrequency',
  'applicationDeadline',
  'eligibilityRules',
  'requiredDocuments',
  'applicationFormFields',
  'levelChecklistAdditions',
  'targetGroup',
  'stackingRules',
  'geographicRestrictions',
  'budgetInfo',
  'renewalRules',
  'renewalPeriodMonths',
  'isActive',
];

// Required fields to create a valid scheme
const REQUIRED_ON_CREATE = ['schemeCode', 'schemeName', 'department', 'benefitType'];

// ─── GET /api/v1/schemes ──────────────────────────────────────────────────────
const listSchemes = async (req, res, next) => {
  try {
    const { benefitType, isActive, search } = req.query;
    const filter = {};

    // Citizens only see active schemes and never see internal officer checklist config
    const isCitizen = req.user.role === 'Citizen';
    if (isCitizen) {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (benefitType) filter.benefitType = benefitType;
    if (search) filter.schemeName = { $regex: search, $options: 'i' };

    const projection = isCitizen ? CITIZEN_PROJECTION : '';
    const schemes = await Scheme.find(filter).select(projection).sort({ schemeName: 1 });

    sendSuccess(res, { schemes, total: schemes.length });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/schemes/:schemeCode ─────────────────────────────────────────
const getSchemeByCode = async (req, res, next) => {
  try {
    const isCitizen = req.user.role === 'Citizen';
    const projection = isCitizen ? CITIZEN_PROJECTION : '';

    const scheme = await Scheme.findOne({
      schemeCode: req.params.schemeCode.toUpperCase(),
    }).select(projection);

    if (!scheme) return next(createApiError(404, 'Scheme not found'));

    // Citizens cannot see inactive schemes
    if (isCitizen && !scheme.isActive) {
      return next(createApiError(404, 'Scheme not found'));
    }

    sendSuccess(res, { scheme });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes — Admin only ───────────────────────────────────────
// Who can create a scheme?
// ONLY Admin (Super Admin). DistrictOfficer, Mamlatdar, Talati cannot.
// In the real government system: the State Government/Ministry decides a scheme,
// the Admin enters it here. No one else.
const createScheme = async (req, res, next) => {
  try {
    // Validate required fields
    const missing = REQUIRED_ON_CREATE.filter((f) => !req.body[f]?.toString().trim());
    if (missing.length > 0) {
      return next(createApiError(400, `Missing required fields: ${missing.join(', ')}`));
    }

    const schemeCode = req.body.schemeCode.trim().toUpperCase();

    const existing = await Scheme.findOne({ schemeCode });
    if (existing) {
      return next(createApiError(409, `Scheme with code '${schemeCode}' already exists`));
    }

    // Whitelist — only accept known fields, nothing else from req.body
    const schemeData = { schemeCode };
    for (const field of WRITABLE_FIELDS) {
      if (req.body[field] !== undefined) schemeData[field] = req.body[field];
    }

    const scheme = await Scheme.create(schemeData);

    await logAction({
      action: 'SCHEME_CREATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      changedFields: { created: schemeData },
    });

    sendSuccess(res, { scheme }, 201);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/v1/schemes/:schemeCode — Admin only ──────────────────────────
// Admin can update any scheme field: eligibility rules, documents, form fields,
// checklist additions, benefit amount, or toggle active/inactive.
const updateScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findOne({ schemeCode: req.params.schemeCode.toUpperCase() });
    if (!scheme) return next(createApiError(404, 'Scheme not found'));

    const previousValues = {};
    for (const field of WRITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        previousValues[field] = scheme[field];
        scheme[field] = req.body[field];
      }
    }

    if (Object.keys(previousValues).length === 0) {
      return next(createApiError(400, `No valid fields provided. Updatable fields: ${WRITABLE_FIELDS.join(', ')}`));
    }

    await scheme.save();

    await logAction({
      action: 'SCHEME_UPDATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      changedFields: { before: previousValues, after: req.body },
    });

    sendSuccess(res, { scheme });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/v1/schemes/:schemeCode — Admin only ─────────────────────────
// Permanently deactivates a scheme (soft delete — sets isActive = false).
// Hard deletion is NOT allowed because existing approved applications reference this scheme.
const deactivateScheme = async (req, res, next) => {
  try {
    const scheme = await Scheme.findOne({ schemeCode: req.params.schemeCode.toUpperCase() });
    if (!scheme) return next(createApiError(404, 'Scheme not found'));
    if (!scheme.isActive) return next(createApiError(409, 'Scheme is already inactive'));

    scheme.isActive = false;
    await scheme.save();

    await logAction({
      action: 'SCHEME_DEACTIVATED',
      actorId: req.user.id,
      actorRole: req.user.role,
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
    });

    sendSuccess(res, {
      schemeCode: scheme.schemeCode,
      isActive: false,
      message: 'Scheme deactivated. Existing approved applications are not affected. New applications will be blocked.',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/schemes/:schemeCode/beneficiaries ───────────────────────────
// Saturation Analytics & Eligible Beneficiaries list for officers/admins
const getSchemeBeneficiaries = async (req, res, next) => {
  try {
    const { page, limit, district, taluka, status, search } = req.query;
    const userDistrict = req.user.jurisdiction?.district || district;
    const userTaluka = req.user.jurisdiction?.taluka || taluka;

    const data = await saturationAnalyticsService.getSchemeBeneficiaries(req.params.schemeCode, {
      page,
      limit,
      district: userDistrict,
      taluka: userTaluka,
      status,
      search,
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes/:schemeCode/nudge ──────────────────────────────────
// Dispatch proactive welfare notification to eligible unreached citizen
const nudgeBeneficiary = async (req, res, next) => {
  try {
    const { familyId, memberId, customMessage } = req.body;
    if (!familyId) {
      return next(createApiError(400, 'familyId is required to send a nudge'));
    }

    const result = await saturationAnalyticsService.nudgeBeneficiary(req.params.schemeCode, {
      familyId,
      memberId,
      customMessage,
      officer: req.user,
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes/:schemeCode/evaluate-cron ──────────────────────────
// Trigger on-demand milestone and saturation cron recalculation
const triggerSchemeCron = async (req, res, next) => {
  try {
    const result = await cronService.evaluateSchemeCron(req.params.schemeCode, req.user);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes/:schemeCode/version ────────────────────────────────
const createSchemeVersion = async (req, res, next) => {
  try {
    const { updates, reason } = req.body;
    const author = req.user?.name || req.user?.username || 'Admin';
    const scheme = await schemeVersioningService.createSchemeVersion(
      req.params.schemeCode,
      updates || req.body,
      reason,
      author
    );
    sendSuccess(res, { scheme, message: `Created version ${scheme.version} for ${scheme.schemeCode}` });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/schemes/:schemeCode/versions ────────────────────────────────
const getSchemeHistory = async (req, res, next) => {
  try {
    const history = await schemeVersioningService.getSchemeHistory(req.params.schemeCode);
    sendSuccess(res, history);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes/:schemeCode/rollback/:version ──────────────────────
const rollbackSchemeVersion = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const author = req.user?.name || req.user?.username || 'Admin';
    const scheme = await schemeVersioningService.rollbackSchemeVersion(
      req.params.schemeCode,
      req.params.version,
      reason,
      author
    );
    sendSuccess(res, { scheme, message: `Rolled back to version ${req.params.version}. New active version: ${scheme.version}` });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/schemes/social-registry/overview ─────────────────────────────
const getSocialRegistryOverview = async (req, res, next) => {
  try {
    const overview = await socialRegistryService.getRegistryOverview(req.query);
    sendSuccess(res, overview);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/v1/schemes/social-registry/recalculate ─────────────────────────
const recalculateSocialRegistry = async (req, res, next) => {
  try {
    const results = await socialRegistryService.batchRecalculate(req.body);
    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/v1/schemes/social-registry/family/:familyId ────────────────────
const getFamilySocialRegistry = async (req, res, next) => {
  try {
    const entry = await socialRegistryService.computeDeprivationScore(req.params.familyId);
    sendSuccess(res, { socialRegistry: entry });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listSchemes,
  getSchemeByCode,
  createScheme,
  updateScheme,
  deactivateScheme,
  getSchemeBeneficiaries,
  nudgeBeneficiary,
  triggerSchemeCron,
  createSchemeVersion,
  getSchemeHistory,
  rollbackSchemeVersion,
  getSocialRegistryOverview,
  recalculateSocialRegistry,
  getFamilySocialRegistry,
};
