'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
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
} = require('../controllers/schemeController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

// ── Social Registry (must be before :schemeCode parameter) ────────────────────
router.get('/social-registry/overview',          requireRole(...OFFICER_ROLES), getSocialRegistryOverview);
router.post('/social-registry/recalculate',      requireRole(...OFFICER_ROLES), recalculateSocialRegistry);
router.get('/social-registry/family/:familyId',  getFamilySocialRegistry);

// ── Saturation Board & Eligible Beneficiary Analytics — Officers & Admins ───────
router.get('/:schemeCode/beneficiaries',  requireRole(...OFFICER_ROLES), getSchemeBeneficiaries);
router.post('/:schemeCode/nudge',         requireRole(...OFFICER_ROLES), nudgeBeneficiary);
router.post('/:schemeCode/evaluate-cron', requireRole(...OFFICER_ROLES), triggerSchemeCron);

// ── Scheme Rule Versioning (Req 19-20) ─────────────────────────────────────────
router.post('/:schemeCode/version',            requireRole('Admin'), createSchemeVersion);
router.get('/:schemeCode/versions',            requireRole(...OFFICER_ROLES), getSchemeHistory);
router.post('/:schemeCode/rollback/:version',  requireRole('Admin'), rollbackSchemeVersion);

// ── Read — citizen + all officers ────────────────────────────────────────────
router.get('/',              listSchemes);         // list; citizens see active + limited fields only
router.get('/:schemeCode',   getSchemeByCode);     // detail; citizens blocked from inactive schemes

// ── Write — Admin ONLY ────────────────────────────────────────────────────────
// DistrictOfficer, Mamlatdar, Talati CANNOT create or modify schemes.
// Only the Super Admin (role: 'Admin') representing the State Government can.
router.post('/',              requireRole('Admin'), createScheme);        // create new scheme
router.patch('/:schemeCode',  requireRole('Admin'), updateScheme);        // update eligibility / docs / fields
router.delete('/:schemeCode', requireRole('Admin'), deactivateScheme);    // soft-deactivate
router.post('/:schemeCode/deactivate', requireRole('Admin'), deactivateScheme); // alternate POST alias

module.exports = router;
