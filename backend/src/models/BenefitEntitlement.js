'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BENEFIT_LIFECYCLE_STATES = [
  'Discovered',
  'PotentiallyEligible',
  'EvidenceRequired',
  'VerificationPending',
  'Verified',
  'ApplicationStarted',
  'ApplicationSubmitted',
  'UnderReview',
  'Approved',
  'Sanctioned',
  'Disbursed',
  'Active',
  'ReverificationRequired',
  'Renewed',
  'Suspended',
  'Expired',
];

const benefitEntitlementSchema = new mongoose.Schema(
  {
    benefitId: {
      type: String,
      unique: true,
      default: () => `BEN-${uuidv4().slice(0, 8).toUpperCase()}`,
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
      required: true,
      index: true,
    },
    schemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scheme',
      required: true,
      index: true,
    },
    schemeCode: {
      type: String,
      required: true,
      index: true,
    },
    schemeName: {
      type: String,
      default: '',
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
    },
    lifecycleState: {
      type: String,
      enum: BENEFIT_LIFECYCLE_STATES,
      default: 'Discovered',
      index: true,
    },
    benefitType: {
      type: String,
      enum: ['Cash', 'InKind', 'Subsidy', 'Scholarship'],
      default: 'Cash',
    },
    sanctionedAmount: {
      type: Number,
      default: 0,
    },
    disbursementFrequency: {
      type: String,
      enum: ['OneTime', 'Monthly', 'Quarterly', 'Annual', 'AsNeeded'],
      default: 'OneTime',
    },
    startDate: {
      type: Date,
      default: null,
    },
    renewalDate: {
      type: Date,
      default: null,
    },
    reverificationDueAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    evidenceRefs: [
      {
        docKey:     { type: String, required: true },
        docUrl:     { type: String, required: true },
        certNumber: { type: String, default: '' },
        verified:   { type: Boolean, default: false },
        _id: false,
      },
    ],
    statusHistory: [
      {
        state:          { type: String, required: true },
        transitionedBy: { type: String, default: 'System' },
        reason:         { type: String, default: '' },
        timestamp:      { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

benefitEntitlementSchema.index({ familyId: 1, schemeCode: 1, memberId: 1 }, { unique: true });

module.exports = mongoose.model('BenefitEntitlement', benefitEntitlementSchema);
