'use strict';

const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Member = require('../models/Member');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const { checkEligibility } = require('./eligibilityEngine');
const reusableEvidenceService = require('./reusableEvidenceService');

/**
 * BenefitGapDetector — Discovered vs Received Welfare Analytics
 *
 * Compares:
 * 1. Current Benefits (Enrolled / Sanctioned)
 * 2. Potential Benefits (Eligible but not yet claimed)
 * 3. Missing Evidence (Blocking eligible benefits)
 * 4. Expiring Soon (Approaching renewal / reverification)
 */
class BenefitGapDetector {
  async detectGaps(family) {
    const familyId = family._id;

    // 1. Fetch active members, active schemes, existing applications & entitlements
    const [members, activeSchemes, applications, entitlements, evidenceData] = await Promise.all([
      Member.find({ familyId, lifecycleStatus: 'Active' }),
      Scheme.find({ isActive: true }),
      Application.find({ familyId }).populate('schemeId', 'schemeCode schemeName benefitType maxBenefitAmount'),
      BenefitEntitlement.find({ familyId }),
      reusableEvidenceService.getFamilyEvidenceRegistry(familyId),
    ]);

    // Current benefits (Active or FinalApproved)
    const currentBenefitsMap = new Map();

    for (const ent of entitlements) {
      if (['Approved', 'Sanctioned', 'Active', 'Disbursed'].includes(ent.lifecycleState)) {
        currentBenefitsMap.set(ent.schemeCode, {
          schemeCode: ent.schemeCode,
          schemeName: ent.schemeName,
          memberId: ent.memberId,
          lifecycleState: ent.lifecycleState,
          sanctionedAmount: ent.sanctionedAmount,
          renewalDate: ent.renewalDate,
          reverificationDueAt: ent.reverificationDueAt,
        });
      }
    }

    for (const app of applications) {
      if (['FinalApproved', 'Level2Approved'].includes(app.status)) {
        const code = app.schemeId?.schemeCode;
        if (code && !currentBenefitsMap.has(code)) {
          currentBenefitsMap.set(code, {
            schemeCode: code,
            schemeName: app.schemeId?.schemeName,
            memberId: app.memberId,
            lifecycleState: app.status === 'FinalApproved' ? 'Active' : 'UnderReview',
            sanctionedAmount: app.schemeId?.maxBenefitAmount || 0,
            applicationId: app.applicationId,
          });
        }
      }
    }

    const currentBenefits = Array.from(currentBenefitsMap.values());

    // 2. Discover potential benefits for each active member
    const potentialBenefitsMap = new Map();
    const missingEvidenceMap = new Map();

    for (const member of members) {
      const evaluations = checkEligibility(family, member, activeSchemes);

      for (const ev of evaluations) {
        if (!ev.isEligible) continue;

        // Skip if already in current benefits
        if (currentBenefitsMap.has(ev.schemeCode)) continue;

        // Skip if application already in progress
        const inProgress = applications.some(
          (a) =>
            a.memberId.toString() === member._id.toString() &&
            a.schemeId?.schemeCode === ev.schemeCode &&
            !['Rejected', 'Withdrawn'].includes(a.status)
        );
        if (inProgress) continue;

        if (!potentialBenefitsMap.has(ev.schemeCode)) {
          potentialBenefitsMap.set(ev.schemeCode, {
            schemeCode: ev.schemeCode,
            schemeName: ev.schemeName,
            department: ev.department,
            benefitType: ev.benefitType,
            maxBenefitAmount: ev.maxBenefitAmount || 0,
            eligibleMembers: [],
            why: ev.why,
            requiredDocuments: ev.missingEvidence,
          });
        }

        potentialBenefitsMap.get(ev.schemeCode).eligibleMembers.push({
          memberId: member.memberId,
          name: member.name,
          age: member.age,
        });

        // Collect missing evidence
        for (const doc of ev.missingEvidence) {
          if (!missingEvidenceMap.has(doc.docKey)) {
            missingEvidenceMap.set(doc.docKey, {
              ...doc,
              unlocksSchemes: [ev.schemeCode],
            });
          } else {
            const item = missingEvidenceMap.get(doc.docKey);
            if (!item.unlocksSchemes.includes(ev.schemeCode)) {
              item.unlocksSchemes.push(ev.schemeCode);
            }
          }
        }
      }
    }

    const potentialBenefits = Array.from(potentialBenefitsMap.values());
    const missingEvidence = Array.from(missingEvidenceMap.values());

    // 3. Expiring items (certificates or benefits within 60 days)
    const expiringSoon = [
      ...evidenceData.expiringSoon.map((e) => ({
        type: 'Evidence',
        label: e.certificateType,
        identifier: e.certificateNumber,
        daysRemaining: e.daysUntilExpiry,
        expiryDate: e.expiryDate,
      })),
      ...entitlements
        .filter((b) => b.reverificationDueAt && new Date(b.reverificationDueAt) > new Date())
        .map((b) => ({
          type: 'BenefitReverification',
          label: b.schemeCode,
          identifier: b.benefitId,
          dueDate: b.reverificationDueAt,
        })),
    ];

    // 4. Coverage Score
    const totalPotentialWelfare = currentBenefits.length + potentialBenefits.length;
    const coveragePercentage = totalPotentialWelfare > 0
      ? Math.round((currentBenefits.length / totalPotentialWelfare) * 100)
      : 100;

    const estimatedUnclaimedAnnualValue = potentialBenefits.reduce(
      (sum, b) => sum + (b.maxBenefitAmount || 0),
      0
    );

    return {
      coveragePercentage,
      currentBenefitsCount: currentBenefits.length,
      potentialBenefitsCount: potentialBenefits.length,
      missingEvidenceCount: missingEvidence.length,
      estimatedUnclaimedAnnualValue,
      currentBenefits,
      potentialBenefits,
      missingEvidence,
      expiringSoon,
      recommendations: potentialBenefits.slice(0, 3).map((b) => ({
        titleEn: `Apply for ${b.schemeName}`,
        titleGu: `${b.schemeName} માટે અરજી કરો`,
        estimatedBenefit: b.maxBenefitAmount,
        targetMember: b.eligibleMembers[0]?.name || 'Family',
        schemeCode: b.schemeCode,
      })),
    };
  }
}

module.exports = new BenefitGapDetector();
