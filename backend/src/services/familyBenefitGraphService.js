'use strict';

const Family = require('../models/Family');
const Member = require('../models/Member');
const Scheme = require('../models/Scheme');
const Application = require('../models/Application');
const BenefitEntitlement = require('../models/BenefitEntitlement');
const LifeEvent = require('../models/LifeEvent');
const RiskSignal = require('../models/RiskSignal');
const OfficerTask = require('../models/OfficerTask');
const reusableEvidenceService = require('./reusableEvidenceService');
const { checkEligibility } = require('./eligibilityEngine');

/**
 * FamilyBenefitGraphService — Core Welfare Intelligence Graph
 *
 * Traverses relationships:
 * Family → Members → External Identities → Evidence → Life Events → Schemes → Benefits → Applications → Risks → Tasks
 * Provides Impact Analysis for circumstance changes and life events.
 */
class FamilyBenefitGraphService {
  /**
   * Builds the complete 360° conceptual and technical graph for a family
   */
  async buildGraph(familyId) {
    const family = await Family.findById(familyId).lean();
    if (!family) throw new Error('Family not found');

    const [
      members,
      applications,
      entitlements,
      lifeEvents,
      riskSignals,
      officerTasks,
      evidenceData,
      activeSchemes,
    ] = await Promise.all([
      Member.find({ familyId }).lean(),
      Application.find({ familyId }).populate('schemeId', 'schemeCode schemeName benefitType').lean(),
      BenefitEntitlement.find({ familyId }).lean(),
      LifeEvent.find({ affectedFamilyId: familyId }).sort({ eventDate: -1 }).lean(),
      RiskSignal.find({ familyId }).sort({ createdAt: -1 }).lean(),
      OfficerTask.find({ familyId }).sort({ createdAt: -1 }).lean(),
      reusableEvidenceService.getFamilyEvidenceRegistry(familyId),
      Scheme.find({ isActive: true }).lean(),
    ]);

    // Graph nodes and edges representation
    const nodes = [];
    const edges = [];

    // 1. Root Family Node
    nodes.push({
      id: `family_${family._id}`,
      type: 'Family',
      label: `Family ${family.familyId}`,
      data: {
        familyId: family.familyId,
        status: family.status,
        annualIncome: family.annualIncome,
        category: family.category,
        rationCardType: family.rationCardType,
        district: family.address?.district,
      },
    });

    // 2. Member Nodes & Edges
    for (const member of members) {
      const memberNodeId = `member_${member._id}`;
      nodes.push({
        id: memberNodeId,
        type: 'Member',
        label: member.name,
        data: {
          memberId: member.memberId,
          age: member.age,
          gender: member.gender,
          relationToHead: member.relationToHead,
          lifecycleStatus: member.lifecycleStatus,
          isStudent: member.isStudent,
          hasDisability: member.hasDisability,
          externalIdentities: member.externalIdentities || [],
        },
      });

      edges.push({
        from: `family_${family._id}`,
        to: memberNodeId,
        relation: 'HAS_MEMBER',
      });

      // Member Eligibility Assessments
      const evaluations = checkEligibility(family, member, activeSchemes);
      const eligibleEvaluations = evaluations.filter((e) => e.isEligible);

      for (const ev of eligibleEvaluations) {
        const schemeNodeId = `scheme_${ev.schemeCode}`;
        if (!nodes.some((n) => n.id === schemeNodeId)) {
          nodes.push({
            id: schemeNodeId,
            type: 'Scheme',
            label: ev.schemeName,
            data: {
              schemeCode: ev.schemeCode,
              benefitType: ev.benefitType,
              maxBenefitAmount: ev.maxBenefitAmount,
            },
          });
        }

        edges.push({
          from: memberNodeId,
          to: schemeNodeId,
          relation: 'QUALIFIES_FOR',
          data: { why: ev.why },
        });
      }
    }

    // 3. Evidence Nodes & Edges
    for (const ev of evidenceData.evidenceList) {
      const evidenceNodeId = `evidence_${ev.certificateType}_${ev.certificateNumber}`;
      nodes.push({
        id: evidenceNodeId,
        type: 'Evidence',
        label: `${ev.certificateType}: ${ev.certificateNumber}`,
        data: {
          certificateType: ev.certificateType,
          isVerified: ev.isVerified,
          isExpired: ev.isExpired,
          supportedSchemes: ev.supportedSchemes,
        },
      });

      edges.push({
        from: `family_${family._id}`,
        to: evidenceNodeId,
        relation: 'HOLDS_EVIDENCE',
      });

      // Reusable link to schemes
      for (const schemeCode of ev.supportedSchemes) {
        edges.push({
          from: evidenceNodeId,
          to: `scheme_${schemeCode}`,
          relation: 'SUPPORTS_EVIDENCE_FOR',
        });
      }
    }

    // 4. Active Benefit Entitlements
    for (const ben of entitlements) {
      const benNodeId = `benefit_${ben.benefitId}`;
      nodes.push({
        id: benNodeId,
        type: 'BenefitEntitlement',
        label: `${ben.schemeCode} (${ben.lifecycleState})`,
        data: ben,
      });

      edges.push({
        from: `member_${ben.memberId}`,
        to: benNodeId,
        relation: 'RECEIVES_BENEFIT',
      });
    }

    // 5. Life Events
    for (const le of lifeEvents) {
      const eventNodeId = `event_${le.eventId}`;
      nodes.push({
        id: eventNodeId,
        type: 'LifeEvent',
        label: `${le.eventType} (${le.verificationStatus})`,
        data: le,
      });

      const targetId = le.affectedMemberId ? `member_${le.affectedMemberId}` : `family_${family._id}`;
      edges.push({
        from: eventNodeId,
        to: targetId,
        relation: 'AFFECTS',
      });
    }

    // 6. Risk Signals
    for (const rsk of riskSignals) {
      const riskNodeId = `risk_${rsk.signalId}`;
      nodes.push({
        id: riskNodeId,
        type: 'RiskSignal',
        label: `${rsk.riskLevel} Risk: ${rsk.category}`,
        data: rsk,
      });

      edges.push({
        from: riskNodeId,
        to: `family_${family._id}`,
        relation: 'FLAGS_RISK_ON',
      });
    }

    return {
      familyId: family.familyId,
      nodes,
      edges,
      summary: {
        membersCount: members.length,
        activeBenefitsCount: entitlements.filter((e) => ['Active', 'Approved', 'Disbursed'].includes(e.lifecycleState)).length,
        evidenceCount: evidenceData.totalEvidenceCount,
        lifeEventsCount: lifeEvents.length,
        activeRisksCount: riskSignals.filter((r) => r.status === 'Active').length,
        pendingTasksCount: officerTasks.filter((t) => t.status === 'Open').length,
      },
    };
  }

  /**
   * Impact Analysis Engine:
   * Simulates or evaluates the consequence of an event or circumstance change.
   * e.g., "Child turns 18", "Income changes to 150000", "Disability reported"
   */
  async analyzeImpact(familyId, { eventType, affectedMemberId, simulatedChanges = {} }) {
    const family = await Family.findById(familyId).lean();
    if (!family) throw new Error('Family not found');

    const activeSchemes = await Scheme.find({ isActive: true }).lean();
    const members = await Member.find({ familyId }).lean();
    const existingEntitlements = await BenefitEntitlement.find({ familyId }).lean();

    // Clone and apply hypothetical/simulated state
    const modifiedFamily = { ...family, ...simulatedChanges };
    const modifiedMembers = members.map((m) => {
      if (affectedMemberId && m._id.toString() === affectedMemberId.toString()) {
        return { ...m, ...simulatedChanges };
      }
      return m;
    });

    const targetMember = modifiedMembers.find(
      (m) => affectedMemberId && m._id.toString() === affectedMemberId.toString()
    ) || modifiedMembers[0];

    // Compute baseline eligibility
    const baseline = checkEligibility(family, targetMember, activeSchemes);
    // Compute projected eligibility under changed circumstances
    const projected = checkEligibility(modifiedFamily, targetMember, activeSchemes);

    const newlyAvailableSchemes = [];
    const schemesAtRiskOfStoppage = [];
    const rulesChanged = [];

    for (const p of projected) {
      const b = baseline.find((base) => base.schemeCode === p.schemeCode);
      if (!b) continue;

      if (!b.isEligible && p.isEligible) {
        newlyAvailableSchemes.push({
          schemeCode: p.schemeCode,
          schemeName: p.schemeName,
          maxBenefitAmount: p.maxBenefitAmount,
          why: p.why,
          requiredDocuments: p.missingEvidence,
        });
      } else if (b.isEligible && !p.isEligible) {
        schemesAtRiskOfStoppage.push({
          schemeCode: p.schemeCode,
          schemeName: p.schemeName,
          reason: p.reasons,
        });
      }

      // Check specific rule changes
      if (b.reasons.join(';') !== p.reasons.join(';')) {
        rulesChanged.push({
          schemeCode: p.schemeCode,
          schemeName: p.schemeName,
          before: b.reasons,
          after: p.reasons,
        });
      }
    }

    // Identify required documents for newly available schemes
    const requiredEvidenceUpdates = [];
    for (const s of newlyAvailableSchemes) {
      for (const doc of s.requiredDocuments || []) {
        if (!requiredEvidenceUpdates.some((r) => r.docKey === doc.docKey)) {
          requiredEvidenceUpdates.push(doc);
        }
      }
    }

    // Recommended officer tasks
    const recommendedOfficerTasks = [];
    if (schemesAtRiskOfStoppage.length > 0) {
      recommendedOfficerTasks.push({
        taskType: 'BenefitReverification',
        priority: 'High',
        title: `Re-evaluate benefits following ${eventType}`,
        description: `Circumstance change may affect eligibility for: ${schemesAtRiskOfStoppage.map((s) => s.schemeCode).join(', ')}`,
      });
    }

    return {
      eventType,
      targetMemberName: targetMember.name,
      newlyAvailableSchemes,
      schemesAtRiskOfStoppage,
      rulesChangedCount: rulesChanged.length,
      rulesChanged,
      requiredEvidenceUpdates,
      recommendedOfficerTasks,
      summaryEn: `Circumstance change analysis: ${newlyAvailableSchemes.length} new schemes unlocked, ${schemesAtRiskOfStoppage.length} benefits require review.`,
      summaryGu: `પરિસ્થિતિ પરિવર્તન વિશ્લેષણ: ${newlyAvailableSchemes.length} નવી યોજનાઓ ઉપલબ્ધ થઈ, ${schemesAtRiskOfStoppage.length} લાભોની સમીક્ષા જરૂરી છે.`,
    };
  }
}

module.exports = new FamilyBenefitGraphService();
