'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
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
} = require('../controllers/applicationController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

router.post('/',                 requireRole('Citizen'), submitApplication);         // citizen submits
router.get('/',                  listApplications);                                  // officer queue / citizen tracker
router.post('/bulk-decide',      requireRole(...OFFICER_ROLES), bulkDecideApplications); // bulk approve / reject

router.get('/:id',               getApplicationById);                                // full detail
router.get('/:id/checklist',     requireRole(...OFFICER_ROLES), getVerificationChecklist); // guided checklist for officer
router.patch('/:id/decision',    requireRole(...OFFICER_ROLES), makeDecision);       // approve / reject / resubmit
router.post('/:id/decision',     requireRole(...OFFICER_ROLES), makeDecision);       // alias
router.post('/:id/decide',       requireRole(...OFFICER_ROLES), makeDecision);       // alias
router.patch('/:id/decide',      requireRole(...OFFICER_ROLES), makeDecision);       // alias
router.patch('/:id/resubmit',    requireRole('Citizen'), resubmitApplication);       // citizen resubmits corrected docs
router.post('/:id/clarify',      requireRole(...OFFICER_ROLES), requestClarificationEndpoint); // officer requests clarification
router.post('/:id/respond-clarify', requireRole('Citizen'), respondToClarificationEndpoint);   // citizen responds
router.post('/:id/escalate',     requireRole(...OFFICER_ROLES), escalateApplicationEndpoint);  // escalate priority
router.delete('/:id',            requireRole('Citizen'), withdrawApplication);       // withdraw Pending only

module.exports = router;
