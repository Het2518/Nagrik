'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');
const { checkEligibility } = require('../services/eligibilityEngine');
const { sendSuccess, createApiError } = require('../utils/apiResponse');

// GET /api/v1/eligibility/:familyId?memberId=<objectId>
// Returns eligibility for all active members in the family, or a single member if memberId is specified.
const getEligibility = async (req, res, next) => {
  try {
    const family = await Family.findOne({ familyId: req.params.familyId });
    if (!family) return next(createApiError(404, 'Family not found'));

    const memberFilter = { familyId: family._id, lifecycleStatus: 'Active' };
    // Optional: narrow to a single member (used by citizen eligibility dashboard)
    if (req.query.memberId) memberFilter._id = req.query.memberId;

    const [activeMembers, existingApplications, activeSchemes] = await Promise.all([
      Member.find(memberFilter),
      Application.find({ familyId: family._id }).select('memberId schemeId status'),
      Scheme.find({ isActive: true }),
    ]);

    if (activeMembers.length === 0) {
      return next(createApiError(404, 'No active members found for the given filter'));
    }

    const results = activeMembers.map((member) => {
      const schemeResults = checkEligibility(family, member, activeSchemes);
      const enriched = schemeResults.map((result) => {
        const existingApp = existingApplications.find(
          (app) =>
            app.memberId.toString() === member._id.toString() &&
            app.schemeId.toString() === result.schemeId.toString()
        );
        return { ...result, applicationStatus: existingApp?.status || null };
      });

      return {
        memberId: member.memberId,
        memberName: member.name,
        memberDbId: member._id,
        age: member.age,
        gender: member.gender,
        eligibleSchemes: enriched.filter((s) => s.isEligible),
        ineligibleSchemes: enriched.filter((s) => !s.isEligible),
      };
    });

    sendSuccess(res, { familyId: req.params.familyId, eligibility: results });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEligibility };
