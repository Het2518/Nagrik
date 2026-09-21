'use strict';

const mongoose = require('mongoose');

// ── Per-scheme required document definition ───────────────────────────────────
// Tells the citizen exactly which documents to upload for THIS scheme.
const requiredDocumentSchema = new mongoose.Schema(
  {
    docKey:      { type: String, required: true }, // machine key: 'income_cert', 'disability_cert'
    label:       { type: String, required: true }, // human label shown in citizen UI
    description: { type: String, default: '' },    // guidance: "Must be issued within 12 months"
    isRequired:  { type: Boolean, default: true },
    acceptedFormats: { type: [String], default: ['PDF', 'JPG', 'PNG'] },
  },
  { _id: false }
);

// ── Per-scheme dynamic application form field ─────────────────────────────────
// Each scheme can require extra fields beyond what's on the Member/Family record.
// e.g. BOCW needs BOCW Registration Number, Namo Lakshmi needs school enrollment no.
const formFieldSchema = new mongoose.Schema(
  {
    fieldKey:   { type: String, required: true },  // 'bocw_reg_number', 'school_name'
    label:      { type: String, required: true },  // 'BOCW Registration Number'
    fieldType: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select'],
      required: true,
    },
    options:    { type: [String], default: [] },   // only for 'select' type
    isRequired: { type: Boolean, default: true },
    helpText:   { type: String, default: '' },     // tooltip/guidance for citizen
    validation: {
      min:     Number,    // for number fields
      max:     Number,
      pattern: String,    // regex string for text fields
    },
  },
  { _id: false }
);

// ── Per-level verification checklist override ────────────────────────────────
// Schemes can define their own checklist items ON TOP of the generic level checklist.
const checklistItemSchema = new mongoose.Schema(
  { item: { type: String, required: true } },
  { _id: false }
);

const schemeSchema = new mongoose.Schema(
  {
    schemeCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    schemeName: { type: String, required: true, trim: true },
    department:  { type: String, required: true, trim: true },
    benefitType: {
      type: String,
      enum: ['Cash', 'InKind', 'Subsidy', 'Scholarship'],
      required: true,
    },
    maxBenefitAmount:    { type: Number, default: null },
    benefitFrequency:    {
      type: String,
      enum: ['OneTime', 'Monthly', 'Quarterly', 'Annual', 'AsNeeded'],
      default: 'OneTime',
    },
    applicationDeadline: { type: Date, default: null }, // null = rolling

    // ── Core eligibility rules (evaluated by eligibilityEngine.js) ───────────
    eligibilityRules: {
      minAge:               Number,
      maxAge:               Number,
      maxAnnualIncome:      Number,
      requiredBplStatus:    Boolean,
      allowedCategories:    [String],   // ['SC', 'ST', 'OBC', 'EWS', 'General']
      allowedRationTypes:   [String],   // ['AAY', 'PHH', 'APL']
      requiredMaritalStatus:[String],   // ['Widow', 'Married', 'Single']
      requiresDisability:   Boolean,
      requiresStudentStatus:Boolean,
      requiresFarmerStatus: Boolean,    // for PM-Kisan, Mahila Kisan
      requiresBOCWWorker:   Boolean,    // for BOCW scheme
      conflictingSchemes:   [String],   // scheme codes blocking co-enrollment
      minDeprivationScore:  { type: Number, default: null }, // for social registry
      targetOccupations:    { type: [String], default: [] }, // specific occupations
      minChildrenCount:     { type: Number, default: null },
      requiresSeniorCitizen:{ type: Boolean, default: false },
    },

    // ── Target Group (Req 21) ───────────────────────────────────────────────
    targetGroup: {
      type: String,
      enum: ['Individual', 'Family', 'HouseholdHead', 'AllEligibleMembers'],
      default: 'Individual',
    },

    // ── Stacking & Co-enrollment Rules (Req 22) ─────────────────────────────
    stackingRules: {
      allowsWith:    { type: [String], default: [] },
      blockedWith:   { type: [String], default: [] },
      maxConcurrent: { type: Number, default: 5 },
    },

    // ── Geographic Restrictions & Saturation (Req 23) ────────────────────────
    geographicRestrictions: {
      districts: { type: [String], default: [] }, // empty = all districts
      talukas:   { type: [String], default: [] },
      urban:     { type: Boolean, default: true },
      rural:     { type: Boolean, default: true },
      tribal:    { type: Boolean, default: true },
    },

    // ── Budget Tracking (Req 24) ─────────────────────────────────────────────
    budgetInfo: {
      totalBudget:     { type: Number, default: 50000000 },
      disbursedAmount: { type: Number, default: 12500000 },
      remainingBudget: { type: Number, default: 37500000 },
      fiscalYear:      { type: String, default: '2024-2025' },
    },

    // ── Renewal Rules (Req 20) ──────────────────────────────────────────────
    renewalRules: {
      autoRenewable:       { type: Boolean, default: false },
      renewalPeriodMonths: { type: Number, default: 12 },
      gracePeriodDays:     { type: Number, default: 30 },
    },

    // ── Documents citizen MUST upload for this scheme ────────────────────────
    // Every scheme has Aadhaar as mandatory baseline — additional docs are scheme-specific.
    requiredDocuments: [requiredDocumentSchema],

    // ── Extra application form fields specific to this scheme ────────────────
    // Rendered dynamically in the citizen application form.
    applicationFormFields: [formFieldSchema],

    // ── Scheme-specific checklist additions per officer level ────────────────
    // These are ADDED ON TOP of the generic level checklist in verificationChecklistService.js
    levelChecklistAdditions: {
      level1: [checklistItemSchema],  // Talati extra checks for this scheme
      level2: [checklistItemSchema],  // Mamlatdar extra checks
      level3: [checklistItemSchema],  // District Officer extra checks
    },

    // ── V2 Extensions: Rule Versioning & Life-Event Triggers ────────────────
    version:              { type: Number, default: 1 },
    ruleSnapshots: [
      {
        version: Number,
        effectiveDate: { type: Date, default: Date.now },
        rules: mongoose.Schema.Types.Mixed,
        changedBy: String,
        reason: String,
      }
    ],
    lifeEventTriggers:    { type: [String], default: [] }, // e.g. ['AgeThresholdReached', 'StudentStatusChange', 'IncomeChange']
    optionalEvidence:     [requiredDocumentSchema],
    renewalPeriodMonths:  { type: Number, default: 12 },
    rulesExplanation: {
      summaryEn:  { type: String, default: '' },
      summaryGu:  { type: String, default: '' },
      criteriaEn: { type: [String], default: [] },
      criteriaGu: { type: [String], default: [] },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scheme', schemeSchema);
