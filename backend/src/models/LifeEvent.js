'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const LIFE_EVENT_TYPES = [
  'Birth',
  'Death',
  'Marriage',
  'Divorce',
  'AgeThresholdReached',
  'DisabilityStatusChange',
  'StudentStatusChange',
  'EmploymentChange',
  'IncomeChange',
  'AddressChange',
  'FamilySplit',
  'FamilyMerge',
  'HouseholdCompositionChange',
  'CertificateExpiry',
  'BenefitExpiry',
];

const lifeEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      default: () => `EVT-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    eventType: {
      type: String,
      enum: LIFE_EVENT_TYPES,
      required: true,
    },
    affectedFamilyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    affectedMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
      index: true,
    },
    eventDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    source: {
      type: String,
      enum: [
        'CitizenReported',
        'CivilRegistrationConnector',
        'PDSConnector',
        'EducationConnector',
        'SystemTriggered',
        'OfficerRecorded',
      ],
      default: 'CitizenReported',
    },
    verificationStatus: {
      type: String,
      enum: ['Unverified', 'PendingVerification', 'Verified', 'Rejected'],
      default: 'PendingVerification',
      index: true,
    },
    confidence: {
      type: String,
      enum: ['Reported', 'Plausible', 'Verified', 'Authoritative'],
      default: 'Reported',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    evidence: [
      {
        title:      { type: String, required: true },
        docUrl:     { type: String, default: '' },
        certNumber: { type: String, default: '' },
        issuer:     { type: String, default: '' },
        _id: false,
      },
    ],
    impactSummary: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    recordedByRole: {
      type: String,
      default: 'Citizen',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

lifeEventSchema.index({ affectedFamilyId: 1, eventDate: -1 });

module.exports = mongoose.model('LifeEvent', lifeEventSchema);
