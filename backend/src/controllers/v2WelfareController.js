'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const LifeEvent = require('../models/LifeEvent');
const OfficerTask = require('../models/OfficerTask');
const Notification = require('../models/Notification');
const RiskSignal = require('../models/RiskSignal');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const familyBenefitGraphService = require('../services/familyBenefitGraphService');
const benefitGapDetector = require('../services/benefitGapDetector');
const reusableEvidenceService = require('../services/reusableEvidenceService');
const lifeEventEngine = require('../services/lifeEventEngine');
const riskIntelligenceService = require('../services/riskIntelligenceService');
const cronService = require('../services/cronService');
const { getConnectorsStatus } = require('../integrations');
const { sendSuccess, createApiError } = require('../utils/apiResponse');

// POST /api/v1/families/:id/analyze
// The flagship "Analyze My Family" intelligence endpoint
const analyzeFamily = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    // Check citizen authorization: user can only analyze their own family unless they are an officer
    if (req.user?.role === 'Citizen') {
      const isOwner =
        family.createdByUserId?.toString() === req.user.id?.toString() ||
        req.user.familyId?.toString() === family._id.toString();
      if (!isOwner) {
        return next(createApiError(403, 'Forbidden: You can only analyze your own family profile'));
      }
    }

    const [gapAnalysis, evidenceData, graphData, lifeEvents, notifications] = await Promise.all([
      benefitGapDetector.detectGaps(family),
      reusableEvidenceService.getFamilyEvidenceRegistry(family._id),
      familyBenefitGraphService.buildGraph(family._id),
      LifeEvent.find({ affectedFamilyId: family._id }).sort({ eventDate: -1 }).limit(5).lean(),
      Notification.find({ familyId: family._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    sendSuccess(res, {
      familyId: family.familyId,
      status: family.status,
      coveragePercentage: gapAnalysis.coveragePercentage,
      currentBenefits: gapAnalysis.currentBenefits,
      potentialBenefits: gapAnalysis.potentialBenefits,
      missingEvidence: gapAnalysis.missingEvidence,
      expiringSoon: gapAnalysis.expiringSoon,
      recommendations: gapAnalysis.recommendations,
      reusableEvidence: evidenceData.evidenceList,
      recentLifeEvents: lifeEvents,
      notifications,
      graphSummary: graphData.summary,
      analyzedAt: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:id/graph
const getFamilyGraph = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const graph = await familyBenefitGraphService.buildGraph(family._id);
    sendSuccess(res, graph);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:id/benefit-gaps
const getBenefitGaps = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const gaps = await benefitGapDetector.detectGaps(family);
    sendSuccess(res, gaps);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:id/benefits
const getFamilyBenefits = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const entitlements = await BenefitEntitlement.find({ familyId: family._id })
      .populate('memberId', 'name memberId')
      .populate('schemeId', 'schemeCode schemeName benefitType maxBenefitAmount')
      .lean();

    sendSuccess(res, { familyId: family.familyId, benefits: entitlements });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:id/evidence-registry
const getEvidenceRegistry = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const registry = await reusableEvidenceService.getFamilyEvidenceRegistry(family._id);
    sendSuccess(res, registry);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/families/:id/life-events
const getFamilyLifeEvents = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const events = await LifeEvent.find({ affectedFamilyId: family._id })
      .populate('affectedMemberId', 'name memberId')
      .sort({ eventDate: -1 })
      .lean();

    sendSuccess(res, { familyId: family.familyId, lifeEvents: events });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/life-events
const recordLifeEvent = async (req, res, next) => {
  try {
    const { familyId, memberId, eventType, eventDate, details, evidence } = req.body;
    if (!familyId || !eventType) {
      return next(createApiError(400, 'familyId and eventType are required'));
    }

    const result = await lifeEventEngine.recordEvent({
      familyId,
      memberId,
      eventType,
      eventDate,
      source: req.user?.role === 'Citizen' ? 'CitizenReported' : 'OfficerRecorded',
      details,
      evidence,
      recordedBy: req.user?.id || req.user?._id,
      recordedByRole: req.user?.role || 'Citizen',
    });

    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/life-events/:id/verify
const verifyLifeEvent = async (req, res, next) => {
  try {
    const event = await lifeEventEngine.verifyEvent(req.params.id, req.user);
    sendSuccess(res, { message: 'Life event verified successfully', event });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/families/:id/simulate-life-event
// Interactive simulation for demo flow: e.g. "Child turns 18", "Income changes"
const simulateLifeEvent = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const { eventType, affectedMemberId, simulatedChanges } = req.body;
    const impact = await familyBenefitGraphService.analyzeImpact(family._id, {
      eventType: eventType || 'SimulatedEvent',
      affectedMemberId,
      simulatedChanges: simulatedChanges || {},
    });

    sendSuccess(res, impact);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/officer/families/:id/case-view
// 360° Officer Family Case Graph View
const getOfficerFamilyCaseView = async (req, res, next) => {
  try {
    const family = await Family.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { familyId: req.params.id }],
    });
    if (!family) return next(createApiError(404, 'Family not found'));

    const [graph, gaps, riskSignals, tasks, members, evidenceData, lifeEvents] = await Promise.all([
      familyBenefitGraphService.buildGraph(family._id),
      benefitGapDetector.detectGaps(family),
      riskIntelligenceService.getFamilyRiskSignals(family._id),
      OfficerTask.find({ familyId: family._id }).sort({ createdAt: -1 }).lean(),
      Member.find({ familyId: family._id }).lean(),
      reusableEvidenceService.getFamilyEvidenceRegistry(family._id),
      LifeEvent.find({ familyId: family._id }).sort({ createdAt: -1 }).lean(),
    ]);

    sendSuccess(res, {
      family,
      members,
      graph,
      benefitGaps: gaps,
      reusableEvidence: evidenceData?.evidenceList || [],
      lifeEvents,
      riskSignals,
      officerTasks: tasks,
      tasks,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/officer/tasks
const getOfficerTasks = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.taskType) query.taskType = req.query.taskType;
    if (req.query.priority) query.priority = req.query.priority;

    // Scoped by role unless Admin
    if (req.user?.role && req.user.role !== 'Admin') {
      query.assignedRole = req.user.role;
    }

    const tasks = await OfficerTask.find(query)
      .populate('familyId', 'familyId address')
      .populate('memberId', 'name memberId')
      .populate('lifeEventId', 'eventType eventDate confidence')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { count: tasks.length, tasks });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/officer/tasks/:id
const updateOfficerTask = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const task = await OfficerTask.findById(req.params.id);
    if (!task) return next(createApiError(404, 'Task not found'));

    if (status) task.status = status;
    if (resolutionNotes) task.resolutionNotes = resolutionNotes;
    if (status === 'Completed' || status === 'Dismissed') {
      task.resolvedBy = req.user?._id;
      task.resolvedAt = new Date();
    }

    await task.save();
    sendSuccess(res, { message: 'Task updated', task });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/risk-signals
const getRiskSignals = async (req, res, next) => {
  try {
    const signals = await riskIntelligenceService.getAllActiveSignals();
    sendSuccess(res, { count: signals.length, riskSignals: signals });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications
const getNotifications = async (req, res, next) => {
  try {
    const query = {};
    if (req.user?.familyId) query.familyId = req.user.familyId;
    if (req.user?._id) query.userId = req.user._id;

    if (req.query.category) query.category = req.query.category;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.isRead !== undefined) query.isRead = req.query.isRead === 'true';
    if (req.query.actionRequired !== undefined) query.actionRequired = req.query.actionRequired === 'true';

    const [notifications, unreadCount, totalCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ ...query, isRead: false }),
      Notification.countDocuments(query),
    ]);

    sendSuccess(res, { notifications, unreadCount, totalCount });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read
const markNotificationRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    sendSuccess(res, { success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/read-all
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const query = {};
    if (req.user?.familyId) query.familyId = req.user.familyId;
    if (req.user?._id) query.userId = req.user._id;

    const result = await Notification.updateMany({ ...query, isRead: false }, { isRead: true });
    sendSuccess(res, { success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/geographic-saturation
const getGeographicSaturation = async (req, res, next) => {
  try {
    const { district, taluka } = req.query;
    const saturation = await benefitGapDetector.getGeographicSaturation(district, taluka);
    sendSuccess(res, saturation);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/analytics/priority-families
const getHighPriorityFamilies = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const { district, taluka } = req.query;
    const families = await benefitGapDetector.identifyHighPriorityFamilies(limit, { district, taluka });
    sendSuccess(res, { count: families.length, priorityFamilies: families });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/cron/trigger
const triggerCronJob = async (req, res, next) => {
  try {
    const { job = 'milestones' } = req.body;
    let result = {};

    if (job === 'sla') {
      result = await cronService.runSLABreachCheck();
    } else if (job === 'deprivation') {
      result = await cronService.runDeprivationRecalculation({});
    } else {
      result = await cronService.runAllMilestoneChecks();
    }

    sendSuccess(res, { message: `Cron job '${job}' executed successfully`, result });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/integrations/status
const getIntegrationsStatus = (req, res) => {
  const statusList = getConnectorsStatus();
  sendSuccess(res, {
    disclaimer: 'All external government databases are simulated via interoperability adapters for privacy and testability.',
    connectors: statusList,
  });
};

module.exports = {
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
};
