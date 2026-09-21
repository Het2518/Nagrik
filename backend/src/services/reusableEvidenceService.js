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
        docUrl: doc.docUrl || null,
        fileName: doc.fileName || null,
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

  /**
   * Matches family's uploaded/verified documents directly against a scheme's required docs.
   */
  async matchEvidenceToScheme(familyId, schemeCodeOrId) {
    const isObjectId = String(schemeCodeOrId).match(/^[0-9a-fA-F]{24}$/);
    const scheme = await Scheme.findOne({
      $or: [
        { _id: isObjectId ? schemeCodeOrId : null },
        { schemeCode: String(schemeCodeOrId).toUpperCase() },
      ],
    }).lean();

    if (!scheme) throw new Error(`Scheme ${schemeCodeOrId} not found`);

    const registry = await this.getFamilyEvidenceRegistry(familyId);
    const evidenceList = registry.evidenceList || [];

    const requiredDocs = scheme.requiredDocuments || [];
    const matched = [];
    const missing = [];

    for (const req of requiredDocs) {
      const found = evidenceList.find(e =>
        e.certificateType?.toLowerCase().includes(req.docKey.toLowerCase()) ||
        req.docKey.toLowerCase().includes(e.certificateType?.toLowerCase()) ||
        (req.docKey.includes('income') && e.certificateType === 'Income') ||
        (req.docKey.includes('caste') && e.certificateType === 'Caste') ||
        (req.docKey.includes('ration') && e.certificateType === 'RationCard') ||
        (req.docKey.includes('domicile') && e.certificateType === 'Domicile') ||
        (req.docKey.includes('disability') && e.certificateType === 'Disability') ||
        (req.docKey.includes('marksheet') && e.certificateType === 'Marksheet') ||
        (req.docKey.includes('bank') && e.certificateType === 'BankPassbook')
      );

      if (found && !found.isExpired) {
        matched.push({
          docKey: req.docKey,
          label: req.label,
          evidence: found,
          isVerified: found.isVerified,
        });
      } else {
        missing.push({
          docKey: req.docKey,
          label: req.label,
          description: req.description,
          isRequired: req.isRequired !== false,
        });
      }
    }

    const completenessScore = requiredDocs.length > 0
      ? Math.round((matched.length / requiredDocs.length) * 100)
      : 100;

    return {
      schemeCode: scheme.schemeCode,
      schemeName: scheme.schemeName,
      totalRequired: requiredDocs.length,
      matchedCount: matched.length,
      missingCount: missing.length,
      completenessScore,
      canFastTrack: missing.length === 0,
      matched,
      missing,
    };
  }

  /**
   * Evaluates overall evidence completeness for the household across welfare standards.
   */
  async checkEvidenceCompleteness(familyId) {
    const registry = await this.getFamilyEvidenceRegistry(familyId);
    const evidenceList = registry.evidenceList || [];

    const CORE_TYPES = ['Income', 'Domicile', 'RationCard', 'BankPassbook', 'Caste'];
    const presentTypes = new Set(evidenceList.filter(e => !e.isExpired).map(e => e.certificateType));

    const completeness = Math.round((presentTypes.size / CORE_TYPES.length) * 100);

    return {
      completenessScore: Math.min(100, completeness),
      presentTypes: Array.from(presentTypes),
      missingCoreTypes: CORE_TYPES.filter(t => !presentTypes.has(t)),
      expiringCount: registry.expiringSoon?.length || 0,
      totalEvidence: evidenceList.length,
    };
  }

  /**
   * Renews an expired certificate and chains the audit history.
   */
  async renewDocument(docId, newDocData, actor = 'Citizen') {
    const oldDoc = await DocumentReference.findById(docId);
    if (!oldDoc) throw new Error(`Document ${docId} not found`);

    const newDoc = await DocumentReference.create({
      ...newDocData,
      certificateType: oldDoc.certificateType,
      memberId: oldDoc.memberId,
      linkedFamilyIds: oldDoc.linkedFamilyIds,
      previousDocId: oldDoc._id,
      status: 'Pending',
      isVerifiedByOfficer: false,
    });

    oldDoc.status = 'Expired';
    oldDoc.replacedByDocId = newDoc._id;
    await oldDoc.save();

    return { oldDoc, newDoc };
  }
}

module.exports = new ReusableEvidenceService();
