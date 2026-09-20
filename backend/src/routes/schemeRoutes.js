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
} = require('../controllers/schemeController');

router.use(authenticate);

// ── Read — citizen + all officers ────────────────────────────────────────────
router.get('/',              listSchemes);         // list; citizens see active + limited fields only
router.get('/:schemeCode',   getSchemeByCode);     // detail; citizens blocked from inactive schemes

// ── Write — Admin ONLY ────────────────────────────────────────────────────────
// DistrictOfficer, Mamlatdar, Talati CANNOT create or modify schemes.
// Only the Super Admin (role: 'Admin') representing the State Government can.
router.post('/',              requireRole('Admin'), createScheme);        // create new scheme
router.patch('/:schemeCode',  requireRole('Admin'), updateScheme);        // update eligibility / docs / fields
router.delete('/:schemeCode', requireRole('Admin'), deactivateScheme);    // soft-deactivate

module.exports = router;
