'use strict';

const DocumentReference = require('../models/DocumentReference');
const Application = require('../models/Application');
const Scheme = require('../models/Scheme');

/**
 * ReusableEvidenceService — "One Evidence → Many Benefits"
 *
 * Tracks verified evidence (income certificates, caste certificates, disability certificates, marksheets)
 * across the household and computes multi-scheme applicability to prevent redundant document uploads.
 */
class ReusableEvidenceService {
  async getFamilyEvidenceRegistry(familyId) {
    // 1. Fetch all document references registered under this family
    const docReferences = await DocumentReference.find({ linkedFamilyIds: familyId }).lean();

    // 2. Also fetch verified documents submitted across previous applications
    const applications = await Application.find({ familyId })
      .select('applicationId schemeId status submittedDocuments')
      .populate('schemeId', 'schemeCode schemeName requiredDocuments')
      .lean();

    // 3. Aggregate unique documents
    const evidenceMap = new Map();

    for (const doc of docReferences) {
      const key = `${doc.certificateType}_${doc.certificateNumber}`;
      evidenceMap.set(key, {
        certificateNumber: doc.certificateNumber,
        certificateType: doc.certificateType,
        issuingAuthority: doc.issuingAuthority,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        isVerified: doc.isVerifiedByOfficer,
        isExpired: doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false,
        daysUntilExpiry: doc.expiryDate
          ? Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          : null,
        supportedSchemes: [],
      });
    }

    // Combine with application submissions
    for (const app of applications) {
      if (!app.submittedDocuments?.length) continue;
      for (const subDoc of app.submittedDocuments) {
        const key = subDoc.docKey;
        if (!evidenceMap.has(key)) {
          evidenceMap.set(key, {
            certificateNumber: subDoc.originalName || key,
            certificateType: subDoc.docKey,
            docUrl: subDoc.url,
            isVerified: ['Level1Approved', 'Level2Approved', 'FinalApproved'].includes(app.status),
            isExpired: false,
            daysUntilExpiry: null,
            supportedSchemes: [],
          });
        }
        const item = evidenceMap.get(key);
        if (app.schemeId?.schemeCode && !item.supportedSchemes.includes(app.schemeId.schemeCode)) {
          item.supportedSchemes.push(app.schemeId.schemeCode);
        }
      }
    }

    // 4. Calculate potential scheme reusability across all active schemes
    const activeSchemes = await Scheme.find({ isActive: true }).select('schemeCode schemeName requiredDocuments').lean();
    const evidenceList = Array.from(evidenceMap.values()).map((ev) => {
      const applicableSchemes = activeSchemes
        .filter((s) =>
          s.requiredDocuments?.some(
            (rd) =>
              rd.docKey.toLowerCase().includes(ev.certificateType.toLowerCase()) ||
              ev.certificateType.toLowerCase().includes(rd.docKey.toLowerCase())
          )
        )
        .map((s) => ({
          schemeCode: s.schemeCode,
          schemeName: s.schemeName,
        }));

      return {
        ...ev,
        applicableSchemes,
        reusabilityCount: applicableSchemes.length,
      };
    });

    const expiringSoon = evidenceList.filter(
      (e) => e.daysUntilExpiry !== null && e.daysUntilExpiry > 0 && e.daysUntilExpiry <= 60
    );

    return {
      totalEvidenceCount: evidenceList.length,
      evidenceList,
      expiringSoon,
    };
  }
}

module.exports = new ReusableEvidenceService();
