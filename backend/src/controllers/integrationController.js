'use strict';

const { sendSuccess, createApiError } = require('../utils/apiResponse');

// MOCK: GET /api/v1/integrations/pds/:rationCardNumber
// Simulates fetching family details from the State PDS (Ration Card) Database
const getPdsDetails = async (req, res, next) => {
  try {
    const { rationCardNumber } = req.params;

    // Simulate database lookup delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For testing purposes, only certain numbers return "found"
    // E.g. "RC-VALID-123" is found, others return 404
    if (!rationCardNumber.startsWith('RC-VALID')) {
      return next(createApiError(404, 'Ration card not found in PDS database. Please proceed with Aadhaar e-KYC.'));
    }

    const mockFamilyDetails = {
      rationCardNumber,
      rationCardType: 'PHH',
      annualIncome: 75000,
      category: 'OBC',
      bplStatus: true,
      address: {
        village: 'MockVillage',
        taluka: 'MockTaluka',
        district: 'MockDistrict',
        pincode: '380001',
      },
    };

    sendSuccess(res, mockFamilyDetails);
  } catch (err) {
    next(err);
  }
};

// MOCK: POST /api/v1/integrations/uidai/ekyc
// Simulates UIDAI Aadhaar e-KYC authentication and data retrieval
const getUidaiEkyc = async (req, res, next) => {
  try {
    const { aadhaar } = req.body;

    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
      return next(createApiError(400, 'Invalid Aadhaar number format. Must be 12 digits.'));
    }

    // Simulate UIDAI API latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simulate OTP / Fingerprint verification success and return demographic data
    const mockKycData = {
      name: 'Ekyc Verified Name',
      gender: 'Female',
      dateOfBirth: '1980-05-15',
      address: {
        village: 'AadhaarVillage',
        taluka: 'AadhaarTaluka',
        district: 'AadhaarDistrict',
        pincode: '382010',
      },
      ekycVerified: true,
    };

    sendSuccess(res, mockKycData);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPdsDetails,
  getUidaiEkyc,
};
