'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getEligibility } = require('../controllers/eligibilityController');

router.use(authenticate);

router.get('/:familyId', getEligibility);

module.exports = router;
