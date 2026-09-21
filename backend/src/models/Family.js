'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── Split / Merge / Transfer History Sub-schemas ─────────────────────────────
const splitHistoryEntrySchema = new mongoose.Schema(
  {
    splitDate:       { type: Date, default: Date.now },
    newFamilyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    movedMemberIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    reason:          { type: String, default: '' },
    approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', default: null },
    remarks:         { type: String, default: '' },
  },
  { _id: false }
);

const mergeHistoryEntrySchema = new mongoose.Schema(
  {
    mergeDate:          { type: Date, default: Date.now },
    mergedFamilyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    mergedFamilyCode:   { type: String, default: '' }, // human-readable GJ-XXXX code of merged family
    absorbedMemberIds:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
    reason:             { type: String, default: '' },
    approvedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', default: null },
    remarks:            { type: String, default: '' },
  },
  { _id: false }
);

const familySchema = new mongoose.Schema(
  {
    familyId: {
      type: String,
      unique: true,
      default: () => `GJ-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    headOfFamilyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },

    // ── Family Classification ──────────────────────────────────────────────
    familyType: {
      type: String,
      enum: ['Nuclear', 'Joint', 'SingleParent', 'SinglePerson'],
      default: 'Nuclear',
    },

    // ── Existing Core Fields (unchanged) ───────────────────────────────────
    rationCardNumber: { type: String, unique: true, sparse: true, trim: true },
    rationCardType: {
      type: String,
      enum: ['AAY', 'PHH', 'NPHH', 'APL', 'None'],
      default: 'None',
    },
    annualIncome: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['SC', 'ST', 'OBC', 'General', 'EWS'],
      required: true,
    },
    bplStatus: { type: Boolean, default: false },
    hasPuccaHouse: { type: Boolean, default: false },

    // ── Address ────────────────────────────────────────────────────────────
    address: {
      village:  { type: String, required: true },
      taluka:   { type: String, required: true },
      district: { type: String, required: true },
      pincode:  { type: String, required: true },
      wardNo:   { type: String, default: '' },
      locality: { type: String, default: '' },
    },

    // ── Socioeconomic Profile (Phase 1 — Req 3, 5) ────────────────────────
    socioeconomic: {
      landHolding:         { type: Number, default: 0, min: 0 },          // in acres
      primaryLivelihood: {
        type: String,
        enum: ['Agriculture', 'Labour', 'Service', 'Business', 'SelfEmployed', 'Retired', 'Other'],
        default: 'Other',
      },
      secondaryIncome:     { type: Number, default: 0 },                  // annual secondary income
      isFarmer:            { type: Boolean, default: false },
      isBOCWWorker:        { type: Boolean, default: false },
    },

    // ── Household Details (Phase 1 — Req 3) ───────────────────────────────
    household: {
      dwellingType: {
        type: String,
        enum: ['Kutcha', 'SemiPucca', 'Pucca', 'Flat', 'Homeless'],
        default: 'Pucca',
      },
      totalRooms:            { type: Number, default: 1, min: 0 },
      drinkingWaterSource: {
        type: String,
        enum: ['Tap', 'Well', 'Handpump', 'River', 'Tanker', 'Other'],
        default: 'Tap',
      },
      toiletAvailable:       { type: Boolean, default: true },
      electricityConnection: { type: Boolean, default: true },
      cookingFuel: {
        type: String,
        enum: ['LPG', 'Firewood', 'Kerosene', 'Biogas', 'Electric', 'Other'],
        default: 'LPG',
      },
      vehicleOwned:          { type: Boolean, default: false },
      mobilePhoneCount:      { type: Number, default: 1, min: 0 },
      internetAccess:        { type: Boolean, default: false },
    },

    // ── Family Composition (auto-calculated) ──────────────────────────────
    familyComposition: {
      totalMembers:     { type: Number, default: 0 },
      activeMembers:    { type: Number, default: 0 },
      earningMembers:   { type: Number, default: 0 },
      dependentMembers: { type: Number, default: 0 },
      seniorCitizens:   { type: Number, default: 0 },  // age >= 60
      children:         { type: Number, default: 0 },  // age < 18
      women:            { type: Number, default: 0 },
      disabledMembers:  { type: Number, default: 0 },
      students:         { type: Number, default: 0 },
    },

    // ── Verification & Status ─────────────────────────────────────────────
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['Provisional', 'Permanent', 'Deleted', 'Merged'],
      default: 'Provisional',
    },
    lastVerifiedAt:      { type: Date },
    reVerificationDueAt: { type: Date },
    verificationNotes:   { type: String, default: '' },
    createdByUserId:     { type: mongoose.Schema.Types.ObjectId, ref: 'CitizenUser' },

    // ── Lifecycle History (Phase 1 — Req 10, 11) ──────────────────────────
    splitHistory:      [splitHistoryEntrySchema],
    mergeHistory:      [mergeHistoryEntrySchema],
    previousFamilyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }], // lineage from merges
  },
  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
familySchema.index({ 'address.district': 1, 'address.taluka': 1 });
familySchema.index({ reVerificationDueAt: 1 });
familySchema.index({ status: 1, 'familyComposition.totalMembers': 1 });

module.exports = mongoose.model('Family', familySchema);
