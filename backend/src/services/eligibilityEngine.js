'use strict';

const Scheme = require('../models/Scheme');

/**
 * Explainable Eligibility Engine — Nagrik V2
 *
 * Evaluates household and member attributes against configured deterministic rules.
 * Returns both backward-compatible fields (isEligible, reasons) and explainable V2 intelligence:
 * status, why, satisfiedRules, failedRules, missingEvidence, nextActions.
 */
const checkEligibility = (family, member, schemes) => {
  const results = [];

  for (const scheme of schemes) {
    const r = scheme.eligibilityRules || {};
    const schemeFailures = [];
    const satisfiedRules = [];

    // Rule 1: Age Range
    if (r.minAge !== undefined && r.minAge !== null) {
      if (member.age < r.minAge) {
        schemeFailures.push(`Minimum age is ${r.minAge} (member is ${member.age})`);
      } else {
        satisfiedRules.push(`Age requirement satisfied (current age: ${member.age} ≥ ${r.minAge})`);
      }
    }

    if (r.maxAge !== undefined && r.maxAge !== null) {
      if (member.age > r.maxAge) {
        schemeFailures.push(`Maximum age is ${r.maxAge} (member is ${member.age})`);
      } else {
        satisfiedRules.push(`Within maximum age ceiling (current age: ${member.age} ≤ ${r.maxAge})`);
      }
    }

    // Rule 2: Annual Household Income
    if (r.maxAnnualIncome !== undefined && r.maxAnnualIncome !== null) {
      if (family.annualIncome > r.maxAnnualIncome) {
        schemeFailures.push(
          `Income limit ₹${r.maxAnnualIncome.toLocaleString('en-IN')} (family earns ₹${family.annualIncome.toLocaleString('en-IN')})`
        );
      } else {
        satisfiedRules.push(
          `Household income ₹${family.annualIncome.toLocaleString('en-IN')} is within ceiling of ₹${r.maxAnnualIncome.toLocaleString('en-IN')}`
        );
      }
    }

    // Rule 3: BPL Status
    if (r.requiredBplStatus) {
      if (!family.bplStatus) {
        schemeFailures.push('Family must have BPL status');
      } else {
        satisfiedRules.push('Verified BPL (Below Poverty Line) status confirmed');
      }
    }

    // Rule 4: Social Reservation Category
    if (r.allowedCategories?.length) {
      if (!r.allowedCategories.includes(family.category)) {
        schemeFailures.push(`Category must be one of: ${r.allowedCategories.join(', ')}`);
      } else {
        satisfiedRules.push(`Category '${family.category}' qualifies under scheme reservation guidelines`);
      }
    }

    // Rule 5: NFSA Ration Card Tier
    if (r.allowedRationTypes?.length) {
      if (!r.allowedRationTypes.includes(family.rationCardType)) {
        schemeFailures.push(`Ration card must be one of: ${r.allowedRationTypes.join(', ')}`);
      } else {
        satisfiedRules.push(`Ration card category '${family.rationCardType}' is covered`);
      }
    }

    // Rule 6: Marital Status
    if (r.requiredMaritalStatus?.length) {
      if (!r.requiredMaritalStatus.includes(member.maritalStatus)) {
        schemeFailures.push(`Marital status must be: ${r.requiredMaritalStatus.join(' or ')}`);
      } else {
        satisfiedRules.push(`Marital status '${member.maritalStatus}' satisfies scheme criteria`);
      }
    }

    // Rule 7: Disability
    if (r.requiresDisability) {
      if (!member.hasDisability) {
        schemeFailures.push('Member must have a registered disability');
      } else {
        satisfiedRules.push(`Registered disability status confirmed (${member.disabilityPercentage || 40}%+)`);
      }
    }

    // Rule 8: Student Status
    if (r.requiresStudentStatus) {
      if (!member.isStudent) {
        schemeFailures.push('Member must be an actively enrolled student');
      } else {
        satisfiedRules.push('Active enrolled student status confirmed');
      }
    }

    // Rule 9: Farmer Status
    if (r.requiresFarmerStatus) {
      const isFarmer = member.occupation === 'Farmer' || family.socioeconomic?.isFarmer || (family.socioeconomic?.landHolding > 0);
      if (!isFarmer) {
        schemeFailures.push('Member or family must be registered as agriculturalist/farmer');
      } else {
        satisfiedRules.push('Agriculturalist / landholder status confirmed');
      }
    }

    // Rule 10: BOCW Construction Worker
    if (r.requiresBOCWWorker) {
      const isBocw = family.socioeconomic?.isBOCWWorker || member.occupation === 'Construction' || member.occupation === 'Labour';
      if (!isBocw) {
        schemeFailures.push('Registered Building & Other Construction Worker (BOCW) status required');
      } else {
        satisfiedRules.push('BOCW construction worker status confirmed');
      }
    }

    // Rule 11: Specific Occupations
    if (r.targetOccupations?.length) {
      if (!r.targetOccupations.includes(member.occupation)) {
        schemeFailures.push(`Occupation must be one of: ${r.targetOccupations.join(', ')} (member is ${member.occupation || 'Unemployed'})`);
      } else {
        satisfiedRules.push(`Occupation '${member.occupation}' matches target beneficiary group`);
      }
    }

    // Rule 12: Household Composition (Children / Seniors)
    if (r.minChildrenCount !== undefined && r.minChildrenCount !== null) {
      const childCount = family.familyComposition?.children || 0;
      if (childCount < r.minChildrenCount) {
        schemeFailures.push(`Household must have at least ${r.minChildrenCount} children under 18 (has ${childCount})`);
      } else {
        satisfiedRules.push(`Household children requirement satisfied (${childCount} ≥ ${r.minChildrenCount})`);
      }
    }

    if (r.requiresSeniorCitizen) {
      const seniors = family.familyComposition?.seniorCitizens || (member.age >= 60 ? 1 : 0);
      if (seniors < 1) {
        schemeFailures.push('Household must have at least one senior citizen (60+ years)');
      } else {
        satisfiedRules.push('Senior citizen presence in household confirmed');
      }
    }

    // Rule 13: Geographic Restrictions
    let isDistrictEligible = true;
    let geoMessage = 'Available statewide in Gujarat';
    if (scheme.geographicRestrictions?.districts?.length) {
      const familyDistrict = family.address?.district || '';
      const matched = scheme.geographicRestrictions.districts.some(
        d => d.toLowerCase() === familyDistrict.toLowerCase()
      );
      if (!matched) {
        isDistrictEligible = false;
        geoMessage = `Restricted to: ${scheme.geographicRestrictions.districts.join(', ')}`;
        schemeFailures.push(`Scheme is only available in districts: ${scheme.geographicRestrictions.districts.join(', ')}`);
      } else {
        geoMessage = `Available in ${familyDistrict} district`;
        satisfiedRules.push(`District '${familyDistrict}' is within eligible geographic zone`);
      }
    }

    // Rule 14: Social Registry Deprivation Score
    if (r.minDeprivationScore !== undefined && r.minDeprivationScore !== null) {
      const familyDepScore = family.deprivationScore || 50; // fallback if not yet synced
      if (familyDepScore < r.minDeprivationScore) {
        schemeFailures.push(`Minimum Social Deprivation Score required is ${r.minDeprivationScore} (family score is ${familyDepScore})`);
      } else {
        satisfiedRules.push(`Social vulnerability score (${familyDepScore}) meets minimum threshold (≥ ${r.minDeprivationScore})`);
      }
    }

    const totalRules = satisfiedRules.length + schemeFailures.length;
    const isEligible = schemeFailures.length === 0;
    const confidenceScore = totalRules > 0
      ? Math.round((satisfiedRules.length / totalRules) * 100)
      : (isEligible ? 100 : 0);

    // Determine fine-grained V2 status
    let status = 'NotEligible';
    if (isEligible) {
      status = 'Eligible';
    } else if (confidenceScore >= 75) {
      status = 'PotentialMatch'; // Partial match / near eligibility
    }

    // Construct human-readable "Why" explanation
    const why = isEligible
      ? satisfiedRules.slice(0, 4)
      : schemeFailures;

    // Missing required evidence for this scheme
    const missingEvidence = (scheme.requiredDocuments || []).map((doc) => ({
      docKey: doc.docKey,
      label: doc.label,
      description: doc.description || `Required official ${doc.label}`,
      isRequired: doc.isRequired !== false,
    }));

    // Next recommended actions
    const nextActions = isEligible
      ? [
          {
            actionEn: 'Apply now using verified family credentials',
            actionGu: 'પ્રમાણિત કુટુંબ વિગતો સાથે હમણાં અરજી કરો',
            type: 'APPLY',
            url: `/schemes/${scheme.schemeCode}`,
          },
        ]
      : [
          {
            actionEn: 'Review unmet criteria or update family circumstances if changed',
            actionGu: 'અપૂર્ણ શરતો તપાસો અથવા વિગતો અપડેટ કરો',
            type: 'REVIEW_CRITERIA',
            url: `/schemes/${scheme.schemeCode}`,
          },
        ];

    results.push({
      schemeId: scheme._id,
      schemeCode: scheme.schemeCode,
      schemeName: scheme.schemeName,
      department: scheme.department,
      benefitType: scheme.benefitType,
      maxBenefitAmount: scheme.maxBenefitAmount,
      targetGroup: scheme.targetGroup || 'Individual',
      isEligible,
      confidenceScore,
      reasons: schemeFailures,
      geographicStatus: {
        isDistrictEligible,
        message: geoMessage,
      },
      stackingInfo: {
        allowsWith: scheme.stackingRules?.allowsWith || [],
        blockedWith: scheme.stackingRules?.blockedWith || scheme.eligibilityRules?.conflictingSchemes || [],
        maxConcurrent: scheme.stackingRules?.maxConcurrent || 5,
      },
      budgetInfo: scheme.budgetInfo || {
        totalBudget: 50000000,
        disbursedAmount: 12500000,
        remainingBudget: 37500000,
        fiscalYear: '2024-2025',
      },
      renewalRules: scheme.renewalRules || {
        autoRenewable: false,
        renewalPeriodMonths: 12,
        gracePeriodDays: 30,
      },
      // ── V2 Explainability Extensions ──────────────────────────────────────
      status,
      why,
      satisfiedRules,
      failedRules: schemeFailures,
      missingEvidence,
      conflictingEvidence: [],
      nextActions,
      ruleVersion: scheme.version || 1,
      evaluatedAt: new Date(),
    });
  }

  return results;
};

// Convenience wrapper that fetches active schemes
const checkEligibilityWithFetch = async (family, member) => {
  const schemes = await Scheme.find({ isActive: true });
  return checkEligibility(family, member, schemes);
};

module.exports = { checkEligibility, checkEligibilityWithFetch };
