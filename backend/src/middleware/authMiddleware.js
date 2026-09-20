'use strict';

const jwt = require('jsonwebtoken');
const { createApiError } = require('../utils/apiResponse');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(createApiError(401, 'No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // Distinguish expired from tampered — helps client decide whether to refresh or re-login
    if (err.name === 'TokenExpiredError') {
      return next(createApiError(401, 'Token expired — please log in again'));
    }
    next(createApiError(401, 'Invalid token'));
  }
};

module.exports = { authenticate };
