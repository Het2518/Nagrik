'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const OFFICER_TASK_TYPES = [
  'LifeEventVerification',
  'BenefitReverification',
  'EvidenceReview',
  'SuspiciousActivityReview',
  'ApplicationReview',
];

const officerTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      default: () => `TSK-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    taskType: {
      type: String,
      enum: OFFICER_TASK_TYPES,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'Completed', 'Dismissed'],
      default: 'Open',
      index: true,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    benefitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BenefitEntitlement',
      default: null,
    },
    lifeEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LifeEvent',
      default: null,
    },
    assignedRole: {
      type: String,
      enum: ['Talati', 'Mamlatdar', 'DistrictOfficer', 'Admin'],
      default: 'Talati',
      index: true,
    },
    jurisdiction: {
      village:  { type: String, default: '' },
      taluka:   { type: String, default: '' },
      district: { type: String, default: '' },
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    actionRequired: {
      type: String,
      default: '',
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Officer',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

officerTaskSchema.index({ assignedRole: 1, status: 1 });
officerTaskSchema.index({ 'jurisdiction.district': 1, 'jurisdiction.taluka': 1 });

module.exports = mongoose.model('OfficerTask', officerTaskSchema);
