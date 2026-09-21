'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getAuditLogs, getEntityTimeline, exportAuditLogs } = require('../controllers/auditLogController');

// Admin and officer roles can inspect timeline / export
router.use(authenticate);

router.get('/export', requireRole('Admin', 'DistrictOfficer'), exportAuditLogs);
router.get('/timeline/:entityId', requireRole('Admin', 'DistrictOfficer', 'Mamlatdar', 'Talati'), getEntityTimeline);
router.get('/', requireRole('Admin', 'DistrictOfficer'), getAuditLogs);

module.exports = router;
