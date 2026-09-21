'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  analyzeFamily,
  getFamilyGraph,
  getBenefitGaps,
  getFamilyBenefits,
  getEvidenceRegistry,
  getFamilyLifeEvents,
  recordLifeEvent,
  verifyLifeEvent,
  simulateLifeEvent,
  getOfficerFamilyCaseView,
  getOfficerTasks,
  updateOfficerTask,
  getRiskSignals,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getGeographicSaturation,
  getHighPriorityFamilies,
  triggerCronJob,
  getIntegrationsStatus,
} = require('../controllers/v2WelfareController');

// Public / Health integration status
router.get('/integrations/status', getIntegrationsStatus);

// All subsequent routes require authentication
router.use(authenticate);

// ── Citizen & Shared Family Intelligence Routes ─────────────────────────────
router.post('/families/:id/analyze', analyzeFamily);
router.get('/families/:id/graph', getFamilyGraph);
router.get('/families/:id/benefit-gaps', getBenefitGaps);
router.get('/families/:id/benefits', getFamilyBenefits);
router.get('/families/:id/evidence-registry', getEvidenceRegistry);
router.get('/families/:id/life-events', getFamilyLifeEvents);
router.post('/families/:id/simulate-life-event', simulateLifeEvent);

router.post('/life-events', recordLifeEvent);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

// ── Intelligence & Saturation Analytics ──────────────────────────────────────
router.get('/analytics/geographic-saturation', getGeographicSaturation);
router.get('/analytics/priority-families', getHighPriorityFamilies);
router.post('/cron/trigger', requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'), triggerCronJob);

// ── Officer Case Management & Governance Routes ─────────────────────────────
router.get(
  '/officer/families/:id/case-view',
  requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'),
  getOfficerFamilyCaseView
);

router.post(
  '/life-events/:id/verify',
  requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'),
  verifyLifeEvent
);

router.get(
  '/officer/tasks',
  requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'),
  getOfficerTasks
);

router.patch(
  '/officer/tasks/:id',
  requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'),
  updateOfficerTask
);

router.get(
  '/risk-signals',
  requireRole('Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'),
  getRiskSignals
);

module.exports = router;
