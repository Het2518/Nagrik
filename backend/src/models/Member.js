'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { encrypt, decrypt, maskAadhaar, hashAadhaar } = require('../utils/encryption');

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      unique: true,
      default: () => `MBR-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },

    // Stored as AES-256 ciphertext — never returned to client (select: false)
    aadhaarEncrypted: { type: String, select: false },
    // HMAC-SHA256 of the plaintext Aadhaar — deterministic, so the unique index works
    // A different random IV each time means aadhaarEncrypted can't serve as a unique key
    aadhaarHash: { type: String, select: false },

    mobileNumber: { type: String, trim: true },
    relationToHead: {
      type: String,
      enum: ['Self', 'Spouse', 'Son', 'Daughter', 'Parent', 'Other'],
      required: true,
    },
    occupation: { type: String, default: 'Unemployed', trim: true },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Widow', 'Widower', 'Divorced'],
      default: 'Single',
    },
    hasDisability: { type: Boolean, default: false },
    disabilityPercentage: { type: Number, default: 0, min: 0, max: 100 },
    isStudent: { type: Boolean, default: false },
    educationLevel: { type: String, default: '' },
    lifecycleStatus: {
      type: String,
      enum: ['Active', 'Deceased', 'Migrated'],
      default: 'Active',
    },
    // DBT payments require a bank account — account number stored encrypted like Aadhaar
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      bankName: { type: String, trim: true },
      ifscCode: { type: String, trim: true, uppercase: true },
      accountNumberEncrypted: { type: String, select: false },
    },
    // ── V2 Extensions: External Identity References & Active Benefit Links ──
    externalIdentities: [
      {
        system:           { type: String, required: true }, // 'UIDAI', 'DISE', 'NREGA', 'PDS', 'APAAR'
        identifierMasked: { type: String, required: true },
        verified:         { type: Boolean, default: false },
        lastSyncedAt:     { type: Date, default: Date.now },
        _id: false,
      }
    ],
    activeBenefitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BenefitEntitlement' }],

    // ── Health Profile (Phase 1 — Req 3) ──────────────────────────────────
    healthStatus: {
      bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
        default: 'Unknown',
      },
      chronicConditions:    { type: [String], default: [] }, // e.g. ['Diabetes', 'Hypertension']
      immunizationComplete: { type: Boolean, default: false },
    },

    // ── Skills & Livelihood (Phase 1 — Req 5) ─────────────────────────────
    skills: { type: [String], default: [] }, // e.g. ['Tailoring', 'Carpentry', 'IT']

    // ── Transfer / Migration History (Phase 1 — Req 9, 11) ────────────────
    previousFamilyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
    transferHistory: [
      {
        fromFamilyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
        toFamilyId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
        date:          { type: Date, default: Date.now },
        reason:        { type: String, default: '' },    // 'Marriage', 'Separation', 'Other'
        approvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'Officer', default: null },
        _id: false,
      }
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Age computed at read time — the eligibility engine uses this virtual
memberSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return 0;
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > this.dateOfBirth.getMonth() ||
    (today.getMonth() === this.dateOfBirth.getMonth() &&
      today.getDate() >= this.dateOfBirth.getDate());
  return hasHadBirthdayThisYear ? age : age - 1;
});

// Safe for client display — last 4 digits only, never the full number
memberSchema.virtual('maskedAadhaar').get(function () {
  return this.aadhaarEncrypted ? maskAadhaar(this.aadhaarEncrypted) : null;
});

// Always call this instead of setting aadhaarEncrypted directly
memberSchema.methods.setAadhaar = function (plainAadhaar) {
  const normalized = plainAadhaar.replace(/\s|-/g, '').trim(); // strip spaces/dashes
  this.aadhaarEncrypted = encrypt(normalized);
  this.aadhaarHash = hashAadhaar(normalized); // deterministic — used for DB uniqueness
};

// Internal controller use only — never pass this to an HTTP response
memberSchema.methods.getDecryptedAadhaar = function () {
  return this.aadhaarEncrypted ? decrypt(this.aadhaarEncrypted) : null;
};

memberSchema.methods.setAccountNumber = function (plainAccountNumber) {
  this.bankDetails.accountNumberEncrypted = encrypt(plainAccountNumber.trim());
};

// aadhaarHash is deterministic, so this index reliably prevents duplicate registration
memberSchema.index({ aadhaarHash: 1 }, { unique: true, sparse: true });
memberSchema.index({ familyId: 1, lifecycleStatus: 1 });

module.exports = mongoose.model('Member', memberSchema);
