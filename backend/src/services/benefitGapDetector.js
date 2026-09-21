'use strict';

const mongoose = require('mongoose');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const Member = require('../models/Member');
const Family = require('../models/Family');
const SocialRegistry = require('../models/SocialRegistry');
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

  /**
   * Geographic Saturation Metrics (Req 67-68)
   * Returns scheme-wise coverage and saturation across district/taluka
   */
  async getGeographicSaturation(district = null, taluka = null) {
    const familyQuery = { status: { $ne: 'Merged' } };
    if (district && district !== 'All') familyQuery['address.district'] = district;
    if (taluka && taluka !== 'All') familyQuery['address.taluka'] = taluka;

    const [families, schemes] = await Promise.all([
      Family.find(familyQuery).select('_id familyId address rationCardType').lean(),
      Scheme.find({ isActive: true }).select('schemeCode schemeName department maxBenefitAmount targetGroup').lean(),
    ]);

    const totalFamilies = families.length;
    const familyIds = families.map((f) => f._id);

    // Get all active entitlements or final approved applications for these families
    const [entitlements, applications] = await Promise.all([
      BenefitEntitlement.find({
        familyId: { $in: familyIds },
        lifecycleState: { $in: ['Approved', 'Sanctioned', 'Active', 'Disbursed'] },
      }).lean(),
      Application.find({ familyId: { $in: familyIds }, status: 'FinalApproved' })
        .populate('schemeId', 'schemeCode')
        .lean(),
    ]);

    const schemeBeneficiariesMap = new Map();
    schemes.forEach((s) => schemeBeneficiariesMap.set(s.schemeCode, new Set()));

    entitlements.forEach((e) => {
      if (schemeBeneficiariesMap.has(e.schemeCode)) {
        schemeBeneficiariesMap.get(e.schemeCode).add(e.familyId.toString());
      }
    });

    applications.forEach((a) => {
      const code = a.schemeId?.schemeCode;
      if (code && schemeBeneficiariesMap.has(code)) {
        schemeBeneficiariesMap.get(code).add(a.familyId.toString());
      }
    });

    const saturationList = schemes.map((s) => {
      const enrolledCount = schemeBeneficiariesMap.get(s.schemeCode)?.size || 0;
      const saturationPct = totalFamilies > 0 ? Math.min(100, Math.round((enrolledCount / totalFamilies) * 100)) : 0;
      return {
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        department: s.department,
        maxBenefitAmount: s.maxBenefitAmount || 0,
        enrolledFamilies: enrolledCount,
        unreachedFamilies: Math.max(0, totalFamilies - enrolledCount),
        saturationPct,
        targetSaturationPct: 85, // Government policy benchmark
      };
    });

    // Sort by lowest saturation first (most urgent gaps)
    saturationList.sort((a, b) => a.saturationPct - b.saturationPct);

    return {
      district: district || 'All Districts',
      taluka: taluka || 'All Talukas',
      totalFamilies,
      overallAverageSaturation:
        saturationList.length > 0
          ? Math.round(saturationList.reduce((acc, s) => acc + s.saturationPct, 0) / saturationList.length)
          : 0,
      schemes: saturationList,
    };
  }

  /**
   * Identify High Priority Families Needing Proactive Outreach (Req 69-70)
   */
  async identifyHighPriorityFamilies(limit = 10, filters = {}) {
    const familyQuery = { status: { $ne: 'Merged' } };
    if (filters.district && filters.district !== 'All') familyQuery['address.district'] = filters.district;
    if (filters.taluka && filters.taluka !== 'All') familyQuery['address.taluka'] = filters.taluka;

    const families = await Family.find(familyQuery)
      .populate('headOfFamilyMemberId')
      .limit(60)
      .lean();

    const familyIds = families.map((f) => f._id);
    const [socialRegistries, entitlements] = await Promise.all([
      SocialRegistry.find({ familyId: { $in: familyIds } }).lean(),
      BenefitEntitlement.find({
        familyId: { $in: familyIds },
        lifecycleState: { $in: ['Approved', 'Sanctioned', 'Active', 'Disbursed'] },
      }).lean(),
    ]);

    const registryMap = new Map();
    socialRegistries.forEach((r) => registryMap.set(r.familyId.toString(), r));

    const entitlementCountMap = new Map();
    entitlements.forEach((e) => {
      const fid = e.familyId.toString();
      entitlementCountMap.set(fid, (entitlementCountMap.get(fid) || 0) + 1);
    });

    const evaluated = [];
    for (const fam of families) {
      const fid = fam._id.toString();
      const currentBenefitsCount = entitlementCountMap.get(fid) || 0;
      const reg = registryMap.get(fid);
      const deprivationScore = reg?.deprivationScore ?? (['AAY', 'BPL'].includes(fam.rationCardType) ? 68 : 32);
      const tier = reg?.registryTier || (deprivationScore >= 60 ? 'MostVulnerable' : 'Moderate');

      // Vulnerability priority calculation: high deprivation + low current benefit coverage
      const priorityWeight = deprivationScore * 2 - currentBenefitsCount * 15;

      let reason = 'High multidimensional vulnerability';
      if (currentBenefitsCount === 0) reason = 'Zero active welfare entitlements despite high vulnerability';
      else if (fam.rationCardType === 'AAY') reason = 'Antyodaya Anna Yojana (AAY) poorest household category';

      evaluated.push({
        familyId: fam._id,
        nagrikId: fam.familyId,
        headName: fam.headOfFamilyMemberId?.name || 'Head of Household',
        district: fam.address?.district || 'Unknown',
        taluka: fam.address?.taluka || 'Unknown',
        village: fam.address?.village || '',
        rationCardType: fam.rationCardType || 'APL',
        deprivationScore,
        registryTier: tier,
        currentBenefitsCount,
        priorityWeight,
        priorityReason: reason,
        estimatedUnclaimedValue: 12000 + deprivationScore * 250,
      });
    }

    evaluated.sort((a, b) => b.priorityWeight - a.priorityWeight);
    return evaluated.slice(0, limit);
  }

  /**
   * Calculate Unclaimed Entitlement Value for a Single Family (Req 71-72)
   */
  async calculateUnclaimedValue(familyId) {
    const isObjectId = mongoose.isValidObjectId(familyId);
    const family = await Family.findOne(isObjectId ? { $or: [{ _id: familyId }, { familyId }] } : { familyId });
    if (!family) throw new Error('Family not found');

    const gapReport = await this.detectGaps(family);
    return {
      familyId: family._id,
      nagrikId: family.familyId,
      coveragePercentage: gapReport.coveragePercentage,
      estimatedUnclaimedAnnualValue: gapReport.estimatedUnclaimedAnnualValue,
      potentialBenefitsCount: gapReport.potentialBenefitsCount,
      missingEvidenceCount: gapReport.missingEvidenceCount,
      potentialBenefits: gapReport.potentialBenefits,
      recommendations: gapReport.recommendations,
    };
  }
}

module.exports = new BenefitGapDetector();
