'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const familySchema = new mongoose.Schema(
  {
    familyId: {
      type: String,
      unique: true,
      default: () => `GJ-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    headOfFamilyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
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
    address: {
      village: { type: String, required: true },
      taluka: { type: String, required: true },
      district: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    isVerified: { type: Boolean, default: false }, // Legacy / duplicate flag, keeping for backward compatibility
    status: {
      type: String,
      enum: ['Provisional', 'Permanent', 'Deleted'],
      default: 'Provisional',
    },
    lastVerifiedAt: { type: Date },
    // Auto-set 6 months after verification — drives the re-verification queue
    reVerificationDueAt: { type: Date },
    verificationNotes: { type: String, default: '' },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'CitizenUser' },
  },
  { timestamps: true }
);

// Index for officer search — find families by village/taluka/district
familySchema.index({ 'address.district': 1, 'address.taluka': 1 });
familySchema.index({ reVerificationDueAt: 1 }); // query overdue families fast

module.exports = mongoose.model('Family', familySchema);
