'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const Notification = require('../models/Notification');
const { checkEligibility } = require('./eligibilityEngine');
const { logAction } = require('./auditLogService');

/**
 * SaturationAnalyticsService — State-wide Scheme Saturation & Beneficiary Discovery
 *
 * For any given scheme:
 * 1. Evaluates all verified households and active members across Gujarat (or within officer's jurisdiction).
 * 2. Cross-references actual Application and BenefitEntitlement states.
 * 3. Categorizes each eligible family/member:
 *    - ENROLLED: Currently receiving active benefit
 *    - APPLIED: In-flight application under verification
 *    - ELIGIBLE_UNREACHED: 100% eligible, but has NOT applied yet (Coverage Gap)
 * 4. Computes state saturation percentage: (Enrolled / Total Eligible) * 100
 * 5. Enables direct welfare nudging (proactive notification dispatch).
 */
class SaturationAnalyticsService {
  /**
   * Get comprehensive saturation metrics and list of eligible beneficiaries for a scheme.
   */
  async getSchemeBeneficiaries(schemeIdentifier, options = {}) {
    const {
      page = 1,
      limit = 20,
      district,
      taluka,
      status = 'ALL', // 'ALL' | 'ENROLLED' | 'APPLIED' | 'ELIGIBLE_UNREACHED'
      search,
    } = options;

    // 1. Resolve Scheme
    const isObjectId = String(schemeIdentifier).match(/^[0-9a-fA-F]{24}$/);
    const scheme = await Scheme.findOne({
      $or: [
        { _id: isObjectId ? schemeIdentifier : null },
        { schemeCode: String(schemeIdentifier).toUpperCase() },
      ],
    }).lean();

    if (!scheme) {
      throw new Error(`Scheme '${schemeIdentifier}' not found`);
    }

    // 2. Build family query
    const familyQuery = {};
    if (district) familyQuery['address.district'] = district;
    if (taluka) familyQuery['address.taluka'] = taluka;

    // 3. Fetch families, active members, applications, and entitlements
    const [families, members, applications, entitlements] = await Promise.all([
      Family.find(familyQuery).sort({ createdAt: -1 }).lean(),
      Member.find({ lifecycleStatus: 'Active' }).lean(),
      Application.find({
        schemeId: scheme._id,
        status: { $nin: ['Withdrawn'] },
      }).lean(),
      BenefitEntitlement.find({
        schemeCode: scheme.schemeCode,
        lifecycleState: { $in: ['Approved', 'Sanctioned', 'Active', 'Disbursed'] },
      }).lean(),
    ]);

    // Fast lookups
    const membersByFamily = new Map();
    for (const m of members) {
      const fId = m.familyId.toString();
      if (!membersByFamily.has(fId)) membersByFamily.set(fId, []);
      membersByFamily.get(fId).push(m);
    }

    const applicationsByMember = new Map();
    const applicationsByFamily = new Map();
    for (const app of applications) {
      if (app.memberId) applicationsByMember.set(app.memberId.toString(), app);
      if (app.familyId) applicationsByFamily.set(app.familyId.toString(), app);
    }

    const entitlementsByMember = new Map();
    const entitlementsByFamily = new Map();
    for (const ent of entitlements) {
      if (ent.memberId) entitlementsByMember.set(ent.memberId.toString(), ent);
      if (ent.familyId) entitlementsByFamily.set(ent.familyId.toString(), ent);
    }

    // 4. Evaluate eligibility for every family
    const allEligibleBeneficiaries = [];
    let totalFamiliesEvaluated = families.length;
    let enrolledCount = 0;
    let appliedCount = 0;
    let unreachedCount = 0;

    for (const family of families) {
      const familyMembers = membersByFamily.get(family._id.toString()) || [];
      if (familyMembers.length === 0) continue;

      // Check each member's eligibility for this scheme
      const qualifyingMembers = [];
      let whyReasons = [];

      for (const member of familyMembers) {
        const evalResults = checkEligibility(family, member, [scheme]);
        const result = evalResults[0];
        if (result?.isEligible) {
          qualifyingMembers.push(member);
          whyReasons = result.why || result.satisfiedRules || [];
        }
      }

      if (qualifyingMembers.length === 0) {
        continue; // Family is not eligible for this scheme
      }

      // Check whether enrolled or applied
      const primaryQualifyingMember = qualifyingMembers[0];
      const hasEntitlement =
        entitlementsByFamily.has(family._id.toString()) ||
        qualifyingMembers.some((m) => entitlementsByMember.has(m._id.toString()));

      const existingApp =
        applicationsByFamily.get(family._id.toString()) ||
        qualifyingMembers.map((m) => applicationsByMember.get(m._id.toString())).find(Boolean);

      let beneficiaryStatus = 'ELIGIBLE_UNREACHED';
      let applicationDetails = null;

      if (hasEntitlement) {
        beneficiaryStatus = 'ENROLLED';
        enrolledCount++;
      } else if (existingApp && !['Rejected', 'Cancelled'].includes(existingApp.status)) {
        beneficiaryStatus = 'APPLIED';
        appliedCount++;
        applicationDetails = {
          applicationId: existingApp.applicationId,
          status: existingApp.status,
          appliedAt: existingApp.createdAt,
        };
      } else {
        beneficiaryStatus = 'ELIGIBLE_UNREACHED';
        unreachedCount++;
      }

      // Find Head of Family
      const headMember = familyMembers.find((m) => m.relationToHead === 'Self') || familyMembers[0];

      allEligibleBeneficiaries.push({
        familyDbId: family._id,
        familyId: family.familyId,
        headOfFamilyName: headMember?.name || 'Unknown',
        district: family.address?.district || 'Unknown',
        taluka: family.address?.taluka || 'Unknown',
        village: family.address?.village || '',
        category: family.category,
        annualIncome: family.annualIncome,
        rationCardType: family.rationCardType,
        bplStatus: family.bplStatus,
        qualifyingMembersCount: qualifyingMembers.length,
        primaryQualifyingMember: {
          memberDbId: primaryQualifyingMember._id,
          memberId: primaryQualifyingMember.memberId,
          name: primaryQualifyingMember.name,
          age: primaryQualifyingMember.age,
          gender: primaryQualifyingMember.gender,
          relationToHead: primaryQualifyingMember.relationToHead,
        },
        beneficiaryStatus,
        applicationDetails,
        whyEligible: whyReasons.slice(0, 3),
        maxBenefitAmount: scheme.maxBenefitAmount || 0,
      });
    }

    const eligibleFamiliesCount = allEligibleBeneficiaries.length;
    const saturationRate = eligibleFamiliesCount > 0
      ? Number(((enrolledCount / eligibleFamiliesCount) * 100).toFixed(1))
      : 0;
    const coverageGapRate = eligibleFamiliesCount > 0
      ? Number(((unreachedCount / eligibleFamiliesCount) * 100).toFixed(1))
      : 0;

    // 5. Apply filtering by status and search
    let filteredBeneficiaries = allEligibleBeneficiaries;

    if (status && status !== 'ALL') {
      filteredBeneficiaries = filteredBeneficiaries.filter((b) => b.beneficiaryStatus === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredBeneficiaries = filteredBeneficiaries.filter(
        (b) =>
          b.familyId.toLowerCase().includes(q) ||
          b.headOfFamilyName.toLowerCase().includes(q) ||
          b.primaryQualifyingMember.name.toLowerCase().includes(q) ||
          b.district.toLowerCase().includes(q) ||
          b.taluka.toLowerCase().includes(q)
      );
    }

    // 6. Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const totalFiltered = filteredBeneficiaries.length;
    const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedBeneficiaries = filteredBeneficiaries.slice(startIndex, startIndex + limitNum);

    return {
      scheme: {
        _id: scheme._id,
        schemeCode: scheme.schemeCode,
        schemeName: scheme.schemeName,
        department: scheme.department,
        benefitType: scheme.benefitType,
        maxBenefitAmount: scheme.maxBenefitAmount,
        category: scheme.category,
      },
      summary: {
        totalFamiliesEvaluated,
        eligibleFamiliesCount,
        enrolledCount,
        appliedCount,
        unreachedCount,
        saturationRate,       // % of eligible receiving benefits
        coverageGapRate,      // % of eligible who haven't applied
      },
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
      beneficiaries: paginatedBeneficiaries,
    };
  }

  /**
   * Dispatch proactive welfare nudge to eligible unreached citizen / family.
   */
  async nudgeBeneficiary(schemeIdentifier, { familyId, memberId, customMessage, officer }) {
    const isObjectId = String(schemeIdentifier).match(/^[0-9a-fA-F]{24}$/);
    const scheme = await Scheme.findOne({
      $or: [
        { _id: isObjectId ? schemeIdentifier : null },
        { schemeCode: String(schemeIdentifier).toUpperCase() },
      ],
    }).lean();

    if (!scheme) throw new Error('Scheme not found');

    const family = await Family.findOne({
      $or: [
        { _id: String(familyId).match(/^[0-9a-fA-F]{24}$/) ? familyId : null },
        { familyId: String(familyId) },
      ],
    });
    if (!family) throw new Error('Family not found');

    const titleEn = `Proactive Welfare Alert: Eligible for ${scheme.schemeName}`;
    const titleGu = `યોજના પાત્રતા સૂચના: ${scheme.schemeName}`;
    const messageEn = customMessage ||
      `Official administrative records indicate your household is 100% eligible for '${scheme.schemeName}' (Financial Benefit: ₹${(scheme.maxBenefitAmount || 0).toLocaleString('en-IN')}). Apply now through your Nagrik portal or contact your local Talati.`;
    const messageGu =
      `સરકારી ચકાસણી મુજબ તમારો પરિવાર '${scheme.schemeName}' યોજના માટે પાત્ર છે. નાગરિક પોર્ટલ દ્વારા તુરંત અરજી કરો.`;

    const notification = await Notification.create({
      familyId: family._id,
      type: 'BenefitDiscovered',
      titleEn,
      titleGu,
      messageEn,
      messageGu,
      nextActionUrl: `/schemes/${scheme.schemeCode}`,
    });

    await logAction({
      action: 'BENEFICIARY_NUDGE_SENT',
      actorId: officer.id || officer._id,
      actorRole: officer.role,
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      changedFields: {
        familyId: family.familyId,
        memberId: memberId || null,
        notificationId: notification._id,
      },
    });

    return {
      success: true,
      notificationId: notification._id,
      familyId: family.familyId,
      message: `Proactive nudge successfully dispatched to Family ${family.familyId}`,
    };
  }
}

module.exports = new SaturationAnalyticsService();
