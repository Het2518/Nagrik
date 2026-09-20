'use strict';

const RiskSignal = require('../models/RiskSignal');
const DocumentReference = require('../models/DocumentReference');
const Application = require('../models/Application');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');

/**
 * RiskIntelligenceService — Non-Accusatory Verification & Anomaly Intelligence
 *
 * Scans applications, documents, and lifecycle states for discrepancies.
 * Generates structured RiskSignal records indicating "Requires Verification" rather than accusing fraud.
 */
class RiskIntelligenceService {
  async evaluateApplicationRisk({ familyId, memberId, schemeId, certificateNumbers = [] }) {
    const signals = [];

    // Check 1: Impossible Lifecycle Sequence (Deceased or Migrated member applying)
    if (memberId) {
      const member = await Member.findById(memberId);
      if (member && member.lifecycleStatus !== 'Active') {
        const signal = await RiskSignal.create({
          familyId,
          memberId,
          riskLevel: 'High',
          category: 'ImpossibleLifecycleSequence',
          reason: `Application submitted for member '${member.name}' with lifecycle status '${member.lifecycleStatus}'`,
          source: 'AutomatedRiskEngine:LifecycleCheck',
          status: 'Active',
        });
        signals.push(signal);
      }
    }

    // Check 2: Cross-family document reuse
    for (const certNumber of certificateNumbers) {
      if (!certNumber) continue;
      const existingDoc = await DocumentReference.findOne({ certificateNumber: certNumber });
      if (existingDoc) {
        const otherFamily = existingDoc.linkedFamilyIds.find(
          (id) => id.toString() !== familyId.toString()
        );
        if (otherFamily) {
          const signal = await RiskSignal.create({
            familyId,
            memberId,
            riskLevel: 'High',
            category: 'CrossFamilyDocumentReuse',
            reason: `Certificate number '${certNumber}' is already registered under another household`,
            evidenceSnapshot: {
              certificateNumber: certNumber,
              otherFamilyId: otherFamily,
              issuingAuthority: existingDoc.issuingAuthority,
            },
            source: 'AutomatedRiskEngine:DocReferenceCollision',
            status: 'Active',
          });
          signals.push(signal);
        }
      }
    }

    // Check 3: Duplicate / conflicting benefit stacking
    const scheme = await Scheme.findById(schemeId);
    if (scheme?.eligibilityRules?.conflictingSchemes?.length) {
      const conflictingSchemes = await Scheme.find({
        schemeCode: { $in: scheme.eligibilityRules.conflictingSchemes },
      });
      const conflictingIds = conflictingSchemes.map((s) => s._id);

      const conflictingApproval = await Application.findOne({
        familyId,
        schemeId: { $in: conflictingIds },
        status: { $in: ['Level2Approved', 'FinalApproved'] },
      }).populate('schemeId', 'schemeCode schemeName');

      if (conflictingApproval) {
        const signal = await RiskSignal.create({
          familyId,
          memberId,
          riskLevel: 'High',
          category: 'DuplicateBenefitClaim',
          reason: `Household is already approved for conflicting program '${conflictingApproval.schemeId?.schemeName}'`,
          evidenceSnapshot: {
            existingApplicationId: conflictingApproval.applicationId,
            conflictingSchemeCode: conflictingApproval.schemeId?.schemeCode,
          },
          source: 'AutomatedRiskEngine:SchemeConflict',
          status: 'Active',
        });
        signals.push(signal);
      }
    }

    // Check 4: Application burst (3+ submissions within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCount = await Application.countDocuments({
      familyId,
      createdAt: { $gte: thirtyDaysAgo },
    });
    if (recentCount >= 3) {
      const signal = await RiskSignal.create({
        familyId,
        riskLevel: 'Medium',
        category: 'SuspiciousApplicationBurst',
        reason: `Household submitted ${recentCount + 1} scheme applications within a 30-day window`,
        source: 'AutomatedRiskEngine:VelocityCheck',
        status: 'Active',
      });
      signals.push(signal);
    }

    const highestRisk = signals.some((s) => s.riskLevel === 'High')
      ? 'High'
      : signals.some((s) => s.riskLevel === 'Medium')
      ? 'Medium'
      : 'Low';

    return {
      riskLevel: highestRisk,
      signals,
    };
  }

  async getFamilyRiskSignals(familyId) {
    return RiskSignal.find({ familyId }).sort({ createdAt: -1 }).lean();
  }

  async getAllActiveSignals(filters = {}) {
    return RiskSignal.find({ status: 'Active', ...filters })
      .populate('familyId', 'familyId address')
      .populate('memberId', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = new RiskIntelligenceService();
