'use strict';

const mongoose = require('mongoose');

const documentReferenceSchema = new mongoose.Schema(
  {
    certificateNumber: { type: String, required: true, trim: true, uppercase: true },
    certificateType: {
      type: String,
      enum: ['Income', 'Caste', 'Disability', 'Marksheet', 'RationCard', 'Domicile', 'BOCW', 'ElectricityBill', 'BankPassbook', 'Other'],
      required: true,
    },
    issuingAuthority: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    // Income certificates and others expire — null means no expiry tracked
    expiryDate: { type: Date, default: null },
    isVerifiedByOfficer: { type: Boolean, default: false },
    docUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    linkedApplicationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    linkedFamilyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],
  },
  { timestamps: true }
);

// The risk scoring service queries this index on every submission
documentReferenceSchema.index({ certificateNumber: 1 });

module.exports = mongoose.model('DocumentReference', documentReferenceSchema);
