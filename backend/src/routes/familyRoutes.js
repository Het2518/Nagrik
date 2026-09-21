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
  verifyFamilyDocument,
  deleteFamilyDocument,
  // Phase 1 — Family Lifecycle
  splitFamily,
  mergeFamily,
  transferMember,
  changeHeadOfFamily,
  recalculateCompositionEndpoint,
  // Phase 3 — Evidence & DigiLocker
  getEvidenceCompleteness,
  matchEvidenceToScheme,
  renewFamilyDocument,
  fetchDigiLockerDocs,
  importDigiLockerDocs,
} = require('../controllers/familyController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

// ── Family ─────────────────────────────────────────────────────────────────
router.get('/',        requireRole(...OFFICER_ROLES), searchFamilies);    // officer search with filters
router.post('/',       requireRole('Citizen'), registerFamily);            // citizen registers family (one per account)
router.get('/:familyId',    getFamilyProfile);                            // full profile + members list
router.patch('/:familyId',  updateFamilyProfile);                         // citizen updates family info

// ── Family Documents & Evidence Locker (Phase 3) ───────────────────────────
router.get('/:familyId/documents',                              getFamilyDocuments);                  // get all registered certificates
router.post('/:familyId/documents',                             addFamilyDocument);                   // citizen or officer registers certificate
router.post('/:familyId/documents/:certNumber/verify',           requireRole(...OFFICER_ROLES), verifyFamilyDocument); // officer verifies certificate
router.patch('/:familyId/documents/:certNumber/verify',          requireRole(...OFFICER_ROLES), verifyFamilyDocument); // officer verifies certificate
router.delete('/:familyId/documents/:certNumber',               deleteFamilyDocument);                // unlinks document
router.get('/:familyId/evidence/completeness',                  getEvidenceCompleteness);             // evidence locker completeness score
router.get('/:familyId/evidence/match-scheme/:schemeCode',       matchEvidenceToScheme);               // match documents against scheme
router.post('/:familyId/evidence/:docId/renew',                 renewFamilyDocument);                 // renew certificate
router.get('/:familyId/digilocker/available',                   fetchDigiLockerDocs);                 // list simulated DigiLocker documents
router.post('/:familyId/digilocker/import',                     importDigiLockerDocs);                // import verified DigiLocker documents

// ── Members ────────────────────────────────────────────────────────────────
router.post('/:familyId/members',                        addFamilyMember);               // add a member
router.get('/:familyId/members/:memberId',               getMember);                     // get single member
router.patch('/:familyId/members/:memberId/profile',     updateMemberProfile);           // edit member details
router.patch('/:familyId/members/:memberId/lifecycle',   updateMemberStatus);            // mark Deceased/Migrated

// ── Family Lifecycle Operations (Phase 1) ──────────────────────────────────
router.post('/:familyId/split',                          splitFamily);                   // split family by moving members
router.post('/:familyId/merge',                          mergeFamily);                   // merge another family into this one
router.post('/:familyId/members/:memberId/transfer',     transferMember);                // transfer member to another family
router.patch('/:familyId/change-head',                   changeHeadOfFamily);            // head of family succession
router.post('/:familyId/recalculate',                    recalculateCompositionEndpoint);// recalculate family composition

// ── Officer Actions ────────────────────────────────────────────────────────
router.patch('/:familyId/verify', requireRole(...OFFICER_ROLES), verifyFamily);   // officer marks family verified
router.post('/:familyId/verify',  requireRole(...OFFICER_ROLES), verifyFamily);   // officer marks family verified (POST alias)

// ── Applications shortcut ─────────────────────────────────────────────────
router.get('/:familyId/applications', getFamilyApplications);              // all applications for this family

module.exports = router;
