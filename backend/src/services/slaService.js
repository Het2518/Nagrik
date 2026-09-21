'use strict';

const Application = require('../models/Application');
const { logAction } = require('./auditLogService');

/**
 * Service Level Agreement (SLA) & Turnaround Target Engine (Req 52-55)
 */
const slaService = {
  /**
   * Initializes SLA target deadlines on application creation.
   */
  calculateSLA: (application, scheme) => {
    let days = 14; // Standard state turnaround

    if (scheme?.slaDays && scheme.slaDays > 0) {
      days = scheme.slaDays;
    } else if (application.priority === 'FastTrack') {
      days = 5;
    } else if (application.priority === 'Urgent') {
      days = 3;
    }

    const submitted = application.submittedAt ? new Date(application.submittedAt) : new Date();
    const targetDate = new Date(submitted.getTime() + days * 24 * 60 * 60 * 1000);

    application.sla = {
      targetCompletionDate: targetDate,
      slaDaysTotal: days,
      isBreached: false,
      breachedAt: null,
    };

    return application;
  },

  /**
   * Evaluates dynamic SLA remaining time and percentage elapsed.
   */
  getSLAStatus: (application) => {
    if (!application?.sla?.targetCompletionDate) {
      return { isBreached: false, remainingDays: 14, remainingHours: 336, elapsedPercent: 0 };
    }

    const now = new Date();
    const target = new Date(application.sla.targetCompletionDate);
    const submitted = new Date(application.submittedAt || application.createdAt || now);

    const isBreached = now > target || application.sla.isBreached;
    const diffMs = target.getTime() - now.getTime();
    const remainingHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const remainingDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    const totalDuration = target.getTime() - submitted.getTime();
    const elapsedMs = now.getTime() - submitted.getTime();
    const elapsedPercent = totalDuration > 0
      ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalDuration) * 100)))
      : 100;

    return {
      isBreached,
      remainingDays,
      remainingHours,
      elapsedPercent,
      targetDate: target,
      approachingBreach: !isBreached && remainingDays <= 2,
    };
  },

  /**
   * Automated cron scanner checking and flagging SLA breaches across the registry.
   */
  checkSLABreaches: async () => {
    const now = new Date();
    const pendingStatuses = [
      'Pending',
      'Level1Review', 'Level1Approved',
      'Level2Review', 'Level2Approved',
      'Level3Review',
    ];

    const breachedApps = await Application.find({
      status: { $in: pendingStatuses },
      'sla.targetCompletionDate': { $lt: now },
      'sla.isBreached': { $ne: true },
    });

    let count = 0;
    for (const app of breachedApps) {
      app.sla.isBreached = true;
      app.sla.breachedAt = now;
      app.escalated = true;
      app.escalatedAt = now;
      app.priority = 'Urgent';
      app.escalationReason = 'Automatic SLA deadline breached';

      await app.save();
      count++;

      await logAction({
        action: 'SLA_BREACH_ESCALATED',
        actorId: 'SYSTEM_CRON',
        actorRole: 'System',
        entityType: 'Application',
        entityId: app.applicationId,
        details: { targetDate: app.sla.targetCompletionDate, breachedAt: now },
      });
    }

    return { breachedCount: count };
  },

  /**
   * Aggregates SLA queue workload metrics for officer dashboards.
   */
  getQueueSLAMetrics: async (queryFilter = {}) => {
    const activeFilter = {
      ...queryFilter,
      status: {
        $in: [
          'Pending',
          'Level1Review', 'Level1Approved',
          'Level2Review', 'Level2Approved',
          'Level3Review',
        ],
      },
    };

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const [totalActive, breached, approaching, escalated, fastTrack] = await Promise.all([
      Application.countDocuments(activeFilter),
      Application.countDocuments({
        ...activeFilter,
        $or: [{ 'sla.isBreached': true }, { 'sla.targetCompletionDate': { $lt: now } }],
      }),
      Application.countDocuments({
        ...activeFilter,
        'sla.isBreached': { $ne: true },
        'sla.targetCompletionDate': { $gte: now, $lte: twoDaysFromNow },
      }),
      Application.countDocuments({ ...activeFilter, escalated: true }),
      Application.countDocuments({ ...activeFilter, priority: 'FastTrack' }),
    ]);

    return {
      totalActive,
      withinSLA: Math.max(0, totalActive - breached),
      approachingBreach: approaching,
      breached,
      escalated,
      fastTrack,
    };
  },
};

module.exports = slaService;
