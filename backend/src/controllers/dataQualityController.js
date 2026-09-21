'use strict';

const dataQualityService = require('../services/dataQualityService');
const Notification = require('../models/Notification');
const { sendSuccess, createApiError } = require('../utils/apiResponse');

// GET /api/v1/data-quality/report
const getDataQualityReport = async (req, res, next) => {
  try {
    const { district, taluka } = req.query;
    const report = await dataQualityService.getDataQualityReport({ district, taluka });
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/data-quality/incomplete
const getIncompleteRecords = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const { district, taluka } = req.query;
    const incomplete = await dataQualityService.flagIncompleteRecords({ district, taluka }, limit);
    sendSuccess(res, { count: incomplete.length, records: incomplete });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/data-quality/family/:id
const getFamilyQualityScore = async (req, res, next) => {
  try {
    const score = await dataQualityService.scoreFamilyDataQuality(req.params.id);
    sendSuccess(res, score);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/data-quality/family/:id/nudge
const sendRemediationNudge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, missingField } = req.body;
    const score = await dataQualityService.scoreFamilyDataQuality(id);

    await Notification.create({
      familyId: score.familyId,
      type: 'EvidenceRequired',
      category: 'WelfareNudge',
      priority: 'High',
      actionRequired: true,
      titleEn: `Profile Update Required: ${missingField || 'Registry Completeness'}`,
      titleGu: `પ્રોફાઇલ વિગતો પૂર્ણ કરો: ${missingField || 'સરકારી પોર્ટલ'}`,
      messageEn: message || 'Please update your family registry with bank account and identity documents to avoid welfare sanction delays.',
      messageGu: 'તમારા પરિવારની બેંક વિગતો અને ઓળખ પુરાવા પોર્ટલ પર અપડેટ કરો.',
      nextActionUrl: '/profile',
    });

    sendSuccess(res, { success: true, message: 'Remediation nudge sent to family' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDataQualityReport,
  getIncompleteRecords,
  getFamilyQualityScore,
  sendRemediationNudge,
};
