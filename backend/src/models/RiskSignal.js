'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const RISK_CATEGORIES = [
  'CrossFamilyDocumentReuse',
  'ConflictingMemberData',
  'DuplicateBenefitClaim',
  'ImpossibleLifecycleSequence',
  'SuspiciousApplicationBurst',
  'ContradictoryEvidence',
  'ExpiredEvidence',
];

const riskSignalSchema = new mongoose.Schema(
  {
    signalId: {
      type: String,
      unique: true,
      default: () => `RSK-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'ReviewRequired'],
      default: 'ReviewRequired',
      index: true,
    },
    category: {
      type: String,
      enum: RISK_CATEGORIES,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    evidenceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    source: {
      type: String,
      default: 'AutomatedRiskEngine',
    },
    relatedEntities: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'UnderReview', 'Resolved', 'FalsePositive'],
      default: 'Active',
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    resolutionRemarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RiskSignal', riskSignalSchema);
