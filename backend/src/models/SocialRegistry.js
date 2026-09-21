'use strict';

const mongoose = require('mongoose');

const deprivationFactorSchema = new mongoose.Schema(
  {
    factorCode:        { type: String, required: true },
    factorName:        { type: String, required: true },
    scoreContribution: { type: Number, required: true },
    explanation:       { type: String, default: '' },
  },
  { _id: false }
);

const socialRegistrySchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      unique: true,
    },
    deprivationScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    registryTier: {
      type: String,
      enum: ['MostVulnerable', 'Vulnerable', 'Moderate', 'AboveThreshold'],
      required: true,
      index: true,
    },
    geographicClassification: {
      type: String,
      enum: ['Urban', 'Rural', 'Tribal'],
      default: 'Rural',
      index: true,
    },
    deprivationFactors: [deprivationFactorSchema],
    metrics: {
      annualIncome:       { type: Number, default: 0 },
      isBPL:              { type: Boolean, default: false },
      rationCardType:     { type: String, default: 'APL' },
      dwellingType:       { type: String, default: 'Pucca' },
      landHolding:        { type: Number, default: 0 },
      hasDisabledMember:  { type: Boolean, default: false },
      hasSeniorCitizen:   { type: Boolean, default: false },
      hasChildren:        { type: Boolean, default: false },
      earningMemberCount: { type: Number, default: 0 },
      dependentCount:     { type: Number, default: 0 },
      deprivationRatio:   { type: Number, default: 0 }, // dependents / total
    },
    district:             { type: String, index: true },
    taluka:               { type: String, index: true },
    village:              { type: String },
    lastComputedAt:       { type: Date, default: Date.now },
    computationVersion:   { type: String, default: 'v1.0' },
    isManuallyOverridden: { type: Boolean, default: false },
    overrideReason:       { type: String },
    overrideByOfficerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'OfficerUser' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialRegistry', socialRegistrySchema);
