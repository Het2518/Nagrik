'use strict';

const jwt = require('jsonwebtoken');
const CitizenUser = require('../models/CitizenUser');
const Officer = require('../models/Officer');
const { sendSuccess, createApiError } = require('../utils/apiResponse');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/v1/auth/citizen/register
const registerCitizen = async (req, res, next) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return next(createApiError(400, 'mobileNumber and password are required'));
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return next(createApiError(400, 'mobileNumber must be a valid 10-digit Indian mobile number'));
    }
    if (password.length < 8) {
      return next(createApiError(400, 'password must be at least 8 characters'));
    }

    const existing = await CitizenUser.findOne({ mobileNumber });
    if (existing) return next(createApiError(409, 'Mobile number already registered'));

    const user = await CitizenUser.create({ mobileNumber, passwordHash: password });

    // familyId is null at registration — citizen must POST /families next
    const token = signToken({ id: user._id, role: 'Citizen', familyId: null });
    sendSuccess(res, { token, userId: user._id, familyId: null }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/citizen/login
const loginCitizen = async (req, res, next) => {
  try {
    const { mobileNumber, password } = req.body;

    const user = await CitizenUser.findOne({ mobileNumber }).select('+passwordHash');
    if (!user || !(await user.isPasswordCorrect(password))) {
      return next(createApiError(401, 'Invalid mobile number or password'));
    }
    if (!user.isActive) {
      return next(createApiError(403, 'Account is deactivated. Please contact support.'));
    }

    const token = signToken({ id: user._id, role: 'Citizen', familyId: user.familyId });
    sendSuccess(res, { token, familyId: user.familyId });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/officer/login
const loginOfficer = async (req, res, next) => {
  try {
    const { email, password, officerId, employeeId, username } = req.body;
    const identifier = (email || officerId || employeeId || username || '').trim();

    if (!identifier || !password) {
      return next(createApiError(400, 'Identifier (email or officer ID) and password are required'));
    }

    const officer = await Officer.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { officerId: identifier.toUpperCase() },
      ],
      isActive: true,
    }).select('+passwordHash');

    if (!officer || !(await officer.isPasswordCorrect(password))) {
      return next(createApiError(401, 'Invalid credentials'));
    }

    const token = signToken({
      id: officer._id,
      role: officer.role,
      jurisdiction: officer.jurisdiction,
    });
    sendSuccess(res, {
      token,
      officerName: officer.name,
      role: officer.role,
      jurisdiction: officer.jurisdiction,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me — returns current user profile from the JWT
const getMe = async (req, res, next) => {
  try {
    if (req.user.role === 'Citizen') {
      const user = await CitizenUser.findById(req.user.id);
      if (!user) return next(createApiError(404, 'User not found'));
      return sendSuccess(res, {
        userId: user._id,
        mobileNumber: user.mobileNumber,
        familyId: user.familyId,
        role: 'Citizen',
        isActive: user.isActive,
      });
    }

    const officer = await Officer.findById(req.user.id).select('-passwordHash');
    if (!officer) return next(createApiError(404, 'Officer not found'));
    sendSuccess(res, { ...officer.toObject(), role: officer.role });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/auth/citizen/change-password
const changeCitizenPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(createApiError(400, 'currentPassword and newPassword are required'));
    }
    if (newPassword.length < 8) {
      return next(createApiError(400, 'New password must be at least 8 characters'));
    }

    const user = await CitizenUser.findById(req.user.id).select('+passwordHash');
    if (!user || !(await user.isPasswordCorrect(currentPassword))) {
      return next(createApiError(401, 'Current password is incorrect'));
    }

    user.passwordHash = newPassword; // pre-save hook will bcrypt this
    await user.save();

    sendSuccess(res, { message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerCitizen, loginCitizen, loginOfficer, getMe, changeCitizenPassword };
