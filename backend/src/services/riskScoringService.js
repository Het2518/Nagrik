'use strict';

const DocumentReference = require('../models/DocumentReference');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');

// Scores a new application for fraud risk before it is saved.
// Returns 'Low', 'Medium', or 'High'.
const scoreRisk = async ({ familyId, schemeId, certificateNumbers = [] }) => {
  let riskPoints = 0;

  // Check 1 — certificate reuse across different families (strong fraud signal)
  for (const certNumber of certificateNumbers) {
    const existingDoc = await DocumentReference.findOne({ certificateNumber: certNumber });
    if (existingDoc) {
      const isFromAnotherFamily = existingDoc.linkedFamilyIds.some(
        (id) => id.toString() !== familyId.toString()
      );
      if (isFromAnotherFamily) {
        riskPoints += 3; // High-weight signal
      }
    }
  }

  // Check 2 — scheme stacking (applying for a scheme that conflicts with a FinalApproved benefit)
  const scheme = await Scheme.findById(schemeId);
  if (scheme?.eligibilityRules?.conflictingSchemes?.length) {
    const conflictingScheme = await Scheme.findOne({
      schemeCode: { $in: scheme.eligibilityRules.conflictingSchemes },
    });
    if (conflictingScheme) {
      const hasConflictingApproval = await Application.findOne({
        familyId,
        schemeId: conflictingScheme._id,
        status: 'FinalApproved',
      });
      if (hasConflictingApproval) {
        riskPoints += 2;
      }
    }
  }

  // Check 3 — burst of 3+ applications from same family in 30 days (unusual pattern)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount = await Application.countDocuments({
    familyId,
    submittedAt: { $gte: thirtyDaysAgo },
  });
  if (recentCount >= 3) {
    riskPoints += 1; // Medium signal — could be legitimate but worth flagging
  }

  if (riskPoints >= 3) return 'High';
  if (riskPoints >= 1) return 'Medium';
  return 'Low';
};

module.exports = { scoreRisk };
