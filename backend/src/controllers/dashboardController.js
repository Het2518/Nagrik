'use strict';

const Application = require('../models/Application');
const Family = require('../models/Family');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');
const benefitGapDetector = require('../services/benefitGapDetector');
const { sendSuccess } = require('../utils/apiResponse');

// GET /api/v1/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    // Scope stats to the officer's jurisdiction (Talati/Mamlatdar see their area only)
    const familyFilter = {};
    if (req.user.jurisdiction?.district && req.user.jurisdiction.district !== 'All') {
      familyFilter['address.district'] = req.user.jurisdiction.district;
    }
    if (req.user.jurisdiction?.taluka) {
      familyFilter['address.taluka'] = req.user.jurisdiction.taluka;
    }

    // If jurisdiction-scoped, pre-fetch the relevant family IDs for the application queries
    let familyIdFilter = {};
    if (Object.keys(familyFilter).length > 0) {
      const scopedFamilies = await Family.find(familyFilter).select('_id');
      familyIdFilter = { familyId: { $in: scopedFamilies.map((f) => f._id) } };
    }

    const inReviewStatuses = [
      'Pending',
      'Level1Review',
      'Level1Approved',
      'Level2Review',
      'Level2Approved',
      'Level3Review',
      'ResubmissionRequired',
    ];

    const [
      statusBreakdown,
      riskBreakdown,
      schemeEnrollment,
      totalFamilies,
      totalApplications,
      totalMembers,
      overdueVerificationCount,
      // Per-level queue sizes — shows each officer tier how busy they are
      level1Queue,
      level2Queue,
      level3Queue,
      // SLA & Escalation Governance metrics
      breachedCount,
      approachingBreachCount,
      escalatedCount,
      schemesWithBudget,
      saturationData,
    ] = await Promise.all([
      Application.aggregate([
        { $match: familyIdFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: familyIdFilter },
        { $group: { _id: '$riskFlag', count: { $sum: 1 } } },
      ]),
      Application.aggregate([
        { $match: { ...familyIdFilter, status: 'FinalApproved' } },
        { $group: { _id: '$schemeId', approvedCount: { $sum: 1 } } },
        { $lookup: { from: 'schemes', localField: '_id', foreignField: '_id', as: 'scheme' } },
        { $unwind: '$scheme' },
        { $project: { schemeName: '$scheme.schemeName', schemeCode: '$scheme.schemeCode', approvedCount: 1 } },
        { $sort: { approvedCount: -1 } },
      ]),
      Family.countDocuments(familyFilter),
      Application.countDocuments(familyIdFilter),
      Member.countDocuments(),
      Family.countDocuments({ ...familyFilter, reVerificationDueAt: { $lte: new Date() } }),
      Application.countDocuments({ ...familyIdFilter, status: { $in: ['Pending', 'Level1Review'] } }),
      Application.countDocuments({ ...familyIdFilter, status: { $in: ['Level1Approved', 'Level2Review'] } }),
      Application.countDocuments({ ...familyIdFilter, status: { $in: ['Level2Approved', 'Level3Review'] } }),
      Application.countDocuments({
        ...familyIdFilter,
        status: { $in: inReviewStatuses },
        'sla.isBreached': true,
      }),
      Application.countDocuments({
        ...familyIdFilter,
        status: { $in: inReviewStatuses },
        'sla.isBreached': { $ne: true },
        'sla.targetCompletionDate': {
          $gte: new Date(),
          $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        },
      }),
      Application.countDocuments({
        ...familyIdFilter,
        escalated: true,
        status: { $nin: ['FinalApproved', 'Rejected'] },
      }),
      Scheme.find({ isActive: true })
        .select('schemeCode schemeName department budgetInfo maxBenefitAmount')
        .lean(),
      benefitGapDetector.getGeographicSaturation(
        req.user.jurisdiction?.district,
        req.user.jurisdiction?.taluka
      ).catch(() => ({ totalFamilies: 0, overallAverageSaturation: 0, schemes: [] })),
    ]);

    const highRiskCount    = riskBreakdown.find((r) => r._id === 'High')?.count || 0;
    const pendingCount     = statusBreakdown.find((r) => r._id === 'Pending')?.count || 0;
    const finalApprovedCount = statusBreakdown.find((r) => r._id === 'FinalApproved')?.count || 0;
    const rejectedCount    = statusBreakdown.find((r) => r._id === 'Rejected')?.count || 0;

    const totalActiveInReview = level1Queue + level2Queue + level3Queue;
    const complianceRate = totalActiveInReview > 0
      ? Math.max(0, Math.round(((totalActiveInReview - breachedCount) / totalActiveInReview) * 100))
      : 100;

    // Budget utilization calculation
    const budgetOverview = schemesWithBudget.map((s) => {
      const totalBudget = s.budgetInfo?.totalBudget || 50000000; // default 5 Cr
      const disbursedAmount = s.budgetInfo?.disbursedAmount || (finalApprovedCount * (s.maxBenefitAmount || 5000));
      const remainingBudget = Math.max(0, totalBudget - disbursedAmount);
      const utilizationPct = totalBudget > 0 ? Math.min(100, Math.round((disbursedAmount / totalBudget) * 100)) : 0;
      return {
        schemeCode: s.schemeCode,
        schemeName: s.schemeName,
        department: s.department,
        totalBudget,
        disbursedAmount,
        remainingBudget,
        utilizationPct,
        fiscalYear: s.budgetInfo?.fiscalYear || '2026-27',
      };
    });

    sendSuccess(res, {
      summary: {
        totalFamilies,
        totalMembers,
        totalApplications,
        highRiskCount,
        pendingCount,
        finalApprovedCount,
        rejectedCount,
        overdueVerificationCount,
        // Officer queue depths by pipeline level
        pipelineQueue: { level1: level1Queue, level2: level2Queue, level3: level3Queue },
        // SLA Governance
        slaMetrics: {
          totalActiveInReview,
          breachedCount,
          approachingBreachCount,
          escalatedCount,
          complianceRate,
        },
      },
      statusBreakdown,
      riskBreakdown,
      schemeEnrollment,
      budgetOverview,
      geographicSaturation: saturationData,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };
