'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');
const Notification = require('../models/Notification');
const LifeEvent = require('../models/LifeEvent');
const reusableEvidenceService = require('./reusableEvidenceService');
const saturationAnalyticsService = require('./saturationAnalyticsService');
const { checkEligibility } = require('./eligibilityEngine');
const { logAction } = require('./auditLogService');

/**
 * CronService — Automated Milestone & Lifecycle Welfare Engine
 *
 * Runs scheduled background jobs and provides on-demand admin evaluation for:
 * 1. Citizen Age Milestone Transitions (e.g. turning 60 for pensions, turning 18, student age).
 * 2. Expiring Evidence & Certificate Renewal Alerts (e.g. income certificates expiring in 30 days).
 * 3. Scheme-Specific Saturation and Unreached Beneficiary Recalculation.
 */
class CronService {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
  }

  /**
   * Start scheduled background execution (every 12 hours in production).
   */
  initScheduledJobs() {
    if (this.intervalHandle) return;

    // Run first evaluation after 30 seconds to allow DB connection to settle
    setTimeout(() => {
      this.runAllMilestoneChecks().catch((err) =>
        console.error('[CronService] Initial run error:', err.message)
      );
    }, 30000);

    // Schedule every 12 hours
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    this.intervalHandle = setInterval(() => {
      this.runAllMilestoneChecks().catch((err) =>
        console.error('[CronService] Periodic run error:', err.message)
      );
    }, TWELVE_HOURS_MS);

    console.log('[CronService] Automated welfare lifecycle cron service initialized.');
  }

  /**
   * Comprehensive milestone check across all families and members.
   */
  async runAllMilestoneChecks() {
    if (this.isRunning) return { status: 'already_running' };
    this.isRunning = true;
    const startTime = Date.now();

    const report = {
      evaluatedMembersCount: 0,
      ageMilestonesDetected: 0,
      expiringEvidenceAlerts: 0,
      notificationsDispatched: 0,
      durationMs: 0,
    };

    try {
      const now = new Date();
      const activeMembers = await Member.find({ lifecycleStatus: 'Active' });
      const activeSchemes = await Scheme.find({ isActive: true });

      // 1. Check Age Milestone Transitions
      for (const member of activeMembers) {
        report.evaluatedMembersCount++;
        if (!member.dateOfBirth) continue;

        // Calculate accurate real-time age
        const dob = new Date(member.dateOfBirth);
        let currentAge = now.getFullYear() - dob.getFullYear();
        const monthDiff = now.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
          currentAge--;
        }

        // Update member.age in DB if changed
        if (member.age !== currentAge) {
          const oldAge = member.age;
          member.age = currentAge;
          await member.save();

          // Milestone: Senior Citizen (Turned 60)
          if (oldAge < 60 && currentAge >= 60) {
            report.ageMilestonesDetected++;

            // Create LifeEvent
            await LifeEvent.create({
              eventType: 'AgeThresholdReached',
              affectedFamilyId: member.familyId,
              affectedMemberId: member._id,
              eventDate: now,
              source: 'SystemAutomatedCron',
              confidence: 'Authoritative',
              details: { milestone: 'SeniorCitizen', oldAge, newAge: currentAge },
              verificationStatus: 'Verified',
            });

            // Dispatch Senior Citizen Pension alert
            await Notification.create({
              familyId: member.familyId,
              type: 'BenefitDiscovered',
              titleEn: `Senior Citizen Milestone: ${member.name} is now 60!`,
              titleGu: `વરિષ્ઠ નાગરિક સીમાચિહ્ન: ${member.name} હવે 60 વર્ષ પૂર્ણ કર્યા!`,
              messageEn: `${member.name} has attained senior citizen status and is now eligible for Old Age Pension (IGNOAPS / Gujarat Niradhar Vrudhdh Sahay). Apply today with Family ID.`,
              messageGu: `${member.name} વરિષ્ઠ નાગરિક બન્યા છે અને વૃદ્ધ પેન્શન સહાય યોજના માટે પાત્ર છે. નાગરિક પોર્ટલ પરથી અરજી કરો.`,
              nextActionUrl: `/schemes/SCH002`,
            });
            report.notificationsDispatched++;
          }

          // Milestone: Turned 18 (Adult Welfare)
          if (oldAge < 18 && currentAge >= 18) {
            report.ageMilestonesDetected++;
            await Notification.create({
              familyId: member.familyId,
              type: 'BenefitDiscovered',
              titleEn: `Adult Welfare Milestone: ${member.name} turned 18!`,
              titleGu: `પુખ્ત વય સીમાચિહ્ન: ${member.name} 18 વર્ષ પૂર્ણ કર્યા!`,
              messageEn: `${member.name} is now eligible for adult skill development, youth entrepreneurship schemes, and electoral welfare.`,
              messageGu: `${member.name} હવે યુવા કૌશલ્ય અને રોજગાર યોજનાઓ માટે પાત્ર છે.`,
              nextActionUrl: `/schemes`,
            });
            report.notificationsDispatched++;
          }
        }
      }

      // 2. Check Expiring Certificates (< 30 days)
      const families = await Family.find({ status: 'Verified' }).select('_id familyId');
      for (const fam of families) {
        try {
          const evidenceData = await reusableEvidenceService.getFamilyEvidenceRegistry(fam._id);
          for (const exp of evidenceData.expiringSoon || []) {
            if (exp.daysUntilExpiry <= 30) {
              report.expiringEvidenceAlerts++;
              // Check if already notified recently to prevent spam
              const recentNotif = await Notification.findOne({
                familyId: fam._id,
                type: 'DocumentExpiring',
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              });

              if (!recentNotif) {
                await Notification.create({
                  familyId: fam._id,
                  type: 'DocumentExpiring',
                  titleEn: `Expiring Certificate Alert: ${exp.certificateType}`,
                  titleGu: `પ્રમાણપત્ર સમાપ્તિ સૂચના: ${exp.certificateType}`,
                  messageEn: `Your registered ${exp.certificateType} (No: ${exp.certificateNumber}) expires in ${exp.daysUntilExpiry} days. Renew it to maintain uninterrupted welfare benefits.`,
                  messageGu: `તમારું ${exp.certificateType} પ્રમાણપત્ર ${exp.daysUntilExpiry} દિવસમાં પૂર્ણ થાય છે. સહાય ચાલુ રાખવા માટે સમયસર રિન્યૂ કરો.`,
                  nextActionUrl: `/family`,
                });
                report.notificationsDispatched++;
              }
            }
          }
        } catch {
          // ignore individual family evidence query errors
        }
      }

      report.durationMs = Date.now() - startTime;

      await logAction({
        action: 'CRON_MILESTONES_EVALUATED',
        actorId: 'SYSTEM_CRON',
        actorRole: 'System',
        entityType: 'System',
        entityId: 'ALL_SCHEMES',
        changedFields: report,
      });

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * On-demand cron evaluation for a specific scheme.
   * Recalculates saturation and identifies all eligible unreached citizens.
   */
  async evaluateSchemeCron(schemeIdentifier, officer = { id: 'SYSTEM', role: 'System' }) {
    const isObjectId = String(schemeIdentifier).match(/^[0-9a-fA-F]{24}$/);
    const scheme = await Scheme.findOne({
      $or: [
        { _id: isObjectId ? schemeIdentifier : null },
        { schemeCode: String(schemeIdentifier).toUpperCase() },
      ],
    }).lean();

    if (!scheme) throw new Error('Scheme not found');

    // Run saturation analytics calculation
    const data = await saturationAnalyticsService.getSchemeBeneficiaries(scheme.schemeCode, {
      status: 'ALL',
      limit: 100,
    });

    const unreachedCount = data.summary.unreachedCount;

    await logAction({
      action: 'SCHEME_CRON_EVALUATED',
      actorId: officer.id || officer._id,
      actorRole: officer.role,
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      changedFields: {
        schemeCode: scheme.schemeCode,
        summary: data.summary,
      },
    });

    return {
      schemeCode: scheme.schemeCode,
      schemeName: scheme.schemeName,
      evaluatedAt: new Date(),
      summary: data.summary,
      message: `Cron evaluation completed: ${data.summary.eligibleFamiliesCount} eligible families discovered (${data.summary.saturationRate}% saturated, ${unreachedCount} unreached).`,
    };
  }
}

module.exports = new CronService();
