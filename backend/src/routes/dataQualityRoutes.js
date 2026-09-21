'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  getDataQualityReport,
  getIncompleteRecords,
  getFamilyQualityScore,
  sendRemediationNudge,
} = require('../controllers/dataQualityController');

const OFFICER_ROLES = ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'];

router.use(authenticate);

router.get('/report', requireRole(...OFFICER_ROLES), getDataQualityReport);
router.get('/incomplete', requireRole(...OFFICER_ROLES), getIncompleteRecords);
router.get('/family/:id', requireRole(...OFFICER_ROLES), getFamilyQualityScore);
router.post('/family/:id/nudge', requireRole(...OFFICER_ROLES), sendRemediationNudge);

module.exports = router;
