'use strict';

const Scheme = require('../models/Scheme');
const { logAction } = require('./auditLogService');

/**
 * Service to manage scheme rule versioning, history tracking, and rollbacks (Req 19-20).
 */
const schemeVersioningService = {
  /**
   * Archives the current active rules into ruleSnapshots and applies new changes.
   */
  createSchemeVersion: async (schemeCode, updates, reason = 'Rule update', changedBy = 'Admin') => {
    const scheme = await Scheme.findOne({ schemeCode: schemeCode.toUpperCase() });
    if (!scheme) {
      throw new Error(`Scheme ${schemeCode} not found`);
    }

    // Snapshot current rules before updating
    const snapshot = {
      version: scheme.version || 1,
      effectiveDate: new Date(),
      rules: JSON.parse(JSON.stringify(scheme.eligibilityRules || {})),
      changedBy,
      reason,
    };

    scheme.ruleSnapshots = scheme.ruleSnapshots || [];
    scheme.ruleSnapshots.push(snapshot);

    // Apply updates
    if (updates.eligibilityRules) {
      scheme.eligibilityRules = { ...scheme.eligibilityRules, ...updates.eligibilityRules };
    }
    if (updates.targetGroup) scheme.targetGroup = updates.targetGroup;
    if (updates.stackingRules) scheme.stackingRules = { ...scheme.stackingRules, ...updates.stackingRules };
    if (updates.geographicRestrictions) scheme.geographicRestrictions = { ...scheme.geographicRestrictions, ...updates.geographicRestrictions };
    if (updates.budgetInfo) scheme.budgetInfo = { ...scheme.budgetInfo, ...updates.budgetInfo };
    if (updates.renewalRules) scheme.renewalRules = { ...scheme.renewalRules, ...updates.renewalRules };
    if (updates.maxBenefitAmount !== undefined) scheme.maxBenefitAmount = updates.maxBenefitAmount;

    scheme.version = (scheme.version || 1) + 1;
    await scheme.save();

    await logAction({
      action: 'SCHEME_VERSION_CREATED',
      actorId: changedBy,
      actorRole: 'Admin',
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      details: { newVersion: scheme.version, reason },
    });

    return scheme;
  },

  /**
   * Retrieves version history and snapshots for a scheme.
   */
  getSchemeHistory: async (schemeCode) => {
    const scheme = await Scheme.findOne({ schemeCode: schemeCode.toUpperCase() });
    if (!scheme) {
      throw new Error(`Scheme ${schemeCode} not found`);
    }

    return {
      schemeCode: scheme.schemeCode,
      schemeName: scheme.schemeName,
      currentVersion: scheme.version || 1,
      currentRules: scheme.eligibilityRules,
      currentStacking: scheme.stackingRules,
      currentGeographic: scheme.geographicRestrictions,
      currentBudget: scheme.budgetInfo,
      snapshots: scheme.ruleSnapshots || [],
    };
  },

  /**
   * Rolls back scheme rules to a specified historical version.
   */
  rollbackSchemeVersion: async (schemeCode, targetVersion, reason = 'Rollback to earlier version', rolledBackBy = 'Admin') => {
    const scheme = await Scheme.findOne({ schemeCode: schemeCode.toUpperCase() });
    if (!scheme) {
      throw new Error(`Scheme ${schemeCode} not found`);
    }

    const targetSnapshot = (scheme.ruleSnapshots || []).find(s => s.version === Number(targetVersion));
    if (!targetSnapshot) {
      throw new Error(`Version snapshot ${targetVersion} not found for scheme ${schemeCode}`);
    }

    // Save current as a snapshot before rolling back
    scheme.ruleSnapshots.push({
      version: scheme.version,
      effectiveDate: new Date(),
      rules: JSON.parse(JSON.stringify(scheme.eligibilityRules || {})),
      changedBy: rolledBackBy,
      reason: `Pre-rollback snapshot before reverting to v${targetVersion}`,
    });

    // Revert rules
    scheme.eligibilityRules = targetSnapshot.rules;
    scheme.version = (scheme.version || 1) + 1;
    await scheme.save();

    await logAction({
      action: 'SCHEME_VERSION_ROLLBACK',
      actorId: rolledBackBy,
      actorRole: 'Admin',
      entityType: 'Scheme',
      entityId: scheme.schemeCode,
      details: { rolledBackToVersion: targetVersion, newVersion: scheme.version, reason },
    });

    return scheme;
  },
};

module.exports = schemeVersioningService;
