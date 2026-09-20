'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const Notification = require('../models/Notification');
const OfficerTask = require('../models/OfficerTask');
const { checkEligibility } = require('./eligibilityEngine');
const { logAction } = require('./auditLogService');

/**
 * LifecycleTriggerService — Real-time Family Mutation & Welfare Re-evaluation Engine
 *
 * Automatically called when any household vital statistic or member parameter changes:
 * - MEMBER_ADDED (Birth / New Member)
 * - MEMBER_UPDATED (Marital status changed, Education enrolled, Disability registered)
 * - MEMBER_STATUS_CHANGED (Deceased, Migrated)
 * - FAMILY_UPDATED (Income changes, BPL classification, Ration card tier)
 *
 * Performs deterministic re-evaluation:
 * 1. Identifies newly unlocked schemes.
 * 2. Alerts citizen immediately with in-app proactive notification.
 * 3. Safely suspends invalid entitlements (e.g. on bereavement) with officer verification tasks.
 */
class LifecycleTriggerService {
  async handleFamilyMutation(familyId, triggerType, metadata = {}) {
    try {
      const family = await Family.findOne({
        $or: [
          { _id: String(familyId).match(/^[0-9a-fA-F]{24}$/) ? familyId : null },
          { familyId: String(familyId) },
        ],
      });
      if (!family) return null;

      const [activeMembers, activeSchemes, existingApplications, existingEntitlements] =
        await Promise.all([
          Member.find({ familyId: family._id, lifecycleStatus: 'Active' }),
          Scheme.find({ isActive: true }),
          Application.find({ familyId: family._id }),
          BenefitEntitlement.find({ familyId: family._id }),
        ]);

      // Check current in-flight / enrolled scheme IDs or codes
      const claimedSchemeCodes = new Set();
      for (const ent of existingEntitlements) {
        if (['Approved', 'Active', 'Disbursed', 'Sanctioned'].includes(ent.lifecycleState)) {
          claimedSchemeCodes.add(ent.schemeCode);
        }
      }
      for (const app of existingApplications) {
        if (!['Rejected', 'Withdrawn', 'Cancelled'].includes(app.status)) {
          claimedSchemeCodes.add(app.schemeCode);
        }
      }

      // Re-evaluate eligibility for all active members
      const newlyUnlockedSchemes = [];

      for (const member of activeMembers) {
        const results = checkEligibility(family, member, activeSchemes);

        for (const res of results) {
          if (res.isEligible && !claimedSchemeCodes.has(res.schemeCode)) {
            // Check if not already added to newly unlocked list
            if (!newlyUnlockedSchemes.some((s) => s.schemeCode === res.schemeCode)) {
              newlyUnlockedSchemes.push({
                schemeCode: res.schemeCode,
                schemeName: res.schemeName,
                maxBenefitAmount: res.maxBenefitAmount,
                memberId: member.memberId,
                memberName: member.name,
              });
            }
          }
        }
      }

      // Proactive Notification Dispatch if new schemes unlocked
      if (newlyUnlockedSchemes.length > 0) {
        let triggerMsgEn = 'family profile update';
        let triggerMsgGu = 'કુટુંબની વિગતો અપડેટ';

        if (triggerType === 'MEMBER_ADDED') {
          triggerMsgEn = 'addition of a new family member';
          triggerMsgGu = 'નવા સભ્યના ઉમેરા';
        } else if (triggerType === 'MEMBER_UPDATED') {
          triggerMsgEn = 'recent vital statistics update';
          triggerMsgGu = 'સભ્યની તાજેતરની વિગતો';
        } else if (triggerType === 'FAMILY_UPDATED') {
          triggerMsgEn = 'income or socio-economic tier revision';
          triggerMsgGu = 'આવક અથવા સામાજિક-આર્થિક સ્તરમાં ફેરફાર';
        }

        const schemeNames = newlyUnlockedSchemes.map((s) => s.schemeName).join(', ');

        await Notification.create({
          familyId: family._id,
          type: 'BenefitDiscovered',
          titleEn: `🎉 New Scheme Eligibility Unlocked! (${newlyUnlockedSchemes.length} schemes)`,
          titleGu: `🎉 નવી યોજના પાત્રતા પ્રાપ્ત થઈ! (${newlyUnlockedSchemes.length} યોજનાઓ)`,
          messageEn: `Following the ${triggerMsgEn}, your household now qualifies for: ${schemeNames}. Apply online without physical paperwork.`,
          messageGu: `${triggerMsgGu} પછી તમારો પરિવાર હવે આ યોજનાઓ માટે પાત્ર છે: ${schemeNames}. નાગરિક પોર્ટલ પરથી સરળતાથી અરજી કરો.`,
          nextActionUrl: `/schemes`,
        });
      }

      // Handle Death / Bereavement specifically
      if (triggerType === 'MEMBER_STATUS_CHANGED' && metadata.lifecycleStatus === 'Deceased') {
        const deceasedMemberId = metadata.memberId;
        if (deceasedMemberId) {
          // Suspend active applications
          await Application.updateMany(
            { memberId: deceasedMemberId, status: { $nin: ['FinalApproved', 'Rejected'] } },
            {
              $set: {
                status: 'Rejected',
                officerRemarks: 'Auto-suspended: Beneficiary lifecycle status marked Deceased',
              },
            }
          );
          // Suspend benefit entitlements
          await BenefitEntitlement.updateMany(
            { memberId: deceasedMemberId },
            { $set: { lifecycleState: 'Suspended', suspensionReason: 'Beneficiary deceased' } }
          );

          // Create officer verification task
          await OfficerTask.create({
            taskType: 'LifeEventVerification',
            priority: 'Critical',
            familyId: family._id,
            assignedRole: 'Talati',
            jurisdiction: family.address,
            title: `Bereavement Verification for Family ${family.familyId}`,
            description: `Member death reported. Confirm household roster and review survivor welfare eligibility.`,
            actionRequired: 'Verify death certificate and assist family with survivorship benefits.',
          });
        }
      }

      // Audit Log
      await logAction({
        action: 'LIFECYCLE_ELIGIBILITY_EVALUATED',
        actorId: metadata.actorId || family._id,
        actorRole: metadata.actorRole || 'System',
        entityType: 'Family',
        entityId: family.familyId,
        changedFields: {
          triggerType,
          newlyUnlockedCount: newlyUnlockedSchemes.length,
          newlyUnlockedSchemes: newlyUnlockedSchemes.map((s) => s.schemeCode),
        },
      });

      return {
        familyId: family.familyId,
        newlyUnlockedCount: newlyUnlockedSchemes.length,
        newlyUnlockedSchemes,
      };
    } catch (err) {
      console.error('[LifecycleTriggerService] Error processing mutation:', err);
      return null;
    }
  }
}

module.exports = new LifecycleTriggerService();
