'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { getAuditLogs } = require('../controllers/auditLogController');

// Admin-only — full audit trail visibility
router.get('/', authenticate, requireRole('Admin'), getAuditLogs);

module.exports = router;
