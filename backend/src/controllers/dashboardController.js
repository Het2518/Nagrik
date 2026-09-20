'use strict';

const Application = require('../models/Application');
const Family = require('../models/Family');
const Member = require('../models/Member');
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
    ]);

    const highRiskCount    = riskBreakdown.find((r) => r._id === 'High')?.count || 0;
    const pendingCount     = statusBreakdown.find((r) => r._id === 'Pending')?.count || 0;
    const finalApprovedCount = statusBreakdown.find((r) => r._id === 'FinalApproved')?.count || 0;
    const rejectedCount    = statusBreakdown.find((r) => r._id === 'Rejected')?.count || 0;

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
      },
      statusBreakdown,
      riskBreakdown,
      schemeEnrollment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };
