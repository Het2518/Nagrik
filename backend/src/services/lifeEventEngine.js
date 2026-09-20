'use strict';

const LifeEvent = require('../models/LifeEvent');
const Member = require('../models/Member');
const Family = require('../models/Family');
const Application = require('../models/Application');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const OfficerTask = require('../models/OfficerTask');
const Notification = require('../models/Notification');
const { logAction } = require('./auditLogService');
const familyBenefitGraphService = require('./familyBenefitGraphService');

/**
 * LifeEventEngine — Proactive Event-Driven Welfare Processing
 *
 * Ingests, verifies, and reacts to life events (Birth, Death, Age, Student, Income, etc.)
 * Triggers targeted impact analysis, updates member records, generates officer verification tasks,
 * and alerts citizens without taking irreversible unverified decisions.
 */
class LifeEventEngine {
  async recordEvent({
    familyId,
    memberId = null,
    eventType,
    eventDate = new Date(),
    source = 'CitizenReported',
    confidence = 'Reported',
    details = {},
    evidence = [],
    recordedBy = null,
    recordedByRole = 'Citizen',
  }) {
    const family = await Family.findOne({
      $or: [
        { _id: String(familyId).match(/^[0-9a-fA-F]{24}$/) ? familyId : null },
        { familyId: String(familyId) },
      ],
    });
    if (!family) throw new Error('Family not found');

    const resolvedFamilyId = family._id;

    // 1. Create the LifeEvent record
    const event = await LifeEvent.create({
      eventType,
      affectedFamilyId: resolvedFamilyId,
      affectedMemberId: memberId,
      eventDate,
      source,
      confidence,
      details,
      evidence,
      recordedBy,
      recordedByRole,
      verificationStatus: source === 'CivilRegistrationConnector' || confidence === 'Authoritative'
        ? 'Verified'
        : 'PendingVerification',
    });

    const tasksCreated = [];
    const notificationsCreated = [];

    // 2. Perform Impact Analysis
    const impact = await familyBenefitGraphService.analyzeImpact(resolvedFamilyId, {
      eventType,
      affectedMemberId: memberId,
      simulatedChanges: details,
    });

    event.impactSummary = impact.summaryEn;
    await event.save();

    // 3. Downstream Processing based on Event Type & Verification State
    if (eventType === 'Death') {
      if (memberId && event.verificationStatus === 'Verified') {
        await Member.findByIdAndUpdate(memberId, { lifecycleStatus: 'Deceased' });
        // Suspend active applications / benefits for this member
        await Application.updateMany(
          { memberId, status: { $nin: ['Rejected', 'FinalApproved'] } },
          { status: 'Rejected', rejectionCategory: 'Other', remarks: 'Suspended: Beneficiary marked Deceased via verified Civil Registry' }
        );
        await BenefitEntitlement.updateMany(
          { memberId },
          { lifecycleState: 'Suspended', suspensionReason: 'Beneficiary deceased' }
        );
      }

      // Generate task for officer review
      const task = await OfficerTask.create({
        taskType: 'LifeEventVerification',
        priority: 'Critical',
        familyId: resolvedFamilyId,
        memberId,
        lifeEventId: event._id,
        assignedRole: 'Talati',
        jurisdiction: family.address,
        title: `Verify Death Life Event — ${event.eventId}`,
        description: `Death reported for family member. Field verification required before pension adjustments.`,
        actionRequired: 'Inspect civil registration record and confirm household vital statistics.',
      });
      tasksCreated.push(task);

      const notif = await Notification.create({
        familyId: resolvedFamilyId,
        type: 'LifeEventDetected',
        titleEn: 'Life Event Recorded: Death Registration',
        titleGu: 'જીવન ઘટના નોંધાઈ: અવસાન નોંધણી',
        messageEn: 'A life event for family vital statistics has been recorded and submitted for Talati verification.',
        messageGu: 'કુટુંબની જીવન ઘટના નોંધાઈ છે અને તલાટી ચકાસણી માટે મોકલવામાં આવી છે.',
        nextActionUrl: `/family`,
      });
      notificationsCreated.push(notif);
    } else if (eventType === 'AgeThresholdReached') {
      // e.g. Turned 18 or 60
      if (impact.newlyAvailableSchemes.length > 0) {
        const notif = await Notification.create({
          familyId: resolvedFamilyId,
          type: 'BenefitDiscovered',
          titleEn: `New Welfare Schemes Unlocked! (${impact.newlyAvailableSchemes.length} schemes)`,
          titleGu: `નવી યોજનાઓ ઉપલબ્ધ થઈ! (${impact.newlyAvailableSchemes.length} યોજનાઓ)`,
          messageEn: `Based on an age milestone, your family now qualifies for: ${impact.newlyAvailableSchemes.map((s) => s.schemeName).join(', ')}`,
          messageGu: `ઉંમરના તબક્કા અનુસાર તમારો પરિવાર હવે આ યોજનાઓ માટે પાત્ર છે: ${impact.newlyAvailableSchemes.map((s) => s.schemeName).join(', ')}`,
          nextActionUrl: `/schemes`,
        });
        notificationsCreated.push(notif);
      }
    } else if (eventType === 'IncomeChange') {
      if (details.newIncome !== undefined && event.verificationStatus === 'Verified') {
        await Family.findByIdAndUpdate(resolvedFamilyId, { annualIncome: details.newIncome });
      } else {
        // Create officer task to verify new income certificate
        const task = await OfficerTask.create({
          taskType: 'EvidenceReview',
          priority: 'Medium',
          familyId: resolvedFamilyId,
          lifeEventId: event._id,
          assignedRole: 'Talati',
          jurisdiction: family.address,
          title: `Verify Income Change Declaration`,
          description: `Family declared updated annual income: ₹${details.newIncome?.toLocaleString('en-IN')}`,
          actionRequired: 'Verify declared income against digital revenue records or fresh income certificate.',
        });
        tasksCreated.push(task);
      }
    } else {
      // Default: create officer verification task if not authoritative
      if (event.verificationStatus === 'PendingVerification') {
        const task = await OfficerTask.create({
          taskType: 'LifeEventVerification',
          priority: 'Medium',
          familyId: resolvedFamilyId,
          memberId,
          lifeEventId: event._id,
          assignedRole: 'Talati',
          jurisdiction: family.address,
          title: `Verify ${eventType} Life Event`,
          description: `Citizen reported '${eventType}'. Supporting evidence submitted for review.`,
          actionRequired: 'Review submitted evidence and confirm event validity.',
        });
        tasksCreated.push(task);
      }
    }

    // 4. Audit Trail
    await logAction({
      action: 'LIFE_EVENT_RECORDED',
      actorId: recordedBy || resolvedFamilyId,
      actorRole: recordedByRole,
      entityType: 'LifeEvent',
      entityId: event.eventId,
      changedFields: { eventType, details, verificationStatus: event.verificationStatus },
    });

    return {
      event,
      impact,
      tasksCreated,
      notificationsCreated,
    };
  }

  async verifyEvent(eventId, officer) {
    const event = await LifeEvent.findById(eventId);
    if (!event) throw new Error('Life event not found');

    event.verificationStatus = 'Verified';
    event.verifiedBy = officer.id || officer._id;
    event.verifiedAt = new Date();
    await event.save();

    // Mark associated tasks completed
    await OfficerTask.updateMany(
      { lifeEventId: event._id, status: 'Open' },
      { status: 'Completed', resolvedBy: officer.id || officer._id, resolvedAt: new Date() }
    );

    // Apply downstream mutations if Death
    if (event.eventType === 'Death' && event.affectedMemberId) {
      await Member.findByIdAndUpdate(event.affectedMemberId, { lifecycleStatus: 'Deceased' });
    }

    // Audit log
    await logAction({
      action: 'LIFE_EVENT_VERIFIED',
      actorId: officer.id || officer._id,
      actorRole: officer.role,
      entityType: 'LifeEvent',
      entityId: event.eventId,
      changedFields: { verificationStatus: 'Verified' },
    });

    return event;
  }
}

module.exports = new LifeEventEngine();
