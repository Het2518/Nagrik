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
} = require('../controllers/applicationController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

router.post('/',                 requireRole('Citizen'), submitApplication);         // citizen submits
router.get('/',                  listApplications);                                  // officer queue / citizen tracker
router.get('/:id',               getApplicationById);                                // full detail
router.get('/:id/checklist',     requireRole(...OFFICER_ROLES), getVerificationChecklist); // guided checklist for officer
router.patch('/:id/decision',    requireRole(...OFFICER_ROLES), makeDecision);       // approve / reject / resubmit
router.patch('/:id/resubmit',    requireRole('Citizen'), resubmitApplication);       // citizen resubmits corrected docs
router.delete('/:id',            requireRole('Citizen'), withdrawApplication);       // withdraw Pending only

module.exports = router;
