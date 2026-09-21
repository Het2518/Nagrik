'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      unique: true,
      default: () => `NTF-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CitizenUser',
      default: null,
      index: true,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'BenefitDiscovered',
        'EvidenceRequired',
        'LifeEventDetected',
        'ApplicationStatusUpdate',
        'BenefitRenewal',
        'RiskAlert',
        'SLABreach',
        'DocumentExpiring',
        'DocumentExpiry',
        'WelfareNudge',
        'SystemAlert',
      ],
      default: 'BenefitDiscovered',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Critical'],
      default: 'Normal',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'BenefitRenewal',
        'SLABreach',
        'DocumentExpiry',
        'SystemAlert',
        'WelfareNudge',
        'ApplicationStatus',
        'General',
      ],
      default: 'General',
      index: true,
    },
    actionRequired: {
      type: Boolean,
      default: false,
      index: true,
    },
    titleEn: {
      type: String,
      required: true,
    },
    titleGu: {
      type: String,
      default: '',
    },
    messageEn: {
      type: String,
      required: true,
    },
    messageGu: {
      type: String,
      default: '',
    },
    nextActionUrl: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
