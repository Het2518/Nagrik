'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
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
} = require('../controllers/familyController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

// ── Family ─────────────────────────────────────────────────────────────────
router.get('/',        requireRole(...OFFICER_ROLES), searchFamilies);    // officer search with filters
router.post('/',       requireRole('Citizen'), registerFamily);            // citizen registers family (one per account)
router.get('/:familyId',    getFamilyProfile);                            // full profile + members list
router.patch('/:familyId',  updateFamilyProfile);                         // citizen updates family info

// ── Family Documents & Evidence Locker ─────────────────────────────────────
router.get('/:familyId/documents',  getFamilyDocuments);                  // get all registered certificates & reusable evidence
router.post('/:familyId/documents', addFamilyDocument);                   // citizen or officer registers certificate/document

// ── Members ────────────────────────────────────────────────────────────────
router.post('/:familyId/members',                        addFamilyMember);               // add a member
router.get('/:familyId/members/:memberId',               getMember);                     // get single member
router.patch('/:familyId/members/:memberId/profile',     updateMemberProfile);           // edit member details
router.patch('/:familyId/members/:memberId/lifecycle',   updateMemberStatus);            // mark Deceased/Migrated

// ── Officer Actions ────────────────────────────────────────────────────────
router.patch('/:familyId/verify', requireRole(...OFFICER_ROLES), verifyFamily);   // officer marks family verified

// ── Applications shortcut ─────────────────────────────────────────────────
router.get('/:familyId/applications', getFamilyApplications);              // all applications for this family

module.exports = router;
