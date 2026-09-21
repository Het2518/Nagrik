'use strict';

const mongoose = require('mongoose');
const Family = require('../models/Family');
const Member = require('../models/Member');
const DocumentReference = require('../models/DocumentReference');

/**
 * Data Quality, Registry Completeness & Health Scoring Engine (Req 91-94)
 */
class DataQualityService {
  /**
   * Evaluates individual family record completeness (0-100).
   */
  async scoreFamilyDataQuality(familyIdentifier) {
    const isObjectId = mongoose.isValidObjectId(familyIdentifier);
    const family = await Family.findOne(
      isObjectId
        ? { $or: [{ _id: familyIdentifier }, { familyId: familyIdentifier }] }
        : { familyId: familyIdentifier }
    ).populate('headOfFamilyMemberId');

    if (!family) throw new Error('Family not found');

    const members = await Member.find({ familyId: family._id, lifecycleStatus: 'Active' })
      .select('+aadhaarHash')
      .lean();

    let score = 0;
    const passedChecks = [];
    const missingFields = [];

    // 1. Address Completeness (15 pts)
    const addr = family.address || {};
    if (addr.village && addr.taluka && addr.district && addr.pincode) {
      score += 15;
      passedChecks.push({ check: 'ADDRESS_COMPLETE', points: 15, label: 'Full Verified Address' });
    } else {
      missingFields.push({ field: 'address', label: 'Complete postal address & pincode', severity: 'High' });
    }

    // 2. Head of Family Identity (15 pts)
    if (family.headOfFamilyMemberId) {
      score += 15;
      passedChecks.push({ check: 'HEAD_DESIGNATED', points: 15, label: 'Head of Family Designated' });
    } else {
      missingFields.push({ field: 'headOfFamily', label: 'Designated Head of Household', severity: 'Critical' });
    }

    // 3. Ration Card Categorization (10 pts)
    if (family.rationCardType && family.rationCardType !== 'None' && family.rationCardNumber) {
      score += 10;
      passedChecks.push({ check: 'RATION_CARD_LINKED', points: 10, label: 'Ration Card Seeded' });
    } else {
      missingFields.push({ field: 'rationCard', label: 'Ration Card number & tier', severity: 'Medium' });
    }

    // 4. Socioeconomic Baseline (10 pts)
    const socio = family.socioeconomic || {};
    const house = family.household || {};
    if (house.dwellingType && socio.primaryLivelihood) {
      score += 10;
      passedChecks.push({ check: 'SOCIOECONOMIC_DATA', points: 10, label: 'Livelihood & Housing Recorded' });
    } else {
      missingFields.push({ field: 'socioeconomic', label: 'Livelihood & housing profile', severity: 'Medium' });
    }

    // 5. Basic Household Infrastructure (10 pts)
    if (house.electricityConnection !== undefined || house.drinkingWaterSource) {
      score += 10;
      passedChecks.push({ check: 'INFRASTRUCTURE_DATA', points: 10, label: 'Basic Amenities Recorded' });
    } else {
      missingFields.push({ field: 'infrastructure', label: 'Electricity & water connection records', severity: 'Low' });
    }

    // 6. Member Identity & Aadhaar Seeding (15 pts)
    const totalMembers = members.length;
    const membersWithAadhaar = members.filter((m) => m.aadhaarHash || m.aadhaarEncrypted).length;
    if (totalMembers > 0 && membersWithAadhaar === totalMembers) {
      score += 15;
      passedChecks.push({ check: 'MEMBER_AADHAAR_COMPLETE', points: 15, label: '100% Member Aadhaar Coverage' });
    } else if (membersWithAadhaar > 0) {
      const partial = Math.round((membersWithAadhaar / totalMembers) * 15);
      score += partial;
      missingFields.push({
        field: 'memberAadhaar',
        label: `${totalMembers - membersWithAadhaar} member(s) missing Aadhaar seeding`,
        severity: 'Critical',
      });
    } else {
      missingFields.push({ field: 'memberAadhaar', label: 'No Aadhaar seeded for members', severity: 'Critical' });
    }

    // 7. Direct Benefit Transfer (DBT) Bank Account (15 pts)
    const membersWithBank = members.filter((m) => m.bankDetails?.bankName && m.bankDetails?.ifscCode).length;
    if (membersWithBank > 0) {
      score += 15;
      passedChecks.push({ check: 'DBT_BANK_LINKED', points: 15, label: 'DBT Bank Account Seeded' });
    } else {
      missingFields.push({ field: 'bankAccount', label: 'No verified DBT bank account linked', severity: 'Critical' });
    }

    // 8. Core Member Attributes (DOB/Age, Gender, Relationship) (10 pts)
    const membersWithCore = members.filter((m) => (m.relationToHead || m.relationship) && m.gender && (m.dateOfBirth || m.age)).length;
    if (totalMembers > 0 && membersWithCore === totalMembers) {
      score += 10;
      passedChecks.push({ check: 'MEMBER_ATTRIBUTES_COMPLETE', points: 10, label: 'Full Demographic Attributes' });
    } else {
      missingFields.push({ field: 'memberDemographics', label: 'Missing age, gender, or relationship details', severity: 'Medium' });
    }

    const qualityTier = score >= 85 ? 'HighQuality' : score >= 60 ? 'Acceptable' : 'NeedsAttention';

    const recommendations = [];
    if (!membersWithBank) {
      recommendations.push('Seed bank account number and IFSC for Head of Family to enable DBT welfare transfer.');
    }
    if (totalMembers > membersWithAadhaar) {
      recommendations.push('Complete Aadhaar biometric verification for unseeded family members.');
    }
    if (!addr.pincode) {
      recommendations.push('Update postal pincode to enable location-based welfare targeting.');
    }

    return {
      familyId: family._id,
      nagrikId: family.familyId,
      headName: family.headOfFamilyMemberId?.name || 'Unassigned',
      district: family.address?.district || 'Unknown',
      taluka: family.address?.taluka || 'Unknown',
      qualityScore: score,
      qualityTier,
      passedChecks,
      missingFields,
      recommendations,
      hasBankLinked: membersWithBank > 0,
      aadhaarCoveragePct: totalMembers > 0 ? Math.round((membersWithAadhaar / totalMembers) * 100) : 0,
    };
  }

  /**
   * Aggregate data quality report across registry.
   */
  async getDataQualityReport(filters = {}) {
    const familyQuery = { status: { $ne: 'Merged' } };
    if (filters.district && filters.district !== 'All') familyQuery['address.district'] = filters.district;
    if (filters.taluka && filters.taluka !== 'All') familyQuery['address.taluka'] = filters.taluka;

    const families = await Family.find(familyQuery)
      .populate('headOfFamilyMemberId')
      .limit(200)
      .lean();

    const familyIds = families.map((f) => f._id);
    const members = await Member.find({ familyId: { $in: familyIds }, lifecycleStatus: 'Active' })
      .select('+aadhaarHash')
      .lean();

    const membersByFamily = new Map();
    members.forEach((m) => {
      const fid = m.familyId.toString();
      if (!membersByFamily.has(fid)) membersByFamily.set(fid, []);
      membersByFamily.get(fid).push(m);
    });

    let totalScore = 0;
    let highQualityCount = 0;
    let acceptableCount = 0;
    let needsAttentionCount = 0;

    let missingBankCount = 0;
    let missingAadhaarCount = 0;
    let incompleteAddressCount = 0;

    const districtStatsMap = new Map();

    for (const fam of families) {
      const fid = fam._id.toString();
      const famMembers = membersByFamily.get(fid) || [];

      // Lightweight scoring for batch report
      let score = 0;
      const addr = fam.address || {};
      if (addr.village && addr.taluka && addr.district && addr.pincode) score += 20;
      else incompleteAddressCount++;

      if (fam.headOfFamilyMemberId) score += 20;
      if (fam.rationCardType && fam.rationCardType !== 'None') score += 15;
      if (fam.socioeconomic?.primaryLivelihood) score += 15;

      const hasBank = famMembers.some((m) => m.bankDetails?.bankName && m.bankDetails?.ifscCode);
      if (hasBank) score += 15;
      else missingBankCount++;

      const hasAadhaar = famMembers.some((m) => m.aadhaarHash || m.aadhaarEncrypted);
      if (hasAadhaar) score += 15;
      else missingAadhaarCount++;

      totalScore += score;
      if (score >= 85) highQualityCount++;
      else if (score >= 60) acceptableCount++;
      else needsAttentionCount++;

      // Group by district
      const dist = fam.address?.district || 'Other';
      if (!districtStatsMap.has(dist)) {
        districtStatsMap.set(dist, { count: 0, totalScore: 0, highQuality: 0 });
      }
      const dStat = districtStatsMap.get(dist);
      dStat.count++;
      dStat.totalScore += score;
      if (score >= 85) dStat.highQuality++;
    }

    const totalEvaluated = families.length;
    const averageScore = totalEvaluated > 0 ? Math.round(totalScore / totalEvaluated) : 100;

    const districtComparison = Array.from(districtStatsMap.entries()).map(([district, stat]) => ({
      district,
      totalFamilies: stat.count,
      averageScore: Math.round(stat.totalScore / stat.count),
      highQualityPct: Math.round((stat.highQuality / stat.count) * 100),
    }));

    districtComparison.sort((a, b) => b.averageScore - a.averageScore);

    return {
      totalEvaluated,
      averageScore,
      healthIndex: averageScore >= 80 ? 'Healthy' : averageScore >= 60 ? 'Fair' : 'NeedsImmediateAction',
      distribution: {
        highQualityCount,
        acceptableCount,
        needsAttentionCount,
        highQualityPct: totalEvaluated > 0 ? Math.round((highQualityCount / totalEvaluated) * 100) : 0,
      },
      criticalGaps: {
        missingBankCount,
        missingAadhaarCount,
        incompleteAddressCount,
        bankSeedingRatePct: totalEvaluated > 0 ? Math.round(((totalEvaluated - missingBankCount) / totalEvaluated) * 100) : 0,
        aadhaarCoverageRatePct: totalEvaluated > 0 ? Math.round(((totalEvaluated - missingAadhaarCount) / totalEvaluated) * 100) : 0,
      },
      districtComparison,
    };
  }

  /**
   * Lists records with critical missing fields for officer remediation.
   */
  async flagIncompleteRecords(filters = {}, limit = 15) {
    const familyQuery = { status: { $ne: 'Merged' } };
    if (filters.district && filters.district !== 'All') familyQuery['address.district'] = filters.district;
    if (filters.taluka && filters.taluka !== 'All') familyQuery['address.taluka'] = filters.taluka;

    const families = await Family.find(familyQuery)
      .populate('headOfFamilyMemberId')
      .limit(60)
      .lean();

    const scored = [];
    for (const f of families) {
      try {
        const item = await this.scoreFamilyDataQuality(f._id);
        if (item.qualityScore < 85) {
          scored.push(item);
        }
      } catch {
        // continue
      }
    }

    scored.sort((a, b) => a.qualityScore - b.qualityScore);
    return {
      total: scored.length,
      records: scored.slice(0, limit),
    };
  }
}

module.exports = new DataQualityService();
