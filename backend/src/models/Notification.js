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
      ],
      default: 'BenefitDiscovered',
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
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
