'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ASSESSMENT_STATUSES = [
  'PotentiallyEligible',
  'Eligible',
  'NotEligible',
  'MissingEvidence',
  'VerificationRequired',
  'ExpiredEvidence',
  'RuleConflict',
  'AlreadyReceiving',
  'RequiresOfficerReview',
];

const benefitAssessmentSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: String,
      unique: true,
      default: () => `ASM-${uuidv4().slice(0, 8).toUpperCase()}`,
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
    },
    schemeName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ASSESSMENT_STATUSES,
      required: true,
      index: true,
    },
    why: {
      type: [String],
      default: [],
    },
    satisfiedRules: {
      type: [String],
      default: [],
    },
    failedRules: {
      type: [String],
      default: [],
    },
    evidence: [
      {
        docKey:     { type: String, required: true },
        label:      { type: String, default: '' },
        certNumber: { type: String, default: '' },
        status:     { type: String, default: 'Verified' },
        _id: false,
      },
    ],
    missingEvidence: [
      {
        docKey:      { type: String, required: true },
        label:       { type: String, default: '' },
        description: { type: String, default: '' },
        isRequired:  { type: Boolean, default: true },
        _id: false,
      },
    ],
    conflictingEvidence: {
      type: [String],
      default: [],
    },
    nextActions: [
      {
        actionEn: { type: String, required: true },
        actionGu: { type: String, default: '' },
        type:     { type: String, default: 'UPLOAD_EVIDENCE' }, // 'UPLOAD_EVIDENCE', 'APPLY', 'WAIT_REVIEW', 'RENEW'
        url:      { type: String, default: '' },
        _id: false,
      },
    ],
    ruleVersion: {
      type: Number,
      default: 1,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

benefitAssessmentSchema.index({ familyId: 1, schemeCode: 1, memberId: 1 });

module.exports = mongoose.model('BenefitAssessment', benefitAssessmentSchema);
