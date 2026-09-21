'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── Verification Checklist ─────────────────────────────────────────────────
// Each officer fills this when making a decision — it becomes part of the audit record.
// Items are level-specific: Level 1 does field/physical, Level 2 does records, Level 3 sanctions.
const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true },   // e.g. "Aadhaar verified physically"
    checked: { type: Boolean, required: true },
    note: { type: String, default: '' },      // optional officer note on this item
  },
  { _id: false }
);

// ── Approval Chain Entry ───────────────────────────────────────────────────
const approvalChainEntrySchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', required: true },
    officerRole: { type: String, required: true },
    action: { type: String, enum: ['Approved', 'Rejected', 'ResubmissionRequested'], required: true },
    rejectionCategory: {
      type: String,
      enum: [
        'DocumentIncomplete',      // missing or expired documents
        'DocumentFraud',           // fake/forged documents detected
        'IneligibleIncome',        // income above the scheme limit
        'IneligibleCategory',      // caste/category mismatch
        'ResidenceNotVerified',    // not a genuine resident of the village
        'DuplicateBenefit',        // already receiving a conflicting scheme
        'PhysicalVerificationFailed', // in-person check failed
        'Other',
      ],
      default: null,
    },
    remarks: { type: String, required: true },
    checklist: [checklistItemSchema],           // what the officer verified
    decidedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Status History (citizen-facing timeline) ────────────────────────────────
const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    byOfficerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
    officerRole: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      unique: true,
      default: () => `APP-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    familyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Family',  required: true },
    memberId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member',  required: true },
    schemeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme',  required: true },

    // ── Pipeline Status ────────────────────────────────────────────────────
    // Pending               → citizen submitted, in Talati queue
    // Level1Review          → Talati opened the file
    // Level1Approved        → Talati approved → forwarded to Mamlatdar
    // Level2Review          → Mamlatdar opened the file
    // Level2Approved        → Mamlatdar approved → forwarded to District Officer
    // Level3Review          → District Officer opened the file
    // FinalApproved         → Fully sanctioned — citizen receives benefit
    // ResubmissionRequired  → Officer flagged missing/incorrect documents; citizen must re-upload
    // Rejected              → Rejected at any level; reason + level stored
    status: {
      type: String,
      enum: [
        'Pending',
        'Level1Review', 'Level1Approved',
        'Level2Review', 'Level2Approved',
        'Level3Review', 'FinalApproved',
        'ResubmissionRequired',
        'Rejected',
      ],
      default: 'Pending',
    },

    // The level at which the application currently sits (drives the officer UI queue)
    currentPipelineLevel: { type: Number, default: 1 },

    // Level that rejected (for citizen notification)
    rejectedAtLevel:   { type: Number, enum: [0, 1, 2, 3], default: null },
    rejectionCategory: { type: String, default: null },

    // Full approval chain — one entry per decision, immutable audit record
    approvalChain: [approvalChainEntrySchema],

    // Citizen-facing timeline
    statusHistory: [statusHistoryEntrySchema],

    // Set by risk scoring at submission — citizen cannot influence this
    riskFlag: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },

    documentReferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentReference' }],

    // Stores per-scheme dynamic form field values submitted by the citizen.
    // Key = formField.fieldKey defined in Scheme.applicationFormFields
    // Value = whatever the citizen entered (string/number/date/boolean)
    // e.g. { bocw_reg_number: 'GJ-BOC-12345', site_name: 'Infra Project, Gandhinagar' }
    schemeSpecificData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Cloudinary Document Storage ────────────────────────────────────────
    // Each uploaded document is stored as an object with its Cloudinary URL.
    // docKey matches the Scheme.requiredDocuments[].docKey field.
    // Officers use the url to view the document inline in their verification workspace.
    submittedDocuments: [
      {
        docKey:       { type: String, required: true },   // e.g. 'aadhaar'
        originalName: { type: String, default: '' },      // original file name for display
        url:          { type: String, required: true },   // Cloudinary secure URL
        publicId:     { type: String, required: true },   // Cloudinary public_id (for deletion)
        format:       { type: String, default: '' },      // e.g. 'image/jpeg'
        sizeBytes:    { type: Number, default: 0 },
        uploadedAt:   { type: Date, default: Date.now },
        _id: false,
      }
    ],

    // Legacy flat key list — kept for backward compatibility with existing test data
    submittedDocumentKeys: { type: [String], default: [] },

    officerRemarks: { type: String, default: '' },
    documentAffected: { type: String, default: null },
    correctionRequired: { type: String, default: null },
    resubmissionDeadline: { type: Date, default: null },

    // ── Phase 4: Workflow, SLA & Officer Experience ──────────────────────────
    priority: {
      type: String,
      enum: ['Normal', 'FastTrack', 'Urgent'],
      default: 'Normal',
    },
    autoApprovalEligible: { type: Boolean, default: false },
    autoApproved:         { type: Boolean, default: false },
    escalated:            { type: Boolean, default: false },
    escalatedAt:          { type: Date },
    escalationReason:     { type: String, default: null },
    assignedOfficerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },

    sla: {
      targetCompletionDate: { type: Date },
      slaDaysTotal:         { type: Number, default: 15 },
      isBreached:           { type: Boolean, default: false },
      breachedAt:           { type: Date },
    },

    clarificationHistory: [
      {
        requestedAt:     { type: Date, default: Date.now },
        requestedBy:     { type: String, default: 'Officer' },
        remarks:         { type: String, required: true },
        documentKey:     { type: String },
        citizenResponse: { type: String },
        respondedAt:     { type: Date },
        _id: false,
      },
    ],

    submittedAt: { type: Date, default: Date.now },
    decidedAt:   { type: Date },
  },
  { timestamps: true }
);

// One member → one scheme, ever (unique constraint)
applicationSchema.index({ memberId: 1, schemeId: 1 }, { unique: true });
applicationSchema.index({ status: 1, riskFlag: 1 });
applicationSchema.index({ currentPipelineLevel: 1, status: 1 }); // officer queue queries
applicationSchema.index({ familyId: 1 });
applicationSchema.index({ priority: 1, status: 1 });
applicationSchema.index({ 'sla.isBreached': 1, status: 1 });
applicationSchema.index({ escalated: 1, status: 1 });

module.exports = mongoose.model('Application', applicationSchema);
