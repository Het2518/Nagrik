'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/stats', authenticate, requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'), getDashboardStats);

module.exports = router;
